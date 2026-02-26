import requests
import json

try:
    print("Testing GET /market/listings?item_name=Dolunay Kılıcı...")
    r = requests.get("http://127.0.0.1:8000/market/listings", params={"item_name": "Dolunay Kılıcı"})
    if r.status_code == 200:
        data = r.json()
        print(f"Success. Got {len(data)} listings.")
        if len(data) > 0:
            print("First item:", data[0]['item']['name'])
    else:
        print(f"Failed. Status: {r.status_code}")
except Exception as e:
    print(f"Error connecting: {e}")
