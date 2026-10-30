import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
await p.goto(process.env.URL ?? "http://localhost:3000/en");
const r = await new AxeBuilder({ page: p }).withRules(["color-contrast"]).analyze();
for (const v of r.violations) for (const n of v.nodes) console.log(n.target.join(" "), "|", n.any[0]?.message.slice(0,140));
await b.close();
