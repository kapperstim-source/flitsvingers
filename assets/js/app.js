/* Flitsvingers – cursus-app (lessen 1-30, proefexamen, examen, badges, ouderaccounts). */
(() => {
'use strict';

/* ================= instellingen ================= */
const CFG = {
  API_URL: (window.FV_CFG && window.FV_CFG.API_URL) || '',   // Google Apps Script-webapp (assets/js/config.js)
  SITE_URL: (window.FV_CFG && window.FV_CFG.SITE_URL) || 'https://flitsvingers.nl/',
  FREE: 3,                           // gratis proeflessen
  TEST_HASH: 'fd100fe306a2c9538c203a2bbc4e30ae40698f4cfa53bdeb0b650ff09bc2cb95',  // sha-256 van de testcode van Tim (vóór de lancering verwijderen)
  DAY_GOAL: 12 * 60,
  PROEF_SEC: 180, EXAM_SEC: 300,
  NORM: 100, NORM_DYS: 75, MAX_FOUT: 3,
  PROEF_FROM: 25
};
const VOICE_DIR = 'assets/audio/stem/';
const IMG = p => 'assets/img/flits_' + p + '.webp';

/* ================= opslag ================= */
const LS = 'flitsvingers_app_v2';
const DEF_SETTINGS = { voice: true, sfx: true, errSound: false, dys: false, calm: false, kbd: true, hands: true };
const rid = (n = 10) => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(n)); for (const x of r) s += a[x % a.length]; return s; };
function newProfile(nick, color) {
  return { id: rid(10), nick: nick || 'Speler', color: color || '#3a5bff', settings: { ...DEF_SETTINGS }, lessons: {}, xp: 0, days: {}, errs: {}, badges: {}, best: { apm: 0 }, proef: [], diploma: null, updated: Date.now() };
}
function loadDB() {
  let db = null;
  try { db = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
  if (!db || !db.profiles) db = { profiles: {}, current: null, session: null, testUnlock: false };
  if (!Object.keys(db.profiles).length) {
    try {
      const old = JSON.parse(localStorage.getItem('flitsvingers_v1'));
      if (old && old.nick) {
        const p = newProfile(old.nick, old.color);
        Object.assign(p, { settings: { ...DEF_SETTINGS, ...(old.settings || {}) }, lessons: old.lessons || {}, xp: old.xp || 0, days: old.days || {}, errs: old.errs || {} });
        db.profiles[p.id] = p; db.current = p.id;
      }
    } catch (e) {}
  }
  return db;
}
let DB = loadDB();
let S = DB.current && DB.profiles[DB.current] ? DB.profiles[DB.current] : null;
function fixProfile(p) {
  p.settings = { ...DEF_SETTINGS, ...(p.settings || {}) };
  ['lessons', 'days', 'errs', 'badges'].forEach(k => { p[k] = p[k] || {}; });
  p.best = p.best || { apm: 0 }; p.proef = p.proef || []; p.xp = p.xp || 0;
  return p;
}
if (S) fixProfile(S);
function persist() { try { localStorage.setItem(LS, JSON.stringify(DB)); } catch (e) {} }
function save() { if (!S) return; S.updated = Date.now(); DB.profiles[S.id] = S; DB.current = S.id; persist(); scheduleSync(); }

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const esc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/([\\'";\[\]`.,\/!?:-])/g, '\\$1');
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const isTestCode = async c => !!c && (await sha256(c)) === CFG.TEST_HASH;
const H = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rnd = a => a[Math.floor(Math.random() * a.length)];
const pad = n => String(n).padStart(2, '0');
const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dayKey(new Date());
const fmtTime = s => Math.floor(s / 60) + ':' + pad(Math.max(0, Math.floor(s % 60)));
const ICON = {
  star: '<svg viewBox="0 0 24 24" class="i fill"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" class="i"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  award: '<svg viewBox="0 0 24 24" class="i"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
  zap: '<svg viewBox="0 0 24 24" class="i fill"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  eyeoff: '<svg viewBox="0 0 24 24" class="i"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" class="i"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  redo: '<svg viewBox="0 0 24 24" class="i"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  target: '<svg viewBox="0 0 24 24" class="i"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" class="i"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  flag: '<svg viewBox="0 0 24 24" class="i"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  check: '<svg viewBox="0 0 24 24" class="i"><polyline points="20 6 9 17 4 12"/></svg>'
};
const starsHTML = (n, max = 3) => '<span class="stars">' + Array.from({ length: max }, (_, i) => i < n ? ICON.star : ICON.star.replace('class="i fill"', 'class="i fill off"')).join('') + '</span>';

/* ================= toetsenbord en vingers ================= */
const ROWS = [
  [['`'],['1'],['2'],['3'],['4'],['5'],['6'],['7'],['8'],['9'],['0'],['-'],['='],['⌫',2,'backspace']],
  [['Tab',1.5,'tab'],['q'],['w'],['e'],['r'],['t'],['y'],['u'],['i'],['o'],['p'],['['],[']'],['\\',1.5]],
  [['Caps',1.75,'caps'],['a'],['s'],['d'],['f'],['g'],['h'],['j'],['k'],['l'],[';'],["'"],['Enter',2.25,'enter']],
  [['Shift',2.25,'lshift'],['z'],['x'],['c'],['v'],['b'],['n'],['m'],[','],['.'],['/'],['Shift',2.75,'rshift']],
  [['',6.5,' ']]
];
const SHOW = { '1': '!<small>1</small>', '/': '?<small>/</small>', ';': ':<small>;</small>', "'": '"<small>\'</small>' };
const FMAP = {};
const assign = (f, keys) => keys.forEach(k => { FMAP[k] = f; });
assign('lp', ['`','1','q','a','z','tab','caps','lshift']);
assign('lr', ['2','w','s','x']);
assign('lm', ['3','e','d','c']);
assign('li', ['4','5','r','t','f','g','v','b']);
assign('ri', ['6','7','y','u','h','j','n','m']);
assign('rm', ['8','i','k',',']);
assign('rr', ['9','o','l','.']);
assign('rp', ['0','-','=','p','[',']','\\',';',"'",'/','enter','rshift','backspace']);
assign('th', [' ']);
const FCLASS = { lp:'pink', rp:'pink', lr:'ring', rr:'ring', lm:'middle', rm:'middle', li:'index', ri:'index', th:'thumb' };
const FNAME = { lp:'linker pink', lr:'linker ringvinger', lm:'linker middelvinger', li:'linker wijsvinger', ri:'rechter wijsvinger', rm:'rechter middelvinger', rr:'rechter ringvinger', rp:'rechter pink', th:'duim' };
const HOME = ['a','s','d','f','j','k','l',';'];
const HOMEKEY = { lp:'a', lr:'s', lm:'d', li:'f', ri:'j', rm:'k', rr:'l', rp:'l' };
const SHIFTED = { '?': '/', '!': '1', ':': ';', '"': "'" };
const CHARNAME = { ' ': 'Spatie', ',': 'Komma', '.': 'Punt', '?': 'Vraagteken', '!': 'Uitroepteken', '-': 'Streepje', ':': 'Dubbele punt', "'": 'Apostrof' };
const CLIPNAME = { ' ': 'spatie', ',': 'komma', '.': 'punt', '?': 'vraagteken', '!': 'uitroepteken', '-': 'streepje', ':': 'dubbelepunt', "'": 'apostrof' };
function keyOf(ch) {
  if (/[A-Z]/.test(ch)) return { key: ch.toLowerCase(), shift: true };
  if (SHIFTED[ch]) return { key: SHIFTED[ch], shift: true };
  return { key: ch, shift: false };
}
const shiftFor = key => (FMAP[key] || 'r')[0] === 'l' ? 'rshift' : 'lshift';
function clipsFor(ch) {
  if (/[A-Z]/.test(ch)) return [shiftFor(ch.toLowerCase()) === 'rshift' ? 'shift_rechts' : 'shift_links', 'toets_' + ch.toLowerCase()];
  return ['toets_' + (CLIPNAME[ch] || ch)];
}

function renderKeyboard(el) {
  el.innerHTML = '';
  ROWS.forEach(row => {
    const r = mk('div', 'krow');
    row.forEach(([label, w = 1, id]) => {
      const key = id != null ? id : label;
      const k = mk('div', 'key f-' + FCLASS[FMAP[key]]);
      k.style.setProperty('--w', w);
      k.dataset.key = key;
      if (SHOW[key]) k.innerHTML = SHOW[key]; else k.textContent = label.length === 1 ? label.toUpperCase() : label;
      if (key === 'f' || key === 'j') k.classList.add('bump');
      if (HOME.includes(key)) k.classList.add('home');
      r.appendChild(k);
    });
    el.appendChild(r);
  });
}
const keyEl = (el, k) => el.querySelector('[data-key="' + esc(k) + '"]');
function setNextKeys(el, keys) {
  el.querySelectorAll('.next').forEach(n => n.classList.remove('next'));
  keys.forEach(k => { const e = keyEl(el, k); if (e) e.classList.add('next'); });
}
function flashKey(el, k, cls) {
  const e = keyEl(el, k); if (!e) return;
  e.classList.add(cls); setTimeout(() => e.classList.remove(cls), cls === 'wrong' ? 260 : 120);
}
/* handen: vingers als afgeronde vormen met nagels */
function renderHands(svg) {
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  const add = (parent, tag, attrs) => { const e = document.createElementNS(NS, tag); for (const a in attrs) e.setAttribute(a, attrs[a]); parent.appendChild(e); return e; };
  const finger = (f, x, y, w, h, rot) => {
    const outer = add(svg, 'g', { transform: 'rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h) + ')' });
    const g = add(outer, 'g', { class: 'fg f-' + FCLASS[f], 'data-f': f });
    add(g, 'rect', { class: 'f', x, y, width: w, height: h, rx: w / 2 });
    add(g, 'ellipse', { class: 'nail', cx: x + w / 2, cy: y + w * 0.62, rx: w * 0.26, ry: w * 0.32 });
  };
  const L = [['lp', 46, 74, 30, 92, -9], ['lr', 84, 46, 32, 116, -4], ['lm', 124, 34, 34, 128, 0], ['li', 166, 50, 33, 112, 5]];
  L.forEach(([f, x, y, w, h, r]) => { finger(f, x, y, w, h, r); finger('r' + f.slice(1), 560 - x - w, y, w, h, -r); });
  finger('th', 214, 112, 30, 70, 48);
  finger('th', 316, 112, 30, 70, -48);
  add(svg, 'path', { class: 'palm', d: 'M44 150 Q40 128 66 126 L196 126 Q222 128 222 154 L214 196 Q210 208 196 208 L66 208 Q50 208 48 194 Z' });
  add(svg, 'path', { class: 'palm', d: 'M516 150 Q520 128 494 126 L364 126 Q338 128 338 154 L346 196 Q350 208 364 208 L494 208 Q510 208 512 194 Z' });
}
const setFingers = (svg, ids) => svg.querySelectorAll('.fg').forEach(f => f.classList.toggle('on', ids.includes(f.dataset.f)));

/* ================= geluid ================= */
let curAudio = null, queue = [];
function stopAudio() { queue = []; if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } }
function play(ids, force) {
  if ((!S || !S.settings.voice) && !force) return;
  stopAudio();
  queue = Array.isArray(ids) ? ids.slice() : [ids];
  playNext();
}
function playNext() {
  const id = queue.shift(); if (!id) return;
  try {
    const a = new Audio(VOICE_DIR + id + '.mp3');
    curAudio = a; a.onended = playNext; a.onerror = playNext;
    a.play().catch(() => {});
  } catch (e) {}
}
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function beep(freq, dur, type, vol, when) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol || .04, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function sfx(kind) {
  if (!S) return;
  if (kind === 'tick' && S.settings.sfx) beep(900, .035, 'sine', .018);
  if (kind === 'err' && S.settings.errSound) beep(190, .12, 'square', .022);
  if (kind === 'win' && S.settings.sfx) [523, 659, 784, 1047].forEach((f, i) => beep(f, .2, 'triangle', .04, i * .09));
  if (kind === 'step' && S.settings.sfx) [659, 880].forEach((f, i) => beep(f, .14, 'triangle', .035, i * .08));
}

/* ================= tijd en reeksen ================= */
const addSeconds = sec => { const k = today(); S.days[k] = (S.days[k] || 0) + sec; };
function streak(p = S) {
  let n = 0; const d = new Date();
  if ((p.days[dayKey(d)] || 0) < 60) d.setDate(d.getDate() - 1);
  while ((p.days[dayKey(d)] || 0) >= 60) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function weekSeconds(p = S) { let s = 0; const d = new Date(); for (let i = 0; i < 7; i++) { s += p.days[dayKey(d)] || 0; d.setDate(d.getDate() - 1); } return s; }

/* ================= data ================= */
let LES = [], ZONES = [], WORDS = [], NAMES = [], SENT = [], TEXTS = {}, EXAMS = [];
const lessonById = id => LES.find(l => l.id === id);
const isDone = id => !!(S.lessons[id] && S.lessons[id].done);
function firstOpen() { for (const l of LES) if (!isDone(l.id)) return l.id; return null; }
const unlocked = () => !!(DB.session && DB.session.token) || !!DB.testUnlock;
const paidOk = id => id <= CFG.FREE || unlocked();
function reachable(id) {
  if (DB.testUnlock) return true;
  if (isDone(id)) return true;
  const fo = firstOpen();
  if (id === 29) return isDone(CFG.PROEF_FROM) || isDone(28);
  if (id === 30) return isDone(28);
  return fo != null && id <= fo;
}

/* ================= oefeningen maken ================= */
function allowedFor(id) {
  const set = new Set([' ']); let shift = false;
  for (const l of LES) { if (l.id > id) break; for (const k of l.nieuw) { if (k === 'SHIFT') shift = true; else set.add(k); } }
  return { set, shift };
}
function okChars(text, al) {
  for (const ch of text) {
    if (/[A-Z]/.test(ch)) { if (!al.shift || !al.set.has(ch.toLowerCase())) return false; }
    else if (!al.set.has(ch)) return false;
  }
  return true;
}
const newLettersOf = L => L.nieuw.filter(k => k.length === 1 && /[a-z,.]/.test(k));
function genDrill(L) {
  const keys = newLettersOf(L).slice(0, 3); const parts = [];
  keys.forEach(k => { const h = HOMEKEY[FMAP[k]] || 'f'; parts.push(k + k + k, h + k + h, k + h + k, k + k); });
  return parts.join(' ');
}
function genCombi(L, al) {
  const keys = newLettersOf(L); const homes = ['a', 's', 'd', 'f', 'j', 'k', 'l'].filter(c => al.set.has(c)); const parts = [];
  for (let i = 0; i < 8; i++) { const k = keys[i % keys.length]; const a = rnd(homes), b = rnd(homes); parts.push(i % 2 ? a + k + b : k + a + k); }
  return parts.join(' ');
}
function genWords(L, al, n) {
  const pool = WORDS.filter(w => w.length <= 11 && okChars(w, al));
  const nl = newLettersOf(L).filter(c => /[a-z]/.test(c));
  const withNew = nl.length ? shuffle(pool.filter(w => nl.some(k => w.includes(k)))) : [];
  const nNew = Math.min(withNew.length, Math.ceil(n * 0.65));
  const chosen = withNew.slice(0, nNew);
  const rest = shuffle(pool.filter(w => !chosen.includes(w)));
  while (chosen.length < n && rest.length) chosen.push(rest.pop());
  while (chosen.length < n && pool.length) chosen.push(rnd(pool));
  return shuffle(chosen).join(' ');
}
const sentPool = al => SENT.filter(s => okChars(s.t, al) && (!al.shift || /^[A-Z]/.test(s.t)));
function genSentences(L, al, n, thema) {
  const pool = sentPool(al);
  const pref = thema ? shuffle(pool.filter(s => s.thema === thema)) : [];
  const nl = newLettersOf(L).concat(L.nieuw.filter(k => /^[?!:'\-0-9]$/.test(k)));
  const withNew = nl.length ? shuffle(pool.filter(s => nl.some(k => s.t.includes(k)))) : [];
  const chosen = [];
  [pref, withNew, shuffle(pool)].forEach(src => { for (const s of src) { if (chosen.length >= n) break; if (!chosen.includes(s)) chosen.push(s); } });
  let txt = chosen.map(s => s.t).join(' ');
  if (chosen.length < n) txt = (txt ? txt + ' ' : '') + genWords(L, al, (n - chosen.length) * 4);
  return txt;
}
function genNames(al, n) {
  const pool = NAMES.filter(w => okChars(w, al));
  return shuffle(pool).slice(0, n).join(' ');
}
function genLong(L, al, minLen) {
  let out = '';
  const pool = shuffle(sentPool(al));
  let i = 0;
  while (out.length < minLen && pool.length) { out += (out ? ' ' : '') + pool[i % pool.length].t; i++; }
  return out || genWords(L, al, 40);
}
function buildExercise(L, spec) {
  const al = allowedFor(L.id);
  const base = { label: spec.label, blind: !!spec.blind, kind: 'normal' };
  switch (spec.soort) {
    case 'vast': return { ...base, text: spec.tekst };
    case 'drill': return { ...base, text: genDrill(L) };
    case 'combi': return { ...base, text: genCombi(L, al) };
    case 'woorden': return { ...base, text: genWords(L, al, spec.aantal || 7) };
    case 'zinnen': return { ...base, text: genSentences(L, al, spec.aantal || 2, spec.thema) };
    case 'namen': return { ...base, text: genNames(al, spec.aantal || 6) };
    case 'tekst': return { ...base, text: TEXTS[spec.thema] || genLong(L, al, 300), long: true };
    case 'race': return { ...base, kind: 'race', tempo: spec.tempo || 50, text: genWords(L, al, spec.aantal || 8) };
    case 'snelheid': return { ...base, kind: 'speed', seconds: spec.seconden || 60, text: genLong(L, al, 700), long: true };
    default: return { ...base, text: genWords(L, al, 6) };
  }
}
function buildExam(kind) {
  const a = shuffle(EXAMS);
  return { label: kind === 'examen' ? 'Examen' : 'Proefexamen', kind: 'exam', exam: kind, seconds: kind === 'examen' ? CFG.EXAM_SEC : CFG.PROEF_SEC, text: a.join(' '), long: true };
}

/* ================= algemene UI ================= */
function applySettings() {
  const b = document.body.classList;
  b.toggle('dys', S.settings.dys); b.toggle('calm', S.settings.calm);
  b.toggle('nokbd', !S.settings.kbd); b.toggle('nohands', !S.settings.hands);
}
function renderTop() {
  if (!S) return;
  const st = streak();
  $('#chip-streak').innerHTML = ICON.zap + st + (st === 1 ? ' dag' : ' dagen');
  $('#chip-xp').innerHTML = ICON.star + S.xp + ' punten';
  $('#chip-nick').innerHTML = '<span class="avatar" style="background:' + S.color + '">' + H(S.nick.charAt(0).toUpperCase()) + '</span><span class="hide-sm">' + H(S.nick) + '</span>';
}
let screen = 'loading';
function show(id) {
  screen = id;
  $('#loading').style.display = 'none';
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + id));
  window.scrollTo({ top: 0, behavior: 'auto' });
  renderTop();
}
const toastQ = [];
function toast(msg) { toastQ.push(msg); if (toastQ.length === 1) showToast(); }
function showToast() {
  const t = $('#toast'); t.textContent = toastQ[0]; t.classList.add('on');
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => { toastQ.shift(); if (toastQ.length) showToast(); }, 300); }, 2600);
}
function confetti() {
  if (S.settings.calm || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#ffc93c', '#3a5bff', '#16b277', '#ff6fa8', '#ff9f43'];
  for (let i = 0; i < 70; i++) {
    const c = mk('div', 'confetti');
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
    c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = (Math.random() * .4) + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3800);
  }
}
document.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.closest('.sheet')) setTimeout(() => b.blur(), 0); });

