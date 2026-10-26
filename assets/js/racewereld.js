/* Flitsvingers – racewereld van de cursus (sinds 26-10-2026, Tim koos proef "B + C").
   Kenney-modellen (CC0, kenney.nl), een baan met bochten, vier gebieden (dorp, strand, bergen, kampioenscircuit),
   garage, blinde tunnel, gloed (bloom), stof, splinters, confetti en geluid.
   Zelfde koppeling als de oude wereld3d.js (die blijft voor de mini-les op de homepage): app.js gebruikt
   window.FV3D.maak(box, opts) -> api. Lukt 3D niet, dan geeft maak() null en draait de cursus met de platte racebaan.
   De modellen laden op de achtergrond; alles wat app.js eerder vraagt, wordt toegepast zodra ze er zijn. */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/postprocessing/OutputPass.js';

const MAP3D = new URL('../3d/', import.meta.url).href, SFX = new URL('../audio/sfx/', import.meta.url).href, IMG = new URL('../img/', import.meta.url).href;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- modellen: één keer laden, gedeeld door de race- en de garagewereld ---------- */
const M = {}, laden = {};
const loader = new GLTFLoader();
function laad(pad) {
  if (!laden[pad]) laden[pad] = loader.loadAsync(MAP3D + pad + '.glb').then(g => { const sc = g.scene; sc.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(sc), c = bb.getCenter(V(0, 0, 0)), off = new THREE.Matrix4().makeTranslation(-c.x, -bb.min.y, -c.z), delen = [];
    sc.traverse(o => { if (o.isMesh) { if (o.material.roughness !== undefined) o.material.roughness = Math.max(.45, Math.min(o.material.roughness, .9)); delen.push({ geo: o.geometry, mat: o.material, m: off.clone().multiply(o.matrixWorld) }); } });
    M[pad] = { sc, delen }; return M[pad]; }).catch(e => { delete laden[pad]; throw e; });
  return laden[pad]; }
const BASIS = ['barrierRed', 'barrierWhite', 'toy/item-box', 'toy/item-coin-gold', 'toy/gate-finish', 'kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oozi', 'debris-spoiler-a'];
const GEBIED_MODELLEN = {
  dorp: ['dorp/building-type-a', 'dorp/building-type-b', 'dorp/building-type-c', 'dorp/building-type-d', 'dorp/building-type-e', 'dorp/building-type-f', 'dorp/building-type-g', 'dorp/building-type-h', 'dorp/tree-large', 'dorp/fence-1x3',
    'natuur/tree_oak', 'natuur/tree_default', 'natuur/tree_detailed', 'natuur/tree_fat', 'natuur/plant_bushLarge', 'natuur/plant_bush', 'natuur/flower_redA', 'natuur/flower_yellowA', 'natuur/flower_purpleA'],
  strand: ['natuur/tree_palmTall', 'natuur/tree_palmBend', 'natuur/tree_palmDetailedTall', 'strand/palm-detailed-bend', 'strand/palm-detailed-straight', 'strand/rocks-sand-a', 'strand/rocks-sand-b', 'strand/crate', 'strand/barrel', 'strand/boat-row-small', 'strand/ship-small'],
  bergen: ['winter/tree-snow-a', 'winter/tree-snow-b', 'winter/tree-snow-c', 'natuur/tree_pineTallA_detailed', 'natuur/tree_pineTallB_detailed', 'natuur/tree_pineRoundA', 'winter/rocks-large', 'winter/rocks-medium', 'winter/snowman', 'winter/snow-pile'],
  kasteel: ['grandStandCovered', 'bannerTowerRed', 'flagCheckers', 'lightPostLarge', 'tent', 'natuur/tree_default', 'natuur/tree_oak', 'natuur/tree_detailed'] };

/* ---------- vaste hulpjes ---------- */
function label(tekst, bg, fg, w = 512, h = 192, fs = 120, rand = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, h * .18); g.fill(); if (rand) { g.lineWidth = h * .07; g.strokeStyle = '#1b1f3a'; g.beginPath(); g.roundRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, h * .16); g.stroke(); }
  let f = fs; g.font = '700 ' + f + 'px Fredoka, sans-serif'; while (f > 20 && g.measureText(tekst).width > w * .86) { f -= 6; g.font = '700 ' + f + 'px Fredoka, sans-serif'; }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tekst, w / 2, h / 2 + f * .06);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function canvasTex(w, h, teken, rx = 1, ry = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; teken(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; }
const patroon = (soort, a, b) => canvasTex(256, 128, (g, w, h) => {
  if (soort === 'regenboog') { ['#e5484d', '#ff9f2f', '#ffd23f', '#12a26b', '#3a5bff', '#7b4dff'].forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); return; }
  g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b;
  if (soort === 'tijger') for (let i = 0; i < 9; i++) { const x = i * 30 + 6; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18, 0); g.lineTo(x + 6, 70); g.lineTo(x + 14, h); g.lineTo(x - 4, h); g.lineTo(x - 8, 60); g.closePath(); g.fill(); }
  if (soort === 'vlammen') { [['#ffd23f', 0, 22, 40], ['#ff9f2f', 8, 16, 26]].forEach(([k, d, top, bw]) => { g.fillStyle = k; for (let i = 0; i < 7; i++) { const x = i * 40 + d; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 4, 70, x + top, top === 22 ? 20 : 55); g.quadraticCurveTo(x + top - 4, 90, x + bw, h); g.fill(); } }); }
  if (soort === 'vlekken') for (let i = 0; i < 26; i++) { const x = (i * 53) % w, y = (i * 37) % h; g.fillStyle = b; g.beginPath(); g.ellipse(x, y, 10, 8, i, 0, 6.3); g.fill(); g.fillStyle = a; g.beginPath(); g.ellipse(x, y, 4, 3, i, 0, 6.3); g.fill(); }
  if (soort === 'streep') { g.fillRect(0, 48, w, 32); g.fillStyle = '#ffffff'; g.fillRect(0, 55, w, 5); g.fillRect(0, 68, w, 5); }
  if (soort === 'geblokt') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1f3a'; for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32); } });
/* box-projectie: een patroon (tijger, vlammen ...) over de hele kart, ongeacht hoe Kenney de kleuren heeft ingedeeld */
function boxUV(geo, schaal = 2.2) { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    for (let k = 0; k < 3; k++) { const j = i + k; let u, v; if (ax >= ay && ax >= az) { u = p.getZ(j); v = p.getY(j); } else if (ay >= az) { u = p.getX(j); v = p.getZ(j); } else { u = p.getX(j); v = p.getY(j); } uv[j * 2] = u * schaal; uv[j * 2 + 1] = v * schaal; } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }
/* het kleurenpalet van de Car Kit: de carrosserie gebruikt vak (5,2), de velgen vak (4,1). Herkleuren met behoud van de zachte schaduwen. */
let paletBeeld = null;
function palet(lak, velg) { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(paletBeeld, 0, 0, 512, 512);
  const kleur = (x0, y0, hex) => { if (!hex) return; const d = g.getImageData(x0, y0, 64, 128), k = new THREE.Color(hex); let max = 0;
    for (let i = 0; i < d.data.length; i += 4) max = Math.max(max, .3 * d.data[i] + .59 * d.data[i + 1] + .11 * d.data[i + 2]);
    for (let i = 0; i < d.data.length; i += 4) { const l = (.3 * d.data[i] + .59 * d.data[i + 1] + .11 * d.data[i + 2]) / (max || 1), f = .55 + .45 * l;
      d.data[i] = Math.min(255, k.r * 255 * f + 18 * l); d.data[i + 1] = Math.min(255, k.g * 255 * f + 18 * l); d.data[i + 2] = Math.min(255, k.b * 255 * f + 18 * l); }
    g.putImageData(d, x0, y0); };
  kleur(320, 256, lak); kleur(256, 128, velg);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; return t; }

/* ---------- de banen: elk gebied een eigen vloeiende lijn met bochten (Tim 26-10-2026: "rond les 20 rijdt een kind steeds dezelfde baan").
   Alle banen beginnen recht (startgrid bij x = 0) en hebben na de finish genoeg ruimte voor het podium; kleinste bochtstraal 22 m. ---------- */
const BANEN = {
  dorp:    [[-80, 0], [-20, 0], [40, 0], [78, -8], [104, -30], [134, -44], [170, -38], [196, -14], [226, 4], [266, 8], [330, 2], [380, 0]],
  strand:  [[-80, 0], [-20, 0], [45, 2], [95, 16], [135, 36], [180, 42], [225, 30], [262, 8], [300, -10], [345, -18], [395, -14], [450, -6]],   // langs de kust, ruime bochten
  bergen:  [[-80, 0], [-20, 0], [40, 0], [74, -10], [96, -36], [122, -58], [156, -62], [182, -42], [192, -12], [212, 14], [244, 22], [272, 6], [298, -16], [336, -24], [386, -22], [440, -20]],   // bergpas met haarspeldbochten
  kasteel: [[-80, 0], [-20, 0], [50, 0], [96, 8], [126, 30], [138, 62], [160, 92], [196, 104], [230, 90], [252, 60], [282, 38], [326, 30], [384, 30], [440, 30]] };   // circuit met een grote lus
const RL = 230;   // de lengte van een oefening op de baan (f = 0 .. 1)
const BREEDTE = 7, STOEP = 1.5;
const BAANDATA = {};
function baanData(id) { if (!BAANDATA[id]) { const curve = new THREE.CatmullRomCurve3((BANEN[id] || BANEN.dorp).map(([x, z]) => V(x, 0, z)), false, 'centripetal'), LEN = curve.getLength();
    let S0 = 60; for (let s = 0; s < LEN; s += .5) if (curve.getPointAt(s / LEN).x >= 0) { S0 = s; break; }
    const punten = []; for (let s = 0; s <= LEN; s += 2) punten.push(curve.getPointAt(s / LEN)); BAANDATA[id] = { curve, LEN, S0, punten }; }
  return BAANDATA[id]; }
const yawVan = t => Math.atan2(t.x, t.z), dwars = t => Math.atan2(-t.z, t.x);
const GARAGE = V(-320, 0, 330);   // ver van de baan, zodat er geen decor in de garage staat

const SFEER = {
  dorp:    { top: '#4fb3ff', mid: '#a5d8ff', bot: '#e8f6ff', zon: '#fff1d8', zi: 2.6, zp: [-24, 38, 26], hs: '#dff1ff', hg: '#6f9a4a', hi: .95, mist: [100, 320], exp: 1.05, grond: ['#7fc35a', '#8ccd63'], stof: '#c9b48a' },
  strand:  { top: '#3c95e0', mid: '#8fcff4', bot: '#ffe6c2', zon: '#ffd39a', zi: 3.0, zp: [-40, 24, 14], hs: '#ffeedd', hg: '#c9a46a', hi: .9, mist: [110, 340], exp: 1.08, grond: ['#f0d79b', '#f0d79b'], stof: '#f3dca4' },
  bergen:  { top: '#3a82d4', mid: '#9cc8ef', bot: '#f0f6fc', zon: '#ffffff', zi: 2.4, zp: [-20, 40, 30], hs: '#e8f2ff', hg: '#a9b9cc', hi: 1.15, mist: [120, 380], exp: .98, grond: ['#f2f6fb', '#f2f6fb'], stof: '#ffffff' },
  kasteel: { top: '#4a68b8', mid: '#f3a560', bot: '#ffdcaa', zon: '#ffb560', zi: 2.5, zp: [55, 16, 45], hs: '#ffe3c6', hg: '#6f6649', hi: .88, mist: [110, 340], exp: 1.02, /* gouden zonsondergang */ grond: ['#76bd52', '#88cb60'], stof: '#d8d2c4' },
  garage:  { top: '#4fb3ff', mid: '#a5d8ff', bot: '#e8f6ff', zon: '#fff1d8', zi: 1.1, zp: [-20, 30, 25], hs: '#eef4ff', hg: '#9aa3b8', hi: .55, mist: [200, 500], exp: .92 },
  tunnel:  { top: '#0b0e1f', mid: '#0b0e1f', bot: '#0b0e1f', zon: '#ffffff', zi: 0, zp: [-24, 38, 26], hs: '#7480b8', hg: '#141826', hi: .12, mist: [10, 75], exp: 1.15 } };
const BAAN = { race: { jij: 5.25, flits: 1.75, vlam: -1.75, hop: -5.25 }, solo: 1.75 };

/* ---------- geluid: Kenney CC0 (krat, metaal) + zelf gemaakt met Web Audio (motor, publiek) ---------- */
let AC = null; const BUF = {}; let geluidAan = true;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); ['krat1', 'krat2', 'krat3', 'metaal1', 'metaal2'].forEach(n => fetch(SFX + n + '.mp3').then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).then(d => { BUF[n] = d; }).catch(() => {})); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {}); return AC || null; }
function speel(n, vol = .5, rate = 1) { if (!geluidAan || !ac() || !BUF[n]) return; const s = AC.createBufferSource(); s.buffer = BUF[n]; s.playbackRate.value = rate; const g = AC.createGain(); g.gain.value = vol; s.connect(g).connect(AC.destination); s.start(); }
function juichen(sterk = 1) { if (!geluidAan || !ac()) return; const n = AC.sampleRate * 2.2, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .02 ? 1 : .35);
  const s = AC.createBufferSource(); s.buffer = b; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .6; const g = AC.createGain(), t0 = AC.currentTime;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.12 * sterk, t0 + .35); g.gain.linearRampToValueAtTime(0, t0 + 2.1); s.connect(f).connect(g).connect(AC.destination); s.start(); }

