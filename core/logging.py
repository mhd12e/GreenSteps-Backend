from aws_lambda_powertools import Logger
from core.config import settings

logger = Logger(service=settings.SERVICE_NAME)
