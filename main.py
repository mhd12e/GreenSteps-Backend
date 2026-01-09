from fastapi import FastAPI
from fastapi.exceptions import HTTPException
from mangum import Mangum
from api.routes import auth, voice
from core.database import Base, engine
from core.error_handling import http_exception_handler, generic_exception_handler

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GreenSteps API",
    description=(
        "GreenSteps API powers the GreenSteps platform.\n\n"
        "It provides secure authentication, user management, and AI-powered services "
        "with a focus on scalability, performance, and clean architecture.\n\n"
        "Production server: https://proj.devlix.org"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    servers=[
        {
            "url": "https://proj.devlix.org",
            "description": "Production server",
        }
    ],
    contact={
        "name": "GreenSteps Team",
        "url": "https://proj.devlix.org",
    },
    license_info={
        "name": "MIT",
    },
)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth.router)
app.include_router(voice.router)

handler = Mangum(app)