function maak(box, opts = {}) {
  const reduce = !!opts.reduce;
  if (opts.geluid === false) geluidAan = false;
  let muziekAan = opts.muziek !== false, duiken = false, spookAan = false, boostT = 0, podiumGroep = null, podiumT = 0, hopT = 0, flitsLicht = null;
  /* de baan van het huidige gebied; frame(s) geeft punt, richting en dwarsrichting op afstand s */
  let B = baanData('dorp'), LEN = B.LEN, S0 = B.S0, baanId = 'dorp', podiumS = S0 + RL + 16;
  const frame = s => { const u = THREE.MathUtils.clamp(s / LEN, 0, 1), p = B.curve.getPointAt(u), t = B.curve.getTangentAt(u); return { p, t, m: V(-t.z, 0, t.x) }; };
  const afstandTotBaan = p => { let d = 1e9; for (const q of B.punten) { const dx = p.x - q.x, dz = p.z - q.z; d = Math.min(d, dx * dx + dz * dz); } return Math.sqrt(d); };
  function kiesBaan(id) { baanId = id; B = baanData(id); LEN = B.LEN; S0 = B.S0; podiumS = S0 + RL + 16; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(opts.scherp ? Math.min(2, window.devicePixelRatio || 1) : 1);   // scherp: kleine vakken (mini-les op de homepage)
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true'); box.prepend(renderer.domElement);
  /* laadscherm (Tim 26-10-2026): op langzaam wifi zag je eerst een leeg blauw vak. Ligt onder de letterbalk, zodat je al kunt lezen. */
  const laadEl = document.createElement('div'); laadEl.setAttribute('aria-hidden', 'true');
  laadEl.style.cssText = 'position:absolute;inset:0;z-index:3;box-sizing:border-box;padding-top:var(--zicht-top,0px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:linear-gradient(180deg,#bfe6ff,#eaf6ff);font-family:Fredoka,sans-serif;color:#1b1f3a;transition:opacity .45s;pointer-events:none';
  laadEl.innerHTML = '<img src="' + IMG + 'flits_typen.webp" alt="" style="height:min(120px,26%);width:auto"><b style="font-size:20px;font-weight:700">Flits zet de baan klaar…</b>' +
    '<span style="display:block;width:220px;height:14px;border-radius:99px;background:#fff;border:2.5px solid #1b1f3a;overflow:hidden"><i style="display:block;height:100%;width:4%;background:#ffc93c;transition:width .25s"></i></span>';
  if (opts.laadscherm === false) laadEl.style.display = 'none';
  box.appendChild(laadEl);
  let laadTotaal = 0, laadAf = 0, gebiedGevraagd = false, mislukt = false;
  const laadTel = pr => { laadTotaal++; pr.then(() => { laadAf++; laadEl.querySelector('i').style.width = Math.max(4, Math.round(laadAf / laadTotaal * 100)) + '%'; }, () => {}); return pr; };
  function laadStatus() { const bezig = !klaar || (gebiedGevraagd && DECOR[gebiedId] === 'laden'); laadEl.style.opacity = bezig ? '1' : '0'; }
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(46, 2, .1, 1200);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, cam)); const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55, .45, 1.0); composer.addPass(bloom); composer.addPass(new OutputPass());
  let metGloed = !reduce;

  /* lucht, licht, mist */
  const lucht = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,mid,bot; varying vec3 p; void main(){ float h = p.y; vec3 c = h > .16 ? mix(mid, top, smoothstep(.16,.7,h)) : mix(bot, mid, smoothstep(-.02,.16,h)); gl_FragColor = vec4(c,1.); }' }));
  scene.add(lucht);
  const hemi = new THREE.HemisphereLight(); scene.add(hemi);
  const zon = new THREE.DirectionalLight(); zon.castShadow = true; zon.shadow.mapSize.set(1536, 1536);
  Object.assign(zon.shadow.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 1, far: 140 }); zon.shadow.bias = -.0004; zon.shadow.normalBias = .03; scene.add(zon, zon.target);
  scene.fog = new THREE.Fog('#fff', 100, 300);
  let gebiedId = 'dorp', SF = SFEER.dorp;
  function sfeer() { SF = SFEER[modus === 'tunnel' ? 'tunnel' : (modus === 'garage' || modus === 'toonzaal') ? 'garage' : gebiedId];
    lucht.material.uniforms.top.value.set(SF.top); lucht.material.uniforms.mid.value.set(SF.mid); lucht.material.uniforms.bot.value.set(SF.bot);
    zon.color.set(SF.zon); zon.intensity = SF.zi; hemi.color.set(SF.hs); hemi.groundColor.set(SF.hg); hemi.intensity = SF.hi;
    scene.fog.color.set(SF.bot); scene.fog.near = SF.mist[0]; scene.fog.far = SF.mist[1]; renderer.toneMappingExposure = SF.exp;
    bloom.strength = modus === 'tunnel' ? .38 : .55; bloom.radius = modus === 'tunnel' ? .3 : .45;
    Object.values(BANEN_G).forEach(g => { g.userData.tunnel.visible = false; }); if (tunnel) tunnel.visible = modus === 'tunnel'; if (D.lampen) D.lampen.forEach(l => { l.material.emissiveIntensity = modus === 'tunnel' ? 2.5 : .2; }); kartLicht.intensity = modus === 'tunnel' ? 18 : 0; koplamp.intensity = modus === 'tunnel' ? 70 : 0; }

  /* ---------- de baan per gebied, in één groep: weg, stoepranden, start/finish, reclameborden, startboog en tunnel.
     Vangrails en finishpoort komen erbij zodra de modellen er zijn. ---------- */
  const ASFALT = new THREE.MeshStandardMaterial({ roughness: .92, side: THREE.DoubleSide, map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5c6070'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 70 + Math.random() * 60; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 10) + ',.35)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#f4f4f0'; g.fillRect(w * .012, 0, w * .018, h); g.fillRect(w * .97, 0, w * .018, h); for (const u of [.25, .5, .75]) for (let y = 0; y < h; y += 128) g.fillRect(w * u - 4, y, 8, 64); }) });
  const STOEPMAT = new THREE.MeshStandardMaterial({ roughness: .7, side: THREE.DoubleSide, map: canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e5484d'; g.fillRect(0, 0, w, h / 2); }) });
  const RUIT = canvasTex(256, 64, (g) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#1b1f3a' : '#ffffff'; g.fillRect(x * 32, y * 32, 32, 32); } }, 2, 1);
  const PAAL = new THREE.MeshStandardMaterial({ color: '#1b1f3a', roughness: .5 });
  const lint = (ouder, van, tot, y, mat, vLengte) => { const pos = [], uv = [], idx = []; let n = 0;
    for (let s = 0; s <= LEN; s += 1) { const { p, m } = frame(s); for (const [l, u] of [[van, 0], [tot, 1]]) { pos.push(p.x + m.x * l, y, p.z + m.z * l); uv.push(u, s / vLengte); }
      if (n) { const a = (n - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } n++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const me = new THREE.Mesh(g, mat); me.receiveShadow = true; ouder.add(me); return me; };
  const grondTex = {}; const grondVan = id => grondTex[id] || (grondTex[id] = canvasTex(512, 512, (g, w, h) => { const k = SFEER[id].grond; for (let i = 0; i < 8; i++) { g.fillStyle = k[i % 2]; g.fillRect(i * 64, 0, 64, h); }
    for (let i = 0; i < 6000; i++) { g.fillStyle = id === 'bergen' ? 'rgba(120,150,190,' + Math.random() * .09 + ')' : id === 'strand' ? 'rgba(160,120,60,' + Math.random() * .1 + ')' : 'rgba(40,90,20,' + Math.random() * .08 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 60, 40));
  const grond = new THREE.Mesh(new THREE.PlaneGeometry(1400, 900), new THREE.MeshStandardMaterial({ roughness: 1, map: grondVan('dorp') })); grond.rotation.x = -Math.PI / 2; grond.position.set(150, -.03, -20); grond.receiveShadow = true; scene.add(grond);
  const BANEN_G = {}; let startLampen = [], tunnel = null;
  function bouwBaan(id) { const bg = new THREE.Group(); bg.userData.lampen = [];
    lint(bg, -BREEDTE, BREEDTE, .02, ASFALT, 16); lint(bg, -BREEDTE - STOEP, -BREEDTE, .05, STOEPMAT, 4); lint(bg, BREEDTE, BREEDTE + STOEP, .05, STOEPMAT, 4);
    /* start- en finishstreep */
    for (const [s, mt] of [[S0 + RL, RUIT], [S0, null]]) { const f = frame(s); const l = new THREE.Mesh(new THREE.PlaneGeometry(BREEDTE * 2, 1.6), new THREE.MeshStandardMaterial(mt ? { map: mt, roughness: .8 } : { color: '#ffffff', roughness: .8 }));
      l.rotation.x = -Math.PI / 2; l.rotation.z = Math.atan2(-f.t.x, -f.t.z); l.position.copy(f.p); l.position.y = .035; l.receiveShadow = true; bg.add(l); }
    /* reclameborden op twee palen, van beide kanten leesbaar en iets gedraaid naar de aankomende karts (zoals langs een echt circuit) */
    for (let s = S0 - 10, i = 0; s < S0 + RL + 20; s += 24, i++) { const { p, t, m } = frame(s), kant = i % 2 ? 1 : -1;
      const mat = new THREE.MeshStandardMaterial({ map: label(i % 3 === 2 ? 'FLITS CUP' : 'flitsvingers', i % 2 ? '#ffc93c' : '#3a5bff', i % 2 ? '#1b1f3a' : '#ffffff', 1024, 180, 130, false), roughness: .6 });
      const bord = new THREE.Group();
      for (const r of [0, Math.PI]) { const v = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.15), mat); v.rotation.y = r; v.position.z = r ? -.08 : .08; bord.add(v); }
      bord.add(new THREE.Mesh(new THREE.BoxGeometry(6.7, 1.4, .14), PAAL));
      for (const x of [-2.6, 2.6]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 2.2, 8), PAAL); pl.position.set(x, -1.1, 0); bord.add(pl); }
      bord.position.copy(p).addScaledVector(m, kant * (BREEDTE + STOEP + 2.4)); bord.position.y = 2.2; bord.rotation.y = dwars(t) + (kant > 0 ? Math.PI : 0) + kant * .45;
      bord.traverse(o => { if (o.isMesh) o.castShadow = true; }); bg.add(bord); }
    /* startboog: twee slanke palen buiten de vangrails, een balk met het logo; de startlichten op ooghoogte aan beide palen */
    { const st = frame(S0 + 6), boog = new THREE.Group(), W = BREEDTE + STOEP + 1.6, nv = new THREE.MeshStandardMaterial({ color: '#1b1f3a', roughness: .5, metalness: .2 });
      for (const k of [-1, 1]) { const paal = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, 9.2, 16), nv); paal.position.set(k * W, 4.6, 0); paal.castShadow = true; boog.add(paal); }
      const balk = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 1, 1.5, .7), nv); balk.position.y = 8.9; balk.castShadow = true; boog.add(balk);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.05), new THREE.MeshStandardMaterial({ map: label('FLITS CUP', '#ffc93c', '#1b1f3a', 1024, 168, 120, false), roughness: .6 })); logo.position.set(-5.6, 8.9, -.36); logo.rotation.y = Math.PI; boog.add(logo);
      for (const k of [-1, 1]) { const kast = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.3, .6), nv); kast.position.set(k * (W - .2), 4.1, -.45); boog.add(kast);
        for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.4, 16, 12), new THREE.MeshStandardMaterial({ color: '#2b0d0d', emissive: '#ff2a2a', emissiveIntensity: 0 }));
          l.position.set(k * (W - .2), 5.6 - i * 1, -.8); l.userData.i = i; boog.add(l); bg.userData.lampen.push(l); } }
      boog.position.copy(st.p); boog.rotation.y = yawVan(st.t); bg.add(boog); }
    /* tunnel (alleen bij blind-rondjes): bogen langs de bocht, lampstroken die gloeien; één InstancedMesh per soort */
    { const tg = new THREE.Group(); tg.visible = false;
      const wand = new THREE.MeshStandardMaterial({ color: '#2d3352', roughness: .8 }), lamp = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffcf3a', emissiveIntensity: 1.8 }), led = new THREE.MeshStandardMaterial({ color: '#cfe6ff', emissive: '#bfe0ff', emissiveIntensity: 1.4 });
      const W = BREEDTE + STOEP + 2.2, stukken = [];
      for (const k of [-1, 1]) { stukken.push([new THREE.BoxGeometry(1, 7.5, .9), wand, V(0, 3.75, k * W)], [new THREE.BoxGeometry(5.05, 7.5, .4), wand, V(2.5, 3.75, k * (W + .45))], [new THREE.BoxGeometry(2.4, .35, .2), lamp, V(2.5, 5.2, k * (W - .55))], [new THREE.BoxGeometry(3.6, .2, .2), lamp, V(2.5, .9, k * (W - .55))]); }
      stukken.push([new THREE.BoxGeometry(5.05, .8, W * 2 + 1.4), wand, V(2.5, 7.9, 0)], [new THREE.BoxGeometry(3.2, .12, .5), led, V(2.5, 7.45, 0)]);
      const bogen = []; for (let s = S0 - 20; s < S0 + RL + 15; s += 5) { const { p, t } = frame(s); bogen.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), dwars(t)), V(1, 1, 1))); }
      for (const [geo, mt, off] of stukken) { const im = new THREE.InstancedMesh(geo, mt, bogen.length), om = new THREE.Matrix4().makeTranslation(off.x, off.y, off.z); bogen.forEach((b, i) => im.setMatrixAt(i, b.clone().multiply(om))); im.receiveShadow = true; im.computeBoundingSphere(); tg.add(im); }
      const mond = frame(S0 - 20), bt = label('BLINDE TUNNEL', '#1b1f3a', '#ffd23f', 1024, 136, 100, false);
      const bord = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.6), new THREE.MeshStandardMaterial({ map: bt, emissive: '#ffffff', emissiveIntensity: .35, emissiveMap: bt })); bord.position.copy(mond.p); bord.position.y = 9.2; bord.rotation.y = yawVan(mond.t) + Math.PI; tg.add(bord);
      bg.add(tg); bg.userData.tunnel = tg; }
    scene.add(bg); return bg; }
  /* wissel naar de baan van een gebied (bij eerste gebruik gebouwd) */
  function toonBaan(id) { kiesBaan(id); for (const [k, g] of Object.entries(BANEN_G)) g.visible = k === id;
    if (!BANEN_G[id]) BANEN_G[id] = bouwBaan(id); const g = BANEN_G[id]; startLampen = g.userData.lampen; tunnel = g.userData.tunnel; podiumGroep = g.userData.podium || null;
    if (['barrierRed', 'barrierWhite', 'toy/gate-finish'].every(n => M[n]) && !g.userData.grails) bouwVangrails(g); }

  /* ---------- veel dezelfde dingen: per vak van 50 m één InstancedMesh (snel, buiten beeld = niet tekenen) ---------- */
  const zetten = new Map();
  const zet = (naam, p, yaw = 0, s = 1) => { if (!zetten.has(naam)) zetten.set(naam, []); zetten.get(naam).push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(s, s, s))); };
  function bouwZetten(groep) { const pv = V(0, 0, 0);
    for (const [naam, mats] of zetten) { if (!M[naam]) continue; const vakken = new Map();
      for (const m of mats) { pv.setFromMatrixPosition(m); const k = Math.floor(pv.x / 50) + ',' + Math.floor(pv.z / 50); if (!vakken.has(k)) vakken.set(k, []); vakken.get(k).push(m); }
      for (const lijst of vakken.values()) for (const d of M[naam].delen) { const im = new THREE.InstancedMesh(d.geo, d.mat, lijst.length); lijst.forEach((m, i) => im.setMatrixAt(i, m.clone().multiply(d.m))); im.computeBoundingSphere(); im.castShadow = im.receiveShadow = true; groep.add(im); } }
    zetten.clear(); }
  const los = (naam, p, yaw = 0, s = 1, ouder = scene) => { const g = new THREE.Group(); for (const d of M[naam].delen) { const me = new THREE.Mesh(d.geo, d.mat); me.applyMatrix4(d.m); me.castShadow = me.receiveShadow = true; g.add(me); }
    g.position.copy(p); g.rotation.y = yaw; g.scale.setScalar(s); ouder.add(g); return g; };
  let rnd = 7; const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };
  function verstrooi(namen, aantal, latMin, latMax, schaal, o = {}) {
    for (let i = 0, poging = 0; i < aantal && poging < aantal * 8; poging++) { const s = rand() * LEN, kant = rand() < .5 ? -1 : 1, lat = latMin + rand() * (latMax - latMin);
      const { p, m } = frame(s); const q = p.clone().addScaledVector(m, kant * lat); if (!o.vast) { q.x += (rand() - .5) * 4; q.z += (rand() - .5) * 4; }
      if (afstandTotBaan(q) < latMin - .5) continue;
      zet(namen[Math.floor(rand() * namen.length)], q, o.naarBaan ? Math.atan2(-m.x * kant, -m.z * kant) : rand() * 6.28, schaal * (o.vast ? 1 : .8 + rand() * .45)); i++; } }

  /* ---------- decor per gebied (bij eerste gebruik gebouwd) ---------- */
  const DECOR = {};
  function bouwGebied(id) { const vorige = baanId; kiesBaan(id); const g = new THREE.Group(); rnd = 7 + id.length * 31;
    if (id === 'dorp') {
      verstrooi(['dorp/building-type-a', 'dorp/building-type-b', 'dorp/building-type-c', 'dorp/building-type-d', 'dorp/building-type-e', 'dorp/building-type-f', 'dorp/building-type-g', 'dorp/building-type-h'], 34, 20, 30, 7.5, { naarBaan: true });
      verstrooi(['natuur/tree_oak', 'natuur/tree_default', 'natuur/tree_detailed', 'natuur/tree_fat'], 90, 13, 60, 7); verstrooi(['dorp/tree-large'], 30, 13, 40, 13);
      verstrooi(['natuur/tree_default', 'natuur/tree_oak', 'natuur/tree_fat'], 120, 60, 160, 9);
      verstrooi(['natuur/plant_bushLarge', 'natuur/plant_bush', 'natuur/flower_redA', 'natuur/flower_yellowA', 'natuur/flower_purpleA'], 110, 11.8, 18, 6);
      verstrooi(['dorp/fence-1x3'], 40, 16, 17, 5, { naarBaan: true, vast: true });
    } else if (id === 'strand') {
      const zee = new THREE.Mesh(new THREE.PlaneGeometry(1600, 600), new THREE.MeshStandardMaterial({ color: '#2aa3dc', roughness: .12, metalness: .1, emissive: '#0d4f7a', emissiveIntensity: .25 })); zee.rotation.x = -Math.PI / 2; zee.position.set(150, .06, -390); g.add(zee);
      const schuim = new THREE.Mesh(new THREE.PlaneGeometry(1600, 3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6 })); schuim.rotation.x = -Math.PI / 2; schuim.position.set(150, .08, -91); g.add(schuim);
      verstrooi(['natuur/tree_palmTall', 'natuur/tree_palmBend', 'natuur/tree_palmDetailedTall'], 60, 12, 45, 8); verstrooi(['strand/palm-detailed-bend', 'strand/palm-detailed-straight'], 30, 14, 45, 2.6);
      verstrooi(['strand/rocks-sand-a', 'strand/rocks-sand-b'], 18, 16, 50, 1.4); verstrooi(['strand/crate', 'strand/barrel'], 26, 11.8, 15, 1.5); verstrooi(['strand/boat-row-small'], 10, 18, 40, 1.8);
      for (let i = 0; i < 7; i++) zet('strand/ship-small', V(-40 + i * 60 + rand() * 20, 0, -140 - rand() * 120), rand() * 6, 1.6);
      const kl = ['#e5484d', '#ffc93c', '#3a5bff', '#ff6fa8', '#16b277']; for (let i = 0; i < 26; i++) { const s = rand() * LEN, kant = rand() < .5 ? -1 : 1, { p, m } = frame(s); const q = p.clone().addScaledVector(m, kant * (14 + rand() * 18)); if (afstandTotBaan(q) < 13) continue;
        const u = new THREE.Group(); const stok = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 3.4, 8), new THREE.MeshStandardMaterial({ color: '#ffffff' })); stok.position.y = 1.7; u.add(stok);
        const dak = new THREE.Mesh(new THREE.ConeGeometry(2.2, .9, 12), new THREE.MeshStandardMaterial({ color: kl[i % 5], roughness: .6 })); dak.position.y = 3.4; u.add(dak); u.traverse(o => { if (o.isMesh) o.castShadow = true; }); u.position.copy(q); g.add(u); }
    } else if (id === 'bergen') {
      verstrooi(['winter/tree-snow-a', 'winter/tree-snow-b', 'winter/tree-snow-c'], 120, 12, 70, 5.5); verstrooi(['natuur/tree_pineTallA_detailed', 'natuur/tree_pineTallB_detailed', 'natuur/tree_pineRoundA'], 80, 14, 80, 7);
      verstrooi(['winter/rocks-large', 'winter/rocks-medium'], 30, 14, 60, 2.4); verstrooi(['winter/snowman'], 7, 12, 16, 2.6, { naarBaan: true }); verstrooi(['winter/snow-pile'], 40, 11.8, 30, 5);
      const mat = new THREE.MeshStandardMaterial({ color: '#8a94a8', flatShading: true, roughness: 1 }), sneeuw = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .9 });
      for (let i = 0; i < 16; i++) { const a = -Math.PI * .95 + i / 16 * Math.PI * 1.9, h = 70 + rand() * 70, r = 55 + rand() * 40, b = new THREE.Group();
        const k = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat); k.position.y = h / 2 - 2; b.add(k); const top = new THREE.Mesh(new THREE.ConeGeometry(r * .36, h * .36, 7), sneeuw); top.position.y = h - h * .18 - 1.5; b.add(top);
        b.position.set(150 + Math.cos(a) * 240 * (1 + rand() * .3), 0, -20 + Math.sin(a) * 240 * .8); b.rotation.y = rand() * 6; if (afstandTotBaan(b.position) < r + 30) continue; g.add(b); }
    } else {   // kasteel = het Kampioenscircuit: tribunes met publiek
      verstrooi(['natuur/tree_default', 'natuur/tree_oak', 'natuur/tree_detailed'], 80, 30, 120, 8); verstrooi(['tent'], 8, 26, 34, 7, { naarBaan: true }); verstrooi(['lightPostLarge'], 14, 12.5, 13, 10, { naarBaan: true, vast: true });
      for (let s = S0 + 8; s < S0 + RL; s += 20) { const { p, t, m } = frame(s); zet('flagCheckers', p.clone().addScaledVector(m, BREEDTE + STOEP + 2.6), yawVan(t), 3.2); zet('bannerTowerRed', p.clone().addScaledVector(m, -(BREEDTE + STOEP + 2.4)), yawVan(t), 5); }
      const tribunes = [];
      for (const [van, tot, kant] of [[S0 - 30, S0 + 60, -1], [S0 + RL - 70, S0 + RL + 20, -1], [S0 + RL - 60, S0 + RL + 10, 1]]) for (let s = van; s < tot; s += 8.6) { const { p, m } = frame(s); tribunes.push(los('grandStandCovered', p.clone().addScaledVector(m, kant * 17), Math.atan2(-kant * m.x, -kant * m.z), 8.6, g)); }
      const ijk = los('grandStandCovered', V(0, 0, 0), 0, 8.6, new THREE.Group()); ijk.updateMatrixWorld(true); const rc = new THREE.Raycaster(), profiel = [];
      for (let z = 4.5; z > -5; z -= .9) { rc.set(V(0, 40, z), V(0, -1, 0)); const hit = rc.intersectObject(ijk, true).find(h => h.point.y < 8 && h.face && h.face.normal.y > .5); if (hit && hit.point.y > .3) profiel.push([z, hit.point.y]); }
      const KLR = ['#ff6fa8', '#ff9f43', '#24bf80', '#3ba7ff', '#ffc93c', '#7b4dff', '#e5484d', '#ffffff'].map(c => new THREE.Color(c)), HUID = ['#f6d3b0', '#e2ad7e', '#b97c4f', '#8a5634'].map(c => new THREE.Color(c));
      const max = Math.max(1, tribunes.length * 10 * profiel.length), lijf = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.26, .32, 4, 8), new THREE.MeshStandardMaterial({ roughness: .8 }), max), kop = new THREE.InstancedMesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshStandardMaterial({ roughness: .8 }), max);
      const tmp = new THREE.Object3D(); let n = 0;
      for (const tr of tribunes) { const rot = new THREE.Matrix4().makeRotationY(tr.rotation.y); for (let x = -3.9; x <= 3.9; x += .87) for (const [z, y] of profiel) { if (rand() < .16 || n >= max) continue;
          tmp.position.copy(V(x + (rand() - .5) * .15, y + .45, z).applyMatrix4(rot).add(tr.position)); tmp.updateMatrix(); lijf.setMatrixAt(n, tmp.matrix); lijf.setColorAt(n, KLR[n % KLR.length]);
          tmp.position.y += .55; tmp.updateMatrix(); kop.setMatrixAt(n, tmp.matrix); kop.setColorAt(n, HUID[(n * 7) % HUID.length]); n++; } }
      lijf.count = kop.count = n; lijf.frustumCulled = kop.frustumCulled = false; g.add(lijf, kop); }
    bouwZetten(g); scene.add(g); kiesBaan(vorige); return g; }

  /* ---------- vangrails (wachten op het model) ---------- */
  function bouwVangrails(bg) { for (let s = 0, i = 0; s < LEN; s += 2, i++) { const { p, t, m } = frame(s), yaw = dwars(t);
      zet(i % 2 ? 'barrierRed' : 'barrierWhite', p.clone().addScaledVector(m, -(BREEDTE + STOEP + .9)), yaw, 8); zet(i % 2 ? 'barrierWhite' : 'barrierRed', p.clone().addScaledVector(m, BREEDTE + STOEP + .9), yaw, 8); }
    const g = new THREE.Group(); bouwZetten(g); bg.add(g);
    const fi = frame(S0 + RL); los('toy/gate-finish', fi.p, yawVan(fi.t), 11.5, bg); bg.userData.grails = true; }


  /* ---------- garage (pitbox): voor de garage-fase in een les en voor de winkel ---------- */
  const garage = new THREE.Group(); garage.position.copy(GARAGE); scene.add(garage);
  const pitTex = n => label('PITBOX ' + n.toUpperCase(), '#ffc93c', '#1b1f3a', 1024, 180, 130, false);
  const pitbord = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshStandardMaterial({ map: pitTex('Jij') }));
  { const vloer = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ roughness: .28, metalness: .1, map: canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#3d4258'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * .04 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      const k = w / 60; g.fillStyle = '#ffc93c'; g.fillRect(24 * k, 15 * k, 12 * k, .35 * k); g.fillRect(24 * k, 25 * k, 12 * k, .35 * k); g.fillRect(24 * k, 15 * k, .35 * k, 10 * k); g.fillRect(36 * k, 15 * k, .35 * k, 10.35 * k);
      for (let x = 0; x < 60; x += 2) { g.fillStyle = (x / 2) % 2 ? '#1b1f3a' : '#ffc93c'; g.fillRect(x * k, 28 * k, 2 * k, .8 * k); } }) }));
    vloer.rotation.x = -Math.PI / 2; vloer.position.y = .04; vloer.receiveShadow = true; garage.add(vloer);
    const muur = new THREE.MeshStandardMaterial({ color: '#dfe3ee', roughness: .8 }), blauw = new THREE.MeshStandardMaterial({ color: '#3a5bff', roughness: .6 });
    const achter = new THREE.Mesh(new THREE.BoxGeometry(26, 10, .6), new THREE.MeshStandardMaterial({ roughness: .7, map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#eef0f6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1f3a'; g.fillRect(0, h * .62, w, h * .38); g.fillStyle = '#3a5bff'; g.fillRect(0, h * .56, w, h * .06); g.fillStyle = '#ffc93c'; g.fillRect(0, h * .53, w, h * .03); }) }));
    achter.position.set(0, 5, -9); achter.receiveShadow = true; garage.add(achter);
    for (const k of [-1, 1]) { const zij = new THREE.Mesh(new THREE.BoxGeometry(.6, 10, 18), muur); zij.position.set(k * 13, 5, 0); zij.receiveShadow = zij.castShadow = true; garage.add(zij); }
    const dak = new THREE.Mesh(new THREE.BoxGeometry(27, .7, 19), blauw); dak.position.set(0, 10.2, 0); garage.add(dak);
    pitbord.position.set(0, 6.2, -8.65); garage.add(pitbord);
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(5.5, .15, .9), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff8e6', emissiveIntensity: 1.6 })); l.position.set(-7 + i * 7, 9.75, 0); garage.add(l); }
    const brug = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, .35, 40), new THREE.MeshStandardMaterial({ color: '#ffc93c', roughness: .5 })); brug.position.set(0, .2, 0); brug.castShadow = brug.receiveShadow = true; garage.add(brug);
    const wandBord = new THREE.Mesh(new THREE.BoxGeometry(6, 3, .2), new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: .8 })); wandBord.position.set(-7, 4, -8.6); garage.add(wandBord);
    ['#e5484d', '#3a5bff', '#16b277', '#ffc93c', '#e5484d', '#3a5bff', '#7b4dff'].forEach((c, i) => { const t = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.4, .15), new THREE.MeshStandardMaterial({ color: c })); t.position.set(-9.4 + i * .8, 4, -8.4); garage.add(t); });
    const kast = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3, 1.6), new THREE.MeshStandardMaterial({ color: '#e5484d', roughness: .45, metalness: .2 })); kast.position.set(8, 1.5, -7.6); kast.castShadow = true; garage.add(kast);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(.7, .32, 12, 24), new THREE.MeshStandardMaterial({ color: '#23263a', roughness: .8 })); b.rotation.x = Math.PI / 2; b.position.set(11, .32 + i * .62, -5); b.castShadow = true; garage.add(b); }
    const pl = new THREE.PointLight('#fff3d6', 24, 40, 1.6); pl.position.set(0, 8, 4); garage.add(pl);
    flitsLicht = new THREE.PointLight('#ffe6a6', 0, 14, 1.6); flitsLicht.position.set(0, 2.6, 2.2); garage.add(flitsLicht);
    const spot = new THREE.SpotLight('#ffffff', 18, 30, .55, .6, 1.2); spot.position.set(3, 9.5, 5); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0005; garage.add(spot, spot.target); }

  /* ---------- karts ---------- */
  const vlekHelm = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#ffc93c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { const x = (i * 97) % w, y = 30 + (i * 53) % 200, r = 9 + (i % 4) * 3; g.fillStyle = '#6b4210'; g.beginPath(); g.ellipse(x, y, r, r * .8, i, 0, 6.3); g.fill(); g.fillStyle = '#e8a81e'; g.beginPath(); g.ellipse(x, y, r * .45, r * .35, i, 0, 6.3); g.fill(); } });
  function coureur(dier, helmKleur = '#ffffff') { const g = new THREE.Group();
    const lijf = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .22, 6, 12), new THREE.MeshStandardMaterial({ color: '#2b2f45', roughness: .6 })); lijf.position.set(0, .48, -.12); g.add(lijf);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(.27, 28, 20), new THREE.MeshPhysicalMaterial(dier === 'luipaard' ? { map: vlekHelm, roughness: .3, clearcoat: 1, clearcoatRoughness: .15 } : { color: helmKleur, roughness: .25, clearcoat: 1, clearcoatRoughness: .15 })); helm.position.set(0, .86, -.1); g.add(helm);
    const streep = new THREE.Mesh(new THREE.TorusGeometry(.272, .035, 8, 32, Math.PI), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .4 })); streep.rotation.set(0, Math.PI / 2, 0); streep.position.copy(helm.position); g.add(streep);
    const vizier = new THREE.Mesh(new THREE.SphereGeometry(.275, 28, 16, Math.PI / 2 - .9, 1.8, 1.05, .75), new THREE.MeshPhysicalMaterial({ color: '#1b1f3a', roughness: .05, metalness: .3, clearcoat: 1 })); vizier.position.copy(helm.position); g.add(vizier);
    const bol = new THREE.Mesh(new THREE.SphereGeometry(.4, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#cfe9ff', transparent: true, opacity: .32, roughness: .05, clearcoat: 1 })); bol.position.copy(helm.position); bol.visible = false; g.add(bol);
    if (dier) { const kl = dier === 'luipaard' ? '#ffc93c' : dier === 'vos' ? '#ff8a2a' : '#ece8df';
      [-.13, .13].forEach(dx => { const oor = dier === 'haas' ? new THREE.Mesh(new THREE.CapsuleGeometry(.05, .26, 4, 8), new THREE.MeshStandardMaterial({ color: kl, roughness: .6 })) : new THREE.Mesh(new THREE.ConeGeometry(.085, dier === 'vos' ? .2 : .13, 12), new THREE.MeshStandardMaterial({ color: kl, roughness: .6 }));
        oor.position.set(dx, 1.12 + (dier === 'haas' ? .1 : 0), -.14); oor.rotation.z = -dx * 1.4; g.add(oor); }); }
    g.traverse(m => { if (m.isMesh) m.castShadow = true; }); g.userData = { helm, streep, bol }; return g; }
  const karts = {};
  const SCHADUW = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(10,12,30,.55)'); r.addColorStop(.55, 'rgba(10,12,30,.28)'); r.addColorStop(1, 'rgba(10,12,30,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  function maakKart(naam, model, lak, naamKleur, dier) {
    const k = M[model].sc.clone(true); let lijf = null; const wielMeshes = [];
    k.traverse(o => { if (!o.isMesh) return; o.material = o.material.clone(); o.castShadow = o.receiveShadow = true; let a = o, inKar = false; while (a) { if (a.name === 'character') inKar = true; a = a.parent; }
      if (inKar) return; if (/^wheel/.test(o.name) || (o.parent && /^wheel/.test(o.parent.name))) wielMeshes.push(o); else if (!lijf) lijf = o; });
    const ch = k.getObjectByName('character'); if (ch) ch.visible = false;
    const cour = coureur(dier, naam === 'jij' ? '#ffffff' : lak); k.add(cour);
    const g = new THREE.Group(), kant = new THREE.Group(); kant.add(k); k.scale.setScalar(2.2); g.add(kant); scene.add(g);
    const bord = new THREE.Sprite(new THREE.SpriteMaterial({ map: label(naam, naamKleur, '#1b1f3a', 512, 192, 120), depthTest: false, transparent: true })); bord.scale.set(1.36, .51, 1); bord.position.set(0, 3.3, 0); bord.renderOrder = 9; g.add(bord);
    const schaduw = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.5), new THREE.MeshBasicMaterial({ map: SCHADUW, transparent: true, depthWrite: false })); schaduw.rotation.x = -Math.PI / 2; schaduw.position.y = .035; schaduw.renderOrder = 1; g.add(schaduw);
    const vlam = new THREE.Mesh(new THREE.ConeGeometry(.12, .7, 12), new THREE.MeshStandardMaterial({ color: '#ff9f2f', emissive: '#ff8a1e', emissiveIntensity: 3, transparent: true, opacity: .9 })); vlam.rotation.x = -Math.PI / 2; vlam.position.set(0, .3, -.95); vlam.visible = false; k.add(vlam);
    const u = { schaduw, k, kant, lijf, lijfGeo: lijf ? lijf.geometry : null, boxGeo: null, wielMeshes, wielen: ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right'].map(n => k.getObjectByName(n)).filter(Boolean), cour, bord, vlam, s: S0, doel: S0, v: 0, yaw: null };
    g.userData = u;
    if (paletBeeld && lijf) { const t = palet(lak, '#d9dbe6'); u.palet = t; lijf.material.map = t; wielMeshes.forEach(w => { w.material.map = t; }); }
    karts[naam] = g; return g; }

  /* eigen kart: onderdelen en uiterlijk (winkel) */
  const look = { lak: { kleur: opts.kleur || '#3a5bff' }, helm: { kleur: '#ffffff' }, spoiler: 'klein', velgen: { kleur: '#d9dbe6' }, vlam: '#ff9f2f', spoor: null, vlag: null, nummer: 0, sterren: [] };
  let jij = null, delenTal = 4; const D = {};
  const VKLEUR = ['#ff6fa8', '#ff9f43', '#24bf80', '#3ba7ff', '#a6afc7', '#3ba7ff', '#24bf80', '#ff9f43', '#ff6fa8'];
  const sterBalk = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); sterBalk.scale.set(2.5, .3, 1); sterBalk.position.set(0, 2.82, 0); sterBalk.renderOrder = 9;
  const tekenSterren = st => { sterBalk.material.map = canvasTex(600, 72, (g, w, h) => { g.fillStyle = 'rgba(27,31,58,.82)'; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 34); g.fill();
      for (let i = 0; i < 9; i++) { const goud = !!st[i], cx = 44 + i * 64, cy = 37, R = goud ? 27 : 21, r = R * .45; g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, q = j % 2 ? r : R; g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } g.closePath();
        g.fillStyle = goud ? '#ffd23f' : VKLEUR[i]; g.globalAlpha = goud ? 1 : .55; g.fill(); g.globalAlpha = 1; if (goud) { g.lineWidth = 3; g.strokeStyle = '#fff3c4'; g.stroke(); } } }); sterBalk.material.needsUpdate = true; };
  tekenSterren([]);
  function maakJij() { jij = maakKart('jij', 'kart-oobi', look.lak.kleur || '#3a5bff', '#ffffff'); jij.add(sterBalk); const k = jij.userData.k;
    D.lampen = [-.3, .3].map(x => { const l = new THREE.Mesh(new THREE.CircleGeometry(.09, 16), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: .2 })); l.position.set(x, .32, .78); k.add(l); return l; });
    D.spoiler = new THREE.Group(); D.spoiler.position.set(0, .62, -.62); k.add(D.spoiler);
    D.strepen = new THREE.Group(); [-.2, .2].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(.14, .02, 1.0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .4 })); s.position.set(x, .43, .25); s.castShadow = true; D.strepen.add(s); }); k.add(D.strepen);
    D.uitlaat = new THREE.Group(); [-.18, .18].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .4, 14), new THREE.MeshStandardMaterial({ color: '#d7dbe8', metalness: .9, roughness: .2 })); p.rotation.x = Math.PI / 2; p.position.set(x, .28, -.72); D.uitlaat.add(p); }); k.add(D.uitlaat);
    D.nummer = new THREE.Mesh(new THREE.CircleGeometry(.17, 24), new THREE.MeshStandardMaterial({ transparent: true, roughness: .5 })); D.nummer.rotation.x = -Math.PI / 2; D.nummer.position.set(0, .47, .5); D.nummer.visible = false; k.add(D.nummer);
    D.vlag = new THREE.Group(); { const stok = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .9, 6), new THREE.MeshStandardMaterial({ color: '#1b1f3a' })); stok.position.set(-.36, .85, -.55); D.vlag.add(stok);
      const doek = new THREE.Mesh(new THREE.PlaneGeometry(.32, .2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .7 })); doek.position.set(-.36, 1.2, -.72); doek.rotation.y = Math.PI / 2; D.vlag.add(doek); D.vlag.userData.doek = doek; } k.add(D.vlag);
    pasUiterlijk(); delenZichtbaar(delenTal); }
  function lakMat(l) {
    if (l.patroon === 'tijger') return new THREE.MeshStandardMaterial({ map: patroon('tijger', '#ff9f2f', '#1b1f3a'), roughness: .5 });
    if (l.patroon === 'vlammen') return new THREE.MeshStandardMaterial({ map: patroon('vlammen', '#e5484d'), roughness: .5 });
    if (l.patroon === 'luipaard') return new THREE.MeshStandardMaterial({ map: patroon('vlekken', '#ffc93c', '#6b4210'), roughness: .5 });
    if (l.patroon === 'regenboog') return new THREE.MeshStandardMaterial({ map: patroon('regenboog'), roughness: .45 });
    if (l.patroon === 'goud') return new THREE.MeshStandardMaterial({ color: '#f5c63a', metalness: .45, roughness: .28, emissive: '#8a5c00', emissiveIntensity: .35 });   // zonder omgevingsbeeld wordt echt metaal donker
    return new THREE.MeshStandardMaterial({ color: l.kleur || '#3a5bff', roughness: .45 }); }
  function bouwSpoiler(type, mt) { const g = D.spoiler; while (g.children.length) g.remove(g.children[0]); if (!M['debris-spoiler-a']) return;
    const vleugel = (s, y) => { const v = new THREE.Group(); for (const d of M['debris-spoiler-a'].delen) { const me = new THREE.Mesh(d.geo, mt); me.applyMatrix4(d.m); me.castShadow = true; v.add(me); } v.scale.setScalar(s); v.position.y = y; g.add(v); };
    if (type === 'groot') vleugel(1, .08); else if (type === 'dubbel') { vleugel(.78, 0); vleugel(.78, .2); }
    else if (type === 'vleugels') { vleugel(.88, .02); [-.47, .47].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .42), mt); p.position.set(x, .12, .05); p.castShadow = true; g.add(p); }); }
    else vleugel(.7, -.04); }
  function pasUiterlijk() { if (!jij) return; const u = jij.userData, l = look.lak || {};
    const patroonLak = !!l.patroon && l.patroon !== 'goud';
    const vg = look.velgen || {}, velgKleur = delenTal >= 4 ? (vg.kleur || '#d9dbe6') : '#d9dbe6';
    if (paletBeeld && u.lijf) { if (u.palet) u.palet.dispose(); u.palet = palet(!l.patroon ? (l.kleur || '#3a5bff') : '#d9dbe6', velgKleur);
      u.wielMeshes.forEach(w => { w.material.map = u.palet; w.material.emissive = new THREE.Color(vg.neon && delenTal >= 4 ? vg.kleur : '#000000'); w.material.emissiveMap = vg.neon && delenTal >= 4 ? u.palet : null; w.material.emissiveIntensity = vg.neon ? 1.6 : 0; w.material.needsUpdate = true; });
      if (l.patroon) { if (patroonLak && !u.boxGeo) u.boxGeo = boxUV(u.lijfGeo); u.lijf.geometry = patroonLak ? u.boxGeo : u.lijfGeo; u.lijf.material = lakMat(l); }
      else { u.lijf.geometry = u.lijfGeo; u.lijf.material = new THREE.MeshStandardMaterial({ map: u.palet, roughness: .55 }); } u.lijf.castShadow = true; }
    bouwSpoiler(look.spoiler || 'klein', lakMat(l));
    const h = look.helm || {}, c = u.cour.userData;
    c.helm.material = h.patroon === 'streep' || h.patroon === 'vlekken' ? new THREE.MeshPhysicalMaterial({ map: patroon(h.patroon, h.kleur || '#ffffff', h.patroon === 'vlekken' ? '#6b4210' : '#e5484d'), roughness: .3, clearcoat: 1 }) : new THREE.MeshPhysicalMaterial({ color: h.kleur || '#ffffff', roughness: .25, clearcoat: 1, clearcoatRoughness: .15 });
    c.bol.visible = h.patroon === 'bol';
    if (look.nummer) { D.nummer.material.map = canvasTex(128, 128, g => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 58, 0, 6.3); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1b1f3a'; g.stroke(); g.fillStyle = '#1b1f3a'; g.font = '700 66px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(look.nummer), 64, 70); }); D.nummer.material.needsUpdate = true; }
    D.nummer.visible = !!look.nummer;
    D.vlag.visible = !!look.vlag; if (look.vlag) { const d = D.vlag.userData.doek; d.material.map = look.vlag === 'geblokt' ? patroon('geblokt') : null; d.material.color.set(look.vlag === 'geblokt' ? '#ffffff' : look.vlag); d.material.needsUpdate = true; }
    tekenSterren(look.sterren || []); }
  function delenZichtbaar(n) { delenTal = n; if (!jij) return; D.spoiler.visible = n >= 1; D.strepen.visible = n >= 2; D.uitlaat.visible = n >= 3; [D.spoiler, D.strepen, D.uitlaat].forEach(x => x.scale.setScalar(1)); pasUiterlijk(); }

  /* ---------- kratten met woorden (zoals de oude wereld: 6 vooruit) ---------- */
  const VENSTER = 6; let woordLijst = [], woordObj = {};
  const kratS = f => S0 + Math.max(0, Math.min(1, f)) * RL + 2.4;
  function maakWoordObj(i) { const w = woordLijst[i]; if (!w || woordObj[i] || !M['toy/item-box'] || !jij) return; const s = kratS(w.f), { p, t, m } = frame(s);
    const g = new THREE.Group(); g.position.copy(p).addScaledVector(m, jij.userData.lat || 0); g.rotation.y = yawVan(t);
    for (const d of M['toy/item-box'].delen) { const me = new THREE.Mesh(d.geo, d.mat); me.applyMatrix4(d.m); me.scale.multiplyScalar(4); me.position.multiplyScalar(4); me.castShadow = me.receiveShadow = true; g.add(me); }
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .8), new THREE.MeshStandardMaterial({ map: label(w.w, '#fff6dc', '#1b1f3a', 512, 192, 120), roughness: .7 })); b.position.set(0, .95, -.94); b.rotation.y = Math.PI; g.add(b);
    const munt = maakMunt(); munt.position.set(0, 2.7, 0); g.add(munt); g.userData.munt = munt; scene.add(g); woordObj[i] = g; }
  let losseMunten = [];
  const wisWoorden = () => { Object.values(woordObj).forEach(g => scene.remove(g)); woordObj = {}; losseMunten.forEach(m => scene.remove(m)); losseMunten = []; };
  function maakMunt() { const munt = new THREE.Group(); if (M['toy/item-coin-gold']) for (const d of M['toy/item-coin-gold'].delen) { const me = new THREE.Mesh(d.geo, d.mat.clone()); me.material.emissive = new THREE.Color('#ffb300'); me.material.emissiveIntensity = .9; me.applyMatrix4(d.m); me.castShadow = true; munt.add(me); }
    munt.scale.setScalar(4.4); return munt; }
  let vliegers = [];
  function vlieg(munt, goud) { if (!goud) munt.traverse(o => { if (o.isMesh) { o.material.color.set('#d5dae6'); o.material.emissive.set('#555b70'); } }); const wp = munt.getWorldPosition(V(0, 0, 0)); scene.attach(munt); munt.position.copy(wp); vliegers.push({ m: munt, t: 0 }); }

  /* ---------- deeltjes: stof, splinters, vonken, confetti ---------- */
  const STOF = reduce ? 60 : 220, stof = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.45, 1), new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 1, transparent: true, opacity: .32, depthWrite: false }), STOF);
  stof.frustumCulled = false; scene.add(stof); const sd = []; for (let i = 0; i < STOF; i++) sd.push({ p: V(0, -50, 0), v: V(0, 0, 0), l: 0 }); let si = 0; const tmpO = new THREE.Object3D();
  const stofWolk = (p, rich) => { const d = sd[si]; si = (si + 1) % STOF; d.p.copy(p); d.v.set(-rich.x * 2 + (Math.random() - .5) * 1.4, .8 + Math.random() * .8, -rich.z * 2 + (Math.random() - .5) * 1.4); d.l = 1; };
  let splinters = []; const splMat = ['#c98a4b', '#8a5a2b', '#ffd23f', '#ffffff'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .7 })), splGeo = new THREE.BoxGeometry(.35, .35, .2);
  const knal = p => { if (reduce) return; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(splGeo, splMat[i % 4]); m.position.copy(p); m.position.y = 1; m.castShadow = true; scene.add(m); splinters.push({ m, v: V((Math.random() - .5) * 9, 3 + Math.random() * 6, (Math.random() - .5) * 9), t: 0 }); } };
  const MAXV = 400, pgeo = new THREE.BufferGeometry(), ppos = new Float32Array(MAXV * 3), pkol = new Float32Array(MAXV * 3);
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(pkol, 3));
  const vonken = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: .32, vertexColors: true, transparent: true, opacity: .95 })); vonken.frustumCulled = false; scene.add(vonken);
  const deel = []; let pi = 0;
  const strooi = (p, n, kleuren, kracht = 1, rond = false) => { if (reduce) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28;
    deel[pi] = rond ? { x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * .18 * kracht, vy: .12 + Math.random() * .2 * kracht, vz: Math.sin(a) * .18 * kracht, l: 1, k: new THREE.Color(kleuren[i % kleuren.length]) }
                    : { x: p.x, y: p.y, z: p.z, vx: (Math.random() - .5) * .3 * kracht, vy: Math.random() * .25 * kracht, vz: (Math.random() - .5) * .3 * kracht, l: 1, k: new THREE.Color(kleuren[i % kleuren.length]) }; pi = (pi + 1) % MAXV; } };
  const CONF = 420, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.35, .22), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .6 }), CONF); conf.count = 0; conf.frustumCulled = false; scene.add(conf);
  const cd = []; const CKL = ['#ff6fa8', '#ffc93c', '#3a5bff', '#16b277', '#ff9f43', '#ffffff'].map(c => new THREE.Color(c));
  const confetti = p => { if (reduce) return; cd.length = 0; for (let i = 0; i < CONF; i++) { cd.push({ p: p.clone().add(V((Math.random() - .5) * 14, 6 + Math.random() * 8, (Math.random() - .5) * 14)), v: V((Math.random() - .5) * 4, Math.random() * 3, (Math.random() - .5) * 4), r: V(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: Math.random() * 6 }); conf.setColorAt(i, CKL[i % CKL.length]); } conf.count = CONF; conf.instanceColor.needsUpdate = true; };

  /* licht voor de tunnel */
  const kartLicht = new THREE.PointLight('#cfd8ff', 0, 9, 1.5); scene.add(kartLicht);
  const koplamp = new THREE.SpotLight('#fff1c4', 0, 60, .5, .6, 1.4), kdoel = new THREE.Object3D(); scene.add(koplamp, kdoel); koplamp.target = kdoel;

  /* ---------- motorgeluid ---------- */
  /* kart-motor: pruttelt stationair, brult op als je typt, toert hoog bij een woord-boost en geeft gas op de startgrid.
     Twee zaagtanden en een blokgolf een octaaf lager, met een 'putt-putt' (amplitude-modulatie op het toerental) en een filter dat opengaat bij gas. */
  let motor = null, motorV = 0;
  function motorStil() { if (motor) { motor.g.gain.cancelScheduledValues(0); motor.g.gain.value = 0; } }
  function motorGeluid(v, dt) { const rijden = (modus === 'training' || modus === 'race' || modus === 'tunnel') && !feest;
    if (!geluidAan || gepauzeerd || reduce || !rijden) { if (motor) motor.g.gain.setTargetAtTime(0, AC.currentTime, .08); return; }
    if (!motor) { const a = ac(); if (!a) return;
      const o1 = a.createOscillator(), o2 = a.createOscillator(), o3 = a.createOscillator(), lfo = a.createOscillator(), diep = a.createGain(), am = a.createGain(), f = a.createBiquadFilter(), g = a.createGain();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o2.detune.value = 14; o3.type = 'square'; lfo.type = 'square';
      f.type = 'lowpass'; f.Q.value = 2.5; am.gain.value = .65; diep.gain.value = .35; g.gain.value = 0;
      lfo.connect(diep).connect(am.gain); o1.connect(f); o2.connect(f); o3.connect(f); f.connect(am).connect(g).connect(a.destination);
      [o1, o2, o3, lfo].forEach(o => o.start()); motor = { o1, o2, o3, lfo, f, g }; }
    motorV += (Math.min(v, 34) - motorV) * Math.min(1, dt * 4);   // het toerental volgt de snelheid een tikje traag, zoals een echte motor
    const e = isRace() && startT >= 0 ? klok.elapsedTime - startT : 9, gas = e < 2.5 ? .5 + .5 * Math.sin(e * 7) : 0;
    const hz = 34 + motorV * 3.1 + boostT * 30 + gas * 38, t = AC.currentTime;
    motor.o1.frequency.setTargetAtTime(hz, t, .03); motor.o2.frequency.setTargetAtTime(hz, t, .03); motor.o3.frequency.setTargetAtTime(hz / 2, t, .03); motor.lfo.frequency.setTargetAtTime(hz / 2, t, .03);
    motor.f.frequency.setTargetAtTime(260 + motorV * 22 + boostT * 700 + gas * 400, t, .05);
    motor.g.gain.setTargetAtTime((.032 + Math.min(motorV, 30) / 30 * .03 + boostT * .02) * (duiken ? .5 : 1), t, .08); }

  /* ---------- toestand ---------- */
  let modus = 'garage', turbo = 0, schud = 0, wobbel = 0, feest = 0, draai = 0, intro = 0, introLoopt = false, startT = -1, sterPuls = 0, groei = [], fovDoel = 46;
  let raf = 0, gepauzeerd = true, klaar = false, wachtGebied = null, nick = String(opts.nick || 'Jij').slice(0, 12);
  const klok = new THREE.Clock(); let fpsN = 0, fpsT = performance.now(), metingen = 0;
  /* de typregel ligt onderin over de wereld (indeling C): de camera richt zich op het stuk erboven, zodat de kart niet achter de regel verdwijnt */
  /* wat er over de wereld ligt (typregel boven, toetsenbord onder): de camera richt zich op de vrije strook ertussen */
  let zicht = '';
  const band = () => { const d = box.querySelector('.w-dash'), h = box.clientHeight; let boven = 0, onder = h;
    if (d && d.offsetHeight) { const r0 = box.getBoundingClientRect().top; for (const el of d.children) { if (!el.offsetHeight) continue; const r = el.getBoundingClientRect(), t = r.top - r0, b = r.bottom - r0;
        if ((t + b) / 2 < h / 2) boven = Math.max(boven, Math.round(b) + 4); else onder = Math.min(onder, Math.round(t) - 4); } }
    return [boven, onder]; };
  function maat() { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w / 2, h / 2);
    const ruw = band(); zicht = ruw.join(','); let [boven, onder] = ruw; if (onder - boven < 80) { boven = 0; onder = h; } const hv = onder - boven;
    box.style.setProperty('--zicht-top', boven + 'px'); box.style.setProperty('--zicht', hv + 'px');
    cam.aspect = w / hv; if (hv < h) cam.setViewOffset(w, hv, 0, -boven, w, h); else cam.clearViewOffset(); projectie(cam.fov); }
  /* heel brede beelden: de breedte vasthouden in plaats van de hoogte, anders wordt alles piepklein */
  let fovNu = 46;
  function projectie(f, maxA = 2.4) { const a = cam.aspect; cam.fov = a > maxA ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(f) / 2) * maxA / a)) : f; cam.updateProjectionMatrix(); }
  addEventListener('resize', maat); if ('ResizeObserver' in window) new ResizeObserver(maat).observe(box); maat();
  const isRace = () => modus === 'race', inGarage = () => modus === 'garage' || modus === 'toonzaal';
  function lat(naam) { return naam === 'spook' ? -BAAN.solo : isRace() ? BAAN.race[naam] : BAAN.solo; }
  function plaatsAlles() { if (!jij) return;
    for (const [n, k] of Object.entries(karts)) { const u = k.userData; u.lat = lat(n); u.s = u.doel = S0 - (n === 'jij' ? 0 : .4); u.vel = 0; u.yaw = null; k.visible = n === 'jij' || (n === 'spook' ? spookAan && !isRace() && !inGarage() : isRace()); }
    if (podiumGroep) podiumGroep.visible = false;
    if (inGarage()) { jij.position.copy(GARAGE).add(V(0, .37, 0)); jij.rotation.set(0, modus === 'toonzaal' ? 0 : .6, 0); jij.userData.kant.rotation.z = 0; }
    jij.userData.bord.visible = sterBalk.visible = modus !== 'tunnel'; }

  /* ---------- modellen laden, daarna alles opbouwen ---------- */
  /* pas hier de eerste baan bouwen: zijn de modellen al geladen (eerst een les, dan de winkel), dan bouwt toonBaan meteen de vangrails, en daarvoor moeten zet/los hierboven al bestaan */
  toonBaan('dorp');
  Promise.all([...BASIS.map(pd => laadTel(laad(pd))), document.fonts ? document.fonts.load('700 100px Fredoka') : null]).then(() => {
    const img = M['kart-oobi'].sc.getObjectByProperty('isMesh', true).material.map; paletBeeld = img && img.image;
    toonBaan(baanId);
    maakJij(); maakKart('flits', 'kart-ooli', '#ffc93c', '#ffc93c', 'luipaard'); maakKart('vlam', 'kart-oodi', '#e5484d', '#ffd2c2', 'vos'); maakKart('hop', 'kart-oozi', '#12a26b', '#bff0d6', 'haas'); maakSpook();
    api.naam(nick); klaar = true; plaatsAlles(); const wl = woordLijst; woordLijst = []; api.woorden(wl); if (wachtGebied) api.gebied(wachtGebied); laadStatus();
  }).catch(e => { console.warn('racewereld: modellen laden mislukt', e); mislukt = true; laadEl.style.opacity = '0'; });

  /* ---------- de lus ---------- */
  function lus() { raf = 0; if (gepauzeerd) return;
    if (!jij) { raf = requestAnimationFrame(lus); return; }   // modellen laden nog: lucht-blauwe achtergrond van het vak
    const dt = Math.max(.001, Math.min(.05, klok.getDelta())), t = klok.elapsedTime;
    if (band().join(',') !== zicht) maat();
    stap(dt, t);
    if (metGloed) composer.render(); else renderer.render(scene, cam);
    fpsN++; const nu = performance.now(); if (nu - fpsT > 3000) { const fps = fpsN * 1000 / (nu - fpsT); metingen++; if (metingen === 2 && fps < 30 && metGloed) metGloed = false; fpsN = 0; fpsT = nu; }   /* na het opstarten meten: te traag = gloed uit */
    raf = requestAnimationFrame(lus); }
  function stap(dt, t) { const u = jij.userData;
    if (!inGarage() && modus !== 'podium') {
      for (const [n, k] of Object.entries(karts)) { if (!k.visible) continue; const w = k.userData; const r = glijd(w.s, w.doel, w.vel || 0, n === 'jij' ? .8 - boostT * .12 : .45, dt); w.s = r[0]; w.vel = r[1]; w.v = Math.max(0, w.vel); const fr = plaatsKart(k, n, dt, t);
        if (n !== 'spook' && w.v > 1.5 && Math.random() < dt * 9 * (modus === 'tunnel' ? .4 : 1)) for (const zij of [-1, 1]) stofWolk(k.position.clone().addScaledVector(fr.t, -1.5).addScaledVector(fr.m, zij * .9).add(V(0, .3, 0)), fr.t);
        if (n === 'jij' && w.v > 2 && look.spoor && Math.random() < .7) strooi(k.position.clone().addScaledVector(fr.t, -1.8).add(V(0, .6, 0)), 2, look.spoor.soort === 'ster' ? ['#ffffff', '#ffe066', '#7ad7ff'] : look.spoor.soort === 'confetti' ? ['#e5484d', '#ffc93c', '#3a5bff', '#12a26b', '#ff6fa8'] : ['#ffd23f', '#ff9f2f', '#ffffff'], 1.2);
        if (n !== 'jij') w.bord.material.opacity = THREE.MathUtils.clamp((k.position.distanceTo(cam.position) - 9) / 5, 0, 1); } }
    else if (inGarage()) { jij.rotation.y = modus === 'toonzaal' ? t * .55 : .5 + Math.sin(t * .35) * .32; u.kant.rotation.z = 0;
      if (modus === 'garage') { hopT = Math.max(0, hopT - dt * 2.8); jij.position.y = GARAGE.y + .37 + Math.sin(hopT * Math.PI) * .35; } }
    /* turbo-vlam */
    u.vlam.visible = turbo > 0 || boostT > .25; if (u.vlam.visible) { const s = (turbo > 1 ? 1.5 : 1) * (.85 + Math.sin(t * 40) * .15); u.vlam.scale.set(1, s, 1); if (look.vlam === 'regenboog') u.vlam.material.color.setHSL((t * .8) % 1, .9, .6); else u.vlam.material.color.set(look.vlam || '#ff9f2f'); u.vlam.material.emissive.copy(u.vlam.material.color); }
    if (turbo > 1 && Math.random() < .8) strooi(jij.position.clone().add(V(0, .8, 0)), 1, ['#ffe066', '#7ad7ff', '#ffffff'], 1.4);
    /* startlichten (race): rood, rood, rood, groen in de maat van het aftellen in app.js */
    if (isRace() && startT >= 0) { const e = t - startT; startLampen.forEach(l => { const i = l.userData.i; l.material.emissive.set(e >= 2.5 ? '#33ff66' : '#ff2a2a'); l.material.emissiveIntensity = e >= 2.5 ? 6 : (i < Math.floor((e - .4) / .7) + 1 && e >= .4 ? 6 : 0); }); }
    /* kratten, munten, splinters, stof, vonken, confetti */
    Object.values(woordObj).forEach((g, i) => { if (g.userData.munt) g.userData.munt.rotation.y = t * 2.4 + i; });
    vliegers = vliegers.filter(v => { v.t += dt; v.m.position.y += dt * 9; v.m.rotation.y += dt * 20; v.m.scale.setScalar(Math.max(.01, 4.4 * (1 - v.t * 1.4))); if (v.t > .65) { scene.remove(v.m); return false; } return true; });
    splinters = splinters.filter(s => { s.t += dt; s.v.y -= 18 * dt; s.m.position.addScaledVector(s.v, dt); if (s.m.position.y < .15) { s.m.position.y = .15; s.v.y *= -.3; s.v.x *= .7; s.v.z *= .7; } s.m.rotation.x += dt * 9; if (s.t > 1.6) { scene.remove(s.m); return false; } return true; });
    for (let i = 0; i < STOF; i++) { const d = sd[i]; if (d.l > 0) { d.l -= dt * 2.2; d.p.addScaledVector(d.v, dt); d.v.multiplyScalar(1 - dt * 1.5); }
      tmpO.position.copy(d.l > 0 ? d.p : V(0, -50, 0)); tmpO.rotation.set(0, 0, 0); tmpO.scale.setScalar(d.l > 0 ? (1.3 - d.l) * .8 + .15 : .001); tmpO.updateMatrix(); stof.setMatrixAt(i, tmpO.matrix); }
    stof.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < MAXV; i++) { const p = deel[i]; if (!p || p.l <= 0) { ppos[i * 3 + 1] = -99; continue; } p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy -= .012; p.l -= .022; if (p.y < 0) { p.y = 0; p.vy *= -.3; }
      ppos[i * 3] = p.x; ppos[i * 3 + 1] = p.y; ppos[i * 3 + 2] = p.z; pkol[i * 3] = p.k.r; pkol[i * 3 + 1] = p.k.g; pkol[i * 3 + 2] = p.k.b; }
    pgeo.attributes.position.needsUpdate = pgeo.attributes.color.needsUpdate = true;
    if (conf.count) { for (let i = 0; i < CONF; i++) { const c = cd[i]; c.v.y = Math.max(c.v.y - 6 * dt, -3.2); c.p.addScaledVector(c.v, dt); c.p.x += Math.sin(t * 3 + c.w) * dt * 1.5; if (c.p.y < .1) c.p.y = .1;
        tmpO.position.copy(c.p); tmpO.rotation.set(c.r.x + t * 4, c.r.y + t * 3, c.r.z); tmpO.scale.setScalar(1); tmpO.updateMatrix(); conf.setMatrixAt(i, tmpO.matrix); } conf.instanceMatrix.needsUpdate = true; }
    if (sterPuls > 0) { sterPuls = Math.max(0, sterPuls - dt); const s = 1 + Math.abs(Math.sin(t * 5)) * .5 * Math.min(1, sterPuls); sterBalk.scale.set(2.5 * s, .3 * s, 1); }
    groei = groei.filter(gr => { gr.t += dt * 3.2; const s = gr.t < 1 ? 1 + Math.sin(gr.t * Math.PI) * .5 : 1; gr.obj.scale.setScalar(Math.min(1, gr.t) * s); return gr.t < 1.2; });
    motorGeluid(Math.max(0, u.v || 0), dt);
    boostT = Math.max(0, boostT - dt * 2.2); strepenStap(dt);
    if (flitsLicht) flitsLicht.intensity = Math.max(0, flitsLicht.intensity - dt * 110);
    weerStap(dt, t);
    camera(dt, t); }
  /* soepel rijden (Tim 26-10-2026): de kart sprong per letter naar zijn plek en stond dan stil. Nu rijdt hij als een auto naar zijn plek:
     hij houdt vaart zolang je typt, rolt na een letter nog even door en remt rustig af als je stopt (kritisch gedempte veer, nooit voorbij het doel). */
  function glijd(nu, doel, vel, tijd, dt) { const w = 2 / tijd, x = w * dt, e = 1 / (1 + x + .48 * x * x + .235 * x * x * x), d = nu - doel, tmp = (vel + w * d) * dt;
    let v = (vel - w * tmp) * e, uit = doel + (d + tmp) * e; if ((doel - nu > 0) === (uit > doel)) { uit = doel; v = 0; } return [uit, v]; }
  function plaatsKart(k, n, dt, t) { const u = k.userData; const { p, t: tg, m } = frame(u.s);
    const zwaai = n === 'jij' ? 0 : Math.sin(t * .9 + u.lat) * .35;
    k.position.copy(p).addScaledVector(m, u.lat + zwaai); k.position.y = .02 + Math.abs(Math.sin(t * 22 + u.lat)) * .03 * Math.min(1, u.v / 5);
    const vooruit = frame(u.s + 4).t, krom = Math.atan2(tg.x * vooruit.z - tg.z * vooruit.x, tg.x * vooruit.x + tg.z * vooruit.z);
    const doelYaw = yawVan(tg) - krom * .6 + (n === 'jij' ? Math.sin(t * 30) * wobbel * .25 : Math.cos(t * .9 + u.lat) * .03 * Math.min(1, u.v / 5));
    u.yaw = u.yaw === null ? doelYaw : u.yaw + (doelYaw - u.yaw) * Math.min(1, dt * 8); k.rotation.y = u.yaw; if (n === 'jij') wobbel *= .9;
    u.kant.rotation.z = THREE.MathUtils.lerp(u.kant.rotation.z, krom * 1.4 * Math.min(1, u.v / 8), Math.min(1, dt * 5));
    u.wielen.forEach(w => { w.rotation.x += dt * u.v * 1.1; });
    return { p, t: tg, m }; }
  function camera(dt, t) { const k = Math.min(1, dt * 4), u = jij.userData;
    if (modus === 'toonzaal') { const ver = cam.aspect < 1.1 ? 2.5 : .8; cam.position.copy(GARAGE).add(V(5.2 + ver, 3.2 + ver * .3, 6.8 + ver)); cam.lookAt(GARAGE.x, 1.1, GARAGE.z); projectie(40); zonOp(GARAGE, V(1, 0, 0)); return; }
    if (modus === 'garage') { const a = .5 + Math.sin(t * .25) * .15; cam.position.copy(GARAGE).add(V(Math.sin(a) * 6.2, 2.5, Math.cos(a) * 6.2)); cam.lookAt(GARAGE.x, .95, GARAGE.z); projectie(44, 3.6); zonOp(GARAGE, V(1, 0, 0)); return; }
    if (modus === 'podium') { podiumCamera(dt); return; }
    const f = frame(u.s);
    if (feest > 0) { draai = Math.min(1.4, draai + dt * .45); const h = .9 + draai; const doel = jij.position.clone().add(V(Math.sin(h) * 9, 3.6, Math.cos(h) * 9)); cam.position.lerp(doel, k); cam.lookAt(jij.position.x, 1.2, jij.position.z); zonOp(jij.position, f.t); return; }
    /* lage, brede beelden: camera lager en blik hoger, zodat de horizon en het decor in beeld blijven en de kart onderin net boven de typregel staat */
    const vf = cam.fov, pitch = THREE.MathUtils.degToRad(opts.foto ? 9 : Math.min(21.5, vf / 2 - 2.5)), hoog = opts.foto ? 3.3 : THREE.MathUtils.clamp(10.5 * Math.tan(THREE.MathUtils.degToRad(vf - 6)), 3.4, 5.8);   // foto: lagere camera voor websitebeelden
    const doel = jij.position.clone().addScaledVector(f.t, -(10.5 + boostT * 1.6)).addScaledVector(f.m, 3.2); doel.y = hoog;
    if (introLoopt) intro = Math.max(0, intro - dt / 2.4); const e = intro * intro; doel.addScaledVector(f.t, -e * 18); doel.y += e * 16;
    if (schud > 0) { doel.add(V((Math.random() - .5) * schud, (Math.random() - .5) * schud, (Math.random() - .5) * schud)); schud *= .85; }
    cam.position.lerp(doel, e > 0 ? 1 : k); const kijk = jij.position.clone().addScaledVector(frame(u.s + 8).t, 7).addScaledVector(f.m, -3.2 * (isRace() ? 1 : .4)); kijk.y = hoog - 17.5 * Math.tan(pitch) + e * 2; cam.lookAt(kijk);
    fovNu += (fovDoel - fovNu) * Math.min(1, dt * 3); projectie(fovNu + boostT * 7, 2.8);
    zonOp(jij.position, f.t);
    kartLicht.position.copy(jij.position).add(V(0, 3.2, 0)).addScaledVector(f.t, -1.5); koplamp.position.copy(jij.position).addScaledVector(f.t, 1.6).add(V(0, 1.2, 0)); kdoel.position.copy(jij.position).addScaledVector(frame(u.s + 14).t, 16); }
  function zonOp(p, t) { zon.position.copy(p).add(V(SF.zp[0], SF.zp[1], SF.zp[2])); zon.target.position.copy(p).addScaledVector(t, 10); }

  /* ---------- weer per gebied (Tim 26-10-2026): sneeuw in de bergen, meeuwen boven het strand, een lage gouden zon boven het circuit ---------- */
  let sneeuw = null, meeuwen = null, zonBol = null;
  function maakSneeuw() { const n = 1800, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = cam.position.x + (Math.random() - .5) * 80; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = cam.position.z + (Math.random() - .5) * 80; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const vlok = canvasTex(64, 64, (c, w, h) => { const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h); });
    sneeuw = new THREE.Points(g, new THREE.PointsMaterial({ size: .5, map: vlok, transparent: true, depthWrite: false })); sneeuw.frustumCulled = false; scene.add(sneeuw); }
  function maakMeeuwen() { meeuwen = new THREE.Group(); const wit = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7 }), grijs = new THREE.MeshStandardMaterial({ color: '#9aa3b5', roughness: .7 }), geel = new THREE.MeshStandardMaterial({ color: '#ffb02e' });
    for (let i = 0; i < 9; i++) { const m = new THREE.Group(), lijf = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .5, 4, 8), wit); lijf.rotation.x = Math.PI / 2; m.add(lijf);
      const snavel = new THREE.Mesh(new THREE.ConeGeometry(.05, .18, 6), geel); snavel.rotation.x = Math.PI / 2; snavel.position.z = .42; m.add(snavel);
      const vleugel = k => { const v = new THREE.Group(), blad = new THREE.Mesh(new THREE.BoxGeometry(.85, .06, .3), wit), punt = new THREE.Mesh(new THREE.BoxGeometry(.32, .061, .22), grijs); blad.position.x = k * .45; punt.position.x = k * .95; v.add(blad, punt); m.add(v); return v; };
      /* de meeuwen vliegen een stukje voor je kart uit mee, zodat je ze ook echt ziet */
      m.userData = { l: vleugel(-1), r: vleugel(1), c: V(0, 0, 0), voor: 12 + Math.random() * 30, opzij: (Math.random() - .5) * 24, r0: 3 + Math.random() * 5, h: 4.6 + Math.random() * 2.2, v: (Math.random() < .5 ? -1 : 1) * (.25 + Math.random() * .2), f: Math.random() * 6.28 };
      m.scale.setScalar(2.1); meeuwen.add(m); }
    scene.add(meeuwen); }
  function weerStap(dt, t) { const buiten = !inGarage() && modus !== 'tunnel' && !reduce;
    if (gebiedId === 'bergen' && buiten) { if (!sneeuw) maakSneeuw(); sneeuw.visible = true; const ps = sneeuw.geometry.attributes.position, c = cam.position;
      for (let i = 0; i < ps.count; i++) { let x = ps.getX(i) + Math.sin(t * .8 + i) * dt * .6, y = ps.getY(i) - dt * (2 + (i % 5) * .35), z = ps.getZ(i);
        if (y < 0) y += 14; if (x - c.x > 40) x -= 80; else if (x - c.x < -40) x += 80; if (z - c.z > 40) z -= 80; else if (z - c.z < -40) z += 80; ps.setXYZ(i, x, y, z); }
      ps.needsUpdate = true; } else if (sneeuw) sneeuw.visible = false;
    if (gebiedId === 'strand' && buiten) { if (!meeuwen) maakMeeuwen(); meeuwen.visible = true;
      meeuwen.children.forEach((m, i) => { const d = m.userData, a = t * d.v + d.f, rich = Math.sign(d.v); if (jij) { const f = frame(jij.userData.s + d.voor); d.c.lerp(f.p.clone().addScaledVector(f.m, d.opzij), Math.min(1, dt * 1.5)); } m.position.set(d.c.x + Math.cos(a) * d.r0, d.h + Math.sin(t * .7 + i) * 1.2, d.c.z + Math.sin(a) * d.r0);
        m.rotation.set(0, Math.atan2(-Math.sin(a) * rich, Math.cos(a) * rich), .45 * rich);   /* schuin in de bocht, vleugels in een V, zodat je ze ook van achteren ziet */
        const fl = Math.sin(t * 6 + i * 1.7) * .4; d.l.rotation.z = -.35 - fl; d.r.rotation.z = .35 + fl; }); } else if (meeuwen) meeuwen.visible = false;
    if (gebiedId === 'kasteel' && !inGarage() && modus !== 'tunnel') { if (!zonBol) { zonBol = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(2.2), fog: false })); zonBol.scale.setScalar(34); scene.add(zonBol); }
      zonBol.visible = true; const zp = SFEER.kasteel.zp; zonBol.position.copy(cam.position).add(V(zp[0], zp[1] * .55, zp[2]).normalize().multiplyScalar(620)); } else if (zonBol) zonBol.visible = false; }

  /* ---------- woord-boost: snelheidsstrepen langs de kart en een woesj ---------- */
  const STREEP = 64, strepen = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .1, 4.6), new THREE.MeshBasicMaterial({ color: '#f2f8ff', transparent: true, opacity: .8, depthWrite: false, fog: false }), STREEP);
  strepen.frustumCulled = false; scene.add(strepen); const sp = []; for (let i = 0; i < STREEP; i++) sp.push({ p: V(0, -99, 0), r: V(0, 0, 1), l: 0, yaw: 0 }); let spi = 0;
  function strepenSpawn(n) { if (reduce || !jij) return; const f = frame(jij.userData.s);
    for (let i = 0; i < n; i++) { const d = sp[spi]; spi = (spi + 1) % STREEP; const zij = (Math.random() < .5 ? -1 : 1) * (1.8 + Math.random() * 6);
      d.p.copy(jij.position).addScaledVector(f.t, 2 + Math.random() * 16).addScaledVector(f.m, zij); d.p.y = .3 + Math.random() * 3.6; d.l = 1; d.r.copy(f.t); d.yaw = yawVan(f.t); } }
  function strepenStap(dt) { for (let i = 0; i < STREEP; i++) { const d = sp[i]; if (d.l > 0) { d.l -= dt * 2.6; d.p.addScaledVector(d.r, -dt * 75); }
      tmpO.position.copy(d.l > 0 ? d.p : V(0, -99, 0)); tmpO.rotation.set(0, d.yaw, 0); tmpO.scale.set(1, 1, d.l > 0 ? .4 + d.l : .001); tmpO.updateMatrix(); strepen.setMatrixAt(i, tmpO.matrix); }
    strepen.instanceMatrix.needsUpdate = true; }
  function ruis(dur, type, f0, f1, vol) { if (!geluidAan || !ac()) return; const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(), t0 = AC.currentTime; s.buffer = b; fl.type = type; fl.Q.value = .8;
    fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * .25); g.gain.linearRampToValueAtTime(0, t0 + dur);
    s.connect(fl).connect(g).connect(AC.destination); s.start(); }

  /* ---------- spook: een doorzichtige kart die rijdt in het tempo van de vorige keer ---------- */
  function maakSpook() { const g = maakKart('spook', 'kart-oobi', '#9fd8ff', '#d6f0ff', null); g.userData.bord.material.map = label('spook', '#d6f0ff', '#1b1f3a', 512, 192, 120);
    const geest = new THREE.MeshStandardMaterial({ color: '#cfeaff', emissive: '#5fb8ff', emissiveIntensity: .55, transparent: true, opacity: .34, depthWrite: false, roughness: .4 });
    g.userData.schaduw.visible = false; g.traverse(o => { if (o.isMesh && o !== g.userData.vlam && o !== g.userData.schaduw) { o.material = geest; o.castShadow = o.receiveShadow = false; } }); g.visible = false; }

  /* ---------- podium na de race: plek 1, 2 en 3 op de treden, de vierde ernaast ---------- */
  function bouwPodium() { const g = new THREE.Group(), f = frame(podiumS);
    const blok = (x, h, kleur, nr) => { const b = new THREE.Mesh(new THREE.BoxGeometry(4, h, 3.2), new THREE.MeshStandardMaterial({ color: kleur, roughness: .45, metalness: .15 })); b.position.set(x, h / 2, 0); b.castShadow = b.receiveShadow = true; g.add(b);
      const n = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.05), new THREE.MeshStandardMaterial({ map: label(nr, '#ffffff', '#1b1f3a', 256, 216, 170), transparent: true })); n.position.set(x, Math.max(.6, h / 2), -1.62); n.rotation.y = Math.PI; g.add(n); };
    blok(0, 1.7, '#ffc93c', '1'); blok(4.3, 1.2, '#d9dee9', '2'); blok(-4.3, .8, '#d89a5b', '3');   // lokale +x = links vanaf de camera
    const doek = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.4), new THREE.MeshStandardMaterial({ map: label('FLITS CUP', '#1b1f3a', '#ffc93c', 1024, 168, 120, false), roughness: .6 })); doek.position.set(0, 5.4, 3.4); doek.rotation.y = Math.PI; g.add(doek);
    for (const x of [-7.2, 7.2]) { const paal = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 6.6, 10), new THREE.MeshStandardMaterial({ color: '#1b1f3a' })); paal.position.set(x, 3.3, 3.4); g.add(paal); }
    g.position.copy(f.p); g.rotation.y = yawVan(f.t); g.visible = false; BANEN_G[baanId].add(g); BANEN_G[baanId].userData.podium = g; podiumGroep = g; g.userData.plek = [[0, 1.7, 0], [4.3, 1.2, 0], [-4.3, .8, 0], [-8.6, 0, -1.2]]; }
  function podiumCamera(dt) { podiumT += dt; const f = frame(podiumS), c = f.p.clone(), a = Math.sin(podiumT * .35) * .32;
    const doel = c.clone().addScaledVector(f.t, -14 * Math.cos(a)).addScaledVector(f.m, -14 * Math.sin(a)); doel.y = 4.6;
    cam.position.lerp(doel, podiumT < .05 ? 1 : Math.min(1, dt * 3)); cam.lookAt(c.x, 2.4, c.z); projectie(42, 2.8); zonOp(c, f.t); }

  /* ---------- muziek: per gebied een eigen deuntje, zelf gemaakt met Web Audio (geen bestanden, geen rechten) ---------- */
  const LIEDJES = {
    dorp:    { bpm: 116, grond: 60, akk: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], arp: [0, 1, 2, 1, 0, 2, 1, 2], golf: 'square', bas: 'triangle' },
    strand:  { bpm: 100, grond: 65, akk: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], arp: [0, 2, 1, 2, 0, 2, 1, 2], golf: 'triangle', bas: 'triangle', stoot: true },
    bergen:  { bpm: 122, grond: 62, akk: [[0, 3, 7], [-2, 2, 5], [3, 7, 10], [-5, -2, 2]], arp: [0, 1, 2, 3, 2, 1, 0, 1], golf: 'triangle', bas: 'sawtooth' },
    kasteel: { bpm: 132, grond: 67, akk: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]], arp: [0, 1, 2, 0, 1, 2, 3, 2], golf: 'square', bas: 'sawtooth' } };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  let mz = null, ruisBuf = null;
  function muziekCheck() { const moet = muziekAan && !gepauzeerd && !reduce && ['training', 'race', 'tunnel', 'garage'].includes(modus) && !!ac();
    if (moet && !mz) { const uit = AC.createGain(), filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 20000; uit.gain.value = 0; uit.connect(filt).connect(AC.destination);
      mz = { uit, filt, stap: 0, t: AC.currentTime + .15, timer: setInterval(plan, 60) }; plan(); }
    else if (!moet && mz) { const m = mz; mz = null; clearInterval(m.timer); m.uit.gain.setTargetAtTime(0, AC.currentTime, .12); setTimeout(() => { try { m.filt.disconnect(); } catch (e) {} }, 900); }
    if (mz) { mz.uit.gain.setTargetAtTime((duiken ? .012 : .045) * (modus === 'garage' ? .7 : 1), AC.currentTime, .25); mz.filt.frequency.setTargetAtTime(modus === 'tunnel' ? 650 : 20000, AC.currentTime, .2); } }
  function noot(f, t, dur, type, vol, cut) { const o = AC.createOscillator(), g = AC.createGain(), fl = AC.createBiquadFilter(); o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(fl).connect(g).connect(mz.uit); o.start(t); o.stop(t + dur + .05); }
  function trom(t) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + .14); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g).connect(mz.uit); o.start(t); o.stop(t + .2); }
  function hihat(t) { if (!ruisBuf) { ruisBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * .05), AC.sampleRate); const d = ruisBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = ruisBuf; fl.type = 'highpass'; fl.frequency.value = 7000; g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); s.connect(fl).connect(g).connect(mz.uit); s.start(t); }
  function plan() { if (!mz) return; if (mz.t < AC.currentTime) mz.t = AC.currentTime + .05; const L = LIEDJES[gebiedId] || LIEDJES.dorp, acht = 60 / L.bpm / 2;   // een achtste noot
    while (mz.t < AC.currentTime + .25) { const s = mz.stap, c = L.akk[Math.floor(s / 8) % 4], j = s % 8, t = mz.t, ronde = Math.floor(s / 32);
      const toon = i => L.grond + (i < 3 ? c[i] : c[0] + 12);
      if (j % 2 === 0) noot(hz(L.grond - 24 + c[0]), t, acht * 1.7, L.bas, .26, 600);
      if (j === 0 || j === 4) trom(t);
      if (j % 2 === 1) hihat(t);
      if (L.stoot && j % 2 === 1) [0, 1, 2].forEach(i => noot(hz(toon(i)), t, acht * .6, 'sawtooth', .04, 1500));
      if (ronde % 2 === 1 || j % 2 === 0) noot(hz(toon(L.arp[j]) + (ronde % 4 === 3 ? 12 : 0)), t, acht * .9, L.golf, .09, 2400);
      mz.stap++; mz.t += acht; } }

  const api = {
    naam(n, kleur) { nick = String(n || 'Jij').slice(0, 12); if (kleur) look.lak = { kleur };
      pitbord.material.map = pitTex(nick); pitbord.material.needsUpdate = true;
      if (jij) { jij.userData.bord.material.map = label(nick, '#ffffff', '#1b1f3a', 512, 192, 120); jij.userData.bord.material.needsUpdate = true; if (kleur) pasUiterlijk(); } },
    delen(n) { delenZichtbaar(n); },
    modus(m) { modus = m; turbo = 0; boostT = 0; spookAan = false; podiumT = 0; fovDoel = 46; feest = 0; draai = 0; startT = -1; conf.count = 0; deel.length = 0; wisWoorden(); vliegers.forEach(v => scene.remove(v.m)); vliegers = [];
      intro = inGarage() || reduce ? 0 : 1; introLoopt = false; box.classList.remove('turbo1', 'turbo2');
      startLampen.forEach(l => { l.material.emissiveIntensity = 0; }); sfeer(); plaatsAlles(); muziekCheck(); },
    uiterlijk(l) { Object.assign(look, l || {}); pasUiterlijk(); },
    munten(fracs) { losseMunten.forEach(m => scene.remove(m)); losseMunten = (fracs || []).map(f => { const { p, m } = frame(kratS(f) - 1.8), mu = maakMunt(); mu.position.copy(p).addScaledVector(m, jij ? jij.userData.lat : 0); mu.position.y = 2.7; scene.add(mu); return mu; }); },
    pak(i, goud) { const g = woordObj[i]; if (!g) { api.pakNu(goud); return; } delete woordObj[i]; knal(g.position); schud = reduce ? 0 : .3; speel('krat' + (1 + i % 3), .45, .95 + Math.random() * .1);
      if (g.userData.munt) vlieg(g.userData.munt, goud); scene.remove(g); maakWoordObj(i + VENSTER); if (gebiedId === 'kasteel' && isRace()) juichen(.4); },
    pakNu(goud) { if (!jij) return; const f = frame(jij.userData.s + 3), mu = maakMunt(); mu.position.copy(f.p).addScaledVector(f.m, jij.userData.lat); mu.position.y = 2.2; scene.add(mu); vlieg(mu, goud); },
    ster() { if (jij) strooi(jij.position.clone().add(V(0, 2.4, 0)), 40, ['#ffd23f', '#ffffff', '#ffe9a6'], 1.4, true); },
    wijsSterren() { sterPuls = 7; if (jij) strooi(jij.position.clone().add(V(0, 2.6, 0)), 24, ['#ffd23f', '#ffffff'], 1, true); },
    start() { introLoopt = true; startT = klok.elapsedTime; },
    kid(f) { if (jij) jij.userData.doel = S0 + Math.max(0, Math.min(1, f)) * RL; },
    flits(f) { api.rivaal('flits', f); },
    rivaal(n, f) { const k = karts[n]; if (k) k.userData.doel = S0 + Math.max(0, Math.min(1, f)) * RL; },
    gebied(id) { if (!SFEER[id] || id === 'garage' || id === 'tunnel') id = 'dorp'; gebiedId = id; gebiedGevraagd = true; toonBaan(id); grond.material.map = grondVan(id); grond.material.needsUpdate = true; stof.material.color.set(SFEER[id].stof); sfeer();
      if (!klaar) { wachtGebied = id; laadStatus(); return; }
      Object.entries(DECOR).forEach(([k, g]) => { if (g !== 'laden') g.visible = k === id; }); laadStatus();
      plaatsAlles(); if (!DECOR[id]) { DECOR[id] = 'laden'; laadStatus(); Promise.all(GEBIED_MODELLEN[id].map(pd => laadTel(laad(pd)))).then(() => { DECOR[id] = bouwGebied(id); DECOR[id].visible = gebiedId === id; laadStatus(); }).catch(e => { console.warn('racewereld: gebied', id, e); DECOR[id] = null; laadStatus(); }); } },
    woorden(lijst) { wisWoorden(); woordLijst = lijst || []; for (let i = 0; i < Math.min(VENSTER, woordLijst.length); i++) maakWoordObj(i); },
    goed(combo) { turbo = reduce ? 0 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0; fovDoel = 46 + (turbo ? 5 * turbo : 0); box.classList.toggle('turbo1', turbo === 1); box.classList.toggle('turbo2', turbo === 2);
      if (!jij) return; if (inGarage()) strooi(jij.position.clone().add(V(0, 1.4, 0)), 6, ['#ffc93c', '#ffffff', '#3a5bff'], 1, true); else strooi(jij.position.clone().add(V(0, .6, 0)), combo >= 10 ? 6 : 3, ['#ffc93c', '#ffffff', '#3a5bff']); },
    fout() { wobbel = reduce ? 0 : 1; turbo = 0; fovDoel = 46; schud = reduce ? 0 : .25; box.classList.remove('turbo1', 'turbo2'); },
    onderdeel(n) { delenTal = Math.max(delenTal, ['spoiler', 'strepen', 'uitlaat', 'velgen'].indexOf(n) + 1); if (!jij) return; const naar = n === 'velgen' ? null : D[n];
      if (naar) { naar.visible = true; naar.scale.setScalar(.01); groei.push({ obj: naar, t: 0 }); } else { delenTal = Math.max(delenTal, 4); pasUiterlijk(); }
      speel('metaal' + (1 + Math.floor(Math.random() * 2)), .55); strooi(jij.position.clone().add(V(0, 1.4, 0)), 90, ['#ffd23f', '#ffffff', '#ff9f2f', '#7ad7ff'], 2.3, true); if (flitsLicht && !reduce) flitsLicht.intensity = 45; hopT = reduce ? 0 : 1; },
    finish(win) { turbo = 0; fovDoel = 44; box.classList.remove('turbo1', 'turbo2'); if (win && !reduce) { feest = 1; confetti(frame(S0 + RL).p); if (gebiedId === 'kasteel') juichen(1.1); } },
    voor() { return !jij || !karts.flits || jij.userData.s >= karts.flits.userData.s; },
    pauze(b) { if (b === gepauzeerd) return; gepauzeerd = b; muziekCheck(); if (b) motorStil(); if (!b) { klok.getDelta(); maat(); if (!raf) raf = requestAnimationFrame(lus); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    geluid(b) { geluidAan = !!b; if (!b) motorStil(); },
    muziek(b) { muziekAan = !!b; muziekCheck(); },
    mislukt() { return mislukt; },
    duik(b) { duiken = !!b; muziekCheck(); },   // muziek zachter zolang Flits praat
    /* elk afgemaakt woord: de kart schiet even naar voren (goed = zonder fout = flinker) */
    boost(goed) { if (reduce || !jij || inGarage() || modus === 'podium') return; boostT = goed ? 1 : .6; strepenSpawn(goed ? 20 : 12); ruis(.38, 'bandpass', 450, 2600, goed ? .06 : .04); },
    spook(f) { const k = karts.spook; if (k) k.userData.doel = S0 + Math.max(0, Math.min(1, f)) * RL; },
    spookAan(b) { spookAan = !!b; const k = karts.spook; if (k) { k.visible = spookAan && !isRace() && !inGarage(); k.userData.s = k.userData.doel = S0 - .4; k.userData.vel = 0; k.userData.yaw = null; } },
    fotofinish() { if (reduce) return; ruis(.07, 'highpass', 3000, 6000, .09); const d = document.createElement('div'); d.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:.9;z-index:6;pointer-events:none;transition:opacity .7s';
      box.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.style.opacity = '0'; })); setTimeout(() => d.remove(), 800); },
    podium(volgorde) { if (!jij) return; if (!podiumGroep) bouwPodium(); modus = 'podium'; podiumT = 0; feest = 0; turbo = 0; boostT = 0; podiumGroep.visible = true; podiumGroep.updateMatrixWorld(true);
      if (karts.spook) karts.spook.visible = false; jij.userData.vlam.visible = false; muziekCheck();
      const yaw = yawVan(frame(podiumS).t) + Math.PI;
      (volgorde || ['jij', 'flits', 'vlam', 'hop']).forEach((n, i) => { const k = karts[n]; if (!k) return; const [x, h, z] = podiumGroep.userData.plek[Math.min(i, 3)];
        k.position.copy(V(x, 0, z).applyMatrix4(podiumGroep.matrixWorld)); k.position.y = h + .02; k.rotation.y = yaw; k.userData.kant.rotation.z = 0; k.visible = true; k.userData.bord.material.opacity = 1; });
      if (!reduce) confetti(frame(podiumS).p); juichen(1.2); }
  };
  sfeer();
  return api;
}

window.FV3D = { maak };
window.dispatchEvent(new Event('fv3d-klaar'));
