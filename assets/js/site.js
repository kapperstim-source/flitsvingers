/* Flitsvingers: gedeeld script voor alle sitepagina's (homepage, hoe-het-werkt, voor-ouders, prijs, vragen).
   Elk onderdeel draait alleen als het op de pagina staat. Sinds 12-10-2026 (opgesplitst uit index.html). */

/* Instellingen: de Stripe-betaallink (normaal €49). Leeg = knop toont "De verkoop start binnenkort". */
const BETAAL_URL = 'https://buy.stripe.com/aFa5kC6bweSc1Np8Y51wY01';
/* Sinterklaasaanbieding (Tim, 28-10-2026): €24,95 in plaats van €49 ("bijna 50% korting": het is 49,1%, dus niet
   "50%" schrijven), tot en met 5 december 2026. Geen kortingscode (Tims keuze): een aparte Stripe-betaallink van €24,95
   (url hieronder; ook in STRIPE_LINK van Code.gs). Bovenaan elke pagina een balk met de dagen die nog over zijn.
   Na de einddatum gaat de koopknop weer naar BETAAL_URL en zet dit script de prijzen terug ([data-normaal] krijgt die
   tekst, .aanb en de balk verdwijnen). Zet daarna de €24,95-link in Stripe uit en haal de aanbieding uit de HTML (prijs.html titel,
   JSON-LD op index.html, voorwaarden, cadeaubon, scholen, gratis-typecursus). */
const AANBIEDING = { url: 'https://buy.stripe.com/eVqfZg0RceSc9fR1vD1wY03', tot: new Date('2026-12-06T00:00:00+01:00') };
const aanbiedingLoopt = () => Date.now() < AANBIEDING.tot.getTime();
/* Code EERSTE50 voor wie via de Facebook-advertentie komt (Tim, 1-11-2026): de advertentie belooft "Code EERSTE50: €9,95 in plaats
   van €24,95", dus dat moet na de klik ook op de site staan. Stripe-kortingsbon: €15 van de €24,95-link, max 50 keer, t/m 5 december.
   Een ref uit ACTIE.refs wordt onthouden in localStorage (het kind doet vaak eerst de typ-check en de gratis lessen, de ouder koopt
   later); daarna ziet die bezoeker de code in de balk, bovenaan de homepage en bij de prijs, en staat hij bij Stripe al ingevuld
   (prefilled_promo_code). Andere bezoekers zien niets anders. Teller: koopknop-eerste50. */
const ACTIE = { code: 'EERSTE50', refs: /^fb-advertentie$/ };
const actieActief = (() => {
  if (!aanbiedingLoopt()) return false;
  const viaLink = ACTIE.refs.test((new URLSearchParams(location.search).get('ref') || '').toLowerCase());
  try {
    if (viaLink) localStorage.setItem('flitsvingers_actie', ACTIE.code);
    return viaLink || localStorage.getItem('flitsvingers_actie') === ACTIE.code;
  } catch (e) { return viaLink; }
})();
const API_URL = 'https://script.google.com/macros/s/AKfycbycENGI2KDXQ3h3RY18VuHf2OJqUb3tOQLntwotXfBFQfLvYowDPKpwLaDtOiopKdM/exec';
const telGC = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true }); } catch (e) {} };

/* oude links naar stukken van de homepage (bv. flitsvingers.nl/#vragen) gaan naar de nieuwe pagina's */
(() => {
  if (!document.body.classList.contains('home')) return;
  const naar = { '#hoe': 'hoe-het-werkt.html', '#probeer': 'hoe-het-werkt.html#probeer', '#ouders': 'voor-ouders.html',
                 '#diploma': 'voor-ouders.html#diploma', '#vragen': 'vragen.html', '#mailmij': 'proefles-aanvragen.html' };
  if (naar[location.hash]) location.replace(naar[location.hash]);
})();

