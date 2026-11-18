"""Buduje dane kalkulatora z indeksu ILO–NASK dla polskich zawodów (KZiS, 6 cyfr).

Źródło: Gmyrek, P., Berg, J., Kamiński, K., Konopczyński, F., Ładna, A., Nafradi, B., Rosłaniec, K.,
Troszyński, M. 2025. Generative AI and Jobs: A Refined Global Index of Occupational Exposure.
ILO Working Paper 140. © ILO. CC BY 4.0. Dane: github.com/pgmyrek/POLAND_2025_GenAI_scores_6digit_occupations
Nazwy zawodów i opisy zadań: Klasyfikacja zawodów i specjalności (KZiS), MRPiPS.

Użycie: python3 narzedzia/dane_zawodow.py ŚCIEŻKA/POLAND_FINAL_6digit_scores.xlsx
Wynik: dane/zawody.json (lista zawodów) i dane/z/KOD.json (zadania jednego zawodu).
"""
import json, os, re, sys, unicodedata
import pandas as pd

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'dane')

G = {'Exposed: Gradient 4': 4, 'Exposed: Gradient 3': 3, 'Exposed: Gradient 2': 2,
     'Exposed: Gradient 1': 1, 'Minimal Exposure': 0, 'Not Exposed': -1}

# Słowa, którymi ludzie szukają zawodu (formy żeńskie, potoczne i angielskie nazwy).
SYN = {
    'Telemarketer': 'telemarketerka telesprzedaż sprzedaż telefoniczna sprzedawca telefoniczny cold calling',
    'Pracownik centrum obsługi telefonicznej (pracownik call center)': 'konsultant konsultantka call center infolinia obsługa klienta customer service helpdesk',
    'Pracownik centrum elektronicznej obsługi klienta': 'obsługa klienta online czat konsultant customer support customer service e-mail',
    'Pracownik obsługi klienta instytucji finansowej': 'doradca klienta bank obsługa klienta banku',
    'Sprzedawca na telefon': 'telesprzedaż sprzedaż telefoniczna',
    'Ekspedytor sprzedaży wysyłkowej / internetowej': 'e-commerce sklep internetowy wysyłka zamówień',
    'Specjalista sprzedaży internetowej': 'e-commerce ecommerce sklep internetowy marketplace allegro',
    'Autor tekstów i sloganów reklamowych (copywriter)': 'copywriterka copywriting content writer teksty reklamowe',
    'Tłumacz': 'tłumaczka translator lokalizacja',
    'Tłumacz przysięgły': 'tłumaczka przysięgła',
    'Projektant grafiki': 'grafik graficzka graphic designer designer projektantka',
    'Grafik komputerowy DTP': 'grafik graficzka dtp skład',
    'Grafik komputerowy multimediów': 'grafik graficzka motion designer',
    'Projektant grafiki stron internetowych': 'web designer ui designer grafik',
    'Analityk doświadczenia użytkowników (user experience analyst)': 'ux designer ux researcher ui projektant ux',
    'Programista aplikacji': 'programistka developer deweloper software developer backend frontend',
    'Programista aplikacji mobilnych': 'programistka mobile developer android ios',
    'Specjalista do spraw rozwoju stron internetowych': 'frontend web developer',
    'Projektant stron internetowych (webmaster)': 'webmaster web developer wordpress',
    'Pracownik pozycjonowania stron internetowych': 'seo pozycjonowanie specjalista seo',
    'Tester oprogramowania komputerowego': 'testerka qa tester manualny',
    'Analityk baz danych (data scientist)': 'analityk danych data analyst data scientist bi',
    'Analityk biznesowy': 'analityczka business analyst',
    'Menedżer produktu (product manager)': 'product owner product managerka',
    'Kierownik projektu': 'project manager kierowniczka projektu pm scrum master',
    'Księgowy': 'księgowa księgowość',
    'Główny księgowy': 'główna księgowa',
    'Asystent do spraw księgowości': 'asystentka księgowej młodsza księgowa',
    'Fakturzystka': 'fakturzysta faktury',
    'Specjalista do spraw kadr': 'kadrowa kadrowy kadry hr specjalistka hr',
    'Pracownik obsługi płacowej': 'płace płacowa kadry i płace payroll',
    'Specjalista do spraw rekrutacji pracowników': 'rekruter rekruterka recruiter hr',
    'Sekretarka': 'sekretarz sekretariat',
    'Asystent zarządu': 'asystentka zarządu office manager',
    'Asystent dyrektora': 'asystentka dyrektora',
    'Pracownik biurowy': 'pracownica biurowa referent referentka administracja biuro',
    'Kierownik biura': 'office manager kierowniczka biura',
    'Recepcjonista': 'recepcjonistka recepcja',
    'Recepcjonista hotelowy': 'recepcjonistka hotel',
    'Specjalista do spraw marketingu i handlu': 'marketingowiec marketing specjalistka marketingu social media manager content marketing',
    'Kierownik do spraw marketingu internetowego': 'digital marketing performance marketing',
    'Menedżer marki (brand manager)': 'brand managerka',
    'Specjalista do spraw public relations': 'pr rzecznik prasowy komunikacja',
    'Menedżer zawartości serwisów internetowych': 'content manager',
    'Redaktor serwisu internetowego': 'redaktorka content redaktor www',
    'Dziennikarz': 'dziennikarka reporter reporterka',
    'Redaktor wydawniczy': 'redaktorka redakcja',
    'Korektor tekstu': 'korektorka korekta',
    'Przedstawiciel handlowy': 'handlowiec przedstawicielka sales',
    'Specjalista do spraw kluczowych klientów (key account manager)': 'kam key account opiekun klienta',
    'Sprzedawca': 'sprzedawczyni ekspedient ekspedientka sklep',
    'Kasjer handlowy': 'kasjerka kasa',
    'Agent ubezpieczeniowy': 'agentka ubezpieczenia',
    'Doradca finansowy': 'doradczyni finansowa',
    'Specjalista do spraw szkoleń': 'trener trenerka szkoleniowiec l&d',
    'Doradca zawodowy': 'doradczyni zawodowa',
    'Windykator': 'windykacja windykatorka',
    'Magazynier': 'magazynierka magazyn',
    'Kierowca samochodu dostawczego': 'kurier kierowca dostawy',
    'Organizator imprez rozrywkowych (organizator eventów)': 'event manager eventy',
    'Pośrednik w obrocie nieruchomościami': 'agent nieruchomości pośredniczka',
    'Lektor języka obcego': 'lektorka nauczyciel angielskiego korepetycje',
    'Dyrektor operacyjny': 'coo',
    'Spedytor': 'spedytorka spedycja',
    'Specjalista do spraw logistyki': 'logistyk logistyczka',
    'Montażysta obrazu': 'montażystka edytor wideo video editor',
    'Psycholog': 'psycholożka',
    'Pielęgniarka': 'pielęgniarz',
}
# Zawody pokazywane jako przykłady i podbijane w wyszukiwaniu (grupa docelowa projektu).
POPULAR = ['Pracownik centrum obsługi telefonicznej (pracownik call center)', 'Telemarketer', 'Autor tekstów i sloganów reklamowych (copywriter)',
           'Tłumacz', 'Projektant grafiki', 'Programista aplikacji', 'Księgowy', 'Specjalista do spraw kadr', 'Pracownik biurowy',
           'Specjalista do spraw marketingu i handlu', 'Agent ubezpieczeniowy', 'Sprzedawca', 'Asystent zarządu', 'Analityk baz danych (data scientist)']

