import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pathlib import Path
from core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME

    def _get_html_template(self, user_name: str, verify_url: str) -> str:
        """
        Returns HTML template with strictly inline styles for maximum email client compatibility.
        """
        # Style Constants
        primary_color = "#10b981"
        text_dark = "#111827"
        text_gray = "#4b5563"
        bg_gray = "#f9fafb"
        error_bg = "#fef2f2"
        error_border = "#fecaca"
        error_text = "#dc2626"
        expire_hours = settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        
        return f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: {text_dark}; margin: 0; padding: 0; background-color: {bg_gray};">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <img src="cid:logo" alt="GreenSteps" style="width: 48px; height: auto; margin-bottom: 16px;">
                        <h1 style="font-size: 24px; font-weight: 800; color: {text_dark}; margin: 0; letter-spacing: -0.025em;">Welcome to GreenSteps</h1>
                    </div>
                    <p style="font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 16px;">Hi {user_name},</p>
                    <p style="font-size: 16px; color: {text_gray}; margin-bottom: 24px;">We're thrilled to have you join our community! To start your journey towards a greener and more sustainable future, please verify your email address by clicking the button below.</p>
                    
                    <p style="font-size: 14px; color: {error_text}; margin-bottom: 32px; background-color: {error_bg}; padding: 12px; border-radius: 8px; border: 1px solid {error_border}; text-align: center;">
                        <strong>Note:</strong> This link will expire in {expire_hours} hours. If it expires, please register again to receive a new link.
                    </p>

                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="{verify_url}" style="background-color: {primary_color}; color: #ffffff !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Verify Email Address</a>
                    </div>
                    <p style="font-size: 14px; color: {text_gray}; margin-bottom: 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="font-size: 14px; margin: 0; word-break: break-all;"><a href="{verify_url}" style="color: {primary_color}; text-decoration: none;">{verify_url}</a></p>
                </div>
                <div style="text-align: center; font-size: 14px; color: #9ca3af; margin-top: 32px;">
                    <p style="margin: 0;">&copy; 2026 GreenSteps. Empowering your sustainable journey.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def send_verification_email(self, to_email: str, user_name: str, token: str):
        if not self.password or not self.user:
            logger.warning(f"SMTP not configured. Verification link for {to_email}: {settings.FRONTEND_URL}/verify?token={token}")
            return

        verify_url = f"{settings.FRONTEND_URL}/verify?token={token}"
        
        msg = MIMEMultipart('related')
        msg['Subject'] = "Verify your GreenSteps account"
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['To'] = to_email

        html = self._get_html_template(user_name, verify_url)
        msg.attach(MIMEText(html, 'html'))

        # Attach logo
        try:
            logo_path = Path(__file__).parent.parent / "frontend" / "public" / "logo.png"
            if logo_path.exists():
                with open(logo_path, 'rb') as f:
                    img = MIMEImage(f.read())
                    img.add_header('Content-ID', '<logo>')
                    img.add_header('Content-Disposition', 'inline', filename='logo.png')
                    msg.attach(img)
        except Exception as e:
            logger.error(f"Failed to attach logo to email: {e}")

        try:
            if self.port == 465:
                with smtplib.SMTP_SSL(self.host, self.port) as server:
                    server.login(self.user, self.password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(self.host, self.port) as server:
                    server.starttls()
                    server.login(self.user, self.password)
                    server.send_message(msg)
            
            logger.info(f"Verification email sent to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {e}")
            raise e

email_service = EmailService()