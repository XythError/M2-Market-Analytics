import sqlite3
import os

DB_PATH = os.path.join("data", "metin2.db")

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM listings;")
    count = cursor.fetchone()[0]
    print(f"Total listings: {count}")
    
    cursor.execute("SELECT * FROM listings ORDER BY seen_at DESC LIMIT 5;")
    rows = cursor.fetchall()
    print("Last 5 listings:")
    for row in rows:
        print(row)
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
