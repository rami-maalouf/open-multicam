#!/bin/zsh
# builds the site and publishes it to vercel: project "openmulticam", served at
# https://cam.orbitlabs.studio. needs bun and the vercel cli, signed in to the account that owns
# orbitlabs.studio. the android waitlist (api/waitlist.ts) needs NOTION_API_KEY and
# NOTION_WAITLIST_DATASOURCE_ID on the vercel project.
set -euo pipefail
cd "$(dirname "$0")"
bun install --frozen-lockfile
bun run build
# deploy from this folder so /api/waitlist is included; vercel.json builds dist/ and serves it
vercel deploy --prod --yes --project openmulticam
