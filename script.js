/* =====================================================
   EINSTELLUNGEN – hier bitte anpassen
   ===================================================== */
// URL der Google-Apps-Script-Web-App (Schritt 3 der README)
const WEB_APP_URL = "HIER_DIE_WEB_APP_URL_EINTRAGEN";

// true  = Testmodus: nichts wird gesendet, die Antwort erscheint nur in der Konsole (F12)
// false = echter Betrieb, Antworten landen im Google Sheet
const TEST_MODE = true;

// Hero-Wortpaar: "unser" → UNSER / FEST   |   "save" → SAVE / DATE
const HERO_VARIANT = "unser";

// Mindestzeit (Sekunden) zwischen Seitenaufruf und Absenden (Spam-Schutz)
const MIN_SECONDS = 4;

const HERO_VARIANTS = {
  unser: { top: "Unser", script: "großes", bottom: "Fest",  label: "Unser großes Fest" },
  save:  { top: "Save",  script: "the",    bottom: "Date",  label: "Save the Date" }
};

const THANKS = {
  ja: {
    title: "Danke!",
    script: "wir freuen uns so sehr!",
    text: "Eure Zusage ist bei uns angekommen. Wir können es kaum erwarten, am 04 Juni 2027 mit euch zu feiern. Weitere Infos folgen bald."
  },
  nein: {
    title: "Schade!",
    script: "wir denken an euch",
    text: "Danke, dass ihr uns Bescheid gegeben habt. Wir werden euch an diesem Tag vermissen – und freuen uns darauf, euch bald wiederzusehen."
  }
};

/* =====================================================
   Ab hier muss nichts geändert werden
   ===================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  const $ = (s, r = document) => r.querySelector(s);
  const form = $("#rsvpForm");
  const loadedAt = Date.now();

  /* Hero-Variante */
  const hv = HERO_VARIANTS[HERO_VARIANT] || HERO_VARIANTS.unser;
  $("#wordTop").textContent = hv.top;
  $("#wordScript").textContent = hv.script;
  $("#wordBottom").textContent = hv.bottom;
  $("#heroTitle").setAttribute("aria-label", hv.label);

  /* Einblenden beim Scrollen */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* Zusage-Details ein-/ausblenden */
  const details = $("#details");
  const persons = $("#persons");
  const companionsField = $("#companionsField");
  const attendingVal = () => (form.querySelector('input[name="attending"]:checked') || {}).value || "";

  function syncDetails() {
    details.hidden = attendingVal() !== "ja";
    syncCompanions();
  }
  function syncCompanions() {
    companionsField.hidden = !(Number(persons.value) > 1) || details.hidden;
  }
  form.querySelectorAll('input[name="attending"]').forEach((r) => r.addEventListener("change", syncDetails));
  persons.addEventListener("input", syncCompanions);

  /* Validierung */
  function setErr(id, msg) {
    const p = $("#" + id);
    p.textContent = msg || "";
    const f = p.closest(".field");
    if (f) f.classList.toggle("invalid", !!msg);
  }

  function collect() {
    const v = (n) => (form.elements[n].value || "").trim();
    const att = attendingVal();
    const data = {
      name: v("name"),
      attending: att,
      persons: "", companions: "", meal_meat: "", meal_veg: "", meal_vegan: "", allergies: "",
      message: v("message"),
      email: v("email"),
      website: v("website")
    };
    if (att === "ja") {
      data.persons = Number(v("persons")) || 0;
      data.companions = data.persons > 1 ? v("companions") : "";
      data.meal_meat = Number(v("meal_meat")) || 0;
      data.meal_veg = Number(v("meal_veg")) || 0;
      data.meal_vegan = Number(v("meal_vegan")) || 0;
      data.allergies = v("allergies");
    }
    return data;
  }

  function validate(d) {
    let first = null;
    const fail = (id, msg, focusSel) => { setErr(id, msg); if (!first) first = $(focusSel); };
    ["name-err", "attending-err", "persons-err", "meals-err", "email-err"].forEach((i) => setErr(i, ""));

    if (!d.name) fail("name-err", "Bitte tragt euren Namen ein.", "#name");
    if (!d.attending) fail("attending-err", "Bitte wählt eine Antwort aus.", 'input[name="attending"]');
    if (d.attending === "ja") {
      if (!(d.persons >= 1 && d.persons <= 10)) fail("persons-err", "Bitte gebt eine Zahl zwischen 1 und 10 an.", "#persons");
      const sum = d.meal_meat + d.meal_veg + d.meal_vegan;
      if (sum !== d.persons) fail("meals-err", `Die Essenswünsche (${sum}) passen nicht zur Personenzahl (${d.persons}).`, 'input[name="meal_meat"]');
    }
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) fail("email-err", "Diese E-Mail-Adresse sieht ungewöhnlich aus.", "#email");
    if (first) first.focus();
    return !first;
  }

  /* Senden */
  const btn = $("#submitBtn");
  const status = $("#status");
  function setStatus(msg, isErr) {
    status.textContent = msg;
    status.classList.toggle("is-error", !!isErr);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    const data = collect();
    if (!validate(data)) return;

    // Honeypot: Bots bekommen scheinbar Erfolg, es wird nichts gespeichert
    if (data.website) { showThanks(data.attending); return; }

    if ((Date.now() - loadedAt) / 1000 < MIN_SECONDS) {
      setStatus("Einen kleinen Moment noch – bitte versucht es gleich nochmal.", true);
      return;
    }

    btn.disabled = true;
    setStatus("Wird gesendet …");

    try {
      if (TEST_MODE || WEB_APP_URL.indexOf("HIER_") === 0) {
        console.log("[Testmodus] Rückmeldung (nicht gesendet):", data);
        await new Promise((r) => setTimeout(r, 500));
      } else {
        // text/plain vermeidet den CORS-Preflight
        const res = await fetch(WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Unbekannter Fehler");
      }
      showThanks(data.attending);
    } catch (err) {
      console.error(err);
      setStatus("Das Senden hat leider nicht geklappt. Bitte prüft eure Verbindung und versucht es nochmal – oder meldet euch direkt bei uns.", true);
      btn.disabled = false;
    }
  });

  function showThanks(att) {
    const t = THANKS[att] || THANKS.ja;
    $("#thanksTitle").textContent = t.title;
    $("#thanksScript").textContent = t.script;
    $("#thanksText").textContent = t.text;
    $("#formView").hidden = true;
    $("#thanksView").hidden = false;
    $("#rsvp").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#thanksTitle").focus({ preventScroll: true });
  }
})();
