const MAX_BONUSES = {
  // Stats
  "Zeka": 12,
  "Güç": 12,
  "Çeviklik": 12,
  "Canlılık": 12,
  "Yaşam Enerjisi": 12,
  
  // Defenses
  "Kılıç Savunması": 15,
  "Çift El Savunması": 15,
  "Bıçak Savunması": 15,
  "Çan Savunması": 15,
  "Yelpaze Savunması": 15,
  "Ok Savunması": 15,
  "Büyüye Karşı Dayanıklılık": 15,
  "Şimşeğe Karşı Dayanıklılık": 15,
  "Rüzgara Karşı Dayanıklılık": 15,
  "Ateşe Karşı Dayanıklılık": 15,
  
  // Strong Against
  "Yarı İnsanlara Karşı Güçlü": 10,
  "Ölümsüzlere Karşı Güçlü": 20, // Title case in map
  "Şeytanlara Karşı Güçlü": 20,
  "Hayvanlara Karşı Güçlü": 20,
  "Mistiklere Karşı Güçlü": 20,
  "Orklara Karşı Güçlü": 20,
  
  // Combat
  "Kritik Vuruş Şansı": 10,
  "Delici Vuruş Şansı": 10,
  "Zehirleme Şansı": 8, // Title case
  "Sersemletme Şansı": 8,
  "Yavaşlatma Şansı": 8,
  "Büyü Hızı": 20,
  "Saldırı Değeri": 50,
  "Saldırı Hızı": 8,
  
  // Special
  "Max HP": 2000,
  "HP Üretimi": 30,
};

const isMaxBonus = (bonusStr) => {
  for (const [key, maxVal] of Object.entries(MAX_BONUSES)) {
    // Case insensitive check
    if (bonusStr.toLowerCase().includes(key.toLowerCase())) {
      const matches = bonusStr.match(/(\d+)/g);
      if (matches) {
        for (const m of matches) {
           if (parseInt(m) >= maxVal) return true;
        }
      }
    }
  }
  return false;
};

// Test strings from my scrape
const testStrings = [
    "Ölümsüzlere karşı güçlü +%20", // Should be TRUE
    "Mistiklere karşı güçlü +%6",   // False
    "Saldırı Değeri +50",           // TRUE
    "Yarı insanlara karşı güçlü +%10", // TRUE (Case mismatch in original logic?)
    "Zehirleme şansı %2",           // False
    "Kritik Vuruş Şansı: +%10",     // TRUE
    "Ortalama Zarar %45",           // False (No key)
    "Hayvanlara karşı güçlü (Toplam değerin +%6 oranında)" // False (6 < 20)
];

testStrings.forEach(s => {
    console.log(`'${s}': ${isMaxBonus(s)}`);
});
