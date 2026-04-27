# Dlužníček

Hotová mobilní PWA aplikace pro evidenci půjček, splátek a dluhů.

## Co umí

- zapisovat půjčky a splátky
- automaticky počítat celkový zůstatek
- ukazovat přehled dlužníků podle jména
- filtrovat a řadit historii
- upravovat, kopírovat a mazat záznamy
- exportovat CSV pro Excel / Numbers
- exportovat a importovat JSON zálohu
- fungovat offline po prvním načtení
- instalovat jako aplikaci na mobil přes prohlížeč

## Soukromí

Data se ukládají jen v prohlížeči zařízení přes `localStorage`. Aplikace nic neposílá na server.

## Nasazení na GitHub Pages

1. Nahraj všechny soubory z tohoto ZIPu do repozitáře.
2. V GitHubu otevři **Settings → Pages**.
3. Vyber větev `main` a složku `/root`.
4. Ulož a počkej, až GitHub vytvoří odkaz.

## Nasazení na Vercel

Stačí importovat repozitář jako statický projekt. Build command není potřeba, output directory nech prázdný nebo `.`.

## Struktura

```txt
index.html
style.css
app.js
manifest.json
service-worker.js
assets/icons/
  icon-192.png
  icon-512.png
  apple-touch-icon.png
  favicon-32.png
  favicon.ico
```

Verze: 1.0.0
