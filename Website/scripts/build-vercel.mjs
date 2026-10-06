import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const result = spawnSync(process.execPath, [vite, "build"], {
  env: {
    ...process.env,
    NITRO_PRESET: "vercel",
    SITE_DEPLOY_TARGET: "vercel",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

process.exitCode = result.status ?? 1;
