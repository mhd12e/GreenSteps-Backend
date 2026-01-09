from fastapi import FastAPI
from fastapi.exceptions import HTTPException
from mangum import Mangum
from api.routes import auth
from core.database import Base, engine
from core.error_handling import http_exception_handler, generic_exception_handler

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth.router)

handler = Mangum(app)