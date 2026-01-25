from google import genai
from google.genai import types
from core.config import settings
import logging
import json
import base64
import re
from PIL import Image
import io

logger = logging.getLogger(__name__)

class GeminiMaterialClient:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.text_model = settings.MATERIAL_TEXT_GENERATION_MODEL
        self.img_model = settings.MATERIAL_IMG_GENERATION_MODEL
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)

    def _get_client(self):
        if not self.client:
            raise Exception("Google API Key not configured")
        return self.client

    def describe_material(self, image_bytes: bytes, mime_type: str) -> str:
        client = self._get_client()
        prompt = "Analyze this image. Provide a detailed, rich description of the main material/object shown, focusing on its texture, condition, and potential for reuse."
        
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
        return response.text

    def generate_ways_json(self, image_bytes: bytes, mime_type: str, description: str) -> list:
        client = self._get_client()
        
        # User context mentioned in prompt: "like we have in voice". 
        # Assuming minimal context or just the instruction to be creative/sustainable.
        prompt = f"""
        Context: The user wants to upcycle/recycle this material.
        Description of material: {description}
        
        Task: Suggest EXACTLY 3 creative, useful, and feasible ways to recycle this material into something new.
        
        Output strict JSON. The structure must be a list of objects.
        Example format:
        [
            {{
                "title": "Portable Pencil Case",
                "description": "Short description of the idea...",
                "img_prompt": "A prompt to generate a cover image for this pencil case, cartoonish style..."
            }}
        ]
        
        Do not include markdown code fences (```json). Just the raw JSON array.
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
        
        try:
            # Clean potential markdown fences if model ignores config
            text = response.text.strip()
            if text.startswith("```json"): text = text[7:]
            if text.startswith("```"): text = text[3:]
            if text.endswith("```"): text = text[:-3]
            return json.loads(text)
        except Exception as e:
            logger.error(f"Failed to parse ways JSON: {e}. Raw: {response.text}")
            raise e

    def generate_step_guide(self, user_img: bytes, mime: str, mat_title: str, mat_desc: str, way_title: str, way_desc: str) -> str:
        client = self._get_client()
        prompt = f"""
        Material: {mat_title}
        Material Description: {mat_desc}
        Goal Project: {way_title}
        Project Description: {way_desc}
        
        Generate a detailed step-by-step guide (in Markdown format) on how to create this project from the material.
        Include a "Tools Needed" list at the top.
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
        return response.text

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

        # Using gemini-2.5-flash-image
        response = client.models.generate_content(
            model=self.img_model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"]
            )
        )
        
        for part in response.parts:
            # Bypass SDK's as_image() wrapper which has inconsistent save() signature.
            # Process inline_data directly using standard PIL.
            if part.inline_data:
                # Try raw bytes first (SDK might have decoded it)
                try:
                    raw_data = part.inline_data.data
                    img = Image.open(io.BytesIO(raw_data))
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    return buf.getvalue()
                except Exception as e_raw:
                    # If raw fail, try base64 decode (if it was b64 string/bytes)
                    try:
                        decoded = base64.b64decode(part.inline_data.data)
                        img = Image.open(io.BytesIO(decoded))
                        buf = io.BytesIO()
                        img.save(buf, format="PNG")
                        return buf.getvalue()
                    except Exception as e_b64:
                        logger.warning(f"Could not encode image from inline_data: {e_raw}, {e_b64}. Returning raw data.")
                        return part.inline_data.data
        
        raise Exception("No image generated")

gemini_material = GeminiMaterialClient()
