from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import api_router
from .config import settings

app = FastAPI(
    title="Mechanic Booking API", 
    version="0.1.0",
    debug=settings.debug
)

# CORS configuration from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(api_router)
