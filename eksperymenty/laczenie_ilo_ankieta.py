"""EKSPERYMENT, propozycja do dyskusji, nie działa na stronie.

Pytanie: jak łączyć ocenę zadania z indeksu ILO z odpowiedziami ludzi z ankiety, zamiast obecnego
„do 19 osób nic, od 20 surowe liczby”?

Pomysł: ocena ILO to punkt wyjścia warty K „wirtualnych” odpowiedzi. Każda prawdziwa odpowiedź przesuwa
wynik w swoją stronę. Przy 3 osobach wynik prawie się nie rusza, przy 100 mówią głównie ludzie.
Do tego przedział, który pokazuje, jak pewny jest wynik.

Odpowiedzi zamieniamy na liczby tak (to też jest decyzja do dyskusji):
  „AI robi to za mnie” = 1,  „AI mi pomaga” = 0,5,  „AI nie daje rady” = 0,
  „Nie używam do tego AI” = pomijamy w ocenie możliwości, ale liczymy osobno jako odsetek nieużywających.

Dane: prawdziwych odpowiedzi nie publikujemy (polityka prywatności: tylko zbiorczo, od 20 osób z zawodu).
Domyślnie skrypt generuje dane SYNTETYCZNE, żeby było na czym ćwiczyć. Format CSV do własnych testów:
  kod,nr,odpowiedz     (odpowiedz: za / pom / nie / nu)

Użycie:
  python3 eksperymenty/laczenie_ilo_ankieta.py                 # dane syntetyczne, zawód 251401
  python3 eksperymenty/laczenie_ilo_ankieta.py --k 5 --osob 40
  python3 eksperymenty/laczenie_ilo_ankieta.py --csv moje.csv --kod 251401
"""
import argparse, csv, json, math, os, random
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WARTOSC = {'za': 1.0, 'pom': 0.5, 'nie': 0.0}


def syntetyczne(zadania, osob, ziarno=1):
    """Udajemy, że ludzie widzą rzeczywistość trochę inaczej niż indeks. To NIE są prawdziwe dane."""
    rnd = random.Random(ziarno)
    prawda = [min(0.95, max(0.05, s + rnd.uniform(-0.25, 0.25))) for _, s in zadania]
    wiersze = []
    for _ in range(osob):
        for nr, p in enumerate(prawda):
            if rnd.random() < 0.3:          # nie każdy zaznacza każde zadanie
                continue
            if rnd.random() < 0.15:
                wiersze.append((nr, 'nu'))
                continue
            pom = 1.2 * min(p, 1 - p)       # tak dobrane, żeby średnia odpowiedź wynosiła dokładnie p
            za = p - pom / 2
            r = rnd.random()
            wiersze.append((nr, 'za' if r < za else 'pom' if r < za + pom else 'nie'))
    return wiersze, prawda


def polacz(ocena_ilo, odpowiedzi, k):
    licz = Counter(odpowiedzi)
    n = sum(licz[o] for o in WARTOSC)
    suma = sum(WARTOSC[o] * licz[o] for o in WARTOSC)
    a, b = k * ocena_ilo + suma, k * (1 - ocena_ilo) + (n - suma)
    srednia = a / (a + b)
    odch = math.sqrt(a * b / ((a + b) ** 2 * (a + b + 1)))   # przybliżenie przedziału z rozkładu beta
    nu = licz['nu'] / max(1, sum(licz.values()))
    return srednia, max(0, srednia - 1.28 * odch), min(1, srednia + 1.28 * odch), n, nu


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--kod', default='251401')
    a.add_argument('--k', type=float, default=10, help='ile „wirtualnych odpowiedzi” jest warta ocena ILO')
    a.add_argument('--osob', type=int, default=25, help='ile osób symulować (tylko dane syntetyczne)')
    a.add_argument('--csv', help='plik z odpowiedziami: kod,nr,odpowiedz')
    x = a.parse_args()

    with open(os.path.join(ROOT, 'dane', 'z', f'{x.kod}.json'), encoding='utf-8') as f:
        z = json.load(f)
    if x.csv:
        with open(x.csv, encoding='utf-8') as f:
            wiersze = [(int(r['nr']), r['odpowiedz']) for r in csv.DictReader(f) if r['kod'] == x.kod]
        prawda, zrodlo = None, f'plik {x.csv}'
    else:
        wiersze, prawda = syntetyczne(z['t'], x.osob)
        zrodlo = f'DANE SYNTETYCZNE, {x.osob} udawanych osób'

    po_zadaniu = defaultdict(list)
    for nr, o in wiersze:
        po_zadaniu[nr].append(o)

    print(f"{z['n']} ({x.kod}), K = {x.k:g}, {zrodlo}\n")
    print(f"{'ILO':>5} {'łącznie':>8} {'przedział 80%':>15} {'n':>4} {'nie używa':>10}" + ('  „prawda”' if prawda else '') + '  zadanie')
    for nr, (opis, s) in enumerate(z['t']):
        sr, lo, hi, n, nu = polacz(s, po_zadaniu[nr], x.k)
        p = f'  {prawda[nr]:.2f}    ' if prawda else ''
        print(f'{s:5.2f} {sr:8.2f}   {lo:5.2f} – {hi:4.2f} {n:4d} {nu:9.0%}{p}  {opis[:60]}')


if __name__ == '__main__':
    main()