/* aanbieding: balk bovenaan + aftellen (GoatCounter 'sint-balk'); voorbij: normale prijs tonen */
(() => {
  if (aanbiedingLoopt()) {
    const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
    const dagen = Math.round((new Date(2026, 11, 5) - vandaag) / 864e5) + 1;   // 5 december telt mee
    const nog = dagen <= 1 ? 'vandaag de laatste dag' : 'nog ' + dagen + ' dagen';
    const balk = document.createElement('div');
    balk.className = 'sint-balk';
    balk.innerHTML = actieActief
      ? '<span class="sint-lang">Code <b>' + ACTIE.code + '</b>: €9,95 in plaats van €24,95, voor de eerste 50 gezinnen, ' + nog + ' (t/m 5 december) · <a href="prijs.html" data-gc="sint-balk">Bekijk de prijs</a></span>' +
        '<span class="sint-kort">Code <b>' + ACTIE.code + '</b>: €9,95, ' + nog + ' · <a href="prijs.html" data-gc="sint-balk">Bekijk</a></span>'
      : '<span class="sint-lang">Sinterklaasaanbieding: <b>bijna 50% korting</b> op de typecursus, ' + nog + ' (t/m 5 december) · <a href="prijs.html" data-gc="sint-balk">Bekijk de prijs</a></span>' +
        '<span class="sint-kort">Sinterklaas: <b>bijna 50% korting</b>, ' + nog + ' · <a href="prijs.html" data-gc="sint-balk">Bekijk</a></span>';
    // in de vaste menubalk (nav is sticky), zodat de balk meebeweegt bij het scrollen (Tim, 28-10-2026)
    const nav = document.querySelector('nav');
    if (nav) { nav.prepend(balk); document.documentElement.style.scrollPaddingTop = (nav.offsetHeight + 10) + 'px'; }
    else document.body.prepend(balk);
    document.querySelectorAll('[data-aftellen]').forEach(e => { e.textContent = nog.charAt(0).toUpperCase() + nog.slice(1) + ', tot en met 5 december'; });
    return;
  }
  document.querySelectorAll('.aanb').forEach(e => e.remove());
  document.querySelectorAll('[data-normaal]').forEach(e => { e.textContent = e.dataset.normaal; });
})();

/* code EERSTE50 (zie ACTIE): één zin onder de knoppen bovenaan de homepage en één onder de prijs */
(() => {
  if (!actieActief) return;
  const regel = (cls, html) => { const p = document.createElement('p'); p.className = cls; p.innerHTML = html; return p; };
  // wie bovenaan koopt, slaat het prijsblok over: zeg hier wat je krijgt en dat je je geld terugkrijgt (Tim, 1-11-2026: "ja, allebei")
  document.querySelectorAll('.held .row').forEach(r => r.after(regel('actie-regel',
    'Met de code <b>' + ACTIE.code + '</b>: 30 lessen, proefexamens en een diploma voor €9,95 in plaats van €24,95. <b>Niet tevreden?</b> Binnen 30 dagen je geld terug.')));
  /* meteen kopen vanaf de bovenkant (Tim, 1-11-2026: "je kan nu nergens meteen afrekenen"): het pijltje "Bekijk de prijs"
     gaat dan rechtstreeks naar Stripe, met de code ingevuld. Teller: koopknop-boven (+ koopknop-eerste50) */
  document.querySelectorAll('.held .row a.arrow[href="#prijs"]').forEach(a => {
    a.textContent = 'Koop de cursus voor €9,95';   // zelfde woorden als de knop bij de prijs (Tim: "meteen afrekenen" is een rare tekst)
    a.className = 'btn groot';                      // een echte, gele knop (Tim: "alleen tekst, geen knop"; "de linker wit en de rechter geel")
    a.href = AANBIEDING.url + '?prefilled_promo_code=' + ACTIE.code;
    a.dataset.koop = 'koopknop-boven';
    a.addEventListener('click', e => e.preventDefault());   // de koopknop hieronder telt eerst en stuurt dan door
    a.closest('.row').querySelectorAll('.btn.desk-only').forEach(k => k.classList.add('line'));   // de typ-check-knop ernaast wordt wit
  });
  document.querySelectorAll('.buy .amount').forEach(a => a.after(regel('actie-prijs',
    'Met de code <b>' + ACTIE.code + '</b> betaal je <b>€9,95</b>. Bij het betalen staat de code al ingevuld.')));
})();

