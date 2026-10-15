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

  /* savanne */
  const acacia = () => { const g = new THREE.Group(); const stam = metRand(new THREE.CylinderGeometry(.18, .3, 3, 5), '#7a5230'); stam.position.y = 1.5; g.add(stam);
    const kroon = metRand(new THREE.CylinderGeometry(2.4, 1.6, .9, 7), '#4f9b3a', 1.05); kroon.position.y = 3.3; g.add(kroon); return g; };
  for (let i = 0; i < 46; i++) { const t = acacia(); const zij = i % 3 === 0 ? 1 : -1; t.position.set(-20 + rand(i) * (L + 60), 0, zij * (zij > 0 ? 15 : 11) + zij * rand(i + 7) * 26); t.scale.setScalar(.8 + rand(i + 3) * .7); t.rotation.y = rand(i + 5) * 6; scene.add(t); }
  for (let i = 0; i < 30; i++) { const r = metRand(new THREE.DodecahedronGeometry(.6 + rand(i + 11) * 1.1, 0), '#b9a58a'); r.position.set(-10 + rand(i + 21) * (L + 40), .3, (i % 2 ? 1 : -1) * (6.5 + rand(i + 31) * 14)); r.rotation.set(rand(i), rand(i + 1), 0); scene.add(r); }
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(14 + rand(i) * 12, 18 + rand(i + 4) * 16, 6), mat(i % 2 ? '#7ea86a' : '#6b9a5a')); b.position.set(-20 + i * 26, 8, -95 - rand(i + 2) * 25); scene.add(b); }
  const wolken = [];
  for (let i = 0; i < 10; i++) { const w = new THREE.Group(); for (let j = 0; j < 3; j++) { const s = metRand(new THREE.IcosahedronGeometry(2 + j * .4, 0), '#ffffff', 1.04); s.position.set(j * 2.6, (j % 2) * .6, 0); w.add(s); }
    w.position.set(-20 + i * 22, 22 + rand(i) * 8, -60 - rand(i + 9) * 30); scene.add(w); wolken.push(w); }

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
      [.6, -.6].forEach(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, .14, .02), new THREE.MeshBasicMaterial({ color: '#ffc93c' })); b.position.set(.1, .62, z * .97); delen.strepen.add(b); }); }
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

  /* deeltjes */
  const MAX = 300, pgeo = new THREE.BufferGeometry(), ppos = new Float32Array(MAX * 3), pkol = new Float32Array(MAX * 3);
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(pkol, 3));
  scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ size: .32, vertexColors: true, transparent: true, opacity: .95 })));
  const deel = []; let pi = 0;
  const strooi = (x, y, z, n, kleuren, kracht = 1, rond = false) => { if (reduce) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28;
    deel[pi] = rond ? { x, y, z, vx: Math.cos(a) * .18 * kracht, vy: .12 + Math.random() * .2 * kracht, vz: Math.sin(a) * .18 * kracht, l: 1, k: new THREE.Color(kleuren[i % kleuren.length]) }
                    : { x, y, z, vx: (-Math.random() * .4 - .1) * kracht, vy: Math.random() * .25 * kracht, vz: (Math.random() - .5) * .3 * kracht, l: 1, k: new THREE.Color(kleuren[i % kleuren.length]) }; pi = (pi + 1) % MAX; } };

  let modus = 'garage', doelX = 0, kidX = 0, flitsX = 0, wobbel = 0, fovDoel = 42, turbo = 0, schud = 0, feest = 0, intro = 0, introLoopt = false, draai = 0, groei = [];
  let raf = 0, gepauzeerd = true;
  const klok = new THREE.Clock();
  function maat() { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener('resize', maat); if ('ResizeObserver' in window) new ResizeObserver(maat).observe(box); maat();
  function sfeer(donker) {
    scene.background.set(donker ? '#0d1024' : DAG.lucht); scene.fog.color.set(donker ? '#0d1024' : DAG.mist); scene.fog.near = donker ? 6 : DAG.n; scene.fog.far = donker ? 46 : DAG.f;
    hemi.intensity = donker ? .14 : 1.05; zon.intensity = donker ? .04 : 1.6;
    jij.userData.koplamp.intensity = donker ? 90 : 0; jij.userData.lampjes.forEach(l => l.material.color.set(donker ? '#fff6c8' : '#5d6380'));
    tunnel.visible = donker; }
  function delenZichtbaar(n) {
    const d = jij.userData.delen;
    d.spoiler.visible = n >= 1; d.strepen.visible = n >= 2; d.uitlaat.visible = n >= 3;
    [d.spoiler, d.strepen, d.uitlaat].forEach(x => x.scale.setScalar(1));
    jij.userData.velgen.forEach(v => { v.material = n >= 4 ? GOUD : VELG; });
  }
  function lus() {
    raf = 0; if (gepauzeerd) return;
    const dt = Math.max(.001, Math.min(.05, klok.getDelta())), t = klok.elapsedTime;
    const oud = kidX; kidX += (doelX - kidX) * Math.min(1, dt * 6); const v = (kidX - oud) / dt;
    if (modus !== 'garage') jij.position.x = kidX;
    flits.position.x += (flitsX - flits.position.x) * Math.min(1, dt * 8);
    for (const w of jij.userData.wielen) w.rotation.z -= v * dt * 2.2;
    for (const w of flits.userData.wielen) w.rotation.z -= 9 * dt * (modus === 'race' && flitsX > 0 && flitsX < L ? 1 : 0);
    jij.rotation.y = (modus === 'garage' ? -.5 + Math.sin(t * .4) * .25 : 0) + Math.sin(t * 30) * wobbel * .25; wobbel *= .9;
    jij.position.y = modus === 'garage' ? .27 : Math.abs(Math.sin(t * 14)) * Math.min(.12, v * .01);
    const u = jij.userData; u.vlam.visible = turbo > 0; if (turbo) { const s = (turbo > 1 ? 1.5 : 1) * (.85 + Math.sin(t * 40) * .15); u.vlam.scale.set(1, s, 1); u.vlam.material.color.set(turbo > 1 ? '#7ad7ff' : '#ff9f2f'); }
    groei = groei.filter(gr => { gr.t += dt * 3.2; const s = gr.t < 1 ? 1 + Math.sin(gr.t * Math.PI) * .5 : 1; gr.obj.scale.setScalar(Math.min(1, gr.t) * s); return gr.t < 1.2; });
    if (modus !== 'garage' && v > 2 && Math.random() < .5) strooi(kidX - 1.4, .2, 2.1 + (Math.random() - .5) * (modus === 'race' ? 1 : 0), 1, modus === 'tunnel' ? ['#3b4060', '#5d6380'] : ['#d8a35c', '#f2c27b']);
    if (turbo > 1 && Math.random() < .8) strooi(kidX - 2, .6, jij.position.z, 1, ['#ffe066', '#7ad7ff', '#ffffff'], 1.4);
    for (let i = 0; i < MAX; i++) { const p = deel[i]; if (!p || p.l <= 0) { ppos[i * 3 + 1] = -99; continue; } p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy -= .012; p.l -= .022; if (p.y < 0) { p.y = 0; p.vy *= -.3; }
      ppos[i * 3] = p.x; ppos[i * 3 + 1] = p.y; ppos[i * 3 + 2] = p.z; pkol[i * 3] = p.k.r; pkol[i * 3 + 1] = p.k.g; pkol[i * 3 + 2] = p.k.b; }
    pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
    cam.fov += (fovDoel - cam.fov) * dt * 3; cam.updateProjectionMatrix();
    const sx = (Math.random() - .5) * schud, sy = (Math.random() - .5) * schud; schud *= .85;
    if (introLoopt) intro = Math.max(0, intro - dt / 2.4); const e = reduce ? 0 : intro * intro;
    if (modus === 'garage') { const ver = cam.aspect > 3.2 ? 0 : 1.6; cam.position.set(GX + 3.4 + ver * .6, 2.5 + ver * .5, 6.2 + ver * 1.8); cam.lookAt(GX - .9, 1.3, -.4); }
    else if (feest > 0) { draai = Math.min(.5, draai + dt * .3); const h = .2 + draai; cam.position.set(kidX + Math.sin(h) * 8, 3.4, jij.position.z + Math.cos(h) * 8); cam.lookAt(kidX, 1.2, jij.position.z); }
    else if (modus === 'tunnel') { cam.position.set(kidX - 6.5 + sx, 2.6 + sy + e * 6, jij.position.z + .3 + e * 8); cam.lookAt(kidX + 6, 1.1, jij.position.z); }
    else { const mid = modus === 'race' ? kidX * .75 + flits.position.x * .25 : kidX; cam.position.set(mid + 2.5 + sx - e * 4, 3.6 + sy + e * 14, 10.5 + e * 16); cam.lookAt(mid + 1.8, 1 - e * .5, .2); }
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
    modus(m) { modus = m; doelX = kidX = 0; flitsX = 0; turbo = 0; fovDoel = 42; feest = 0; draai = 0; deel.length = 0; intro = m === 'garage' || reduce ? 0 : 1; introLoopt = false;
      box.classList.remove('turbo1', 'turbo2'); sfeer(m === 'tunnel');
      if (m === 'garage') jij.position.set(GX, .27, 0); else jij.position.set(0, 0, m === 'race' ? 2.1 : 0);
      flits.visible = m === 'race'; flits.position.set(0, 0, -2.1); naam.visible = m !== 'tunnel'; },
    start() { introLoopt = true; },
    kid(f) { doelX = Math.max(0, Math.min(1, f)) * L; },
    flits(f) { flitsX = Math.max(0, Math.min(1, f)) * L; },
    goed(combo) { turbo = reduce ? 0 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0; fovDoel = 42 + (turbo ? 6 * turbo : 0); box.classList.toggle('turbo1', turbo === 1); box.classList.toggle('turbo2', turbo === 2);
      if (modus === 'garage') strooi(GX, 1.4, 0, 6, ['#ffc93c', '#ffffff', '#3a5bff'], 1, true); else strooi(kidX - 1.4, .5, jij.position.z, combo >= 10 ? 6 : 3, ['#ffc93c', '#ffffff', '#3a5bff']); },
    fout() { wobbel = reduce ? 0 : 1; turbo = 0; fovDoel = 42; schud = reduce ? 0 : .2; box.classList.remove('turbo1', 'turbo2'); },
    onderdeel(n) { const d = jij.userData.delen;
      const naar = n === 'velgen' ? null : d[n];
      if (naar) { naar.visible = true; naar.scale.setScalar(.01); groei.push({ obj: naar, t: 0 }); }
      else jij.userData.velgen.forEach(v => { v.material = GOUD; });
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
