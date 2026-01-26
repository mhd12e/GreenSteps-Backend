import json
import logging
from typing import Any, Optional
from google import genai
from core.config import settings
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class BaseGeminiClient:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                logger.exception("Failed to initialize Google GenAI client")

    def _get_client(self) -> genai.Client:
        if not self.client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "ai_unavailable", "message": "AI service not configured or unavailable"},
            )
        return self.client

    def _extract_json(self, text: str) -> Any:
        if not text:
            raise ValueError("Empty AI response")
        
        cleaned = text.strip()
        # Handle markdown code blocks
        if "```" in cleaned:
            # Try to find json block
            import re
            match = re.search(r"```json\s*(.*?)\s*```", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(1)
            else:
                # Fallback to general code block
                match = re.search(r"```\s*(.*?)\s*```", cleaned, re.DOTALL)
                if match:
                    cleaned = match.group(1)
        
        # Further cleanup: sometimes models add trailing commas or other junk
        cleaned = cleaned.strip()
        
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Last ditch effort: find the first { and last }
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    pass
            
            # Or first [ and last ]
            start = cleaned.find("[")
            end = cleaned.rfind("]")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    pass
                    
            logger.error(f"Failed to parse JSON from AI response: {text}")
            raise ValueError("Could not extract valid JSON from AI response")

    def _response_to_text(self, response: Any) -> str:
        if response is None:
            return ""
        if hasattr(response, "text"):
            return response.text
        # Fallback for complex response objects if needed
        return str(response)
