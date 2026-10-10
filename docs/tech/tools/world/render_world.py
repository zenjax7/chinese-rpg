"""Renders world graphs: PNG (matplotlib, node x/y from the data) and mermaid text. -> data/world/diagrams/"""
import json, sys, os
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import world_graph as WG
OUT = '/workspace/desy/data/world/diagrams'
COL = {'town': '#e4572e', 'village': '#f3a712', 'inn': '#29335c', 'boss': '#7b0828', 'miniboss': '#c0392b', 'chest': '#d4ac0d', 'story': '#8e44ad', 'npc': '#16a085',
       'fork': '#7f8c8d', 'waypoint': '#95a5a6', 'stairs_up': '#2e86c1', 'stairs_down': '#2e86c1', 'portal': '#5dade2', 'exit': '#34495e', 'lever': '#a04000', 'shop': '#f39c12'}
SHAPE = {'town': 's', 'village': 's', 'inn': 'h', 'boss': '*', 'miniboss': 'P', 'chest': 'D', 'story': 'p', 'npc': 'o', 'stairs_up': '^', 'stairs_down': 'v', 'portal': '8'}
DCOL = {0: '#27ae60', 1: '#f1c40f', 2: '#e67e22', 3: '#c0392b'}
def draw(ax, g, title):
    A = g.get('aspect', 1.0); N = {n['id']: dict(n, x=n['x']*1000*A, y=n['y']*1000) for n in g['nodes']}
    T = WG.realm(g['realm']) if g.get('realm') else None
    for e in g['edges']:
        if isinstance(e['to'], dict): continue
        a, b = N[e['from']], N[e['to']]
        safe = T.E.get(f"{g['id']}/{e['id']}", {}).get('safe') if T else False
        c = '#27ae60' if safe else DCOL[e.get('danger', 0)]
        ax.plot([a['x'], b['x']], [-a['y'], -b['y']], color=c, lw=1 + 0.6*e.get('steps', 1), ls='--' if e.get('patrol') else '-', zorder=1, alpha=0.85)
        if e.get('steps', 1) > 1 and not safe: ax.text((a['x']+b['x'])/2, -(a['y']+b['y'])/2, str(e['steps']), fontsize=6, ha='center', va='center', color='#333', zorder=3,
                                                     bbox=dict(boxstyle='round,pad=0.1', fc='white', ec='none', alpha=0.7))
        if e.get('scripted'): ax.text((a['x']+b['x'])/2, -(a['y']+b['y'])/2 - 18, 'elite', fontsize=6, ha='center', color='#c0392b')
    for n in N.values():
        ax.scatter(n['x'], -n['y'], s=260 if n['kind'] in ('boss', 'town') else 140, c=COL.get(n['kind'], '#999'), marker=SHAPE.get(n['kind'], 'o'), zorder=2, edgecolors='black', linewidths=0.5)
        ax.text(n['x'], -n['y'] - 26, (n['title']['en'] if len(g['nodes']) <= 30 else n['id']) + (' ⌂' if n.get('fog') == 'landmark' and False else ''), fontsize=6 if len(g['nodes']) <= 30 else 4.5, ha='center', va='top', zorder=4)
    for e in g['edges']:
        if isinstance(e['to'], dict):
            a = N[e['from']]; ax.annotate(f"→ {e['to']['graph']}", (a['x'], -a['y']), xytext=(8, 8), textcoords='offset points', fontsize=6, color='#2e86c1')
    ax.set_title(title, fontsize=9); ax.set_aspect('equal'); ax.axis('off')
def legend(fig):
    from matplotlib.lines import Line2D
    h = [Line2D([], [], marker=SHAPE.get(k, 'o'), color='w', markerfacecolor=COL[k], markeredgecolor='k', markersize=7, label=k) for k in ('town', 'village', 'inn', 'boss', 'miniboss', 'chest', 'story', 'npc', 'fork', 'waypoint', 'stairs_down', 'portal')]
    h += [Line2D([], [], color='#27ae60', lw=2, label='safe edge'), Line2D([], [], color=DCOL[1], lw=2, label='danger 1'), Line2D([], [], color=DCOL[2], lw=2, label='danger 2'),
          Line2D([], [], color=DCOL[3], lw=2, label='danger 3'), Line2D([], [], color='k', lw=1.5, ls='--', label='boss approach (patrol)')]
    fig.legend(handles=h, loc='lower center', ncol=6, fontsize=7, frameon=False)
def png(ids, name, titles):
    gs = [WG.GRAPHS[i] for i in ids]
    fig, axs = plt.subplots(len(gs), 1, figsize=(11, 5.2*len(gs) + 0.8)); axs = [axs] if len(gs) == 1 else axs
    for ax, g, t in zip(axs, gs, titles): draw(ax, g, t)
    legend(fig); fig.tight_layout(rect=(0, 0.6/(5.2*len(gs)+0.8)*1.6, 1, 1)); fig.savefig(f'{OUT}/{name}.png', dpi=150); plt.close(fig)
def mermaid(gid):
    g = WG.GRAPHS[gid]; T = WG.realm(g['realm']); L = ['flowchart LR']
    shape = {'town': ('[[', ']]'), 'village': ('[[', ']]'), 'inn': ('[(', ')]'), 'boss': ('{{', '}}'), 'miniboss': ('{{', '}}'), 'chest': ('[/', '/]'), 'story': ('>', ']'), 'npc': ('([', '])'),
             'stairs_up': ('[\\', '/]'), 'stairs_down': ('[/', '\\]'), 'portal': ('((', '))')}
    for n in g['nodes']:
        a, b = shape.get(n['kind'], ('[', ']')); L.append(f'  {n["id"]}{a}"{n["title"]["en"]}<br/><i>{n["kind"]}</i>"{b}')
    for e in g['edges']:
        if isinstance(e['to'], dict):
            L.append(f'  {e["from"]} -. "{e["kind"]}" .-> X_{e["to"]["graph"]}["→ {e["to"]["graph"]}/{e["to"]["node"]}"]'); continue
        E = T.E[f"{gid}/{e['id']}"]
        lab = 'boss approach' if e.get('patrol') else ('safe' if E['safe'] else f"d{e['danger']}×{e['steps']}") + (' +elite' if e.get('scripted') else '')
        arrow = '-->' if e['kind'] == 'oneway' else '---'
        L.append(f'  {e["from"]} {"-.-" if e.get("patrol") else arrow}|"{lab}"| {e["to"]}')
    return '\n'.join(L)
if __name__ == '__main__':
    png(['realm_1'], 'realm_1', ['Realm 1 · Starter Meadow (authored, 17 nodes, 3 zones)'])
    png(['goblin_caves_1', 'goblin_caves_2', 'goblin_caves_3'], 'goblin_caves', ['Goblin Caves L1 (zone cave_mouth)', 'Goblin Caves L2 (inn inside)', 'Goblin Caves L3 (Goblin School, realm boss)'])
    png(['realm_8'], 'realm_8', ['Realm 8 overworld (reference, 93 nodes; the dungeons are separate graphs)'])
    for gid in ('realm_1', 'goblin_caves_1', 'goblin_caves_2', 'goblin_caves_3', 'realm_4'):
        open(f'{OUT}/{gid}.mmd', 'w').write(mermaid(gid) + '\n')
    print('rendered')
