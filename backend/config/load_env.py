import os
from pathlib import Path

from dotenv import load_dotenv

# Get the root directory of the project (one level up from the config directory)
ROOT_DIR = Path(__file__).parent.parent
ENV_FILE = ROOT_DIR / ".env"

# Ensure .env file exists
if not ENV_FILE.exists():
    with open(ENV_FILE, "w") as f:
        f.write("# Environment Variables\n")

# Load environment variables
load_dotenv(ENV_FILE)


def set_env_variable(key: str, value: str):
    """Set an environment variable in the .env file and update the current environment."""
    # Read existing content
    lines = []
    key_exists = False

    if ENV_FILE.exists():
        with open(ENV_FILE, "r") as f:
            lines = f.readlines()

    # Update or add the key
    updated = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            updated = True
            break

    if not updated:
        lines.append(f"{key}={value}\n")

    # Write back to .env
    with open(ENV_FILE, "w") as f:
        f.writelines(lines)

    # Update current environment
    os.environ[key] = value
    return True


def get_env_variable(key: str, default: str = None) -> str:
    """Get an environment variable."""
    return os.getenv(key, default)


# Set the Groq API key if not already set
if not os.getenv("GROQ_API_KEY"):
    set_env_variable("GROQ_API_KEY", "gsk-PzdK28UxiuaSs30TmZLOvplhgwRj1bJQXG75EH4M")

# Load all environment variables
load_dotenv(ENV_FILE, override=True)
