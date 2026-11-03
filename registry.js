/* registry.js — esempi concreti (automi, macchine, programmi) e registro dei widget richiamati nelle lezioni con <div data-w="nome"></div> */
"use strict";

/* ---------- widget aggiuntivi ---------- */
W.zigzag = function () {
  const B = bench("ℕ × ℕ è numerabile", "Le coppie si elencano per diagonali: (0,0), (0,1), (1,0), (0,2), …");
  const N = 6, c = 54, svg = s("svg", { viewBox: `0 0 ${N * c + 60} ${N * c + 50}`, width: N * c + 60, height: N * c + 50, role: "img", "aria-label": "Enumerazione per diagonali delle coppie di naturali" });
  const X = i => 50 + i * c, Y = j => 30 + j * c;
  const order = [];
  for (let d = 0; d < N; d++) for (let x = 0; x <= d; x++) order.push([x, d - x]);
  let path = "";
  order.forEach(([x, y], k) => path += (k ? "L" : "M") + X(y) + "," + Y(x));
  svg.append(s("path", { d: path, fill: "none", stroke: "var(--mark)", "stroke-width": 2 }));
  for (let i = 0; i < N; i++) { svg.append(s("text", { x: X(i), y: 14, class: "svgmono", "text-anchor": "middle" }, i)); svg.append(s("text", { x: 20, y: Y(i) + 5, class: "svgmono", "text-anchor": "middle" }, i)); }
  order.forEach(([x, y], k) => {
    svg.append(s("circle", { cx: X(y), cy: Y(x), r: 15, fill: "var(--surface)", stroke: "var(--accent)" }));
    svg.append(s("text", { x: X(y), y: Y(x) + 5, class: "svgmono", "text-anchor": "middle", style: "font-size:12px" }, k));
  });
  B.body.append(h("div", { class: "svgwrap" }, svg), h("div", { class: "small" }, "Riga = prima componente, colonna = seconda. Il numero nel cerchio è la posizione nell'elenco: ogni coppia ne riceve una e una sola."));
  return B.el;
};

W.pcp = function () {
  const D = [["b", "ca"], ["a", "ab"], ["ca", "a"], ["abc", "c"]];
  const B = bench("Il problema di corrispondenza di Post", "Clicca le tessere per metterle in fila: cerca una sequenza in cui sopra e sotto si legge la stessa stringa");
  const seq = [], tiles = h("div", { class: "controls" }), row = h("div", { class: "tape", style: "align-items:stretch" }), st = h("div", { class: "status" });
  const tile = ([t, b], i, small) => h("div", { class: "c", style: `flex-direction:column;height:auto;padding:4px 8px;min-width:${small ? 40 : 54}px` }, h("div", null, t), h("div", { style: "border-top:1px solid var(--line);width:100%;text-align:center" }, b), small ? null : h("div", { class: "small" }, "#" + (i + 1)));
  D.forEach((d, i) => tiles.append(h("button", { type: "button", style: "padding:2px", onclick: () => { seq.push(i); render(); }, "aria-label": `Tessera ${i + 1}: ${d[0]} sopra ${d[1]}` }, tile(d, i))));
  function render() {
    row.replaceChildren(...seq.map(i => tile(D[i], i, true)));
    const top = seq.map(i => D[i][0]).join(""), bot = seq.map(i => D[i][1]).join("");
    if (!seq.length) { st.className = "status"; st.textContent = "Sequenza vuota. Suggerimento: con quale tessera può iniziare un match?"; return; }
    const pre = top.startsWith(bot) || bot.startsWith(top);
    if (top === bot) { st.className = "status ok"; st.textContent = `Match! Sopra e sotto si legge ${top}`; }
    else if (!pre) { st.className = "status bad"; st.textContent = `Sopra «${top}», sotto «${bot}»: nessuna delle due è prefisso dell'altra, questa strada è morta`; }
    else { st.className = "status"; st.textContent = `Sopra «${top}», sotto «${bot}»: ancora compatibili, continua`; }
  }
  B.body.append(tiles, row, h("div", { class: "controls" }, btn("Togli l'ultima", () => { seq.pop(); render(); }), btn("Svuota", () => { seq.length = 0; render(); }), btn("Mostra una soluzione", () => { seq.length = 0; seq.push(1, 0, 2, 1, 3); render(); })), st);
  render();
  return B.el;
};

function cfgToPda(text) {
  const g = parseCFG(text);
  const trans = [{ from: "qs", read: "", pop: "", push: g.start + "$", to: "qL" }];
  for (const [A, alts] of Object.entries(g.rules)) for (const w of alts) trans.push({ from: "qL", read: "", pop: A, push: w, to: "qL", loop: -90 });
  const terms = new Set();
  Object.values(g.rules).flat().join("").split("").filter(ch => !isVar(ch)).forEach(t => terms.add(t));
  for (const a of terms) trans.push({ from: "qL", read: a, pop: a, push: "", to: "qL", loop: 90 });
  trans.push({ from: "qL", read: "", pop: "$", push: "", to: "qa" });
  return { start: "qs", accept: ["qa"], trans, draw: { w: 560, h: 260, states: [{ id: "qs", x: 70, y: 130 }, { id: "qL", label: "qloop", x: 280, y: 130 }, { id: "qa", x: 490, y: 130, accept: true }] } };
}

