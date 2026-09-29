from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, RefreshToken, Event
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.core.security import (
    hash_password, verify_password, create_access_token,
    generate_refresh_token, hash_token, generate_family_id
)
from app.core.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(
    request: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "email_taken", "message": "Email already registered"}
        )
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password)
    )
    db.add(user)
    await db.flush()
    
    # Create event
    event = Event(user_id=user.id, type="signup", payload={})
    db.add(event)
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_raw, refresh_hash = generate_refresh_token()
    family_id = generate_family_id()
    
    refresh_token = RefreshToken(
        user_id=user.id,
        family_id=family_id,
        token_hash=refresh_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    )
    db.add(refresh_token)
    
    # Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_raw,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
    )
    
    await db.commit()
    
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Find user
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "Invalid email or password"}
        )
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_raw, refresh_hash = generate_refresh_token()
    family_id = generate_family_id()
    
    refresh_token = RefreshToken(
        user_id=user.id,
        family_id=family_id,
        token_hash=refresh_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    )
    db.add(refresh_token)
    
    # Set refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_raw,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
    )
    
    await db.commit()
    
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "no_refresh_token", "message": "No refresh token"}
        )
    
    # Find token
    token_hash = hash_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    token = result.scalar_one_or_none()
    
    if not token or token.revoked_at or token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"}
        )
    
    # Check if token was already used (replay attack)
    if token.replaced_by:
        # Revoke entire family
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.family_id == token.family_id)
        )
        family_tokens = result.scalars().all()
        for ft in family_tokens:
            ft.revoked_at = datetime.utcnow()
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "token_reused", "message": "Token reuse detected"}
        )
    
    # Generate new tokens
    user_id = token.user_id
    access_token = create_access_token(user_id)
    new_refresh_raw, new_refresh_hash = generate_refresh_token()
    
    # Mark old token as used
    new_token = RefreshToken(
        user_id=user_id,
        family_id=token.family_id,
        token_hash=new_refresh_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    )
    db.add(new_token)
    await db.flush()
    
    token.replaced_by = new_token.id
    token.revoked_at = datetime.utcnow()
    
    # Set new refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_raw,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
    )
    
    await db.commit()
    
    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    if refresh_token:
        token_hash = hash_token(refresh_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        token = result.scalar_one_or_none()
        if token:
            token.revoked_at = datetime.utcnow()
            await db.commit()
    
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user
