from fastapi import FastAPI
from fastapi.exceptions import HTTPException, RequestValidationError
from mangum import Mangum
from api.routes import auth, voice, impact, users
from core.database import Base, engine
from core.error_handling import http_exception_handler, generic_exception_handler, validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware # Import CORSMiddleware

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
            "url": "https://greensteps.devlix.org",
            "description": "Testing server",
        }
    ],
    contact={
        "name": "Contact Backend Developer",
        "email": "mhd12@devlix.org",
    },
    license_info={
        "name": "MIT",
    },
)

# Add CORS middleware
origins = [
    "http://localhost",
    "http://localhost:8001", # Allow frontend running on localhost:8001
    "https://greensteps.devlix.org" # Allow testing server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth.router)
app.include_router(voice.router)
app.include_router(impact.router)
app.include_router(users.router)

handler = Mangum(app)
