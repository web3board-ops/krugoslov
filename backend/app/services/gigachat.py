import httpx
import asyncio
import json
import time
import uuid
import logging
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime, timedelta
from app.config import settings
from app.database import async_session
from app.models import LLMCall

logger = logging.getLogger(__name__)


class GigaChatToken:
    def __init__(self):
        self.token: Optional[str] = None
        self.expires_at: Optional[datetime] = None
        self._lock = asyncio.Lock()
    
    async def get_token(self) -> str:
        async with self._lock:
            if self.token and self.expires_at and datetime.utcnow() < self.expires_at - timedelta(seconds=120):
                return self.token
            
            # Request new token
            verify_ssl = False  # Отключаем проверку SSL для разработки
            async with httpx.AsyncClient(verify=verify_ssl) as client:
                response = await client.post(
                    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
                    headers={
                        "Authorization": f"Basic {settings.GIGACHAT_AUTH_KEY}",
                        "RqUID": str(uuid.uuid4()),
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data={"scope": settings.GIGACHAT_SCOPE}
                )
                
                if response.status_code != 200:
                    raise Exception(f"Failed to get GigaChat token: {response.status_code}")
                
                data = response.json()
                self.token = data["access_token"]
                self.expires_at = datetime.utcnow() + timedelta(milliseconds=data["expires_at"])
                
                return self.token


_token_manager = GigaChatToken()
_semaphore = asyncio.Semaphore(settings.GIGACHAT_MAX_CONCURRENCY)


async def log_llm_call(
    purpose: str,
    user_id: Optional[int],
    lesson_id: Optional[int],
    exercise_id: Optional[int],
    attempt: int,
    request_data: Dict,
    response_data: Optional[Dict],
    status: str,
    http_status: Optional[int],
    latency_ms: Optional[int],
    prompt_tokens: Optional[int],
    completion_tokens: Optional[int]
):
    """Log LLM call to database"""
    async with async_session() as session:
        call = LLMCall(
            purpose=purpose,
            user_id=user_id,
            lesson_id=lesson_id,
            exercise_id=exercise_id,
            attempt=attempt,
            request=request_data,
            response=response_data,
            status=status,
            http_status=http_status,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )
        session.add(call)
        await session.commit()


async def chat(
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int = 1000,
    timeout: int = 15
) -> Dict[str, Any]:
    """
    Send chat request to GigaChat (Layer A)
    
    Args:
        messages: List of message dicts with role and content
        temperature: Sampling temperature
        max_tokens: Maximum tokens in response
        timeout: Request timeout in seconds
    
    Returns:
        Response dict with content, usage, etc.
    """
    async with _semaphore:
        token = await _token_manager.get_token()
        
        start_time = time.time()
        attempt = 0
        max_retries = 2
        
        while attempt <= max_retries:
            attempt += 1
            try:
                verify_ssl = False  # Отключаем проверку SSL для разработки
                async with httpx.AsyncClient(
                    verify=verify_ssl,
                    timeout=timeout
                ) as client:
                    response = await client.post(
                        "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": settings.GIGACHAT_MODEL,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": max_tokens
                        }
                    )
                    
                    latency_ms = int((time.time() - start_time) * 1000)
                    
                    if response.status_code == 401:
                        # Token expired, refresh and retry once
                        if attempt == 1:
                            await _token_manager.get_token()
                            continue
                        await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "auth_failed", 401, latency_ms, None, None)
                        raise Exception("GigaChat auth failed")
                    
                    if response.status_code == 429:
                        # Rate limit, retry with backoff
                        if attempt <= max_retries:
                            await asyncio.sleep(1 * attempt)
                            continue
                        await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "rate_limited", 429, latency_ms, None, None)
                        raise Exception("GigaChat rate limited")
                    
                    if response.status_code == 402:
                        await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "quota_exceeded", 402, latency_ms, None, None)
                        raise Exception("GigaChat quota exceeded")
                    
                    if response.status_code >= 500:
                        if attempt <= max_retries:
                            await asyncio.sleep(1 * attempt)
                            continue
                        await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "server_error", response.status_code, latency_ms, None, None)
                        raise Exception(f"GigaChat server error: {response.status_code}")
                    
                    if response.status_code != 200:
                        await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "error", response.status_code, latency_ms, None, None)
                        raise Exception(f"GigaChat error: {response.status_code}")
                    
                    data = response.json()
                    
                    # Check finish reason
                    finish_reason = data.get("choices", [{}])[0].get("finish_reason")
                    if finish_reason in ("length", "blacklist"):
                        if attempt <= max_retries:
                            continue
                        await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, data, "content_error", 200, latency_ms, None, None)
                        raise Exception(f"GigaChat finish_reason: {finish_reason}")
                    
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    
                    await log_llm_call(
                        "chat", None, None, None, attempt,
                        {"messages": messages},
                        data,
                        "success",
                        200,
                        latency_ms,
                        usage.get("prompt_tokens"),
                        usage.get("completion_tokens")
                    )
                    
                    return {
                        "content": content,
                        "usage": usage,
                        "finish_reason": finish_reason
                    }
            
            except httpx.TimeoutException:
                latency_ms = int((time.time() - start_time) * 1000)
                if attempt <= max_retries:
                    await asyncio.sleep(1 * attempt)
                    continue
                await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "timeout", None, latency_ms, None, None)
                raise Exception("GigaChat timeout")
            
            except httpx.RequestError as e:
                latency_ms = int((time.time() - start_time) * 1000)
                if attempt <= max_retries:
                    await asyncio.sleep(1 * attempt)
                    continue
                await log_llm_call("chat", None, None, None, attempt, {"messages": messages}, None, "request_error", None, latency_ms, None, None)
                raise Exception(f"GigaChat request error: {e}")


