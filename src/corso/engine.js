/* engine.js — utilità DOM/SVG, disegno degli automi e motori di calcolo (NFA, Mealy, PDA, TM, linguaggio S, grammatiche) */
"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
let __uid = 0;
const uid = () => "u" + (++__uid);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of kids.flat()) {
    if (c == null) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function bench(title, hint) {
  const body = h("div", { class: "bench-body" });
  const el = h("section", { class: "bench" },
    h("div", { class: "bench-head" }, h("div", { class: "bench-title" }, title), hint ? h("div", { class: "bench-hint" }, hint) : null),
    body);
  return { el, body };
}
function btn(label, onclick, cls) { return h("button", { type: "button", class: cls || null, onclick }, label); }
function epsShow(w) { return w === "" ? "ε" : w; }
function parseList(text) {
  return text.split(",").map(t => t.trim()).filter(t => t.length).map(t => (t === "ε" || t === "eps" || t === "e") ? "" : t);
}
function shortlex(alpha, maxLen) {
  const out = [""];
  let layer = [""];
  for (let n = 1; n <= maxLen; n++) {
    const nx = [];
    for (const w of layer) for (const a of alpha) nx.push(w + a);
    out.push(...nx); layer = nx;
  }
  return out;
}

/* ---------- Disegno di un automa ---------- */
/* spec: {w,h,start, states:[{id,x,y,accept,label}], edges:[{from,to,label,bend,loop}], startDir} */
function drawAutomaton(spec, active) {
  active = active || {};
  const on = active.states || new Set();
  const onE = active.edges || new Set();
  const R = spec.r || 22;
  const id = uid();
  const svg = s("svg", { viewBox: `0 0 ${spec.w} ${spec.h}`, width: spec.w, height: spec.h, role: "img", "aria-label": spec.aria || "Diagramma dell'automa" });
  svg.append(s("defs", null,
    s("marker", { id: "ah" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
      s("path", { d: "M0,0 L10,5 L0,10 z", class: "arrowhead" })),
    s("marker", { id: "ao" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
      s("path", { d: "M0,0 L10,5 L0,10 z", style: "fill: var(--mark)" }))));
  const pos = {};
  for (const st of spec.states) pos[st.id] = st;
  // raggruppa archi con stessi estremi
  const groups = new Map();
  for (const e of spec.edges) {
    const k = e.from + "→" + e.to;
    if (!groups.has(k)) groups.set(k, { from: e.from, to: e.to, labels: [], bend: e.bend, loop: e.loop, lx: e.lx, ly: e.ly });
    const g = groups.get(k);
    g.labels.push(e.label);
    if (e.bend != null) g.bend = e.bend;
    if (e.loop != null) g.loop = e.loop;
  }
  const edgeLayer = s("g");
  for (const [k, g] of groups) {
    const a = pos[g.from], b = pos[g.to];
    if (!a || !b) continue;
    const isOn = onE.has(k);
    const label = g.labels.join(spec.sep || ", ");
    const grp = s("g", { class: "ed" + (isOn ? " on" : "") });
    const mk = `url(#${isOn ? "ao" : "ah"}${id})`;
    if (g.from === g.to) {
      const ang = ((g.loop != null ? g.loop : -90) * Math.PI) / 180;
      const rot = (t) => [Math.cos(ang + t), Math.sin(ang + t)];
      const d1 = rot(-0.45), d2 = rot(0.45), c1 = rot(-0.55), c2 = rot(0.55);
      const p1 = [a.x + R * d1[0], a.y + R * d1[1]], p2 = [a.x + R * d2[0], a.y + R * d2[1]];
      const q1 = [a.x + 3 * R * c1[0], a.y + 3 * R * c1[1]], q2 = [a.x + 3 * R * c2[0], a.y + 3 * R * c2[1]];
      grp.append(s("path", { d: `M${p1} C${q1} ${q2} ${p2}`, "marker-end": mk }));
      const lx = a.x + 2.75 * R * Math.cos(ang), ly = a.y + 2.75 * R * Math.sin(ang) + 4;
      grp.append(s("text", { x: lx, y: ly }, label));
    } else {
      const rev = groups.has(g.to + "→" + g.from);
      const bend = g.bend != null ? g.bend : (rev ? 18 : 0);
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const px = -dy / L, py = dx / L;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const cx = mx + px * bend * 2, cy = my + py * bend * 2;
      const u1x = cx - a.x, u1y = cy - a.y, l1 = Math.hypot(u1x, u1y) || 1;
      const u2x = cx - b.x, u2y = cy - b.y, l2 = Math.hypot(u2x, u2y) || 1;
      const sx = a.x + (u1x / l1) * R, sy = a.y + (u1y / l1) * R;
      const ex = b.x + (u2x / l2) * (R + 1), ey = b.y + (u2y / l2) * (R + 1);
      grp.append(s("path", { d: `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`, "marker-end": mk }));
      const side = bend >= 0 ? 1 : -1;
      const tx = mx + px * bend + px * 11 * side + (g.lx || 0), ty = my + py * bend + py * 11 * side + 4 + (g.ly || 0);
      grp.append(s("text", { x: tx, y: ty }, label));
    }
    edgeLayer.append(grp);
  }
  svg.append(edgeLayer);
  // freccia iniziale
  const st0 = pos[spec.start];
  if (st0) {
    const ang = ((spec.startDir != null ? spec.startDir : 180) * Math.PI) / 180;
    const x1 = st0.x + Math.cos(ang) * (R + 34), y1 = st0.y + Math.sin(ang) * (R + 34);
    const x2 = st0.x + Math.cos(ang) * (R + 1), y2 = st0.y + Math.sin(ang) * (R + 1);
    svg.append(s("g", { class: "ed" }, s("path", { d: `M${x1},${y1} L${x2},${y2}`, "marker-end": `url(#ah${id})` })));
  }
  for (const st of spec.states) {
    const g = s("g", { class: "st" + (on.has(st.id) ? " on" : "") });
    g.append(s("circle", { cx: st.x, cy: st.y, r: R }));
    if (st.accept) g.append(s("circle", { cx: st.x, cy: st.y, r: R - 5 }));
    g.append(s("text", { x: st.x, y: st.y }, st.label != null ? st.label : st.id));
    if (st.out != null) g.append(s("text", { x: st.x, y: st.y + R + 14, style: "font-size:12px;fill:var(--muted)" }, "/" + st.out));
    svg.append(g);
  }
  return svg;
}

/* ---------- NFA (con ε) — i DFA sono un caso particolare ---------- */
function buildNFA(spec) {
  const delta = {};
  for (const st of spec.states) delta[st.id] = {};
  for (const e of spec.edges) {
    for (let sym of String(e.label).split(",")) {
      sym = sym.trim();
      if (sym === "ε" || sym === "eps") sym = "";
      (delta[e.from][sym] = delta[e.from][sym] || []).push(e.to);
    }
  }
  const acc = new Set(spec.states.filter(x => x.accept).map(x => x.id));
  const nfa = {
    start: spec.start, delta, acc,
    eclose(set) {
      const out = new Set(set), stack = [...set];
      while (stack.length) {
        const q = stack.pop();
        for (const r of (delta[q][""] || [])) if (!out.has(r)) { out.add(r); stack.push(r); }
      }
      return out;
    },
    move(set, a) {
      const out = new Set();
      for (const q of set) for (const r of (delta[q][a] || [])) out.add(r);
      return out;
    },
    accepts(w) {
      let S = nfa.eclose(new Set([spec.start]));
      for (const a of w) S = nfa.eclose(nfa.move(S, a));
      return [...S].some(q => acc.has(q));
    }
  };
  return nfa;
}

/* costruzione per sottoinsiemi */
function subsetConstruction(spec, alphabet) {
  const nfa = buildNFA(spec);
  const key = (S) => "{" + [...S].sort().join(",") + "}";
  const start = nfa.eclose(new Set([spec.start]));
  const states = [start], index = { [key(start)]: 0 }, rows = [];
  for (let i = 0; i < states.length; i++) {
    const S = states[i], row = { name: key(S), set: S, to: {} };
    for (const a of alphabet) {
      const T = nfa.eclose(nfa.move(S, a));
      const k = key(T);
      if (!(k in index)) { index[k] = states.length; states.push(T); }
      row.to[a] = k;
    }
    row.accept = [...S].some(q => nfa.acc.has(q));
    rows.push(row);
  }
  return rows;
}

/* layout circolare automatico */
function circleLayout(names, w, hgt) {
  const n = names.length, cx = w / 2, cy = hgt / 2, rad = Math.min(w, hgt) / 2 - 60;
  return names.map((nm, i) => {
    const t = -Math.PI + (2 * Math.PI * i) / n;
    return { id: nm, x: n === 1 ? cx : cx + rad * Math.cos(t), y: n === 1 ? cy : cy + rad * Math.sin(t) };
  });
}

/* ---------- PDA non deterministico ---------- */
/* trans: [{from, read, pop, push, to}] — read/pop "" = ε; push stringa con la cima a sinistra */
function pdaRun(pda, w, maxSteps) {
  const limit = maxSteps || 60;
  let confs = [{ q: pda.start, i: 0, st: [], path: [] }];
  const history = [confs];
  for (let step = 0; step < limit && confs.length; step++) {
    const next = [], seen = new Set();
    for (const c of confs) {
      for (const t of pda.trans) {
        if (t.from !== c.q) continue;
        if (t.read !== "" && w[c.i] !== t.read) continue;
        if (t.pop !== "" && c.st[c.st.length - 1] !== t.pop) continue;
        const st = c.st.slice();
        if (t.pop !== "") st.pop();
        for (const ch of t.push.split("").reverse()) st.push(ch);
        if (st.length > w.length * 2 + 6) continue;
        const nc = { q: t.to, i: c.i + (t.read !== "" ? 1 : 0), st, path: c.path.concat([t]) };
        const k = nc.q + "|" + nc.i + "|" + nc.st.join("");
        if (seen.has(k)) continue;
        seen.add(k); next.push(nc);
      }
    }
    confs = next.slice(0, 300);
    history.push(confs);
  }
  return history;
}

/* ---------- Macchina di Turing a un nastro ---------- */
/* delta: {"q,a": [write, move, to]}, blank "_" */
function tmInit(tm, input) {
  const tape = {};
  input.split("").forEach((c, i) => tape[i] = c);
  return { q: tm.start, head: 0, tape, steps: 0, halted: null };
}
function tmStep(tm, c) {
  if (c.halted) return c;
  if (c.q === tm.accept) { c.halted = "accept"; return c; }
  if (c.q === tm.reject) { c.halted = "reject"; return c; }
  if (c.q === tm.halt) { c.halted = "halt"; return c; }
  const sym = c.tape[c.head] != null ? c.tape[c.head] : "_";
  const t = tm.delta[c.q + "," + sym];
  if (!t) { c.halted = tm.accept ? "reject" : "halt"; c.lastKey = null; return c; }
  c.tape[c.head] = t[0];
  c.head += t[1] === "R" ? 1 : t[1] === "L" ? -1 : 0;
  if (c.head < 0) c.head = 0;
  c.q = t[2];
  c.steps++;
  c.lastKey = c.q;
  c.lastRule = Object.keys(tm.delta).find(k => tm.delta[k] === t);
  if (c.q === tm.accept) c.halted = "accept";
  else if (c.q === tm.reject) c.halted = "reject";
  else if (c.q === tm.halt) c.halted = "halt";
  return c;
}

/* ---------- Linguaggio S di Davis–Sigal–Weyuker ---------- */
function parseS(src) {
  const lines = src.split("\n").map(l => l.replace(/#.*$/, "").trim()).filter(Boolean);
  const prog = [];
  for (const raw of lines) {
    let line = raw, label = null;
    const m = line.match(/^\[\s*([A-Z]\d*)\s*\]\s*(.*)$/);
    if (m) { label = m[1]; line = m[2]; }
    line = line.replace(/<-/g, "←").replace(/!=/g, "≠").replace(/\s+/g, " ");
    let mm;
    if ((mm = line.match(/^([XYZ]\d*) ← \1 \+ 1$/))) prog.push({ label, op: "inc", v: norm(mm[1]), text: raw });
    else if ((mm = line.match(/^([XYZ]\d*) ← \1 - 1$/))) prog.push({ label, op: "dec", v: norm(mm[1]), text: raw });
    else if ((mm = line.match(/^([XYZ]\d*) ← \1$/))) prog.push({ label, op: "nop", v: norm(mm[1]), text: raw });
    else if ((mm = line.match(/^IF ([XYZ]\d*) ≠ 0 GOTO ([A-Z]\d*)$/))) prog.push({ label, op: "goto", v: norm(mm[1]), L: normL(mm[2]), text: raw });
    else throw new Error("Istruzione non riconosciuta: «" + raw + "». Forme ammesse: V ← V + 1, V ← V - 1, V ← V, IF V ≠ 0 GOTO L");
    if (label) prog[prog.length - 1].label = normL(label);
  }
  return prog;
  function norm(v) { return v === "Y" ? "Y" : (v.length === 1 ? v + "1" : v); }
  function normL(l) { return l.length === 1 ? l + "1" : l; }
}
function runS(prog, inputs, limit) {
  const vars = { Y: 0 };
  inputs.forEach((x, i) => vars["X" + (i + 1)] = x);
  let pc = 0, steps = 0;
  const trace = [];
  const lim = limit || 5000;
  while (pc < prog.length && steps < lim) {
    const I = prog[pc];
    const v = vars[I.v] || 0;
    trace.push({ pc, vars: { ...vars } });
    if (I.op === "inc") { vars[I.v] = v + 1; pc++; }
    else if (I.op === "dec") { vars[I.v] = Math.max(0, v - 1); pc++; }
    else if (I.op === "nop") { pc++; }
    else if (I.op === "goto") {
      if (v !== 0) { const j = prog.findIndex(p => p.label === I.L); pc = j < 0 ? prog.length : j; }
      else pc++;
    }
    steps++;
  }
  return { y: vars.Y, vars, steps, halted: pc >= prog.length, trace };
}

/* ---------- Grammatiche context-free ---------- */
/* "S -> aSb | ε" ; variabili = lettere maiuscole */
function parseCFG(text) {
  const rules = {}; let start = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim(); if (!line) continue;
    const m = line.match(/^([A-Z])\s*(->|→)\s*(.*)$/);
    if (!m) throw new Error("Regola non riconosciuta: «" + line + "». Usa la forma A -> aAb | ε");
    if (!start) start = m[1];
    const alts = m[3].split("|").map(a => a.trim().replace(/\s+/g, "")).map(a => (a === "ε" || a === "eps") ? "" : a);
    (rules[m[1]] = rules[m[1]] || []).push(...alts);
  }
  return { start, rules };
}
const isVar = (c) => c >= "A" && c <= "Z";
function cfgGenerate(g, maxLen, maxForms) {
  const out = new Set(), seen = new Set([g.start]);
  let queue = [g.start];
  const cap = maxForms || 20000;
  while (queue.length && seen.size < cap) {
    const nq = [];
    for (const f of queue) {
      const i = [...f].findIndex(isVar);
      if (i < 0) { if (f.length <= maxLen) out.add(f); continue; }
      for (const alt of g.rules[f[i]] || []) {
        const nf = f.slice(0, i) + alt + f.slice(i + 1);
        const terms = [...nf].filter(c => !isVar(c)).length;
        if (terms > maxLen || nf.length > maxLen + 6) continue;
        if (!seen.has(nf)) { seen.add(nf); nq.push(nf); }
      }
    }
    queue = nq;
  }
  return [...out].sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
}

/* ---------- Codifiche di Gödel (BigInt) ---------- */
const PRIMES = (() => { const p = []; for (let n = 2; p.length < 60; n++) if (p.every(q => n % q)) p.push(n); return p; })();
function pairEnc(x, y) { return (2n ** BigInt(x)) * (2n * BigInt(y) + 1n) - 1n; }
function pairDec(z) {
  let n = BigInt(z) + 1n, x = 0;
  while (n % 2n === 0n) { n /= 2n; x++; }
  return [x, (n - 1n) / 2n];
}
function seqEnc(arr) { let r = 1n; arr.forEach((a, i) => r *= BigInt(PRIMES[i]) ** BigInt(a)); return r; }
function seqDec(z) {
  let n = BigInt(z); const out = [];
  if (n <= 0n) return null;
  for (let i = 0; i < PRIMES.length && n > 1n; i++) {
    const p = BigInt(PRIMES[i]); let e = 0;
    while (n % p === 0n) { n /= p; e++; }
    out.push(e);
  }
  if (n > 1n) return null;
  while (out.length && out[out.length - 1] === 0) out.pop();
  return out;
}
