/* widgets.js — componenti interattivi riutilizzabili. Ogni funzione W.x(...) restituisce un elemento DOM. */
"use strict";
const W = {};

/* ---------- Simulatore di DFA / NFA ---------- */
W.automaton = function (spec, opt) {
  opt = opt || {};
  const nfa = buildNFA(spec);
  const B = bench(opt.title || "Simulatore", opt.hint || "Scrivi una stringa e avanza un simbolo alla volta");
  const input = h("input", { type: "text", value: opt.input || "", "aria-label": "Stringa in input", size: 16 });
  const svgBox = h("div", { class: "svgwrap" });
  const tape = h("div", { class: "tape" });
  const status = h("div", { class: "status" });
  let w = "", pos = 0, S = new Set(), lastE = new Set(), timer = null;
  function render() {
    svgBox.replaceChildren(drawAutomaton(spec, { states: S, edges: lastE }));
    tape.replaceChildren(...(w.length ? w.split("").map((c, i) => h("div", { class: "c" + (i < pos ? " read" : "") + (i === pos ? " cur" : "") }, c)) : [h("div", { class: "c cur" }, "ε")]));
    const lab = {}; spec.states.forEach(x => lab[x.id] = x.label != null ? x.label : x.id);
    const set = "{" + [...S].map(q => lab[q] === "" ? "∅" : lab[q]).join(", ") + "}";
    if (pos >= w.length) {
      const ok = [...S].some(q => nfa.acc.has(q));
      status.className = "status " + (ok ? "ok" : "bad");
      status.textContent = (ok ? "Accettata" : "Rifiutata") + ` · stringa letta tutta, stati finali ${set}` + (ok ? " (almeno uno è di accettazione)" : (S.size ? " (nessuno è di accettazione)" : " (tutti i rami sono morti)"));
    } else {
      status.className = "status";
      status.textContent = `Letti ${pos} simboli su ${w.length} · stati correnti ${set}` + (S.size === 0 ? " · nessun ramo attivo, la stringa sarà rifiutata" : "");
    }
  }
  function reset() { stop(); w = input.value.trim(); pos = 0; S = nfa.eclose(new Set([spec.start])); lastE = new Set(); render(); }
  function step() {
    if (pos >= w.length) return false;
    const a = w[pos], nxt = nfa.move(S, a);
    lastE = new Set();
    for (const q of S) for (const r of (nfa.delta[q][a] || [])) lastE.add(q + "→" + r);
    S = nfa.eclose(nxt); pos++; render(); return pos < w.length;
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  function run() { reset(); timer = setInterval(() => { if (!step()) stop(); }, 650); }
  input.addEventListener("change", reset);
  input.addEventListener("keydown", e => { if (e.key === "Enter") reset(); });
  B.body.append(
    h("div", { class: "controls" }, h("label", null, "Input"), input, btn("Ricomincia", reset), btn("Passo", step, "primary"), btn("Esegui tutto", run)),
    svgBox, tape, status);
  if (opt.tests) {
    const tIn = h("input", { type: "text", value: opt.tests, size: 34, "aria-label": "Stringhe da provare separate da virgola" });
    const out = h("div", { class: "pills" });
    const test = () => out.replaceChildren(...parseList(tIn.value).map(x => h("span", { class: "pill " + (nfa.accepts(x) ? "yes" : "no") }, epsShow(x) + (nfa.accepts(x) ? " ✓" : " ✗"))));
    B.body.append(h("div", { class: "controls" }, h("label", null, "Prova più stringhe"), tIn, btn("Verifica", test)), out);
    test();
  }
  reset();
  return B.el;
};

/* ---------- Macchina di Mealy ---------- */
W.mealy = function (spec, opt) {
  opt = opt || {};
  const delta = {};
  for (const e of spec.edges) for (const part of e.label.split(",")) {
    const [a, o] = part.trim().split("/");
    (delta[e.from] = delta[e.from] || {})[a] = { to: e.to, out: o };
  }
  const B = bench(opt.title || "Macchina di Mealy", "Ogni transizione legge un simbolo e ne scrive uno in uscita");
  const input = h("input", { type: "text", value: opt.input || "", size: 16, "aria-label": "Input" });
  const svgBox = h("div", { class: "svgwrap" }), tape = h("div", { class: "tape" }), outT = h("div", { class: "tape" }), status = h("div", { class: "status" });
  let w = "", pos = 0, q = spec.start, out = "", last = new Set();
  function render() {
    svgBox.replaceChildren(drawAutomaton(spec, { states: new Set([q]), edges: last }));
    tape.replaceChildren(h("span", { class: "small" }, "in "), ...w.split("").map((c, i) => h("div", { class: "c" + (i < pos ? " read" : "") + (i === pos ? " cur" : "") }, c)));
    outT.replaceChildren(h("span", { class: "small" }, "out"), ...out.split("").map(c => h("div", { class: "c" }, c)));
    status.className = "status"; status.textContent = pos >= w.length ? `Fine: uscita prodotta «${out || "ε"}»` : `Stato ${q}, prossimo simbolo ${w[pos]}`;
  }
  function reset() { w = input.value.trim(); pos = 0; q = spec.start; out = ""; last = new Set(); render(); }
  function step() {
    if (pos >= w.length) return;
    const t = (delta[q] || {})[w[pos]];
    if (!t) { status.textContent = "Nessuna transizione definita"; return; }
    last = new Set([q + "→" + t.to]); out += t.out; q = t.to; pos++; render();
  }
  input.addEventListener("change", reset);
  B.body.append(h("div", { class: "controls" }, h("label", null, "Input"), input, btn("Ricomincia", reset), btn("Passo", step, "primary"), btn("Esegui tutto", () => { reset(); while (pos < w.length) step(); })), svgBox, tape, outT, status);
  reset();
  return B.el;
};

/* ---------- Costruzione per sottoinsiemi ---------- */
W.subset = function (spec, alphabet, opt) {
  opt = opt || {};
  const rows = subsetConstruction(spec, alphabet);
  const B = bench(opt.title || "Da NFA a DFA: costruzione per sottoinsiemi", "Clicca «Aggiungi riga» per costruire la tabella un passo alla volta");
  const svgN = h("div", { class: "svgwrap" }, drawAutomaton(spec));
  const tblBox = h("div", { class: "tblwrap" });
  const dfaBox = h("div");
  let shown = 1;
  function render() {
    const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, "Stato del DFA"), ...alphabet.map(a => h("th", null, a)), h("th", null, "accetta?")));
    rows.slice(0, shown).forEach((r, i) => tb.append(h("tr", null, h("td", { class: i === shown - 1 ? "hl" : null }, r.name), ...alphabet.map(a => h("td", null, r.to[a])), h("td", null, r.accept ? "sì" : "no"))));
    tblBox.replaceChildren(tb);
    if (shown >= rows.length) {
      const names = rows.map(r => r.name);
      const W2 = Math.max(420, 140 * Math.min(names.length, 5)), H2 = names.length > 2 ? 340 : 200;
      const states = circleLayout(names, W2, H2).map((p, i) => ({ ...p, label: rows[i].name === "{}" ? "∅" : rows[i].name.replace(/[{}]/g, ""), accept: rows[i].accept }));
      const edges = [];
      rows.forEach(r => alphabet.forEach(a => edges.push({ from: r.name, to: r.to[a], label: a })));
      const dspec = { w: W2, h: H2, start: names[0], states, edges, r: 26 };
      dfaBox.replaceChildren(W.automaton(dspec, { title: "DFA risultante", hint: "Etichetta di ogni stato = insieme di stati dell'NFA", input: opt.input || "", tests: opt.tests }));
    } else dfaBox.replaceChildren(h("div", { class: "status" }, `Righe costruite: ${shown} di ${rows.length}. Ogni nuovo insieme che compare nelle colonne diventa una nuova riga.`));
  }
  B.body.append(h("div", { class: "small" }, "NFA di partenza"), svgN,
    h("div", { class: "controls" }, btn("Aggiungi riga", () => { if (shown < rows.length) { shown++; render(); } }, "primary"), btn("Completa", () => { shown = rows.length; render(); }), btn("Ricomincia", () => { shown = 1; render(); })),
    tblBox, dfaBox);
  render();
  return B.el;
};

