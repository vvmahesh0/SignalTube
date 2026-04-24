#!/usr/bin/env bash
set -euo pipefail

APP_NAME="SignalTube"

pkill -f "Electron.*SignalTube" 2>/dev/null || true
pkill -f "electron .*SignalTube" 2>/dev/null || true

npm run build

if [[ "${1:-}" == "--verify" ]]; then
  npm run desktop >/tmp/signaltube-desktop.log 2>&1 &
  sleep 8
  lsof -nP -iTCP:41739 -sTCP:LISTEN >/dev/null
  echo "$APP_NAME desktop server is running on 127.0.0.1:41739."
  exit 0
fi

npm run desktop
