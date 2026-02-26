import time
from playwright.sync_api import sync_playwright

URL = "https://metin2alerts.com/store"

def debug_html():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(URL, timeout=60000)
            print("Page loaded.")
        except Exception as e:
            print(f"Goto error (might be okay if partial load): {e}")

        # Just wait a bit instead of strict networkidle
        time.sleep(5)
        
        # Select Server (Marmara - 409)
        try:
            # Check if select exists
            if page.locator("select").count() > 0:
                page.select_option("select", value="409")
                print("Selected Marmara.")
                time.sleep(2)
            else:
                print("No select element found.")
        except Exception as e:
            print(f"Server selection failed: {e}")

        # Search for "Dolunay"
        try:
            search_input = page.locator("#item-search-input")
            if search_input.count() > 0:
                search_input.fill("Dolunay")
                time.sleep(1)
                search_input.press("Enter")
                print("Searched for Dolunay.")
                time.sleep(5) # Wait for results
            else:
                print("Search input not found via ID. Dumping body text...")
                print(page.inner_text("body")[:500])
        except Exception as e:
            print(f"Search error: {e}")

        # Dump the HTML of the first row
        try:
            rows = page.locator("tbody tr")
            count = rows.count()
            print(f"Found {count} rows.")
            
            if count > 0:
                first_row = rows.first
                html = first_row.inner_html()
                print("--- FIRST ROW HTML ---")
                print(html)
                print("----------------------")
            else:
                print("No rows found. Dumping table HTML if exists:")
                table = page.locator("table")
                if table.count() > 0:
                    print(table.first.inner_html())
                else:
                    print("No table found.")
                    
        except Exception as e:
            print(f"Could not get row HTML: {e}")

        browser.close()

if __name__ == "__main__":
    debug_html()