/* koopknop (GoatCounter: 'koopknop') */
(() => {
  const modal = document.getElementById('modal');
  document.querySelectorAll('#koop,[data-koop]').forEach(b => b.addEventListener('click', () => {
    telGC(b.dataset.koop || 'koopknop', 'Klik op kopen');
    if (actieActief) telGC('koopknop-eerste50', 'Klik op kopen met de code EERSTE50');
    const aanbUrl = AANBIEDING.url + (actieActief ? '?prefilled_promo_code=' + ACTIE.code : '');
    if (BETAAL_URL) { setTimeout(() => { location.href = aanbiedingLoopt() ? aanbUrl : BETAAL_URL; }, 200); return; }
    if (modal) modal.hidden = false;
  }));
  if (!modal) return;
  const dicht = document.getElementById('modal-close');
  if (dicht) dicht.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.hidden = true; });
})();

/* 'Waarom nu?': ouder kiest de groep, wij rekenen uit wanneer de brugklas begint en wanneer het kind klaar is
   (30 lessen, 5 dagen per week: 8 tot 12 weken, zie vragen.html; we rekenen met het midden, 10 weken). Sinds 24-10-2026. */
(() => {
  const knoppen = document.querySelectorAll('[data-groep]'), uit = document.getElementById('wn-uitkomst');
  if (!knoppen.length || !uit) return;
  const MAAND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const nu = new Date(), klaar = new Date(nu.getTime() + 70 * 864e5);
  const klaarTekst = (klaar.getDate() <= 10 ? 'begin ' : klaar.getDate() <= 20 ? 'half ' : 'eind ') + MAAND[klaar.getMonth()];
  const duur = m => m < 18 ? 'ongeveer ' + m + ' maanden' : 'ongeveer ' + String(Math.round(m / 6) / 2).replace('.', ',') + ' jaar';
  knoppen.forEach(b => b.addEventListener('click', () => {
    const groep = Number(b.dataset.groep);
    knoppen.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    const brugklas = new Date((nu.getMonth() >= 7 ? nu.getFullYear() + 1 : nu.getFullYear()) + (8 - groep), 8, 1);
    const m = Math.max(1, Math.round((brugklas - nu) / (30.44 * 864e5)));
    uit.textContent = 'Over ' + duur(m) + ' begint de brugklas. ' +
      (groep === 8 ? (m >= 3 ? 'Begin je deze week, dan is je kind rond ' + klaarTekst + ' klaar.' : 'In 8 tot 12 weken is je kind klaar, dus begin op tijd.')
                   : 'Dat lijkt ver weg, maar hoe korter een gewoonte bestaat, hoe makkelijker je hem verandert. Begin je deze week, dan is je kind rond ' + klaarTekst + ' klaar.');
    telGC('waarom-groep-' + groep, 'Groep gekozen in Waarom nu');
  }));
  knoppen.forEach(b => b.setAttribute('aria-pressed', 'false'));
})();

/* losse knoppen meten (GoatCounter-gebeurtenis uit data-gc, bv. het blok 'Waarom nu?', sinds 24-10-2026) */
document.querySelectorAll('[data-gc]').forEach(a => a.addEventListener('click', () => telGC(a.dataset.gc, a.textContent.trim())));

/* op een telefoon: "Vraag de gratis proefles aan" gaat naar proefles-aanvragen.html (sinds 12-10-2026).
   Daar staat het formulier "Mail mij de link": de server stuurt één mail; met het vinkje "herinneringen" (sinds 24-10-2026)
   bewaart hij het adres tijdelijk en volgen nog twee mails (dag 2 en dag 5), daarna wist hij het adres. */
