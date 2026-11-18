# Otwarte pytania

Tu potrzebujemy pomocy. Przy każdym pytaniu jest to, co już wiemy, żeby nie zaczynać od zera.

## 1. Jak mierzyć zadania bliżej rzeczywistości?

Ocena „czy AI potrafi to zadanie” od modeli AI okazała się niestabilna (METODA.md, punkt 5). Ankieta sprzed lat się starzeje.
- Czy da się oceniać zadania na prawdziwych przykładach z pracy, np. zestaw kilku konkretnych zadań na zawód i ludzie z zawodu na ślepo oceniają wynik AI i człowieka?
- Czy znacie benchmarki, które da się sensownie przypisać do zadań KZiS?

## 2. Jak łączyć indeks ILO z ankietą?

Teraz: do 19 osób z zawodu nic nie pokazujemy, od 20 pokazujemy surowe liczby.
Propozycja do obejrzenia: `eksperymenty/laczenie_ilo_ankieta.py`. Ocena ILO to punkt wyjścia warty K „wirtualnych” odpowiedzi, a każda prawdziwa odpowiedź przesuwa wynik. Do tego przedział niepewności.
- Jakie K? Stałe czy zależne od tego, jak pewna była ocena w indeksie (ankieta, eksperci, model)?
- Czy „AI mi pomaga” to 0,5? A „nie używam do tego AI”: pomijać, czy liczyć jako osobny sygnał?
- Czy próg 20 osób w ogóle jest potrzebny, jeśli pokazujemy przedział? Uwaga: próg wynika też z polityki prywatności, więc zmiana wymaga zmiany polityki na przyszłość.

## 3. Czy rozbijać ogólne zadania?

„Tworzenie i modyfikowanie kodu aplikacji” to jedno zadanie dla juniora i seniora, dla prostego formularza i dla systemu sterującego maszyną.
- Czy rozbić zadania przynajmniej w kilku zawodach (IT, grafika, tłumaczenia, obsługa klienta) na konkretniejsze?
- Kto i jak ma je spisać, żeby nie wymyślał ich model? Ludzie z zawodu w ankiecie? Ogłoszenia o pracę?
- Jak wtedy przenieść ocenę z ogólnego zadania na mniejsze, zanim zbierzemy odpowiedzi?

## 4. Jak pokazywać wynik?

- Jedna średnia, rozkład zadań (ile wysokich, średnich, niskich), czy bez jednej liczby?
- Co z zadaniami w rodzaju BHP, które ma prawie każdy zawód: zostawić, osobno, pominąć?
- Czy wagi 1 i 3 zastąpić czymś lepszym, np. procentem czasu podanym przez użytkownika?

## 5. Ankieta: jakość bez danych osobowych

- Jak ograniczyć wielokrotne wysyłanie i spam bez zbierania IP, maila i bez cookies śledzących?
- Jak opisać i częściowo skorygować samoselekcję (odpowiadają głównie ludzie, których temat dotyka)?

## 6. Gdzie trzymać dane

Teraz: Airtable przez funkcję Netlify. Przy rosnącej liczbie odpowiedzi dojdziemy do limitów rekordów i wywołań API, a odczyt zbiorczy przechodzi wszystkie wiersze zawodu.
- Co jest najprostsze w utrzymaniu dla jednej osoby: Netlify Blobs, Supabase, SQLite (np. Turso), coś innego?
- Czy liczyć zbiorcze wyniki od razu przy zapisie, zamiast przy każdym odczycie?

## 7. Czego nie widzimy?

Jeśli coś w logice jest Waszym zdaniem po prostu błędne, napiszcie to wprost.
