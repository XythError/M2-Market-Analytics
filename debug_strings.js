const key = "Yarı İnsanlara Karşı Güçlü";
const target = "Yarı insanlara karşı güçlü +%10";

console.log(`Key: ${key}`);
console.log(`Key Lower: ${key.toLowerCase()}`);
console.log(`Target: ${target}`);
console.log(`Target Lower: ${target.toLowerCase()}`);
console.log(`Match: ${target.toLowerCase().includes(key.toLowerCase())}`);

console.log("--- Turkish Locale ---");
console.log(`Key Locale Lower: ${key.toLocaleLowerCase('tr')}`);
console.log(`Target Locale Lower: ${target.toLocaleLowerCase('tr')}`);
console.log(`Match TR: ${target.toLocaleLowerCase('tr').includes(key.toLocaleLowerCase('tr'))}`);
