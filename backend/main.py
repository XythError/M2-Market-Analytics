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
    """Triggers the scraper for a specific item query and server."""
    try:
        # Run scraper as a subprocess
        env = os.environ.copy()
        env["SEARCH_QUERY"] = request.query
        env["SERVER_NAME"] = request.server
        env["MAX_PAGES"] = str(request.max_pages)
        
        # Path to scraper
        scraper_path = os.path.join(os.path.dirname(__file__), "scraper.py")
        
        # Run in background or wait? Waiting might timeout if it takes long.
        # For now, let's wait to ensure it works.
        # Use sys.executable to ensure the same python environment is used
        result = subprocess.run([sys.executable, scraper_path], env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            return {"message": f"Scraped successfully for '{request.query}'", "output": result.stdout}
        else:
            return {"message": "Scraper failed", "error": result.stderr}
            
    except Exception as e:
        return {"message": f"Error triggering scraper: {str(e)}"}
