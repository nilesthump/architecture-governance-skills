import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const destination = path.resolve(
  process.argv[2] ?? ".tmp/renderers/plantuml.jar",
);
const version = "1.2026.8";
const expected =
  "5e1ecfa8ecd32c90b03bbf3b1eb6f020943f98ab0fcf4032be31a0002ee2c462";
const r = await fetch(
  "https://github.com/plantuml/plantuml/releases/download/v" +
    version +
    "/plantuml.jar",
);
if (!r.ok) throw Error("Renderer download: " + r.status);
const bytes = Buffer.from(await r.arrayBuffer());
if (crypto.createHash("sha256").update(bytes).digest("hex") !== expected)
  throw Error("Renderer checksum mismatch");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, bytes);
console.log(JSON.stringify({ version, destination, sha256: expected }));