/* ================= route ================= */
const PATH = [[330,640],[430,605],[550,625],[670,630],[780,600],[860,575],[905,520],[930,490],[985,450],[1050,415],[1115,372],[1165,345],[1235,333],[1300,352],[1330,402],[1305,458],[1282,508],[1300,560],[1350,592],[1425,606],[1505,598],[1580,573],[1640,540],[1700,470]];
function pathPoints(n) {
  const seg = []; let tot = 0;
  for (let i = 1; i < PATH.length; i++) { const d = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); seg.push(d); tot += d; }
  const pts = [];
  for (let k = 0; k < n; k++) {
    let t = tot * k / (n - 1), i = 0;
    while (i < seg.length - 1 && t > seg[i]) { t -= seg[i]; i++; }
    const f = seg[i] ? t / seg[i] : 0;
    pts.push([(PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * f) / 2000 * 100, (PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * f) / 848 * 100]);
  }
  return pts;
}
function nodeState(i) {
  const L = lessonById(i);
  const st = { cls: '', label: String(i), title: 'Les ' + i + ': ' + L.titel };
  if (isDone(i)) st.cls = 'done';
  else if (!paidOk(i)) st.cls = 'locked';
  else if (reachable(i)) st.cls = 'open';
  else st.cls = 'locked';
  if (i === firstOpen() && paidOk(i)) st.cls += ' next';
  if (i === 30) st.cls += ' exam';
  return st;
}
function onNode(i) {
  if (!paidOk(i)) return lockedModal(i);
  if (!reachable(i)) return toast('Eerst les ' + firstOpen() + ' afmaken, dan gaat deze open.');
  openLesson(i);
}
function renderMap() {
  const fo = firstOpen();
  const secs = S.days[today()] || 0, dayDone = secs >= CFG.DAY_GOAL;
  $('#hello-title').textContent = 'Hoi ' + S.nick + '!';
  let sub;
  if (fo === 1) sub = 'Ik ben Flits. Samen leer je typen met tien vingers, zonder te kijken. Een les duurt ongeveer 10 minuten, en fouten maken mag.';
  else if (fo && !paidOk(fo)) sub = 'Je hebt de gratis proeflessen gedaan. Knap hoor! Met de volledige cursus leer je alle letters, en haal je je diploma.';
  else if (fo === 30) sub = 'Je bent klaar voor het examen! Oefen eerst met het proefexamen als je wilt.';
  else if (fo) sub = 'Lekker bezig! Klaar voor les ' + fo + '? Fouten maken mag: je hoeft nooit opnieuw te beginnen.';
  else sub = 'Je hebt alles gehaald. Je bent een echte Flitsvingers!';
  $('#hello-sub').textContent = sub;
  $('#hello-img').src = IMG(dayDone ? 'rust' : (S.diploma ? 'diploma' : 'zwaai'));
  const btn = $('#btn-continue');
  if (fo && paidOk(fo)) { btn.innerHTML = (fo === 30 ? 'Naar het examen' : 'Verder met les ' + fo) + ' <span class="kbdhint">Enter</span>'; btn.onclick = () => openLesson(fo); }
  else if (fo) { btn.innerHTML = 'Ontgrendel de cursus'; btn.onclick = () => lockedModal(fo); }
  else { btn.innerHTML = 'Bekijk je diploma'; btn.onclick = () => openDiploma(); }
  const pb = $('#btn-proef');
  pb.hidden = !(paidOk(29) && reachable(29));
  pb.onclick = () => openLesson(29);
  $('#dayring').style.setProperty('--p', Math.min(100, secs / CFG.DAY_GOAL * 100));
  $('#daymin').textContent = Math.floor(secs / 60);
  $('#day-msg').textContent = dayDone ? 'Je dag is af! Extra oefenen mag, maar hoeft niet. Morgen verder.' : '12 minuten per dag is genoeg. Daarna is je dag af.';
  const nb = Object.keys(S.badges).length;
  $('#minis').innerHTML = '<span class="chip">' + ICON.star + nb + ' stickers</span>' + (S.best.apm ? '<span class="chip">' + ICON.zap + 'record ' + S.best.apm + '/min</span>' : '');
  $('#route-sub').textContent = Object.keys(S.lessons).filter(k => S.lessons[k].done).length + ' van 30 lessen gehaald';
  /* kaart */
  const mw = $('#mapwrap');
  mw.querySelectorAll('.mnode,.mflits').forEach(e => e.remove());
  const pts = pathPoints(30);
  pts.forEach(([x, y], k) => {
    const i = k + 1, st = nodeState(i);
    const n = mk('button', 'mnode ' + st.cls);
    n.style.left = x + '%'; n.style.top = y + '%';
    n.innerHTML = i === 30 ? ICON.award : (st.cls.includes('locked') && !isDone(i) ? ICON.lock : i);
    n.title = st.title; n.setAttribute('aria-label', st.title);
    n.onclick = () => onNode(i);
    mw.appendChild(n);
  });
  const here = pts[Math.max(0, (fo || 30) - 1)];
  const fl = mk('img', 'mflits'); fl.src = IMG('zwaai'); fl.alt = ''; fl.style.left = here[0] + '%'; fl.style.top = here[1] + '%';
  mw.appendChild(fl);
  /* rooster (smalle schermen) */
  const route = $('#route'); route.innerHTML = '';
  for (let i = 1; i <= 30; i++) {
    const st = nodeState(i), n = mk('button', 'node ' + st.cls);
    if (i === 30) n.innerHTML = ICON.award;
    else if (isDone(i)) n.innerHTML = i + starsHTML(S.lessons[i].stars);
    else n.innerHTML = st.cls.includes('locked') ? ICON.lock : String(i);
    n.title = st.title; n.onclick = () => onNode(i);
    route.appendChild(n);
  }
  /* gebieden */
  $('#zones').innerHTML = ZONES.map(z => {
    const tot = z.tot - z.van + 1; let d = 0;
    for (let i = z.van; i <= z.tot; i++) if (isDone(i)) d++;
    return '<div class="zone"><b>' + H(z.naam) + '</b><span>Les ' + z.van + ' t/m ' + z.tot + ' · ' + d + '/' + tot + '</span><div class="bar"><i style="width:' + Math.round(d / tot * 100) + '%"></i></div></div>';
  }).join('');
  /* oproep */
  const cta = $('#cta');
  if (unlocked()) {
    $('#cta-title').textContent = S.diploma ? 'Je diploma' : 'Op weg naar je diploma';
    $('#cta-text').textContent = S.diploma ? 'Gefeliciteerd! Bekijk, print of deel je diploma.' : 'Bij het examen typ je 5 minuten lang. Haal je ' + (S.settings.dys ? CFG.NORM_DYS : CFG.NORM) + ' aanslagen per minuut met maximaal 3% fouten, dan krijg je je diploma.';
    const b = $('#cta-btn'); b.textContent = S.diploma ? 'Bekijk diploma' : 'Bekijk je stickers'; b.removeAttribute('href');
    b.onclick = e => { e.preventDefault(); S.diploma ? openDiploma() : openBadges(); };
  } else {
    $('#cta-title').textContent = 'Vond je het leuk?';
    $('#cta-text').textContent = 'De volledige cursus: 30 lessen, races, proefexamens en een echt diploma. Eenmalig €49, geen abonnement.';
    const b = $('#cta-btn'); b.textContent = 'Bekijk de cursus'; b.href = 'index.html#prijs'; b.onclick = null;
  }
  cta.hidden = false;
}

