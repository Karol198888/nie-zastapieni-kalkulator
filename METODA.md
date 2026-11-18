# Metoda: skąd są liczby i czego nie mierzą

Stan na 18 listopada 2026.

## 1. Oceny zadań: indeks ILO i NASK

- Źródło: ILO Working Paper 140 (2025), wersja dla Polski przygotowana z NASK. Ok. 29,7 tys. ocen zadań dla 2541 zawodów KZiS (kody 6-cyfrowe).
- Jak powstały: ankieta wśród 1535 pracujących Polaków (2861 zadań) i przegląd ekspertów (608 zadań). Resztę ocen przewidziały na tej podstawie modele GPT-4, GPT-4o i Gemini Flash 1.5.
- Stan wiedzy: początek 2025 roku.
- Co mierzą: na ile generatywna AI **potrafi** wykonać zadanie. Nie mierzą, czy ktoś jej do tego **używa**, ani czy w danym zawodzie ubywa pracy.

Wniosek, który mówimy wprost: w dużej części to AI ocenia AI, i to modele sprzed półtora roku.

## 2. Wynik użytkownika

- Średnia ocen zaznaczonych zadań, ważona czasem: 1 za zwykłe zadanie, 3 za zadanie z „najwięcej czasu” (maks. trzy). Gdy zaznaczone jest jedno zadanie, waży 3.
- Poziom: progi średniej z indeksu ILO, czyli 0,4 / 0,5 / 0,6.
- Kolory zadań na stronie: poniżej 0,25 niskie, 0,25–0,5 średnie, od 0,5 wysokie.
- Cztery pytania o kontekst (forma pracy, wiek, jak długo uczy się tej pracy nowa osoba, jak używasz AI) **nie zmieniają liczby**. Dobierają tylko komentarze z badań pod wynikiem.
- Kod: `silnik/wynik.py` (Python) i funkcja `compute` w `strona/kalkulator.js`.

## 3. Barometr zawodów: głos urzędów pracy

- Coroczna prognoza powiatowych urzędów pracy na zlecenie MRPiPS. Dla 2027 roku: 168 grup zawodów × 380 powiatów, 63 840 ocen i 9579 komentarzy ekspertów.
- Grupy Barometru mają przypisane kody KZiS w samym Barometrze, więc nie dopasowujemy ich sami. Pokrycie: 2461 z 2541 zawodów kalkulatora.
- Pod wynikiem pokazujemy ocenę relacji popytu i podaży, zmianę zapotrzebowania i komentarze ekspertów, które wprost wspominają o AI.
- Kontrapunkt do ILO: księgowi mają w indeksie wysokie narażenie zadań, a Barometr pokazuje deficyt księgowych w 156 powiatach. Narażenie zadań to nie to samo co brak pracy.

## 4. Ankieta „Jak jest naprawdę u Ciebie?”

- Pod wynikiem użytkownik może przy każdym swoim zadaniu zaznaczyć: AI robi to za mnie / AI mi pomaga / AI nie daje rady / nie używam do tego AI. Dodatkowo podaje formę pracy.
- Anonimowo: losowy identyfikator zgłoszenia z przeglądarki, bez maila i adresu IP.
- Zapis: funkcja Netlify (`ankieta/ankieta.mjs`) → Airtable, jeden wiersz na zadanie.
- Pokazujemy zbiorczo i dopiero od 20 osób z zawodu.
- Pierwszy tydzień (11–17 listopada 2026): 42 zgłoszenia z 24 zawodów. Żaden zawód nie przekroczył jeszcze 20 osób.

## 5. Czego próbowaliśmy i dlaczego odpadło

**Ocena zadań od nowa dzisiejszymi modelami** (pilotaż 2 listopada 2026, 14 zawodów, 170 zadań, modele trzech firm oceniały na ślepo, bez wglądu w oceny ILO):
- modele różnych firm różniły się przy tym samym zawodzie nawet o 14 punktów na 100;
- jeden model zmieniał zdanie między przebiegami;
- od sposobu łączenia z oceną ILO zależało, czy księgowy ma „zagrożone” 47%, czy 100% zadań;
- żaden przebieg nie obniżył żadnej oceny. To może być wada metody: modele oceniają technologię, z której same pochodzą.

**Dane o faktycznym użyciu AI z USA** (Anthropic Economic Index, miara „observed exposure”, marzec 2026):
- wśród zawodów biurowych korelacja z oceną ILO wyszła 0,09;
- wynik zależy od tego, który amerykański zawód uznamy za odpowiednik polskiego (programista aplikacji: 0,75 albo 0,29);
- część tej miary to i tak ocena możliwości modeli z 2023 roku.

Obu pomysłów nie wdrożyliśmy. Zostały dwa źródła od ludzi: urzędy pracy i ludzie z zawodu.

## 6. Znane słabe miejsca

- Oceny z początku 2025, mierzą możliwości, a nie użycie.
- Zadania z KZiS są ogólne i takie same dla juniora i seniora.
- Prawie każdy zawód ma zadanie o BHP z niską oceną. Kto je zaznaczy, ma niższą średnią.
- Wagi 1 i 3 są umowne, a jedna średnia ukrywa rozrzut.
- Programista aplikacji i pracownik call center mają w indeksie prawie tę samą średnią (0,56).
- Ankieta: samoselekcja, słaba ochrona przed wielokrotnym wysłaniem, sztywny próg 20 osób.
- Airtable: limity rekordów i wywołań API przy rosnącej liczbie odpowiedzi; odczyt zbiorczy przechodzi wszystkie wiersze zawodu.