(() => {
  const terug = document.getElementById('terug');   // "Terug" gaat naar de vorige pagina als die van deze site komt
  if (terug && document.referrer.indexOf(location.origin) === 0 && history.length > 1) terug.addEventListener('click', e => { e.preventDefault(); history.back(); });
  const mmForm = document.getElementById('mailmij'), mmMail = document.getElementById('mm-mail'), mmStatus = document.getElementById('mm-status');
  if (!mmForm) return;
  const mmMeld = (tekst, soort) => { mmStatus.textContent = tekst; mmStatus.className = 'mm-status ' + (soort || ''); };
  mmForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = mmMail.value.trim(), knop = mmForm.querySelector('button[type=submit]');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { mmMeld('Vul een geldig e-mailadres in.', 'fout'); return; }
    const vink = document.getElementById('mm-herinner'), herinner = !!(vink && vink.checked);   // herinneringen: alleen met vinkje (24-10-2026)
    knop.disabled = true; mmMeld('Even geduld…');
    try {
      const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'linkMail', email, hp: document.getElementById('mm-hp').value, herinnering: herinner }) }).then(r => r.json());
      if (r.ok && r.alVerstuurd) {   // zelfde adres binnen 5 minuten: de server stuurt geen tweede mail (7-11-2026), dus ook niet tellen
        mmMeld('We hebben je de link net al gemaild. Kijk ook even bij Reclame of Spam. Niet gekregen? Over 5 minuten kun je hem opnieuw aanvragen.', 'ok'); mmMail.value = '';
      } else if (r.ok) {
        mmMeld('Verstuurd! Kijk in je mail (soms staat hij bij Reclame of Spam).', 'ok'); mmMail.value = '';
        telGC('link-gemaild', 'Link gemaild');
        if (document.body.classList.contains('home')) telGC('link-gemaild-home', 'Link gemaild vanaf de homepage');   // formulier bovenaan op de telefoon (30-10-2026)
        if (herinner) { telGC('link-gemaild-herinnering', 'Link gemaild met herinneringen'); vink.checked = false; }
      } else {
        mmMeld(r.error === 'druk' ? 'Het is even druk. Probeer het over een paar minuten nog eens.' : 'Dat lukte niet. Controleer je e-mailadres en probeer het nog eens.', 'fout');
      }
    } catch (err) { mmMeld('Geen verbinding. Probeer het nog eens.', 'fout'); }
    knop.disabled = false;
  });
})();

