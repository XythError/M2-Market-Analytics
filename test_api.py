import requests
import json

try:
    print("Testing GET /market/listings...")
    r = requests.get("http://127.0.0.1:8000/market/listings")
    if r.status_code == 200:
        data = r.json()
        print(f"Success. Got {len(data)} listings.")
        if len(data) > 0:
            print("Sample:", json.dumps(data[0], indent=2))
        else:
            print("Response is empty list.")
    else:
        print(f"Failed. Status: {r.status_code}")
        print(r.text)
except Exception as e:
    print(f"Error connecting: {e}")
