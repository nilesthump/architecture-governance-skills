import path from "node:path";
import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  ARCHITECTURE_PLANTUML_JAR: path.resolve(".tmp/renderers/plantuml.jar"),
  ARCHITECTURE_FONT: path.resolve(".tmp/renderers/NotoSansSC.ttf"),
  ARCHITECTURE_PYTHON: process.env.ARCHITECTURE_PYTHON ?? "python",
};
const r = spawnSync(process.execPath, ["tools/validate.mjs"], {
  env,
  stdio: "inherit",
});
process.exitCode = r.status ?? 1;
