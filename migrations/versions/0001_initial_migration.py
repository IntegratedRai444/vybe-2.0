"""Initial migration

Revision ID: 0001_initial_migration
Revises: 
Create Date: 2023-10-31 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial_migration"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_roles enum type
    user_roles = postgresql.ENUM(
        "admin", "user", "read_only", "contributor", name="userrole"
    )
    user_roles.create(op.get_bind())

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column(
            "username", sa.String(length=50), nullable=False, unique=True, index=True
        ),
        sa.Column(
            "email", sa.String(length=255), nullable=False, unique=True, index=True
        ),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=True),
        sa.Column("role", user_roles, nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_login", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("users")
    op.execute("DROP TYPE userrole")
