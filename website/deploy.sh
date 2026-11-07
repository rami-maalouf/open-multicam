#!/bin/zsh
# builds the site and publishes it to vercel as a static site: project "openmulticam", meant to
# be served at https://cam.orbitlabs.studio. needs bun and the vercel cli, signed in to
# the account that owns orbitlabs.studio. attach the domain to the project once.
set -euo pipefail
cd "$(dirname "$0")"
bun install --frozen-lockfile
bun run build
vercel deploy dist --prod --yes --project openmulticam
