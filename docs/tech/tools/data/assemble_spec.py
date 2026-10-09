"""Builds combat-spec.md (v3) from combat-spec-v2.md + spec_new_sections.md + generated tables (build/v3/tables)."""
import re, os
ROOT = '/workspace/desy'; V3 = ROOT + '/build/v3'
v2 = open(ROOT + '/combat-spec-v2.md', encoding='utf-8').read()
new = {}
for blk in re.split(r'^@@@ ', open(V3 + '/spec_new_sections.md', encoding='utf-8').read(), flags=re.M)[1:]:
    key, body = blk.split('\n', 1); new[key.strip()] = body.strip('\n') + '\n'

# split v2 into sections
chunks = []; cur = ['__pre__', []]
for ln in v2.splitlines(keepends=True):
    if ln.startswith('## ') or ln.startswith('### '):
        chunks.append(cur); cur = [ln.strip(), [ln]]
    else: cur[1].append(ln)
chunks.append(cur)
def old(prefix):
    for h, body in chunks:
        if h.startswith(prefix): return ''.join(body).rstrip('\n') + '\n'
    raise KeyError(prefix)
def renum(s):
    for a, b in (('10', '11'), ('9', '10'), ('8', '9')):
        s = re.sub(r'§' + a + r'(?=[.\s),;])', '§' + b + '\uE000', s)
    return s.replace('\uE000', '')
def sub1(s, a, b):
    assert a in s, a[:60]; return s.replace(a, b)

out = [new['PREAMBLE'], '---\n', new['GLOSSARY'], '---\n']
out += [old('## 1. '), new['1.1'], new['1.2'], old('### 1.3'), old('### 1.4'), '---\n']
s24 = old('### 2.4')
last = [l for l in s24.splitlines() if l.startswith('| Demon King, under-geared')][0]
s24 = sub1(s24, last, last + '\n' + new['2.4ADD'].rstrip('\n'))
s24 = sub1(s24, 'The normal-enemy numbers are unchanged from v1. The boss numbers use v2 stats.', 'Normal and boss numbers are unchanged from v2. The two elite rows are new.')
s25 = sub1(old('### 2.5'), 'A soft cap at 30 questions (location boss 40, realm boss 45) makes enemies "Tired"',
           'A soft cap at 30 questions in normal battles (elites included) and 45 in every boss battle (location and realm boss; v3.2, the location boss was 40) makes enemies "Tired"')
out += ['## 2. Damage model\n', new['2.1'], old('### 2.2'), new['2.3'], s24, s25, '---\n']
s32 = old('### 3.2')
s32 = sub1(s32, 'no change. Proficiency is **sticky**; see "rusty" below.', 'no change. Proficiency is **sticky** (no rusty rule).')
s32 = re.sub(r'\*\*Rusty \(proposed, not simulated\):\*\*.*?\n', new['3.2RUSTY'], s32)
s33 = old('### 3.3')
s33 = sub1(s33, 'SET_SIZE = 7; NEW_CAP = 4; WORKING_SET = 10     # max seen-but-not-proficient local items',
           'SET_SIZE = 7; NEW_CAP = 3; WORKING_SET = 10     # NEW_CAP: hard cap on new items per battle (v3.2, was 4); WORKING_SET: max seen-but-not-proficient local items')
s33 = sub1(s33, '        new_quota = min(len(unseen), SET_SIZE - len(s) - len(active))',
           '        new_quota = min(len(unseen), SET_SIZE - len(s) - len(active), NEW_CAP)   # v3.2: the cap still holds; the set may run short')
s33 = sub1(s33, '                         w_local, SET_SIZE - len(s))',
           '                         w_local, SET_SIZE - len(s))   # never padded with unseen items')
s33 = sub1(s33, 'progress spreads evenly over all 30 items', 'progress spreads evenly over all 47–60 items')
s33 = sub1(s33, '"0 of 30 ready"', '"0 of 52 ready"')
out += ['## 3. Proficiency model\n', new['3.1'], s32, s33, new['3.4'], '---\n']
out += [old('## 4. '), '---\n', new['5'], '---\n']
s65 = old('### 6.5')
out += ['## 6. Equipment, skills, MP and the companion\n', old('### 6.1'), new['6.2'], new['6.3'], new['6.4'], s65, new['6.6'], new['6.7'], '---\n']
out += ['## 7. Progression, economy and safety nets\n', old('### 7.1'), new['7.2'], new['7.3'], new['7.4'], new['7.5'], new['7.6'], new['7.7'],
        new['7.8'], new['7.9'], new['7.10'], new['7.11'], '---\n']
