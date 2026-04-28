# Dlužníček – Pro Glass Edition

Hotová mobilní PWA aplikace pro evidenci půjček, splátek a dluhů.
Data se ukládají lokálně v zařízení přes `localStorage`, takže aplikace funguje bez backendu a bez přihlášení.

## Co appka umí

- Přidání půjčky a splátky přes plovoucí iOS bottom sheet.
- Automatický výpočet celkového zůstatku.
- Přehled dlužníků podle jména.
- Historie záznamů s filtrem, hledáním a řazením.
- Editace, kopírování a mazání jednotlivých záznamů.
- Export do CSV pro Numbers/Excel.
- JSON záloha a import dat.
- Offline režim přes service worker.
- PWA manifest a ikony pro instalaci na mobil.

## Design v této verzi

- Ambientní animované pozadí ze tří sférických světel: indigo, purple a sky blue.
- Skutečný glassmorphism: `saturate(180%)`, `blur(30px)`, průhledné karty a jemný vnitřní odlesk.
- Plovoucí iOS bottom sheet s madlem, zaoblením a animací `cubic-bezier(0.32, 0.72, 0, 1)`.
- iOS-like typografie: velká gradientní částka, jemné uppercase labely a těsné letter-spacing.
- Nové akční barvy: rose pro půjčku, emerald pro splátku.
- Vtipná, ale stylová ikonka Dlužníček s peněženkou a Kč motivem.

## Nasazení

Stačí nahrát celý obsah složky do GitHub repozitáře nebo na hosting typu Vercel / Netlify / GitHub Pages.
Důležité soubory musí zůstat ve stejné struktuře:

```text
index.html
style.css
app.js
manifest.json
service-worker.js
assets/icons/...
```

## Poznámka

Aplikace nepoužívá žádné externí CDN knihovny. Všechno běží přímo z lokálních souborů.
