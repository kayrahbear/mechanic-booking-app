from fastapi import FastAPI, HTTPException
from google.cloud import firestore

app = FastAPI()
db = firestore.Client()   # uses ADC on Cloud Run

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/availability")
def list_availability():
    # TODO: read from Firestore
    return []

@app.post("/bookings")
def create_booking(payload: dict):
    # TODO: transaction logic
    raise HTTPException(status_code=501, detail="Not implemented yet")
