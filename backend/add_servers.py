import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "metin2.db")

SERVERS = [
    "Marmara",
    "Bagjanamu",
    "Barbaros",
    "Ege",
    "Arkadaşlar",
    "Van",
    "Felis",
    "Pandora",
    "Agamemnon",
    "Alesta",
    "Dandanakan"
]

def add_servers():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for server_name in SERVERS:
        cursor.execute("INSERT OR IGNORE INTO servers (name) VALUES (?)", (server_name,))
        if cursor.rowcount > 0:
            print(f"Added server: {server_name}")
        else:
            print(f"Server already exists: {server_name}")
            
    conn.commit()
    conn.close()
    print("Done adding servers.")

if __name__ == "__main__":
    add_servers()
