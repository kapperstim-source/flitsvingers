/* Mini-les "Probeer het zelf, met Flits" op de homepage (sinds 12-10-2026, idee Tim).
   Werkt op de laptop (eigen toetsenbord) en op de telefoon (toetsen aantikken). Flits praat met de bestaande opnames.
   Onderbouwing: gratis proberen werkt alleen als het NU kan (Bawa & Shoemaker 2004); 90% van het bezoek zit op een telefoon.
   Regels: Flits praat over de letter die NU oplicht (een nieuwe zin breekt de vorige af); bij een fout moedigt hij aan,
   hooguit eens per 4 s en nooit door een andere zin heen. Meten: minidemo-gestart-, minidemo-klaar-, minidemo-les1-, minidemo-mail- + telefoon/laptop.
   Sinds 15-10-2026: dezelfde 3D-racebaan als in de cursus; sinds 26-10-2026 de nieuwe racewereld (racewereld.js, zonder kratten:
   elk woord geeft de kart een zetje, de munt springt boven de kart op). Pas bij Start laden we de wereld + Three.js (eigen site);
   tot die tijd (en als 3D niet kan) staat er een plaatje van de baan. Elke goede letter = de kart rijdt verder.
   Sinds 26-10-2026 ook dezelfde opbouw als de cursus (Tim): letterbalk over de wereld, Flits in een ballon, dashboard met hetzelfde
   toetsenbord en dezelfde handjes. De volgende toets gloeit en de vinger die hem typt, gaat omhoog. */
