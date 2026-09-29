from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.security import decode_access_token
from app.models import User, LearningProfile


security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    if credentials:
        token = credentials.credentials
    
    if not token:
        raise credentials_exception
    
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_user_onboarded(
    user: User = Depends(get_current_user)
) -> User:
    if not user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "onboarding_required", "message": "Onboarding not completed"}
        )
    return user


async def get_learning_profile(
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
) -> LearningProfile:
    result = await db.execute(
        select(LearningProfile).where(LearningProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "profile_not_found", "message": "Learning profile not found"}
        )
    
    return profile


async def get_admin_user(
    user: User = Depends(get_current_user)
) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "admin_required", "message": "Admin access required"}
        )
    return user
