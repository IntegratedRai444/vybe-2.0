import sys
import os
from pathlib import Path

# Add the parent directory to the path so we can import our models
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from core.security import get_password_hash
from models.user import User, UserRole
from db.session import get_db

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")


def create_dev_user():
    # Create database engine
    engine = create_engine(DATABASE_URL)

    # Create a new session
    db = Session(engine)

    try:
        # Check if dev user already exists
        existing_user = db.query(User).filter(User.email == "dev@example.com").first()

        if existing_user:
            print("Dev user already exists. Updating password...")
            existing_user.hashed_password = get_password_hash("devpassword")
            existing_user.is_active = True
            existing_user.is_verified = True
        else:
            # Create new dev user
            print("Creating new dev user...")
            dev_user = User(
                username="devuser",
                email="dev@example.com",
                hashed_password=get_password_hash("devpassword"),
                full_name="Development User",
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(dev_user)

        # Commit changes
        db.commit()
        print("Dev user created/updated successfully!")
        print("Email: dev@example.com")
        print("Password: devpassword")

    except Exception as e:
        print(f"Error creating dev user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_dev_user()