/* ---------- Costruzione del prodotto ---------- */
W.product = function (A, Bs, alphabet, opt) {
  opt = opt || {};
  const B = bench("Costruzione del prodotto", "Gli stati sono coppie (stato di M₁, stato di M₂) che avanzano in parallelo");
  const seg = h("div", { class: "seg", role: "group", "aria-label": "Operazione" });
  const box = h("div");
  const na = buildNFA(A), nb = buildNFA(Bs);
  let op = "∩";
  function build() {
    const start = A.start + Bs.start, seen = { [start]: [A.start, Bs.start] }, order = [start], edges = [];
    for (let i = 0; i < order.length; i++) {
      const [p, q] = seen[order[i]];
      for (const a of alphabet) {
        const p2 = (na.delta[p][a] || [])[0], q2 = (nb.delta[q][a] || [])[0];
        const k = p2 + q2;
        if (!(k in seen)) { seen[k] = [p2, q2]; order.push(k); }
        edges.push({ from: order[i], to: k, label: a });
      }
    }
    const states = circleLayout(order, 460, 320).map(pt => {
      const [p, q] = seen[pt.id], fa = na.acc.has(p), fb = nb.acc.has(q);
      return { ...pt, label: p + "," + q, accept: op === "∩" ? fa && fb : fa || fb };
    });
    box.replaceChildren(W.automaton({ w: 460, h: 320, start, states, edges, r: 26 }, { title: `M₁ ${op} M₂`, hint: op === "∩" ? "Accetta se entrambe le componenti accettano" : "Accetta se almeno una componente accetta", tests: opt.tests }));
    seg.replaceChildren(...["∩", "∪"].map(o => h("button", { type: "button", class: o === op ? "on" : "", onclick: () => { op = o; build(); } }, o === "∩" ? "Intersezione" : "Unione")));
  }
  B.body.append(h("div", { class: "cols" }, h("div", null, h("div", { class: "small" }, opt.nameA || "M₁"), h("div", { class: "svgwrap" }, drawAutomaton(A))), h("div", null, h("div", { class: "small" }, opt.nameB || "M₂"), h("div", { class: "svgwrap" }, drawAutomaton(Bs)))),
    h("div", { class: "controls" }, h("label", null, "Operazione"), seg), box);
  build();
  return B.el;
};

/* ---------- Espressioni regolari: linguaggio generato ---------- */
W.regex = function (opt) {
  opt = opt || {};
  const B = bench("Laboratorio di espressioni regolari", "Sintassi: ∪ oppure | per l'unione, * per la stella, ε, ∅, parentesi");
  const re = h("input", { type: "text", value: opt.regex || "(0∪1)*01", size: 26, "aria-label": "Espressione regolare" });
  const alpha = h("input", { type: "text", value: opt.alphabet || "0,1", size: 6, "aria-label": "Alfabeto" });
  const n = h("input", { type: "number", value: opt.maxLen || 4, min: 0, max: 8, "aria-label": "Lunghezza massima" });
  const out = h("div", { class: "pills" }), status = h("div", { class: "status" });
  function go() {
    let src = re.value.trim();
    const al = parseList(alpha.value);
    if (!/^[\w()|∪+*εΕ∅ ]*$/.test(src)) { status.className = "status bad"; status.textContent = "Carattere non ammesso nell'espressione"; return; }
    const js = src.replace(/\s+/g, "").replace(/[∪+]/g, "|").replace(/ε/g, "(?:)").replace(/∅/g, "(?!)");
    let rx;
    try { rx = new RegExp("^(?:" + js + ")$"); } catch (e) { status.className = "status bad"; status.textContent = "Espressione non ben formata: controlla le parentesi"; return; }
    const all = shortlex(al, Math.min(8, +n.value || 0));
    const yes = all.filter(w => rx.test(w));
    status.className = "status";
    status.textContent = `${yes.length} stringhe su ${all.length} di lunghezza ≤ ${n.value} appartengono al linguaggio (in ordine per lunghezza)`;
    out.replaceChildren(...yes.slice(0, 120).map(w => h("span", { class: "pill" }, epsShow(w))));
  }
  [re, alpha, n].forEach(x => x.addEventListener("input", go));
  B.body.append(h("div", { class: "controls" }, h("label", null, "R ="), re, h("label", null, "Σ"), alpha, h("label", null, "lunghezza ≤"), n), status, out);
  go();
  return B.el;
};

/* ---------- Gioco del pumping lemma ---------- */
W.pumping = function (mode) {
  const regular = mode !== "cf";
  const cnt = (w, c) => w.split(c).length - 1;
  const langs = regular ? [
    { name: "{0ⁿ1ⁿ : n ≥ 0}", inL: w => /^0*1*$/.test(w) && cnt(w, "0") === cnt(w, "1"), hint: "0ᵖ1ᵖ" },
    { name: "{w : #0(w) = #1(w)}", inL: w => /^[01]*$/.test(w) && cnt(w, "0") === cnt(w, "1"), hint: "0ᵖ1ᵖ" },
    { name: "{0ⁿ1ᵐ : n > m}", inL: w => /^0*1*$/.test(w) && cnt(w, "0") > cnt(w, "1"), hint: "0ᵖ⁺¹1ᵖ e prova i = 0" },
    { name: "(01)* — regolare!", inL: w => /^(01)*$/.test(w), hint: "qui l'avversario vince sempre" }
  ] : [
    { name: "{aⁿbⁿcⁿ : n ≥ 0}", inL: w => /^a*b*c*$/.test(w) && cnt(w, "a") === cnt(w, "b") && cnt(w, "b") === cnt(w, "c"), hint: "aᵖbᵖcᵖ" },
    { name: "{ww : w ∈ {a,b}*}", inL: w => /^[ab]*$/.test(w) && w.length % 2 === 0 && w.slice(0, w.length / 2) === w.slice(w.length / 2), hint: "aᵖbᵖaᵖbᵖ" },
    { name: "{aⁿbⁿ} — context-free!", inL: w => /^a*b*$/.test(w) && cnt(w, "a") === cnt(w, "b"), hint: "qui l'avversario vince sempre" }
  ];
  const B = bench(regular ? "Il gioco del pumping lemma (regolari)" : "Il gioco del pumping lemma (context-free)", "Tu vuoi dimostrare che L NON è " + (regular ? "regolare" : "context-free") + "; l'avversario difende il contrario");
  const sel = h("select", { "aria-label": "Linguaggio" }, ...langs.map((l, i) => h("option", { value: i }, l.name)));
  const area = h("div", { style: "display:grid;gap:10px" });
  let L, p, sStr, dec;
  function colored(parts, names) {
    const cls = ["", "on", "", "on", ""];
    return h("div", { class: "tape" }, ...parts.flatMap((part, k) => part.split("").map(c => h("div", { class: "c", title: names[k], style: (regular ? k === 1 : (k === 1 || k === 3)) ? "background:var(--mark-soft);border-color:var(--mark)" : "" }, c))), h("span", { class: "small", style: "align-self:center;margin-left:8px" }, names.map((nm, k) => `${nm}=${epsShow(parts[k])}`).join("  ")));
  }
  function decomps(w) {
    const out = [];
    if (regular) {
      for (let i = 0; i <= p; i++) for (let j = i + 1; j <= Math.min(p, w.length); j++) out.push([w.slice(0, i), w.slice(i, j), w.slice(j)]);
    } else {
      const n = w.length;
      for (let a = 0; a <= n; a++) for (let b = a; b <= n; b++) for (let c = b; c <= n; c++) for (let d = c; d <= n; d++) {
        if (d - a > p || (b - a) + (d - c) < 1) continue;
        out.push([w.slice(0, a), w.slice(a, b), w.slice(b, c), w.slice(c, d), w.slice(d)]);
      }
    }
    return out;
  }
  const pump = (parts, i) => regular ? parts[0] + parts[1].repeat(i) + parts[2] : parts[0] + parts[1].repeat(i) + parts[2] + parts[3].repeat(i) + parts[4];
  const resists = parts => [0, 1, 2, 3].every(i => L.inL(pump(parts, i)));
  function start() {
    L = langs[+sel.value]; p = 3 + Math.floor(Math.random() * 3);
    const sIn = h("input", { type: "text", size: 22, "aria-label": "Stringa s", placeholder: "suggerimento: " + L.hint });
    const msg = h("div", { class: "status" }, `L'avversario sceglie la lunghezza di pumping p = ${p}. Ora scegli s ∈ L con |s| ≥ ${p}.`);
    area.replaceChildren(msg, h("div", { class: "controls" }, h("label", null, "s ="), sIn, btn("Gioca s", () => {
      const v = sIn.value.trim();
      if (!L.inL(v)) { msg.className = "status bad"; msg.textContent = "s deve appartenere a L."; return; }
      if (v.length < p) { msg.className = "status bad"; msg.textContent = `s deve avere lunghezza almeno ${p}.`; return; }
      sStr = v; phase2();
    }, "primary")));
  }
  function phase2() {
    const all = decomps(sStr);
    const good = all.filter(resists);
    dec = good.length ? good[0] : all[Math.floor(Math.random() * all.length)];
    const names = regular ? ["x", "y", "z"] : ["u", "v", "x", "y", "z"];
    const res = h("div", { class: "status" });
    const iIn = h("input", { type: "number", min: 0, max: 6, value: 0, "aria-label": "Esponente i" });
    const listBox = h("div");
    area.replaceChildren(
      h("div", { class: "status" }, `L'avversario divide s rispettando i vincoli (${regular ? "|xy| ≤ p, |y| ≥ 1" : "|vxy| ≤ p, |vy| ≥ 1"}):`),
      colored(dec, names),
      h("div", { class: "controls" }, h("label", null, "Scegli i ="), iIn, btn("Pompa", () => {
        const i = +iIn.value, w = pump(dec, i), ok = L.inL(w);
        res.className = "status " + (ok ? "bad" : "ok");
        res.textContent = `${regular ? "xyⁱz" : "uvⁱxyⁱz"} con i=${i}: «${epsShow(w)}» ${ok ? "∈ L: questa i non basta, prova un'altra" : "∉ L: hai battuto questa scomposizione!"}`;
      }, "primary"), btn("Nuova partita", start)),
      res,
      h("details", null, h("summary", null, `Una dimostrazione vale solo se vinci contro TUTTE le ${all.length} scomposizioni ammesse: verificale`),
        listBox));
    listBox.append(h("div", { class: "small" }, good.length ? `${good.length} scomposizioni resistono a i = 0…3: con questa s non puoi vincere. Cambia s!` : "Nessuna scomposizione resiste: con questa s la dimostrazione funziona."),
      ...all.slice(0, 40).map(d => { const r = resists(d); return h("div", { class: "pills", style: "margin:3px 0" }, h("span", { class: "pill " + (r ? "no" : "yes") }, d.map((x, k) => names[k] + "=" + epsShow(x)).join(" ") + (r ? " resiste" : " battuta"))); }));
  }
  sel.addEventListener("change", start);
  B.body.append(h("div", { class: "controls" }, h("label", null, "Linguaggio"), sel, btn("Nuova partita", start)), area);
  start();
  return B.el;
};