/* ================= lessen openen ================= */
let curLesson = null;
function openLesson(id) {
  const L = lessonById(id); if (!L) return;
  if (!paidOk(id)) return lockedModal(id);
  curLesson = L; R = null;
  stopTimers();
  const zone = ZONES.find(z => id >= z.van && id <= z.tot);
  $('#intro-kicker').textContent = 'Les ' + id + ' van 30' + (zone ? ' · ' + zone.naam : '');
  $('#intro-title').textContent = L.titel;
  const kn = $('#intro-keys'); kn.innerHTML = '';
  L.nieuw.forEach(k => {
    const c = mk('div', 'kcap', k === 'SHIFT' ? 'Shift' : (k === ' ' ? 'Spatie' : k.toUpperCase()));
    const f = FMAP[k === 'SHIFT' ? 'lshift' : k];
    c.style.background = 'var(--f-' + (FCLASS[f] || 'thumb') + ')';
    kn.appendChild(c);
  });
  $('#intro-text').textContent = L.intro;
  const exl = $('#intro-exlist');
  const examLike = L.soort === 'proef' || L.soort === 'examen';
  exl.innerHTML = examLike ? '' : L.oefeningen.map((o, i) => '<span>' + (i + 1) + '. ' + H(o.label) + '</span>').join('');
  $('#intro-visual').hidden = examLike;
  const prep = $('#exam-prep');
  prep.hidden = !examLike;
  const startBtn = $('#intro-start');
  startBtn.disabled = false;
  startBtn.innerHTML = 'Ik ben er klaar voor <span class="kbdhint">Spatie</span>';
  if (examLike) {
    const norm = S.settings.dys ? CFG.NORM_DYS : CFG.NORM;
    const isExam = L.soort === 'examen';
    prep.innerHTML = '<div class="grid4" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="stat"><b>' + (isExam ? 5 : 3) + ' min</b><span>typen</span></div>' +
      '<div class="stat"><b>' + norm + '</b><span>aanslagen per minuut</span></div>' +
      '<div class="stat"><b>max 3%</b><span>fouten</span></div></div>' +
      (S.settings.dys ? '<p style="font-weight:700">De dyslexie-modus staat aan, dus de eis is ' + CFG.NORM_DYS + ' aanslagen per minuut.</p>' : '') +
      (S.proef.length ? '<p style="font-weight:700;margin-top:8px">Je beste proefexamen: ' + Math.max(...S.proef.map(p => p.apm)) + ' aanslagen per minuut.</p>' : '') +
      (isExam ? '<label class="fl" for="dipname">Naam op het diploma (alleen de voornaam is genoeg)</label><input class="field" id="dipname" maxlength="30" placeholder="Bijvoorbeeld: Sam" autocomplete="off">' +
        '<label class="check"><input type="checkbox" id="parentok"><span>Ik ben de ouder of verzorger en kijk mee tijdens het examen. Mijn kind typt zelf, zonder hulp.</span></label>' : '');
    if (isExam) {
      startBtn.disabled = true;
      const chk = $('#parentok');
      chk.onchange = () => { startBtn.disabled = !chk.checked; };
    }
    startBtn.innerHTML = isExam ? 'Start het examen' : 'Start het proefexamen';
  } else {
    const kb = $('#kbd-intro'); renderKeyboard(kb);
    const keysShown = L.nieuw.map(k => k === 'SHIFT' ? ['lshift', 'rshift'] : [k]).flat();
    kb.querySelectorAll('.key').forEach(k => { if (!keysShown.includes(k.dataset.key) && !HOME.includes(k.dataset.key) && k.dataset.key !== ' ') k.classList.add('dim'); });
    setNextKeys(kb, keysShown);
    const h = $('#hands-intro'); renderHands(h); setFingers(h, keysShown.map(k => FMAP[k]).filter(Boolean));
  }
  show('intro');
  play('intro_' + id);
}
$('#intro-speak').onclick = () => curLesson && play('intro_' + curLesson.id, true);
$('#intro-start').onclick = () => startLesson();

