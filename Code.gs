/**
 * Hochzeit Lea & Daniel – Rückmeldungen in Google Sheet speichern.
 * Dieses Skript wird direkt im Google Sheet angelegt (Erweiterungen → Apps Script).
 *
 * Felder ändern: Eintrag in FIELDS ergänzen/umbenennen/entfernen
 * (key = Feldname im Formular, label = Spaltenüberschrift im Sheet).
 */
var SHEET_NAME = 'Rückmeldungen';

var FIELDS = [
  { key: 'name',       label: 'Name(n)' },
  { key: 'attending',  label: 'Teilnahme' },
  { key: 'persons',    label: 'Personen' },
  { key: 'companions', label: 'Begleitpersonen' },
  { key: 'meal_meat',  label: 'Fleisch' },
  { key: 'meal_veg',   label: 'Vegetarisch' },
  { key: 'meal_vegan', label: 'Vegan' },
  { key: 'allergies',  label: 'Allergien' },
  { key: 'message',    label: 'Nachricht' },
  { key: 'email',      label: 'E-Mail' }
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Spam: Honeypot gefüllt → still "erfolgreich" antworten, aber nichts speichern
    if (data.website) return json_({ ok: true });

    var error = validate_(data);
    if (error) return json_({ ok: false, error: error });

    lock.waitLock(20000); // gleichzeitige Schreibzugriffe nacheinander abarbeiten
    var sheet = getSheet_();
    var row = [new Date()];
    FIELDS.forEach(function (f) { row.push(clean_(data[f.key])); });
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'Serverfehler: ' + err.message });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Zum schnellen Test im Browser: Web-App-URL öffnen → {"ok":true,...}
function doGet() {
  return json_({ ok: true, info: 'Rückmeldungs-Endpunkt läuft.' });
}

function validate_(d) {
  if (!d.name || String(d.name).trim().length < 1) return 'Name fehlt.';
  if (String(d.name).length > 200) return 'Name zu lang.';
  if (d.attending !== 'ja' && d.attending !== 'nein') return 'Teilnahme fehlt.';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) return 'E-Mail ungültig.';
  if (d.attending === 'ja') {
    var p = Number(d.persons);
    if (!(p >= 1 && p <= 10)) return 'Personenzahl ungültig.';
    var sum = Number(d.meal_meat || 0) + Number(d.meal_veg || 0) + Number(d.meal_vegan || 0);
    if (sum !== p) return 'Essenswünsche passen nicht zur Personenzahl.';
  }
  return null;
}

// Begrenzt die Länge und verhindert Formel-Einschleusung (=, +, -, @ am Anfang)
function clean_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return v;
  var s = String(v).trim().slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    var header = ['Zeitstempel'].concat(FIELDS.map(function (f) { return f.label; }));
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
