"""Builds /workspace/desy/world-graph.md from doc/world-graph.src.md + sim/tables.md + diagrams/*.mmd + sim/world_summary.json."""
import json, re
B = '/workspace/desy/build/world'; D = '/workspace/desy/data/world/diagrams'
s = open(f'{B}/doc/world-graph.src.md').read()
t = open(f'{B}/sim/tables.md').read().strip().split('\n\n')
s = s.replace('<!--SIM_REALM-->', t[0]).replace('<!--SIM_PROFILES-->', t[1]).replace('<!--SIM_V39-->', t[2]).replace('<!--SIM_FEATHER-->', t[3]).replace('<!--SIM_V391-->', t[4]).replace('<!--DENSITY-->', t[5])
s = re.sub(r'<!--MMD:(\w+)-->', lambda m: open(f'{D}/{m.group(1)}.mmd').read().strip().split('\n', 0)[0], s)
R = json.load(open(f'{B}/sim/world_summary.json'))
g = lambda mode: R[f'0.75 | on | saver | no spells | {mode}']
s = s.replace('<!--H_BEE-->', f"{g('beeline')['h']:.1f}").replace('<!--H_EXP-->', f"{g('explore')['h']:.1f}")
s = s.replace('<!--R9_EXP-->', f"{g('explore')['loc_min'][8]:.0f}").replace('<!--R9_BEE-->', f"{g('beeline')['loc_min'][8]:.0f}")
assert '<!--' not in s, re.findall(r'<!--[^>]*-->', s)
open('/workspace/desy/world-graph.md', 'w').write(s); print('world-graph.md', len(s.split()), 'words')
