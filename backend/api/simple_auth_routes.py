"""
Simple authentication routes for personal use.
"""
from datetime import timedelta
from typing import Optional

from core.config import settings
from core.simple_auth import (
    Token,
    create_access_token,
    get_current_user,
    get_password_hash,
    get_password_reset_token,
    verify_password,
    verify_password_reset_token,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

router = APIRouter(tags=["authentication"])

# In-memory user storage (replace with database in production)
users_db = {}


class UserCreate(BaseModel):
    username: str
    password: str
    email: str


class ResetPasswordRequest(BaseModel):
    email: str


class NewPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Get an access token with username and password.

    - **username**: Your username
    - **password**: Your password
    """
    user = users_db.get(form_data.username)

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate):
    """
    Register a new user account.

    - **username**: Your desired username
    - **password**: Your password (at least 8 characters)
    - **email**: Your email address (for password reset)
    """
    if user_in.username in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Store user with hashed password
    users_db[user_in.username] = {
        "username": user_in.username,
        "email": user_in.email,
        "hashed_password": get_password_hash(user_in.password),
    }

    return {"message": "User created successfully"}


@router.post("/password/reset-request")
async def request_password_reset(request: ResetPasswordRequest):
    """
    Request a password reset.

    - **email**: The email address to send the reset link to
    """
    # In a real app, you would send an email with the reset link
    user = next((u for u in users_db.values() if u["email"] == request.email), None)

    if user:
        reset_token = get_password_reset_token(user["email"])
        print(f"Password reset token for {user['email']}: {reset_token}")
        # In production, send an email with a link containing the token

    # Always return success to avoid user enumeration
    return {"message": "If your email is registered, you will receive a reset link"}


@router.post("/password/reset")
async def reset_password(reset_data: NewPasswordRequest):
    """
    Reset password using a valid reset token.

    - **token**: The reset token from the email
    - **new_password**: Your new password
    """
    email = verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    # Find user by email
    user = next((u for u in users_db.values() if u["email"] == email), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update password
    user["hashed_password"] = get_password_hash(reset_data.new_password)

    return {"message": "Password updated successfully"}


@router.get("/me")
async def read_users_me(current_user: str = Depends(get_current_user)):
    """
    Get current user information.

    Returns basic information about the currently authenticated user.
    """
    user = users_db.get(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"username": user["username"], "email": user["email"]}