/* ================= Flits in de oefening ================= */
let flitsTimer = null;
function setFlits(pose, say, ms) {
  const img = $('#flits-img'); clearTimeout(flitsTimer);
  if (!img.src.endsWith(IMG(pose))) img.src = IMG(pose);
  if (!S.settings.calm) { img.classList.remove('bounce'); void img.offsetWidth; img.classList.add('bounce'); }
  if (say != null) $('#flits-say').textContent = say;
  if (ms) flitsTimer = setTimeout(() => { if (R && R.ex) setFlits(R.ex.blind ? 'blind' : 'typen', R.ex.blind ? 'Niet spieken!' : 'Lekker bezig!'); }, ms);
}

/* ================= oefenen ================= */
let R = null;
const sink = $('#sink');
let composing = false, capsOn = false;
function focusSink() { if (screen === 'ex' && R && !R.waiting) { try { sink.focus({ preventScroll: true }); } catch (e) { sink.focus(); } } }
sink.addEventListener('compositionstart', () => { composing = true; });
sink.addEventListener('compositionend', () => { composing = false; drainSink(); });
sink.addEventListener('input', () => { if (!composing) drainSink(); });
sink.addEventListener('blur', () => { setTimeout(() => { $('#typebox').classList.toggle('unfocused', screen === 'ex' && R && !R.waiting && document.activeElement !== sink && $('#modal').hidden); }, 60); });
sink.addEventListener('focus', () => $('#typebox').classList.remove('unfocused'));
$('#typebox').addEventListener('mousedown', e => { if (!e.target.closest('button')) { e.preventDefault(); focusSink(); } });
function drainSink() {
  const v = sink.value; sink.value = '';
  for (let ch of v) {
    if (ch === '\u2019' || ch === '\u2018') ch = "'";
    if (ch === '\u00a0') ch = ' ';
    typeChar(ch);
  }
}
sink.addEventListener('keydown', e => {
  capsOn = e.getModifierState && e.getModifierState('CapsLock');
  if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); return; }
  if (e.key === 'Enter') { e.preventDefault(); if (R && R.waiting) nextStep(); return; }
  if (e.key === ' ' && R && R.waiting) { e.preventDefault(); nextStep(); }
});

