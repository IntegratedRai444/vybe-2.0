"""
Base database configuration and models.
"""
from sqlalchemy.ext.declarative import declarative_base

# Create base class for models
Base = declarative_base()


def init_db(engine):
    """Initialize the database by creating all tables."""
    # Import all models here to ensure they are registered with SQLAlchemy
    from models.user import User  # noqa: F401

    # Create all tables
    Base.metadata.create_all(bind=engine)
