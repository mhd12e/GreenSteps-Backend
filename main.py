import uuid
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from mangum import Mangum
from api.routes import auth, voice, impact, users, system
from core.database import Base, engine
from core.error_handling import http_exception_handler, generic_exception_handler, validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware # Import CORSMiddleware

app = FastAPI(
    title="GreenSteps API",
    description=(
        "GreenSteps API powers the GreenSteps platform.\n\n"
        "It provides secure authentication, user management, and AI-powered services "
        "with a focus on scalability, performance, and clean architecture.\n\n"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    servers=[
        {
            "url": "https://greensteps-api.devlix.org/test",
            "description": "Production server",
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

@app.on_event("startup")
def on_startup():
    # Optional: only if you REALLY want auto-create tables
    Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth.router)
app.include_router(voice.router)
app.include_router(impact.router)
app.include_router(users.router)
app.include_router(system.router)

INDEX_PATH = Path(__file__).with_name("index.html")


@app.get("/test", include_in_schema=False)
def serve_test_console():
    return FileResponse(INDEX_PATH, media_type="text/html")

# AWS Lambda entrypoint.
handler = Mangum(app)
