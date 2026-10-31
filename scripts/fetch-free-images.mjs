// Downloads freely licensed photos from Wikimedia Commons for the public website, with licence and author recorded.
// Usage: node scripts/fetch-free-images.mjs            (needs commons.wikimedia.org + upload.wikimedia.org allowed)
//        node scripts/fetch-free-images.mjs --dry-run  (list candidates only)
// Output: public/images/<slot>.jpg + public/images/credits.json. Review every image by eye before publishing:
// no identifiable people without consent, no logos/brands presented as customers.
import { mkdirSync, writeFileSync } from "node:fs";
import { candidates, searchUrl } from "./lib/commons.mjs";

const SLOTS = [
  { slot: "truck", query: "garbage truck collection street" },
  { slot: "bins", query: "waste containers street bins" },
  { slot: "recycling", query: "recycling sorting cardboard bales" },
  { slot: "city-oran", query: "Oran Algeria city" },
  { slot: "city-algiers", query: "Algiers city street" },
];
const UA = "NEXVO-site-assets/1.0 (+https://github.com/aymenjak/wast-os)";
const dry = process.argv.includes("--dry-run");
mkdirSync("public/images", { recursive: true });
const credits = [];
for (const s of SLOTS) {
  const res = await fetch(searchUrl(s.query), { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status} for "${s.query}"`);
  const [best] = candidates(await res.json());
  if (!best) { console.log(`- ${s.slot}: no freely licensed match`); continue; }
  console.log(`- ${s.slot}: ${best.title} — ${best.author} — ${best.license}`);
  if (dry) continue;
  const img = await fetch(best.download, { headers: { "User-Agent": UA } });
  if (!img.ok) throw new Error(`download ${img.status}`);
  writeFileSync(`public/images/${s.slot}.jpg`, Buffer.from(await img.arrayBuffer()));
  credits.push({ slot: s.slot, file: `/images/${s.slot}.jpg`, ...best });
}
if (!dry) writeFileSync("public/images/credits.json", JSON.stringify(credits, null, 2) + "\n");
console.log(dry ? "dry run: nothing written" : `saved ${credits.length} images + credits.json`);
