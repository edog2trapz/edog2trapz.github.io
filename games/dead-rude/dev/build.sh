#!/bin/bash
# Builds games/dead-rude/index.html from the parts in src/, in this order.
# Run from anywhere: bash games/dead-rude/dev/build.sh   (needs Node for the syntax check)
set -e
cd "$(dirname "$0")"
PARTS="00-head.html 01-core.js 02a-maps.js 02-data.js 02b-hunt.js 03-audio.js 03b-audio.js 04-textures.js 04b-textures.js 05a-kit.js 05x-kit.js 05b-props.js 05c-blackthorn.js 05d-build.js 06-fx.js 06b-viewmodel.js 07-ghosts.js 07b-haunt.js 08-player.js 09-ui.js 10-main.js 99-tail.html"
(for p in $PARTS; do cat "src/$p"; done) > ../index.html
if command -v node >/dev/null; then
  tmp=$(mktemp --suffix=.mjs); awk '/^<script type="module">$/{f=1;next} /^<\/script>$/{f=0} f' ../index.html > "$tmp"
  node --check "$tmp" && echo "built ../index.html ($(wc -c < ../index.html) bytes), syntax ok"; rm -f "$tmp"
fi