/* ---------- Grammatiche CF: derivazione guidata + albero + generatore ---------- */
W.cfg = function (opt) {
  opt = opt || {};
  const B = bench(opt.title || "Derivazioni e alberi sintattici", "Clicca una regola: si espande la variabile più a sinistra (derivazione sinistra)");
  const ta = h("textarea", { "aria-label": "Grammatica", spellcheck: "false" }, opt.grammar || "S -> aSb | ε");
  const formBox = h("div", { class: "log" }), ruleBox = h("div", { class: "controls" }), treeBox = h("div", { class: "svgwrap" }), genBox = h("div", { class: "pills" }), status = h("div", { class: "status" });
  let g, tree, deriv;
  function leaves(n, acc) { if (!n.kids) acc.push(n); else n.kids.forEach(k => leaves(k, acc)); return acc; }
  function frontier() { return leaves(tree, []).map(n => n.sym).join(""); }
  function load() {
    try { g = parseCFG(ta.value); } catch (e) { status.className = "status bad"; status.textContent = e.message; return; }
    status.className = "status"; status.textContent = "Grammatica caricata. Variabile iniziale: " + g.start;
    tree = { sym: g.start }; deriv = [g.start]; render();
    const gen = cfgGenerate(g, opt.genLen || 6);
    genBox.replaceChildren(h("span", { class: "small" }, `Stringhe generate di lunghezza ≤ ${opt.genLen || 6}:`), ...gen.slice(0, 60).map(w => h("span", { class: "pill" }, epsShow(w))));
  }
  function render() {
    formBox.textContent = deriv.map(epsShow).join("  ⇒  ");
    const lv = leaves(tree, []), target = lv.find(n => isVar(n.sym));
    ruleBox.replaceChildren(...(target ? (g.rules[target.sym] || []).map(alt => btn(`${target.sym} → ${epsShow(alt)}`, () => {
      target.kids = alt === "" ? [{ sym: "ε", eps: true }] : alt.split("").map(c => ({ sym: c }));
      deriv.push(frontier().replace(/ε/g, "")); render();
    })) : [h("span", { class: "small" }, "Derivazione completa: la stringa contiene solo terminali.")]), btn("Ricomincia", () => { tree = { sym: g.start }; deriv = [g.start]; render(); }));
    treeBox.replaceChildren(drawTree(tree));
  }
  function drawTree(root) {
    let leafX = 0; const nodes = [];
    (function lay(n, d) {
      n.d = d;
      if (!n.kids) { n.x = leafX++; } else { n.kids.forEach(k => lay(k, d + 1)); n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; }
      nodes.push(n);
    })(root, 0);
    const depth = Math.max(...nodes.map(n => n.d));
    const Wd = Math.max(200, leafX * 46 + 40), Hd = depth * 56 + 50;
    const svg = s("svg", { viewBox: `0 0 ${Wd} ${Hd}`, width: Wd, height: Hd, role: "img", "aria-label": "Albero sintattico" });
    const X = n => 20 + n.x * 46 + 13, Y = n => 25 + n.d * 56;
    nodes.forEach(n => (n.kids || []).forEach(k => svg.append(s("line", { x1: X(n), y1: Y(n) + 10, x2: X(k), y2: Y(k) - 12, stroke: "var(--muted)", "stroke-width": 1.4 }))));
    nodes.forEach(n => {
      const v = isVar(n.sym);
      svg.append(s("circle", { cx: X(n), cy: Y(n), r: 13, fill: v ? "var(--accent-soft)" : "var(--surface)", stroke: v ? "var(--accent)" : "var(--line)" }));
      svg.append(s("text", { x: X(n), y: Y(n) + 5, class: "svgmono", "text-anchor": "middle" }, n.sym));
    });
    return svg;
  }
  B.body.append(h("div", { class: "cols" }, h("div", null, h("label", { class: "small" }, "Grammatica (una regola per riga)"), ta, h("div", { class: "controls" }, btn("Carica grammatica", load, "primary"))), h("div", null, status, genBox)),
    h("div", { class: "small" }, "Derivazione"), formBox, ruleBox, treeBox);
  load();
  return B.el;
};

