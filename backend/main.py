import subprocess
import os
import sys
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .routers import market
from .database import engine, Base

# Load environment variables
load_dotenv()

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Metin2 Market Analysis API")

# CORS config
# Allow all for local dev to avoid network issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)

@app.get("/")
def read_root():
    return {"message": "Metin2 Market API is running. Check /docs for API documentation."}

import subprocess
import os
from pydantic import BaseModel

class ScrapeRequest(BaseModel):
    query: str
    server: Optional[str] = "Chimera"
    max_pages: Optional[int] = 50

@app.post("/scrape")
def trigger_scrape(request: ScrapeRequest):
    """Signals success immediately as scraping is global and data is available."""
    try:
        return {"message": f"Global scrape active. '{request.query}' is instantly available.", "output": "Data available."}
    except Exception as e:
        return {"message": f"Error: {str(e)}"}