/* ---------- automi d'esempio ---------- */
const DFA_01 = { w: 520, h: 210, start: "q0", states: [{ id: "q0", x: 90, y: 100 }, { id: "q1", x: 260, y: 100 }, { id: "q2", x: 430, y: 100, accept: true }],
  edges: [{ from: "q0", to: "q0", label: "1" }, { from: "q0", to: "q1", label: "0" }, { from: "q1", to: "q1", label: "0" }, { from: "q1", to: "q2", label: "1" }, { from: "q2", to: "q1", label: "0" }, { from: "q2", to: "q0", label: "1", bend: -42 }] };
const DFA_MOD3 = { w: 470, h: 250, start: "r0", states: [{ id: "r0", x: 90, y: 150, accept: true }, { id: "r1", x: 235, y: 70 }, { id: "r2", x: 380, y: 150 }],
  edges: [{ from: "r0", to: "r0", label: "0", loop: 180 }, { from: "r0", to: "r1", label: "1" }, { from: "r1", to: "r0", label: "1" }, { from: "r1", to: "r2", label: "0" }, { from: "r2", to: "r1", label: "0" }, { from: "r2", to: "r2", label: "1", loop: 0 }] };
const DFA_SINK = { w: 520, h: 220, start: "s0", states: [{ id: "s0", x: 80, y: 90 }, { id: "s1", x: 250, y: 90 }, { id: "s2", x: 420, y: 90, accept: true }, { id: "pozzo", x: 250, y: 190, label: "⊥" }],
  edges: [{ from: "s0", to: "s1", label: "a" }, { from: "s1", to: "s2", label: "b" }, { from: "s2", to: "s2", label: "a,b" }, { from: "s0", to: "pozzo", label: "b" }, { from: "s1", to: "pozzo", label: "a" }, { from: "pozzo", to: "pozzo", label: "a,b", loop: 0 }] };
const NFA_23 = { w: 470, h: 330, start: "s", states: [{ id: "s", x: 70, y: 160 }, { id: "a0", x: 200, y: 70, accept: true }, { id: "a1", x: 370, y: 70 }, { id: "b0", x: 200, y: 220, accept: true }, { id: "b1", x: 380, y: 220 }, { id: "b2", x: 290, y: 295 }],
  edges: [{ from: "s", to: "a0", label: "ε" }, { from: "s", to: "b0", label: "ε" }, { from: "a0", to: "a1", label: "0" }, { from: "a1", to: "a0", label: "0" }, { from: "b0", to: "b1", label: "0" }, { from: "b1", to: "b2", label: "0" }, { from: "b2", to: "b0", label: "0" }] };
const NFA_PEN = { w: 460, h: 180, start: "q0", states: [{ id: "q0", x: 80, y: 100 }, { id: "q1", x: 230, y: 100 }, { id: "q2", x: 380, y: 100, accept: true }],
  edges: [{ from: "q0", to: "q0", label: "0,1" }, { from: "q0", to: "q1", label: "1" }, { from: "q1", to: "q2", label: "0,1" }] };
const NFA_CONT = { w: 560, h: 180, start: "p0", states: [{ id: "p0", x: 70, y: 100 }, { id: "p1", x: 200, y: 100 }, { id: "p2", x: 330, y: 100 }, { id: "p3", x: 470, y: 100, accept: true }],
  edges: [{ from: "p0", to: "p0", label: "0,1" }, { from: "p0", to: "p1", label: "1" }, { from: "p1", to: "p2", label: "0,ε" }, { from: "p2", to: "p3", label: "1" }, { from: "p3", to: "p3", label: "0,1" }] };
const DFA_EVEN0 = { w: 300, h: 170, start: "E", states: [{ id: "E", x: 80, y: 95, accept: true }, { id: "O", x: 220, y: 95 }],
  edges: [{ from: "E", to: "O", label: "0" }, { from: "O", to: "E", label: "0" }, { from: "E", to: "E", label: "1" }, { from: "O", to: "O", label: "1" }] };
const DFA_END1 = { w: 300, h: 170, start: "A", states: [{ id: "A", x: 80, y: 95 }, { id: "B", x: 220, y: 95, accept: true }],
  edges: [{ from: "A", to: "B", label: "1" }, { from: "B", to: "A", label: "0" }, { from: "A", to: "A", label: "0" }, { from: "B", to: "B", label: "1" }] };
const MEALY_11 = { w: 420, h: 200, start: "A", states: [{ id: "A", x: 110, y: 110 }, { id: "B", x: 310, y: 110 }],
  edges: [{ from: "A", to: "A", label: "0/0" }, { from: "A", to: "B", label: "1/0" }, { from: "B", to: "A", label: "0/0" }, { from: "B", to: "B", label: "1/1" }] };
const MEALY_101 = { w: 520, h: 230, start: "S0", states: [{ id: "S0", x: 80, y: 120 }, { id: "S1", x: 260, y: 120 }, { id: "S2", x: 440, y: 120 }],
  edges: [{ from: "S0", to: "S0", label: "0/0" }, { from: "S0", to: "S1", label: "1/0" }, { from: "S1", to: "S1", label: "1/0" }, { from: "S1", to: "S2", label: "0/0" }, { from: "S2", to: "S1", label: "1/1" }, { from: "S2", to: "S0", label: "0/0", bend: -45 }] };
const MEALY_PAR = { w: 420, h: 200, start: "P", states: [{ id: "P", x: 110, y: 110 }, { id: "D", x: 310, y: 110 }],
  edges: [{ from: "P", to: "P", label: "0/0" }, { from: "P", to: "D", label: "1/1" }, { from: "D", to: "D", label: "0/1" }, { from: "D", to: "P", label: "1/0" }] };

