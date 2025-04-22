from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import api_router

app = FastAPI(title="Mechanic Booking API", version="0.1.0")

# simple CORS so the Next.js front‑end can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