/* homepage: hoe ver lezen bezoekers? Elk stuk telt één keer per bezoek, zodra de bovenkant halverwege het scherm is (alleen totalen) */
(() => {
  if (!document.body.classList.contains('home') || !('IntersectionObserver' in window)) return;
  const wacht = [];
  const tel = (path, title) => {
    if (window.goatcounter && window.goatcounter.count) { telGC(path, title); return; }
    wacht.push([path, title]);
  };
  let pogingen = 0;
  const spoel = setInterval(() => {   // count.js laadt async: wat eerder gezien is, alsnog versturen
    if (window.goatcounter && window.goatcounter.count) { wacht.splice(0).forEach(([p, t]) => tel(p, t)); }
    if (++pogingen > 30) clearInterval(spoel);
  }, 500);
  // .ikonen en .slot: nieuwe homepage (29-10-2026); 1b t/m 1d: de drie nieuwe blokken tussen de bovenkant en 'Wat je als ouder wilt weten'
  const delen = [['.ikonen,.facts', 'scroll-1-voorbij-start'], ['#raceweekend', 'scroll-1b-zo-werkt-het'], ['.wereld', 'scroll-1c-mini-les'],
                 ['#waarom', 'scroll-1d-waarom-nu'], ['#typcheck', 'scroll-1e-typcheck'], ['#meer', 'scroll-2-meer-lezen'], ['#maker', 'scroll-4b-wie-maakt-dit'],
                 ['#prijs', 'scroll-5-prijs'], ['.slot,.cta', 'scroll-7-einde']];
  const io = new IntersectionObserver(items => items.forEach(it => {
    if (!it.isIntersecting) return;
    io.unobserve(it.target);
    tel(it.target.dataset.tel, 'Gelezen tot: ' + it.target.dataset.tel.replace(/^scroll-\w+?-/, ''));
  }), { rootMargin: '0px 0px -50% 0px' });
  delen.forEach(([sel, naam]) => { const el = document.querySelector(sel); if (el) { el.dataset.tel = naam; io.observe(el); } });

  /* Aansluiten op de advertentie (Tim, 1-11-2026, "message match"): wie via een advertentie of post met een thema komt, ziet bovenaan
     de kop en eerste zin die bij die advertentie passen. Thema uit ?b=<thema>, anders een themawoord in ?ref=. Zonder thema verandert
     er niets. Alleen zinnen die ook elders op de site of in marketing/kernboodschap.md staan. Teller: boodschap-<thema>.
     De thema's staan in assets/data/boodschappen.json; de campagne-crew voegt er na Tims "verstuur" nieuwe aan toe
     (campagne.py publiceer-thema). Het bestand wordt alleen opgehaald als er een thema in de link kan staan; tot dan
     houdt de klasse "bh" (inline in index.html) de kop even onzichtbaar, zodat hij niet zichtbaar wisselt. */
  if (!document.body.classList.contains('home')) return;
  const q = new URLSearchParams(location.search), ref = (q.get('ref') || '').toLowerCase();
  // Facebook-advertentie EERSTE50: de video begint met "Kijkt jouw kind nog naar de toetsen?", dus thema "kijken", ook al staat
  // er b=typcheck in de link (Tim, 1-11-2026; de link in de advertentie blijft zo, anders moet Meta hem opnieuw keuren)
  const b = ACTIE.refs.test(ref) && aanbiedingLoopt() ? 'kijken' : (q.get('b') || '').toLowerCase();
  const klaar = () => document.documentElement.classList.remove('bh');
  if (!b && !ref) return klaar();
  fetch('assets/data/boodschappen.json', { cache: 'no-cache' }).then(r => r.json()).then(data => {
    const T = data.themas || {};
    const geldig = k => T[k] && !(T[k].tot && Date.now() >= new Date(T[k].tot + 'T00:00:00+01:00').getTime());
    const thema = geldig(b) ? b : Object.keys(T).find(k => geldig(k) && T[k].woorden && new RegExp(T[k].woorden).test(ref));
    const v = thema && T[thema];
    if (!v) return;
    const [voor, onder] = String(v.kop).split('|');
    const kop = document.createDocumentFragment(); kop.append(voor);
    if (onder) { const s = document.createElement('span'); s.className = 'onderstreep'; s.textContent = onder; kop.append(s); }
    const zet = (sel, f) => document.querySelectorAll(sel).forEach(f);
    zet('.held h1', el => { el.replaceChildren(kop.cloneNode(true)); });     // laptop: de gewone bovenkant
    zet('.held .lead-lang, .held .lead-kort', el => { el.textContent = v.zin; });
    if (v.knop) zet('.held .btn.desk-only', el => { el.textContent = v.knop; });
    zet('.ts-kop', el => { el.textContent = String(v.kop).replace('|', ''); });   // telefoon: het mailformulier bovenaan
    zet('.ts-intro', el => { el.textContent = v.zin; });
    document.body.dataset.boodschap = thema;
    tel('boodschap-' + thema, 'Boodschap bij advertentie: ' + thema);
  }).catch(() => {}).finally(klaar);
})();

/* telefoon: de echte opname van de race bovenaan. Alleen op telefoons (desktop laadt niets),
   niet bij 'minder beweging' of databesparing; speelt alleen als hij in beeld is */
