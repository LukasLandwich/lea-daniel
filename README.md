# Rückmeldeseite Lea & Daniel – 04 Juni 2027

Eine statische Seite (HTML, CSS, JavaScript – kein Build, kein Framework). Die Antworten landen über Google Apps Script in einem Google Sheet. Alles kostenlos.

```
index.html   Seite          styles.css   Design
script.js    Logik          Code.gs      Backend (Google Apps Script)
fonts/       lokale Schriften (keine Google-Server)
.nojekyll    für GitHub Pages
```

## 1. Google Sheet anlegen
1. Auf <https://sheets.google.com> eine neue, leere Tabelle erstellen, z. B. „Hochzeit Rückmeldungen“.
2. Die Spalten legt das Skript beim ersten Eintrag selbst an.

## 2. Apps Script einfügen und bereitstellen
1. In der Tabelle: **Erweiterungen → Apps Script**.
2. Den vorhandenen Code löschen und den Inhalt von `Code.gs` einfügen. Speichern.
3. **Bereitstellen → Neue Bereitstellung → Typ „Web-App“**.
   - Ausführen als: **Ich**
   - Wer hat Zugriff: **Jeder**
4. Berechtigungen bestätigen (Google zeigt „App nicht verifiziert“ → *Erweitert → Weiter*; es ist euer eigenes Skript).
5. Die **Web-App-URL** kopieren (endet auf `/exec`).
6. Zur Kontrolle die URL im Browser öffnen – es sollte `{"ok":true,…}` erscheinen.

> Ändert ihr `Code.gs` später, müsst ihr unter *Bereitstellen → Bereitstellungen verwalten* eine **neue Version** veröffentlichen. Die URL bleibt gleich.

## 3. URL in script.js eintragen
Oben in `script.js`:
```js
const WEB_APP_URL = "https://script.google.com/macros/s/…/exec";
const TEST_MODE = false;   // true = nur Konsole, nichts wird gesendet
```
Weitere Einstellungen dort: `HERO_VARIANT` (`"unser"` = UNSER / FEST, `"save"` = SAVE / DATE), Mindestzeit gegen Spam, Danke-Texte.
Den Platzhalter `[DATUM]` (Rückmeldefrist), die Links „Impressum / Datenschutz“ und ggf. Texte ändert ihr in `index.html`.

## 4. Veröffentlichen

### Variante A: GitHub Pages (eigene Webseite)
1. Auf <https://github.com> ein neues Repository anlegen (z. B. `hochzeit`). Öffentlich ist bei Pages im Gratis-Tarif nötig. Das Sheet bleibt trotzdem privat.
2. Alle Dateien dieses Ordners hochladen (*Add file → Upload files*, inkl. Ordner `fonts` und der Datei `.nojekyll`).
3. **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)** → Save.
4. Nach ca. 1 Minute ist die Seite erreichbar unter `https://DEIN-NAME.github.io/hochzeit/`.
5. Optional eigene Domain: unter *Pages → Custom domain* eintragen.

Alle Pfade sind relativ, die Seite funktioniert daher auch unter `/hochzeit/`. Änderungen: Datei im Repo ersetzen → nach kurzer Zeit live.

### Variante B: Netlify oder Cloudflare Pages
- Netlify: <https://app.netlify.com/drop> – den ganzen Ordner per Drag & Drop hineinziehen.
- Cloudflare Pages: *Workers & Pages → Create → Pages → Upload assets*, Ordner hochladen.

## 5. QR-Code erzeugen
Die fertige Seiten-URL in einen kostenlosen QR-Generator einfügen (z. B. <https://www.qrcode-monkey.com> oder <https://goqr.me>), als PNG/SVG herunterladen und in die Einladung drucken. Vorher mit dem Handy scannen.

## 6. Testen und Antworten ansehen
1. **Ohne Backend:** `TEST_MODE = true`, `index.html` im Browser öffnen, Formular ausfüllen (nach ≥ 4 Sekunden), mit **F12 → Konsole** die Daten ansehen.
2. **Mit Backend:** `TEST_MODE = false`, URL eingetragen, eine Test-Zusage und eine Test-Absage senden.
3. Im Google Sheet (Tabellenblatt „Rückmeldungen“) erscheint pro Antwort eine Zeile. Testzeilen danach löschen.

## Datenschutz
- Schriften liegen lokal in `fonts/` (Lizenz: SIL Open Font License – Italiana, Great Vibes, Mrs Saint Delafield, Jost).
- Keine Cookies, kein Tracking, kein Captcha.
- Zeilen im Sheet nach der Hochzeit löschen (so steht es im Hinweis unter dem Formular).
- Impressum und Datenschutzerklärung müsst ihr selbst ergänzen (die Links sind Platzhalter, `#impressum` / `#datenschutz`).
- Die Seite ist per `noindex` für Suchmaschinen gesperrt.
