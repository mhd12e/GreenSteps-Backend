import boto3
from botocore.client import Config
from core.config import settings
import logging

logger = logging.getLogger(__name__)

class R2Storage:
    def __init__(self):
        self.bucket_name = settings.R2_BUCKET
        self.public_base_url = "https://r2.devlix.org" # Hardcoded based on previous .env or better from config if added. 
        # Actually user didn't add PUBLIC_URL to config.py but it was in .env. 
        # I'll try to use a constructed URL or just return the key if URL logic isn't strictly defined in config.py yet.
        # Check config.py... it has R2_ENDPOINT_URL etc but not PUBLIC_URL in the class definition shown in context.
        # I'll stick to returning keys or constructing URL if I can find the var.
        
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

    def upload_bytes(self, key: str, data: bytes, content_type: str = "image/png") -> str:
        """
        Uploads bytes to R2 and returns the public URL (assuming standardized public access).
        """
        try:
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
            # Assuming standard structure for public access if configured
            return f"https://r2.devlix.org/{key}"
        except Exception as e:
            logger.error(f"Failed to upload to R2: {e}")
            raise e

r2_storage = R2Storage()