out += [new['8'], '---\n']
# 9 answer modes (old 8)
s81 = old('### 8.1')
head_end = s81.index('| Parameter | Default |')
s81 = '### 9.1 Speech: no retry for wrong answers; re-prompt only on technical failure\n\n' + new['9.1HEAD'] + '\n' + s81[head_end:]
s81 = sub1(s81, '**Proposed split between "wrong" and "technical failure"** (⚠ open question Q2):', new['9.1SPLIT'].strip())
s81 = sub1(s81, "| **Graded as wrong** (default) | The kid spoke, so this counts as an answer. ⚠ Jack may prefer to treat it as technical. The sim assumes it's wrong. |",
           '| **Graded as wrong** (decided) | The kid spoke, so this counts as an answer. |')
s81 = sub1(s81, 'The kid switches to 2-way proficiency (§3.1) until it\'s fixed.', 'The kid continues in reading mode (2 ways, §3.1) until it\'s fixed.')
s81 = sub1(s81, 'and optionally a cap on the spoken share of each battle (Q3).', 'and the 50% spoken cap per battle (§3.4).')
s82 = renum(old('### 8.2')).replace('### 8.2', '### 9.2')
s82 = sub1(s82, 'saying the first 40 items', 'saying the 60 slice items')
s82 = sub1(s82, "Tones aren't checked (Q12).", "Tones aren't checked (decided).")
s83 = renum(old('### 8.3')).replace('### 8.3', '### 9.3')
s83 = sub1(s83, '- Option display: EN→ZH options show characters, plus pinyin until the item has 2 correct answers in reading ZH→EN, or always when `reading = N`.',
           '- Option display: EN→ZH options show characters only. There is no pinyin anywhere in the game UI (v3.2); `reading = N` items lean on the audio.')
out += ['## 9. Answer modes\n', renum(s81), s82, s83, '---\n']
# 10 parent editor (old 9)
s91 = renum(old('### 9.1')).replace('### 9.1', '### 10.1')
s91 = sub1(s91, '  // ---- generated (parents may edit pinyin/topic/flags; engine re-validates) ----',
           '  // ---- generated (parents may edit pinyin/topic/flags; engine re-validates; pinyin is data only, never shown in the game UI) ----')
s91 = sub1(s91, "audio: { source: 'browser_tts' | 'cloud_tts' | 'recorded'; voice?: string; url?: string; checked: boolean };",
           "audio: { source: 'browser_tts' | 'cloud_tts' | 'recorded'; voice?: string; url?: string; checked: boolean };  // parent items: browser_tts (decided)")
s92 = renum(old('### 9.2')).replace('### 9.2', '### 10.2')
s92 = sub1(s92, 'split into 30-item locations automatically', 'split into 50-item locations automatically')
s92 = sub1(s92, '(see open question Q7)', '(the item then shows characters + English with no audio button; never pinyin)')
out += ['## 10. Parent editor data model\n', s91, s92, new['10.3'], new['10.4'], '---\n']
# 11 knobs etc (old 10)
s102 = renum(old('### 10.2')).replace('### 10.2', '### 11.2')
s102 = re.sub(r'\nKPIs:.*\n', '\n', s102).rstrip('\n') + '\n' + new['11.2ADD']
out += ['## 11. Tuning knobs, analytics, open questions\n', new['11.1'], s102, new['11.3'], new['11.4']]
out += ['---\n', new['12']]   # v3.8 world graph
doc = '\n'.join(x.rstrip('\n') + '\n' for x in out)
def tab(m):
    return open(f'{V3}/tables/{m.group(1)}.md', encoding='utf-8').read().rstrip('\n')
doc = re.sub(r'\{\{table:([a-z_]+)\}\}', tab, doc)
doc = re.sub(r'\n{3,}', '\n\n', doc)
open(ROOT + '/combat-spec.md', 'w', encoding='utf-8').write(doc)
print(len(doc.splitlines()), 'lines')
