"""
Authentication routes for Vybe 2.0 API.

This module provides endpoints for user authentication, token generation,
and user management. It handles the core authentication flow including:
- User login and token generation
- User registration
- Password reset
- Email verification
- User profile management

All endpoints return standardized JSON responses with appropriate HTTP status codes.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from core.auth import (
    Token,
    User,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    oauth2_scheme,
)
from core.config import settings
from db.session import get_db
import crud
from models.user import UserCreate, UserResponse, UserUpdate, UserRole

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={
        401: {"description": "Unauthorized - Invalid credentials or token"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "Not Found - Resource not found"},
        422: {"description": "Validation Error - Invalid input data"},
        429: {"description": "Too Many Requests - Rate limit exceeded"},
    },
)


class LoginResponse(Token):
    """Response model for successful login."""

    token_type: str = "bearer"
    expires_in: int = Field(
        default=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        description="Token expiration time in seconds",
    )


class RegisterRequest(BaseModel):
    """Request model for user registration."""

    username: str = Field(..., min_length=3, max_length=50, example="johndoe")
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., min_length=8, example="securepassword123")
    full_name: Optional[str] = Field(None, max_length=100, example="John Doe")


class ResetPasswordRequest(BaseModel):
    """Request model for password reset."""

    email: EmailStr = Field(..., example="user@example.com")


class NewPasswordRequest(BaseModel):
    """Request model for setting a new password."""

    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, example="newsecurepassword123")


class UserUpdateMeRequest(UserUpdate):
    """Request model for updating current user profile."""

    current_password: Optional[str] = Field(
        None,
        min_length=8,
        description="Current password (required when changing password)",
    )


@router.post(
    "/token",
    response_model=LoginResponse,
    summary="Login with username and password",
    response_description="Authentication successful",
    responses={
        200: {"description": "Authentication successful"},
        400: {"description": "Inactive user"},
        401: {"description": "Incorrect username or password"},
    },
)
async def login_for_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    OAuth2 compatible token login, get an access token for future requests.

    - **username**: Your username or email address
    - **password**: Your password

    Returns an access token that can be used to authenticate future requests by
    including it in the `Authorization` header as:

        Authorization: Bearer <access_token>

    The token will expire after the time specified in `expires_in` seconds.
    """
    # Try to authenticate with username or email
    user = crud.user.authenticate_user(
        db, username=form_data.username, password=form_data.password
    )

    if not user:
        # Log failed login attempt
        await log_login_attempt(
            request,
            identifier=form_data.username,
            success=False,
            reason="invalid_credentials",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        await log_login_attempt(
            request, identifier=user.username, success=False, reason="account_inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    # Update last login time
    crud.user.update_last_login(db, user)

    # Log successful login
    await log_login_attempt(request, identifier=user.username, success=True)

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
    }


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    response_description="User created successfully",
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Username or email already registered"},
        422: {"description": "Validation error"},
    },
)
async def register_user(
    user_in: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user account.

    - **username**: Must be unique, 3-50 characters
    - **email**: Must be a valid email address
    - **password**: At least 8 characters
    - **full_name**: Optional display name

    Returns the created user object without sensitive data.
    """
    # Check if username is already registered
    db_user = crud.user.get_user_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check if email is already registered
    db_user = crud.user.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    user = crud.user.create_user(db=db, user=user_in)

    # TODO: Send verification email

    return user


@router.post(
    "/password/reset-request",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request password reset",
    response_description="Password reset email sent if account exists",
)
async def request_password_reset(
    reset_request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset email.

    If the email exists in our system, a password reset link will be sent.
    For security reasons, we don't reveal whether the email exists or not.
    """
    from core.security import create_password_reset_token

    user = crud.user.get_user_by_email(db, email=reset_request.email)
    if user:
        reset_token = create_password_reset_token(email=user.email)
        # TODO: Send password reset email with the token
        pass

    # Always return accepted, don't reveal if email exists
    return {
        "message": "If your email is registered, you will receive a password reset link"
    }


@router.post(
    "/password/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset password with token",
    response_description="Password updated successfully",
)
async def reset_password(
    new_password: NewPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset password using a valid reset token.

    - **token**: The password reset token from the email
    - **new_password**: The new password to set
    """
    from core.security import verify_password_reset_token

    email = verify_password_reset_token(new_password.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    user = crud.user.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update password
    user.hashed_password = get_password_hash(new_password.new_password)
    db.commit()
    db.refresh(user)

    # TODO: Invalidate all active sessions/tokens for this user

    return {"message": "Password updated successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    response_description="User profile retrieved successfully",
)
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get the current authenticated user's profile.

    Returns the user's profile information, excluding sensitive data like password hashes.
    """
    # Get fresh user data from database
    db_user = crud.user.get_user(db, user_id=current_user.id)
    return db_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
    response_description="Profile updated successfully",
)
async def update_user_me(
    user_update: UserUpdateMeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update the current user's profile.

    - **email**: New email address (must be unique)
    - **full_name**: New display name
    - **password**: New password (requires current_password)
    - **current_password**: Required when changing password

    Only provided fields will be updated.
    """
    # If changing password, verify current password
    if user_update.password and not user_update.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required to set a new password",
        )

    if user_update.current_password:
        if not verify_password(
            user_update.current_password, current_user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )

    # Update user data
    updated_user = crud.user.update_user(
        db=db,
        db_user=current_user,
        user_update=user_update,
    )

    return updated_user


@router.get(
    "/me/sessions",
    summary="Get active sessions",
    response_description="List of active sessions",
)
async def get_my_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get a list of active sessions for the current user.

    Returns information about all active login sessions, including:
    - Device information
    - IP address
    - Last activity time
    - Session expiration time
    """
    # TODO: Implement session tracking
    return [
        {"id": "current", "device": "Current session", "last_active": datetime.utcnow()}
    ]


# Helper functions
async def log_login_attempt(
    request: Request,
    identifier: str,
    success: bool,
    reason: Optional[str] = None,
) -> None:
    """Log a login attempt."""
    # Get client IP
    client_host = request.client.host if request.client else None
    x_forwarded_for = request.headers.get("X-Forwarded-For")

    # Log to database or logging system
    log_data = {
        "timestamp": datetime.utcnow(),
        "identifier": identifier,
        "success": success,
        "ip_address": x_forwarded_for or client_host,
        "user_agent": request.headers.get("user-agent"),
        "reason": reason,
    }

    # TODO: Store login attempt in database
    print(f"Login attempt: {log_data}")


def get_password_reset_token(email: str) -> str:
    """Generate a password reset token."""
    from datetime import datetime, timedelta
    from jose import jwt

    expires_delta = timedelta(hours=1)
    expire = datetime.utcnow() + expires_delta

    to_encode = {
        "exp": expire,
        "sub": email,
        "type": "password_reset",
    }

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify a password reset token and return the email if valid."""
    from jose import JWTError, jwt

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None
