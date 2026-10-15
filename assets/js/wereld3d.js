/* Flitsvingers – 3D-racewereld voor het raceweekend (garage, training, tunnel, race).
   Wordt als module geladen; app.js gebruikt window.FV3D.maak(...). Lukt 3D niet, dan blijft FV3D leeg
   en draait de cursus gewoon met de platte racebaan. */
import * as THREE from 'three';

const L = 160;   // lengte van de baan (start x=0, finish x=L)
const GX = -30;  // plek van de garage

function maak(box, opts = {}) {
  const reduce = !!opts.reduce;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  box.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const DAG = { lucht: '#9fd9ff', mist: '#bfe6ff', n: 60, f: 150 };
  scene.background = new THREE.Color(DAG.lucht);
  scene.fog = new THREE.Fog(DAG.mist, DAG.n, DAG.f);
  const cam = new THREE.PerspectiveCamera(42, 2, .1, 400);
  const hemi = new THREE.HemisphereLight('#ffffff', '#6b8f3a', 1.05); scene.add(hemi);
  const zon = new THREE.DirectionalLight('#fff3d6', 1.6); zon.position.set(-30, 50, 40); scene.add(zon);

  const OUT = new THREE.MeshBasicMaterial({ color: '#1b1f3a', side: THREE.BackSide });
  const mat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const metRand = (geo, kleur, dik = 1.06) => { const g = new THREE.Group(); const m = new THREE.Mesh(geo, mat(kleur)); const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(dik); g.add(o, m); g.userData.m = m; return g; };
  const label = (tekst, bg = '#ffffff', fg = '#1b1f3a', w = 256, h = 128, fs = 74) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.lineWidth = 10; g.strokeStyle = '#1b1f3a'; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let f = fs; g.font = '600 ' + f + 'px Fredoka, sans-serif';
    while (f > 20 && g.measureText(tekst).width > w - 36) { f -= 4; g.font = '600 ' + f + 'px Fredoka, sans-serif'; }
    g.fillText(tekst, w / 2, h / 2 + 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const rand = s => { const x = Math.sin(s * 99.13) * 43758.5453; return x - Math.floor(x); };

  /* baan */
  const grond = new THREE.Mesh(new THREE.PlaneGeometry(700, 300), mat('#9ccf5a')); grond.rotation.x = -Math.PI / 2; grond.position.set(L / 2 - 40, -.02, -40); scene.add(grond);
  const baan = new THREE.Mesh(new THREE.PlaneGeometry(L + 80, 8.4), mat('#e9b46a')); baan.rotation.x = -Math.PI / 2; baan.position.set(L / 2 - 10, 0, 0); scene.add(baan);
  for (const z of [4.2, -4.2]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(L + 80, .25), new THREE.MeshBasicMaterial({ color: '#1b1f3a' })); r.rotation.x = -Math.PI / 2; r.position.set(L / 2 - 10, .01, z); scene.add(r); }
  for (let x = -20; x < L + 40; x += 4) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2, .22), new THREE.MeshBasicMaterial({ color: '#ffffff' })); s.rotation.x = -Math.PI / 2; s.position.set(x, .012, 0); scene.add(s); }
  const stoep = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, .35, .6), new THREE.MeshLambertMaterial(), 2 * Math.ceil((L + 60) / 1.4));
  { let n = 0; const tmp = new THREE.Object3D(), rood = new THREE.Color('#e5484d'), wit = new THREE.Color('#ffffff');
    for (const z of [4.6, -4.6]) for (let x = -20, i = 0; x < L + 40; x += 1.4, i++) { tmp.position.set(x, .17, z); tmp.updateMatrix(); stoep.setMatrixAt(n, tmp.matrix); stoep.setColorAt(n, i % 2 ? rood : wit); n++; }
    stoep.count = n; scene.add(stoep); }
  [25, 50, 75].forEach(p => { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: label(p + '%') })); b.position.set(p / 100 * L, 2.4, -6.2); scene.add(b);
    const paal = metRand(new THREE.CylinderGeometry(.12, .12, 1.8, 6), '#6b4b2a'); paal.position.set(p / 100 * L, .9, -6.2); scene.add(paal); });
  for (let x = 6; x < L; x += 26) { const b = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), new THREE.MeshBasicMaterial({ map: label('flitsvingers', x % 52 < 26 ? '#3a5bff' : '#ffc93c', x % 52 < 26 ? '#ffffff' : '#1b1f3a', 640, 102, 64) })); b.position.set(x, .8, -7.6); scene.add(b); }
  const boog = (x, tekst, kleur) => { const g = new THREE.Group();
    [-5.2, 5.2].forEach(z => { const p = metRand(new THREE.BoxGeometry(.7, 6, .7), kleur); p.position.set(0, 3, z); g.add(p); });
    const balk = metRand(new THREE.BoxGeometry(.9, 1.6, 11.2), kleur); balk.position.set(0, 6.4, 0); g.add(balk);
    const bord = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.3), new THREE.MeshBasicMaterial({ map: label(tekst, '#ffffff', '#1b1f3a', 640, 98, 64) })); bord.rotation.y = Math.PI / 2; bord.position.set(.48, 6.4, 0); g.add(bord);
    const bord2 = bord.clone(); bord2.rotation.y = -Math.PI / 2; bord2.position.x = -.48; g.add(bord2);
    g.position.x = x; scene.add(g); return g; };
  boog(-6, 'START', '#3a5bff'); boog(L, 'FINISH', '#ffc93c');   // startboog net achter de startplek: staat niet tussen camera en kart
  { const c = document.createElement('canvas'); c.width = 64; c.height = 512; const g = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#1b1f3a' : '#ffffff'; g.fillRect(x * 32, y * 32, 32, 32); }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 8.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })); fl.rotation.x = -Math.PI / 2; fl.position.set(L, .015, 0); scene.add(fl); }

  /* savanne (gebied 'dorp') */
  const savanne = new THREE.Group(); scene.add(savanne);
  const acacia = () => { const g = new THREE.Group(); const stam = metRand(new THREE.CylinderGeometry(.18, .3, 3, 5), '#7a5230'); stam.position.y = 1.5; g.add(stam);
    const kroon = metRand(new THREE.CylinderGeometry(2.4, 1.6, .9, 7), '#4f9b3a', 1.05); kroon.position.y = 3.3; g.add(kroon); return g; };
  for (let i = 0; i < 46; i++) { const t = acacia(); const zij = i % 3 === 0 ? 1 : -1; t.position.set(-20 + rand(i) * (L + 60), 0, zij * (zij > 0 ? 15 : 11) + zij * rand(i + 7) * 26); t.scale.setScalar(.8 + rand(i + 3) * .7); t.rotation.y = rand(i + 5) * 6; savanne.add(t); }
  for (let i = 0; i < 30; i++) { const r = metRand(new THREE.DodecahedronGeometry(.6 + rand(i + 11) * 1.1, 0), '#b9a58a'); r.position.set(-10 + rand(i + 21) * (L + 40), .3, (i % 2 ? 1 : -1) * (6.5 + rand(i + 31) * 14)); r.rotation.set(rand(i), rand(i + 1), 0); savanne.add(r); }
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(14 + rand(i) * 12, 18 + rand(i + 4) * 16, 6), mat(i % 2 ? '#7ea86a' : '#6b9a5a')); b.position.set(-20 + i * 26, 8, -95 - rand(i + 2) * 25); savanne.add(b); }
  const wolken = [];
  for (let i = 0; i < 10; i++) { const w = new THREE.Group(); for (let j = 0; j < 3; j++) { const s = metRand(new THREE.IcosahedronGeometry(2 + j * .4, 0), '#ffffff', 1.04); s.position.set(j * 2.6, (j % 2) * .6, 0); w.add(s); }
    w.position.set(-20 + i * 22, 22 + rand(i) * 8, -60 - rand(i + 9) * 30); scene.add(w); wolken.push(w); }


  /* ---------- gebieden: elk gebied van de spelkaart een eigen wereld (sinds 15-10-2026) ---------- */
  const GEBIED = { dorp: { grond: '#9ccf5a', lucht: '#9fd9ff', mist: '#bfe6ff' }, strand: { grond: '#f1d79a', lucht: '#8fd8ff', mist: '#c8eeff' },
    bergen: { grond: '#e6eef2', lucht: '#a9d4f5', mist: '#dbeaf5' }, kasteel: { grond: '#7fb35b', lucht: '#9cc4ff', mist: '#cadcff' } };
  const DECOR = { dorp: savanne };
  const plek = (i, zijMin, zijMax) => { const zij = i % 3 === 0 ? 1 : -1; return [-20 + rand(i * 1.7) * (L + 60), zij * (zijMin + rand(i + 7) * (zijMax - zijMin))]; };
  function bouwStrand() { const g = new THREE.Group();
    const zee = new THREE.Mesh(new THREE.PlaneGeometry(760, 160), mat('#39a6d9')); zee.rotation.x = -Math.PI / 2; zee.position.set(L / 2 - 40, .03, -97); g.add(zee);
    for (let i = 0; i < 30; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(5 + rand(i) * 7, .3), new THREE.MeshBasicMaterial({ color: '#eaf8ff' })); w.rotation.x = -Math.PI / 2; w.position.set(-20 + rand(i + 3) * (L + 60), .06, -19 - rand(i + 8) * 45); g.add(w); }
    const palm = () => { const pg = new THREE.Group(); let y = 0, x = 0;
      for (let j = 0; j < 4; j++) { const st = metRand(new THREE.CylinderGeometry(.2 - j * .025, .27 - j * .025, 1.3, 6), '#9b6b3a'); st.position.set(x, y + .62, 0); st.rotation.z = -.1 * j; pg.add(st); y += 1.2; x += .14 * j; }
      for (let k = 0; k < 6; k++) { const arm = new THREE.Group(); arm.rotation.y = k * Math.PI / 3; arm.position.set(x, y + .1, 0);
        const blad = metRand(new THREE.BoxGeometry(2.3, .08, .55), k % 2 ? '#2fa14a' : '#3cb85a'); blad.position.x = 1.05; blad.rotation.z = -.38; arm.add(blad); pg.add(arm); }
      return pg; };
    for (let i = 0; i < 34; i++) { const pl = palm(); const [x, z] = plek(i, 9, 26); pl.position.set(x, 0, z > 0 ? z : -9 - rand(i) * 6); pl.scale.setScalar(.85 + rand(i + 2) * .5); pl.rotation.y = rand(i + 4) * 6; g.add(pl); }
    for (let i = 0; i < 9; i++) { const u = new THREE.Group(); const stok = metRand(new THREE.CylinderGeometry(.06, .06, 2.3, 5), '#ffffff'); stok.position.y = 1.15; u.add(stok);
      const dak = metRand(new THREE.ConeGeometry(1.5, .65, 8), ['#e5484d', '#ffc93c', '#3a5bff', '#ff6fa8'][i % 4]); dak.position.y = 2.35; u.add(dak);
      u.position.set(-10 + i * 19 + rand(i) * 6, 0, 8 + rand(i + 1) * 9); g.add(u); }
    for (let i = 0; i < 6; i++) { const b = new THREE.Group(); const romp = metRand(new THREE.BoxGeometry(4, .9, 1.6), '#ffffff'); romp.position.y = .45; b.add(romp);
      const zeil = metRand(new THREE.ConeGeometry(1.4, 3.6, 3), ['#e5484d', '#ffc93c', '#3a5bff'][i % 3]); zeil.position.y = 2.6; zeil.scale.z = .15; b.add(zeil);
      b.position.set(-10 + i * 32 + rand(i + 9) * 10, 0, -40 - rand(i + 5) * 30); g.add(b); }
    for (let i = 0; i < 5; i++) { const e = metRand(new THREE.SphereGeometry(10 + rand(i) * 8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#5fae4f'); e.position.set(-30 + i * 45, -2, -120 - rand(i) * 20); g.add(e); }
    scene.add(g); return g; }
  function bouwBergen() { const g = new THREE.Group();
    const den = () => { const d = new THREE.Group(); const st = metRand(new THREE.CylinderGeometry(.18, .25, 1.2, 5), '#6b4b2a'); st.position.y = .6; d.add(st);
      [[1.6, 1.8, 1.6], [1.25, 1.6, 2.6], [.85, 1.4, 3.5]].forEach(([r, h, y], j) => { const c = metRand(new THREE.ConeGeometry(r, h, 7), '#2f7a4a'); c.position.y = y; d.add(c);
        const sn = new THREE.Mesh(new THREE.ConeGeometry(r * .45, h * .35, 7), mat('#ffffff')); sn.position.y = y + h * .33; d.add(sn); }); return d; };
    for (let i = 0; i < 50; i++) { const d = den(); const [x, z] = plek(i, 10, 30); d.position.set(x, 0, z); d.scale.setScalar(.8 + rand(i + 3) * .7); g.add(d); }
    for (let i = 0; i < 8; i++) { const m = new THREE.Group(); const h = 30 + rand(i) * 22, r = 18 + rand(i + 2) * 12;
      const berg = metRand(new THREE.ConeGeometry(r, h, 7), '#8a94a8', 1.02); berg.position.y = h / 2 - 2; m.add(berg);
      const top = new THREE.Mesh(new THREE.ConeGeometry(r * .42, h * .42, 7), mat('#ffffff')); top.position.y = h - 2 - h * .21 + .2; m.add(top);
      m.position.set(-25 + i * 30, 0, -100 - rand(i + 4) * 25); g.add(m); }
    for (let i = 0; i < 4; i++) { const sm = new THREE.Group(); [[.8, .8], [.6, 2.0], [.42, 2.95]].forEach(([r, y]) => { const b = metRand(new THREE.SphereGeometry(r, 10, 8), '#ffffff'); b.position.y = y; sm.add(b); });
      const neus = new THREE.Mesh(new THREE.ConeGeometry(.09, .5, 6), mat('#ff8a2a')); neus.rotation.z = -Math.PI / 2; neus.position.set(.5, 2.95, 0); sm.add(neus);
      sm.position.set(12 + i * 38, 0, 9 + rand(i) * 4); sm.rotation.y = -.6; g.add(sm); }
    scene.add(g); return g; }
  /* het Kampioenscircuit (gebied-id blijft 'kasteel', zo blijft opgeslagen voortgang kloppen): tribune met publiek, dak, lichtmasten, bandenstapels */
  function bouwStadion() { const g = new THREE.Group(); const X0 = -30, X1 = L + 50, SEG = 20;
    const VAK = ['#3a5bff', '#ffc93c', '#e5484d', '#24bf80'];
    for (let x = X0, s = 0; x < X1; x += SEG, s++) {   // tribune in vakken van 20: 4 treden die naar achteren oplopen
      for (let r = 0; r < 4; r++) { const h = 1.2 + r * 1.3; const trede = metRand(new THREE.BoxGeometry(SEG, h, 2.2), r % 2 ? '#e9ecf5' : '#d3d9ea', 1.02); trede.position.set(x + SEG / 2, h / 2, -16 - r * 2.2); g.add(trede);
        const rand1 = new THREE.Mesh(new THREE.BoxGeometry(SEG, .3, .1), mat(VAK[s % 4])); rand1.position.set(x + SEG / 2, h - .15, -14.88 - r * 2.2); g.add(rand1); }
      const paal = metRand(new THREE.CylinderGeometry(.2, .2, 9.5, 6), '#5d6380'); paal.position.set(x, 4.75, -24); g.add(paal); }
    const dak = metRand(new THREE.BoxGeometry(X1 - X0, .5, 9), '#ffffff', 1.01); dak.position.set((X0 + X1) / 2, 9.6, -20.5); g.add(dak);
    const dakRand = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, .6, .15), mat('#3a5bff')); dakRand.position.set((X0 + X1) / 2, 9.6, -15.9); g.add(dakRand);
    /* publiek: één InstancedMesh (snel), mannetjes in alle kleuren met hier en daar een lege stoel */
    const KLEUR = ['#ff6fa8', '#ff9f43', '#24bf80', '#3ba7ff', '#ffc93c', '#7b4dff', '#e5484d', '#ffffff'].map(c => new THREE.Color(c));
    const HUID = ['#f6d3b0', '#e2ad7e', '#b97c4f', '#8a5634', '#ffe3c4'].map(c => new THREE.Color(c));
    const max = 4 * Math.ceil((X1 - X0) / 1.15); const lmat = new THREE.MeshLambertMaterial({ flatShading: true });
    const lijf = new THREE.InstancedMesh(new THREE.CylinderGeometry(.3, .38, .62, 6), lmat, max), hoofd = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.27, 0), lmat, max);
    { let n = 0; const tmp = new THREE.Object3D();
      for (let r = 0; r < 4; r++) for (let x = X0 + .6, i = 0; x < X1 - .5; x += 1.15, i++) { if (rand(i * 3.1 + r * 17) < .15) continue;
        const px = x + (rand(i + r) - .5) * .3, y = 1.2 + r * 1.3, z = -16.4 - r * 2.2;
        tmp.position.set(px, y + .31, z); tmp.updateMatrix(); lijf.setMatrixAt(n, tmp.matrix); lijf.setColorAt(n, KLEUR[Math.floor(rand(i * 7.7 + r) * KLEUR.length)]);
        tmp.position.set(px, y + .86, z); tmp.updateMatrix(); hoofd.setMatrixAt(n, tmp.matrix); hoofd.setColorAt(n, HUID[Math.floor(rand(i * 5.3 + r * 2) * HUID.length)]); n++; }
      lijf.count = hoofd.count = n; g.add(lijf, hoofd); }
    /* spandoeken op de dakrand */
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: label(i % 2 ? 'KAMPIOENSCHAP' : 'FLITS CUP', i % 2 ? '#ffc93c' : '#1b1f3a', i % 2 ? '#1b1f3a' : '#ffffff', 768, 120, 76) }));
      b.position.set(10 + i * 50, 8.2, -14.6); g.add(b); }
    /* lichtmasten achter de tribune */
    for (let i = 0; i < 6; i++) { const m = new THREE.Group(); const mast = metRand(new THREE.CylinderGeometry(.35, .5, 17, 6), '#5d6380'); mast.position.y = 8.5; m.add(mast);
      const kast = metRand(new THREE.BoxGeometry(4.2, 2.6, .6), '#3a5bff'); kast.position.y = 17.4; m.add(kast);
      for (let k = 0; k < 6; k++) { const lamp = new THREE.Mesh(new THREE.CircleGeometry(.48, 12), new THREE.MeshBasicMaterial({ color: '#fff6c8' })); lamp.position.set(-1.35 + (k % 3) * 1.35, 17.95 - Math.floor(k / 3) * 1.15, .32); m.add(lamp); }
      m.position.set(-12 + i * 42, 0, -28); g.add(m); }
    /* voorkant (dichtbij de camera): bandenstapels rood-wit en geblokte vlaggen */
    for (let i = 0; i < 14; i++) { const st = new THREE.Group(); for (let k = 0; k < 3; k++) { const band = metRand(new THREE.CylinderGeometry(.62, .62, .42, 12), k === 2 ? (i % 2 ? '#e5484d' : '#ffffff') : '#2b2f45', 1.04); band.position.y = .21 + k * .43; st.add(band); }
      st.position.set(-14 + i * 14 + rand(i) * 4, 0, 7.4 + rand(i + 3) * 1.6); g.add(st); }
    const geblokt = patroon('geblokt');
    for (let i = 0; i < 7; i++) { const v = new THREE.Group(); const stok = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.4, 5), mat('#1b1f3a')); stok.position.y = 1.7; v.add(stok);
      const doek = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .85), new THREE.MeshBasicMaterial({ map: geblokt, side: THREE.DoubleSide })); doek.position.set(.68, 2.95, 0); v.add(doek);
      v.position.set(-6 + i * 28, 0, 10 + rand(i + 9) * 4); g.add(v); }
    scene.add(g); return g; }
  function gebied(id) { if (!GEBIED[id]) id = 'dorp';
    if (!DECOR[id]) DECOR[id] = id === 'strand' ? bouwStrand() : id === 'bergen' ? bouwBergen() : bouwStadion();
    Object.entries(DECOR).forEach(([k, gr]) => { gr.visible = k === id; });
    const G = GEBIED[id]; grond.material.color.set(G.grond); DAG.lucht = G.lucht; DAG.mist = G.mist; }

  /* garage (pitbox) voor de start */
  const garage = new THREE.Group(); garage.position.x = GX; scene.add(garage);
  const pitbord = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: label('PITBOX', '#ffc93c', '#1b1f3a', 640, 128, 76) }));
  { const vloer = new THREE.Mesh(new THREE.BoxGeometry(14, .2, 11), mat('#c9ccd6')); vloer.position.y = -.08; garage.add(vloer);
    const achter = metRand(new THREE.BoxGeometry(14, 7, .5), '#e6e8f0'); achter.position.set(0, 3.5, -5.5); garage.add(achter);
    const links = metRand(new THREE.BoxGeometry(.5, 7, 11), '#d6d9e3'); links.position.set(-7, 3.5, 0); garage.add(links);
    const dak = metRand(new THREE.BoxGeometry(14.6, .5, 11.5), '#3a5bff'); dak.position.set(0, 7.2, 0); garage.add(dak);
    pitbord.position.set(0, 5.6, -5.2); garage.add(pitbord);
    const gerei = metRand(new THREE.BoxGeometry(3.2, 2, .2), '#8a5a2b'); gerei.position.set(-3.8, 3, -5.15); garage.add(gerei);
    for (let i = 0; i < 6; i++) { const t = metRand(new THREE.BoxGeometry(.18, .9, .12), ['#e5484d', '#3a5bff', '#12a26b'][i % 3]); t.position.set(-5 + i * .5, 3, -4.95); garage.add(t); }
    for (let i = 0; i < 3; i++) { const band = metRand(new THREE.CylinderGeometry(.55, .55, .4, 12), '#23263a'); band.position.set(5, .2 + i * .42, -4); garage.add(band); }
    const brug = metRand(new THREE.BoxGeometry(4.2, .25, 2.6), '#ffc93c'); brug.position.set(0, .14, 0); garage.add(brug);
    const lamp = new THREE.PointLight('#fff3d6', 30, 18, 1.5); lamp.position.set(0, 6, 2); garage.add(lamp); }
  const tex = f => { const t = new THREE.TextureLoader().load('assets/img/' + f); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const flitsGarage = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('flits_wijs.webp') })); flitsGarage.scale.set(2.6, 3.7, 1); flitsGarage.position.set(-3.6, 1.85, .6); garage.add(flitsGarage);

  /* tunnel (alleen tijdens blind-rondjes) */
  const tunnel = new THREE.Group(); tunnel.visible = false; scene.add(tunnel);
  { const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd23f' });
    for (let x = 4; x < L - 2; x += 6) { const g = new THREE.Group();
      [-5.4, 5.4].forEach(z => { const w = metRand(new THREE.BoxGeometry(.9, 6, .8), '#3b4060'); w.position.set(0, 3, z); g.add(w);
        const l = new THREE.Mesh(new THREE.BoxGeometry(.25, .25, .1), lampMat); l.position.set(0, 4.6, z > 0 ? z - .45 : z + .45); g.add(l); });
      const top = metRand(new THREE.BoxGeometry(.9, .9, 11.6), '#3b4060'); top.position.set(0, 6.4, 0); g.add(top);
      g.position.x = x; tunnel.add(g); }
    const mondbord = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: label('BLINDE TUNNEL', '#1b1f3a', '#ffd23f', 640, 118, 66) })); mondbord.rotation.y = -Math.PI / 2; mondbord.position.set(3.4, 7.6, 0); tunnel.add(mondbord); }

  /* karts */
  const kart = (kleur, metOnderdelen) => { const g = new THREE.Group();
    const romp = metRand(new THREE.BoxGeometry(2.5, .45, 1.15), kleur); romp.position.y = .62; g.add(romp);
    const neus = metRand(new THREE.CylinderGeometry(.42, .55, 1.0, 6), kleur); neus.rotation.z = -Math.PI / 2; neus.position.set(1.65, .6, 0); g.add(neus);
    const bumper = metRand(new THREE.BoxGeometry(.25, .3, 2.1), '#1b1f3a'); bumper.position.set(2.1, .45, 0); g.add(bumper);
    const stoel = metRand(new THREE.BoxGeometry(.5, .75, .9), '#23263a'); stoel.position.set(-.55, 1.05, 0); g.add(stoel);
    const delen = {};
    delen.spoiler = new THREE.Group(); { const s = metRand(new THREE.BoxGeometry(.3, .12, 2.0), kleur); s.position.set(-1.4, 1.35, 0); delen.spoiler.add(s);
      [-.55, .55].forEach(z => { const p = metRand(new THREE.BoxGeometry(.12, .55, .12), '#1b1f3a'); p.position.set(-1.4, 1.05, z); delen.spoiler.add(p); }); }
    delen.strepen = new THREE.Group(); { const s = new THREE.Mesh(new THREE.BoxGeometry(2.0, .02, .28), new THREE.MeshBasicMaterial({ color: '#ffffff' })); s.position.set(.2, .86, 0); delen.strepen.add(s);
      [.6, -.6].forEach(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, .07, .02), new THREE.MeshBasicMaterial({ color: '#ffc93c' })); b.position.set(.1, .47, z * .97); delen.strepen.add(b); }); }
    delen.uitlaat = new THREE.Group(); [-.3, .3].forEach(z => { const u = metRand(new THREE.CylinderGeometry(.12, .15, .6, 8), '#9aa0b8'); u.rotation.z = Math.PI / 2; u.position.set(-1.45, .62, z); delen.uitlaat.add(u); });
    const wielen = [], velgen = [];
    for (const [x, z, r] of [[1.15, .78, .4], [1.15, -.78, .4], [-.9, .82, .5], [-.9, -.82, .5]]) {
      const as = new THREE.Group(); const band = metRand(new THREE.CylinderGeometry(r, r, .42, 12), '#23263a'); band.rotation.x = Math.PI / 2; as.add(band);
      const velg = new THREE.Mesh(new THREE.CylinderGeometry(r * .45, r * .45, .44, 6), mat('#d9dbe6')); velg.rotation.x = Math.PI / 2; as.add(velg); velgen.push(velg);
      as.position.set(x, r, z); g.add(as); wielen.push(as); }
    Object.values(delen).forEach(d => { g.add(d); d.visible = !metOnderdelen; });
    const vlam = new THREE.Mesh(new THREE.ConeGeometry(.32, 1.6, 7), new THREE.MeshBasicMaterial({ color: '#ff9f2f', transparent: true, opacity: .9 })); vlam.rotation.z = Math.PI / 2; vlam.position.set(-2.1, .62, 0); vlam.visible = false; g.add(vlam);
    const koplamp = new THREE.SpotLight('#fff1c4', 0, 38, .5, .55, 1.2); koplamp.position.set(2.2, .9, 0); const doel = new THREE.Object3D(); doel.position.set(12, 0, 0); g.add(koplamp, doel); koplamp.target = doel;
    const lampjes = [-.42, .42].map(z => { const l = new THREE.Mesh(new THREE.BoxGeometry(.06, .16, .22), new THREE.MeshBasicMaterial({ color: '#5d6380' })); l.position.set(2.24, .6, z); g.add(l); return l; });
    g.userData = { wielen, velgen, vlam, delen, koplamp, lampjes, romp, neus, kleurDelen: [romp, neus, delen.spoiler.children[0]] }; return g; };
  const jij = kart(opts.kleur || '#3a5bff', true); jij.scale.setScalar(1.15); scene.add(jij);
  const helm = metRand(new THREE.SphereGeometry(.55, 10, 8), '#ffffff'); helm.position.set(-.35, 1.62, 0); jij.add(helm);
  const vizier = new THREE.Mesh(new THREE.BoxGeometry(.2, .28, .66), new THREE.MeshBasicMaterial({ color: '#1b1f3a' })); vizier.position.set(.15, 1.66, 0); jij.add(vizier);
  const naam = new THREE.Sprite(new THREE.SpriteMaterial({ map: label('Jij', '#ffffff', '#1b1f3a', 256, 100, 62), depthTest: false })); naam.scale.set(1.9, .74, 1); naam.position.set(0, 2.55, 0); jij.add(naam);
  const flits = kart('#ffc93c', false); scene.add(flits);
  const flitsSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('flits_typen.webp') })); flitsSprite.scale.set(2.1, 2.6, 1); flitsSprite.position.set(-.4, 2.0, 0); flits.add(flitsSprite);
  const naamF = new THREE.Sprite(new THREE.SpriteMaterial({ map: label('Flits', '#ffc93c', '#1b1f3a', 256, 100, 62), depthTest: false })); naamF.scale.set(1.9, .74, 1); naamF.position.set(0, 3.55, 0); flits.add(naamF);
  const VELG = mat('#d9dbe6'), GOUD = mat('#ffc93c');

  /* rivalen (sinds 15-10-2026): Hop de haas en Vlam de vos, low-poly dierenkoppen */
  const dier = (kleur, kop, soort, naamTekst, naamKleur) => { const k = kart(kleur, false); k.scale.setScalar(1.05);
    const hoofd = metRand(new THREE.SphereGeometry(.5, 10, 8), kop); hoofd.position.set(-.3, 1.62, 0); k.add(hoofd);
    [-.2, .2].forEach(z => { const oog = new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 5), mat('#1b1f3a')); oog.position.set(.12, 1.75, z); k.add(oog); });
    if (soort === 'haas') [-.17, .17].forEach(z => { const oor = metRand(new THREE.BoxGeometry(.16, .95, .26), kop); oor.position.set(-.42, 2.4, z); oor.rotation.x = z * 1.1; k.add(oor);
      const binnen = new THREE.Mesh(new THREE.BoxGeometry(.04, .7, .14), mat('#ff9fbd')); binnen.position.set(-.33, 2.4, z); binnen.rotation.x = z * 1.1; k.add(binnen); });
    if (soort === 'vos') { [-.24, .24].forEach(z => { const oor = metRand(new THREE.ConeGeometry(.2, .45, 4), kop); oor.position.set(-.4, 2.12, z); k.add(oor); });
      const snuit = metRand(new THREE.ConeGeometry(.2, .5, 6), '#ffffff'); snuit.rotation.z = -Math.PI / 2; snuit.position.set(.25, 1.56, 0); k.add(snuit); }
    const nm = new THREE.Sprite(new THREE.SpriteMaterial({ map: label(naamTekst, naamKleur, '#1b1f3a', 256, 100, 62), depthTest: false })); nm.scale.set(1.9, .74, 1); nm.position.set(0, 3.2, 0); k.add(nm);
    k.visible = false; scene.add(k); return k; };
  const hop = dier('#12a26b', '#ece8df', 'haas', 'Hop', '#bff0d6'), vlam = dier('#e5484d', '#ff8a2a', 'vos', 'Vlam', '#ffd2c2');
  const RIVAAL = { flits, hop, vlam }, rivaalX = { flits: 0, hop: 0, vlam: 0 };

  /* deeltjes */
  const MAX = 300, pgeo = new THREE.BufferGeometry(), ppos = new Float32Array(MAX * 3), pkol = new Float32Array(MAX * 3);
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(pkol, 3));
  scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ size: .32, vertexColors: true, transparent: true, opacity: .95 })));
  const deel = []; let pi = 0;
  const strooi = (x, y, z, n, kleuren, kracht = 1, rond = false) => { if (reduce) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28;
    deel[pi] = rond ? { x, y, z, vx: Math.cos(a) * .18 * kracht, vy: .12 + Math.random() * .2 * kracht, vz: Math.sin(a) * .18 * kracht, l: 1, k: new THREE.Color(kleuren[i % kleuren.length]) }
                    : { x, y, z, vx: (-Math.random() * .4 - .1) * kracht, vy: Math.random() * .25 * kracht, vz: (Math.random() - .5) * .3 * kracht, l: 1, k: new THREE.Color(kleuren[i % kleuren.length]) }; pi = (pi + 1) % MAX; } };


  /* ---------- eigen kart (garage-winkel, sinds 15-10-2026) ----------
     uiterlijk({ lak, helm, spoiler, velgen, vlam, spoor, vlag, nummer, sterren }) past alleen de kart van het kind aan.
     sterren = 9 vingers (lp lr lm li duim ri rm rr rp): 1 = gouden ster (die vinger typt al lang foutloos). */
  const U = jij.userData;
  const look = { lak: { kleur: opts.kleur || '#3a5bff' }, helm: { kleur: '#ffffff' }, spoiler: 'klein', velgen: { kleur: '#d9dbe6' }, vlam: '#ff9f2f', spoor: null, vlag: null, nummer: 0, sterren: [] };
  let velgMat = VELG, delenTal = 4;
  const canvasTex = (w, h, teken) => { const c = document.createElement('canvas'); c.width = w; c.height = h; teken(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const patroon = (soort, a, b) => canvasTex(256, 128, (g, w, h) => {
    if (soort === 'regenboog') { ['#e5484d', '#ff9f2f', '#ffd23f', '#12a26b', '#3a5bff', '#7b4dff'].forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); return; }
    g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b;
    if (soort === 'tijger') for (let i = 0; i < 9; i++) { const x = i * 30 + 6; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18, 0); g.lineTo(x + 6, 70); g.lineTo(x + 14, h); g.lineTo(x - 4, h); g.lineTo(x - 8, 60); g.closePath(); g.fill(); }
    if (soort === 'vlammen') { [['#ffd23f', 0, 22, 40], ['#ff9f2f', 8, 16, 26]].forEach(([k, d, top, bw]) => { g.fillStyle = k; for (let i = 0; i < 7; i++) { const x = i * 40 + d; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 4, 70, x + top, top === 22 ? 20 : 55); g.quadraticCurveTo(x + top - 4, 90, x + bw, h); g.fill(); } }); }
    if (soort === 'vlekken') for (let i = 0; i < 26; i++) { const x = (i * 53) % w, y = (i * 37) % h; g.fillStyle = b; g.beginPath(); g.ellipse(x, y, 10, 8, i, 0, 6.3); g.fill(); g.fillStyle = a; g.beginPath(); g.ellipse(x, y, 4, 3, i, 0, 6.3); g.fill(); }
    if (soort === 'streep') { g.fillRect(0, 48, w, 32); g.fillStyle = '#ffffff'; g.fillRect(0, 55, w, 5); g.fillRect(0, 68, w, 5); }
    if (soort === 'geblokt') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1f3a'; for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32); }
  });
  const lakMat = l => {
    if (l.patroon === 'tijger') return new THREE.MeshLambertMaterial({ map: patroon('tijger', '#ff9f2f', '#1b1f3a'), flatShading: true });
    if (l.patroon === 'vlammen') return new THREE.MeshLambertMaterial({ map: patroon('vlammen', '#e5484d'), flatShading: true });
    if (l.patroon === 'luipaard') return new THREE.MeshLambertMaterial({ map: patroon('vlekken', '#ffc93c', '#6b4210'), flatShading: true });
    if (l.patroon === 'regenboog') return new THREE.MeshLambertMaterial({ map: patroon('regenboog'), flatShading: true });
    if (l.patroon === 'goud') return new THREE.MeshPhongMaterial({ color: '#e8b923', shininess: 80, specular: '#fff3c4', flatShading: true });
    return mat(l.kleur || '#3a5bff');
  };
  /* spoilers in vier soorten (de vleugel krijgt de lak van de kart) */
  const bouwSpoiler = (type, m) => { const g = U.delen.spoiler; while (g.children.length) g.remove(g.children[0]);
    const vleugel = (b, h, d, y) => { const v = metRand(new THREE.BoxGeometry(b, h, d), '#ffffff'); v.userData.m.material = m; v.position.set(-1.4, y, 0); g.add(v); };
    const paal = (y, hoog, z) => { const q = metRand(new THREE.BoxGeometry(.12, hoog, .12), '#1b1f3a'); q.position.set(-1.4, y, z); g.add(q); };
    if (type === 'groot') { vleugel(.5, .14, 2.4, 1.62); [-.7, .7].forEach(z => paal(1.18, .85, z)); }
    else if (type === 'dubbel') { vleugel(.32, .12, 2.1, 1.35); vleugel(.32, .12, 2.1, 1.74); [-.6, .6].forEach(z => paal(1.25, .95, z)); }
    else if (type === 'vleugels') { vleugel(.45, .12, 2.3, 1.45); [-.55, .55].forEach(z => paal(1.12, .6, z));
      [-1.15, 1.15].forEach(z => { const v = metRand(new THREE.BoxGeometry(.8, .7, .08), '#ffffff'); v.userData.m.material = m; v.position.set(-1.35, 1.35, z); g.add(v); }); }
    else { vleugel(.3, .12, 2.0, 1.35); [-.55, .55].forEach(z => paal(1.05, .55, z)); }
  };
  /* helm: kleur, streep, vlekken of een ruimtebol */
  const bol = new THREE.Mesh(new THREE.SphereGeometry(.78, 16, 12), new THREE.MeshPhongMaterial({ color: '#cfe9ff', transparent: true, opacity: .35, shininess: 100 })); bol.position.copy(helm.position); bol.visible = false; jij.add(bol);
  /* racenummer op de motorkap */
  const nummerVlak = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ transparent: true })); nummerVlak.rotation.x = -Math.PI / 2; nummerVlak.rotation.z = -Math.PI / 2; nummerVlak.position.set(.55, .86, 0); nummerVlak.visible = false; jij.add(nummerVlak);
  /* vlag op een antenne */
  const vlag = new THREE.Group(); { const stok = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.7, 5), new THREE.MeshBasicMaterial({ color: '#1b1f3a' })); stok.position.set(-1.15, 1.5, -.42); vlag.add(stok);
    const doek = new THREE.Mesh(new THREE.PlaneGeometry(.62, .4), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); doek.position.set(-1.46, 2.15, -.42); vlag.add(doek); vlag.userData.doek = doek; }
  vlag.visible = false; jij.add(vlag);
  /* vingersterren: balkje met 9 sterren onder de naam */
  const VKLEUR = ['#ff6fa8', '#ff9f43', '#24bf80', '#3ba7ff', '#a6afc7', '#3ba7ff', '#24bf80', '#ff9f43', '#ff6fa8'];
  const sterBalk = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); sterBalk.scale.set(2.5, .3, 1); sterBalk.position.set(0, 2.1, 0); jij.add(sterBalk);
  const tekenSterren = st => { sterBalk.material.map = canvasTex(600, 72, (g, w, h) => {
      g.fillStyle = 'rgba(27,31,58,.82)'; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 34); g.fill();
      for (let i = 0; i < 9; i++) { const goud = !!st[i], cx = 44 + i * 64, cy = 37, R = goud ? 27 : 21, r = R * .45;
        g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, q = j % 2 ? r : R; g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } g.closePath();
        g.fillStyle = goud ? '#ffd23f' : VKLEUR[i]; g.globalAlpha = goud ? 1 : .55; g.fill(); g.globalAlpha = 1;
        if (goud) { g.lineWidth = 3; g.strokeStyle = '#fff3c4'; g.stroke(); } } });
    sterBalk.material.needsUpdate = true; };
  tekenSterren([]);
  function uiterlijk(l) {
    Object.assign(look, l || {});
    const m = lakMat(look.lak || {});
    [U.romp, U.neus].forEach(o => { o.userData.m.material = m; });
    bouwSpoiler(look.spoiler || 'klein', m);
    const h = look.helm || {};
    helm.userData.m.material = h.patroon === 'streep' || h.patroon === 'vlekken' ? new THREE.MeshLambertMaterial({ map: patroon(h.patroon, h.kleur || '#ffffff', h.patroon === 'vlekken' ? '#6b4210' : '#e5484d'), flatShading: true }) : mat(h.kleur || '#ffffff');
    bol.visible = h.patroon === 'bol';
    const vg = look.velgen || {};
    velgMat = vg.neon ? new THREE.MeshBasicMaterial({ color: vg.kleur }) : mat(vg.kleur || '#d9dbe6');
    U.velgen.forEach(v => { v.material = delenTal >= 4 ? velgMat : VELG; });
    if (look.nummer) { nummerVlak.material.map = canvasTex(128, 128, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 58, 0, 6.3); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1b1f3a'; g.stroke();
        g.fillStyle = '#1b1f3a'; g.font = '700 66px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(look.nummer), 64, 70); }); nummerVlak.material.needsUpdate = true; }
    nummerVlak.visible = !!look.nummer;
    vlag.visible = !!look.vlag;
    if (look.vlag) { vlag.userData.doek.material.map = look.vlag === 'geblokt' ? patroon('geblokt') : null; vlag.userData.doek.material.color.set(look.vlag === 'geblokt' ? '#ffffff' : look.vlag); vlag.userData.doek.material.needsUpdate = true; }
    tekenSterren(look.sterren || []);
  }
  /* munten op de baan: een munt per woord; goud = woord zonder fout, zilver = met een fout */
  const muntGeo = new THREE.CylinderGeometry(.42, .42, .1, 18), randGeo = new THREE.TorusGeometry(.42, .05, 6, 18);
  const MUNT = new THREE.MeshBasicMaterial({ color: '#ffc93c' }), ZILVER = new THREE.MeshBasicMaterial({ color: '#d5dae6' }), MRAND = new THREE.MeshBasicMaterial({ color: '#a8790a' }), ZRAND = new THREE.MeshBasicMaterial({ color: '#8b92a8' });
  let munten = [];
  const maakMunt = (x, y, z) => { const g = new THREE.Group(); const sch = new THREE.Mesh(muntGeo, MUNT); sch.rotation.x = Math.PI / 2; const rd = new THREE.Mesh(randGeo, MRAND); g.add(sch, rd); g.position.set(x, y, z); scene.add(g); return { g, sch, rd, st: 0, t: 0 }; };
  const wisMunten = () => { munten.forEach(m => scene.remove(m.g)); munten = []; };
  const pakMunt = (m, goud) => { if (!m || m.st) return; m.st = 1; m.t = 0; if (!goud) { m.sch.material = ZILVER; m.rd.material = ZRAND; }
    strooi(m.g.position.x, m.g.position.y, m.g.position.z, 10, goud ? ['#ffd23f', '#ffffff', '#ffe9a6'] : ['#ffffff', '#d5dae6'], 1, true); };

  /* woorden op de baan (sinds 15-10-2026): elk woord staat op een krat of poortje; woord af = je kart knalt erdoorheen en de munt springt eruit */
  const VENSTER = 6;
  let woordLijst = [], woordObj = {}, scherven = [];
  const maakWoordObj = i => { const w = woordLijst[i]; if (!w || woordObj[i]) return;
    const g = new THREE.Group(); g.position.set(w.f * L + 2.4, 0, jij.position.z);
    const tex = label(w.w, '#fff6dc', '#1b1f3a', 320, 128, 72);
    if (i % 3 === 2) { g.userData.soort = 'poort';
      [-1.3, 1.3].forEach(dz => { const pa = metRand(new THREE.BoxGeometry(.3, 2.7, .3), '#3a5bff'); pa.position.set(0, 1.35, dz); g.add(pa); });
      const balk = metRand(new THREE.BoxGeometry(.32, .32, 2.9), '#ffc93c'); balk.position.set(0, 2.75, 0); g.add(balk);
      const bord = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .88), new THREE.MeshBasicMaterial({ map: tex })); bord.position.set(0, 2.05, 1.5); g.add(bord); }
    else { g.userData.soort = 'krat';
      const k = metRand(new THREE.BoxGeometry(1.5, 1.5, 1.5), '#c98a4b'); k.position.y = .75; g.add(k);
      [-.45, .45].forEach(dy => { const plank = new THREE.Mesh(new THREE.BoxGeometry(1.52, .07, 1.52), mat('#8a5a2b')); plank.position.y = .75 + dy; g.add(plank); });
      const bord = new THREE.Mesh(new THREE.PlaneGeometry(1.45, .58), new THREE.MeshBasicMaterial({ map: tex })); bord.position.set(0, .78, .77); g.add(bord); }
    scene.add(g); woordObj[i] = g; };
  const wisWoorden = () => { Object.values(woordObj).forEach(g => scene.remove(g)); woordObj = {}; woordLijst = []; scherven.forEach(sc => scene.remove(sc.m)); scherven = []; };
  const breek = (i, goud) => { const g = woordObj[i]; if (!g) return false; delete woordObj[i];
    const pos = g.position.clone(); scene.remove(g);
    if (!reduce) { if (g.userData.soort === 'krat') for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .1 + Math.random() * .3), mat(k % 2 ? '#c98a4b' : '#8a5a2b')); m.position.set(pos.x, .75, pos.z); scene.add(m);
        scherven.push({ m, v: new THREE.Vector3(2 + Math.random() * 5, 3 + Math.random() * 4, (Math.random() - .5) * 6), r: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), t: 0 }); }
      else strooi(pos.x, 2.2, pos.z, 40, ['#3a5bff', '#ffc93c', '#e5484d', '#12a26b', '#ffffff'], 1.4, true); }
    const munt = maakMunt(pos.x, 1.35, pos.z); munten.push(munt); pakMunt(munt, goud);
    maakWoordObj(i + VENSTER); return true; };

  let modus = 'garage', doelX = 0, kidX = 0, flitsX = 0, wobbel = 0, fovDoel = 42, turbo = 0, schud = 0, feest = 0, intro = 0, introLoopt = false, draai = 0, groei = [];
  let raf = 0, gepauzeerd = true, sterPuls = 0;
  const klok = new THREE.Clock();
  function maat() { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener('resize', maat); if ('ResizeObserver' in window) new ResizeObserver(maat).observe(box); maat();
  function sfeer(donker) {
    scene.background.set(donker ? '#0d1024' : DAG.lucht); scene.fog.color.set(donker ? '#0d1024' : DAG.mist); scene.fog.near = donker ? 6 : DAG.n; scene.fog.far = donker ? 46 : DAG.f;
    hemi.intensity = donker ? .14 : 1.05; zon.intensity = donker ? .04 : 1.6;
    jij.userData.koplamp.intensity = donker ? 90 : 0; jij.userData.lampjes.forEach(l => l.material.color.set(donker ? '#fff6c8' : '#5d6380'));
    tunnel.visible = donker; }
  function delenZichtbaar(n) {
    const d = jij.userData.delen; delenTal = n;
    d.spoiler.visible = n >= 1; d.strepen.visible = n >= 2; d.uitlaat.visible = n >= 3;
    [d.spoiler, d.strepen, d.uitlaat].forEach(x => x.scale.setScalar(1));
    jij.userData.velgen.forEach(v => { v.material = n >= 4 ? velgMat : VELG; });
  }
  function lus() {
    raf = 0; if (gepauzeerd) return;
    const dt = Math.max(.001, Math.min(.05, klok.getDelta())), t = klok.elapsedTime;
    const oud = kidX; kidX += (doelX - kidX) * Math.min(1, dt * 6); const v = (kidX - oud) / dt;
    const inGarage = modus === 'garage' || modus === 'toonzaal';
    if (!inGarage) jij.position.x = kidX;
    flits.position.x += (flitsX - flits.position.x) * Math.min(1, dt * 8);
    for (const nm of ['hop', 'vlam']) { const k = RIVAAL[nm]; k.position.x += (rivaalX[nm] - k.position.x) * Math.min(1, dt * 8); if (modus === 'race' && rivaalX[nm] > 0 && rivaalX[nm] < L) for (const w of k.userData.wielen) w.rotation.z -= 9 * dt; }
    scherven = scherven.filter(sc => { sc.t += dt; sc.v.y -= 14 * dt; sc.m.position.addScaledVector(sc.v, dt); sc.m.rotation.x += sc.r.x * dt; sc.m.rotation.y += sc.r.y * dt; if (sc.m.position.y < .1) { sc.m.position.y = .1; sc.v.set(sc.v.x * .5, -sc.v.y * .25, sc.v.z * .5); } if (sc.t > 1.4) { scene.remove(sc.m); return false; } return true; });
    for (const w of jij.userData.wielen) w.rotation.z -= v * dt * 2.2;
    for (const w of flits.userData.wielen) w.rotation.z -= 9 * dt * (modus === 'race' && flitsX > 0 && flitsX < L ? 1 : 0);
    jij.rotation.y = (modus === 'toonzaal' ? t * .55 : modus === 'garage' ? -.5 + Math.sin(t * .4) * .25 : 0) + Math.sin(t * 30) * wobbel * .25; wobbel *= .9;
    jij.position.y = inGarage ? .27 : Math.abs(Math.sin(t * 14)) * Math.min(.12, v * .01);
    const u = jij.userData; u.vlam.visible = turbo > 0; if (turbo) { const s = (turbo > 1 ? 1.5 : 1) * (.85 + Math.sin(t * 40) * .15); u.vlam.scale.set(1, s, 1); if (look.vlam === 'regenboog') u.vlam.material.color.setHSL((t * .8) % 1, .9, .6); else { u.vlam.material.color.set(look.vlam || '#ff9f2f'); if (turbo > 1) u.vlam.material.color.lerp(new THREE.Color('#ffffff'), .45); } }
    if (sterPuls > 0) { sterPuls = Math.max(0, sterPuls - dt); const s = 1 + (reduce ? .25 : Math.abs(Math.sin(t * 5)) * .5) * Math.min(1, sterPuls); sterBalk.scale.set(2.5 * s, .3 * s, 1); }
    groei = groei.filter(gr => { gr.t += dt * 3.2; const s = gr.t < 1 ? 1 + Math.sin(gr.t * Math.PI) * .5 : 1; gr.obj.scale.setScalar(Math.min(1, gr.t) * s); return gr.t < 1.2; });
    if (!inGarage && v > 2 && look.spoor && Math.random() < .7) strooi(kidX - 1.6, .5 + Math.random() * .5, jij.position.z + (Math.random() - .5) * .8, 2, look.spoor.soort === 'ster' ? ['#ffffff', '#ffe066', '#7ad7ff'] : look.spoor.soort === 'confetti' ? ['#e5484d', '#ffc93c', '#3a5bff', '#12a26b', '#ff6fa8'] : ['#ffd23f', '#ff9f2f', '#ffffff'], 1.2);
    munten.forEach(m => { if (m.st === 2) return; m.g.rotation.y += dt * (m.st ? 14 : 3); if (!m.st) return; m.t += dt * 2.2; m.g.position.y += dt * 3.2; m.g.scale.setScalar(Math.max(.01, 1 + m.t * .5 - (m.t > .6 ? (m.t - .6) * 3 : 0))); if (m.t > 1) { scene.remove(m.g); m.st = 2; } });
    if (!inGarage && v > 2 && Math.random() < .5) strooi(kidX - 1.4, .2, jij.position.z + (Math.random() - .5) * .6, 1, modus === 'tunnel' ? ['#3b4060', '#5d6380'] : ['#d8a35c', '#f2c27b']);
    if (turbo > 1 && Math.random() < .8) strooi(kidX - 2, .6, jij.position.z, 1, ['#ffe066', '#7ad7ff', '#ffffff'], 1.4);
    for (let i = 0; i < MAX; i++) { const p = deel[i]; if (!p || p.l <= 0) { ppos[i * 3 + 1] = -99; continue; } p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy -= .012; p.l -= .022; if (p.y < 0) { p.y = 0; p.vy *= -.3; }
      ppos[i * 3] = p.x; ppos[i * 3 + 1] = p.y; ppos[i * 3 + 2] = p.z; pkol[i * 3] = p.k.r; pkol[i * 3 + 1] = p.k.g; pkol[i * 3 + 2] = p.k.b; }
    pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
    cam.fov += (fovDoel - cam.fov) * dt * 3; cam.updateProjectionMatrix();
    const sx = (Math.random() - .5) * schud, sy = (Math.random() - .5) * schud; schud *= .85;
    if (introLoopt) intro = Math.max(0, intro - dt / 2.4); const e = reduce ? 0 : intro * intro;
    if (modus === 'toonzaal') { const ver = cam.aspect < 1.1 ? 1.5 : 0; cam.position.set(GX + 4.6 + ver, 3.0 + ver * .4, 6.4 + ver * 1.6); cam.lookAt(GX, 1.35, 0); }
    else if (modus === 'garage') { const ver = cam.aspect > 3.2 ? 0 : 1.6; cam.position.set(GX + 3.4 + ver * .6, 2.5 + ver * .5, 6.2 + ver * 1.8); cam.lookAt(GX - .9, 1.3, -.4); }
    else if (feest > 0) { draai = Math.min(.5, draai + dt * .3); const h = .2 + draai; cam.position.set(kidX + Math.sin(h) * 8, 3.4, jij.position.z + Math.cos(h) * 8); cam.lookAt(kidX, 1.2, jij.position.z); }
    else if (modus === 'tunnel') { cam.position.set(kidX - 6.5 + sx, 2.6 + sy + e * 6, jij.position.z + .3 + e * 8); cam.lookAt(kidX + 6, 1.1, jij.position.z); }
    else { const mid = modus === 'race' ? kidX * .75 + Math.max(flits.position.x, hop.position.x, vlam.position.x) * .25 : kidX; const k = modus === 'race' ? (cam.aspect > 3.2 ? 1.12 : 1.25) : cam.aspect > 3.2 ? .72 : 1;   // brede, lage baan: camera dichterbij (bij de race minder, zodat Flits ook in beeld is)
      cam.position.set(mid + 2.5 * k + sx - e * 4, 3.6 * k + .6 * (1 - k) + sy + e * 14, 10.5 * k + e * 16); cam.lookAt(mid + 1.8 * k, 1 - e * .5, .2); }
    wolken.forEach((w, i) => { w.position.x += dt * (.4 + i * .05); if (w.position.x > L + 60) w.position.x = -40; });
    if (feest > 0 && Math.random() < .9) strooi(L + 1, 6, (Math.random() - .5) * 9, 3, ['#ffc93c', '#3a5bff', '#e5484d', '#12a26b'], 1.6);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(lus);
  }
  const api = {
    naam(nick, kleur) {
      const n = String(nick || 'Jij').slice(0, 12);
      naam.material.map = label(n, '#ffffff', '#1b1f3a', 256, 100, 62); naam.material.needsUpdate = true;
      pitbord.material.map = label('PITBOX ' + n.toUpperCase(), '#ffc93c', '#1b1f3a', 640, 128, 76); pitbord.material.needsUpdate = true;
      if (kleur) jij.userData.kleurDelen.forEach(o => { if (o && o.userData.m) o.userData.m.material = mat(kleur); });
    },
    delen(n) { delenZichtbaar(n); },
    modus(m) { modus = m; doelX = kidX = 0; flitsX = 0; turbo = 0; fovDoel = 42; feest = 0; draai = 0; deel.length = 0; wisMunten(); intro = m === 'garage' || m === 'toonzaal' || reduce ? 0 : 1; introLoopt = false;
      box.classList.remove('turbo1', 'turbo2'); sfeer(m === 'tunnel');
      wisWoorden(); Object.keys(rivaalX).forEach(k => { rivaalX[k] = 0; });
      if (m === 'garage' || m === 'toonzaal') jij.position.set(GX, .27, 0); else jij.position.set(0, 0, m === 'race' ? 2.9 : 0);   // het kind rijdt vooraan (dichtst bij de camera)
      flits.visible = hop.visible = vlam.visible = m === 'race'; flits.position.set(0, 0, .95); hop.position.set(0, 0, -.95); vlam.position.set(0, 0, -2.9); naam.visible = sterBalk.visible = m !== 'tunnel'; },
    uiterlijk(l) { uiterlijk(l); },
    munten(fracs) { wisMunten(); (fracs || []).forEach(f => munten.push(maakMunt(Math.max(0, Math.min(1, f)) * L + .6, 1.35, jij.position.z))); },
    pak(i, goud) { if (!breek(i, goud)) api.pakNu(goud); },
    pakNu(goud) { const m = maakMunt(kidX + 2.6, 1.35, jij.position.z); munten.push(m); pakMunt(m, goud); },
    ster() { strooi(jij.position.x, 2.2, jij.position.z, 40, ['#ffd23f', '#ffffff', '#ffe9a6'], 1.4, true); },
    wijsSterren() { sterPuls = 7; strooi(jij.position.x, 2.3, jij.position.z, 24, ['#ffd23f', '#ffffff'], 1, true); },   // de sterrenbalk even laten oplichten (uitleg vingersterren)
    start() { introLoopt = true; },
    kid(f) { doelX = Math.max(0, Math.min(1, f)) * L; },
    flits(f) { flitsX = Math.max(0, Math.min(1, f)) * L; },
    rivaal(naam, f) { const x = Math.max(0, Math.min(1, f)) * L; if (naam === 'flits') flitsX = x; else rivaalX[naam] = x; },
    gebied(id) { gebied(id); sfeer(modus === 'tunnel'); },
    woorden(lijst) { wisWoorden(); woordLijst = lijst || []; for (let i = 0; i < Math.min(VENSTER, woordLijst.length); i++) maakWoordObj(i); },
    goed(combo) { turbo = reduce ? 0 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0; fovDoel = 42 + (turbo ? 6 * turbo : 0); box.classList.toggle('turbo1', turbo === 1); box.classList.toggle('turbo2', turbo === 2);
      if (modus === 'garage') strooi(GX, 1.4, 0, 6, ['#ffc93c', '#ffffff', '#3a5bff'], 1, true); else strooi(kidX - 1.4, .5, jij.position.z, combo >= 10 ? 6 : 3, ['#ffc93c', '#ffffff', '#3a5bff']); },
    fout() { wobbel = reduce ? 0 : 1; turbo = 0; fovDoel = 42; schud = reduce ? 0 : .2; box.classList.remove('turbo1', 'turbo2'); },
    onderdeel(n) { const d = jij.userData.delen;
      const naar = n === 'velgen' ? null : d[n];
      if (naar) { naar.visible = true; naar.scale.setScalar(.01); groei.push({ obj: naar, t: 0 }); }
      else jij.userData.velgen.forEach(v => { v.material = velgMat; });
      strooi(GX, 1.6, 0, 40, ['#ffc93c', '#ffffff', '#3a5bff', '#12a26b'], 1.6, true); },
    finish(win) { feest = win && !reduce ? 1 : 0; turbo = 0; fovDoel = 40; box.classList.remove('turbo1', 'turbo2'); },
    voor() { return kidX >= flits.position.x; },
    pauze(b) { if (b === gepauzeerd) return; gepauzeerd = b; if (!b) { klok.getDelta(); maat(); if (!raf) raf = requestAnimationFrame(lus); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  };
  api.naam(opts.nick, opts.kleur);
  return api;
}

window.FV3D = { maak };
window.dispatchEvent(new Event('fv3d-klaar'));
