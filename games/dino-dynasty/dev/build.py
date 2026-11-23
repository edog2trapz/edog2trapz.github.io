#!/usr/bin/env python3
"""Builds games/dino-dynasty/index.html from the parts in src/.

Run from anywhere:  python3 games/dino-dynasty/dev/build.py
Optional:           python3 games/dino-dynasty/dev/build.py --extra OUTDIR
  also writes OUTDIR/standalone.html (no 2trapz site hooks) and OUTDIR/artifact.html (no <html> wrapper).
Needs Node only for the syntax check at the end.
"""
import pathlib, re, shutil, subprocess, sys, tempfile

here = pathlib.Path(__file__).resolve().parent
src = here / 'src'
ORDER = ['data.js', 'art.js', 'game.js', 'audio.js', 'scene.js', 'ui.js']

js = '\n'.join((src / f).read_text(encoding='utf-8') for f in ORDER)
body = (src / 'template.html').read_text(encoding='utf-8').replace('<!--SCRIPTS-->', '<script>\n' + js + '\n</script>')
split = body.index('<div id="app">')
head, rest = body[:split], body[split:]

def page(site):
    icons = ('<link rel="icon" href="../../assets/icon.svg" type="image/svg+xml">\n'
             '<link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png">\n') if site else ''
    live = '\n<script src="../../assets/live.js" defer></script>' if site else ''
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="theme-color" content="#0b2526">\n' + icons + head + '</head>\n<body>\n' + rest + live + '\n</body>\n</html>\n')

out = here.parent / 'index.html'
out.write_text(page(True), encoding='utf-8')
if '--extra' in sys.argv:
    d = pathlib.Path(sys.argv[sys.argv.index('--extra') + 1]); d.mkdir(parents=True, exist_ok=True)
    (d / 'standalone.html').write_text(page(False), encoding='utf-8')
    (d / 'artifact.html').write_text(body, encoding='utf-8')

msg = f'built {out} ({out.stat().st_size // 1024} KB)'
if shutil.which('node'):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(js)
    r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
    pathlib.Path(f.name).unlink()
    if r.returncode: sys.exit(r.stderr)
    msg += ', syntax ok'
print(msg)