const PDA_0N1N = { start: "q1", accept: ["q1", "q4"], draw: { w: 600, h: 210, states: [{ id: "q1", x: 70, y: 120, accept: true }, { id: "q2", x: 220, y: 120 }, { id: "q3", x: 390, y: 120 }, { id: "q4", x: 530, y: 120, accept: true }] },
  trans: [{ from: "q1", read: "", pop: "", push: "$", to: "q2" }, { from: "q2", read: "0", pop: "", push: "0", to: "q2" }, { from: "q2", read: "1", pop: "0", push: "", to: "q3" }, { from: "q3", read: "1", pop: "0", push: "", to: "q3" }, { from: "q3", read: "", pop: "$", push: "", to: "q4" }] };
const PDA_PAL = { start: "q1", accept: ["q4"], draw: { w: 600, h: 230, states: [{ id: "q1", x: 70, y: 140 }, { id: "q2", x: 220, y: 140 }, { id: "q3", x: 390, y: 140 }, { id: "q4", x: 530, y: 140, accept: true }] },
  trans: [{ from: "q1", read: "", pop: "", push: "$", to: "q2" }, { from: "q2", read: "0", pop: "", push: "0", to: "q2" }, { from: "q2", read: "1", pop: "", push: "1", to: "q2" }, { from: "q2", read: "", pop: "", push: "", to: "q3" }, { from: "q3", read: "0", pop: "0", push: "", to: "q3" }, { from: "q3", read: "1", pop: "1", push: "", to: "q3" }, { from: "q3", read: "", pop: "$", push: "", to: "q4" }] };
const PDA_EQ = { start: "q1", accept: ["q3"], draw: { w: 520, h: 230, states: [{ id: "q1", x: 80, y: 140 }, { id: "q2", x: 260, y: 140 }, { id: "q3", x: 440, y: 140, accept: true }] },
  trans: [{ from: "q1", read: "", pop: "", push: "$", to: "q2" },
    { from: "q2", read: "0", pop: "$", push: "0$", to: "q2" }, { from: "q2", read: "0", pop: "0", push: "00", to: "q2" }, { from: "q2", read: "0", pop: "1", push: "", to: "q2" },
    { from: "q2", read: "1", pop: "$", push: "1$", to: "q2" }, { from: "q2", read: "1", pop: "1", push: "11", to: "q2" }, { from: "q2", read: "1", pop: "0", push: "", to: "q2" },
    { from: "q2", read: "", pop: "$", push: "", to: "q3" }] };

const TM_0N1N = { start: "q0", accept: "qa", reject: "qr", delta: {
  "q0,0": ["X", "R", "q1"], "q0,Y": ["Y", "R", "q3"], "q0,_": ["_", "R", "qa"],
  "q1,0": ["0", "R", "q1"], "q1,Y": ["Y", "R", "q1"], "q1,1": ["Y", "L", "q2"],
  "q2,0": ["0", "L", "q2"], "q2,Y": ["Y", "L", "q2"], "q2,X": ["X", "R", "q0"],
  "q3,Y": ["Y", "R", "q3"], "q3,_": ["_", "R", "qa"] } };
const TM_INC = { start: "q0", halt: "qf", delta: {
  "q0,0": ["0", "R", "q0"], "q0,1": ["1", "R", "q0"], "q0,_": ["_", "L", "q1"],
  "q1,1": ["0", "L", "q1"], "q1,0": ["1", "S", "qf"], "q1,_": ["1", "S", "qf"] } };
const TM_POW2 = { start: "q1", accept: "qa", reject: "qr", delta: {
  "q1,0": ["_", "R", "q2"],
  "q2,x": ["x", "R", "q2"], "q2,_": ["_", "R", "qa"], "q2,0": ["x", "R", "q3"],
  "q3,x": ["x", "R", "q3"], "q3,0": ["0", "R", "q4"], "q3,_": ["_", "L", "q5"],
  "q4,x": ["x", "R", "q4"], "q4,0": ["x", "R", "q3"],
  "q5,0": ["0", "L", "q5"], "q5,x": ["x", "L", "q5"], "q5,_": ["_", "R", "q2"] } };

const S_EXAMPLES = {
  "Y = X (sbagliato su 0)": { inputs: "0", src: "[A] X ← X - 1\n    Y ← Y + 1\n    IF X ≠ 0 GOTO A" },
  "Y = X (corretto)": { inputs: "3", src: "[A] IF X ≠ 0 GOTO B\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO E\n[B] X ← X - 1\n    Y ← Y + 1\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO A" },
  "Y = X1 + X2": { inputs: "2, 3", src: "[A] IF X1 ≠ 0 GOTO B\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO C\n[B] X1 ← X1 - 1\n    Y ← Y + 1\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO A\n[C] IF X2 ≠ 0 GOTO D\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO E\n[D] X2 ← X2 - 1\n    Y ← Y + 1\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO C" },
  "Y = X1 ∸ X2 (sottrazione troncata)": { inputs: "5, 2", src: "[A] IF X1 ≠ 0 GOTO B\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO E\n[B] X1 ← X1 - 1\n    Y ← Y + 1\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO A\n# ora Y = X1; tolgo X2\n[C] IF X2 ≠ 0 GOTO D\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO E\n[D] X2 ← X2 - 1\n    Y ← Y - 1\n    Z ← Z + 1\n    IF Z ≠ 0 GOTO C" },
  "Funzione ovunque indefinita": { inputs: "1", src: "[A] X ← X + 1\n    IF X ≠ 0 GOTO A" },
  "Definita solo per x = 0": { inputs: "0", src: "[A] IF X ≠ 0 GOTO A" }
};

