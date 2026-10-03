import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const destination = path.resolve(
  process.argv[2] ?? ".tmp/renderers/NotoSansSC.ttf",
);
const url =
  "https://raw.githubusercontent.com/google/fonts/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf";
const r = await fetch(url);
if (!r.ok) throw Error("Font download: " + r.status);
const b = Buffer.from(await r.arrayBuffer());
if (
  crypto.createHash("sha256").update(b).digest("hex") !==
  "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da"
)
  throw Error("Font checksum mismatch");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, b);
console.log(
  JSON.stringify({
    destination,
    sha256: "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da",
    license:
      "SIL Open Font License 1.1; https://github.com/google/fonts/blob/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/notosanssc/OFL.txt",
  }),
);
