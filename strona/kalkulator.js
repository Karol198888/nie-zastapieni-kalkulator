/* (nie)zastąpieni: kalkulator „Ile z Twojej pracy potrafi już zrobić AI?”
   Wspólny skrypt dla strony głównej (index.html#kalkulator) i podstrony kalkulator.html.
   Strona musi mieć elementy o id: quiz-open, teaser-note, quiz, quiz-step, quiz-bar, quiz-body, quiz-foot, quiz-close.

   Jak to działa:
   1. Zawód wybierasz z 2541 zawodów Klasyfikacji zawodów i specjalności (KZiS).
   2. Pokazujemy zadania właśnie tego zawodu (opis z KZiS), każde z oceną 0–1 z indeksu ILO–NASK.
   3. Wynik to średnia ocen Twoich zadań ważona czasem: zadanie zaznaczone liczy się jako 1, to, na które idzie najwięcej czasu, jako 3.

   Dane: /dane/zawody.json (lista zawodów) i /dane/z/KOD.json (zadania jednego zawodu); buduje je narzedzia/dane_zawodow.py.
   Źródło ocen: Gmyrek i in. 2025, ILO Working Paper 140, indeks ILO–NASK, CC BY 4.0 (adaptacja: wybór i skrócenie prezentacji).

   Adresy:
   - #start otwiera quiz od pierwszego pytania (np. nie-zastapieni.pl/kalkulator#start),
   - ?zawod=KOD otwiera quiz z wybranym zawodem i od razu pokazuje jego zadania (linki ze stron /zawody/). */
