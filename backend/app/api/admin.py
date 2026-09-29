from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import json
import hashlib
import unicodedata
import secrets
import re
from app.database import get_db
from app.models import (
    User, Dictionary, Word, DictionaryWord, DictionaryImport,
    SentenceReport, RefreshToken, Event
)
from app.schemas import (
    AdminReportResponse, AdminUpdateReportRequest, AdminUserResponse,
    AdminResetPasswordResponse
)
from app.core.deps import get_admin_user
from app.core.security import hash_password
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


def normalize_lemma(lemma: str) -> str:
    return unicodedata.normalize("NFC", lemma.strip()).casefold()


def validate_word_data(word_data: dict) -> tuple[bool, str]:
    """Validate word data. Returns (is_valid, error_message)"""
    lemma = word_data.get("lemma", "")
    if not isinstance(lemma, str):
        return False, "lemma must be string"
    
    lemma = unicodedata.normalize("NFC", lemma.strip())
    if not lemma or len(lemma) > 64:
        return False, "lemma length must be 1-64"
    
    if not re.match(r'^[a-zA-Z\'\-\s]+$', lemma):
        return False, "lemma contains invalid characters"
    
    pos = word_data.get("pos", "")
    valid_pos = {"noun", "verb", "adj", "adv", "pron", "prep", "conj", "num", "det", "intj"}
    if pos not in valid_pos:
        return False, f"invalid pos: {pos}"
    
    level = word_data.get("level")
    if level is not None and level not in ("A1", "A2", "B1", "B2", "C1", "C2"):
        return False, f"invalid level: {level}"
    
    translations = word_data.get("translations", [])
    if not isinstance(translations, list) or len(translations) < 1 or len(translations) > 5:
        return False, "translations must be 1-5 items"
    
    for t in translations:
        if not isinstance(t, str) or not t.strip() or len(t) > 100:
            return False, "invalid translation"
    
    return True, ""


@router.post("/dictionaries/import")
async def import_dictionary(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    # Read file
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    # Validate structure
    dict_data = data.get("dictionary", {})
    words_data = data.get("words", [])
    
    if not isinstance(words_data, list) or len(words_data) > 50000:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    dict_code = dict_data.get("code", "import")
    dict_name = dict_data.get("name", file.filename or "Imported")
    dict_is_general = dict_data.get("is_general", False)
    
    # Check if general dict already exists
    if dict_is_general:
        result = await db.execute(select(Dictionary).where(Dictionary.is_general == True))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)
    
    # Calculate SHA256
    sha256 = hashlib.sha256(content).hexdigest()
    
    # Process words
    added = 0
    linked = 0
    skipped = 0
    errors = 0
    error_details = []
    
    # Find or create dictionary
    result = await db.execute(select(Dictionary).where(Dictionary.code == dict_code))
    dictionary = result.scalar_one_or_none()
    
    if not dictionary and not dry_run:
        dictionary = Dictionary(
            code=dict_code,
            name=dict_name,
            description=dict_data.get("description", ""),
            is_general=dict_is_general
        )
        db.add(dictionary)
        await db.flush()
    
    for i, word_data in enumerate(words_data):
        is_valid, error_msg = validate_word_data(word_data)
        
        if not is_valid:
            errors += 1
            if len(error_details) < 100:
                error_details.append({"index": i, "error": error_msg})
            continue
        
        lemma = unicodedata.normalize("NFC", word_data["lemma"].strip())
        lemma_key = normalize_lemma(lemma)
        pos = word_data["pos"]
        level = word_data.get("level")
        translations = list(set(t.strip() for t in word_data["translations"]))
        
        # Check general dictionary requires level
        if dict_is_general and level is None:
            errors += 1
            if len(error_details) < 100:
                error_details.append({"index": i, "error": "level required for general dictionary"})
            continue
        
        # Find or create word
        result = await db.execute(
            select(Word).where(Word.lemma_key == lemma_key, Word.pos == pos)
        )
        word = result.scalar_one_or_none()
        
        if not word:
            if dry_run:
                added += 1
            else:
                word = Word(
                    lemma=lemma,
                    lemma_key=lemma_key,
                    pos=pos,
                    level=level,
                    translations=translations
                )
                db.add(word)
                await db.flush()
                added += 1
        else:
            skipped += 1
        
        # Link to dictionary
        if word and dictionary:
            result = await db.execute(
                select(DictionaryWord).where(
                    DictionaryWord.dictionary_id == dictionary.id,
                    DictionaryWord.word_id == word.id
                )
            )
            if not result.scalar_one_or_none():
                if not dry_run:
                    dw = DictionaryWord(dictionary_id=dictionary.id, word_id=word.id)
                    db.add(dw)
                linked += 1
    
    # Log import
    if not dry_run:
        import_record = DictionaryImport(
            admin_id=admin.id,
            file_name=file.filename or "unknown",
            sha256=sha256,
            dictionary_id=dictionary.id if dictionary else None,
            added_count=added,
            linked_count=linked,
            skipped_count=skipped,
            error_count=errors,
            error_details=error_details,
            dry_run=dry_run
        )
        db.add(import_record)
    
    await db.commit()
    
    return {
        "dictionary": {
            "code": dict_code,
            "name": dict_name,
            "created": dictionary is not None
        },
        "added": added,
        "linked": linked,
        "skipped": skipped,
        "errors": errors,
        "error_details": error_details
    }


@router.get("/reports", response_model=list[AdminReportResponse])
async def get_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(SentenceReport)
    
    if status_filter:
        query = query.where(SentenceReport.status == status_filter)
    
    query = query.order_by(SentenceReport.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    return [
        AdminReportResponse(
            id=r.id,
            user_id=r.user_id,
            exercise_id=r.exercise_id,
            reason=r.reason,
            comment=r.comment,
            status=r.status,
            admin_note=r.admin_note,
            created_at=r.created_at
        )
        for r in reports
    ]


@router.patch("/reports/{report_id}")
async def update_report(
    report_id: int,
    request: AdminUpdateReportRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SentenceReport).where(SentenceReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    report.status = request.status
    report.admin_note = request.admin_note
    
    await db.commit()
    
    return {"message": "Report updated"}


@router.get("/users", response_model=list[AdminUserResponse])
async def get_users(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    
    if q:
        query = query.where(User.email.ilike(f"%{q}%"))
    
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        AdminUserResponse(
            id=u.id,
            email=u.email,
            is_onboarded=u.is_onboarded,
            is_admin=u.is_admin,
            created_at=u.created_at
        )
        for u in users
    ]


@router.post("/users/{user_id}/reset-password", response_model=AdminResetPasswordResponse)
async def reset_user_password(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    # Generate temp password
    temp_password = secrets.token_urlsafe(12)
    user.password_hash = hash_password(temp_password)
    
    # Revoke all refresh tokens
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.user_id == user_id)
    )
    tokens = result.scalars().all()
    for token in tokens:
        token.revoked_at = datetime.utcnow()
    
    await db.commit()
    
    return AdminResetPasswordResponse(temp_password=temp_password)
