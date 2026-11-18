// Ankieta „Jak jest u Ciebie?” z wyniku kalkulatora.
// POST: zapisuje anonimowe odpowiedzi do Airtable (jeden wiersz na zadanie).
// GET ?kod=XXXXXX: zwraca zbiorcze odpowiedzi dla zawodu, zadania dopiero od MIN osób.
// Zmienne środowiskowe na Netlify: AIRTABLE_TOKEN (wymagany, zakres Functions); AIRTABLE_BASE (wymagany, ID bazy); opcjonalnie AIRTABLE_TABLE.
const MIN = 20;
const ODP = { za: 'AI robi to za mnie', pom: 'AI mi pomaga', nie: 'AI nie daje rady', nu: 'Nie używam do tego AI' };
const FORMA = { etat: 'etat', zlec: 'zlecenia', free: 'własna firma / wielu klientów' };
const F = { id: 'Zgłoszenie', kod: 'Kod zawodu', zawod: 'Zawód', nr: 'Nr zadania', zad: 'Zadanie', odp: 'Odpowiedź', ilo: 'Ocena ILO', forma: 'Forma pracy' };

const json = (o, status = 200, extra = {}) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

function cfg() {
  const token = process.env.AIRTABLE_TOKEN, base = process.env.AIRTABLE_BASE;
  const table = encodeURIComponent(process.env.AIRTABLE_TABLE || 'Ankieta');
  if (!token || !base) return null;
  return { url: `https://api.airtable.com/v0/${base}/${table}`, h: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' } };
}

async function zapisz(req, c) {
  let b;
  try { b = await req.json(); } catch { return json({ ok: false, blad: 'zly-format' }, 400); }
  const kod = String(b.kod || '');
  const id = String(b.id || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
  if (!/^\d{6}$/.test(kod) || id.length < 8 || !Array.isArray(b.odp) || !b.odp.length || b.odp.length > 60) return json({ ok: false, blad: 'dane' }, 400);
  const rows = [];
  for (const o of b.odp) {
    const nr = Number(o.nr);
    if (!Number.isInteger(nr) || nr < 0 || nr > 300 || !ODP[o.v]) continue;
    rows.push({ fields: {
      [F.id]: id, [F.kod]: kod, [F.zawod]: String(b.zawod || '').slice(0, 200), [F.nr]: nr,
      [F.zad]: String(o.l || '').slice(0, 400), [F.odp]: ODP[o.v],
      [F.ilo]: typeof o.s === 'number' ? Math.round(o.s * 100) / 100 : null,
      [F.forma]: FORMA[b.forma] || null } });
  }
  if (!rows.length) return json({ ok: false, blad: 'brak-odpowiedzi' }, 400);
  for (let i = 0; i < rows.length; i += 10) {
    const r = await fetch(c.url, { method: 'POST', headers: c.h, body: JSON.stringify({ records: rows.slice(i, i + 10), typecast: true }) });
    if (!r.ok) { console.error('airtable', r.status, await r.text()); return json({ ok: false, blad: 'zapis' }, 502); }
  }
  return json({ ok: true, zapisano: rows.length });
}

async function zestaw(kod, c) {
  if (!/^\d{6}$/.test(kod)) return json({ n: 0 }, 400);
  const osoby = new Set(), t = {}, rev = Object.fromEntries(Object.entries(ODP).map(([k, v]) => [v, k]));
  let offset = '';
  do {
    const q = new URLSearchParams({ filterByFormula: `{${F.kod}}='${kod}'`, pageSize: '100' });
    [F.id, F.nr, F.odp].forEach(f => q.append('fields[]', f));
    if (offset) q.set('offset', offset);
    const r = await fetch(`${c.url}?${q}`, { headers: c.h });
    if (!r.ok) { console.error('airtable', r.status, await r.text()); return json({ n: 0 }, 502); }
    const d = await r.json();
    for (const rec of d.records) {
      const f = rec.fields, k = rev[f[F.odp]];
      if (!k || f[F.nr] == null) continue;
      osoby.add(f[F.id]);
      (t[f[F.nr]] = t[f[F.nr]] || { za: 0, pom: 0, nie: 0, nu: 0 })[k]++;
    }
    offset = d.offset || '';
  } while (offset);
  const n = osoby.size;
  return json({ n, min: MIN, t: n >= MIN ? t : {} }, 200,
    { 'cache-control': 'public, max-age=300', 'netlify-cdn-cache-control': 'public, s-maxage=1800, stale-while-revalidate=86400' });
}

export default async (req) => {
  const c = cfg();
  if (!c) return json({ ok: false, blad: 'brak-konfiguracji' }, 503);
  if (req.method === 'POST') return zapisz(req, c);
  if (req.method === 'GET') return zestaw(new URL(req.url).searchParams.get('kod') || '', c);
  return json({ ok: false }, 405);
};

export const config = { path: '/api/ankieta' };
