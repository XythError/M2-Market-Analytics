from bs4 import BeautifulSoup

html = """
<td class="px-4 py-2">
    <div class="font-medium text-white text-sm">Dolunay Kılıcı+9 <span class="text-purple-800 font-bold">Karanlığın gücü 7 (2,1,4)</span>
    </div>
    <div class="text-xs text-gray-400">
        <span class="inline-block px-2 py-1 mr-1 mb-1 text-xs rounded bg-epic-900 text-epic-200 ">Ortalama Zarar %45</span><span class="inline-block px-2 py-1 mr-1 mb-1 text-xs rounded bg-gray-600 text-gray-300 ">Beceri Hasarı %-13</span><span class="inline-block px-2 py-1 mr-1 mb-1 text-xs rounded bg-epic-900 text-epic-200 ">Ölümsüzlere karşı güçlü +%20</span>
    </div>
</td>
"""

def test_soup():
    soup = BeautifulSoup(html, 'html.parser')
    info_col = soup.find('td')
    
    print("--- Test Name Extraction ---")
    name_div = info_col.find('div', class_=lambda x: x and 'font-medium' in x)
    if name_div:
        name_spans = name_div.find_all('span')
        special_bonuses = [s.get_text(strip=True) for s in name_spans]
        print(f"Special Bonuses: {special_bonuses}")
        
        # Remove spans to get name?
        # Note: In the real script I did s.extract() which modifies the tree.
        # Let's see if that affects subsequent finds if I did it wrong.
        for s in name_spans:
            s.extract()
        item_name = name_div.get_text(strip=True)
        print(f"Item Name: '{item_name}'")
    
    print("\n--- Test Bonus Extraction ---")
    # This is the exact logic from scraper.py
    bonus_div = info_col.find('div', class_=lambda x: x and 'text-xs' in x and 'text-gray-400' in x)
    
    bonuses = []
    if 'special_bonuses' in locals():
        bonuses.extend(special_bonuses)

    if bonus_div:
        print("Found bonus div.")
        bonus_spans = bonus_div.find_all('span')
        for s in bonus_spans:
            text = s.get_text(strip=True)
            print(f"  Found bonus: '{text}'")
            bonuses.append(text)
    else:
        print("Did NOT find bonus div.")
        # Print actual classes of divs to see why
        divs = info_col.find_all('div')
        for d in divs:
            print(f"  Div classes: {d.get('class')}")

    print(f"\nFinal Bonuses List: {bonuses}")

if __name__ == "__main__":
    test_soup()
