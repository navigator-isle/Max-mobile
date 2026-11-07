#!/bin/sh
# Puts Max (phone app + backend) on Cloudflare. First time: a browser opens — sign in to Cloudflare and press Allow.
set -e; cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js first: https://nodejs.org (LTS), then run this again."; exit 1; }
if npx --yes wrangler@4 whoami 2>&1 | grep -qi "not authenticated"; then npx --yes wrangler@4 login; fi
node build.mjs
npx --yes wrangler@4 deploy
echo "Done. Open https://max-ai-backend.mjgaly-mg.workers.dev/health to check."
