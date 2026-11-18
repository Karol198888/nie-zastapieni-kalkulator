# Kalkulator (nie)zastąpionych: otwarta kopia do wspólnej pracy

Kalkulator na [nie-zastapieni.pl/kalkulator](https://nie-zastapieni.pl/kalkulator) pokazuje, które zadania z Twojej pracy AI potrafi już wykonywać. Wybierasz zawód z 2541 zawodów polskiej klasyfikacji (KZiS), zaznaczasz zadania, które naprawdę robisz, i dostajesz wynik zadanie po zadaniu.

To repozytorium jest **publiczną kopią samego kalkulatora**: danych, skryptów i logiki liczenia. Strona działa z osobnego, prywatnego repozytorium. Zmiany stąd trafiają na stronę dopiero po przejrzeniu.

**Po co ta kopia:** chcemy, żeby kalkulator był bliżej rzeczywistości, a nie był „AI ocenia AI”. Szukamy ludzi, którzy pomogą to przemyśleć i sprawdzić na danych. Otwarte pytania są w [PYTANIA.md](PYTANIA.md), a jak się włączyć, piszemy w [JAK-POMOC.md](JAK-POMOC.md).

## Jak to działa w skrócie

1. Każde zadanie zawodu ma ocenę 0–1 z indeksu ILO i NASK (ILO Working Paper 140, 2025). 1 = generatywna AI potrafi wykonać dużą część zadania.
2. Użytkownik zaznacza swoje zadania i do trzech oznacza jako te, na które idzie najwięcej czasu.
3. Wynik to średnia ocen zaznaczonych zadań ważona czasem: zwykłe zadanie waży 1, a zadanie „najwięcej czasu” waży 3.

```
waga  = (zaznaczone tylko jedno zadanie lub zadanie z „najwięcej czasu”) ? 3 : 1
wynik = Σ(waga × ocena) / Σ waga
```

Szczegóły, źródła i to, czego próbowaliśmy i co odrzuciliśmy, są w [METODA.md](METODA.md).

## Co jest w środku

| Ścieżka | Co to jest |
|---|---|
| `dane/zawody.json` | lista 2541 zawodów: kod, nazwa, średnia z indeksu, gradient, liczba zadań, synonimy do wyszukiwarki |
| `dane/z/KOD.json` | jeden zawód: opis z KZiS i lista zadań `[opis, ocena]` |
| `silnik/wynik.py` | logika wyniku w jednym pliku Pythona, ta sama co na stronie |
| `strona/kalkulator.js` | skrypt kalkulatora ze strony (interfejs + liczenie), do wglądu |
| `ankieta/ankieta.mjs` | funkcja Netlify ankiety „Jak jest naprawdę u Ciebie?” (zapis do Airtable, zbiorcze wyniki od 20 osób) |
| `narzedzia/dane_zawodow.py` | buduje `dane/` z arkusza autorów raportu ILO |
| `narzedzia/barometr_pobierz.py`, `barometr_dane.py` | pobierają i przetwarzają Barometr zawodów (prognozy urzędów pracy) |
| `eksperymenty/` | próby nowych metod, na razie jedna: łączenie oceny ILO z ankietą |

## Uruchomienie

Wystarczy Python 3.10 lub nowszy, bez dodatkowych bibliotek.

```bash
python3 silnik/wynik.py --szukaj programista
python3 silnik/wynik.py 251401 --zadania 0,1,4,5 --czas 4
python3 eksperymenty/laczenie_ilo_ankieta.py --osob 40
```

Przebudowa danych od zera (potrzebne `pandas` i `openpyxl`):

```bash
# arkusz POLAND_FINAL_6digit_scores.xlsx z github.com/pgmyrek/POLAND_2025_GenAI_scores_6digit_occupations
python3 narzedzia/dane_zawodow.py ŚCIEŻKA/POLAND_FINAL_6digit_scores.xlsx
```

## Czego tu celowo nie ma

- **Odpowiedzi z ankiety.** Polityka prywatności strony mówi, że pokazujemy je wyłącznie zbiorczo i dopiero wtedy, gdy z danego zawodu odpowie co najmniej 20 osób. Na razie żaden zawód nie ma 20 osób, więc nie publikujemy nic. Do ćwiczeń jest generator danych syntetycznych w `eksperymenty/`.
- **Danych Barometru zawodów.** Są tylko skrypty, którymi można je pobrać. Warunki ponownego wykorzystania danych z barometrzawodow.pl jeszcze sprawdzamy.
- **Kluczy i identyfikatorów usług.** Funkcja ankiety czyta je ze zmiennych środowiskowych.

## Źródła i licencje

- Oceny zadań: Gmyrek, P., Berg, J., Kamiński, K., Konopczyński, F., Ładna, A., Nafradi, B., Rosłaniec, K., Troszyński, M. (2025). *Generative AI and Jobs: A Refined Global Index of Occupational Exposure*. ILO Working Paper 140. https://doi.org/10.54394/HETP0387. © ILO, licencja CC BY 4.0. Nasza adaptacja: wybór pól i skrócenie opisów.
- Nazwy zawodów i opisy zadań: Klasyfikacja zawodów i specjalności (KZiS), Ministerstwo Rodziny, Pracy i Polityki Społecznej.
- Kod: zob. [LICENCJA.md](LICENCJA.md).

Kontakt: kontakt@nie-zastapieni.pl