(() => {
  const vak = document.getElementById('minidemo');
  if (!vak) return;
  const OEFENING = 'fj fj jas';
  const BAANDEEL = .3;   // de mini-les rijdt maar een stukje van de baan: anders schiet de kart bij elke letter 25 meter weg en zie je hem nauwelijks
  const ZEGT = { f: 'De F. Met je linker wijsvinger.', j: 'De J. Met je rechter wijsvinger.', a: 'De A. Met je linker pink.', s: 'De S. Met je linker ringvinger.', ' ': 'De spatiebalk. Met je duim.' };
  // hint in de letterbalk en de vinger die omhoog gaat (zelfde vingerkleuren als de cursus)
  const HINT = { f: ['F', 'met je linker wijsvinger', '#3ba7ff', ['li']], j: ['J', 'met je rechter wijsvinger', '#3ba7ff', ['ri']], a: ['A', 'met je linker pink', '#ff6fa8', ['lp']],
                 s: ['S', 'met je linker ringvinger', '#ff9f43', ['lr']], ' ': ['Spatie', 'met je duim', '#a6afc7', ['th']] };
  // Meten per apparaat (Tim, 12-10-2026): elke gebeurtenis krijgt -telefoon of -laptop achter de naam.
  const APP = matchMedia('(pointer:coarse) and (max-width:820px)').matches ? 'telefoon' : 'laptop';
  const tel = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path + '-' + APP, title: title + ' (' + APP + ')', event: true }); } catch (e) {} };
  const $ = s => vak.querySelector(s);
  const regel = $('.md-regel'), ballon = $('.md-ballon span'), hint = $('.md-hint'), baan = $('.md-baan');
  let pos = -1, gehad = new Set(), aan = true, bezig = false, huidig = null, laatsteOpnieuw = 0, reeks = 0, W = null, woordNr = 0, woordFout = false;

  /* 3D-racebaan: alleen als het apparaat het kan en niemand om minder beweging vraagt */
  const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wereld() {
    if (W !== null || rustig || !baan) return Promise.resolve(W);
    W = false;
    return import('./racewereld.js?v=20').then(() => {
      const w = window.FV3D && window.FV3D.maak(baan, { nick: 'Jij', kleur: '#3a5bff', muziek: false, geluid: aan, laadscherm: false, foto: true, scherp: true });
      if (!w) return null;
      W = w; W.gebied('dorp'); W.delen(4); W.modus('training'); W.pauze(false); W.start(); vak.classList.add('md-3d');
      W.kid(Math.max(0, pos) / OEFENING.length * BAANDEEL);
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

  regel.innerHTML = [...OEFENING].map(t => '<span' + (t === ' ' ? ' class="sp"' : '') + '>' + (t === ' ' ? '&nbsp;' : t) + '</span>').join('');
  const vakjes = [...regel.children];
  const toetsen = t => vak.querySelectorAll('.md-dash [data-k="' + t + '"]');
  const vingers = ids => vak.querySelectorAll('.hands .fg').forEach(f => f.classList.toggle('on', ids.includes(f.dataset.f)));
  const kleurRegel = () => vakjes.forEach((v, i) => { v.className = (OEFENING[i] === ' ' ? 'sp ' : '') + (i < pos ? 'ok' : i === pos ? 'nu' : ''); });

  function zetDoel() {
    vak.querySelectorAll('.md-dash .key.doel').forEach(k => k.classList.remove('doel'));
    kleurRegel();
    if (W) W.kid(pos / OEFENING.length * BAANDEEL);
    if (pos >= OEFENING.length) { hint.innerHTML = ''; vingers([]); return klaar(); }
    const t = OEFENING[pos]; toetsen(t).forEach(k => k.classList.add('doel'));
    const [letter, uitleg, kleur, ids] = HINT[t];
    hint.innerHTML = '<i style="background:' + kleur + '"></i><b>' + letter + '</b> ' + uitleg; vingers(ids);
    // De tekst volgt ALTIJD de letter die nu oplicht (Tim 12-10: bleef anders na de eerste spatie op "De spatiebalk" staan);
    // hardop zegt Flits een letter alleen de eerste keer.
    ballon.textContent = ZEGT[t];
    if (!gehad.has(t)) { gehad.add(t); speel(t === ' ' ? 'toets_spatie' : 'toets_' + t); }
  }
  function druk(t) {
    if (!bezig) return;
    toetsen(t).forEach(k => { k.classList.add('tik'); setTimeout(() => k.classList.remove('tik'), 90); });
    if (t === OEFENING[pos]) { pos++; reeks++; if (W) W.goed(reeks);
      if (t !== ' ' && (OEFENING[pos] === ' ' || pos >= OEFENING.length)) { if (W) { W.boost(!woordFout); W.pakNu(!woordFout); } woordNr++; woordFout = false; }
      zetDoel(); return; }
    reeks = 0; woordFout = true; if (W) W.fout();
    toetsen(t).forEach(k => { k.classList.add('fout'); setTimeout(() => k.classList.remove('fout'), 300); });
    const v = vakjes[pos]; v.classList.add('fout'); setTimeout(() => { if (vakjes[pos] === v) v.classList.remove('fout'); }, 350);
    ballon.textContent = 'Goed geprobeerd! Probeer het nog een keer. Zoek de toets die oplicht.';
    if (!huidig && Date.now() - laatsteOpnieuw > 4000) { laatsteOpnieuw = Date.now(); speel('demo_opnieuw'); }
  }
  function klaar() {
    bezig = false;
    if (W) { W.finish(true); setTimeout(() => { if (W) W.pauze(true); }, 9000); }
    ballon.textContent = 'Wauw, goed gedaan! Heel goed bezig. Ga snel verder met de eerste les van de gratis cursus!';
    speel('demo_klaar'); vak.classList.add('md-af'); $('.md-klaar').hidden = false; $('.md-start').hidden = true; tel('minidemo-klaar', 'Mini-les afgemaakt');
  }

  $('.md-startknop').addEventListener('click', () => {
    pos = 0; reeks = 0; woordNr = 0; woordFout = false; gehad = new Set(); $('.md-start').hidden = true; vak.classList.add('md-bezig');
    ballon.textContent = 'Hoi, ik ben Flits! Typ de letter die oplicht. Daar gaan we!';
    kleurRegel();
    tel('minidemo-gestart', 'Mini-les gestart');
    wereld();   // laadt tijdens de begroeting; lukt het niet, dan blijft het plaatje staan
    speel('demo_start', () => { bezig = true; zetDoel(); });   // eerste letter pas na de begroeting
  });
  vak.querySelectorAll('.md-dash [data-k]').forEach(k => k.addEventListener('pointerdown', e => { e.preventDefault(); druk(k.dataset.k); }));
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // tijdens de begroeting al typen: niets doen, maar de pagina ook niet laten verspringen (spatie scrolt anders)
    if (!bezig) { if (e.key === ' ' && vak.classList.contains('md-bezig') && $('.md-klaar').hidden) e.preventDefault(); return; }
    if (e.key.length === 1) { e.preventDefault(); druk(e.key.toLowerCase()); }
  });
  $('.md-geluid').addEventListener('click', e => { aan = !aan; e.currentTarget.textContent = aan ? 'geluid uit' : 'geluid aan'; if (!aan) stil(); if (W && W.geluid) W.geluid(aan); });
  vak.querySelectorAll('[data-md-tel]').forEach(a => a.addEventListener('click', () => tel(a.dataset.mdTel, a.textContent.trim())));
})();
