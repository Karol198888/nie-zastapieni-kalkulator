"""Buduje dane/barometr.json dla kalkulatora z surowego pobrania Barometru zawodów
(narzedzia/barometr_pobierz.py, gałąź barometr-dane, plik dane-surowe/barometr_2027.json).

Użycie: python3 narzedzia/barometr_dane.py ŚCIEŻKA/barometr_2027.json

W publicznej kopii nie ma pliku narzedzia/barometr_grupy_kzis_2027.json (przypisanie grup Barometru do kodów KZiS).
Powstaje z listy grup z API Barometru (/api/v1/profession-group-list-by-forecast-card), tej samej, którą pobiera barometr_pobierz.py.

Kody kategorii (legenda barometrzawodow.pl):
  relacja popytu i podaży: 1 duża nadwyżka, 2 nadwyżka, 3 równowaga, 4 deficyt, 5 duży deficyt, 6 brak oceny
  zmiana zapotrzebowania:  1 duży spadek, 2 spadek, 3 stabilne, 4 wzrost, 5 duży wzrost, 6 brak oceny
Komentarze o AI: zdania z komentarzy ekspertów, które wprost wspominają o sztucznej inteligencji, przepisane bez zmian."""
import json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(sys.argv[1]))
mapa = json.load(open(os.path.join(ROOT, 'narzedzia', 'barometr_grupy_kzis_2027.json')))
zaw = json.load(open(os.path.join(ROOT, 'dane', 'zawody.json')))['zawody']

AI = re.compile(r"sztuczn\w* inteligencj\w*|\bAI\b|\bSI\b|chatbot\w*|chat ?GPT|\bbot(?:y|ów|ami|om|a)?\b|generatywn\w*", re.I)
WOJ = ['dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie',
       'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie', 'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie']

def zdania_ai(t):
    t = re.sub(r'\s+', ' ', t).strip()
    zd = re.split(r'(?<=[.!?])\s+(?=[A-ZŁŚŻŹĆŃÓĘĄ])', t)
    idx = [i for i, z in enumerate(zd) if AI.search(z)]
    if not idx:
        return None
    wyb = set(idx)
    if len(' '.join(zd[i] for i in sorted(wyb))) < 70 and idx[-1] + 1 < len(zd):
        wyb.add(idx[-1] + 1)
    out = ' '.join(zd[i] for i in sorted(wyb))
    return out if len(out) <= 420 else out[:417].rsplit(' ', 1)[0] + '…'

# zawód (6 cyfr) -> grupa: najpierw pełny kod, potem grupa elementarna (4 cyfry)
kod2g = {}
for g, cs in mapa.items():
    for c in cs:
        kod2g.setdefault(c, []).append(g)
z = {}
for r in zaw:
    gs = kod2g.get(r[0]) or kod2g.get(r[0][:4])
    if gs:
        z[r[0]] = int(sorted(gs)[0])

g_out = {}
for g in raw['grupy']:
    gid = str(g['id'])
    prov = raw['wyniki'].get(gid, {})
    pl = (prov.get('1000') or [{}])[0]
    w = [0] * 16; rel = [0] * 7; need = [0] * 7; ai = []
    for pid, arr in prov.items():
        if pid == '1000':
            continue
        wi = int(pid) - 1
        for p in arr:
            w[wi] = p.get('p_relation_level') or 0
            for c in p.get('counties') or []:
                rel[c.get('relation_level') or 0] += 1
                need[c.get('need_level') or 0] += 1
                for pole in ('comment_relation', 'comment_need'):
                    t = c.get(pole)
                    s = zdania_ai(t) if t else None
                    if s and not any(a['p'] == c['name'] and a['t'] == s for a in ai):
                        ai.append({'w': wi, 'p': c['name'], 'n': c.get('need_level') or 0, 't': s})
    g_out[gid] = {'n': g['text'], 'pl': pl.get('p_relation_level', 0), 'plz': pl.get('p_need_level', 0),
                  'w': w, 'r': rel[1:], 's': need[1:], 'ai': ai}

out = {'rok': raw['rok'], 'pobrano': raw['pobrano'], 'zrodlo': 'https://barometrzawodow.pl/',
       'woj': WOJ, 'z': z, 'g': g_out}
json.dump(out, open(os.path.join(ROOT, 'dane', 'barometr.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('zawody z grupą:', len(z), '/', len(zaw), '; grupy:', len(g_out), '; komentarze o AI:', sum(len(v['ai']) for v in g_out.values()))
