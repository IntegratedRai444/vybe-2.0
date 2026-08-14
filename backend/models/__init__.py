# This makes the models directory a Python package
# Import all models here to make them available when importing from models
from .base import Base, BaseModel
from .user import User, UserCreate, UserInDB, UserUpdate, Token, TokenData
from .deployment_models import *
from .git_models import *
from .package_models import *

# Import all models to ensure they are registered with SQLAlchemy
# This is important for `alembic revision --autogenerate` to detect all models
from . import user, deployment_models, git_models, package_models  # noqa


# This will be used by SQLAlchemy
def get_model_by_tablename(tablename):
    """Return class reference mapped to table."""
    for model in Base.__subclasses__():
        if hasattr(model, "__tablename__") and model.__tablename__ == tablename:
            return model
    return None
