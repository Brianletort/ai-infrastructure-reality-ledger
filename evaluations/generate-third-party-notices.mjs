import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyApprovedDispositions,
  renderThirdPartyNotices,
} from "./core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = resolve(ROOT, "THIRD_PARTY_NOTICES.json");
const PYTHON_MANIFEST_PATH = resolve(ROOT, "THIRD_PARTY_NOTICES.python.json");
const NOTICE_PATH = resolve(ROOT, "THIRD_PARTY_NOTICES.md");
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const pythonManifest = JSON.parse(readFileSync(PYTHON_MANIFEST_PATH, "utf8"));
const expected = renderThirdPartyNotices({
  ...manifest,
  packages: [
    ...manifest.packages.map((pkg) => ({ ecosystem: "node", ...pkg })),
    ...applyApprovedDispositions(
      pythonManifest.packages,
      manifest.pythonApprovedDispositions ?? [],
    ),
  ],
});

if (process.argv.includes("--check")) {
  const actual = readFileSync(NOTICE_PATH, "utf8");
  if (actual !== expected) {
    throw new Error(
      "THIRD_PARTY_NOTICES.md is stale; run npm run notices:generate",
    );
  }
  process.stdout.write("Third-party notices are deterministic and current.\n");
} else {
  writeFileSync(NOTICE_PATH, expected);
  process.stdout.write("Generated THIRD_PARTY_NOTICES.md.\n");
}