(function () {
  if (!document.getElementById('quiz-open')) return;

  var DATA = '/dane/';
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return n.toFixed(2).replace('.', ','); };
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* Style elementów, których nie ma w arkuszach stron (jedno źródło dla obu stron) */
  var css = document.createElement('style');
  css.textContent = [
    '.tasks-tools{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 16px}',
    '.tasks-src{font-size:13px;color:var(--sub)}',
    '.opt.task span{min-height:0;font-size:15.5px;line-height:1.4;padding:13px 16px}',
    '.q-loading{display:flex;align-items:center;gap:12px;color:var(--sub);font-size:15px}',
    '.q-loading::before{content:"";width:18px;height:18px;border-radius:50%;border:2px solid var(--line-strong);border-top-color:var(--accent);animation:qspin .8s linear infinite}',
    '@keyframes qspin{to{transform:rotate(360deg)}}',
    '.tgroup{display:flex;flex-direction:column;gap:8px}',
    '.tgroup + .tgroup{margin-top:18px}',
    '.tgroup-h{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600}',
    '.tgroup-h i{width:12px;height:12px;border-radius:3px;flex:0 0 12px}',
    '.trow{display:grid;grid-template-columns:minmax(0,1fr) 74px;gap:6px 14px;align-items:center;padding:11px 14px;border-radius:12px;background:var(--surface);border:1px solid var(--line);font-size:14.5px;line-height:1.4}',
    '.trow.lo{background:color-mix(in srgb,var(--good) 10%,var(--surface));border-color:transparent}',
    '.trow b{font-family:var(--mono);font-weight:600;font-size:14px;text-align:right;white-space:nowrap}',
    '.z1{font-weight:400;font-size:.82em;color:var(--sub)}',
    '.trow .tbar{grid-column:1 / -1;height:5px;border-radius:3px;background:var(--line);overflow:hidden}',
    '.trow .tbar i{display:block;height:100%}',
    '.trow .star{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:var(--panel);font-family:var(--mono);font-size:11px;color:var(--sub);white-space:nowrap}',
    '.cmp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:4px}',
    '.cmp div{padding:12px 14px;border-radius:12px;background:var(--bg)}',
    '.cmp b{display:block;font-family:var(--mono);font-size:24px;font-weight:600;letter-spacing:-.02em}',
    '.cmp span{font-size:13px;color:var(--sub);line-height:1.35;display:block}',
    '.rel{display:flex;flex-direction:column;gap:8px}',
    '.rel a{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 14px;border:1px solid var(--line-strong);border-radius:12px;background:var(--surface);color:var(--ink);text-decoration:none;font-size:15px;line-height:1.35}',
    '.rel a:hover{border-color:var(--ink)}',
    '.rel small{font-family:var(--mono);font-size:12px;color:var(--good);white-space:nowrap}',
    '.res-share{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:16px 18px;border-radius:14px;background:var(--panel)}',
    '.res-share .btn{min-height:40px}'
  ].join('');
  document.head.appendChild(css);

  var SRC = {
    ilo:       ['ILO i NASK, 2025', 'https://doi.org/10.54394/HETP0387'],
    stanford:  ['Stanford, sierpień 2026', 'https://digitaleconomy.stanford.edu/news/canariesaug26/'],
    anthropic: ['Anthropic, marzec 2026', 'https://www.anthropic.com/research/labor-market-impacts'],
    microsoft: ['Microsoft, lipiec 2025', 'https://arxiv.org/abs/2507.07935'],
    freelance: ['Hui i in., 2024', 'https://www.brookings.edu/articles/is-generative-ai-a-job-killer-evidence-from-the-freelance-market/'],
    qje:       ['Brynjolfsson i in., 2025', 'https://academic.oup.com/qje/article/140/2/889/7990658'],
    nask:      ['NASK/ILO, czerwiec 2025', 'https://nask.pl/media/2025/06/Dodatek_Generatywna-sztuczna-inteligencja.pdf'],
    kpmg:      ['KPMG, lipiec 2025', 'https://kpmg.com/pl/pl/wiedza/technologia/sztuczna-inteligencja-w-polsce.html'],
    eu_firmy:  ['Eurostat, firmy 2025', 'https://doi.org/10.2908/ISOC_EB_AI'],
    eu_osoby:  ['Eurostat, osoby 2025', 'https://doi.org/10.2908/ISOC_AI_IAIU']
  };
  function src(ids) {
    return ids.map(function (id) { return '<a class="src" href="' + SRC[id][1] + '" target="_blank" rel="noopener">' + SRC[id][0] + '</a>'; }).join(' · ');
  }

  /* Ogólna lista zadań: tylko gdy zawodu nie ma w klasyfikacji albo opis nie pasuje.
     Ocena 0–1 to przybliżenie na podstawie badań (tabela w „Jak to liczymy”), a nie ocena ILO konkretnego zawodu. */
  var GENERIC = [
    { id: 'klienci', l: 'Odpowiadam na powtarzalne pytania i zgłoszenia klientów', s: 0.65, why: 'Konsultanci obsługi klienta są w czołówce najbardziej narażonych zawodów w danych Anthropic.', src: ['anthropic', 'qje'] },
    { id: 'dane', l: 'Przepisuję, wprowadzam i porządkuję dane lub dokumenty', s: 0.65, why: 'Wprowadzanie danych ma 67% pokrycia zadań przez AI w danych Anthropic. W Polsce najbardziej narażeni są pracownicy biurowi.', src: ['anthropic', 'nask'] },
    { id: 'pisanie', l: 'Piszę teksty: maile, raporty, opisy, artykuły', s: 0.65, why: 'Pisanie to jedno z najczęstszych i najskuteczniejszych zastosowań AI. Na platformie freelance najmocniej ucierpiały usługi tekstowe.', src: ['microsoft', 'freelance'] },
    { id: 'info', l: 'Szukam i zbieram informacje, robię research', s: 0.65, why: 'Zbieranie informacji to najczęstszy cel rozmów z Copilotem i zadanie, z którym AI radzi sobie dobrze.', src: ['microsoft'] },
    { id: 'tlum', l: 'Tłumaczę teksty', s: 0.65, why: 'Tłumaczenie jest na pierwszym miejscu listy zawodów o najwyższej przydatności AI w badaniu Microsoftu.', src: ['microsoft'] },
    { id: 'kod', l: 'Programuję', s: 0.6, why: 'Programiści mają najwyższe pokrycie zadań przez AI (75%) w danych Anthropic.', src: ['anthropic'] },
    { id: 'analiza', l: 'Analizuję liczby, robię zestawienia i prognozy', s: 0.5, why: 'Z analizą danych AI radzi sobie słabiej niż z pisaniem, choć analitycy finansowi są wśród najbardziej narażonych zawodów.', src: ['microsoft', 'anthropic'] },
    { id: 'grafika', l: 'Projektuję grafiki i materiały wizualne', s: 0.45, why: 'Z projektowaniem wizualnym AI radzi sobie słabiej niż z tekstem. Generatory obrazów odbiły się jednak na zleceniach freelancerów.', src: ['microsoft', 'freelance'] },
    { id: 'ludzie', l: 'Rozmawiam z ludźmi w sprawach wymagających wyczucia: doradzam, uczę, negocjuję, opiekuję się, kieruję zespołem', s: 0.2, why: 'Kierowanie ludźmi i bezpośrednia praca z ludźmi należą do zadań najsłabiej obejmowanych przez AI.', src: ['microsoft'] },
    { id: 'fiz', l: 'Pracuję fizycznie, w terenie albo przy maszynach', s: 0.1, why: 'Praca fizyczna i obsługa maszyn są najsłabiej obejmowane przez AI. W USA 30% pracujących ma zerowe pokrycie zadań.', src: ['microsoft', 'anthropic'] }
  ];

  /* Obszary „krok obok” dla grup zawodów (4 pierwsze cyfry kodu; pomysły do sprawdzenia, nie recepty) */
  var IDEAS = {
    obsluga: ['opieka nad kluczowymi klientami (customer success)', 'trudne sprawy i reklamacje, w których trzeba podjąć decyzję', 'szkolenie nowych osób i kontrola jakości obsługi', 'nadzór nad chatbotem i poprawianie jego odpowiedzi'],
    biuro: ['koordynacja projektów i pracy biura', 'kadry i sprawy pracownicze', 'wdrażanie narzędzi i automatyzacji w firmie', 'dotacje, przetargi i formalności z terminami'],
    tekst: ['strategia treści i redakcja merytoryczna', 'scenariusze wideo i podcastów', 'komunikacja wewnętrzna i relacje z mediami'],
    tlum: ['tłumaczenia przysięgłe i specjalistyczne', 'weryfikacja i poprawianie tłumaczeń maszynowych', 'tłumaczenia ustne i towarzyszenie w rozmowach'],
    grafika: ['projektowanie doświadczeń i usług (UX)', 'kierownictwo artystyczne i spójność marki', 'druk, opakowania i projekty do wykonania w materiale'],
    it: ['architektura systemów i przegląd kodu', 'bezpieczeństwo IT', 'wdrożenia AI w firmach spoza IT', 'analiza potrzeb i rozwój produktu'],
    finanse: ['doradztwo dla małych firm i JDG', 'controlling i kontrola wewnętrzna', 'rozmowy z klientem przy trudnych decyzjach finansowych'],
    sprzedaz: ['sprzedaż oparta na relacjach (B2B)', 'wydarzenia i działania na żywo', 'budowanie społeczności wokół marki']
  };
  var GROUP = {
    obsluga: ['5244', '4222', '4225', '4226', '4221', '4227', '4223', '4224', '4211', '4214', '4213', '3322'],
    biuro: ['4132', '4131', '4419', '4110', '4415', '4120', '3343', '4411', '4322', '3341', '4414', '4312', '4313', '3331', '3339', '2421', '2423', '2424', '3342', '3344', '4323'],
    tekst: ['2641', '2642', '2432', '4413', '2656'],
    tlum: ['2643'],
    grafika: ['2166', '2513', '3514', '3431', '3432'],
    it: ['2514', '2521', '2522', '2519', '2512', '2523', '2511', '2529', '3512', '2356', '3511', '3513'],
    finanse: ['4311', '2413', '2412', '2411', '3313', '3311', '3312', '3314', '2120', '2631', '3321'],
    sprzedaz: ['2431', '2434', '2433', '3324', '5223', '5221', '5243', '5242', '1221', '5230']
  };
  function groupOf(kod) { var k4 = String(kod).slice(0, 4); for (var g in GROUP) { if (GROUP[g].indexOf(k4) > -1) return g; } return null; }

  /* Gradient zawodu w indeksie ILO–NASK: 4..1 albo 0 (minimalne) i -1 (brak) */
  var GLAB = { 4: 'wysokie', 3: 'znaczne', 2: 'umiarkowane', 1: 'niskie', 0: 'minimalne', '-1': 'brak narażenia' };
  /* Poziom Twoich zadań: te same progi średniej co w indeksie (0,4 / 0,5 / 0,6) */
  var LEVELS = ['niska', 'umiarkowana', 'znaczna', 'wysoka'];
  function levelOf(m) { return m < 0.4 ? 0 : m < 0.5 ? 1 : m < 0.6 ? 2 : 3; }
  /* Pasma zadań: od 0,5 AI może wykonać dużą część zadania; 0,25–0,49 częściowo; poniżej 0,25 słabo (pasma ILO) */
  function band(s) { return s >= 0.5 ? 'hi' : s >= 0.25 ? 'mid' : 'lo'; }

  /* ===== Dane zawodów ===== */
  var JOBS = null, BYCODE = {}, TD = {}, jobsWaiters = [];
  function norm(t) { return String(t).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function loadJobs(cb) {
    if (JOBS) { if (cb) cb(); return; }
    if (cb) jobsWaiters.push(cb);
    if (jobsWaiters.loading) return;
    jobsWaiters.loading = true;
    fetch(DATA + 'zawody.json').then(function (r) { return r.json(); }).then(function (d) {
      JOBS = d.zawody.map(function (r) {
        var j = { k: r[0], n: r[1], m: r[2], g: r[3], c: r[4], slug: r[5], syn: r[6], en: r[7], pop: r[8] };
        j.nn = norm(j.n);
        j.words = (j.nn + ' ' + norm(j.syn) + ' ' + norm(j.en)).split(/[^a-z0-9&]+/).filter(Boolean);
        j.nwords = j.nn.split(/[^a-z0-9&]+/).filter(Boolean);
        BYCODE[j.k] = j;
        return j;
      });
      var w = jobsWaiters.splice(0); w.forEach(function (f) { f(); });
    }).catch(function () {
      jobsWaiters.loading = false;
      var box = $('job-res'); if (box) box.innerHTML = '<p class="quiz-hint">Nie udało się wczytać listy zawodów. Sprawdź połączenie z internetem i spróbuj jeszcze raz.</p>';
    });
  }
  function loadTasks(kod) {
    if (TD[kod]) return Promise.resolve(TD[kod]);
    return fetch(DATA + 'z/' + kod + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) { TD[kod] = d; return d; });
  }

  /* Wyszukiwarka: każde słowo zapytania musi pasować do początku jakiegoś słowa w nazwie, synonimach albo nazwie angielskiej.
     Dla dłuższych słów wystarczy wspólny rdzeń, więc „księgowa” znajdzie „Księgowy”, a „programistka” „Programista”. */
  function tokMatch(tok, words, loose) {
    for (var i = 0; i < words.length; i++) {
      if (words[i].indexOf(tok) === 0) return 2;
      if (loose && tok.length >= 5 && words[i].indexOf(tok.slice(0, Math.max(4, tok.length - 3))) === 0) return 1;
    }
    return 0;
  }
  function searchJobs(q) {
    var nq = norm(q).trim();
    var toks = nq.split(/[^a-z0-9&]+/).filter(function (t) { return t.length > 1; });
    if (!toks.length || !JOBS) return [];
    var out = [];
    JOBS.forEach(function (j) {
      var sc = 0, inName = true;
      for (var i = 0; i < toks.length; i++) {
        var a = tokMatch(toks[i], j.nwords, false);
        if (!a) { inName = false; a = tokMatch(toks[i], j.words, true); }
        if (!a) return;
        sc += a;
      }
      if (j.nn === nq) sc += 100;
      else if (j.nn.indexOf(nq) === 0) sc += 40;
      if (inName) sc += 20;
      sc += j.pop * 12 - j.n.length * 0.05;
      out.push([sc, j]);
    });
    return out.sort(function (a, b) { return b[0] - a[0]; }).slice(0, 10).map(function (x) { return x[1]; });
  }
  function gTag(j) {
    return j.g > 0 ? 'narażenie ' + GLAB[j.g] : (j.g === 0 ? 'narażenie minimalne' : 'brak narażenia');
  }
  function jobOpt(j) {
    return '<button type="button" class="job-opt" data-code="' + j.k + '"><span>' + esc(j.n) + '</span><small class="lvl-' + j.g + '">' + gTag(j) + '</small></button>';
  }

  /* ===== Pytania ===== */
  function fresh() { return { zawod: '', ogolne: false, zadania: [], czas: [], forma: '', wiek: '', wiedza: '', ai: '' }; }
  var A = fresh();
  function taskList() {
    if (A.zawod && A.zawod !== 'none' && !A.ogolne && TD[A.zawod]) {
      return TD[A.zawod].t.map(function (t, i) { return { id: 't' + i, l: t[0], s: t[1] }; });
    }
    return GENERIC;
  }
  var STEPS = [
    { id: 'zawod', type: 'job', q: 'Czym zajmujesz się zawodowo?', hint: 'Wpisz swój zawód. Mamy 2541 zawodów z polskiej klasyfikacji, a do każdego listę zadań ocenionych przez Międzynarodową Organizację Pracy.' },
    { id: 'zadania', type: 'tasks', q: 'Które z tych zadań wykonujesz?' },
    { id: 'czas', type: 'multi', max: 3, q: 'Na co idzie najwięcej Twojego czasu?', hint: 'Wybierz od jednego do trzech zadań.',
      opts: function () { return taskList().filter(function (t) { return A.zadania.indexOf(t.id) > -1; }).map(function (t) { return [t.id, t.l]; }); },
      skip: function () { return A.zadania.length < 2; } },
    { id: 'forma', type: 'single', q: 'Na jakiej zasadzie pracujesz?',
      opts: function () { return [['etat', 'Na etacie'], ['zlec', 'Na umowie zleceniu lub o dzieło'], ['free', 'We własnej firmie albo dla wielu klientów']]; } },
    { id: 'wiek', type: 'single', q: 'Ile masz lat?',
      opts: function () { return [['a25', 'do 25'], ['a35', '26–35'], ['a45', '36–45'], ['a46', '46 i więcej']]; } },
    { id: 'wiedza', type: 'single', q: 'Gdyby nowa osoba miała przejąć Twoją pracę, czego by potrzebowała?',
      opts: function () { return [['instr', 'Dobrej instrukcji. Po kilku tygodniach dałaby radę.'], ['mies', 'Instrukcji i kilku miesięcy praktyki obok kogoś doświadczonego.'], ['lata', 'Lat doświadczenia, znajomości ludzi i nietypowych sytuacji.']]; } },
    { id: 'ai', type: 'single', q: 'Jak korzystasz z AI w pracy?', hint: 'Chodzi o narzędzia takie jak ChatGPT, Copilot, Gemini czy Claude.',
      opts: function () { return [['wcale', 'Wcale albo prawie wcale'], ['wsparcie', 'Pomaga mi, ale decyzje i efekt końcowy są moje'], ['calosc', 'Wykonuje za mnie całe zadania']]; } }
  ];

  var dlg = $('quiz'), body = $('quiz-body'), foot = $('quiz-foot');
  var cur = 0, done = false, lastPct = null, lastTxt = '', lastLevel = null, timer = null, lastShare = '';
  function visible() { return STEPS.filter(function (st) { return !(st.skip && st.skip()); }); }
  function canGo(st) {
    if (st.type === 'multi' || st.type === 'tasks') return A[st.id].length > 0;
    if (st.type === 'single') return !!A[st.id];
    if (st.type === 'job') return !!A.zawod;
    return true;
  }
  function setNext() {
    var b = $('q-next'); if (!b) return;
    b.disabled = !canGo(visible()[cur]);
  }

  function showStep() {
    var vs = visible(), st = vs[cur], last = cur === vs.length - 1;
    $('quiz-step').textContent = 'Pytanie ' + (cur + 1) + ' z ' + vs.length;
    $('quiz-bar').style.width = (cur / vs.length * 100) + '%';

    var h = '<h3 class="quiz-q" id="quiz-q" tabindex="-1">' + st.q + '</h3>';
    if (st.type === 'tasks') {
      var job = BYCODE[A.zawod];
      var own = job && !A.ogolne && TD[A.zawod];
      h += '<p class="quiz-hint">' + (own
        ? 'To zadania zawodu <strong>' + esc(job.n) + '</strong> z oficjalnej klasyfikacji zawodów, dlatego brzmią urzędowo. Zaznacz te, które naprawdę wykonujesz.'
        : 'Zaznacz wszystko, co robisz w pracy regularnie.') + '</p>';
      h += '<div class="tasks-tools"><button type="button" class="link-btn" id="t-all">Zaznacz wszystkie</button>' +
        (own ? '<button type="button" class="link-btn" id="t-generic">Żadne nie pasuje? Wybierz z ogólnej listy</button>'
             : (job ? '<button type="button" class="link-btn" id="t-own">Wróć do zadań zawodu ' + esc(job.n) + '</button>' : '')) + '</div>';
    } else if (st.hint) {
      h += '<p class="quiz-hint">' + st.hint + '</p>';
    }
    if (st.type === 'job') {
      h += '<div class="job-pick" id="job-pick"></div>';
    } else if (st.type !== 'job') {
      var multi = st.type !== 'single';
      var opts = st.type === 'tasks' ? taskList().map(function (t) { return [t.id, t.l]; }) : st.opts();
      h += '<div class="opts" role="' + (multi ? 'group' : 'radiogroup') + '" aria-labelledby="quiz-q">' + opts.map(function (o) {
        var on = multi ? A[st.id].indexOf(o[0]) > -1 : A[st.id] === o[0];
        return '<label class="opt' + (multi ? ' cb' : '') + (st.type === 'tasks' || st.id === 'czas' ? ' task' : '') + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="q-' + st.id + '" value="' + o[0] + '"' + (on ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
      }).join('') + '</div>';
      if (st.type === 'tasks' && own) h += '<p class="tasks-src">Opisy zadań: Klasyfikacja zawodów i specjalności (MRPiPS). Oceny pokażemy w wyniku.</p>';
    }
    body.innerHTML = h;
    body.scrollTop = 0;

    var nextLabel = last ? 'Pokaż wynik' : 'Dalej';
    foot.innerHTML = '<button type="button" class="btn btn-ghost" id="q-back"' + (cur === 0 ? ' style="visibility:hidden"' : '') + '>← Wstecz</button>' +
      '<button type="button" class="btn" id="q-next"' + (canGo(st) ? '' : ' disabled') + '>' + nextLabel + ' <span class="arrow" aria-hidden="true">→</span></button>';

    if (st.type === 'job') {
      renderJobPick();
    } else {
      var inputs = body.querySelectorAll('.opts input');
      function limit() { if (st.max) inputs.forEach(function (x) { x.disabled = !x.checked && A[st.id].length >= st.max; }); }
      inputs.forEach(function (inp) {
        inp.addEventListener('change', function () {
          if (st.type === 'single') {
            A[st.id] = inp.value; setNext();
            clearTimeout(timer); timer = setTimeout(next, 260);
          } else {
            A[st.id] = Array.prototype.map.call(body.querySelectorAll('.opts input:checked'), function (x) { return x.value; });
            limit(); setNext();
            $('quiz-step').textContent = 'Pytanie ' + (cur + 1) + ' z ' + visible().length;
          }
        });
      });
      limit();
      if ($('t-all')) $('t-all').addEventListener('click', function () {
        var all = A.zadania.length === inputs.length;
        inputs.forEach(function (x) { x.checked = !all; });
        A.zadania = all ? [] : Array.prototype.map.call(inputs, function (x) { return x.value; });
        $('t-all').textContent = all ? 'Zaznacz wszystkie' : 'Odznacz wszystkie';
        setNext();
      });
      if ($('t-all') && A.zadania.length && A.zadania.length === inputs.length) $('t-all').textContent = 'Odznacz wszystkie';
      if ($('t-generic')) $('t-generic').addEventListener('click', function () { A.ogolne = true; A.zadania = []; A.czas = []; showStep(); });
      if ($('t-own')) $('t-own').addEventListener('click', function () { A.ogolne = false; A.zadania = []; A.czas = []; showStep(); });
    }
    $('q-back').addEventListener('click', back);
    $('q-next').addEventListener('click', next);
    $('quiz-q').focus({ preventScroll: true });
  }

  var SUGGEST_CODES = ['422201', '524404', '243102', '264304', '216604', '251401', '331301', '242307', '411003', '243106', '332101', '522301'];
  function renderJobPick(q) {
    var box = $('job-pick'); if (!box) return;
    setNext();
    if (A.zawod) {
      var j = BYCODE[A.zawod];
      box.innerHTML = '<div class="job-chosen"><div><span class="res-label">Twój zawód</span><strong>' + (j ? esc(j.n) : 'Zawód spoza listy') + '</strong>' +
        (j ? '<small class="lvl-' + j.g + '">' + gTag(j) + ' w indeksie ILO–NASK · ' + j.c + ' zadań</small>' : '<small>pokażemy ogólną listę zadań</small>') +
        '</div><button type="button" class="btn btn-ghost" id="job-change">Zmień</button></div>';
      $('job-change').addEventListener('click', function () { A.zawod = ''; A.zadania = []; A.czas = []; A.ogolne = false; renderJobPick(''); var i = $('job-q'); if (i) i.focus(); });
      return;
    }
    box.innerHTML = '<label class="sr-only" for="job-q">Twój zawód</label><input type="search" id="job-q" placeholder="Wpisz, np. księgowa, telemarketer, grafik" autocomplete="off" value="' + esc(q || '') + '">' +
      '<div class="job-res" id="job-res" aria-live="polite"></div>' +
      '<button type="button" class="link-btn" id="job-none">Mojego zawodu nie ma na liście</button>';
    var inp = $('job-q'), res = $('job-res');
    function draw() {
      if (!JOBS) { res.innerHTML = '<p class="q-loading">Wczytuję listę zawodów…</p>'; loadJobs(draw); return; }
      var v = inp.value.trim();
      if (!v) {
        res.innerHTML = '<p class="res-label">Na przykład:</p>' + SUGGEST_CODES.map(function (c) { return BYCODE[c] ? jobOpt(BYCODE[c]) : ''; }).join('');
        return;
      }
      var r = searchJobs(v);
      res.innerHTML = r.length ? r.map(jobOpt).join('') : '<p class="quiz-hint">Nic nie znaleźliśmy. Spróbuj innego słowa, np. nazwy stanowiska z umowy, albo wybierz „Mojego zawodu nie ma na liście”.</p>';
    }
    inp.addEventListener('input', draw);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var f = res.querySelector('.job-opt'); if (f) f.click(); } });
    res.addEventListener('click', function (e) {
      var b = e.target.closest('.job-opt'); if (!b) return;
      A.zawod = b.getAttribute('data-code'); A.zadania = []; A.czas = []; A.ogolne = false;
      loadTasks(A.zawod).catch(function () {});
      renderJobPick();
    });
    $('job-none').addEventListener('click', function () { A.zawod = 'none'; A.zadania = []; A.czas = []; renderJobPick(); });
    draw();
  }

  function next() {
    clearTimeout(timer);
    var vs = visible(), st = vs[cur];
    if (!canGo(st)) return;
    if (st.id === 'zawod' && A.zawod !== 'none' && !TD[A.zawod]) {
      var nb = $('q-next'); nb.disabled = true; nb.firstChild.textContent = 'Wczytuję zadania… ';
      loadTasks(A.zawod).then(function () { next(); }).catch(function () { A.ogolne = true; next(); });
      return;
    }
    if (st.id === 'zadania') A.czas = A.czas.filter(function (id) { return A.zadania.indexOf(id) > -1; });
    vs = visible();
    if (cur < vs.length - 1) { cur++; showStep(); } else {
      finish();
      if (window.nzTrack) nzTrack('kalkulator-wynik', { zawod: BYCODE[A.zawod] ? BYCODE[A.zawod].n : 'bez zawodu', wynik: lastPct });
    }
  }
  function back() { clearTimeout(timer); if (done) { done = false; cur = visible().length - 1; showStep(); return; } if (cur > 0) { cur--; showStep(); } }

  /* ===== Wynik ===== */
  function compute() {
    var list = taskList(), mine = [], tot = 0, w = 0, sp = { hi: 0, mid: 0, lo: 0 };
    list.forEach(function (t) {
      if (A.zadania.indexOf(t.id) < 0) return;
      var wt = (A.zadania.length === 1 || A.czas.indexOf(t.id) > -1) ? 3 : 1;
      mine.push({ id: t.id, l: t.l, s: t.s, w: wt });
      tot += wt; w += wt * t.s; sp[band(t.s)] += wt;
    });
    var m = w / tot;
    return { mine: mine, tot: tot, sp: sp, m: m, level: levelOf(m), own: list !== GENERIC };
  }

  function factors(r) {
    var f = [];
    if (A.forma === 'free' || A.forma === 'zlec') f.push(['up', 'Pracujesz na zlecenia', 'Na międzynarodowej platformie freelance po premierze ChatGPT osoby w zawodach mocniej narażonych dostawały ok. 2% mniej zleceń i zarabiały ok. 5% mniej. Zleceniodawca może zmienić wykonawcę szybciej niż pracodawca etat.', ['freelance']]);
    if (A.wiek === 'a25' && r.level >= 2) f.push(['up', 'Jesteś na początku drogi zawodowej', 'W USA zatrudnienie osób w wieku 22–25 lat w zawodach mocno narażonych na AI jest o ok. 19% niższe, niż gdyby rosło jak u rówieśników w mniej narażonych zawodach. Dzieje się to głównie przez mniej rekrutacji, nie przez zwolnienia.', ['stanford']]);
    if (A.wiedza === 'instr') f.push(['up', 'Twoją pracę da się opisać instrukcją', 'Spadki zatrudnienia dotyczą głównie zawodów opartych na wiedzy formalnej, którą można spisać w procedurach. Taką wiedzę AI odtwarza najłatwiej.', ['stanford']]);
    if (A.wiedza === 'lata') f.push(['down', 'Twoja wiedza pochodzi z praktyki', 'W zawodach opartych na wiedzy zdobywanej latami zatrudnienie doświadczonych osób w USA rosło. Tej wiedzy nie ma w tekstach, na których uczy się AI.', ['stanford']]);
    if ((A.wiek === 'a45' || A.wiek === 'a46') && r.level >= 2 && A.wiedza !== 'instr') f.push(['down', 'Masz doświadczenie', 'U doświadczonych pracowników badacze nie widzą luki w zatrudnieniu podobnej do tej u najmłodszych.', ['stanford']]);
    if (A.ai === 'wcale') f.push(['info', 'Nie korzystasz jeszcze z AI', '54% pracujących w Polsce deklaruje, że używa AI w pracy. Na start wystarczy jedno zadanie w tygodniu, przy którym AI Ci pomoże.', ['kpmg']]);
    if (A.ai === 'wsparcie') f.push(['down', 'AI Cię wspiera, a nie zastępuje', 'Tam, gdzie AI pomaga ludziom, zatrudnienie jest stabilne albo rośnie. W badaniu w obsłudze klienta asystent AI zwiększył liczbę rozwiązanych zgłoszeń średnio o 15%.', ['stanford', 'qje']]);
    if (A.ai === 'calosc') f.push(['up', 'AI robi za Ciebie całe zadania', 'Spadki zatrudnienia koncentrują się tam, gdzie AI zastępuje zadania, a nie tam, gdzie pomaga. Warto przesunąć swoją rolę w stronę sprawdzania i decydowania.', ['stanford', 'anthropic']]);
    return f;
  }

  /* Pokrewne zawody z niższą średnią: najpierw ta sama grupa (4 cyfry kodu), potem szersza (3 cyfry) */
  function related(job) {
    if (!JOBS) return [];
    var out = [];
    [4, 3].forEach(function (len) {
      var p = job.k.slice(0, len);
      JOBS.filter(function (j) { return j.k !== job.k && j.k.slice(0, len) === p && j.m <= job.m - 0.05 && out.indexOf(j) < 0; })
        .sort(function (a, b) { return a.m - b.m; })
        .forEach(function (j) { if (out.length < 4) out.push(j); });
    });
    return out;
  }

  function taskRows(items, cls) {
    return items.map(function (t) {
      var col = cls === 'hi' ? 'var(--accent)' : cls === 'mid' ? 'var(--gold)' : 'var(--good)';
      return '<div class="trow ' + cls + '"><span>' + esc(t.l) + (t.w === 3 && A.zadania.length > 1 ? '<span class="star">najwięcej czasu</span>' : '') + '</span><b>' + fmt(t.s) + '<span class="z1"> z 1</span></b>' +
        '<span class="tbar" aria-hidden="true"><i style="width:' + Math.round(t.s * 100) + '%;background:' + col + '"></i></span></div>';
    }).join('');
  }

  /* Barometr zawodów: prognoza powiatowych urzędów pracy (dane/barometr.json, narzedzia/barometr_dane.py) */
  var BARO = null, baroWait = [];
  function loadBaro(cb) {
    if (BARO) { cb(); return; }
    baroWait.push(cb);
    if (baroWait.loading) return;
    baroWait.loading = true;
    fetch(DATA + 'barometr.json').then(function (r) { return r.json(); }).then(function (d) {
      BARO = d; baroWait.splice(0).forEach(function (f) { f(); });
    }).catch(function () { var el = $('baro'); if (el) el.parentNode.removeChild(el); });
  }
  function baroCss() {
    if ($('baro-css')) return;
    var st = document.createElement('style'); st.id = 'baro-css';
    st.textContent = '.baro{display:flex;flex-direction:column;gap:10px;padding:18px;border-radius:14px;border:1px solid var(--line-strong)}' +
      '.baro q{display:block;quotes:none;margin:0;padding:10px 12px;border-left:3px solid var(--accent);background:var(--bg);border-radius:0 10px 10px 0;font-size:15px;line-height:1.45}' +
      '.baro q small{display:block;margin-top:6px;font-family:var(--mono);font-size:12px;color:var(--sub)}' +
      '.baro-bar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--line)}.baro-bar i{display:block;height:100%}' +
      '.baro-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--sub)}.baro-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}' +
      '.baro select{font:inherit;font-size:14px;padding:6px 10px;border-radius:10px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);max-width:100%}' +
      '.ank{display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:14px;background:var(--bg)}' +
      '.ank-t{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:1px solid var(--line)}.ank-t>span{font-size:15px;line-height:1.4}' +
      '.ank-o{display:flex;flex-wrap:wrap;gap:6px}.ank-o label{position:relative}.ank-o input{position:absolute;opacity:0;pointer-events:none}' +
      '.ank-o label span{display:inline-block;padding:6px 11px;border-radius:999px;border:1px solid var(--line-strong);background:var(--surface);font-size:13px;cursor:pointer}' +
      '.ank-o input:checked+span{background:var(--ink);color:var(--surface);border-color:var(--ink)}.ank-o input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}' +
      '.ank-w{font-family:var(--mono);font-size:12px;color:var(--sub)}';
    document.head.appendChild(st);
  }
  var REL_W = ['', 'duża nadwyżka chętnych', 'nadwyżka chętnych', 'równowaga', 'deficyt pracowników', 'duży deficyt pracowników', 'brak oceny'];
  function plural(n, a, b, c) { var d = n % 10, e = n % 100; return n === 1 ? a : (d >= 2 && d <= 4 && (e < 12 || e > 14)) ? b : c; }
  function baroFill(kod) {
    var el = $('baro'); if (!el) return;
    var gid = BARO.z[kod], g = gid ? BARO.g[gid] : null;
    if (!g) { el.parentNode.removeChild(el); return; }
    var r = g.r, s = g.s, def = r[3] + r[4], row = r[2], nad = r[0] + r[1], tot = def + row + nad;
    var spad = s[0] + s[1], wzr = s[3] + s[4];
    var h = '<p class="res-label">Co widzą urzędy pracy · Barometr zawodów ' + BARO.rok + '</p>' +
      '<strong>' + cap(esc(g.n)) + '</strong>' +
      '<p class="small" style="margin:0">Grupa zawodów z Barometru, do której należy Twój zawód. Prognoza na ' + BARO.rok + ' rok od ekspertów z ' + tot + ' ' + plural(tot, 'powiatu', 'powiatów', 'powiatów') + '.</p>' +
      '<div class="baro-bar" role="img" aria-label="Prognoza w powiatach: deficyt pracowników ' + def + ', równowaga ' + row + ', nadwyżka chętnych ' + nad + '">' +
      '<i style="width:' + (def / tot * 100) + '%;background:var(--gold)"></i><i style="width:' + (row / tot * 100) + '%;background:var(--line-strong)"></i><i style="width:' + (nad / tot * 100) + '%;background:var(--accent)"></i></div>' +
      '<div class="baro-leg"><span><i style="background:var(--gold)"></i>brakuje pracowników: ' + def + '</span><span><i style="background:var(--line-strong)"></i>równowaga: ' + row + '</span><span><i style="background:var(--accent)"></i>więcej chętnych niż ofert: ' + nad + '</span></div>' +
      '<p class="small" style="margin:0">' + (spad || wzr ? (spad ? 'Spadek zapotrzebowania na pracowników przewidują eksperci w ' + spad + ' ' + plural(spad, 'powiecie', 'powiatach', 'powiatach') + (wzr ? ', wzrost w ' + wzr + '.' : ', wzrostu nikt.') : 'Wzrost zapotrzebowania na pracowników przewidują eksperci w ' + wzr + ' ' + plural(wzr, 'powiecie', 'powiatach', 'powiatach') + ', spadku nikt.') : 'Zapotrzebowanie na pracowników ma być stabilne w niemal wszystkich powiatach.') + '</p>';
    var ai = g.ai.slice().sort(function (a, b) { return b.t.length - a.t.length; });
    if (ai.length) {
      var np = {}; ai.forEach(function (a) { np[a.w + '|' + a.p] = 1; }); np = Object.keys(np).length;
      var ws = {}; ai.forEach(function (a) { ws[a.w] = (ws[a.w] || 0) + 1; });
      h += '<p class="res-h" style="margin-top:6px">W ' + np + ' ' + plural(np, 'powiecie', 'powiatach', 'powiatach') + ' eksperci wprost piszą o sztucznej inteligencji</p>' +
        '<label class="small">Województwo: <select id="baro-woj"><option value="">wszystkie</option>' +
        Object.keys(ws).sort(function (a, b) { return BARO.woj[a].localeCompare(BARO.woj[b], 'pl'); }).map(function (w) { return '<option value="' + w + '">' + BARO.woj[w] + ' (' + ws[w] + ')</option>'; }).join('') +
        '</select></label><div id="baro-q"></div><button type="button" class="btn btn-ghost" id="baro-more" style="align-self:flex-start">Pokaż wszystkie</button>';
    } else {
      h += '<p class="small" style="margin:0">W komentarzach ekspertów do tej grupy nie pada słowo o AI. To swobodne uwagi, więc brak wzmianki nie przesądza, że AI nie ma tu wpływu.</p>';
    }
    h += '<p class="small" style="margin:0">Barometr to coroczna prognoza powiatowych urzędów pracy na zlecenie Ministerstwa Rodziny, Pracy i Polityki Społecznej. Komentarze przytaczamy bez zmian. <a class="src" href="' + BARO.zrodlo + '" target="_blank" rel="noopener">Barometr zawodów ' + BARO.rok + '</a></p>';
    el.innerHTML = h;
    if (!ai.length) return;
    var all = false;
    function draw() {
      var w = $('baro-woj').value, list = ai.filter(function (a) { return w === '' || String(a.w) === w; });
      var show = all ? list : list.slice(0, 3);
      $('baro-q').innerHTML = show.map(function (a) {
        return '<q>„' + esc(a.t) + '”<small>' + (/^[a-ząćęłńóśźż]/.test(a.p) ? 'powiat ' : '') + esc(a.p) + ', ' + BARO.woj[a.w] + (a.n === 2 || a.n === 1 ? ' · prognoza: spadek zapotrzebowania' : '') + '</small></q>';
      }).join('');
      var more = $('baro-more');
      more.style.display = list.length > 3 && !all ? '' : 'none';
      more.textContent = 'Pokaż wszystkie (' + list.length + ')';
    }
    $('baro-woj').addEventListener('change', function () { all = false; draw(); });
    $('baro-more').addEventListener('click', function () { all = true; draw(); });
    draw();
  }

  /* Ankieta „Jak jest u Ciebie?”: dobrowolna, anonimowa, zapis przez /api/ankieta do Airtable */
  var ANK = [['za', 'AI robi to za mnie'], ['pom', 'AI mi pomaga'], ['nie', 'AI nie daje rady'], ['nu', 'Nie używam do tego AI']];
  function ankSent(kod) { try { return localStorage.getItem('ank-' + kod) === '1'; } catch (e) { return false; } }
  function ankBlock(r, job) {
    var sent = ankSent(job.k);
    var h = '<div class="ank" id="ank"><p class="res-h">Jak jest naprawdę u Ciebie?</p>' +
      '<p class="small" style="margin:0">Oceny wyżej to przewidywania. Zaznacz, jak AI radzi sobie z Twoimi zadaniami w praktyce. Zbieramy głos ludzi z zawodów, żeby pokazać go obok ocen ILO. ' +
      'Anonimowo: wysyłasz tylko kod zawodu, numery zadań i odpowiedzi, bez maila i bez danych osobowych.</p><p class="small" id="ank-n" style="margin:0"></p>';
    if (sent) return h + '<p class="small" style="margin:0"><strong>Twoje odpowiedzi już mamy. Dziękujemy!</strong></p><div id="ank-list"></div></div>';
    h += '<div id="ank-list">' + r.mine.map(function (t) {
      var nr = t.id.slice(1);
      return '<div class="ank-t" data-nr="' + nr + '"><span>' + esc(t.l) + '</span><div class="ank-o" role="radiogroup" aria-label="AI w tym zadaniu">' +
        ANK.map(function (o) { return '<label><input type="radio" name="ank' + nr + '" value="' + o[0] + '"><span>' + o[1] + '</span></label>'; }).join('') +
        '</div><p class="ank-w" data-w="' + nr + '"></p></div>';
    }).join('') + '</div>' +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="button" class="btn" id="ank-send" disabled>Wyślij anonimowo</button><span class="small" id="ank-msg" role="status"></span></div></div>';
    return h;
  }
  function ankInit(r, job) {
    var box = $('ank'), ankN = 0; if (!box) return;
    fetch('/api/ankieta?kod=' + job.k).then(function (x) { return x.ok ? x.json() : null; }).then(function (d) {
      if (!d || !$('ank')) return;
      var el = $('ank-n');
      ankN = d.n;
      if (d.n) el.textContent = 'Z zawodu ' + job.n + ' ' + (d.n === 1 ? 'odpowiedziała już 1 osoba' : plural(d.n, '', 'odpowiedziały już ', 'odpowiedziało już ') + d.n + ' ' + plural(d.n, 'osoba', 'osoby', 'osób')) + (d.n < d.min ? '. Wyniki pokażemy od ' + d.min + ' osób.' : '.');
      Object.keys(d.t || {}).forEach(function (nr) {
        var w = box.querySelector('[data-w="' + nr + '"]'), c = d.t[nr], s = c.za + c.pom + c.nie + c.nu;
        if (!w || !s) return;
        w.textContent = 'Według ' + s + ' ' + plural(s, 'osoby', 'osób', 'osób') + ': AI robi to za nich ' + Math.round(c.za / s * 100) + '%, pomaga ' + Math.round(c.pom / s * 100) + '%, nie daje rady ' + Math.round(c.nie / s * 100) + '%, nie używa ' + Math.round(c.nu / s * 100) + '%';
      });
    }).catch(function () {});
    var btn = $('ank-send'); if (!btn) return;
    box.addEventListener('change', function () { btn.disabled = !box.querySelector('input:checked'); });
    btn.addEventListener('click', function () {
      var odp = [];
      r.mine.forEach(function (t) {
        var nr = t.id.slice(1), c = box.querySelector('input[name="ank' + nr + '"]:checked');
        if (c) odp.push({ nr: +nr, v: c.value, l: t.l, s: t.s });
      });
      if (!odp.length) return;
      var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      btn.disabled = true; $('ank-msg').textContent = 'Wysyłam…';
      fetch('/api/ankieta', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: id, kod: job.k, zawod: job.n, forma: A.forma, odp: odp }) })
        .then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
        .then(function () {
          try { localStorage.setItem('ank-' + job.k, '1'); } catch (e) {}
          if (window.nzTrack) nzTrack('ankieta', { zawod: job.n });
          $('ank-list').innerHTML = '';
          btn.parentNode.innerHTML = '<p class="small" style="margin:0"><strong>Dziękujemy!</strong> ' + (ankN + 1 >= 20 ? 'Twoje odpowiedzi dołączą do zestawienia przy najbliższym odświeżeniu, zwykle w ciągu godziny.' : 'Gdy z Twojego zawodu odpowie co najmniej 20 osób, pokażemy tu, jak jest naprawdę.') + '</p>';
        })
        .catch(function () { btn.disabled = false; $('ank-msg').textContent = 'Nie udało się wysłać. Spróbuj za chwilę.'; });
    });
  }


  /* Polska a UE: Eurostat, badanie 2025 (isoc_eb_ai, isoc_ai_iaiu; dane pobrane 23.11.2026, aktualizacja Eurostatu z czerwca 2026) */
  var EU = [
    ['Firmy (10+ osób) używające AI', '8,4%', '20,0%'],
    ['w tym duże firmy (250+ osób)', '45,8%', '55,0%'],
    ['w tym małe firmy (10–49 osób)', '5,8%', '17,0%'],
    ['Pracujący, którzy używają generatywnej AI w pracy', '13,3%', '21,8%'],
    ['w tym w pracy umysłowej', '19,8%', '27,6%']
  ];
  function euBlock() {
    return '<div class="eu"><p class="res-h">Polska na tle UE</p><p class="small" style="margin:4px 0 10px">Ile firm i ludzi faktycznie używa AI. Ocena Twoich zadań mówi, co AI potrafi; te liczby mówią, jak szybko to wchodzi do pracy.</p>' +
      '<table class="eu-t"><thead><tr><th></th><th>Polska</th><th>UE</th></tr></thead><tbody>' +
      EU.map(function (r) { return '<tr' + (r[0].indexOf('w tym') === 0 ? ' class="sub"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') +
      '</tbody></table><p class="small" style="margin-top:10px">W Polsce AI wchodzi do firm wolniej niż w UE, zwłaszcza do małych. W dużych firmach różnica jest mniejsza. Ten czas warto wykorzystać na naukę pracy z AI, zanim stanie się standardem także u nas. ' + src(['eu_firmy', 'eu_osoby']) + '</p></div>';
  }

  /* Co dalej: szkolenia z Bazy Usług Rozwojowych PARP (wyszukiwarka z hasłem), doradca w urzędzie pracy */
  var BUR = 'https://uslugirozwojowe.parp.gov.pl/wyszukiwarka/uslugi/szukaj?nazwaUslugi=';
  var BUR_HASLO = { obsluga: 'obsługa klienta', biuro: 'administracja biurowa', tekst: 'copywriting', tlum: 'tłumaczenia', grafika: 'grafika', it: 'programowanie', finanse: 'księgowość', sprzedaz: 'sprzedaż' };
  function nextBlock(job) {
    var grp = job ? groupOf(job.k) : null;
    var haslo = grp ? BUR_HASLO[grp] : (job ? job.n.split(/[\s(,–-]/)[0].toLowerCase() : '');
    var links = '<a class="btn btn-ghost" href="' + BUR + encodeURIComponent('sztuczna inteligencja') + '" target="_blank" rel="noopener">Szkolenia z AI w BUR</a>';
    if (haslo) links += '<a class="btn btn-ghost" href="' + BUR + encodeURIComponent(haslo) + '" target="_blank" rel="noopener">Szkolenia: ' + esc(haslo) + '</a>';
    return '<div class="next"><p class="res-h">Co dalej</p><p class="small" style="margin:4px 0 12px">Baza Usług Rozwojowych (PARP) to publiczna wyszukiwarka szkoleń i kursów, także z dofinansowaniem. Za darmo pomoże Ci też doradca zawodowy w powiatowym urzędzie pracy, również wtedy, gdy pracujesz. Tam zapytasz też o Krajowy Fundusz Szkoleniowy.</p>' +
      '<div class="next-links">' + links + '</div></div>';
  }

  /* Podział na 10 części metodą największych reszt, żeby zawsze sumował się do 10 */
  function tens(sp, tot) {
    var k = ['hi', 'mid', 'lo'], out = {}, rest = 10;
    var raw = k.map(function (x) { return sp[x] / tot * 10; });
    k.forEach(function (x, i) { out[x] = Math.floor(raw[i]); rest -= out[x]; });
    k.map(function (x, i) { return [x, raw[i] - out[x]]; }).sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, rest).forEach(function (p) { out[p[0]]++; });
    return out;
  }
  function tile(cls, n) { var t = ''; for (var i = 0; i < n; i++) t += '<i class="' + cls + '"></i>'; return t; }

  function finish() {
    done = true;
    var r = compute(), job = BYCODE[A.zawod], name = job ? job.n : '';
    var pct = Math.round(r.sp.hi / r.tot * 20) * 5, d = tens(r.sp, r.tot);
    var hiTxt = d.hi > 0 ? d.hi + ' z 10' : (r.sp.hi > 0 ? 'mniej niż 1 z 10' : '0 z 10');
    var h = '';

    /* „X z 10”: stały mianownik czytelniejszy niż procenty; kafelki pokazują od razu wszystkie trzy koszyki */
    h += '<div><p class="res-label">' + (name ? esc(name) : 'Twoja praca') + '</p><h3 class="quiz-q" id="quiz-q" tabindex="-1" style="margin-top:6px">Twój wynik</h3>' +
      '<div class="res-big"><b>' + hiTxt + '</b><span>części Twojego czasu w pracy to zadania, które AI może w dużej części wykonać.</span></div>' +
      '<div class="tiles" role="img" aria-label="Na 10 części Twojego czasu: ' + d.hi + ' to zadania, które AI może w dużej części wykonać, ' + d.mid + ' to zadania, przy których AI może pomóc, ' + d.lo + ' to zadania, z którymi AI radzi sobie słabo">' +
      tile('c-hi', d.hi) + tile('c-mid', d.mid) + tile('c-lo', d.lo) + '</div>' +
      '<div class="legend"><span><i class="c-hi"></i><b>' + d.hi + '</b> AI może wykonać dużą część</span><span><i class="c-mid"></i><b>' + d.mid + '</b> AI może pomóc częściowo</span><span><i class="c-lo"></i><b>' + d.lo + '</b> zostaje głównie po Twojej stronie</span></div>' +
      '<p class="small" style="margin-top:10px">To mapa Twoich zadań, nie wyrok. Części liczymy z zaznaczonych przez Ciebie zadań. Te, na które idzie najwięcej czasu, ważą trzy razy więcej.</p></div>';

    h += '<div class="res-level"><div class="row"><span class="res-h">Ekspozycja Twoich zadań: ' + LEVELS[r.level] + '</span><span class="res-label">' + (r.level + 1) + ' z 4</span></div>' +
      '<div class="meter" aria-hidden="true">' + [0, 1, 2, 3].map(function (i) { return '<span class="' + (i <= r.level ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
      (r.own && job ? '<div class="cmp"><div><b>' + fmt(r.m) + '</b><span>średnia ocena Twoich zadań (skala 0–1)</span></div><div><b>' + fmt(job.m) + '</b><span>przeciętnie w zawodzie ' + esc(job.n) + '</span></div></div>' : '') +
      '<p class="small">To nie jest ryzyko zwolnienia. Pokazuje, ile z tego, co robisz, AI potrafi wykonać albo przyspieszyć.</p></div>';

    /* Zadania w trzech grupach */
    var g = { hi: [], mid: [], lo: [] };
    r.mine.slice().sort(function (a, b) { return b.s - a.s; }).forEach(function (t) { g[band(t.s)].push(t); });
    h += '<div><p class="res-h">Twoje zadania</p><p class="small" style="margin:4px 0 14px">' +
      'Ocena od 0 do 1: przy 1 AI mogłoby wykonać całe zadanie, przy 0 nic z niego. Dotyczy samego zadania, nie Twojej pracy. ' +
      (r.own ? 'Oceny pochodzą z indeksu Międzynarodowej Organizacji Pracy i NASK. ' : 'To ogólna lista, więc oceny są przybliżone. ') + (r.own ? 'Oceny opisują możliwości AI z przełomu 2024 i 2025 roku. ' : '') + (r.own ? src(['ilo']) : '') + '</p>';
    if (g.hi.length) h += '<div class="tgroup"><p class="tgroup-h"><i style="background:var(--accent)"></i>Tu AI może Cię najbardziej wyręczyć</p>' + taskRows(g.hi, 'hi') + '</div>';
    if (g.mid.length) h += '<div class="tgroup"><p class="tgroup-h"><i style="background:var(--gold)"></i>Tu AI może pomóc</p>' + taskRows(g.mid, 'mid') + '</div>';
    if (g.lo.length) h += '<div class="tgroup"><p class="tgroup-h"><i style="background:var(--good)"></i>Twoje mocne strony: tu AI radzi sobie słabo</p>' + taskRows(g.lo, 'lo') + '</div>';
    else h += '<p class="small" style="margin-top:12px">Żadne z zaznaczonych zadań nie jest dla AI trudne. Twoja wartość leży w tym, czego nie widać w opisie stanowiska: znajomości branży, klientów i kontekstu. To warto nazwać i przenieść dalej.</p>';
    h += '</div>';
    if (r.own && job) h += ankBlock(r, job);

    /* Obszary i pokrewne zawody */
    var grp = job ? groupOf(job.k) : null;
    if (grp) {
      h += '<div><p class="res-h">Obszary, które mogą Cię zainteresować</p><p class="small" style="margin:4px 0 12px">Role, w których przyda się to, co już umiesz, a AI ma mniej do powiedzenia. To pomysły do sprawdzenia z doradcą zawodowym albo w społeczności, nie gotowe recepty.</p>' +
        '<div class="areas">' + IDEAS[grp].map(function (a) { return '<span>' + cap(a) + '</span>'; }).join('') + '</div></div>';
    }
    var rel = job ? related(job) : [];
    if (rel.length) {
      h += '<div><p class="res-h">Pokrewne zawody, w których AI może mniej</p><p class="small" style="margin:4px 0 12px">Zawody z tej samej grupy w klasyfikacji, z niższą średnią oceną zadań. Indeks nie mówi, czy są na nie oferty pracy w Twojej okolicy.</p><div class="rel">' +
        rel.map(function (j) { return '<a href="/zawody/' + j.slug + '/">' + esc(j.n) + '<small>średnia ' + fmt(j.m) + ' z 1</small></a>'; }).join('') + '</div></div>';
    }

    var fs = factors(r);
    if (fs.length) {
      h += '<div><p class="res-h" style="margin-bottom:12px">Twoja sytuacja</p><div class="factors">' + fs.map(function (f) {
        var ico = f[0] === 'up' ? '−' : f[0] === 'down' ? '+' : 'i';
        var tag = f[0] === 'up' ? 'zwiększa presję' : f[0] === 'down' ? 'działa na Twoją korzyść' : 'warto wiedzieć';
        return '<div class="factor ' + f[0] + '"><span class="ico" aria-hidden="true">' + ico + '</span><div><span class="ftag">' + tag + '</span><strong>' + f[1] + '</strong><p>' + f[2] + '</p>' + src(f[3]) + '</div></div>';
      }).join('') + '</div></div>';
    }

    if (job) {
      h += '<div class="nask"><p class="res-label">Twój zawód w indeksie ILO–NASK</p>' +
        '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>Narażenie ' + GLAB[job.g] + '</strong><span class="res-label">' +
        (job.g > 0 ? 'gradient ' + job.g + ' z 4 · ' : '') + 'średnia ' + fmt(job.m) + ' z 1</span></div>' +
        '<div class="meter sm" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<span class="' + (i <= job.g ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
        '<p class="small">Indeks ocenia przeciętne zadania w zawodzie, a Twój wynik wyżej opiera się na tym, co faktycznie robisz. <a class="src" href="/zawody/' + job.slug + '/">Wszystkie zadania tego zawodu</a> · ' + src(['ilo']) + '</p></div>';
    }
    h += nextBlock(job) + euBlock();
    if (job) h += '<div class="baro" id="baro"><p class="small" style="margin:0">Wczytuję prognozę urzędów pracy…</p></div>';

    lastShare = (name ? name + ': ' : '') + hiTxt + ' części mojego czasu w pracy to zadania, które AI może w dużej części wykonać. Ekspozycja moich zadań: ' + LEVELS[r.level] + '. Sprawdź swoją pracę:';
    h += '<div class="res-share"><span class="small" style="flex:1 1 200px">Znasz kogoś, kogo to dotyczy? Wyniki nigdzie się nie zapisują, więc każdy sprawdza swój.</span><button type="button" class="btn btn-ghost" id="q-share">Udostępnij wynik</button><span class="small" id="q-share-msg" role="status"></span></div>';

    body.innerHTML = h;
    body.scrollTop = 0;
    $('quiz-step').textContent = 'Wynik';
    $('quiz-bar').style.width = '100%';
    foot.innerHTML = '<button type="button" class="btn btn-ghost" id="q-again">Od nowa</button>' +
      '<button type="button" class="btn" id="q-cta">Dołącz do społeczności <span class="arrow" aria-hidden="true">→</span></button>';
    $('q-again').addEventListener('click', restart);
    $('q-share').addEventListener('click', shareResult);
    $('q-cta').addEventListener('click', function () {
      dlg.close();
      var d = $('dolacz');
      if (!d) { location.href = '/#dolacz'; return; }
      d.scrollIntoView({ behavior: 'smooth' });
      var em = $('f-email');
      if (em) setTimeout(function () { em.focus({ preventScroll: true }); }, 700);
    });
    if (job) { baroCss(); loadBaro(function () { baroFill(job.k); }); }
    if (r.own && job) ankInit(r, job);
    $('quiz-q').focus({ preventScroll: true });
    lastPct = pct; lastTxt = hiTxt; lastLevel = LEVELS[r.level];
  }

  function shareResult() {
    var url = 'https://nie-zastapieni.pl/kalkulator';
    var msg = $('q-share-msg');
    if (navigator.share) {
      navigator.share({ title: 'Ile z Twojej pracy potrafi już zrobić AI?', text: lastShare, url: url }).catch(function () {});
      return;
    }
    var t = lastShare + ' ' + url;
    try {
      navigator.clipboard.writeText(t).then(function () { msg.textContent = 'Skopiowano. Wklej, gdzie chcesz.'; }, function () { msg.textContent = t; });
    } catch (e) { msg.textContent = t; }
  }

  function restart() {
    A = fresh(); cur = 0; done = false; showStep();
  }

  /* Statystyki (analityka.js): jedno zdarzenie startu na wizytę, bez odpowiedzi z quizu */
  var started = false;
  function trackStart(wejscie) {
    if (started) return;
    started = true;
    if (window.nzTrack) nzTrack('kalkulator-start', { strona: location.pathname, wejscie: wejscie });
  }

  $('quiz-open').addEventListener('click', function () {
    trackStart(location.hash === '#start' ? 'link-start' : 'przycisk');
    if (done) { finish(); } else { showStep(); }
    if (!dlg.open) dlg.showModal();
    var q = $('quiz-q'); if (q) q.focus({ preventScroll: true });
  });
  $('quiz-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    clearTimeout(timer);
    if (done) {
      $('quiz-open').innerHTML = 'Zobacz swój wynik <span class="arrow" aria-hidden="true">→</span>';
      $('teaser-note').innerHTML = 'Twój wynik: <strong>' + lastTxt + ' części czasu</strong> to zadania, które AI może w dużej części wykonać, ekspozycja ' + lastLevel + '.';
    }
  });

  /* Inne przyciski otwierające quiz (atrybut data-quiz) */
  document.querySelectorAll('[data-quiz]').forEach(function (b) { b.addEventListener('click', function () { $('quiz-open').click(); }); });

  /* Tabela ogólnej listy zadań w „Jak to liczymy” (jeśli strona ją ma) */
  var ct = $('calc-table');
  if (ct) ct.querySelector('tbody').innerHTML = GENERIC.map(function (t) {
    return '<tr><td>' + t.l + '</td><td>' + fmt(t.s) + '</td><td>' + t.why + '<br>' + src(t.src) + '</td></tr>';
  }).join('');

  /* Podstrona: listy zawodów o najwyższym narażeniu (gradient 4 i 3), z tych samych danych co quiz */
  function jobLists() {
    var el4 = $('nask-g4'), el3 = $('nask-g3');
    if (!el4 && !el3) return;
    function fill(el, g, max) {
      if (!el) return 0;
      var rows = JOBS.filter(function (j) { return j.g === g; }).sort(function (a, b) { return b.m - a.m || a.n.localeCompare(b.n, 'pl'); });
      el.innerHTML = rows.slice(0, max).map(function (j) {
        return '<li><a class="jn" href="/zawody/' + j.slug + '/">' + esc(j.n) + '</a><span class="jv">' + fmt(j.m) + '</span><span class="jbar" aria-hidden="true"><i style="width:' + Math.round(j.m * 100) + '%"></i></span></li>';
      }).join('');
      return rows.length;
    }
    var n4 = fill(el4, 4, 99);
    var n3 = fill(el3, 3, 40);
    if ($('nask-g4-count')) $('nask-g4-count').textContent = n4;
    if ($('nask-g3-count')) $('nask-g3-count').textContent = Math.min(n3, 40);
    if ($('nask-g3-all')) $('nask-g3-all').textContent = n3;
  }

  /* Start: lista zawodów w tle; ?zawod=KOD otwiera quiz od zadań tego zawodu; #start od pierwszego pytania */
  var params = new URLSearchParams(location.search);
  var pre = params.get('zawod');
  loadJobs(function () {
    jobLists();
    if (pre && BYCODE[pre]) {
      A.zawod = pre;
      loadTasks(pre).then(function () {
        trackStart('link-zawodu');
        cur = 1; showStep();
        if (!dlg.open) dlg.showModal();
      }).catch(function () {});
    }
  });
  if (location.hash === '#start' && !pre) $('quiz-open').click();
})();