/* ---------- figure statiche ---------- */
const REDUCTION_SVG = `<svg viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="Riduzione mediante funzione">
<defs><marker id="rr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--accent)"/></marker></defs>
<rect x="20" y="20" width="200" height="180" rx="16" style="fill:var(--surface);stroke:var(--line)"/><text x="120" y="44" text-anchor="middle" class="svgtext" style="font-weight:700">Σ*</text>
<ellipse cx="120" cy="105" rx="70" ry="40" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="120" y="110" text-anchor="middle" class="svgtext">A</text>
<rect x="340" y="20" width="200" height="180" rx="16" style="fill:var(--surface);stroke:var(--line)"/><text x="440" y="44" text-anchor="middle" class="svgtext" style="font-weight:700">Σ*</text>
<ellipse cx="440" cy="105" rx="70" ry="40" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="440" y="110" text-anchor="middle" class="svgtext">B</text>
<circle cx="95" cy="98" r="4" style="fill:var(--ink)"/><circle cx="420" cy="92" r="4" style="fill:var(--ink)"/><path d="M99,96 Q260,40 414,92" style="fill:none;stroke:var(--accent);stroke-width:2" marker-end="url(#rr)"/><text x="260" y="58" text-anchor="middle" class="svgtext">w ∈ A ⇒ f(w) ∈ B</text>
<circle cx="80" cy="170" r="4" style="fill:var(--ink)"/><circle cx="460" cy="172" r="4" style="fill:var(--ink)"/><path d="M84,170 Q270,215 454,172" style="fill:none;stroke:var(--muted);stroke-width:2;stroke-dasharray:6 5" marker-end="url(#rr)"/><text x="270" y="186" text-anchor="middle" class="svgtext">w ∉ A ⇒ f(w) ∉ B</text></svg>`;
const MODELS_SVG = `<svg viewBox="0 0 600 170" width="600" height="170" role="img" aria-label="Modelli di calcolo equivalenti">
<defs><marker id="mm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--muted)"/></marker></defs>
${[["Programmi S", 80], ["Funzioni parziali ricorsive", 300], ["Macchine di Turing", 520]].map(([t, x]) => `<rect x="${x - 85}" y="20" width="170" height="54" rx="12" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="${x}" y="52" text-anchor="middle" class="svgtext" style="font-weight:600">${t}</text>`).join("")}
<path d="M168,47 L212,47" style="stroke:var(--muted);stroke-width:2" marker-start="url(#mm)" marker-end="url(#mm)"/><path d="M388,47 L432,47" style="stroke:var(--muted);stroke-width:2" marker-start="url(#mm)" marker-end="url(#mm)"/>
<text x="300" y="115" text-anchor="middle" class="svgtext">stessa classe di funzioni: le funzioni parzialmente calcolabili</text>
<text x="300" y="140" text-anchor="middle" class="svgtext" style="fill:var(--muted)">Tesi di Church–Turing: coincide con la nozione intuitiva di «algoritmo»</text></svg>`;
const PNP_SVG = `<svg viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="Relazioni tra P, NP e NP-completi">
<rect x="20" y="15" width="520" height="200" rx="20" style="fill:var(--surface);stroke:var(--line)"/><text x="40" y="40" class="svgtext" style="font-weight:700">Decidibili</text>
<ellipse cx="300" cy="125" rx="210" ry="80" style="fill:var(--accent-soft);stroke:var(--accent)"/><text x="300" y="66" text-anchor="middle" class="svgtext" style="font-weight:700">NP</text>
<ellipse cx="230" cy="135" rx="90" ry="50" style="fill:var(--ok-soft);stroke:var(--ok)"/><text x="230" y="130" text-anchor="middle" class="svgtext" style="font-weight:700">P</text><text x="230" y="150" text-anchor="middle" class="svgtext" style="font-size:12px">PATH, RELPRIME, CF</text>
<ellipse cx="420" cy="125" rx="70" ry="45" style="fill:var(--mark-soft);stroke:var(--mark)"/><text x="420" y="120" text-anchor="middle" class="svgtext" style="font-weight:700">NP-completi</text><text x="420" y="140" text-anchor="middle" class="svgtext" style="font-size:12px">SAT, CLIQUE, 3SAT</text>
</svg>`;