/* ---------- PDA non deterministico ---------- */
W.pda = function (pda, opt) {
  opt = opt || {};
  const B = bench(opt.title || "Simulatore di automa a pila", "Etichette «a, X → Y»: leggi a, togli X dalla cima, metti Y (ε = niente)");
  const input = h("input", { type: "text", value: opt.input || "", size: 16, "aria-label": "Input" });
  const svgBox = h("div", { class: "svgwrap" }), confBox = h("div", { class: "tblwrap" }), status = h("div", { class: "status" });
  let w = "", hist = [], k = 0;
  const label = t => `${t.read || "ε"}, ${t.pop || "ε"} → ${t.push || "ε"}`;
  const spec = { ...pda.draw, start: pda.start, edges: pda.trans.map(t => ({ from: t.from, to: t.to, label: label(t), bend: t.bend, loop: t.loop })), sep: "\n" };
  function accIn(confs) { return confs.find(c => c.i === w.length && pda.accept.includes(c.q)); }
  function render() {
    const confs = hist[k] || [];
    const S = new Set(confs.map(c => c.q));
    const svg = drawAutomaton({ ...spec, sep: " | " }, { states: S });
    svgBox.replaceChildren(svg);
    const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, "ramo"), h("th", null, "stato"), h("th", null, "input rimasto"), h("th", null, "pila (cima a sinistra)")));
    confs.slice(0, 12).forEach((c, i) => tb.append(h("tr", null, h("td", null, i + 1), h("td", { class: pda.accept.includes(c.q) && c.i === w.length ? "hl" : null }, c.q), h("td", null, epsShow(w.slice(c.i))), h("td", null, c.st.length ? c.st.slice().reverse().join("") : "ε"))));
    confBox.replaceChildren(tb);
    const found = hist.slice(0, k + 1).some(accIn);
    const finished = !hist[k + 1] || !hist[k + 1].length;
    if (found) { status.className = "status ok"; status.textContent = `Accettata: un ramo ha letto tutto l'input ed è in uno stato di accettazione (passo ${hist.findIndex(accIn)})`; }
    else if (finished) { status.className = "status bad"; status.textContent = "Rifiutata: nessun ramo può proseguire e nessuno ha accettato"; }
    else { status.className = "status"; status.textContent = `Passo ${k} · rami attivi: ${confs.length}${confs.length > 12 ? " (ne mostro 12)" : ""}`; }
  }
  function reset() { w = input.value.trim(); hist = pdaRun(pda, w, w.length * 3 + 8); k = 0; render(); }
  input.addEventListener("change", reset);
  B.body.append(h("div", { class: "controls" }, h("label", null, "Input"), input, btn("Ricomincia", reset), btn("Passo", () => { if (k < hist.length - 1 && hist[k + 1].length) { k++; render(); } }, "primary"), btn("Fino alla fine", () => { while (k < hist.length - 1 && hist[k + 1].length && !hist.slice(0, k + 1).some(accIn)) k++; render(); })),
    svgBox, confBox, status);
  reset();
  return B.el;
};

/* ---------- Macchina di Turing ---------- */
W.tm = function (tm, opt) {
  opt = opt || {};
  const B = bench(opt.title || "Simulatore di macchina di Turing", "«_» è il simbolo blank. In basso vedi la configurazione u q v come nel Sipser");
  const input = h("input", { type: "text", value: opt.input || "", size: 16, "aria-label": "Input" });
  const tapeBox = h("div", { class: "tape" }), status = h("div", { class: "status" }), tblBox = h("div", { class: "tblwrap" }), log = h("div", { class: "log" });
  let c, timer = null;
  const keys = Object.keys(tm.delta);
  function confStr() {
    const idx = Object.keys(c.tape).map(Number);
    const hi = Math.max(c.head, ...idx, 0);
    let u = "", v = "";
    for (let i = 0; i <= hi; i++) { const ch = c.tape[i] != null ? c.tape[i] : "_"; if (i < c.head) u += ch; else v += ch; }
    return u + " " + c.q + " " + v.replace(/_+$/, "") ;
  }
  function render() {
    const idx = Object.keys(c.tape).map(Number);
    const hi = Math.max(c.head + 3, ...idx.map(i => i + 2), 8);
    const cells = [];
    for (let i = 0; i <= hi; i++) cells.push(h("div", { class: "c" + (i === c.head ? " cur" : "") }, c.tape[i] != null ? c.tape[i] : "_"));
    tapeBox.replaceChildren(...cells);
    const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, "stato, letto"), h("th", null, "scrivi"), h("th", null, "muovi"), h("th", null, "nuovo stato")));
    keys.forEach(kk => { const t = tm.delta[kk]; tb.append(h("tr", null, h("td", { class: kk === c.lastRule ? "hl" : null }, kk.replace(",", ", ")), h("td", null, t[0]), h("td", null, t[1]), h("td", null, t[2]))); });
    tblBox.replaceChildren(tb);
    if (c.halted === "accept") { status.className = "status ok"; status.textContent = `Accetta dopo ${c.steps} passi`; }
    else if (c.halted === "reject") { status.className = "status bad"; status.textContent = `Rifiuta dopo ${c.steps} passi`; }
    else if (c.halted === "halt") { status.className = "status ok"; status.textContent = `Si ferma dopo ${c.steps} passi: il risultato è sul nastro`; }
    else { status.className = "status"; status.textContent = `Stato ${c.q} · passo ${c.steps}`; }
  }
  function reset() { stop(); c = tmInit(tm, input.value.trim()); log.textContent = confStr(); render(); }
  function step() { if (c.halted) return false; tmStep(tm, c); log.textContent += "\n⊢ " + confStr(); log.scrollTop = 1e6; render(); return !c.halted && c.steps < 2000; }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  input.addEventListener("change", reset);
  B.body.append(h("div", { class: "controls" }, h("label", null, "Input"), input, btn("Ricomincia", reset), btn("Passo", step, "primary"), btn("Esegui", () => { stop(); timer = setInterval(() => { if (!step()) stop(); }, 220); }), btn("Pausa", stop)),
    tapeBox, status, h("div", { class: "cols" }, tblBox, h("div", null, h("div", { class: "small" }, "Sequenza di configurazioni"), log)));
  reset();
  return B.el;
};

/* ---------- Interprete del linguaggio S ---------- */
W.sprog = function (opt) {
  opt = opt || {};
  const B = bench(opt.title || "Interprete del linguaggio S", "Istruzioni: V ← V + 1, V ← V - 1, IF V ≠ 0 GOTO L. Etichette tra [ ]. X = X1, Z = Z1");
  const ex = opt.examples || null, exKeys = ex ? Object.keys(ex) : [];
  const ta = h("textarea", { "aria-label": "Programma S", spellcheck: "false", style: "min-height:160px" }, ex ? ex[exKeys[0]].src : (opt.src || ""));
  const inp = h("input", { type: "text", value: ex ? ex[exKeys[0]].inputs : (opt.inputs || "3"), size: 10, "aria-label": "Valori di input X1, X2, …" });
  const exSel = ex ? h("select", { "aria-label": "Esempio", onchange: (e) => { const v = ex[e.target.value]; ta.value = v.src; inp.value = v.inputs; load(); } }, ...exKeys.map(k => h("option", { value: k }, k))) : null;
  const listBox = h("div", { class: "log" }), varsBox = h("div", { class: "tblwrap" }), status = h("div", { class: "status" });
  let prog = [], vars = {}, pc = 0, steps = 0;
  function load() {
    try { prog = parseS(ta.value); } catch (e) { status.className = "status bad"; status.textContent = e.message; return false; }
    vars = { Y: 0 }; parseList(inp.value).forEach((x, i) => vars["X" + (i + 1)] = Math.max(0, parseInt(x, 10) || 0));
    prog.forEach(I => { if (!(I.v in vars)) vars[I.v] = 0; });
    pc = 0; steps = 0; render(); return true;
  }
  function render() {
    listBox.replaceChildren(...prog.map((I, i) => h("div", { style: i === pc ? "background:var(--mark-soft);font-weight:600" : "" }, `${String(i + 1).padStart(2)}  ${I.text}`)), h("div", { style: pc >= prog.length ? "background:var(--ok-soft)" : "color:var(--muted)" }, "    (fine programma)"));
    const names = Object.keys(vars).sort((a, b) => (a === "Y" ? -1 : b === "Y" ? 1 : a < b ? -1 : 1));
    varsBox.replaceChildren(h("table", { class: "tbl" }, h("tr", null, ...names.map(n => h("th", null, n))), h("tr", null, ...names.map(n => h("td", null, vars[n])))));
    if (pc >= prog.length) { status.className = "status ok"; status.textContent = `Terminato in ${steps} passi · output Y = ${vars.Y}`; }
    else if (steps >= 5000) { status.className = "status bad"; status.textContent = "5000 passi senza terminare: probabilmente il programma non si ferma su questo input (funzione indefinita, ↑)"; }
    else { status.className = "status"; status.textContent = `Istruzione ${pc + 1} · passi eseguiti ${steps}`; }
  }
  function step() {
    if (pc >= prog.length || steps >= 5000) return false;
    const I = prog[pc], v = vars[I.v] || 0;
    if (I.op === "inc") { vars[I.v] = v + 1; pc++; }
    else if (I.op === "dec") { vars[I.v] = Math.max(0, v - 1); pc++; }
    else if (I.op === "nop") pc++;
    else { if (v !== 0) { const j = prog.findIndex(p => p.label === I.L); pc = j < 0 ? prog.length : j; } else pc++; }
    steps++; return true;
  }
  B.body.append(exSel ? h("div", { class: "controls" }, h("label", null, "Esempio"), exSel) : null, h("div", { class: "cols" }, h("div", null, ta, h("div", { class: "controls" }, h("label", null, "Input X1, X2…"), inp, btn("Carica", load, "primary"))),
    h("div", null, listBox)),
    h("div", { class: "controls" }, btn("Passo", () => { step(); render(); }, "primary"), btn("Esegui fino alla fine", () => { while (step()); render(); }), btn("Ricomincia", load)),
    varsBox, status);
  load();
  return B.el;
};

