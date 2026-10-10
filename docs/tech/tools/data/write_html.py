"""Renders a Markdown doc to standalone HTML (re-created 2026-10-02 after the box reset; same look as combat-spec-v3.html).
Usage: python write_html.py [src.md] [out.html]   (default combat-spec.md -> combat-spec-v3.html)"""
import sys, re, markdown
src = sys.argv[1] if len(sys.argv) > 1 else '/workspace/desy/combat-spec.md'
out = sys.argv[2] if len(sys.argv) > 2 else '/workspace/desy/combat-spec-v3.html'
STYLE = """body{font-family:-apple-system,Segoe UI,Roboto,'Noto Sans SC',sans-serif;max-width:1200px;margin:2em auto;padding:0 1em;line-height:1.5;color:#222}
table{border-collapse:collapse;margin:1em 0;font-size:13px;display:block;overflow-x:auto}th,td{border:1px solid #ccc;padding:4px 7px;vertical-align:top}
th{background:#eef2fa;position:sticky;top:0}tr:nth-child(even) td{background:#fafafa}code{background:#f3f3f3;padding:1px 4px;border-radius:3px}
pre{background:#f6f8fa;padding:10px;overflow-x:auto;font-size:12.5px}h2{border-bottom:2px solid #4472C4;padding-bottom:4px;margin-top:2em}
nav{background:#f7f7f7;padding:10px 16px;border-radius:6px;font-size:14px}"""
text = open(src, encoding='utf-8').read()
title = re.search(r'^# (.+)$', text, re.M).group(1)
md = markdown.Markdown(extensions=['toc', 'tables', 'fenced_code'], extension_configs={'toc': {'toc_depth': '2-3'}})
body = md.convert(text)
html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{title}</title><style>{STYLE}</style></head><body>'
        f'<nav><b>Contents</b>{md.toc}</nav>{body}</body></html>')
open(out, 'w', encoding='utf-8').write(html); print(out, len(html), 'bytes')
