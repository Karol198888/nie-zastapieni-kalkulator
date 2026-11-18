"""Pobiera prognozy Barometru zawodów (rok z argumentu) dla 168 grup zawodów:
Polska, 16 województw i wszystkie powiaty, z komentarzami ekspertów.
Uruchamiane w GitHub Actions (strona Barometru jest niedostępna z kontenera Claude).
Wynik: barometr_<rok>.json + przykładowa strona HTML do sprawdzenia legendy."""
import json, re, sys, time
import requests

ROK = sys.argv[1] if len(sys.argv) > 1 else "2027"
BASE = "https://barometrzawodow.pl"
URL = BASE + "/modul/prognozy-w-tabelach"
s = requests.Session()
s.headers["User-Agent"] = "nie-zastapieni.pl (zestawienie danych publicznych; kontakt@nie-zastapieni.pl)"

strona = s.get(URL, timeout=60).text
token = re.search(r'<meta name="csrf-token" content="([^"]+)"', strona).group(1)
m = re.search(r"const counties\s*=\s*(\[.*?\]);\s*\n", strona, re.S)
powiaty = json.loads(m.group(1))  # indeks = id województwa (0 = „wszystkie”)
woj = re.findall(r'<option value="(\d+)"[^>]*>\s*([^<]+?)\s*</option>', strona.split('search-panel-select-province', 1)[1].split('</select>', 1)[0])

grupy = s.post(BASE + "/api/v1/profession-group-list-by-forecast-card",
               headers={"X-CSRF-TOKEN": token, "X-Requested-With": "XMLHttpRequest"},
               data={"years[]": ROK, "show_for_select_2_plugin": "true", "sorting_by": "name_pl", "locale": "pl"},
               timeout=60).json()["data"]
print("grupy:", len(grupy), "województwa w liście powiatów:", len(powiaty))

RE = re.compile(r"contentSearchResults\['(\d+)\.(\d+)'\]\s*=\s*([\[{].*?[\]}]);\s*$", re.M)

def zapytaj(prowincja, powiaty_ids, ids):
    p = [("search_type", "areas"), ("year", ROK),
         ("type_of_forecast[relation_level]", "relation_level"),
         ("type_of_forecast[need_level]", "need_level"), ("province[]", prowincja)]
    p += [("county[]", str(c)) for c in powiaty_ids]
    p += [("profession[]", str(g)) for g in ids]
    p.append(("search_form", "yes"))
    for proba in range(4):
        try:
            r = s.get(URL, params=p, timeout=120)
            r.raise_for_status()
            return r.text
        except Exception as e:
            print("ponawiam", prowincja, ids[:1], e); time.sleep(5 * (proba + 1))
    raise RuntimeError("nie udało się")

wyniki = {}
probka = None
ids_all = [g["id"] for g in grupy]
cele = [("1000", [])] + [(str(i), [c["id"] for c in powiaty[i] if c["id"]]) for i in range(1, len(powiaty))]
for prow, pids in cele:
    for i in range(0, len(ids_all), 10):
        h = zapytaj(prow, pids, ids_all[i:i + 10])
        if probka is None: probka = h
        n = 0
        for gid, rok, js in RE.findall(h):
            o = json.loads(js)
            arr = o if isinstance(o, list) else list(o.values())
            wyniki.setdefault(gid, {})[prow] = arr
            n += 1
        print(prow, i, "grup:", n, flush=True)
        time.sleep(0.6)

json.dump({"rok": ROK, "pobrano": time.strftime("%Y-%m-%d"), "zrodlo": URL,
           "grupy": grupy, "wojewodztwa": woj, "powiaty": powiaty, "wyniki": wyniki},
          open(f"barometr_{ROK}.json", "w"), ensure_ascii=False)
open(f"probka_{ROK}.html", "w").write(probka)
print("gotowe:", len(wyniki), "grup")