/* ---------- Ricorsione primitiva: srotolamento ---------- */
W.primrec = function () {
  const F = {
    somma: { args: 2, show: "x + y", base: "f(x, 0) = x", stepT: "f(x, y+1) = s(f(x, y))", b: x => x, h: (x, y, v) => v + 1 },
    prodotto: { args: 2, show: "x · y", base: "f(x, 0) = 0", stepT: "f(x, y+1) = f(x, y) + x", b: () => 0, h: (x, y, v) => v + x },
    potenza: { args: 2, show: "xʸ", base: "f(x, 0) = 1", stepT: "f(x, y+1) = f(x, y) · x", b: () => 1, h: (x, y, v) => v * x },
    fattoriale: { args: 1, show: "y!", base: "f(0) = 1", stepT: "f(y+1) = (y+1) · f(y)", b: () => 1, h: (x, y, v) => (y + 1) * v },
    predecessore: { args: 1, show: "p(y)", base: "p(0) = 0", stepT: "p(y+1) = y", b: () => 0, h: (x, y) => y },
    "sottrazione troncata": { args: 2, show: "x ∸ y", base: "f(x, 0) = x", stepT: "f(x, y+1) = p(f(x, y))", b: x => x, h: (x, y, v) => Math.max(0, v - 1) }
  };
  const B = bench("Ricorsione primitiva passo per passo", "Scegli una funzione: vedi come la ricorsione scende fino al caso base e poi risale");
  const sel = h("select", { "aria-label": "Funzione" }, ...Object.keys(F).map(k => h("option", { value: k }, k)));
  const xi = h("input", { type: "number", value: 2, min: 0, max: 9, "aria-label": "x" }), yi = h("input", { type: "number", value: 4, min: 0, max: 9, "aria-label": "y" });
  const out = h("div", { class: "cols" }), defs = h("div", { class: "def" });
  function go() {
    const f = F[sel.value], x = Math.min(9, +xi.value || 0), y = Math.min(9, +yi.value || 0);
    xi.disabled = f.args === 1;
    defs.replaceChildren(h("span", { class: "k" }, `Definizione di ${f.show}`), h("div", { class: "mono" }, f.base), h("div", { class: "mono" }, f.stepT));
    const call = k => f.args === 1 ? `f(${k})` : `f(${x}, ${k})`;
    const down = [], up = [];
    for (let k = y; k > 0; k--) down.push(h("div", null, `${call(k)} = h(…, ${call(k - 1)})  ↓`));
    down.push(h("div", { style: "color:var(--accent);font-weight:600" }, `${call(0)} → caso base`));
    let v = f.b(x);
    up.push(h("div", null, `${call(0)} = ${v}`));
    for (let k = 0; k < y; k++) { v = f.h(x, k, v); up.push(h("div", null, `${call(k + 1)} = ${v}  ↑`)); }
    out.replaceChildren(h("div", null, h("div", { class: "small" }, "Discesa"), h("div", { class: "log" }, ...down)), h("div", null, h("div", { class: "small" }, "Risalita (calcolo effettivo)"), h("div", { class: "log" }, ...up), h("div", { class: "status ok", style: "margin-top:8px" }, `Risultato: ${call(y)} = ${v}`)));
  }
  [sel, xi, yi].forEach(e => e.addEventListener("input", go));
  B.body.append(h("div", { class: "controls" }, h("label", null, "Funzione"), sel, h("label", null, "x"), xi, h("label", null, "y"), yi), defs, out);
  go();
  return B.el;
};

/* ---------- Minimalizzazione ---------- */
W.minimal = function () {
  const P = {
    "⌊√x⌋ = min t ≤ x [ (t+1)² > x ]": { bounded: true, p: (x, t) => (t + 1) * (t + 1) > x },
    "⌊x/3⌋ = min t ≤ x [ 3(t+1) > x ]": { bounded: true, p: (x, t) => 3 * (t + 1) > x },
    "f(x) = μt [ t·t = x ]  (non limitata)": { bounded: false, p: (x, t) => t * t === x },
    "g(x) = μt [ t + x = 0 ]  (non limitata)": { bounded: false, p: (x, t) => t + x === 0 }
  };
  const B = bench("Operatore di minimalizzazione μ", "Si prova t = 0, 1, 2, … e ci si ferma al primo t che rende vero il predicato");
  const sel = h("select", { "aria-label": "Funzione" }, ...Object.keys(P).map(k => h("option", { value: k }, k)));
  const xi = h("input", { type: "number", value: 10, min: 0, max: 99, "aria-label": "x" });
  const row = h("div", { class: "tape" }), status = h("div", { class: "status" });
  function go() {
    const f = P[sel.value], x = Math.max(0, +xi.value || 0), cells = [];
    let found = null;
    const lim = f.bounded ? x : 30;
    for (let t = 0; t <= lim; t++) {
      const v = f.p(x, t);
      cells.push(h("div", { class: "c" + (v ? " cur" : ""), title: `t=${t}: ${v ? "vero" : "falso"}`, style: "min-width:44px;flex-direction:column;height:auto;padding:2px" }, h("div", { class: "small" }, "t=" + t), v ? "1" : "0"));
      if (v) { found = t; break; }
    }
    if (!f.bounded && found == null) cells.push(h("div", { class: "c", style: "min-width:44px" }, "…"));
    row.replaceChildren(...cells);
    if (found != null) { status.className = "status ok"; status.textContent = `Il primo t con predicato vero è ${found}: il valore è ${found}`; }
    else if (f.bounded) { status.className = "status"; status.textContent = `Nessun t ≤ ${x} soddisfa il predicato: per convenzione (DSW) la minimalizzazione limitata vale 0`; }
    else { status.className = "status bad"; status.textContent = "Nessun t trovato: la ricerca non termina mai. La funzione è indefinita (↑) su questo input: ecco perché μ non limitata produce funzioni PARZIALI"; }
  }
  [sel, xi].forEach(e => e.addEventListener("input", go));
  B.body.append(h("div", { class: "controls" }, sel, h("label", null, "x ="), xi), row, status);
  go();
  return B.el;
};