/* ---------- registro: nome usato nelle lezioni → costruttore ---------- */
const WREG = {
  "langops": () => W.langOps(),
  "zigzag": () => W.zigzag(),
  "diag-cantor": () => W.diag(),
  "diag-halt": () => { const el = W.diag(); el.querySelectorAll(".seg button")[1].click(); return el; },
  "dfa-01": () => W.automaton(DFA_01, { title: "DFA per {w : w termina con 01}", input: "1101", tests: "01, 001, 1101, 10, ε, 0101, 0110" }),
  "dfa-mod3": () => W.automaton(DFA_MOD3, { title: "DFA per i numeri binari divisibili per 3", hint: "Lo stato rᵢ significa: il numero letto finora vale i modulo 3", input: "1001", tests: "0, 11, 110, 1001, 1100, 101, 111" }),
  "dfa-sink": () => W.automaton(DFA_SINK, { title: "DFA per le stringhe che iniziano con ab (con stato pozzo)", input: "abba", tests: "ab, abba, ba, a, ε, aab, abab" }),
  "mealy-11": () => W.mealy(MEALY_11, { title: "Mealy: rilevatore di 11", input: "0111011" }),
  "mealy-101": () => W.mealy(MEALY_101, { title: "Mealy: rilevatore di 101 (con sovrapposizioni)", input: "1010110101" }),
  "mealy-par": () => W.mealy(MEALY_PAR, { title: "Mealy: parità progressiva", input: "1101001" }),
  "nfa-23": () => W.automaton(NFA_23, { title: "NFA con ε-mosse: lunghezza multipla di 2 o di 3", hint: "Dallo stato iniziale l'automa «sceglie» un ramo senza leggere", input: "000000", tests: "ε, 0, 00, 000, 0000, 00000, 000000" }),
  "nfa-cont": () => W.automaton(NFA_CONT, { title: "NFA: contiene 11 oppure 101", hint: "Gli stati evidenziati sono tutti quelli in cui l'automa può trovarsi", input: "010110", tests: "11, 101, 1001, 0110, 010, ε, 10101" }),
  "subset-pen": () => W.subset(NFA_PEN, ["0", "1"], { input: "0110", tests: "10, 11, 0110, 01, 1, ε, 100" }),
  "product": () => W.product(DFA_EVEN0, DFA_END1, ["0", "1"], { nameA: "M₁: numero pari di 0", nameB: "M₂: termina con 1", tests: "1, 01, 001, 0011, 10, ε, 0" }),
  "regex": () => W.regex({ regex: "(0∪1)*1(0∪1)", alphabet: "0,1", maxLen: 4 }),
  "gnfa": () => W.stepper("Da NFA a espressione regolare: eliminazione degli stati", [
    { t: "1. Prepara il GNFA", html: "Si parte dal DFA che riconosce le stringhe che terminano con 01 (lezione 3), con stati q0, q1, q2. Aggiungo un nuovo stato iniziale s con un arco ε verso q0 e un nuovo unico stato finale f con un arco ε da q2. Archi paralleli tra gli stessi stati si fondono in un'unione." },
    { t: "2. La regola di eliminazione", html: "Per eliminare uno stato q, per ogni coppia (p, r) con archi p→q etichettato R₁, cappio su q etichettato R₂, q→r etichettato R₃ e p→r etichettato R₄, il nuovo arco p→r diventa <b>R₁ R₂* R₃ ∪ R₄</b>. Se un arco manca, la sua etichetta è ∅." },
    { t: "3. Elimino q2", html: "Archi che passano per q2: q1 →1→ q2, q2 →ε→ f, q2 →0→ q1, q2 →1→ q0. q2 non ha cappio (R₂ = ∅, quindi R₂* = ε). Nuovi archi: q1→f: <b>1</b>; q1→q1: <b>0 ∪ 10</b> (il vecchio cappio 0 unito a 1·0); q1→q0: <b>11</b>." },
    { t: "4. Elimino q1", html: "Archi: q0 →0→ q1, cappio su q1: 0 ∪ 10, q1 →1→ f, q1 →11→ q0. Nuovi archi: q0→f: <b>0(0 ∪ 10)*1</b>; q0→q0: <b>1 ∪ 0(0 ∪ 10)*11</b> (il vecchio cappio 1 unito al giro q0→q1→q0)." },
    { t: "5. Elimino q0 e leggo il risultato", html: "Resta s →ε→ q0 con cappio e arco verso f. Risultato: <b>(1 ∪ 0(0 ∪ 10)*11)* 0(0 ∪ 10)*1</b>. Descrive lo stesso linguaggio di (0∪1)*01: espressioni diverse possono descrivere lo stesso linguaggio. Puoi verificarlo nel laboratorio delle espressioni regolari confrontando le stringhe generate." }
  ]),
  "pump-reg": () => W.pumping("reg"),
  "pump-cf": () => W.pumping("cf"),
  "cfg-anbn": () => W.cfg({ grammar: "S -> aSb | ε", genLen: 8, title: "Grammatica per {aⁿbⁿ}" }),
  "cfg-amb": () => W.cfg({ grammar: "E -> E+E | E*E | (E) | a", genLen: 5, title: "Una grammatica ambigua per le espressioni" }),
  "cfg-par": () => W.cfg({ grammar: "S -> (S) | SS | ε", genLen: 6, title: "Parentesi bilanciate" }),
  "cfg-eq": () => W.cfg({ grammar: "S -> aSbS | bSaS | ε", genLen: 4, title: "Stesso numero di a e di b" }),
  "cnf": () => W.stepper("Conversione in CNF (esempio 2.10 del Sipser)", [
    { t: "0. Grammatica di partenza", html: "S → ASA | aB<br>A → B | S<br>B → b | ε" },
    { t: "1. Nuova variabile iniziale", html: "Aggiungo S₀ → S, così la variabile iniziale non compare mai a destra.<br>S₀ → S<br>S → ASA | aB<br>A → B | S<br>B → b | ε" },
    { t: "2. Elimino B → ε", html: "B compare in S → aB e in A → B. Aggiungo le versioni senza B: S → a, e A → ε (nuova ε-regola, da eliminare a sua volta).<br>S → ASA | aB | a<br>A → B | S | ε<br>B → b" },
    { t: "3. Elimino A → ε", html: "A compare due volte in ASA: aggiungo le versioni con la prima A tolta (SA), la seconda tolta (AS), entrambe tolte (S).<br>S → ASA | aB | a | SA | AS | S<br>A → B | S<br>B → b" },
    { t: "4. Elimino le regole unitarie S → S e S₀ → S", html: "S → S non fa nulla: si cancella. S₀ → S si sostituisce con tutte le regole di S.<br>S₀ → ASA | aB | a | SA | AS<br>S → ASA | aB | a | SA | AS" },
    { t: "5. Elimino A → B e A → S", html: "A → B diventa A → b; A → S diventa A → ASA | aB | a | SA | AS.<br>A → b | ASA | aB | a | SA | AS" },
    { t: "6. Spezzo le regole lunghe e isolo i terminali", html: "ASA diventa A A₁ con A₁ → SA; aB diventa U B con U → a.<br><b>S₀ → AA₁ | UB | a | SA | AS</b><br><b>S → AA₁ | UB | a | SA | AS</b><br><b>A → b | AA₁ | UB | a | SA | AS</b><br><b>A₁ → SA · U → a · B → b</b>" }
  ]),
  "pda-0n1n": () => W.pda(PDA_0N1N, { title: "PDA per {0ⁿ1ⁿ}", input: "000111" }),
  "pda-pal": () => W.pda(PDA_PAL, { title: "PDA non deterministico per {wwᴿ}", input: "0110" }),
  "pda-eq": () => W.pda(PDA_EQ, { title: "PDA per {w : #0(w) = #1(w)}", input: "011001" }),
  "pda-from-cfg": () => W.pda(cfgToPda("S -> aSb | ab"), { title: "PDA costruito da S → aSb | ab", input: "aabb" }),
  "chomsky": () => W.chomsky(),
  "sprog": () => W.sprog({ examples: S_EXAMPLES }),
  "primrec": () => W.primrec(),
  "minimal": () => W.minimal(),
  "godel": () => W.godel(),
  "tm-0n1n": () => W.tm(TM_0N1N, { title: "Decisore per {0ⁿ1ⁿ}", input: "0011" }),
  "tm-inc": () => W.tm(TM_INC, { title: "Trasduttore: incremento binario", input: "1011" }),
  "tm-pow2": () => W.tm(TM_POW2, { title: "Decisore per {0^(2ⁿ)} (Sipser, esempio 3.7)", input: "0000" }),
  "models": () => W.figure(MODELS_SVG, "Tutti i modelli «ragionevoli» calcolano la stessa classe di funzioni."),
  "dovetail": () => W.dovetail(),
  "reduction": () => W.figure(REDUCTION_SVG, "f manda le istanze sì di A in istanze sì di B e le istanze no in istanze no."),
  "etm": () => W.stepper("Esempio: E_TM = {⟨M⟩ : L(M) = ∅} è indecidibile", [
    { t: "1. Strategia", html: "Supponiamo per assurdo che una macchina R decida E_TM. Con R costruiamo un decisore per A_TM = {⟨M, w⟩ : M accetta w}, che sappiamo indecidibile. Contraddizione." },
    { t: "2. La macchina ausiliaria", html: "Dato ⟨M, w⟩ costruiamo M₁ che, su input x: se x ≠ w rifiuta; se x = w esegue M su w e accetta se M accetta. Quindi L(M₁) = {w} se M accetta w, altrimenti L(M₁) = ∅. Costruire ⟨M₁⟩ a partire da ⟨M, w⟩ è un'operazione calcolabile: basta «incollare» w nel codice." },
    { t: "3. Il decisore impossibile", html: "S su input ⟨M, w⟩: costruisce ⟨M₁⟩, esegue R su ⟨M₁⟩; se R accetta (linguaggio vuoto) S rifiuta, altrimenti S accetta. S si ferma sempre e decide A_TM: impossibile." },
    { t: "4. Osservazione", html: "M accetta w ⇔ L(M₁) ≠ ∅: abbiamo ridotto A_TM al <b>complemento</b> di E_TM. Per la decidibilità va bene, perché i linguaggi decidibili sono chiusi per complemento. Si può dire di più: E_TM non è nemmeno Turing-riconoscibile, mentre il suo complemento lo è (si cerca con il dovetailing una stringa accettata)." }
  ]),
  "pcp": () => W.pcp(),
  "growth": () => W.growth(),
  "clique": () => W.clique(),
  "pnp": () => W.figure(PNP_SVG, "Il quadro che si crede vero se P ≠ NP. Se invece P = NP, le tre regioni coincidono."),
  "cook": () => W.stepper("Il teorema di Cook–Levin: SAT è NP-completo", [
    { t: "1. SAT è in NP", html: "Il certificato è un'assegnazione di verità alle variabili: si verifica in tempo lineare valutando la formula." },
    { t: "2. Ogni A ∈ NP si riduce a SAT", html: "Sia N una MdT non deterministica che decide A in tempo n^k. Data w di lunghezza n costruiamo una formula φ soddisfacibile se e solo se N ha una computazione accettante su w." },
    { t: "3. Il tableau", html: "Una computazione di N è una tabella n^k × n^k: la riga i è la configurazione al passo i, delimitata da #. Variabili x[i,j,s] = «la cella (i,j) contiene il simbolo s», con s ∈ Q ∪ Γ ∪ {#}." },
    { t: "4. Quattro pezzi della formula", html: "φ = φ_cell ∧ φ_start ∧ φ_move ∧ φ_accept. φ_cell: ogni cella contiene esattamente un simbolo. φ_start: la prima riga è la configurazione iniziale q₀w. φ_move: ogni finestra 2×3 è compatibile con δ (è «legale»). φ_accept: in qualche cella compare q_accept." },
    { t: "5. La dimensione è polinomiale", html: "Ci sono n^2k celle e ogni pezzo ha dimensione costante per cella (dipende solo da N, non da w): |φ| = O(n^2k), costruibile in tempo polinomiale. Quindi A ≤ₚ SAT." },
    { t: "6. E poi?", html: "Per dimostrare che un nuovo problema B è NP-completo: (1) B ∈ NP; (2) riduci a B un problema NP-completo già noto. Catena classica: SAT ≤ₚ 3SAT ≤ₚ CLIQUE, 3SAT ≤ₚ VERTEX-COVER, 3SAT ≤ₚ HAMPATH, 3SAT ≤ₚ SUBSET-SUM." }
  ])
};

