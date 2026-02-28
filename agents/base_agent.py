import os
import json
import requests

def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.0) -> str:
    try:
        import config
        api_key = getattr(config, 'OPENROUTER_API_KEY', os.getenv("OPENROUTER_API_KEY"))
    except ImportError:
        api_key = os.getenv("OPENROUTER_API_KEY")
        
    if not api_key:
        api_key = os.getenv("OPENROUTER_API_KEY")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "arcee-ai/trinity-large-preview:free",
        "temperature": temperature,
        "max_tokens": 800,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception:
        return "LLM_ERROR"