/* ---------- Numeri di Gödel ---------- */
W.godel = function () {
  const B = bench("Codifiche di Gödel", "Coppie ⟨x,y⟩ = 2ˣ(2y+1) − 1 · sequenze [a₁,…,aₙ] = ∏ pᵢ^aᵢ · programmi #(P) = [#(I₁),…,#(Iₖ)] − 1");
  const seg = h("div", { class: "seg" }), area = h("div", { style: "display:grid;gap:10px" });
  const tabs = {
    "Coppie": () => {
      const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, "x \\ y"), ...[0, 1, 2, 3, 4, 5].map(y => h("th", null, y))));
      for (let x = 0; x < 6; x++) tb.append(h("tr", null, h("th", null, x), ...[0, 1, 2, 3, 4, 5].map(y => h("td", { title: `2^${x}·(2·${y}+1) − 1` }, String(pairEnc(x, y))))));
      const z = h("input", { type: "number", value: 23, min: 0, "aria-label": "z" }), o = h("div", { class: "status" });
      const dec = () => { const [x, y] = pairDec(Math.max(0, +z.value || 0)); o.textContent = `z = ${z.value} → z+1 = ${+z.value + 1} = 2^${x} · ${2n * y + 1n} → l(z) = ${x}, r(z) = ${y}`; };
      z.addEventListener("input", dec); dec();
      return [h("div", { class: "small" }, "Ogni numero naturale compare esattamente una volta nella tabella: la codifica è una biiezione ℕ×ℕ → ℕ."), h("div", { class: "tblwrap" }, tb), h("div", { class: "controls" }, h("label", null, "Decodifica z ="), z), o];
    },
    "Sequenze": () => {
      const a = h("input", { type: "text", value: "1, 0, 2", size: 16, "aria-label": "Sequenza" }), o = h("div", { class: "status" });
      const z = h("input", { type: "text", value: "360", size: 12, "aria-label": "Numero da decodificare" }), o2 = h("div", { class: "status" });
      const enc = () => { const arr = a.value.split(",").map(t => Math.max(0, parseInt(t, 10) || 0)).slice(0, 12); o.textContent = `[${arr.join(", ")}] = ${arr.map((e, i) => `${PRIMES[i]}^${e}`).join(" · ")} = ${seqEnc(arr)}`; };
      const dec = () => { let r = null; try { r = seqDec(z.value.trim()); } catch (e) { } o2.textContent = r ? `${z.value} = [${r.join(", ")}]  (lunghezza Lt = ${r.length})` : "Inserisci un intero positivo con fattori primi tra i primi 60 primi"; };
      a.addEventListener("input", enc); z.addEventListener("input", dec); enc(); dec();
      return [h("div", { class: "controls" }, h("label", null, "Codifica"), a), o, h("div", { class: "controls" }, h("label", null, "Decodifica"), z), o2, h("div", { class: "small" }, "Attenzione: zeri finali non cambiano il numero, per questo [1,0,2] e [1,0,2,0] hanno lo stesso codice (DSW lo dice esplicitamente).")];
    },
    "Programmi": () => {
      const ta = h("textarea", { spellcheck: "false", "aria-label": "Programma S" }, "[A] X ← X - 1\n    Y ← Y + 1\n    IF X ≠ 0 GOTO A");
      const o = h("div", { class: "tblwrap" }), st = h("div", { class: "status" });
      const vnum = v => v === "Y" ? 1 : (v[0] === "X" ? 2 * +v.slice(1) : 2 * +v.slice(1) + 1);
      const lnum = l => 5 * (+l.slice(1) - 1) + "ABCDE".indexOf(l[0]) + 1;
      const go = () => {
        let prog; try { prog = parseS(ta.value); } catch (e) { st.className = "status bad"; st.textContent = e.message; return; }
        const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, "istruzione"), h("th", null, "a (etichetta)"), h("th", null, "b (tipo)"), h("th", null, "c = #(V)−1"), h("th", null, "#(I) = ⟨a,⟨b,c⟩⟩")));
        const codes = prog.map(I => {
          const a = I.label ? lnum(I.label) : 0, b = I.op === "nop" ? 0 : I.op === "inc" ? 1 : I.op === "dec" ? 2 : lnum(I.L) + 2, c = vnum(I.v) - 1;
          const code = pairEnc(a, Number(pairEnc(b, c)));
          tb.append(h("tr", null, h("td", { style: "text-align:left" }, I.text), h("td", null, a), h("td", null, b), h("td", null, c), h("td", null, String(code))));
          return code;
        });
        o.replaceChildren(tb);
        let num = 1n; codes.forEach((cc, i) => num *= BigInt(PRIMES[i]) ** cc);
        const str = (num - 1n).toString();
        st.className = "status"; st.textContent = `#(P) = ${codes.map((cc, i) => `${PRIMES[i]}^${cc}`).join(" · ")} − 1` + (str.length < 80 ? ` = ${str}` : ` (un numero di ${str.length} cifre)`);
      };
      ta.addEventListener("input", go); go();
      return [h("div", { class: "small" }, "Ordine delle variabili: Y, X1, Z1, X2, Z2, … · etichette: A1=1, B1=2, …, E1=5, A2=6 · tipo b: 0 = V←V, 1 = incremento, 2 = decremento, #(L)+2 = salto a L"), ta, o, st];
    }
  };
  let cur = "Coppie";
  function render() { seg.replaceChildren(...Object.keys(tabs).map(k => h("button", { type: "button", class: k === cur ? "on" : "", onclick: () => { cur = k; render(); } }, k))); area.replaceChildren(...tabs[cur]()); }
  B.body.append(seg, area); render();
  return B.el;
};

/* ---------- Diagonalizzazione ---------- */
W.diag = function () {
  const B = bench("La diagonalizzazione", "Costruisci l'oggetto che differisce da ogni riga sulla diagonale, poi prova a trovarlo nella tabella");
  const seg = h("div", { class: "seg" }), area = h("div", { style: "display:grid;gap:10px" });
  const bits = [[1, 0, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 1], [0, 1, 0, 1, 0, 1], [1, 1, 0, 0, 1, 0], [0, 0, 1, 1, 1, 0]];
  const halts = [[1, 0, 1, 1, 0, 1], [1, 1, 1, 1, 1, 1], [0, 0, 0, 1, 0, 0], [1, 0, 0, 0, 1, 1], [0, 1, 1, 0, 1, 0], [1, 1, 0, 1, 0, 0]];
  let mode = "cantor", built = false, probe = null;
  function render() {
    seg.replaceChildren(...[["cantor", "Cantor: sottoinsiemi di ℕ"], ["halt", "Turing: il problema della fermata"]].map(([k, t]) => h("button", { type: "button", class: k === mode ? "on" : "", onclick: () => { mode = k; built = false; probe = null; render(); } }, t)));
    const M = mode === "cantor" ? bits : halts;
    const rowName = i => mode === "cantor" ? `S${i}` : `P${i}`;
    const val = v => mode === "cantor" ? v : (v ? "↓" : "↑");
    const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, mode === "cantor" ? "insieme \\ n" : "programma \\ input"), ...M.map((_, j) => h("th", null, mode === "cantor" ? j : `#P${j}`))));
    M.forEach((r, i) => tb.append(h("tr", null, h("th", { style: "cursor:pointer", onclick: () => { if (built) { probe = i; render(); } } }, rowName(i)), ...r.map((v, j) => h("td", { class: (i === j ? "diag" : "") + (probe === i && j === i ? " flip" : "") }, val(v))))));
    if (built) tb.append(h("tr", null, h("th", null, mode === "cantor" ? "D" : "D"), ...M.map((r, j) => h("td", { class: "flip" }, mode === "cantor" ? 1 - M[j][j] : (M[j][j] ? "↑" : "↓")))));
    const explain = h("div", { class: "status" + (probe != null ? " ok" : "") });
    if (!built) explain.textContent = mode === "cantor" ? "Riga i = insieme Sᵢ (1 se n ∈ Sᵢ). Supponiamo che questa lista contenga TUTTI i sottoinsiemi di ℕ." : "Cella (i, j) = ↓ se Pᵢ si ferma sull'input j, ↑ se non si ferma. Supponiamo che esista un programma H che calcola questa tabella.";
    else if (probe == null) explain.textContent = mode === "cantor" ? "D = { i : i ∉ Sᵢ } capovolge la diagonale. Clicca una riga per controllare se D è proprio quell'insieme." : "D(i) fa l'opposto: se Pᵢ(i) si ferma, D va in loop; altrimenti si ferma. D è costruibile con H. Clicca una riga per vedere se D è quel programma.";
    else explain.textContent = mode === "cantor" ? `D ≠ S${probe}: differiscono sull'elemento ${probe} (diagonale). Vale per ogni riga, quindi la lista non era completa: 𝒫(ℕ) non è numerabile.` : `D ≠ P${probe}: sull'input ${probe} uno si ferma e l'altro no. D non è in nessuna riga, ma doveva esserci perché è un programma: contraddizione, quindi H non esiste. HALT è indecidibile.`;
    area.replaceChildren(h("div", { class: "tblwrap" }, tb), h("div", { class: "controls" }, btn(built ? "Ricomincia" : "Costruisci D capovolgendo la diagonale", () => { built = !built; probe = null; render(); }, "primary")), explain);
  }
  B.body.append(seg, area); render();
  return B.el;
};

