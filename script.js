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
    text: "Eure Zusage ist bei uns angekommen. Wir können es kaum erwarten, am 4. Juni 2027 mit euch zu feiern. Weitere Infos folgen bald."
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
  let loadedAt = Date.now();

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

  /* Personen */
  const people = $("#people");
  const tpl = $("#personTpl");
  let personSeq = 0;

  function addPerson() {
    const frag = tpl.content.cloneNode(true);
    const el = frag.querySelector(".person");
    const n = ++personSeq;
    const q = (s) => el.querySelector(s);
    // eindeutige ids pro Person: Label-Verknüpfung, Gruppenname, Fehlermeldung
    q(".person__title").id = "person-" + n + "-title";
    el.setAttribute("aria-labelledby", "person-" + n + "-title");
    q(".p-name-label").htmlFor = q(".p-name").id = "name-" + n;
    q(".p-name-err").id = "name-" + n + "-err";
    q(".p-name").setAttribute("aria-describedby", "name-" + n + "-err");
    // nur die erste Person per Autofill mit dem eigenen Namen vorbelegen
    q(".p-name").setAttribute("autocomplete", people.children.length ? "off" : "name");
    q(".p-allergies-label").htmlFor = q(".p-allergies").id = "allergies-" + n;
    el.querySelectorAll(".p-att").forEach((r) => {
      r.name = "attending_" + n;
      r.addEventListener("change", () => syncDetails(el));
    });
    el.querySelector(".person__remove").addEventListener("click", () => {
      el.remove();
      renumber();
      $("#addPersonBtn").focus();
    });
    people.appendChild(el);
    renumber();
    return el;
  }
  function renumber() {
    const all = people.querySelectorAll(".person");
    all.forEach((el, i) => {
      el.querySelector(".person__title").textContent = all.length > 1 ? "Person " + (i + 1) : "Eure Antwort";
      const rm = el.querySelector(".person__remove");
      rm.hidden = all.length < 2;
      rm.setAttribute("aria-label", "Person " + (i + 1) + " entfernen");
    });
  }
  function syncDetails(el) {
    const att = el.querySelector(".p-att:checked");
    el.querySelector(".p-details").hidden = !att || att.value !== "ja";
  }
  $("#addPersonBtn").addEventListener("click", () => {
    const el = addPerson();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // sanft einblenden und in den sichtbaren Bereich holen
    el.classList.add("person--new");
    el.addEventListener("animationend", () => el.classList.remove("person--new"), { once: true });
    el.querySelector(".p-name").focus({ preventScroll: true });
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
  });
  addPerson();

  /* Validierung */
  function setErr(el, msg) {
    el.textContent = msg || "";
    const f = el.closest(".field");
    if (f) f.classList.toggle("invalid", !!msg);
  }
  function setErrId(id, msg) { setErr($("#" + id), msg); }

  function collect() {
    const v = (n) => (form.elements[n].value || "").trim();
    return {
      people: Array.from(people.querySelectorAll(".person")).map((el) => {
        const att = (el.querySelector(".p-att:checked") || {}).value || "";
        const yes = att === "ja";
        return {
          name: el.querySelector(".p-name").value.trim(),
          attending: att,
          vegetarian: yes ? (el.querySelector(".p-veg").checked ? "ja" : "nein") : "",
          allergies: yes ? el.querySelector(".p-allergies").value.trim() : ""
        };
      }),
      message: v("message"),
      email: v("email"),
      website: v("website")
    };
  }

  function validate(d) {
    let first = null;
    const fail = (el, msg, focusEl) => { setErr(el, msg); if (!first) first = focusEl; };
    setErrId("email-err", "");
    const els = people.querySelectorAll(".person");
    d.people.forEach((p, i) => {
      const el = els[i];
      setErr(el.querySelector(".p-name-err"), "");
      setErr(el.querySelector(".p-att-err"), "");
      if (!p.name) fail(el.querySelector(".p-name-err"), "Bitte gib einen Namen ein.", el.querySelector(".p-name"));
      if (!p.attending) fail(el.querySelector(".p-att-err"), "Bitte wähle eine Antwort aus.", el.querySelector(".p-att"));
    });
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) fail($("#email-err"), "Diese E-Mail-Adresse sieht ungewöhnlich aus.", $("#email"));
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
    if (data.website) { showThanks(data); return; }

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
      showThanks(data);
    } catch (err) {
      console.error(err);
      setStatus("Das Senden hat leider nicht geklappt. Bitte prüft eure Verbindung und versucht es nochmal – oder meldet euch direkt bei uns.", true);
      btn.disabled = false;
    }
  });

  function showThanks(data) {
    const anyYes = data.people.some((p) => p.attending === "ja");
    const t = anyYes ? THANKS.ja : THANKS.nein;
    $("#thanksTitle").textContent = t.title;
    $("#thanksScript").textContent = t.script;
    $("#thanksText").textContent = t.text;
    $("#formView").hidden = true;
    $("#thanksView").hidden = false;
    $("#rsvp").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#thanksTitle").focus({ preventScroll: true });
  }
})();
