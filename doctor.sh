#!/bin/bash
set -euo pipefail
echo "== Env =="; node -e "console.log({PORT:process.env.PORT,REPL_ID:process.env.REPL_ID,REPLIT_DOMAINS:process.env.REPLIT_DOMAINS})"
echo "== Routes =="; curl -s http://127.0.0.1:${PORT:-5000}/health || true
echo "== Auth =="
curl -I http://127.0.0.1:${PORT:-5000}/api/login | tr -d '\r' | awk '/^HTTP|^Location/'
echo "== Whoami (unauth) =="; curl -s http://127.0.0.1:${PORT:-5000}/api/auth/user | jq
echo "== Dashboard route =="; curl -I http://127.0.0.1:${PORT:-5000}/dashboard | head -n1