/* ---------- Dovetailing: enumerare un linguaggio r.e. ---------- */
W.dovetail = function () {
  const B = bench("Dovetailing: da riconoscitore a enumeratore", "M accetta le stringhe con tanti 0 quanti 1 (impiegando 2|w|+1 passi) e va in loop sulle altre");
  const words = shortlex(["0", "1"], 3).slice(0, 9);
  const acceptsAt = w => (w.split("0").length - 1) === (w.split("1").length - 1) ? 2 * w.length + 1 : Infinity;
  let phase = 0;
  const box = h("div", { class: "tblwrap" }), out = h("div", { class: "pills" }), st = h("div", { class: "status" });
  function render() {
    const tb = h("table", { class: "tbl" }, h("tr", null, h("th", null, "stringa"), ...Array.from({ length: 9 }, (_, k) => h("th", null, "fase " + (k + 1)))));
    const printed = [];
    words.forEach((w, i) => {
      tb.append(h("tr", null, h("th", null, epsShow(w)), ...Array.from({ length: 9 }, (_, k) => {
        const ph = k + 1;
        if (ph > phase || i >= ph) return h("td", null, "");
        const t = acceptsAt(w);
        if (t <= ph) { if (!printed.includes(w)) printed.push(w); return h("td", { class: "hl" }, "accetta ✓"); }
        return h("td", null, `${ph} passi…`);
      })));
    });
    box.replaceChildren(tb);
    out.replaceChildren(h("span", { class: "small" }, "Stampato finora:"), ...printed.map(w => h("span", { class: "pill yes" }, epsShow(w))));
    st.textContent = phase === 0 ? "Fase k: esegui M per k passi su ciascuna delle prime k stringhe. Nessuna esecuzione può bloccare le altre." : `Fase ${phase}: M eseguita per ${phase} passi su ciascuna di w₁…w${Math.min(phase, 9)}. Le stringhe su cui M va in loop (0, 1, 00, …) non bloccano le altre.`;
  }
  B.body.append(h("div", { class: "controls" }, btn("Fase successiva", () => { if (phase < 9) { phase++; render(); } }, "primary"), btn("Ricomincia", () => { phase = 0; render(); })), box, out, st);
  render();
  return B.el;
};

/* ---------- Crescita delle funzioni ---------- */
W.growth = function () {
  const B = bench("Quanto crescono n², n³ e 2ⁿ", "Scala logaritmica sull'asse verticale; a destra il tempo con 10⁹ operazioni al secondo");
  const n = h("input", { type: "range", min: 5, max: 60, value: 30, "aria-label": "n" });
  const plot = h("div", { class: "svgwrap" }), tbl = h("div", { class: "tblwrap" });
  const fs = [["n", x => x, "var(--muted)"], ["n log₂ n", x => x * Math.log2(x), "var(--ok)"], ["n²", x => x * x, "var(--accent)"], ["n³", x => x ** 3, "var(--mark)"], ["2ⁿ", x => 2 ** x, "var(--bad)"]];
  const fmt = sec => sec < 1e-6 ? (sec * 1e9).toFixed(0) + " ns" : sec < 1e-3 ? (sec * 1e6).toFixed(1) + " µs" : sec < 1 ? (sec * 1e3).toFixed(1) + " ms" : sec < 3600 ? sec.toFixed(1) + " s" : sec < 86400 * 365 ? (sec / 3600).toFixed(1) + " ore" : (sec / (86400 * 365)).toExponential(1) + " anni";
  function go() {
    const N = +n.value, Wd = 560, Hd = 260, pad = 44, ymax = Math.log10(2 ** 60);
    const svg = s("svg", { viewBox: `0 0 ${Wd} ${Hd}`, width: Wd, height: Hd, role: "img", "aria-label": "Grafico di crescita" });
    const X = x => pad + (x - 1) / 59 * (Wd - pad - 70), Y = v => Hd - 28 - (Math.log10(Math.max(1, v)) / ymax) * (Hd - 50);
    for (let e = 0; e <= 18; e += 3) { svg.append(s("line", { x1: pad, x2: Wd - 70, y1: Y(10 ** e), y2: Y(10 ** e), stroke: "var(--grid)" })); svg.append(s("text", { x: pad - 6, y: Y(10 ** e) + 4, "text-anchor": "end", class: "svgtext", style: "font-size:11px" }, "10^" + e)); }
    svg.append(s("line", { x1: X(N), x2: X(N), y1: 16, y2: Hd - 28, stroke: "var(--line)", "stroke-dasharray": "4 4" }));
    svg.append(s("text", { x: X(N), y: Hd - 10, "text-anchor": "middle", class: "svgtext" }, "n = " + N));
    fs.forEach(([nm, f, col]) => {
      let d = ""; for (let x = 1; x <= 60; x++) d += (x === 1 ? "M" : "L") + X(x) + "," + Y(f(x));
      svg.append(s("path", { d, fill: "none", stroke: col, "stroke-width": 2.2 }));
      svg.append(s("circle", { cx: X(N), cy: Y(f(N)), r: 4, fill: col }));
      svg.append(s("text", { x: Wd - 66, y: Y(f(60)) + 4, class: "svgtext", style: `fill:${col};font-weight:600` }, nm));
    });
    plot.replaceChildren(svg);
    tbl.replaceChildren(h("table", { class: "tbl" }, h("tr", null, h("th", null, "f(n)"), h("th", null, `valore per n=${N}`), h("th", null, "tempo")), ...fs.map(([nm, f]) => h("tr", null, h("td", null, nm), h("td", null, f(N) < 1e7 ? Math.round(f(N)).toLocaleString("it-IT") : f(N).toExponential(2)), h("td", null, fmt(f(N) / 1e9))))));
  }
  n.addEventListener("input", go);
  B.body.append(h("div", { class: "controls" }, h("label", { for: null }, "n"), n), h("div", { class: "cols" }, plot, tbl));
  go();
  return B.el;
};

/* ---------- Verificatore per CLIQUE ---------- */
W.clique = function () {
  const B = bench("Verificare è facile, trovare è difficile: CLIQUE", "Clicca i vertici per scegliere un certificato, poi verificalo");
  const P = [[80, 60], [210, 40], [330, 80], [360, 200], [250, 250], [120, 230], [40, 150], [220, 145]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [1, 7], [2, 7], [3, 7], [4, 7], [2, 4], [0, 7], [5, 7], [1, 3]];
  const has = (a, b) => E.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const sel = new Set();
  const svgBox = h("div", { class: "svgwrap" }), st = h("div", { class: "status" });
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  function render(check) {
    const svg = s("svg", { viewBox: "0 0 400 290", width: 400, height: 290, role: "img", "aria-label": "Grafo" });
    const pairs = [...sel];
    E.forEach(([a, b]) => svg.append(s("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: sel.has(a) && sel.has(b) ? "var(--mark)" : "var(--line)", "stroke-width": sel.has(a) && sel.has(b) ? 3.5 : 1.8 })));
    if (check) for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) if (!has(pairs[i], pairs[j])) { const a = pairs[i], b = pairs[j]; svg.append(s("line", { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: "var(--bad)", "stroke-width": 2.5, "stroke-dasharray": "6 5" })); }
    P.forEach(([x, y], i) => {
      const g = s("g", { style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": "vertice " + i });
      g.append(s("circle", { cx: x, cy: y, r: 16, fill: sel.has(i) ? "var(--mark-soft)" : "var(--surface)", stroke: sel.has(i) ? "var(--mark)" : "var(--ink)", "stroke-width": sel.has(i) ? 3 : 1.5 }));
      g.append(s("text", { x, y: y + 5, "text-anchor": "middle", class: "svgmono" }, i));
      const tog = () => { sel.has(i) ? sel.delete(i) : sel.add(i); render(false); };
      g.addEventListener("click", tog); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tog(); } });
      svg.append(g);
    });
    svgBox.replaceChildren(svg);
    const k = sel.size;
    if (!check) { st.className = "status"; st.textContent = `Certificato: ${k} vertici. Verificarlo richiede ${k * (k - 1) / 2} controlli di adiacenza; cercarlo a forza bruta richiede di provare fino a C(8,${k}) = ${C(8, k)} sottoinsiemi (e per n grande la crescita è esponenziale).`; return; }
    const bad = []; for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) if (!has(pairs[i], pairs[j])) bad.push(pairs[i] + "–" + pairs[j]);
    st.className = "status " + (bad.length || k < 2 ? "bad" : "ok");
    st.textContent = k < 2 ? "Scegli almeno 2 vertici" : bad.length ? `Non è una clique: mancano gli archi ${bad.join(", ")} (tratteggiati)` : `Sì: {${pairs.sort((a, b) => a - b).join(", ")}} è una ${k}-clique, verificata in ${k * (k - 1) / 2} controlli.`;
  }
  B.body.append(svgBox, h("div", { class: "controls" }, btn("Verifica il certificato", () => render(true), "primary"), btn("Svuota", () => { sel.clear(); render(false); })), st);
  render(false);
  return B.el;
};

