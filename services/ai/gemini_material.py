import base64
import io
import logging
from PIL import Image
from google.genai import types
from core.config import settings
from services.ai.base import BaseGeminiClient

logger = logging.getLogger(__name__)

class GeminiMaterialClient(BaseGeminiClient):
    def __init__(self):
        super().__init__()
        self.text_model = settings.MATERIAL_TEXT_GENERATION_MODEL
        self.img_model = settings.MATERIAL_IMG_GENERATION_MODEL

    def describe_material(self, image_bytes: bytes, mime_type: str) -> str:
        client = self._get_client()
        prompt = (
            "Analyze this image. Provide a REALISTIC description of the main waste material/object shown. "
            "Focus on its condition, material type (plastic, wood, etc.), and distinct features. "
            "Keep the description CONCISE: 2-3 short paragraphs max. Avoid flowery or overly poetic language."
        )
        
        response = client.models.generate_content(
            model=self.text_model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        return self._response_to_text(response)

    def generate_ways_json(self, image_bytes: bytes, mime_type: str, description: str) -> list:
        client = self._get_client()
        
        prompt = f"""
        Context: The user wants to upcycle/recycle this material.
        Description of material: {description}
        
        Task: Suggest EXACTLY 3 REALISTIC, FEASIBLE, and USEFUL ways to recycle this material into something new at home.
        Avoid purely decorative "art" unless it serves a function. Focus on practical utility.
        
        Output strict JSON. The structure must be a list of objects.
        Example format:
        [
            {{
                "title": "Portable Pencil Case",
                "description": "A practical storage solution created by cutting and joining...",
                "img_prompt": "A realistic photo of a DIY pencil case made from [material]..."
            }}
        ]
        
        Do not include markdown code fences. Just the raw JSON array.
        """

        response = client.models.generate_content(
            model=self.text_model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        text = self._response_to_text(response)
        return self._extract_json(text)

    def generate_step_guide(self, user_img: bytes, mime: str, mat_title: str, mat_desc: str, way_title: str, way_desc: str) -> str:
        client = self._get_client()
        prompt = f"""
        Material: {mat_title}
        Material Description: {mat_desc}
        Goal Project: {way_title}
        Project Description: {way_desc}
        
        Generate a BEAUTIFUL, highly structured, and guiding step-by-step DIY guide (in Markdown) to build this.
        
        Rules for Markdown structure:
        - Use proper headings: `#` for the main title, `##` for sections, and `###` for sub-sections.
        - Use emojis liberally to make the guide engaging and friendly.
        - Include a "🛠️ Tools & Materials Needed" section with bullet points.
        - Include a "⚠️ Safety First" section.
        - Use a "📝 The Process" section with numbered steps. Keep instructions clear and actionable.
        - Add a "💡 Pro Tip" or "✨ Pro Tip" section at the end.
        
        Make it look professional, encouraging, and easy to follow.
        """
        
        response = client.models.generate_content(
            model=self.text_model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=user_img, mime_type=mime),
                        types.Part.from_text(text=prompt)
                    ]
                )
            ]
        )
        return self._response_to_text(response)

    def generate_image(self, prompt: str, reference_image: bytes = None, mime_type: str = "image/png") -> bytes:
        client = self._get_client()
        
        contents = []
        if reference_image:
            contents.append(types.Content(parts=[
                types.Part.from_text(text=prompt),
                types.Part.from_bytes(data=reference_image, mime_type=mime_type)
            ]))
        else:
            contents.append(types.Content(parts=[types.Part.from_text(text=prompt)]))

        response = client.models.generate_content(
            model=self.img_model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9"
                )
            )
        )
        
        for part in response.parts:
            if part.inline_data:
                try:
                    img = Image.open(io.BytesIO(part.inline_data.data))
                except Exception:
                    decoded = base64.b64decode(part.inline_data.data)
                    img = Image.open(io.BytesIO(decoded))
                
                img = img.resize((500, 300), Image.Resampling.LANCZOS)
                
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return buf.getvalue()
        
        raise Exception("No image generated")

gemini_material = GeminiMaterialClient()