from playwright.sync_api import sync_playwright
import time

URL = "https://metin2alerts.com/store"

def inspect_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(URL)
        print("Page loaded.")
        page.wait_for_load_state("networkidle")
        
        # Select Server First (Marmara) to ensure UI is active
        try:
            page.select_option("select", value="409")
            print("Selected Marmara.")
            time.sleep(2)
        except:
            print("Could not select server.")

        # Look for inputs (Search bars)
        inputs = page.query_selector_all("input")
        print(f"Found {len(inputs)} inputs:")
        for i, inp in enumerate(inputs):
            placeholder = inp.get_attribute("placeholder") or "No Placeholder"
            name = inp.get_attribute("name") or "No Name"
            type_attr = inp.get_attribute("type") or "No Type"
            print(f"  Input {i}: Type={type_attr}, Name={name}, Placeholder='{placeholder}'")

        # Look for buttons (Load more, search)
        buttons = page.query_selector_all("button")
        print(f"Found {len(buttons)} buttons (first 10 shown):")
        for i, btn in enumerate(buttons[:10]):
            text = btn.inner_text().replace('\n', ' ').strip()
            print(f"  Button {i}: Text='{text}'")
            
        browser.close()

if __name__ == "__main__":
    inspect_ui()
