import requests
import json

try:
    print("Testing POST /scrape...")
    # Just a dummy query, we don't want to actually wait for full scrape if possible, 
    # but the endpoint is synchronous. 
    # Wait, if I call it, it will run the scraper.
    # I'll just check if it returns 404.
    # Since it expects a body, if I send empty or valid, and get not 404, it exists.
    
    r = requests.post("http://127.0.0.1:8000/scrape", json={"query": "test"})
    print(f"Status: {r.status_code}")
    if r.status_code != 404:
        print("Endpoint exists!")
    else:
        print("Endpoint NOT found.")
except Exception as e:
    print(f"Error connecting: {e}")
