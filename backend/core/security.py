"""
Security utilities for authentication and authorization.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

import crud.user
from core.config import settings
from db.session import get_db
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
    OAuth2PasswordBearer,
)
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import ValidationError
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")

# JWT settings
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.

    Args:
        subject: The subject of the token (usually user ID or username)
        expires_delta: Optional timedelta for token expiration

    Returns:
        str: Encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "iat": datetime.utcnow(),
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: Union[str, Any]) -> str:
    """
    Create a JWT refresh token.

    Args:
        subject: The subject of the token (usually user ID or username)

    Returns:
        str: Encoded JWT refresh token
    """
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "iat": datetime.utcnow(),
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT token and return its payload.

    Args:
        token: The JWT token to verify

    Returns:
        Dict: The decoded token payload

    Raises:
        HTTPException: If the token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
        return payload
    except (JWTError, ValidationError) as e:
        logger.error(f"Token validation error: {e}")
        raise credentials_exception from e


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> Any:
    """
    Get the current authenticated user from the JWT token.

    Args:
        db: Database session
        token: JWT token from Authorization header

    Returns:
        User: The authenticated user

    Raises:
        HTTPException: If the token is invalid or user not found
    """
    try:
        payload = verify_token(token)

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        user = crud.user.get_user(db, user_id=int(user_id))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return user

    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_active_user(
    current_user: Any = Depends(get_current_user),
) -> Any:
    """
    Get the current active user.

    Args:
        current_user: The current authenticated user

    Returns:
        User: The active user

    Raises:
        HTTPException: If the user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return current_user


def get_current_active_superuser(
    current_user: Any = Depends(get_current_user),
) -> Any:
    """
    Get the current active superuser.

    Args:
        current_user: The current authenticated user

    Returns:
        User: The superuser

    Raises:
        HTTPException: If the user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


def rate_limit_key_builder(
    request: Request,
    key: str = None,
    user_id: str = None,
) -> str:
    """
    Build a key for rate limiting.

    Args:
        request: The incoming request
        key: Optional custom key component
        user_id: Optional user ID for user-specific rate limiting

    Returns:
        str: A rate limit key
    """
    parts = [
        request.client.host if request.client else "unknown",
        request.url.path,
        key or "",
        f"user:{user_id}" if user_id else "",
    ]
    return ":".join(filter(None, parts))


async def security():
    return HTTPBearer()


def get_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security()),
) -> str:
    """
    Get and validate API key from header.

    Args:
        credentials: HTTP Authorization credentials containing the API key

    Returns:
        str: The validated API key

    Raises:
        HTTPException: If the authentication scheme is invalid or API key is missing
    """
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid authentication scheme",
        )
    api_key = credentials.credentials
    # Here you would validate the API key against your database or config
    # For now, we'll just check if it's not empty
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API Key"
        )
    return api_key
