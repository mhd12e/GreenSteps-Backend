import httpx
import logging
import time
from threading import Lock

logger = logging.getLogger(__name__)

BLOCKLIST_URL = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/disposable_email_blocklist.conf"
CACHE_TTL = 3600  # 1 hour

class EmailBlocklistService:
    def __init__(self):
        self._blocklist = set()
        self._last_updated = 0
        self._lock = Lock()

    def _update_blocklist(self):
        try:
            logger.info("Updating disposable email blocklist...")
            with httpx.Client(timeout=10.0) as client:
                response = client.get(BLOCKLIST_URL)
                response.raise_for_status()
                
                new_list = set()
                for line in response.text.splitlines():
                    domain = line.strip()
                    if domain and not domain.startswith("#"):
                        new_list.add(domain.lower())
                
                with self._lock:
                    self._blocklist = new_list
                    self._last_updated = time.time()
                
                logger.info(f"Blocklist updated with {len(self._blocklist)} domains.")
        except Exception as e:
            logger.error(f"Failed to update email blocklist: {e}")
            # Keep the old list if update fails

    def is_blocked(self, email: str) -> bool:
        if "@" not in email:
            return False
        
        domain = email.split("@")[-1].lower()
        
        # Check if update needed
        if time.time() - self._last_updated > CACHE_TTL:
            self._update_blocklist()
            
        with self._lock:
            return domain in self._blocklist

email_blocklist = EmailBlocklistService()
