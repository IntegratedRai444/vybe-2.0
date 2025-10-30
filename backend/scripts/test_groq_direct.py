import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the API key
api_key = os.getenv('GROQ_API_KEY')
print(f"Using API key (first 8 chars): {api_key[:8]}..." if api_key else "No API key found")

if not api_key:
    print("Error: GROQ_API_KEY not found in environment variables")
    exit(1)

# Test the API
url = "https://api.groq.com/openai/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

data = {
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "temperature": 0.7
}

try:
    print("Sending request to Groq API...")
    response = requests.post(url, headers=headers, json=data, timeout=10)
    response.raise_for_status()
    print("✅ Success! Response:")
    print(response.json())
except requests.exceptions.HTTPError as errh:
    print(f"❌ HTTP Error: {errh}")
    if hasattr(errh, 'response') and errh.response is not None:
        print(f"Response status: {errh.response.status_code}")
        print(f"Response body: {errh.response.text}")
except requests.exceptions.RequestException as err:
    print(f"❌ Request Error: {err}")
except Exception as e:
    print(f"❌ An unexpected error occurred: {e}")
