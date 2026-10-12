/* Mini-les "Probeer het zelf, met Flits" op de homepage (sinds 12-10-2026, idee Tim).
   Werkt op de laptop (eigen toetsenbord) en op de telefoon (toetsen aantikken). Flits praat met de bestaande opnames.
   Onderbouwing: gratis proberen werkt alleen als het NU kan (Bawa & Shoemaker 2004); 90% van het bezoek zit op een telefoon.
   Regels: Flits praat over de letter die NU oplicht (een nieuwe zin breekt de vorige af); bij een fout moedigt hij aan,
   hooguit eens per 4 s en nooit door een andere zin heen. Meten: minidemo-gestart-, minidemo-klaar-, minidemo-les1-, minidemo-mail- + telefoon/laptop. */
(() => {
  const vak = document.getElementById('minidemo');
  if (!vak) return;
  const OEFENING = 'fj fj jas';
  const ZEGT = { f: 'De F. Met je linker wijsvinger.', j: 'De J. Met je rechter wijsvinger.', a: 'De A. Met je linker pink.', s: 'De S. Met je linker ringvinger.', ' ': 'De spatiebalk. Met je duim.' };
  // Meten per apparaat (Tim, 12-10-2026): elke gebeurtenis krijgt -telefoon of -laptop achter de naam.
  const APP = matchMedia('(pointer:coarse) and (max-width:820px)').matches ? 'telefoon' : 'laptop';
  const tel = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path + '-' + APP, title: title + ' (' + APP + ')', event: true }); } catch (e) {} };
  const $ = s => vak.querySelector(s);
  const regel = $('.md-regel'), ballon = $('.md-ballon');
  let pos = -1, gehad = new Set(), aan = true, bezig = false, huidig = null, laatsteOpnieuw = 0;

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
    if (t === OEFENING[pos]) { pos++; zetDoel(); return; }
    const v = vakjes[pos]; v.className = 'nu fout'; setTimeout(() => { if (vakjes[pos] === v) v.className = 'nu'; }, 350);
    ballon.textContent = 'Goed geprobeerd! Probeer het nog een keer. Zoek de toets die oplicht.';
    if (!huidig && Date.now() - laatsteOpnieuw > 4000) { laatsteOpnieuw = Date.now(); speel('demo_opnieuw'); }
  }
  function klaar() {
    bezig = false;
    ballon.textContent = 'Wauw, goed gedaan! Heel goed bezig. Ga snel verder met de eerste les van de gratis cursus!';
    speel('demo_klaar'); $('.md-klaar').hidden = false; $('.md-start').hidden = true; tel('minidemo-klaar', 'Mini-les afgemaakt');
  }

  $('.md-startknop').addEventListener('click', () => {
    pos = 0; gehad = new Set(); $('.md-start').hidden = true;
    ballon.textContent = 'Hoi, ik ben Flits! Typ de letter die oplicht. Daar gaan we!';
    tel('minidemo-gestart', 'Mini-les gestart');
    speel('demo_start', () => { bezig = true; zetDoel(); });   // eerste letter pas na de begroeting
  });
  vak.querySelectorAll('.md-k').forEach(k => k.addEventListener('pointerdown', e => { e.preventDefault(); druk(k.dataset.k); }));
  document.addEventListener('keydown', e => {
    if (!bezig || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key.length === 1) { e.preventDefault(); druk(e.key.toLowerCase()); }
  });
  $('.md-geluid').addEventListener('click', e => { aan = !aan; e.currentTarget.textContent = aan ? 'geluid uit' : 'geluid aan'; if (!aan) stil(); });
  vak.querySelectorAll('[data-md-tel]').forEach(a => a.addEventListener('click', () => tel(a.dataset.mdTel, a.textContent.trim())));
})();