def slugify(t):
    t = t.lower().replace('ł', 'l')
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    if len(t) > 70:
        t = t[:70].rsplit('-', 1)[0]
    return t

def clean_task(t):
    t = re.sub(r'\s+', ' ', str(t)).strip().rstrip('.;,').strip()
    return t[:1].upper() + t[1:]

df = pd.read_excel(SRC)
os.makedirs(os.path.join(OUT, 'z'), exist_ok=True)
names = set(df['Nazwa'].unique())
for n in list(SYN) + POPULAR:
    assert n in names, n

jobs, seen = [], set()
for kod, d in df.sort_values(['Kod', 'Task_Index']).groupby('Kod', sort=True):
    n = d['Nazwa'].iloc[0]
    slug = slugify(n)
    while slug in seen:
        slug += '-' + str(kod)[-2:]
    seen.add(slug)
    g = G[d['potential25'].iloc[0]]
    mean = round(float(d['mean6d_pl'].iloc[0]), 2)
    tasks = [[clean_task(t), round(float(s), 2)] for t, s in zip(d['task_full_text_PL'], d['score25'])]
    summary = re.sub(r'\s+', ' ', str(d['Synteza'].iloc[0])).strip()
    en = str(d['Occupation Title'].iloc[0])
    with open(os.path.join(OUT, 'z', f'{kod}.json'), 'w', encoding='utf-8') as f:
        json.dump({'k': str(kod), 'n': n, 'm': mean, 'g': g, 'o': summary, 't': tasks}, f, ensure_ascii=False, separators=(',', ':'))
    jobs.append([str(kod), n, mean, g, len(tasks), slug, SYN.get(n, ''), en, 1 if n in POPULAR else 0])

with open(os.path.join(OUT, 'zawody.json'), 'w', encoding='utf-8') as f:
    json.dump({'zrodlo': 'ILO Working Paper 140 (2025), indeks ILO–NASK dla KZiS; CC BY 4.0. Adaptacja: (nie)zastąpieni.',
               'pola': ['kod', 'nazwa', 'srednia', 'gradient', 'zadan', 'slug', 'synonimy', 'nazwa_en', 'popularny'],
               'zawody': jobs}, f, ensure_ascii=False, separators=(',', ':'))
print(len(jobs), 'zawodów,', sum(j[4] for j in jobs), 'zadań')
