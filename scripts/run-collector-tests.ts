import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
const python =
  process.env.UFC_PYTHON ??
  (existsSync(".venv/bin/python") ? ".venv/bin/python" : "python3");
const result = spawnSync(
  python,
  ["-m", "pytest", "tests/collector", "-q", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
