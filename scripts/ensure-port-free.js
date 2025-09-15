// scripts/ensure-port-free.js
import { execSync } from 'node:child_process';

const PORT = process.env.PORT || 5000;

function tryKill(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {}
}

console.log(`[PORT] Ensuring port ${PORT} is free...`);

// Linux/macOS: try lsof and fuser
tryKill(`lsof -ti tcp:${PORT} | xargs -r kill -9`);
tryKill(`fuser -k ${PORT}/tcp`);

console.log(`[PORT] Port ${PORT} should be free.`);