function stopTimers() { if (R) { clearInterval(R.tick); R.tick = null; } }
function startLesson() {
  if (!curLesson) return;
  stopAudio(); ac();
  const L = curLesson;
  const examLike = L.soort === 'proef' || L.soort === 'examen';
  if (examLike && L.soort === 'examen' && !$('#parentok').checked) return;
  const dipName = examLike && $('#dipname') ? $('#dipname').value.trim().slice(0, 30) : '';
  R = { lesson: L, idx: 0, results: [], lessonErrs: {}, shortenNext: false, examLike, dipName, dys: !!S.settings.dys };
  renderKeyboard($('#kbd-ex')); renderHands($('#hands-ex'));
  const touch = (navigator.maxTouchPoints || 0) > 0 && !matchMedia('(pointer: fine)').matches;
  $('#tablet-notice').classList.toggle('on', touch);
  show('ex');
  startExercise();
  if (examLike) play(L.soort === 'examen' ? 'examen_start' : 'proef_start');
}
function shorten(t) { const w = t.split(' '); return w.slice(0, Math.max(2, Math.ceil(w.length / 2))).join(' '); }
function startExercise(drillText) {
  const L = R.lesson;
  let ex;
  if (drillText) ex = { label: 'Herhaal-rondje', text: drillText, kind: 'normal' };
  else if (R.examLike) ex = buildExam(L.soort);
  else ex = buildExercise(L, L.oefeningen[R.idx]);
  R.drill = !!drillText;
  let text = ex.text.replace(/\s+/g, ' ').trim();
  if (!drillText && R.shortenNext && ex.kind === 'normal' && !ex.long) text = shorten(text);
  Object.assign(R, { ex, text, pos: 0, errors: 0, errAt: new Set(), consec: 0, active: 0, lastT: 0, waiting: false, spans: [], t0: 0, flitsDone: false });
  stopTimers();
  $('#ex-title').textContent = R.examLike ? L.titel : 'Les ' + L.id + ': ' + L.titel;
  $('#ex-sub').textContent = drillText ? 'Extra: alleen de lastige letters' : R.examLike ? 'Typ zo netjes mogelijk. De tijd start bij je eerste toets.' : 'Oefening ' + (R.idx + 1) + ' van ' + L.oefeningen.length + (R.shortenNext ? ' · iets korter, rustig aan' : '');
  R.shortenNext = false;
  const dots = $('#ex-dots'); dots.innerHTML = '';
  if (!drillText && !R.examLike) L.oefeningen.forEach((_, i) => dots.appendChild(mk('i', i < R.idx ? 'done' : i === R.idx ? 'cur' : '')));
  const lab = $('#ex-label');
  lab.className = 'exlabel' + (ex.blind ? ' blind' : '');
  lab.innerHTML = (ex.blind ? ICON.eyeoff : ex.kind === 'race' ? ICON.flag : (ex.kind === 'speed' || ex.kind === 'exam') ? ICON.clock : ICON.target) + H(ex.label);
  $('#s-ex').classList.toggle('blindmode', !!ex.blind);
  $('#ex-panel').classList.remove('on');
  $('#capswarn').classList.remove('on');
  const timed = ex.kind === 'speed' || ex.kind === 'exam';
  const tm = $('#timer'); tm.classList.toggle('on', timed); tm.classList.remove('low');
  if (timed) tm.textContent = fmtTime(ex.seconds);
  const race = $('#race'); race.classList.toggle('on', ex.kind === 'race');
  if (ex.kind === 'race') { const me = $('#run-me'); me.style.background = S.color; me.textContent = S.nick.charAt(0).toUpperCase(); me.style.left = '12%'; $('#run-fl').style.left = '12%'; }
  $('#line').classList.toggle('long', !!ex.long);
  buildLine(text);
  updateHint(); updateStats();
  if (ex.kind === 'race') { setFlits('juich', 'Klaar voor de race?'); play('race_start'); }
  else if (ex.kind === 'speed') { setFlits('typen', 'Een minuut, zo netjes mogelijk!'); if (!R.examLike) play('snel_start'); }
  else if (ex.blind) { setFlits('blind', 'Niet spieken!'); play('blind'); }
  else setFlits('typen', R.idx === 0 && !drillText ? 'Jij kunt dit!' : 'Lekker bezig!');
  if (ex.kind === 'exam') setFlits('typen', 'Rustig ademen. Je kunt dit!');
  focusSink();
  $('#typebox').classList.remove('unfocused');
}
function buildLine(text) {
  const line = $('#line'); line.innerHTML = ''; line.scrollTop = 0;
  const frag = document.createDocumentFragment();
  let w = mk('span', 'word'); frag.appendChild(w);
  [...text].forEach((ch, i) => {
    const s = mk('span', 'ch' + (ch === ' ' ? ' sp' : ''), ch === ' ' ? '\u00a0' : ch);
    w.appendChild(s); R.spans[i] = s;
    if (ch === ' ') { w = mk('span', 'word'); frag.appendChild(w); }
  });
  line.appendChild(frag);
  if (R.spans[0]) R.spans[0].classList.add('cur');
}
function keepVisible() {
  if (!R.ex.long) return;
  const s = R.spans[R.pos]; if (!s) return;
  const line = $('#line'), lh = s.offsetHeight || 40;
  const top = s.offsetTop;
  if (top - line.scrollTop > lh * 1.2 || top < line.scrollTop) line.scrollTop = Math.max(0, top - lh);
}
function updateHint(big) {
  const ch = R.text[R.pos]; if (ch == null) { $('#hint').innerHTML = ''; return; }
  const k = keyOf(ch), f = FMAP[k.key];
  let label = CHARNAME[ch] || ch.toUpperCase();
  let txt;
  if (/[A-Z]/.test(ch)) txt = '<b>Hoofdletter ' + ch + '</b>: houd ' + (shiftFor(k.key) === 'rshift' ? 'rechts' : 'links') + ' Shift vast en tik de ' + ch + ' met je ' + FNAME[f];
  else if (k.shift) txt = '<b>' + label + '</b>: houd ' + (shiftFor(k.key) === 'rshift' ? 'rechts' : 'links') + ' Shift vast en tik met je ' + FNAME[f];
  else txt = '<b>' + H(label) + '</b> met je ' + (FNAME[f] || 'vinger');
  $('#hint').innerHTML = '<span class="fdot" style="background:var(--f-' + (FCLASS[f] || 'thumb') + ')"></span>' + txt +
    (big ? ' <span class="bighint">· Kijk even naar het oplichtende toetsje, en dan weer niet kijken.</span>' : '') +
    ' <button class="speak" id="hint-speak" tabindex="-1">' + ICON.speaker + 'Hoor</button>';
  $('#hint-speak').onclick = () => { play(clipsFor(ch), true); setTimeout(focusSink, 0); };
  const keys = [k.key]; const fingers = [f];
  if (k.shift) { keys.push(shiftFor(k.key)); fingers.push(FMAP[shiftFor(k.key)]); }
  setNextKeys($('#kbd-ex'), keys);
  setFingers($('#hands-ex'), fingers);
}
const accOf = (len, errors) => len ? Math.round(len / (len + errors) * 100) : 100;
function elapsedMin() { return R.t0 ? (performance.now() - R.t0) / 60000 : 0; }
function updateStats() {
  $('#st-acc').textContent = accOf(R.pos, R.errors) + '%';
  const timed = R.ex.kind === 'speed' || R.ex.kind === 'exam';
  const mins = timed ? elapsedMin() : R.active / 60;
  $('#st-speed').textContent = (R.pos > 5 && mins > 0.05) ? Math.round(R.pos / mins) + ' aanslagen/min' : '–';
}
function startClock() {
  R.t0 = performance.now();
  if (R.ex.kind === 'speed' || R.ex.kind === 'exam' || R.ex.kind === 'race') {
    R.tick = setInterval(onTick, 200);
  }
}
function onTick() {
  if (!R || R.waiting) return;
  const ex = R.ex;
  if (ex.kind === 'race') {
    const fp = Math.min(1, elapsedMin() * ex.tempo / R.text.length);
    $('#run-fl').style.left = (12 + fp * 80) + '%';
    if (fp >= 1 && !R.flitsDone) { R.flitsDone = true; setFlits('juich', 'Ik ben er! Maak jij het af?'); }
  } else {
    const left = ex.seconds - elapsedMin() * 60;
    const tm = $('#timer'); tm.textContent = fmtTime(Math.ceil(left)); tm.classList.toggle('low', left <= 10);
    updateStats();
    if (left <= 0) finishExercise();
  }
}
function typeChar(ch) {
  if (!R || R.waiting || screen !== 'ex') return;
  if (ch === '\n' || ch === '\r') return;
  const target = R.text[R.pos];
  const now = performance.now();
  if (!R.t0) startClock();
  if (R.lastT) { const gap = (now - R.lastT) / 1000; if (gap < 8) { R.active += gap; addSeconds(gap); } }
  R.lastT = now;
  $('#capswarn').classList.toggle('on', capsOn && /[a-z]/i.test(ch) && ch !== target);
  const kb = $('#kbd-ex');
  if (ch === target) {
    flashKey(kb, keyOf(ch).key, 'hit');
    const s = R.spans[R.pos];
    s.classList.remove('cur', 'err'); s.classList.add('done'); if (R.errAt.has(R.pos)) s.classList.add('had');
    R.pos++; R.consec = 0;
    sfx('tick');
    if (R.ex.kind === 'race') $('#run-me').style.left = (12 + R.pos / R.text.length * 80) + '%';
    if (R.pos >= R.text.length) {
      if (R.ex.kind === 'speed' || R.ex.kind === 'exam') { appendMore(); }
      else { updateStats(); finishExercise(); return; }
    }
    R.spans[R.pos].classList.add('cur');
    keepVisible();
    updateHint();
  } else {
    R.errors++; R.errAt.add(R.pos); R.consec++;
    if (target !== ' ') { S.errs[target] = (S.errs[target] || 0) + 1; R.lessonErrs[target] = (R.lessonErrs[target] || 0) + 1; }
    sfx('err');
    flashKey(kb, keyOf(ch).key, 'wrong');
    const s = R.spans[R.pos];
    s.classList.remove('err'); void s.offsetWidth; s.classList.add('err');
    if (R.consec === 3 && !R.examLike) { updateHint(true); play(clipsFor(target)); setFlits('rustig', 'Rustig aan, je kunt het!', 3500); }
  }
  updateStats();
}
function appendMore() {
  const extra = ' ' + (R.examLike ? shuffle(EXAMS)[0] : genLong(R.lesson, allowedFor(R.lesson.id), 600));
  const start = R.text.length; R.text += extra;
  const line = $('#line');
  let w = mk('span', 'word'); line.appendChild(w);
  [...extra].forEach((ch, j) => {
    const s = mk('span', 'ch' + (ch === ' ' ? ' sp' : ''), ch === ' ' ? '\u00a0' : ch);
    w.appendChild(s); R.spans[start + j] = s;
    if (ch === ' ') { w = mk('span', 'word'); line.appendChild(w); }
  });
}
function finishExercise() {
  if (R.waiting) return;
  R.waiting = true; stopTimers();
  const ex = R.ex;
  const timed = ex.kind === 'speed' || ex.kind === 'exam';
  const mins = timed ? Math.max(elapsedMin(), 0.05) : Math.max(R.active / 60, 0.05);
  const correct = R.pos;
  const acc = accOf(correct, R.errors);
  const apm = Math.round(correct / mins);
  const fout = correct + R.errors ? Math.round(R.errors / (correct + R.errors) * 1000) / 10 : 0;
  try { sink.blur(); } catch (e) {}
  if (ex.kind === 'exam') { save(); return showExamResult({ apm, fout, acc, kind: ex.exam }); }
  const stars = acc >= 95 ? 3 : acc >= 85 ? 2 : 1;
  if (!R.drill) R.results.push({ acc, stars, apm, kind: ex.kind });
  if (acc === 100 && correct >= 20) award('foutloos');
  if (timed || ex.kind === 'race') { if (apm > (S.best.apm || 0)) S.best.apm = apm; }
  if (ex.kind === 'speed') { if (apm >= 50) award('snel50'); if (apm >= 100) award('snel100'); }
  const won = ex.kind === 'race' && !R.flitsDone;
  if (won) award('race');
  save();
  const last = R.drill || R.idx >= R.lesson.oefeningen.length - 1;
  let msg, pose, clip;
  if (ex.kind === 'race') { msg = won ? 'Je was sneller dan Flits!' : 'Flits was net iets sneller.'; pose = won ? 'juich' : 'duim'; clip = won ? 'race_win' : 'race_lose'; }
  else if (ex.kind === 'speed') { msg = apm + ' aanslagen per minuut!'; pose = 'juich'; clip = acc >= 95 ? 'top_2' : 'goed'; }
  else if (acc >= 95) { const n = 1 + Math.floor(Math.random() * 3); msg = ['Superstrak!', 'Wauw, bijna foutloos!', 'Dit gaat heel goed!'][n - 1]; pose = 'juich'; clip = 'top_' + n; }
  else if (acc >= 85) { msg = 'Goed bezig! Nauwkeurig is belangrijker dan snel.'; pose = 'duim'; clip = 'goed'; }
  else { msg = 'Rustig aan, dat is helemaal oké.' + (last ? '' : ' De volgende oefening is wat korter.'); pose = 'rustig'; clip = 'rustig'; if (!last) R.shortenNext = true; }
  const p = $('#ex-panel');
  p.innerHTML = '<img src="' + IMG(pose) + '" alt="">' +
    '<div>' + starsHTML(stars) + '<h3>' + (R.drill ? 'Herhaal-rondje klaar!' : H(msg)) + '</h3>' +
    '<div class="muted" style="font-weight:700">' + acc + '% nauwkeurig' + (S.settings.dys ? '' : ' · ' + apm + ' aanslagen per minuut') + '</div>' +
    (ex.kind === 'race' && !won ? '<div style="font-weight:700;margin-top:4px">Volgende keer pak je hem!</div>' : '') +
    '<button class="btn" id="ex-next">' + (last ? 'Bekijk resultaat' : 'Volgende oefening') + ' <span class="kbdhint">Enter</span></button></div>';
  p.classList.add('on');
  $('#ex-next').onclick = nextStep;
  sfx('step');
  if (!R.drill) play(clip);
  setFingers($('#hands-ex'), []); setNextKeys($('#kbd-ex'), []);
  $('#typebox').classList.remove('unfocused');
}
function nextStep() {
  if (!R || !R.waiting) return;
  if (R.drill) { showResult(R.lastResult); return; }
  if (R.idx < R.lesson.oefeningen.length - 1) { R.idx++; startExercise(); }
  else finishLesson();
}
function finishLesson() {
  const L = R.lesson;
  const res = R.results;
  const acc = Math.round(res.reduce((a, r) => a + r.acc, 0) / res.length);
  const stars = acc >= 95 ? 3 : acc >= 85 ? 2 : 1;
  const apm = Math.round(res.reduce((a, r) => a + r.apm, 0) / res.length);
  const prev = S.lessons[L.id];
  const gained = 10 * stars + (prev && prev.done ? 0 : 20);
  S.xp += gained;
  S.lessons[L.id] = { done: true, stars: Math.max(stars, prev ? prev.stars || 0 : 0), acc: Math.max(acc, prev ? prev.acc || 0 : 0), apm, date: today() };
  const tricky = Object.entries(R.lessonErrs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  R.lastResult = { L, acc, stars, apm, gained, tricky };
  checkBadges(); save();
  sfx('win'); confetti();
  showResult(R.lastResult);
  play((S.days[today()] || 0) >= CFG.DAY_GOAL ? 'dag_af' : 'les_klaar');
}
function makeDrill(chars) {
  const parts = [];
  chars.slice(0, 2).forEach(c => {
    const k = keyOf(c).key, buddy = HOMEKEY[FMAP[k]] || 'f';
    if (/[A-Za-z]/.test(c)) parts.push(c + c + c, c + buddy, buddy + c, c + c);
    else parts.push(buddy + c + buddy, c + c, buddy + c);
  });
  return parts.join(' ');
}
function showResult(res) {
  R.waiting = true;
  const { L, acc, stars, apm, gained, tricky } = res;
  const secs = S.days[today()] || 0;
  const next = firstOpen();
  $('#result').innerHTML =
    '<img src="' + IMG(secs >= CFG.DAY_GOAL ? 'rust' : 'juich') + '" alt="Flits juicht">' +
    '<div>' + starsHTML(stars) +
    '<h1 style="margin-top:10px">Les ' + L.id + ' klaar!</h1>' +
    '<p style="font-size:17px;margin-top:6px">' + (stars === 3 ? 'Heel netjes getypt. Zo leer je het echt.' : stars === 2 ? 'Goed gedaan! Met een herhaal-rondje wordt het nog strakker.' : 'Knap dat je hebt doorgezet. Herhalen helpt echt.') + '</p>' +
    '<div class="grid4">' +
      '<div class="stat"><b>' + acc + '%</b><span>nauwkeurig</span></div>' +
      (S.settings.dys ? '<div class="stat"><b>' + Math.floor(secs / 60) + ' min</b><span>vandaag geoefend</span></div>' : '<div class="stat"><b>' + apm + '</b><span>aanslagen per minuut</span></div>') +
      '<div class="stat"><b>+' + gained + '</b><span>punten</span></div>' +
      '<div class="stat"><b>' + (L.nieuw.length ? L.nieuw.map(k => k === 'SHIFT' ? 'Shift' : k.toUpperCase()).join(' ') : Object.keys(S.badges).length) + '</b><span>' + (L.nieuw.length ? 'nieuwe toetsen' : 'stickers') + '</span></div>' +
    '</div>' +
    (tricky.length ? '<div class="muted" style="font-size:14px;font-weight:800">Lastige toetsen vandaag:</div><div class="tricky">' + tricky.map(c => '<span>' + H(CHARNAME[c] || c.toUpperCase()) + '</span>').join('') + '</div>' : '') +
    (secs >= CFG.DAY_GOAL ? '<p style="color:var(--mint);font-weight:800;margin-top:8px">Je dag is af! Extra oefenen mag, maar hoeft niet.</p>' : '') +
    '<div class="row" style="margin-top:18px">' +
      (next && paidOk(next) ? '<button class="btn" id="res-next">' + (next === 30 ? 'Naar het examen' : 'Volgende les') + ' <span class="kbdhint">Enter</span></button>'
        : next ? '<button class="btn yellow" id="res-unlock">Ontgrendel de volledige cursus</button>' : '') +
      (tricky.length ? '<button class="btn ghost" id="res-drill">' + ICON.redo + 'Herhaal-rondje</button>' : '') +
      '<button class="btn ghost" id="res-map">Naar de route</button>' +
    '</div></div>';
  show('result');
  const d = $('#res-drill'); if (d) d.onclick = () => { R.lessonErrs = {}; show('ex'); startExercise(makeDrill(tricky)); };
  const n = $('#res-next'); if (n) n.onclick = () => openLesson(next);
  const u = $('#res-unlock'); if (u) u.onclick = () => lockedModal(next);
  $('#res-map').onclick = () => { R = null; renderMap(); show('map'); };
}

/* ================= examens en diploma ================= */
function showExamResult({ apm, fout, acc, kind }) {
  const norm = R.dys ? CFG.NORM_DYS : CFG.NORM;
  const pass = apm >= norm && fout <= CFG.MAX_FOUT;
  const L = R.lesson;
  if (kind === 'proef') {
    S.proef.push({ apm, fout, date: today(), pass });
    if (S.proef.length > 30) S.proef.shift();
    if (pass) award('proef');
    if (apm > (S.best.apm || 0)) S.best.apm = apm;
    if (!isDone(29)) S.lessons[29] = { done: true, stars: pass ? 3 : 1, acc, apm, date: today() };
  }
  if (kind === 'examen' && pass) {
    S.lessons[30] = { done: true, stars: 3, acc, apm, date: today() };
    award('diploma');
  }
  checkBadges(); save();
  const tips = [];
  if (apm < norm) tips.push('Je tempo was ' + apm + '. Oefen nog wat snelheidsrondes en races, dan komt je tempo vanzelf omhoog.');
  if (fout > CFG.MAX_FOUT) tips.push('Je had ' + String(fout).replace('.', ',') + '% fouten. Typ iets rustiger: nauwkeurig gaat voor snel.');
  $('#result').innerHTML =
    '<img src="' + IMG(pass ? (kind === 'examen' ? 'diploma' : 'juich') : 'rustig') + '" alt="">' +
    '<div><h1>' + (kind === 'examen' ? (pass ? 'Geslaagd!' : 'Bijna!') : (pass ? 'Proefexamen gehaald!' : 'Proefexamen klaar')) + '</h1>' +
    '<div class="verdict ' + (pass ? 'ok' : 'no') + '">' + (pass ? ICON.check + 'Je haalt de eis' : 'Je haalt de eis nog net niet') + '</div>' +
    '<div class="grid4" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="stat"><b>' + apm + '</b><span>aanslagen per minuut (eis ' + norm + ')</span></div>' +
      '<div class="stat"><b>' + String(fout).replace('.', ',') + '%</b><span>fouten (max 3%)</span></div>' +
      '<div class="stat"><b>' + (kind === 'examen' ? 5 : 3) + ' min</b><span>getypt</span></div></div>' +
    (pass ? '' : '<p style="font-size:16px">' + tips.map(H).join('<br>') + '</p>') +
    '<div class="row" style="margin-top:18px">' +
      (kind === 'examen' && pass ? '<button class="btn mint" id="res-diploma">Maak mijn diploma</button>' : '') +
      (kind === 'proef' && pass && !isDone(30) ? '<button class="btn" id="res-exam">Naar het examen</button>' : '') +
      '<button class="btn ghost" id="res-again">' + ICON.redo + 'Nog een keer</button>' +
      '<button class="btn ghost" id="res-map">Naar de route</button>' +
    '</div></div>';
  show('result');
  if (pass) { sfx('win'); confetti(); }
  play(pass ? (kind === 'examen' ? 'geslaagd' : 'top_2') : 'bijna');
  const g = $('#res-diploma'); if (g) g.onclick = () => issueDiploma({ apm, fout, name: R.dipName || S.nick, dys: R.dys });
  const e = $('#res-exam'); if (e) e.onclick = () => openLesson(30);
  $('#res-again').onclick = () => openLesson(L.id);
  $('#res-map').onclick = () => { R = null; renderMap(); show('map'); };
}
async function issueDiploma(d) {
  const btn = $('#res-diploma'); if (btn) { btn.disabled = true; btn.textContent = 'Diploma wordt gemaakt...'; }
  const rec = { name: d.name, apm: d.apm, fout: d.fout, dys: !!d.dys, date: today() };
  let id = null;
  if (CFG.API_URL && DB.session && DB.session.token) {
    try { const r = await api('issueDiploma', { token: DB.session.token, kidId: S.id, ...rec }); id = r.id; } catch (e) { id = null; }
  }
  S.diploma = { ...rec, id, local: !id };
  save();
  openDiploma();
}
function diplomaUrl() {
  const dp = S.diploma; if (!dp) return null;
  if (dp.id) return CFG.SITE_URL + 'diploma.html?id=' + encodeURIComponent(dp.id);
  const data = btoa(unescape(encodeURIComponent(JSON.stringify({ n: dp.name, a: dp.apm, f: dp.fout, d: dp.date, y: dp.dys ? 1 : 0 }))));
  return 'diploma.html?l=' + encodeURIComponent(data);
}
function openDiploma() { const u = diplomaUrl(); if (u) window.open(u, '_blank'); }

/* ================= stickers ================= */
const BADGES = [
  ['les1', '1', 'Eerste les', 'Les 1 gehaald', () => isDone(1)],
  ['thuisrij', 'ASDF', 'Thuisrij-held', 'Les 3 gehaald', () => isDone(3)],
  ['bovenrij', 'QWE', 'Bovenrij-ster', 'Les 7 gehaald', () => isDone(7)],
  ['alfabet', 'A-Z', 'Het hele alfabet', 'Les 14 gehaald', () => isDone(14)],
  ['hoofd', 'Aa', 'Hoofdletter-baas', 'Les 16 gehaald', () => isDone(16)],
  ['cijfers', '123', 'Cijferkoning', 'Les 20 gehaald', () => isDone(20)],
  ['race', 'VS', 'Sneller dan Flits', 'Win een race', null],
  ['foutloos', '100%', 'Foutloos', 'Een oefening zonder één fout', null],
  ['streak3', '3', 'Drie dagen op rij', '3 dagen achter elkaar geoefend', () => streak() >= 3],
  ['streak7', '7', 'Een hele week', '7 dagen achter elkaar geoefend', () => streak() >= 7],
  ['snel50', '50', 'Flinke vaart', '50 aanslagen per minuut', null],
  ['snel100', '100', 'Bliksemsnel', '100 aanslagen per minuut', null],
  ['proef', 'P', 'Proefexamen gehaald', 'De eis gehaald bij het proefexamen', null],
  ['diploma', '★', 'Diploma!', 'Geslaagd voor het examen', null]
];
function award(id) {
  if (S.badges[id]) return;
  S.badges[id] = today();
  const b = BADGES.find(x => x[0] === id);
  if (b) setTimeout(() => toast('Nieuwe sticker: ' + b[2] + '!'), 900);
}
function checkBadges() { BADGES.forEach(([id, , , , fn]) => { if (fn && fn()) award(id); }); }
function openBadges() {
  openModal('<h2>Jouw stickerboek</h2><p style="margin-top:6px">' + Object.keys(S.badges).length + ' van de ' + BADGES.length + ' stickers verzameld.</p>' +
    '<div class="badges">' + BADGES.map(([id, ic, t, d]) => '<div class="badge' + (S.badges[id] ? ' got' : '') + '"><div class="bi">' + H(ic) + '</div><b>' + H(t) + '</b><small>' + H(d) + '</small></div>').join('') + '</div>');
}
$('#chip-xp').onclick = openBadges;

/* ================= modals ================= */
function openModal(html, opts = {}) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; $('#modal-x').style.display = opts.noClose ? 'none' : ''; $('#modal').dataset.noclose = opts.noClose ? '1' : ''; }
function closeModal() { $('#modal').hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); renderTop(); if (screen === 'map') renderMap(); setTimeout(focusSink, 50); }
$('#modal-x').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal').dataset.noclose) closeModal(); });

