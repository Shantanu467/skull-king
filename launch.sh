#!/bin/bash

cleanup() {
    echo -e "\nStopping Skull King..."
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
    [ -n "$CF_PID" ]     && kill "$CF_PID"     2>/dev/null
    exit 0
}
trap cleanup INT TERM

# ── build client ──────────────────────────────────────────
echo "Building client..."
npm run build --prefix client 2>&1 | tail -3
echo ""

# ── start server ──────────────────────────────────────────
echo "Starting server..."
NODE_ENV=production node server.js &
SERVER_PID=$!

echo "Waiting for server on :3000..."
for i in $(seq 1 30); do
    curl -sf http://localhost:3000 >/dev/null 2>&1 && break
    sleep 0.5
done
echo "Server ready."
echo ""

# ── start cloudflare tunnel ───────────────────────────────
CF_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:3000 >"$CF_LOG" 2>&1 &
CF_PID=$!

echo "Opening Cloudflare tunnel..."
GAME_URL=""
for i in $(seq 1 30); do
    GAME_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | head -1)
    [ -n "$GAME_URL" ] && break
    sleep 1
done
rm -f "$CF_LOG"

if [ -z "$GAME_URL" ]; then
    echo "ERROR: Could not get tunnel URL. Is cloudflared working?"
    cleanup
fi

# ── show link ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  SKULL KING IS LIVE!                    ║"
echo "║                                                          ║"
printf  "║   %-56s║\n"  "$GAME_URL"
echo "║                                                          ║"
echo "║   Share this link with friends to play!                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop the server."

wait "$SERVER_PID"
