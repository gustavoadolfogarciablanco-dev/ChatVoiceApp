#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

const localesDir = path.resolve("i18n/locales");
const files = await fs.readdir(localesDir);
const keySet = new Set();
for (const f of files) {
  if (!f.endsWith(".ts")) continue;
  const full = path.join(localesDir, f);
  const content = await fs.readFile(full, "utf8");
  // crude key extraction: 'key': or "key": inside object literal
  const regex = /['\"]([^'\"]+)['\"]\s*:/g;
  let m;
  while ((m = regex.exec(content))) {
    keySet.add(m[1]);
  }
}
const keys = Array.from(keySet).sort();
const out = `// AUTO-GENERATED FILE. Do not edit manually.\nexport type GeneratedMessageKey =\n${keys.map((k) => `  | '${k}'`).join("\n")};\n`;
await fs.writeFile(path.resolve("i18n/generated-keys.d.ts"), out, "utf8");
console.log(`Generated ${keys.length} i18n keys.`);