function lockedModal(id) {
  openModal('<img class="welcomeimg" src="' + IMG('wijs') + '" alt="">' +
    '<h2 style="text-align:center">Les ' + id + ' zit in de volledige cursus</h2>' +
    '<p style="text-align:center;margin:8px 0 18px">De volledige cursus heeft 30 lessen, races, proefexamens en een diploma. Eenmalig €49, geen abonnement. Heb je al een toegangscode? Log dan in als ouder.</p>' +
    '<div class="row" style="justify-content:center"><button class="btn" id="lk-login">Inloggen als ouder</button><a class="btn yellow" href="index.html#prijs">Bekijk de cursus</a></div>');
  $('#lk-login').onclick = openParents;
}

const SETTINGS = [
  ['voice', 'Flits praat mee', 'Flits legt alles hardop uit en noemt de lastige letters.'],
  ['sfx', 'Zachte geluidjes', 'Een zacht tikje bij elke goede toets.'],
  ['errSound', 'Geluid bij een fout', 'Staat standaard uit: fouten maken mag.'],
  ['dys', 'Dyslexie-modus', 'Rustiger lettertype, meer ruimte tussen letters, geen tempo in beeld en een lagere eis voor het diploma (75 per minuut).'],
  ['calm', 'Rustige modus', 'Geen animaties en geen confetti. Fijn bij veel prikkels.'],
  ['kbd', 'Toetsenbord op het scherm', 'Laat zien welke toets je moet hebben.'],
  ['hands', 'Handjes op het scherm', 'Laat zien welke vinger aan de beurt is.']
];
function openSettings() {
  openModal('<h2>Instellingen van ' + H(S.nick) + '</h2><p style="margin:6px 0 8px">Alles zit er standaard in, ook de dyslexie-modus.</p>' +
    SETTINGS.map(([k, t, d]) => '<label class="toggle"><span><b>' + t + '</b><small>' + d + '</small></span><span class="sw"><input type="checkbox" data-set="' + k + '"' + (S.settings[k] ? ' checked' : '') + '><span></span></span></label>').join('') +
    '<p style="font-size:13px;margin-top:12px">' + (DB.session ? 'Je voortgang wordt bewaard in je ouderaccount.' : 'Voortgang wordt alleen op dit apparaat bewaard.') + ' <a href="#" id="reset" style="color:var(--muted)">Voortgang van ' + H(S.nick) + ' wissen</a></p>');
  document.querySelectorAll('[data-set]').forEach(i => i.addEventListener('change', () => { S.settings[i.dataset.set] = i.checked; save(); applySettings(); }));
  $('#reset').onclick = ev => {
    ev.preventDefault();
    if (confirm('Weet je zeker dat je alle voortgang van ' + S.nick + ' wilt wissen?')) {
      const fresh = newProfile(S.nick, S.color); fresh.id = S.id; S = fresh; save(); closeModal(); renderMap(); show('map');
    }
  };
}
$('#btn-settings').onclick = openSettings;