(() => {
  const vak = document.querySelector('.tv-scherm');
  if (!vak || !matchMedia('(pointer:coarse) and (max-width:820px)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData)) return;
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true;
  ['muted', 'loop', 'playsinline', 'autoplay'].forEach(a => v.setAttribute(a, ''));
  v.setAttribute('aria-hidden', 'true'); v.preload = 'auto';
  v.poster = 'assets/video/race_poster.webp';
  v.src = 'assets/video/race.mp4';
  vak.insertBefore(v, vak.querySelector('.speel'));
  const speel = () => { const p = v.play(); if (p && p.catch) p.then(() => vak.classList.remove('stil')).catch(() => vak.classList.add('stil')); };
  vak.querySelector('.speel').addEventListener('click', speel);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([it]) => { if (it.isIntersecting) speel(); else v.pause(); }, { threshold: .25 }).observe(vak);
  } else speel();
})();

/* vaste knop op mobiel, pas na de bovenkant */
(() => {
  const sticky = document.getElementById('sticky');
  if (!sticky) return;
  const vanaf = document.body.classList.contains('home') ? 560 : 320;
  const onScroll = () => sticky.classList.toggle('on', window.scrollY > vanaf && window.scrollY < document.body.scrollHeight - window.innerHeight - 500);
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* stem van Flits */
(() => {
  const btn = document.getElementById('play'), txt = document.getElementById('play-txt'), ic = document.getElementById('play-ic');
  if (!btn) return;
  let audio = null;
  const PLAY = '<polygon points="7 4 20 12 7 20 7 4"/>', STOP = '<rect x="6" y="6" width="12" height="12" rx="1"/>';
  const reset = () => { ic.innerHTML = PLAY; txt.textContent = 'Luister naar Flits bij les 1'; };
  btn.addEventListener('click', () => {
    if (audio && !audio.paused) { audio.pause(); audio.currentTime = 0; reset(); return; }
    audio = audio || new Audio('assets/audio/stem/intro_1.mp3');
    audio.onended = reset;
    audio.play().then(() => { ic.innerHTML = STOP; txt.textContent = 'Stoppen'; }).catch(reset);
  });
})();

/* probeer-het-zelf */
(() => {
  const line = document.getElementById('demo-line');
  if (!line) return;
  const words = 'jas kaas dak sla';
  const box = document.getElementById('demo'), sink = document.getElementById('demo-sink');
  const hint = document.getElementById('demo-hint'), done = document.getElementById('demo-done');
  let pos = 0; const spans = [];
  [...words].forEach(ch => { const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; line.appendChild(s); spans.push(s); });
  spans[0].classList.add('cur');
  const finger = { a: 'linker pink', s: 'linker ringvinger', d: 'linker middelvinger', f: 'linker wijsvinger', j: 'rechter wijsvinger', k: 'rechter middelvinger', l: 'rechter ringvinger', ' ': 'duim' };
  const setHint = () => { const c = words[pos]; hint.textContent = c === ' ' ? 'Spatie met je duim' : c.toUpperCase() + ' met je ' + finger[c]; };
  const focus = () => { sink.focus({ preventScroll: true }); box.classList.add('on'); setHint(); };
  box.addEventListener('mousedown', e => { if (!e.target.closest('a')) { e.preventDefault(); focus(); } });
  box.addEventListener('focus', focus);
  sink.addEventListener('blur', () => box.classList.remove('on'));
  sink.addEventListener('input', () => {
    const v = sink.value; sink.value = '';
    for (const ch of v) {
      if (pos >= words.length) return;
      const s = spans[pos];
      if (ch === words[pos]) {
        s.classList.remove('cur', 'bad'); s.classList.add('ok'); pos++;
        if (pos >= words.length) { hint.hidden = true; done.hidden = false; sink.blur(); return; }
        spans[pos].classList.add('cur'); setHint();
      } else { s.classList.remove('bad'); void s.offsetWidth; s.classList.add('bad'); }
    }
  });
})();
