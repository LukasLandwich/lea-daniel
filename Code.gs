/**
 * Hochzeit Lea & Daniel – Rückmeldungen in Google Sheet speichern.
 * Dieses Skript wird direkt im Google Sheet angelegt (Erweiterungen → Apps Script).
 *
 * Felder ändern: Eintrag in FIELDS ergänzen/umbenennen/entfernen
 * (key = Feldname im Formular, label = Spaltenüberschrift im Sheet).
 */
var SHEET_NAME = 'Rückmeldungen';

var FIELDS = [
  { key: 'name',       label: 'Name' },
  { key: 'attending',  label: 'Teilnahme' },
  { key: 'vegetarian', label: 'Vegetarisch' },
  { key: 'allergies',  label: 'Allergien / Unverträglichkeiten' },
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
    var now = new Date();
    data.people.forEach(function (p) {
      var rec = {
        name: p.name, attending: p.attending, vegetarian: p.vegetarian,
        allergies: p.allergies, message: data.message, email: data.email
      };
      var row = [now];
      FIELDS.forEach(function (f) { row.push(clean_(rec[f.key])); });
      sheet.appendRow(row);
    });
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
  if (!d.people || !d.people.length) return 'Keine Personen angegeben.';
  if (d.people.length > 20) return 'Zu viele Personen.';
  for (var i = 0; i < d.people.length; i++) {
    var p = d.people[i];
    if (!p.name || String(p.name).trim().length < 1) return 'Name fehlt.';
    if (String(p.name).length > 200) return 'Name zu lang.';
    if (p.attending !== 'ja' && p.attending !== 'nein') return 'Teilnahme fehlt.';
  }
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) return 'E-Mail ungültig.';
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