const COLORS = ['#3a5bff', '#ff6fa8', '#16b277', '#ff9f43', '#9b6bff', '#18203a'];
function openWelcome(first) {
  openModal('<img class="welcomeimg" src="' + IMG('zwaai') + '" alt="Flits zwaait">' +
    '<h2 style="text-align:center">' + (first ? 'Hoi! Ik ben Flits.' : 'Nieuwe speler') + '</h2>' +
    '<p style="margin:6px 0 16px;text-align:center">' + (first ? 'Samen leren we typen met tien vingers, zonder te kijken. ' : '') + 'Hoe heet je? Je voornaam of een bijnaam is prima.</p>' +
    '<input class="field" id="nick" maxlength="14" placeholder="Bijvoorbeeld: Sam" autocomplete="off">' +
    '<div class="muted" style="font-size:14px;margin-top:14px;font-weight:800">Kies je kleur</div>' +
    '<div class="swatches">' + COLORS.map((c, i) => '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (i === 0 ? ' class="on"' : '') + ' aria-label="kleur"></button>').join('') + '</div>' +
    (first ? '<p style="font-size:13px;margin:12px 0 0">Je hebt een toetsenbord nodig: laptop, Chromebook, computer of tablet met los toetsenbord.</p>' : '') +
    '<button class="btn" id="nick-go" style="width:100%;margin-top:16px">' + (first ? 'Start' : 'Maak speler') + '</button>' +
    (first ? '<p style="text-align:center;margin-top:12px;font-size:14px"><a href="#" id="has-acc">Ik heb al een account (ouder)</a></p>' : ''), { noClose: first });
  let color = COLORS[0];
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; document.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); });
  const go = async () => {
    const v = $('#nick').value.trim().slice(0, 14) || 'Speler';
    if (DB.session && Object.keys(DB.profiles).length >= (DB.session.maxKids || 1) && !first) { toast('Je account is voor ' + DB.session.maxKids + ' kind(eren).'); return; }
    S = fixProfile(newProfile(v, color)); save(); applySettings();
    closeModal(); renderMap(); show('map');
  };
  $('#nick-go').onclick = go;
  $('#nick').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } });
  const ha = $('#has-acc'); if (ha) ha.onclick = e => { e.preventDefault(); openParents(); };
  setTimeout(() => { const n = $('#nick'); if (n) n.focus(); }, 50);
  if (first) play('welkom', true);
}
function openPlayers() {
  const list = Object.values(DB.profiles);
  openModal('<h2>Wie gaat er typen?</h2>' +
    '<div class="kids">' + list.map(p => '<button class="kid' + (p.id === S.id ? ' on' : '') + '" data-p="' + p.id + '"><span class="avatar" style="background:' + p.color + '">' + H(p.nick.charAt(0).toUpperCase()) + '</span><span>' + H(p.nick) +
      '<small>' + Object.values(p.lessons || {}).filter(x => x.done).length + ' van 30 lessen · ' + (p.xp || 0) + ' punten</small></span></button>').join('') + '</div>' +
    '<button class="btn ghost" id="add-kid" style="margin-top:14px">+ Nieuwe speler</button>');
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { S = fixProfile(DB.profiles[b.dataset.p]); DB.current = S.id; persist(); applySettings(); closeModal(); renderMap(); show('map'); });
  $('#add-kid').onclick = () => openWelcome(false);
}
$('#chip-nick').onclick = openPlayers;

