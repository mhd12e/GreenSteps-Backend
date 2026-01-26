import logging
from typing import Tuple
from core.config import settings
from models import User
from services.ai.base import BaseGeminiClient

logger = logging.getLogger(__name__)

class GeminiImpactClient(BaseGeminiClient):
    def __init__(self):
        super().__init__()
        self.model = settings.IMPACT_GENERATION_MODEL

    def generate_impact_payload(self, topic: str, user: User) -> Tuple[dict, str]:
        client = self._get_client()
        user_name = user.full_name
        user_age = user.age
        user_interests = ", ".join(user.interests or [])
        
        prompt = f"""
You are a sustainability expert, totur, you will help the user optimize and make there setup sustainable and safe on the environment.
You are generating a structured plan in JSON. Output ONLY valid JSON with this exact shape:
{{
  "title": "impact title",
  "descreption": "impact short descreption",
  "steps": {{
    "1": {{
      "title": "step title",
      "descreption": "step full blown descreption",
      "icon": "fa-solid fa-recycle"
    }}
  }}
}}

User input Topic: {topic}
User Profile:
- Full Name: {user_name}
- Age: {user_age}
- Interests: {user_interests}
Rules:
- Use 3 to 8 steps strictly.
- Steps must be actionable and ordered.
- Keep descriptions concise but clear.
- Provide a unique Font Awesome CSS class string for each step icon.
Tone rules:
- Tailor explanations to the user's age and interests so guidance is easy to understand.
- This session is private and has zero logging; do not state otherwise.
"""
        response = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        
        text = self._response_to_text(response)
        return self._extract_json(text), text

gemini_impact = GeminiImpactClient()
