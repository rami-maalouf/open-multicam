#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 || $# -gt 5 ]]; then
  echo "usage: $0 recording.mp4 clip-start-seconds still-seconds output-prefix [crop-filter]" >&2
  exit 2
fi

recording=$1
start=$2
still=$3
prefix=$4
crop=${5:-null}
mkdir -p "$(dirname "$prefix")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# both timestamps are relative to the original recording.
ffmpeg -nostdin -v error -ss "$still" -i "$recording" -vf "$crop" \
  -frames:v 1 "$work/still.png"
ffmpeg -nostdin -v error -ss "$start" -i "$recording" -t 8 \
  -filter_complex "$crop,fps=10,scale='min(480,iw)':-2,split[a][b];[a]palettegen[p];[b][p]paletteuse" \
  -loop 0 "$work/motion.gif"
test -s "$work/still.png"
test -s "$work/motion.gif"
mv "$work/still.png" "$prefix.png"
mv "$work/motion.gif" "$prefix.gif"
