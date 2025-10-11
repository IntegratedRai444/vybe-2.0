import openai
import anthropic
import requests
from typing import Optional
from .config import *

class CloudClient:
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        
    def setup_openai(self, api_key: str):
        self.openai_client = openai.OpenAI(api_key=api_key)
        
    def setup_anthropic(self, api_key: str):
        self.anthropic_client = anthropic.Anthropic(api_key=api_key)
    
    def generate_openai(self, prompt: str, model: str = "gpt-4") -> str:
        if not self.openai_client:
            raise Exception("OpenAI not configured")
        
        response = self.openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000
        )
        return response.choices[0].message.content
    
    def generate_anthropic(self, prompt: str, model: str = "claude-3-sonnet-20240229") -> str:
        if not self.anthropic_client:
            raise Exception("Anthropic not configured")
            
        response = self.anthropic_client.messages.create(
            model=model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    
    def generate_groq(self, prompt: str, api_key: str, model: str = "llama3-8b-8192") -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "messages": [{"role": "user", "content": prompt}],
            "model": model,
            "max_tokens": 2000
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data
        )
        
        return response.json()["choices"][0]["message"]["content"]

cloud_client = CloudClient()