/* ---------- Gerarchia di Chomsky ---------- */
W.chomsky = function () {
  const L = [
    { k: "t0", name: "Tipo 0 · ricorsivamente enumerabili", g: "α → β senza restrizioni (α contiene almeno una variabile)", a: "Macchina di Turing (riconoscitore)", ex: "{⟨M,w⟩ : M si ferma su w}", cl: "∪, ∩, concatenazione, stella · NON complemento", dec: "Appartenenza: solo semidecidibile" },
    { k: "rec", name: "Ricorsivi (decidibili)", g: "nessun tipo di grammatica corrisponde esattamente", a: "Macchina di Turing che si ferma sempre (decisore)", ex: "{⟨G⟩ : G grammatica CF e L(G) = ∅}", cl: "∪, ∩, complemento, concatenazione, stella", dec: "Appartenenza decidibile per definizione" },
    { k: "t1", name: "Tipo 1 · dipendenti dal contesto", g: "αAβ → αγβ con γ ≠ ε (equivalentemente |lato sinistro| ≤ |lato destro|)", a: "Automa lineare limitato (LBA)", ex: "{aⁿbⁿcⁿ : n ≥ 1}", cl: "∪, ∩, complemento (Immerman–Szelepcsényi), concatenazione, stella", dec: "Appartenenza decidibile; vuotezza indecidibile" },
    { k: "t2", name: "Tipo 2 · context-free", g: "A → γ", a: "Automa a pila non deterministico", ex: "{aⁿbⁿ : n ≥ 0}, palindromi", cl: "∪, concatenazione, stella · NON ∩ né complemento", dec: "Appartenenza e vuotezza decidibili; equivalenza indecidibile" },
    { k: "t3", name: "Tipo 3 · regolari", g: "A → aB | a | ε (lineari a destra)", a: "Automa finito (DFA = NFA)", ex: "(0∪1)*01, stringhe con numero pari di 1", cl: "chiusi rispetto a tutte le operazioni booleane, concatenazione e stella", dec: "Quasi tutto decidibile: appartenenza, vuotezza, equivalenza" }
  ];
  const B = bench("La gerarchia di Chomsky", "Clicca una fascia per vederne grammatica, automa, esempi e proprietà");
  const svgBox = h("div", { class: "svgwrap" }), info = h("div", { class: "def" });
  let cur = 3;
  function render() {
    const svg = s("svg", { viewBox: "0 0 560 300", width: 560, height: 300, role: "img", "aria-label": "Insiemi annidati della gerarchia di Chomsky" });
    L.forEach((l, i) => {
      const inset = i * 34;
      const g = s("g", { style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": l.name });
      g.append(s("rect", { x: 10 + inset, y: 10 + inset * 0.8, width: 540 - 2 * inset, height: 280 - 1.6 * inset, rx: 18, fill: i === cur ? "var(--accent-soft)" : "var(--surface)", stroke: i === cur ? "var(--accent)" : "var(--line)", "stroke-width": i === cur ? 2.5 : 1.5, "stroke-dasharray": l.k === "rec" ? "6 5" : null }));
      g.append(s("text", { x: 26 + inset, y: 32 + inset * 0.8, class: "svgtext", style: `font-weight:${i === cur ? 700 : 500}` }, l.name));
      const pick = (e) => { e.stopPropagation(); cur = i; render(); };
      g.addEventListener("click", pick); g.addEventListener("keydown", e => { if (e.key === "Enter") pick(e); });
      svg.append(g);
    });
    svgBox.replaceChildren(svg);
    const l = L[cur];
    info.replaceChildren(h("span", { class: "k" }, l.name), h("div", null, h("b", null, "Grammatiche: "), l.g), h("div", null, h("b", null, "Riconoscitore: "), l.a), h("div", null, h("b", null, "Esempio tipico: "), l.ex), h("div", null, h("b", null, "Chiusura: "), l.cl), h("div", null, h("b", null, "Problemi: "), l.dec));
  }
  B.body.append(svgBox, info); render();
  return B.el;
};

/* ---------- Passo passo (walkthrough generico) ---------- */
W.stepper = function (title, steps, hint) {
  const B = bench(title, hint || "Usa i pulsanti per scorrere i passaggi");
  const box = h("div", { style: "display:grid;gap:8px" }), lbl = h("span", { class: "small" });
  let i = 0;
  function render() {
    const st = steps[i];
    box.replaceChildren(h("h3", null, st.t), h("div", { class: "prose", html: st.html }));
    lbl.textContent = `Passo ${i + 1} di ${steps.length}`;
  }
  B.body.append(h("div", { class: "controls" }, btn("← Indietro", () => { if (i > 0) { i--; render(); } }), btn("Avanti →", () => { if (i < steps.length - 1) { i++; render(); } }, "primary"), lbl), box);
  render();
  return B.el;
};

/* ---------- Operazioni su insiemi e linguaggi ---------- */
W.langOps = function () {
  const B = bench("Calcolatrice di linguaggi", "Elenca le stringhe separate da virgola; scrivi ε per la stringa vuota");
  const a = h("input", { type: "text", value: "ε, a", size: 18, "aria-label": "L1" }), b = h("input", { type: "text", value: "b, ab", size: 18, "aria-label": "L2" });
  const out = h("div", { class: "tblwrap" });
  const fmt = set => "{" + [...set].sort((x, y) => x.length - y.length || (x < y ? -1 : 1)).map(epsShow).join(", ") + "}";
  const cat = (X, Y) => { const r = new Set(); X.forEach(x => Y.forEach(y => r.add(x + y))); return r; };
  function go() {
    const A = new Set(parseList(a.value)), Bb = new Set(parseList(b.value));
    const star = (X, max) => { let r = new Set([""]), layer = new Set([""]); for (let k = 0; k < 6; k++) { layer = cat(layer, X); layer.forEach(w => { if (w.length <= max) r.add(w); }); } return r; };
    const rows = [
      ["L₁ ∪ L₂", fmt(new Set([...A, ...Bb]))],
      ["L₁ ∩ L₂", fmt(new Set([...A].filter(x => Bb.has(x))))],
      ["L₁ − L₂", fmt(new Set([...A].filter(x => !Bb.has(x))))],
      ["L₁L₂", fmt(cat(A, Bb))],
      ["L₂L₁", fmt(cat(Bb, A))],
      ["L₁²", fmt(cat(A, A))],
      ["L₁* (stringhe di lunghezza ≤ 4)", fmt(star(A, 4))],
      ["L₁ × L₂ (prodotto cartesiano)", "{" + [...A].flatMap(x => [...Bb].map(y => `(${epsShow(x)}, ${epsShow(y)})`)).join(", ") + "}"]
    ];
    out.replaceChildren(h("table", { class: "tbl" }, ...rows.map(([k, v]) => h("tr", null, h("th", null, k), h("td", { style: "text-align:left" }, v)))));
  }
  [a, b].forEach(x => x.addEventListener("input", go));
  B.body.append(h("div", { class: "controls" }, h("label", null, "L₁ ="), a, h("label", null, "L₂ ="), b), out, h("div", { class: "small" }, "Prova L₁ = ∅ (lascia vuoto) e guarda L₁L₂ e L₁*: sono le trappole classiche."));
  go();
  return B.el;
};

/* ---------- Figura statica (SVG inline) ---------- */
W.figure = function (svgMarkup, caption) {
  const el = h("figure", { style: "margin:0;display:grid;gap:6px" }, h("div", { class: "svgwrap", html: svgMarkup }), caption ? h("figcaption", { class: "small" }, caption) : null);
  return el;
};
