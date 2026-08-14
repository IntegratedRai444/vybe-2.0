import secrets
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# Initialize password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class APIKeyManager:
    """Manager for API key generation, validation, and storage."""

    def __init__(self):
        self.keys = {}  # In-memory storage (replace with database in production)

    def generate_key(
        self, name: str, scopes: List[str] = None, expires_days: int = 90
    ) -> str:
        """Generate a new API key with the given name and scopes."""
        # Generate a random key
        alphabet = string.ascii_letters + string.digits
        key = "".join(secrets.choice(alphabet) for _ in range(32))

        # Hash the key for storage
        hashed_key = pwd_context.hash(key)

        # Set expiration date
        expires_at = datetime.utcnow() + timedelta(days=expires_days)

        # Store the key (in production, store in a secure database)
        self.keys[hashed_key] = {
            "name": name,
            "scopes": scopes or [],
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "last_used": None,
            "is_active": True,
        }

        # Return the plaintext key (only shown once)
        return f"vybe_{key}"

    def validate_key(self, api_key: str) -> Dict:
        """Validate an API key and return its data if valid."""
        if not api_key.startswith("vybe_"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key format",
            )

        # Extract the key part
        key = api_key[5:]

        # Find the key in storage
        for hashed_key, key_data in self.keys.items():
            if pwd_context.verify(key, hashed_key):
                # Update last used timestamp
                key_data["last_used"] = datetime.utcnow()

                # Check if key is active and not expired
                if not key_data["is_active"]:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="API key is inactive",
                    )

                if key_data["expires_at"] < datetime.utcnow():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="API key has expired",
                    )

                return key_data

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )

    def revoke_key(self, api_key: str) -> bool:
        """Revoke an API key."""
        for hashed_key in self.keys:
            if pwd_context.verify(api_key[5:], hashed_key):
                self.keys[hashed_key]["is_active"] = False
                return True
        return False

    def list_keys(self) -> List[Dict]:
        """List all API keys (without the actual keys)."""
        return [
            {
                "name": data["name"],
                "scopes": data["scopes"],
                "created_at": data["created_at"],
                "expires_at": data["expires_at"],
                "last_used": data["last_used"],
                "is_active": data["is_active"],
            }
            for data in self.keys.values()
        ]


# Initialize the API key manager
api_key_manager = APIKeyManager()


def get_api_key_manager() -> APIKeyManager:
    """Dependency to get the API key manager."""
    return api_key_manager