/* ---------- simulazione dell'orale ---------- */
const ORALE = [
  ["A", "Definisci DFA e linguaggio riconosciuto. Quando lo stato iniziale è finale?", "Quintupla (Q, Σ, δ, q₀, F) con δ totale; accetta se la computazione termina in F. q₀ ∈ F se e solo se ε ∈ L."],
  ["A", "Che differenza c'è tra macchine di Mealy e di Moore? Come si passa dall'una all'altra?", "Mealy: uscita sugli archi, λ: Q×Σ→Δ. Moore: uscita sugli stati, λ: Q→Δ, un simbolo in più. Moore→Mealy: λ'(q,a) = λ(δ(q,a)). Mealy→Moore: stati (q, ultima uscita)."],
  ["A", "Dimostra che NFA e DFA sono equivalenti.", "Costruzione per sottoinsiemi: stati = insiemi, iniziale E({q₀}), δ'(R,a) = E(∪δ(q,a)), finali gli insiemi che intersecano F. Invariante sull'insieme degli stati raggiungibili."],
  ["A", "Dimostra che i regolari sono chiusi per intersezione e per complemento.", "Prodotto di DFA con finali F₁×F₂; complemento scambiando i finali in un DFA completo."],
  ["A", "Enuncia il teorema di Kleene e accenna alle due direzioni.", "Regolari = espressioni regolari. RE→NFA per induzione strutturale; NFA→RE con GNFA ed eliminazione degli stati (R₁R₂*R₃ ∪ R₄)."],
  ["A", "Enuncia il pumping lemma per i regolari e dimostralo.", "∃p ∀s∈L, |s|≥p ∃xyz: |y|≥1, |xy|≤p, ∀i xyⁱz∈L. p = numero di stati; principio dei cassetti sui primi p simboli."],
  ["A", "Dimostra che {0ⁿ1ⁿ} non è regolare.", "s = 0ᵖ1ᵖ; |xy|≤p implica y = 0ᵏ; xy²z ∉ L. Oppure Myhill–Nerode: 0ⁱ e 0ʲ distinguibili con 1ⁱ."],
  ["A", "Enuncia il teorema di Myhill–Nerode. A cosa serve?", "L regolare ⇔ ≡_L ha finite classi; il numero di classi è il numero di stati del DFA minimo. Serve a dimostrare non regolarità e a minimizzare."],
  ["B", "Definisci grammatica context-free e linguaggio generato. Cos'è una grammatica ambigua?", "(V, Σ, R, S) con regole A → w; L(G) = {w ∈ Σ* : S ⇒* w}. Ambigua: una stringa con due alberi sintattici (due derivazioni sinistre)."],
  ["B", "Descrivi la conversione in forma normale di Chomsky.", "Nuova iniziale; eliminazione delle ε-regole; eliminazione delle unitarie; spezzare i lati lunghi; isolare i terminali. In CNF una stringa di lunghezza n si deriva in 2n−1 passi."],
  ["B", "Definisci un automa a pila. Il non determinismo aggiunge potere?", "Sestupla con δ: Q×Σε×Γε → P(Q×Γε). Sì: wwᴿ è CF ma non deterministico CF."],
  ["B", "Come si costruisce un PDA da una grammatica?", "S$ sulla pila; in uno stato ciclo si espande la variabile in cima con una regola o si confronta il terminale in cima con l'input; con $ si accetta."],
  ["B", "Enuncia il pumping lemma per i CF e dimostra che {aⁿbⁿcⁿ} non è CF.", "uvxyz con |vy|≥1, |vxy|≤p. Con aᵖbᵖcᵖ la finestra tocca al più due lettere: pompando si sbilanciano i conteggi o si rompe l'ordine."],
  ["B", "Quali chiusure valgono per i CF? Perché non l'intersezione?", "Unione, concatenazione, stella, intersezione con regolari. Non intersezione: {aⁿbⁿcᵐ} ∩ {aᵐbⁿcⁿ}; non complemento per De Morgan."],
  ["B", "Descrivi la gerarchia di Chomsky.", "Tipo 3 regolari/automi finiti; tipo 2 CF/PDA; tipo 1 monotone/LBA; tipo 0 illimitate/macchine di Turing. Inclusioni strette."],
  ["C", "Descrivi il linguaggio S e definisci funzione parzialmente calcolabile.", "Variabili naturali X, Z, Y; istruzioni incremento, decremento, IF V≠0 GOTO L. f parzialmente calcolabile se f = Ψ_P per qualche programma."],
  ["C", "Definisci le funzioni primitive ricorsive e dimostra che sono calcolabili.", "Iniziali s, n, u; composizione e ricorsione primitiva. Le calcolabili formano una classe PRC, le p.r. sono la più piccola."],
  ["C", "Tutte le funzioni calcolabili totali sono primitive ricorsive?", "No: diagonalizzazione sull'elenco effettivo delle p.r., o la funzione di Ackermann."],
  ["C", "Che differenza c'è tra minimalizzazione limitata e non limitata?", "La limitata cerca t ≤ y e vale 0 se non trova: resta p.r. La non limitata può non terminare: produce funzioni parziali."],
  ["C", "Come si codifica un programma con un numero di Gödel?", "⟨x,y⟩ = 2ˣ(2y+1)−1; istruzione ⟨a,⟨b,c⟩⟩; programma [#I₁,…,#Iₖ] − 1. Ogni numero è un programma."],
  ["C", "Dimostra che HALT non è calcolabile.", "Programma [A] IF HALT(X,X) GOTO A con numero y₀: termina su x iff ¬HALT(x,x). Con x = y₀ contraddizione."],
  ["C", "Cosa dice il teorema di universalità?", "Esiste un programma U con Ψ_U(x, #P) = Ψ_P(x): simula qualunque programma codificando lo stato con un numero di Gödel."],
  ["C", "Definisci macchina di Turing, configurazione, riconoscere e decidere.", "Settupla con δ: Q×Γ → Q×Γ×{L,R}; configurazione u q v; riconosce se accetta esattamente L; decide se in più si ferma sempre."],
  ["C", "Enuncia la tesi di Church–Turing. Perché non è un teorema?", "Algoritmo intuitivo = macchina di Turing. Collega un concetto informale a uno formale; sostenuta dall'equivalenza dei modelli."],
  ["C", "Definisci insieme ricorsivo e r.e. Dimostra il teorema del complemento.", "Ricorsivo: predicato caratteristico calcolabile; r.e.: dominio di una parziale calcolabile. B ricorsivo ⇔ B e B̄ r.e., eseguendo in parallelo i semidecisori."],
  ["C", "Perché un insieme r.e. non vuoto è l'immagine di una funzione primitiva ricorsiva?", "Dovetailing: f(⟨x,t⟩) = x se il programma termina su x entro t passi, altrimenti un elemento fisso x₀."],
  ["C", "Cos'è una riduzione mediante funzione? In che verso va usata?", "f totale calcolabile con x∈A ⇔ f(x)∈B. Per dimostrare B indecidibile si riduce un problema noto indecidibile A a B."],
  ["C", "Enuncia e dimostra il teorema di Rice. A cosa non si applica?", "Proprietà non banali della funzione calcolata sono indecidibili; prova con K ≤ R_Γ via teorema del parametro. Non si applica a proprietà sintattiche."],
  ["C", "Cos'è il PCP? Quali problemi sulle grammatiche CF sono indecidibili?", "Esiste una sequenza di tessere con sopra = sotto? Indecidibile. Per le CFG: ambiguità, intersezione vuota, universalità, equivalenza."],
  ["D", "Definisci TIME(t(n)) e P. Perché P è robusta?", "Linguaggi decisi in O(t(n)) da una MdT a un nastro; P = ∪ TIME(nᵏ). Modelli deterministici ragionevoli si simulano con costo polinomiale."],
  ["D", "Definisci NP in due modi equivalenti.", "Verificatore polinomiale con certificato; MdT non deterministica polinomiale."],
  ["D", "Cosa significa NP-completo? Enuncia il teorema di Cook–Levin.", "In NP e tutti i problemi di NP vi si riducono in tempo polinomiale. SAT è NP-completo: tableau della computazione codificato in una formula polinomiale."],
  ["D", "Dimostra che CLIQUE è NP-completo.", "In NP (certificato: i k nodi). 3SAT ≤P CLIQUE: un nodo per letterale, archi tra letterali compatibili di clausole diverse, k = numero di clausole."]
];
W.oral = function () {
  const MOD = { A: "Regolari", B: "Context-free", C: "Calcolabilità", D: "Complessità" };
  const B = bench("Interrogazione", "Le domande escono in ordine casuale; filtra per modulo se vuoi ripassarne uno solo");
  const seg = h("div", { class: "seg", role: "group", "aria-label": "Modulo" });
  const box = h("div", { class: "oral" }), st = h("span", { class: "small" });
  let filter = "tutti", order = [], k = 0;
  function pool() { return ORALE.map((q, i) => i).filter(i => filter === "tutti" || ORALE[i][0] === filter); }
  function shuffle() { order = pool().map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]); k = 0; show(); }
  function show() {
    seg.replaceChildren(...["tutti", "A", "B", "C", "D"].map(m => h("button", { type: "button", class: m === filter ? "on" : "", onclick: () => { filter = m; shuffle(); } }, m === "tutti" ? "Tutti" : MOD[m])));
    const [m, q, a] = ORALE[order[k]];
    box.replaceChildren(h("div", { class: "small" }, MOD[m]), h("h3", null, q), h("details", null, h("summary", null, "Mostra i punti chiave"), h("div", { class: "ans" }, a)));
    st.textContent = `Domanda ${k + 1} di ${order.length}`;
  }
  B.body.append(h("div", { class: "controls" }, seg), h("div", { class: "controls" }, btn("Prossima domanda", () => { k = (k + 1) % order.length; show(); }, "primary"), btn("Rimescola", shuffle), st), box);
  shuffle();
  return B.el;
};
WREG["oral"] = () => W.oral();
