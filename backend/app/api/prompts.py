from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import PromptTemplate
from app.config import settings

router = APIRouter(prefix="/admin/prompts", tags=["admin-prompts"])


class PromptResponse(BaseModel):
    id: int
    name: str
    description: str | None
    template: str
    updated_at: datetime


class PromptUpdate(BaseModel):
    template: str
    description: str | None = None


class AdminAuth(BaseModel):
    password: str


def verify_admin_password(password: str):
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_password", "message": "Invalid admin password"}
        )


@router.post("/auth")
async def authenticate(request: AdminAuth):
    """Authenticate admin with password"""
    verify_admin_password(request.password)
    return {"status": "authenticated"}


@router.get("/", response_model=List[PromptResponse])
async def get_prompts(
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all prompt templates"""
    verify_admin_password(password)
    
    result = await db.execute(
        select(PromptTemplate).order_by(PromptTemplate.name)
    )
    prompts = result.scalars().all()
    
    return [
        PromptResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            template=p.template,
            updated_at=p.updated_at
        )
        for p in prompts
    ]


@router.get("/{name}", response_model=PromptResponse)
async def get_prompt(
    name: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific prompt template by name"""
    verify_admin_password(password)
    
    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.name == name)
    )
    prompt = result.scalar_one_or_none()
    
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prompt_not_found", "message": f"Prompt '{name}' not found"}
        )
    
    return PromptResponse(
        id=prompt.id,
        name=prompt.name,
        description=prompt.description,
        template=prompt.template,
        updated_at=prompt.updated_at
    )


@router.put("/{name}")
async def update_prompt(
    name: str,
    request: PromptUpdate,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Update a prompt template"""
    verify_admin_password(password)
    
    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.name == name)
    )
    prompt = result.scalar_one_or_none()
    
    if not prompt:
        # Create new prompt
        prompt = PromptTemplate(
            name=name,
            template=request.template,
            description=request.description
        )
        db.add(prompt)
    else:
        # Update existing
        prompt.template = request.template
        if request.description is not None:
            prompt.description = request.description
        prompt.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"status": "updated", "name": name}


@router.delete("/{name}")
async def delete_prompt(
    name: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a prompt template"""
    verify_admin_password(password)
    
    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.name == name)
    )
    prompt = result.scalar_one_or_none()
    
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prompt_not_found", "message": f"Prompt '{name}' not found"}
        )
    
    await db.delete(prompt)
    await db.commit()
    
    return {"status": "deleted", "name": name}
