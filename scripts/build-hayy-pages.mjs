import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync("client/src/game/hayy-text-source.txt", "utf8")
  .replace(/\r/g, "")
  .replace(/\u0000/g, "");

const startMarker = "ذكر سلفنا الصالح";
const start = source.indexOf(startMarker);
const endMarker = "والسلام عليك أيها الأخ المفترض إسعافه ورحمة الله وبركاته.";
const end = source.lastIndexOf(endMarker);
const body = source.slice(start >= 0 ? start : 0, end >= 0 ? end + endMarker.length : source.length)
  .replace(/\s+/g, " ")
  .replace(/\s+([،؛.!؟])/g, "$1")
  .trim();

const words = body.split(" ");
const pages = [];
let current = "";
for (const word of words) {
  const candidate = current ? `${current} ${word}` : word;
  if (candidate.length > 250 && current) {
    pages.push(current);
    current = word;
  } else {
    current = candidate;
  }
}
if (current) pages.push(current);

const arabicDigits = (value) => String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
const outputPath = process.env.HAYY_PAGES_OUTPUT ?? "client/src/game/hayy-pages-data.json";
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ pageCount: pages.length, pages }));
console.log(`Generated ${pages.length} pages from ${body.length} characters.`);
console.log(`Page range: ١–${arabicDigits(pages.length)}`);
