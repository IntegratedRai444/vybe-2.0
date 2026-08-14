import os
import sys
from pathlib import Path

# Add the current directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests

# Import after setting up the path
from config.load_env import get_env_variable, set_env_variable


# Test the Groq API
def test_groq_connection():
    groq_key = os.getenv("GROQ_API_KEY")
    print(f"Using Groq API key (first 8 chars): {groq_key[:8]}...")

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json",
    }

    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "Hello, how are you?"}],
        "temperature": 0.7,
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        print("✅ Successfully connected to Groq API")
        print("Response:", response.json())
        return True
    except requests.exceptions.HTTPError as errh:
        print("❌ HTTP Error:", errh)
    except requests.exceptions.ConnectionError as errc:
        print("❌ Error Connecting:", errc)
    except requests.exceptions.Timeout as errt:
        print("❌ Timeout Error:", errt)
    except requests.exceptions.RequestException as err:
        print("❌ Oops: Something Else", err)

    return False


if __name__ == "__main__":
    print("Testing Groq API connection...")
    if test_groq_connection():
        print("✅ Groq API is properly configured!")
    else:
        print(
            "❌ Failed to connect to Groq API. Please check your API key and internet connection."
        )