async def chat_json(
    messages: List[Dict[str, str]],
    validator: Callable[[Dict], bool],
    temperature: float,
    max_tokens: int = 1000,
    timeout: int = 15,
    user_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    exercise_id: Optional[int] = None,
    purpose: str = "chat"
) -> Dict[str, Any]:
    """
    Send chat request and parse JSON response (Layer B)
    
    Args:
        messages: List of message dicts
        validator: Function to validate parsed JSON
        temperature: Sampling temperature
        max_tokens: Maximum tokens
        timeout: Request timeout
        user_id, lesson_id, exercise_id: For logging
        purpose: Purpose for logging
    
    Returns:
        Parsed and validated JSON dict
    """
    max_retries = 2
    attempt = 0
    
    while attempt <= max_retries:
        attempt += 1
        response = await chat(messages, temperature, max_tokens, timeout)
        content = response["content"]
        
        # Extract JSON
        try:
            # Remove markdown code blocks
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            # Find JSON object or array
            start_idx = content.find("{")
            if start_idx == -1:
                start_idx = content.find("[")
            
            if start_idx == -1:
                raise Exception("No JSON found in response")
            
            # Find matching closing bracket
            open_char = content[start_idx]
            close_char = "}" if open_char == "{" else "]"
            depth = 0
            end_idx = -1
            
            for i in range(start_idx, len(content)):
                if content[i] == open_char:
                    depth += 1
                elif content[i] == close_char:
                    depth -= 1
                    if depth == 0:
                        end_idx = i
                        break
            
            if end_idx == -1:
                raise Exception("Unmatched JSON brackets")
            
            json_str = content[start_idx:end_idx + 1]
            parsed = json.loads(json_str)
            
            # Validate
            if not validator(parsed):
                if attempt <= max_retries:
                    continue
                raise Exception("JSON validation failed")
            
            return parsed
        
        except (json.JSONDecodeError, Exception) as e:
            if attempt <= max_retries:
                continue
            raise Exception(f"Failed to parse JSON: {e}")
