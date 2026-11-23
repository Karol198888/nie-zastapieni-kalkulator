"""Wynik kalkulatora (nie)zastąpionych: ta sama logika co na stronie (strona/kalkulator.js, funkcja compute),
wyjęta do jednego pliku, żeby dało się ją czytać, testować i zmieniać bez przeglądarki.

Użycie:
  python3 silnik/wynik.py 251401                      # wszystkie zadania zawodu, bez wyróżnionych
  python3 silnik/wynik.py 251401 --zadania 0,1,4,5 --czas 4
  python3 silnik/wynik.py --szukaj programista        # znajdź kod zawodu

Zadania numerujemy od 0, w kolejności z pliku dane/z/KOD.json.
"""
import argparse, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WAGA_ZWYKLE, WAGA_NAJWIECEJ_CZASU = 1, 3
PROGI_POZIOMU = (0.4, 0.5, 0.6)          # progi średniej z indeksu ILO
PROGI_PASKA = (0.25, 0.5)                # kolory zadań na stronie: niskie / średnie / wysokie


def zawod(kod):
    with open(os.path.join(ROOT, 'dane', 'z', f'{kod}.json'), encoding='utf-8') as f:
        return json.load(f)


def wynik(zadania, wybrane, najwiecej_czasu=()):
    """zadania: lista [opis, ocena 0–1]; wybrane: numery zadań; najwiecej_czasu: do 3 numerów z wybranych.
    Zwraca średnią ważoną czasem i poziom 0–3."""
    if not wybrane:
        raise ValueError('Trzeba wybrać co najmniej jedno zadanie.')
    suma_wag = suma = 0.0
    for i in wybrane:
        waga = WAGA_NAJWIECEJ_CZASU if (len(wybrane) == 1 or i in najwiecej_czasu) else WAGA_ZWYKLE
        suma_wag += waga
        suma += waga * zadania[i][1]
    srednia = suma / suma_wag
    poziom = sum(srednia >= p for p in PROGI_POZIOMU)
    return srednia, poziom


def dziesiatki(zadania, wybrane, najwiecej_czasu=()):
    """Podział czasu na 10 części (tak pokazuje to strona od 23.11.2026): ile części to zadania
    wysokie / średnie / niskie. Metoda największych reszt, więc suma zawsze wynosi 10."""
    wagi = {'wysokie': 0.0, 'średnie': 0.0, 'niskie': 0.0}
    for i in wybrane:
        waga = WAGA_NAJWIECEJ_CZASU if (len(wybrane) == 1 or i in najwiecej_czasu) else WAGA_ZWYKLE
        wagi[pasek(zadania[i][1])] += waga
    razem = sum(wagi.values())
    surowe = {k: v / razem * 10 for k, v in wagi.items()}
    out = {k: int(v) for k, v in surowe.items()}
    for k in sorted(surowe, key=lambda k: surowe[k] - out[k], reverse=True)[:10 - sum(out.values())]:
        out[k] += 1
    return out


def pasek(ocena):
    return 'wysokie' if ocena >= PROGI_PASKA[1] else 'średnie' if ocena >= PROGI_PASKA[0] else 'niskie'


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('kod', nargs='?')
    a.add_argument('--zadania', help='numery zadań po przecinku (domyślnie wszystkie)')
    a.add_argument('--czas', default='', help='do 3 numerów zadań, na które idzie najwięcej czasu')
    a.add_argument('--szukaj', help='fragment nazwy zawodu')
    x = a.parse_args()

    if x.szukaj:
        with open(os.path.join(ROOT, 'dane', 'zawody.json'), encoding='utf-8') as f:
            for z in json.load(f)['zawody']:
                if x.szukaj.lower() in (z[1] + ' ' + z[6]).lower():
                    print(z[0], z[1], f'średnia ILO {z[2]:.2f}')
        return
    if not x.kod:
        a.error('podaj kod zawodu albo --szukaj')

    z = zawod(x.kod)
    wyb = [int(i) for i in x.zadania.split(',')] if x.zadania else list(range(len(z['t'])))
    czas = [int(i) for i in x.czas.split(',') if i]
    srednia, poziom = wynik(z['t'], wyb, czas)
    print(f"{z['n']} ({z['k']}), średnia zawodu w indeksie: {z['m']:.2f}\n")
    for i in wyb:
        opis, ocena = z['t'][i]
        print(f"  [{i}] {ocena:.2f} {pasek(ocena):8} {'*' if i in czas else ' '} {opis}")
    d = dziesiatki(z['t'], wyb, czas)
    print(f"\nNa 10 części czasu: {d['wysokie']} AI może wykonać dużą część, {d['średnie']} AI może pomóc, {d['niskie']} zostaje po Twojej stronie")
    print(f"Średnia: {srednia:.2f} z 1, poziom {poziom} z 3")


if __name__ == '__main__':
    main()
