/* Flitsvingers: gedeeld script voor alle sitepagina's (homepage, hoe-het-werkt, voor-ouders, prijs, vragen).
   Elk onderdeel draait alleen als het op de pagina staat. Sinds 12-10-2026 (opgesplitst uit index.html). */

/* Instellingen: de Stripe-betaallink van €49. Leeg = knop toont "De verkoop start binnenkort". */
const BETAAL_URL = 'https://buy.stripe.com/aFa5kC6bweSc1Np8Y51wY01';
const API_URL = 'https://script.google.com/macros/s/AKfycbycENGI2KDXQ3h3RY18VuHf2OJqUb3tOQLntwotXfBFQfLvYowDPKpwLaDtOiopKdM/exec';
const telGC = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true }); } catch (e) {} };

/* oude links naar stukken van de homepage (bv. flitsvingers.nl/#vragen) gaan naar de nieuwe pagina's */
(() => {
  if (!document.body.classList.contains('home')) return;
  const naar = { '#hoe': 'hoe-het-werkt.html', '#probeer': 'hoe-het-werkt.html#probeer', '#ouders': 'voor-ouders.html',
                 '#diploma': 'voor-ouders.html#diploma', '#vragen': 'vragen.html', '#mailmij': 'proefles-aanvragen.html' };
  if (naar[location.hash]) location.replace(naar[location.hash]);
})();

/* koopknop (GoatCounter: 'koopknop') */
(() => {
  const modal = document.getElementById('modal');
  document.querySelectorAll('#koop,[data-koop]').forEach(b => b.addEventListener('click', () => {
    telGC(b.dataset.koop || 'koopknop', 'Klik op kopen');
    if (BETAAL_URL) { setTimeout(() => { location.href = BETAAL_URL; }, 200); return; }
    if (modal) modal.hidden = false;
  }));
  if (!modal) return;
  const dicht = document.getElementById('modal-close');
  if (dicht) dicht.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.hidden = true; });
})();

/* op een telefoon: "Vraag de gratis proefles aan" gaat naar proefles-aanvragen.html (sinds 12-10-2026).
   Daar staat het formulier "Mail mij de link" (de server stuurt één mail; het adres wordt niet opgeslagen). */
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
    knop.disabled = true; mmMeld('Even geduld…');
    try {
      const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'linkMail', email, hp: document.getElementById('mm-hp').value }) }).then(r => r.json());
      if (r.ok) {
        mmMeld('Verstuurd! Kijk in je mail (soms staat hij bij Reclame of Spam).', 'ok'); mmMail.value = '';
        telGC('link-gemaild', 'Link gemaild');
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
  const delen = [['.facts', 'scroll-1-voorbij-start'], ['#meer', 'scroll-2-meer-lezen'], ['#maker', 'scroll-4b-wie-maakt-dit'],
                 ['#prijs', 'scroll-5-prijs'], ['.cta', 'scroll-7-einde']];
  const io = new IntersectionObserver(items => items.forEach(it => {
    if (!it.isIntersecting) return;
    io.unobserve(it.target);
    tel(it.target.dataset.tel, 'Gelezen tot: ' + it.target.dataset.tel.replace(/^scroll-\w+?-/, ''));
  }), { rootMargin: '0px 0px -50% 0px' });
  delen.forEach(([sel, naam]) => { const el = document.querySelector(sel); if (el) { el.dataset.tel = naam; io.observe(el); } });
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
