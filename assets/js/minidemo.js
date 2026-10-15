/* Mini-les "Probeer het zelf, met Flits" op de homepage (sinds 12-10-2026, idee Tim).
   Werkt op de laptop (eigen toetsenbord) en op de telefoon (toetsen aantikken). Flits praat met de bestaande opnames.
   Onderbouwing: gratis proberen werkt alleen als het NU kan (Bawa & Shoemaker 2004); 90% van het bezoek zit op een telefoon.
   Regels: Flits praat over de letter die NU oplicht (een nieuwe zin breekt de vorige af); bij een fout moedigt hij aan,
   hooguit eens per 4 s en nooit door een andere zin heen. Meten: minidemo-gestart-, minidemo-klaar-, minidemo-les1-, minidemo-mail- + telefoon/laptop.
   Sinds 15-10-2026: dezelfde 3D-racebaan als in de cursus. Pas bij Start laden we wereld3d.js + Three.js (eigen site);
   tot die tijd (en als 3D niet kan) staat er een plaatje van de baan. Elke goede letter = de kart rijdt verder. */
(() => {
  const vak = document.getElementById('minidemo');
  if (!vak) return;
  const OEFENING = 'fj fj jas';
  const ZEGT = { f: 'De F. Met je linker wijsvinger.', j: 'De J. Met je rechter wijsvinger.', a: 'De A. Met je linker pink.', s: 'De S. Met je linker ringvinger.', ' ': 'De spatiebalk. Met je duim.' };
  // Meten per apparaat (Tim, 12-10-2026): elke gebeurtenis krijgt -telefoon of -laptop achter de naam.
  const APP = matchMedia('(pointer:coarse) and (max-width:820px)').matches ? 'telefoon' : 'laptop';
  const tel = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path + '-' + APP, title: title + ' (' + APP + ')', event: true }); } catch (e) {} };
  const $ = s => vak.querySelector(s);
  const regel = $('.md-regel'), ballon = $('.md-ballon'), baan = $('.md-baan');
  let pos = -1, gehad = new Set(), aan = true, bezig = false, huidig = null, laatsteOpnieuw = 0, reeks = 0, W = null;

  /* 3D-racebaan: alleen als het apparaat het kan en niemand om minder beweging vraagt */
  const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wereld() {
    if (W !== null || rustig || !baan) return Promise.resolve(W);
    W = false;
    return import('./wereld3d.js?v=2').then(() => {
      const w = window.FV3D && window.FV3D.maak(baan, { nick: 'Jij', kleur: '#3a5bff' });
      if (!w) return null;
      W = w; W.delen(4); W.modus('training'); W.pauze(false); W.start(); vak.classList.add('md-3d');
      // niet in beeld = niet tekenen (scheelt batterij)
      if ('IntersectionObserver' in window) new IntersectionObserver(e => { if (W) W.pauze(!e[0].isIntersecting); }).observe(baan);
      return W;
    }).catch(() => null);
  }

  function stil() { if (huidig) { huidig.onended = huidig.onerror = null; huidig.pause(); huidig = null; } }
  function speel(naam, naDan) {
    stil();
    if (!aan) { if (naDan) naDan(); return; }
    const a = new Audio('assets/audio/stem/' + naam + '.mp3'); huidig = a; let klaar = false;
    const klaarMet = () => { if (klaar) return; klaar = true; if (huidig === a) huidig = null; if (naDan) naDan(); };
    a.onended = a.onerror = klaarMet; a.play().catch(klaarMet);
    if (naDan) setTimeout(klaarMet, 8000);   // vangnet als het geluid niet laadt
  }

  regel.innerHTML = [...OEFENING].map(t => '<span>' + (t === ' ' ? '&nbsp;' : t) + '</span>').join('');
  const vakjes = [...regel.children];
  const toets = t => vak.querySelector('.md-k[data-k="' + (t === ' ' ? ' ' : t) + '"]');

  function zetDoel() {
    vak.querySelectorAll('.md-k.doel').forEach(k => k.classList.remove('doel'));
    vakjes.forEach((v, i) => { v.className = i < pos ? 'ok' : i === pos ? 'nu' : ''; });
    if (W) W.kid(pos / OEFENING.length);
    if (pos >= OEFENING.length) return klaar();
    const t = OEFENING[pos]; const k = toets(t); if (k) k.classList.add('doel');
    // De tekst volgt ALTIJD de letter die nu oplicht (Tim 12-10: bleef anders na de eerste spatie op "De spatiebalk" staan);
    // hardop zegt Flits een letter alleen de eerste keer.
    ballon.textContent = ZEGT[t];
    if (!gehad.has(t)) { gehad.add(t); speel(t === ' ' ? 'toets_spatie' : 'toets_' + t); }
  }
  function druk(t) {
    if (!bezig) return;
    const k = toets(t); if (k) { k.classList.add('tik'); setTimeout(() => k.classList.remove('tik'), 90); }
    if (t === OEFENING[pos]) { pos++; reeks++; if (W) W.goed(reeks); zetDoel(); return; }
    reeks = 0; if (W) W.fout();
    const v = vakjes[pos]; v.className = 'nu fout'; setTimeout(() => { if (vakjes[pos] === v) v.className = 'nu'; }, 350);
    ballon.textContent = 'Goed geprobeerd! Probeer het nog een keer. Zoek de toets die oplicht.';
    if (!huidig && Date.now() - laatsteOpnieuw > 4000) { laatsteOpnieuw = Date.now(); speel('demo_opnieuw'); }
  }
  function klaar() {
    bezig = false;
    if (W) { W.finish(true); setTimeout(() => { if (W) W.pauze(true); }, 9000); }
    ballon.textContent = 'Wauw, goed gedaan! Heel goed bezig. Ga snel verder met de eerste les van de gratis cursus!';
    speel('demo_klaar'); $('.md-klaar').hidden = false; $('.md-start').hidden = true; tel('minidemo-klaar', 'Mini-les afgemaakt');
  }

  $('.md-startknop').addEventListener('click', () => {
    pos = 0; reeks = 0; gehad = new Set(); $('.md-start').hidden = true; vak.classList.add('md-bezig');
    ballon.textContent = 'Hoi, ik ben Flits! Typ de letter die oplicht. Daar gaan we!';
    tel('minidemo-gestart', 'Mini-les gestart');
    wereld();   // laadt tijdens de begroeting; lukt het niet, dan blijft het plaatje staan
    speel('demo_start', () => { bezig = true; zetDoel(); });   // eerste letter pas na de begroeting
  });
  vak.querySelectorAll('.md-k').forEach(k => k.addEventListener('pointerdown', e => { e.preventDefault(); druk(k.dataset.k); }));
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // tijdens de begroeting al typen: niets doen, maar de pagina ook niet laten verspringen (spatie scrolt anders)
    if (!bezig) { if (e.key === ' ' && vak.classList.contains('md-bezig') && $('.md-klaar').hidden) e.preventDefault(); return; }
    if (e.key.length === 1) { e.preventDefault(); druk(e.key.toLowerCase()); }
  });
  $('.md-geluid').addEventListener('click', e => { aan = !aan; e.currentTarget.textContent = aan ? 'geluid uit' : 'geluid aan'; if (!aan) stil(); });
  vak.querySelectorAll('[data-md-tel]').forEach(a => a.addEventListener('click', () => tel(a.dataset.mdTel, a.textContent.trim())));
})();