function weekMailHTML(p) {
  const done = Object.entries(p.lessons || {}).filter(([, v]) => v.done);
  const accs = done.map(([, v]) => v.acc).filter(Boolean);
  const avg = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
  const hard = Object.entries(p.errs || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => CHARNAME[c] || c.toUpperCase());
  const wk = Math.round(weekSeconds(p) / 60);
  return '<div class="mail"><h4>Week-update van ' + H(p.nick) + '</h4><div class="muted" style="font-weight:700">Eén keer per week, nooit vaker.</div>' +
    '<ul><li>Deze week ' + wk + ' minuten geoefend</li><li>' + done.length + ' van de 30 lessen gehaald</li>' +
    '<li>Gemiddeld ' + (avg != null ? avg + '%' : '–') + ' nauwkeurig' + (p.best && p.best.apm ? ', record ' + p.best.apm + ' aanslagen per minuut' : '') + '</li>' +
    (hard.length ? '<li>Lastigste toetsen: ' + H(hard.join(', ')) + ' (komen vanzelf vaker terug)</li>' : '') +
    '</ul>Tip: een compliment werkt beter dan een herinnering. 10 tot 15 minuten per dag is genoeg.</div>';
}
function openParents() {
  if (DB.session && DB.session.token) {
    const kids = Object.values(DB.profiles);
    openModal('<h2>Voor ouders</h2><p style="margin-top:6px">Ingelogd als <b>' + H(DB.session.email) + '</b>.</p>' +
      kids.map(weekMailHTML).join('') +
      '<label class="toggle" style="margin-top:8px"><span><b>Wekelijkse mail</b><small>Elke zondagavond een korte update per kind.</small></span><span class="sw"><input type="checkbox" id="wm"' + (DB.session.mail !== false ? ' checked' : '') + '><span></span></span></label>' +
      '<div class="row" style="margin-top:14px"><button class="btn ghost" id="pl">Spelers beheren</button><button class="btn ghost" id="lo">Uitloggen</button></div>');
    $('#wm').onchange = async e => { DB.session.mail = e.target.checked; persist(); try { await api('setMail', { token: DB.session.token, mail: e.target.checked }); toast('Opgeslagen'); } catch (err) { toast('Opslaan lukte niet, probeer later opnieuw.'); } };
    $('#pl').onclick = openPlayers;
    $('#lo').onclick = () => { if (confirm('Uitloggen op dit apparaat?')) { DB.session = null; persist(); closeModal(); renderMap(); } };
    return;
  }
  openModal('<h2>Voor ouders</h2>' +
    '<p style="margin-top:6px">Log in met het e-mailadres waarmee je hebt betaald en de toegangscode uit je mail. Dan staat de voortgang veilig in je account, op elk apparaat, en krijg je de wekelijkse update.</p>' +
    '<label class="fl" for="lg-mail">E-mailadres</label><input class="field" id="lg-mail" type="email" autocomplete="email" placeholder="naam@voorbeeld.nl">' +
    '<label class="fl" for="lg-code">Toegangscode</label><input class="field" id="lg-code" autocomplete="off" placeholder="FLITS-XXXX-XXXX" style="text-transform:uppercase">' +
    '<div class="err" id="lg-err"></div>' +
    '<button class="btn" id="lg-go" style="width:100%">Inloggen</button>' +
    '<p style="font-size:13px;margin-top:12px">Nog geen code? Die krijg je per mail na je aankoop. <a href="index.html#prijs">Bekijk de cursus</a>.</p>' +
    (S ? '<h3 style="font-size:17px;margin-top:20px">Zo ziet de wekelijkse mail eruit</h3>' + weekMailHTML(S) : ''));
  const params = new URLSearchParams(location.search);
  if (params.get('email')) $('#lg-mail').value = params.get('email');
  if (params.get('code')) $('#lg-code').value = params.get('code');
  $('#lg-go').onclick = doLogin;
  $('#lg-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLogin(); } });
}
$('#btn-parents').onclick = openParents;

async function doLogin() {
  const email = $('#lg-mail').value.trim().toLowerCase();
  const code = $('#lg-code').value.trim().toUpperCase();
  const err = $('#lg-err');
  if (await isTestCode(code)) { DB.testUnlock = true; persist(); closeModal(); toast('Testmodus aan: alle lessen zijn open.'); renderMap(); return; }
  if (!email || !code) { err.textContent = 'Vul je e-mailadres en je toegangscode in.'; return; }
  if (!CFG.API_URL) { err.textContent = 'Inloggen lukt nu even niet. Probeer het later nog eens, of mail ons.'; return; }
  const btn = $('#lg-go'); btn.disabled = true; btn.textContent = 'Even geduld...';
  try {
    const r = await api('login', { email, code });
    DB.session = { email: r.email, token: r.token, maxKids: r.maxKids || 1, mail: r.mail !== false };
    if (r.kids && r.kids.length) {
      r.kids.forEach(k => { if (k.data) { const p = fixProfile(k.data); p.id = k.id; DB.profiles[p.id] = p; } });
      if (!r.kids.some(k => k.id === (S && S.id))) S = fixProfile(DB.profiles[r.kids[0].id]);
    } else if (S) {
      await api('saveKid', { token: DB.session.token, kid: S });
    }
    if (S) DB.current = S.id;
    persist();
    if (!S) { openWelcome(true); toast('Ingelogd! Vul nu de naam van je kind in.'); return; }
    closeModal(); applySettings(); renderMap(); show('map');
    toast('Ingelogd! Alle lessen zijn open.');
  } catch (e) {
    err.textContent = e.message === 'onbekend' ? 'Dit e-mailadres en deze code horen niet bij elkaar.' : 'Inloggen lukte niet. Controleer je gegevens of probeer het later opnieuw.';
    btn.disabled = false; btn.textContent = 'Inloggen';
  }
}

/* ================= server ================= */
async function api(action, data) {
  if (!CFG.API_URL) throw new Error('offline');
  const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...data }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'fout');
  return j;
}
let syncT = null;
function scheduleSync() {
  if (!CFG.API_URL || !DB.session || !DB.session.token || !S) return;
  clearTimeout(syncT);
  syncT = setTimeout(async () => { try { await api('saveKid', { token: DB.session.token, kid: S }); } catch (e) {} }, 2500);
}

/* ================= toetsen (buiten het typen) ================= */
document.addEventListener('keydown', e => {
  if (!$('#modal').hidden) { if (e.key === 'Escape' && !$('#modal').dataset.noclose) closeModal(); return; }
  if (e.target === sink) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const ae = document.activeElement;
  const onControl = ae && ae !== document.body && ae.matches('input,button,a,[role=button],textarea,select');
  if (screen === 'ex' && R) {
    if (R.waiting && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextStep(); return; }
    if (!R.waiting && e.key.length === 1) { focusSink(); }
    return;
  }
  if (screen === 'intro' && (e.key === ' ' || e.key === 'Enter') && !onControl) { e.preventDefault(); if (!$('#intro-start').disabled) startLesson(); return; }
  if (screen === 'result' && e.key === 'Enter' && !onControl) { e.preventDefault(); const n = $('#res-next'); if (n) n.click(); return; }
  if (screen === 'map' && e.key === 'Enter' && !onControl) { e.preventDefault(); $('#btn-continue').click(); }
});
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { stopTimers(); R = null; stopAudio(); renderMap(); show(b.dataset.go); }));

/* ================= start ================= */
async function boot() {
  try {
    const [les, tx] = await Promise.all([fetch('assets/data/lessen.json').then(r => r.json()), fetch('assets/data/teksten.json').then(r => r.json())]);
    LES = les.lessen; ZONES = les.zones;
    WORDS = [...new Set(tx.woorden.split(/\s+/).filter(Boolean))];
    NAMES = tx.namen.split(/\s+/).filter(Boolean);
    SENT = tx.zinnen; TEXTS = tx.teksten; EXAMS = tx.examens;
  } catch (e) {
    $('#loading').textContent = 'Laden lukte niet. Controleer je internetverbinding en ververs de pagina.';
    return;
  }
  const qp = new URLSearchParams(location.search);
  if (qp.get('test') && await isTestCode(qp.get('test'))) {           // testingang (samen met TEST_CODE verwijderen bij lancering)
    DB.testUnlock = true;
    if (qp.get('fast')) { CFG.PROEF_SEC = 12; CFG.EXAM_SEC = 15; }
    if (!Object.keys(DB.profiles).length) { const p = fixProfile(newProfile(qp.get('nick') || 'Test')); DB.profiles[p.id] = p; DB.current = p.id; }
    const upto = parseInt(qp.get('done') || '0', 10);
    if (upto) { const p = DB.profiles[DB.current]; for (let i = 1; i <= upto; i++) p.lessons[i] = { done: true, stars: 3, acc: 97, apm: 60, date: today() }; }
    persist();
    window.__fv = { LES: () => LES, buildExercise, buildExam, allowedFor, okChars };
  }
  if (!S || !DB.profiles[S.id]) {
    const any = DB.profiles[DB.current] || Object.values(DB.profiles)[0];
    if (any) { S = fixProfile(any); DB.current = S.id; }
  }
  if (S) { applySettings(); checkBadges(); renderMap(); show('map'); }
  else { S = fixProfile(newProfile('Speler')); applySettings(); renderMap(); show('map'); S = null; openWelcome(true); }
  const params = new URLSearchParams(location.search);
  if (params.get('code') || params.get('login')) openParents();
}
boot();
})();
