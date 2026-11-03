/* app.js — app mobile: percorso, player a schede con domande, XP e streak, ripasso, profilo. Stato salvato in localStorage. */
"use strict";
(function () {
  const MODS = { "0": "Basi", "A": "Linguaggi regolari", "B": "Context-free e Chomsky", "C": "Calcolabilità", "D": "Complessità", "E": "Verso l'esame" };
  const LESSONS = LESSON_DATA.slice().sort((a, b) => a.n - b.n);
  const byN = Object.fromEntries(LESSONS.map(l => [l.n, l]));
  const app = document.getElementById("app");

  /* ---------- icone ---------- */
  const I = {
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="var(--flame)" d="M12 2c1 3.5 5 5.6 5 10.2A5 5 0 0 1 12 17a5 5 0 0 1-5-4.8c0-2 1-3.4 2-4.4.2 1.6 1 2.6 2.1 3.1C11 8.7 10.6 5 12 2z"/><path fill="var(--mark)" d="M12 22a4 4 0 0 1-4-4c0-1.8 1.4-3 2.4-4 .3 1.2 1 2 2 2.3.3-1.6.8-2.6 1.6-3.6.8 1.3 2 2.6 2 4.9a4 4 0 0 1-4 4.4z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="var(--accent)" d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="19" r="2.5"/><path d="M8.3 6.1 15.7 10.9M15.7 13.1 8.3 17.9"/></svg>',
    review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  const icon = (k) => { const s = document.createElement("span"); s.style.display = "inline-grid"; s.innerHTML = I[k]; return s.firstChild; };

  /* ---------- stato ---------- */
  const KEY = "it-app-v1";
  const fresh = () => ({ xp: 0, days: {}, lessons: {}, wrong: [], exReview: [], goal: 50, answered: 0, correct: 0 });
  let S = fresh();
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => dkey(new Date());
  function addXP(n, msg) {
    S.xp += n; S.days[today()] = (S.days[today()] || 0) + n; save();
    toast(`+${n} XP${msg ? " · " + msg : ""}`);
  }
  function streak() {
    let d = new Date(), n = 0;
    if (!S.days[dkey(d)]) d.setDate(d.getDate() - 1);
    while (S.days[dkey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const L = (n) => (S.lessons[n] = S.lessons[n] || { pos: 0, done: false });

  let toastT = null;
  function toast(t) {
    document.querySelectorAll(".toast").forEach(e => e.remove());
    const el = h("div", { class: "toast", role: "status" }, t);
    document.body.append(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 1600);
  }
  function math(el) {
    if (typeof renderMathInElement !== "function") return;
    renderMathInElement(el, { delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }], ignoredClasses: ["bench"], throwOnError: false });
  }

  /* ---------- da lezione a mazzo di schede ---------- */
  const deckCache = {};
  const BOX = ".def,.thm,.proof,.example,.warn,.remark,.recap,.tblwrap,figure";
  const words = (el) => (el.textContent || "").trim().split(/\s+/).filter(Boolean).length;
  function buildDeck(n) {
    if (deckCache[n]) return deckCache[n];
    const les = byN[n], tmp = document.createElement("div");
    tmp.innerHTML = les.html;
    const sections = []; let cur = { title: "Introduzione", els: [] };
    for (const el of [...tmp.children]) {
      if (el.tagName === "H2") { if (cur.els.length) sections.push(cur); cur = { title: el.innerHTML, els: [] }; }
      else cur.els.push(el);
    }
    if (cur.els.length) sections.push(cur);
    const quiz = (QUIZ_DATA[n] || []).map((q, i) => ({ ...q, id: `${n}-${i}` }));
    const cards = [];
    sections.forEach((sec, si) => {
      const secNo = si + 1; let first = true, card = null;
      const head = () => { const f = first; first = false; return f ? { secNo, secTitle: sec.title, secTot: sections.length } : null; };
      const flush = () => { if (card && card.nodes.length) cards.push(card); card = null; };
      const ensure = () => { if (!card) card = { type: "content", head: head(), nodes: [], words: 0, boxes: 0 }; };
      for (const el of sec.els) {
        if (el.matches("section.exercises")) {
          flush();
          [...el.querySelectorAll(".ex")].forEach((ex, k) => {
            const sol = ex.querySelector("details.sol > div"); const lvl = ex.querySelector(".lvl");
            const body = [...ex.children].filter(c => !c.matches("details.sol, .lvl")).map(c => c.outerHTML).join("");
            cards.push({ type: "ex", head: head(), lvl: lvl ? lvl.textContent : "", body, sol: sol ? sol.innerHTML : "", id: `${n}-e${k}` });
          });
          continue;
        }
        if (el.matches("section.oral")) { flush(); cards.push({ type: "content", head: head() || { secNo, secTitle: "Domande da orale", secTot: sections.length, sub: true }, nodes: [el.outerHTML], words: 0, boxes: 1 }); continue; }
        const w = words(el);
        if (el.matches("[data-w]")) {
          if (card && (card.words > 70 || card.boxes)) flush();
          ensure(); card.nodes.push(el.outerHTML); flush(); continue;
        }
        if (el.matches(BOX)) {
          if (card && (card.boxes > 0 || card.words + w > 170)) flush();
          ensure(); card.nodes.push(el.outerHTML); card.boxes++; card.words += w;
          if (w > 90) flush();
          continue;
        }
        if (card && card.words > 0 && (card.boxes > 0 || card.words + w > 130)) flush();
        ensure(); card.nodes.push(el.outerHTML); card.words += w;
      }
      flush();
      quiz.filter(q => q.s === secNo).forEach(q => cards.push({ type: "quiz", ...q }));
    });
    quiz.filter(q => q.s > sections.length).forEach(q => cards.push({ type: "quiz", ...q }));
    return (deckCache[n] = cards);
  }

  /* ---------- router ---------- */
  function route() {
    const hsh = location.hash.slice(1);
    let m;
    if ((m = hsh.match(/^l-(\d+)$/)) && byN[+m[1]]) return player({ mode: "lesson", n: +m[1] });
    if (hsh === "ripasso") return reviewScreen();
    if (hsh === "profilo") return profileScreen();
    return homeScreen();
  }
  window.addEventListener("hashchange", route);
  const go = (hsh) => { if (location.hash === "#" + hsh) route(); else location.hash = hsh; };

  function shell(tab, content) {
    const top = h("header", { class: "topbar" }, h("div", { class: "brand" }, tab === "home" ? "Informatica Teorica" : tab === "ripasso" ? "Ripasso" : "Profilo"),
      h("div", { class: "stats" }, h("span", { class: "stat", title: "Giorni di fila" }, icon("flame"), String(streak())), h("span", { class: "stat", title: "Punti esperienza" }, icon("bolt"), String(S.xp))));
    const tabs = h("nav", { class: "tabbar", "aria-label": "Sezioni" },
      ...[["home", "Percorso", "path"], ["ripasso", "Ripasso", "review"], ["profilo", "Profilo", "user"]].map(([k, t, ic]) =>
        h("button", { type: "button", class: "tab" + (k === tab ? " on" : ""), "aria-current": k === tab ? "page" : null, onclick: () => go(k === "home" ? "" : k) }, icon(ic), t)));
    const sc = h("main", { class: "scroll" }, ...content);
    app.replaceChildren(h("div", { class: "screen" }, top, sc, tabs));
    math(sc);
  }

  /* ---------- home ---------- */
  function ring(frac, size, col) {
    const r = size / 2 - 5, c = 2 * Math.PI * r;
    const svg = s("svg", { viewBox: `0 0 ${size} ${size}`, class: "ring", "aria-hidden": "true" });
    svg.append(s("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: "var(--grid)", "stroke-width": 7 }));
    svg.append(s("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: col || "var(--flame)", "stroke-width": 7, "stroke-linecap": "round", "stroke-dasharray": `${c * Math.min(1, frac)} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }));
    return svg;
  }
  function nextLesson() {
    const inprog = LESSONS.find(l => S.lessons[l.n] && !S.lessons[l.n].done && S.lessons[l.n].pos > 0);
    return inprog || LESSONS.find(l => !(S.lessons[l.n] && S.lessons[l.n].done)) || LESSONS[0];
  }
  function homeScreen() {
    const tx = S.days[today()] || 0;
    const goal = h("section", { class: "goalcard" }, ring(tx / S.goal, 58),
      h("div", null, h("h2", null, tx >= S.goal ? "Obiettivo di oggi raggiunto" : "Obiettivo di oggi"), h("p", null, `${tx} di ${S.goal} XP · ${streak()} ${streak() === 1 ? "giorno" : "giorni"} di fila`)));
    const nx = nextLesson(), st = S.lessons[nx.n];
    const deck = buildDeck(nx.n);
    const resume = h("button", { type: "button", class: "resume", onclick: () => go("l-" + nx.n) },
      h("span", { class: "k" }, st && st.pos > 0 ? "Riprendi" : "Prossima lezione"),
      h("span", { class: "t" }, `${nx.n}. ${nx.title}`),
      h("span", { class: "s" }, st && st.pos > 0 ? `Scheda ${st.pos + 1} di ${deck.length}` : `${deck.length} schede · ${deck.filter(c => c.type === "quiz").length} domande`));
    const mods = Object.entries(MODS).map(([k, name]) => {
      const ls = LESSONS.filter(l => l.mod === k);
      const done = ls.filter(l => S.lessons[l.n] && S.lessons[l.n].done).length;
      return h("section", { class: "module" }, h("div", { class: "module-h" }, h("h3", null, name), h("span", null, `${done}/${ls.length}`)),
        h("div", { class: "path" }, ...ls.map(l => {
          const ls_ = S.lessons[l.n] || {}, d = buildDeck(l.n), frac = ls_.done ? 1 : (ls_.pos || 0) / d.length;
          const bub = h("span", { class: "bubble" });
          if (ls_.done) bub.append(icon("check")); else bub.append(String(l.n));
          if (!ls_.done && frac > 0) { const r = ring(frac, 64, "var(--accent)"); r.setAttribute("class", "prog"); bub.append(r); }
          return h("button", { type: "button", class: "node" + (ls_.done ? " done" : "") + (l.n === nx.n && !ls_.done ? " next" : ""), onclick: () => go("l-" + l.n) },
            bub, h("span", null, h("div", { class: "lt" }, l.title), h("div", { class: "ls" }, ls_.done ? "Completata" : `${d.length} schede · ${d.filter(c => c.type === "quiz").length} domande`)));
        })));
    });
    shell("home", [goal, resume, ...mods]);
  }

  /* ---------- player ---------- */
  function player(opt) {
    const isLesson = opt.mode === "lesson";
    const les = isLesson ? byN[opt.n] : null;
    const deck = isLesson ? buildDeck(opt.n) : opt.deck;
    const st = isLesson ? L(opt.n) : { pos: 0 };
    let pos = Math.min(st.pos || 0, deck.length - 1);
    const sess = { xp0: S.xp, right: 0, total: 0, t0: Date.now() };
    const bar = h("i", { style: "width:0%" }), cnt = h("span", { class: "pcount" });
    const body = h("main", { class: "pbody" }), foot = h("footer", { class: "pfoot" });
    const close = h("button", { type: "button", class: "iconbtn", "aria-label": "Chiudi e torna al percorso", onclick: () => go(opt.back || "") }, icon("close"));
    app.replaceChildren(h("div", { class: "player" }, h("header", { class: "phead" }, close, h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": deck.length }, bar), cnt), body, foot));

    function setFoot(...kids) { foot.replaceChildren(...kids); }
    function backBtn() { return h("button", { type: "button", class: "ghost", "aria-label": "Scheda precedente", disabled: pos === 0 ? true : null, onclick: () => { if (pos > 0) { pos--; show(); } } }, icon("back")); }
    function next() {
      if (isLesson) { st.pos = Math.min(pos + 1, deck.length - 1); save(); }
      if (pos < deck.length - 1) { pos++; show(); } else finish();
    }
    function show() {
      bar.style.width = `${(100 * pos) / deck.length}%`;
      cnt.textContent = `${pos + 1}/${deck.length}`;
      const c = deck[pos], el = h("article", { class: "card" });
      if (c.head && !c.head.sub) el.append(h("div", { class: "sec-eyebrow" }, isLesson ? `Lezione ${les.n} · sezione ${c.head.secNo} di ${c.head.secTot}` : "Ripasso"), h("h2", { class: "sec-title", html: c.head.secTitle }));
      if (c.type === "content") renderContent(c, el);
      else if (c.type === "quiz") renderQuiz(c, el);
      else if (c.type === "ex") renderEx(c, el);
      body.replaceChildren(el); body.scrollTop = 0;
      math(el);
    }
    function renderContent(c, el) {
      const box = h("div", { style: "display:grid;gap:14px", html: c.nodes.join("") });
      box.querySelectorAll("[data-w]").forEach(slot => {
        const f = WREG[slot.dataset.w];
        try { slot.replaceWith(f ? f() : h("div", { class: "status bad" }, "Simulatore non disponibile")); }
        catch (e) { slot.replaceWith(h("div", { class: "status bad" }, "Errore nel simulatore: " + e.message)); }
      });
      el.append(...box.childNodes);
      setFoot(h("div", { class: "row" }, backBtn(), h("button", { type: "button", class: "big", onclick: () => { next(); } }, pos === deck.length - 1 ? "Concludi" : "Continua")));
    }
    function renderQuiz(c, el) {
      el.append(h("span", { class: "quiz-tag" }, "Domanda"), h("div", { class: "qtext", html: c.q }));
      let sel = null, done = false;
      const btns = c.opts.map((o, i) => h("button", { type: "button", class: "opt", "aria-pressed": "false", onclick: () => { if (done) return; sel = i; btns.forEach((b, j) => { b.classList.toggle("sel", j === i); b.setAttribute("aria-pressed", j === i ? "true" : "false"); }); check.disabled = false; } },
        h("span", { class: "l" }, "ABCDEF"[i]), h("span", { html: o })));
      const fb = h("div");
      el.append(h("div", { class: "opts" }, ...btns), fb);
      const check = h("button", { type: "button", class: "big", disabled: true, onclick: () => {
        if (done) { next(); return; }
        done = true; sess.total++; S.answered++;
        const ok = sel === c.correct;
        btns.forEach((b, j) => { b.disabled = true; if (j === c.correct) b.classList.add("right"); else if (j === sel) b.classList.add("wrong"); });
        if (ok) { sess.right++; S.correct++; S.wrong = S.wrong.filter(x => x !== c.id); addXP(10, "risposta giusta"); }
        else if (!S.wrong.includes(c.id)) S.wrong.push(c.id);
        save();
        fb.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "bad") }, h("b", null, ok ? "Esatto!" : "Non proprio."), h("div", { html: c.why || "" })));
        math(fb);
        check.textContent = "Continua"; check.className = "big " + (ok ? "ok" : "bad");
        fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } }, "Verifica");
      setFoot(h("div", { class: "row" }, backBtn(), check));
    }
    function renderEx(c, el) {
      const sol = h("div", { class: "sol", hidden: true, html: c.sol });
      el.append(h("div", { class: "ex-box" }, h("span", { class: "lvl" }, "Esercizio · " + (c.lvl || "")), h("div", { style: "display:grid;gap:8px", html: c.body }), sol),
        h("p", { class: "small" }, "Risolvilo su carta prima di guardare la soluzione."));
      const showBtn = h("button", { type: "button", class: "big", onclick: () => {
        sol.hidden = false; math(sol); sol.scrollIntoView({ behavior: "smooth", block: "start" });
        setFoot(h("div", { class: "row", style: "grid-template-columns:1fr 1fr" },
          h("button", { type: "button", class: "ghost", onclick: () => { if (!S.exReview.includes(c.id)) S.exReview.push(c.id); save(); toast("Aggiunto al ripasso"); next(); } }, "Da rivedere"),
          h("button", { type: "button", class: "big ok", onclick: () => { S.exReview = S.exReview.filter(x => x !== c.id); addXP(15, "esercizio"); next(); } }, "L'ho risolto")));
      } }, "Mostra la soluzione");
      setFoot(h("div", { class: "row" }, backBtn(), showBtn), h("button", { type: "button", class: "ghost", onclick: next }, "Salta per ora"));
    }
    function finish() {
      let bonus = 0;
      if (isLesson) { if (!st.done) bonus = 30; st.done = true; st.pos = 0; save(); if (bonus) addXP(bonus, "lezione completata"); }
      const gained = S.xp - sess.xp0, mins = Math.max(1, Math.round((Date.now() - sess.t0) / 60000));
      bar.style.width = "100%"; cnt.textContent = `${deck.length}/${deck.length}`;
      const medal = s("svg", { viewBox: "0 0 120 120", class: "medal", "aria-hidden": "true" });
      medal.innerHTML = '<circle cx="60" cy="60" r="54" fill="var(--ok-soft)"/><circle cx="60" cy="60" r="40" fill="var(--ok)"/><path d="M42 61l12 12 25-27" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';
      body.replaceChildren(h("section", { class: "finish" }, medal,
        h("h2", null, isLesson ? "Lezione completata" : "Ripasso completato"),
        h("p", { class: "small" }, isLesson ? `${les.n}. ${les.title}` : "Le domande indovinate escono dal ripasso"),
        h("div", { class: "kpis" }, h("div", { class: "kpi" }, h("b", null, "+" + gained), h("span", null, "XP")), h("div", { class: "kpi" }, h("b", null, sess.total ? `${sess.right}/${sess.total}` : "–"), h("span", null, "risposte giuste")), h("div", { class: "kpi" }, h("b", null, String(mins)), h("span", null, mins === 1 ? "minuto" : "minuti")))));
      const nx = isLesson ? LESSONS[LESSONS.indexOf(les) + 1] : null;
      setFoot(nx ? h("button", { type: "button", class: "big", onclick: () => go("l-" + nx.n) }, `Prossima: ${nx.n}. ${nx.title}`) : null,
        h("button", { type: "button", class: "ghost", onclick: () => go(opt.back || "") }, isLesson ? "Torna al percorso" : "Torna al ripasso"));
    }
    show();
  }

  /* ---------- ripasso ---------- */
  function quizById(id) { const [n, i] = id.split("-").map(Number); const q = (QUIZ_DATA[n] || [])[i]; return q ? { type: "quiz", ...q, id, head: { secTitle: `Dalla lezione ${n}`, secNo: 1, secTot: 1 } } : null; }
  function exById(id) { const n = +id.split("-")[0]; return buildDeck(n).find(c => c.id === id); }
  function reviewScreen() {
    const qs = S.wrong.map(quizById).filter(Boolean), exs = S.exReview.map(exById).filter(Boolean);
    const p1 = h("section", { class: "panel" }, h("h2", null, "Domande da ripassare"),
      h("p", { class: "small" }, qs.length ? `${qs.length} domande che hai sbagliato. Quando rispondi giusto escono dalla lista.` : "Nessuna domanda sbagliata in sospeso. Ottimo lavoro."),
      qs.length ? h("button", { type: "button", class: "big", onclick: () => player({ mode: "review", back: "ripasso", deck: shuffle(qs).slice(0, 10) }) }, `Ripassa ${Math.min(10, qs.length)} domande`) : null);
    const p2 = h("section", { class: "panel" }, h("h2", null, "Esercizi da rivedere"),
      h("p", { class: "small" }, exs.length ? "Gli esercizi che hai segnato «da rivedere». Tocca per riprovare." : "Nessun esercizio segnato da rivedere."),
      h("div", { class: "list" }, ...exs.map(c => { const n = +c.id.split("-")[0]; const tmp = h("div", { html: c.body }); return h("button", { type: "button", class: "li", style: "text-align:left;cursor:pointer;color:var(--ink)", onclick: () => player({ mode: "review", back: "ripasso", deck: [{ ...c, head: { secTitle: byN[n].title, secNo: 1, secTot: 1 } }] }) }, h("span", { class: "m" }, `Lezione ${n} · ${c.lvl}`), h("span", { html: c.body.length > 260 ? tmp.textContent.slice(0, 160) + "…" : c.body })); })));
    const all = LESSONS.flatMap(l => (QUIZ_DATA[l.n] || []).map((q, i) => `${l.n}-${i}`));
    const p3 = h("section", { class: "panel" }, h("h2", null, "Allenamento misto"), h("p", { class: "small" }, "Dieci domande a caso dalle lezioni che hai completato (o da tutto il corso, se non ne hai ancora completate)."),
      h("button", { type: "button", class: "ghost", onclick: () => {
        const doneN = new Set(LESSONS.filter(l => S.lessons[l.n] && S.lessons[l.n].done).map(l => l.n));
        const pool = all.filter(id => !doneN.size || doneN.has(+id.split("-")[0]));
        player({ mode: "review", back: "ripasso", deck: shuffle(pool).slice(0, 10).map(quizById) });
      } }, "Inizia l'allenamento"));
    shell("ripasso", [p1, p3, p2]);
  }
  function shuffle(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]); }

  /* ---------- profilo ---------- */
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });
  function profileScreen() {
    const doneN = LESSONS.filter(l => S.lessons[l.n] && S.lessons[l.n].done).length;
    const week = h("div", { class: "week" });
    const names = ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"];
    for (let k = 6; k >= 0; k--) { const d = new Date(); d.setDate(d.getDate() - k); week.append(h("div", { class: "day" + (S.days[dkey(d)] ? " on" : "") + (k === 0 ? " today" : "") }, h("i"), names[d.getDay()])); }
    const p1 = h("section", { class: "panel" }, h("h2", null, "I tuoi progressi"),
      h("div", { class: "kpis" }, h("div", { class: "kpi" }, h("b", null, String(S.xp)), h("span", null, "XP totali")), h("div", { class: "kpi" }, h("b", null, String(streak())), h("span", null, "giorni di fila")), h("div", { class: "kpi" }, h("b", null, `${doneN}/${LESSONS.length}`), h("span", null, "lezioni"))),
      h("p", { class: "small" }, S.answered ? `Risposte giuste: ${S.correct} su ${S.answered} (${Math.round(100 * S.correct / S.answered)}%)` : "Ancora nessuna domanda risposta."), week);
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Obiettivo giornaliero" }, ...[20, 50, 100].map(g => h("button", { type: "button", class: g === S.goal ? "on" : "", onclick: () => { S.goal = g; save(); profileScreen(); } }, `${g} XP`)));
    const p2 = h("section", { class: "panel" }, h("h2", null, "Obiettivo giornaliero"), h("p", { class: "small" }, "Circa 10 XP ogni domanda giusta, 15 per un esercizio, 30 per una lezione completata."), seg);
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const p3 = h("section", { class: "panel" }, h("h2", null, "Installa l'app"),
      h("p", { class: "small" }, standalone ? "Stai già usando l'app installata. Funziona anche offline." : "Su Android: menu di Chrome → «Installa app». Su iPhone: Safari → Condividi → «Aggiungi alla schermata Home». Una volta installata funziona anche senza connessione."),
      !standalone ? h("button", { type: "button", class: "ghost", onclick: async () => { if (installEvt) { installEvt.prompt(); installEvt = null; } else toast("Usa il menu del browser per installare"); } }, "Installa") : null);
    const confirmBox = h("div");
    const p4 = h("section", { class: "panel" }, h("h2", null, "Dati"), h("p", { class: "small" }, "I progressi sono salvati solo su questo dispositivo."),
      h("button", { type: "button", class: "ghost", style: "color:var(--bad)", onclick: () => {
        confirmBox.replaceChildren(h("div", { class: "feedback bad" }, h("b", null, "Cancellare tutti i progressi?"), h("div", { class: "row", style: "display:grid;grid-template-columns:1fr 1fr;gap:8px" },
          h("button", { type: "button", class: "ghost", onclick: () => confirmBox.replaceChildren() }, "Annulla"),
          h("button", { type: "button", class: "big bad", onclick: () => { S = fresh(); save(); profileScreen(); toast("Progressi azzerati"); } }, "Cancella"))));
      } }, "Azzera i progressi"), confirmBox);
    shell("profilo", [p1, p2, p3, p4]);
  }

  /* ---------- avvio ---------- */
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js").catch(() => { }); } catch (e) { } }
  route();
})();
