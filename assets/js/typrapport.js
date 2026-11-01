/* Flitsvingers – typrapport na de typ-check (sinds 1-11-2026; Tims keuze: variant A "het briefje", zonder markeerstift).
   Tekent het toetsenbord en het ritme als SVG en schrijft het plan van Flits met vaste regels uit de meetgegevens,
   zodat het rapport ook werkt zonder AI (het API-tegoed verloopt). Teksten zonder hij/zij: we weten het geslacht niet.
   Gebruik: FVRapport.toon(element, typcheck, { naam, les, vinger, norm, opKijk }) — typcheck komt uit app.js (S.typcheck). */
window.FVRapport = (() => {
  'use strict';
  const RIJEN = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const STAP = 60, K = 52, XOFF = [0, 15, 45];
  const ZOEK = 1200, TWIJFEL = 600;   // ms: langer dan ZOEK = zoekt, vanaf TWIJFEL = twijfelt
  const H = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sec = ms => (ms / 1000).toFixed(1).replace('.', ',');
  const TEL = ['geen', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];
  const tw = n => TEL[n] || String(n);
  const lijst = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' en ' + a[a.length - 1];
  const U = c => c.toUpperCase();

  function soort(l) {
    if (!l || !l.n || !l.mn) return 'leeg';
    if (l.ms > ZOEK) return l.mn >= 2 ? 'zoekt' : 'twijfel';   // één meting is te weinig om "zoekt" te zeggen
    return l.ms >= TWIJFEL ? 'twijfel' : 'vlot';
  }
  function plek(c) {
    for (let r = 0; r < 3; r++) {
      const i = RIJEN[r].indexOf(c);
      if (i >= 0) { const x = XOFF[r] + i * STAP, y = r * STAP; return { r, x, y, cx: x + K / 2, cy: y + K / 2 }; }
    }
    return null;
  }
  /* hand getekende lus om een letter: iets scheef, en net voorbij het beginpunt (de c en de lettergrootte bepalen de vorm een beetje) */
  function lus(c) {
    const p = plek(c), rx = K * .62, ry = K * .58, f = c.charCodeAt(0) % 5 * .3;
    let d = '';
    for (let t = -0.5 - f; t <= Math.PI * 2 + 0.35 - f; t += 0.12) {
      const k = 1 + 0.05 * Math.sin(2.3 * t + 1 + f) + (t > Math.PI * 2 - 0.4 - f ? 0.07 : 0);
      d += (d ? ' L' : 'M') + (p.cx + rx * k * Math.cos(t)).toFixed(1) + ' ' + (p.cy + 2 + ry * k * Math.sin(t)).toFixed(1);
    }
    return '<path class="lus" d="' + d + '"/>';
  }
  /* golflijntje onder een letter waar het kind over twijfelt */
  function golf(cx, y) {
    let d = 'M' + (cx - 14) + ' ' + y;
    for (let i = 0; i < 4; i++) d += ' q3.5 ' + (i % 2 ? 4 : -4) + ' 7 0';
    return '<path class="golf" d="' + d + '"/>';
  }
  /* boogje tussen twee toetsen die door elkaar gaan: boven de bovenste rij of onder de onderste rij */
  function boog(a, b) {
    const A = plek(a), B = plek(b), onder = A.r === 2, h = 34;
    const y0 = onder ? A.y + K + 6 : A.y - 6, ym = onder ? y0 + h : y0 - h, mx = (A.cx + B.cx) / 2;
    const pijl = (x, y) => 'M' + (x - 6) + ' ' + (y + (onder ? 9 : -9)) + ' L' + x + ' ' + y + ' L' + (x + 6) + ' ' + (y + (onder ? 9 : -9));
    return '<path class="boog" d="M' + A.cx + ' ' + y0 + ' Q' + mx + ' ' + ym + ' ' + B.cx + ' ' + y0 + '"/><path class="boog" d="' + pijl(A.cx, y0) + ' ' + pijl(B.cx, y0) + '"/>' +
      '<text class="boog-label" x="' + mx + '" y="' + (onder ? ym + 4 : ym - 6) + '" text-anchor="middle">door elkaar</text>';
  }
  /* zonder blokken (Tim, 1-11-2026): geen vakjes per toets, alleen de letters op hun plek. Zoekt = oranje lus, twijfelt = golflijntje */
  function toetsenbord(l, extra) {
    let s = '<svg class="kb-svg" viewBox="-6 -54 604 300" role="img" aria-label="Toetsenbord: hoe lang over elke toets werd gedaan">';
    RIJEN.forEach(rij => [...rij].forEach(c => {
      const { x, y, cx } = plek(c), st = soort(l[c]);
      s += '<g class="t ' + st + '" data-c="' + c + '"><rect class="hit" x="' + x + '" y="' + y + '" width="' + K + '" height="' + K + '"/>' +
        (st === 'zoekt' ? lus(c) : '') + (st === 'twijfel' ? golf(cx, y + 36) : '') +
        '<text class="l" x="' + cx + '" y="' + (y + 30) + '" text-anchor="middle">' + U(c) + '</text>' +
        (st === 'zoekt' || st === 'twijfel' ? '<text class="s" x="' + cx + '" y="' + (y + 50) + '" text-anchor="middle">' + sec(l[c].ms) + ' s</text>' : '') + '</g>';
    }));
    s += '<line class="spatie" x1="150" y1="198" x2="320" y2="198"/>';
    return s + extra + '</svg>';
  }
  function ritme(zin) {
    const n = zin.t.length, stap = 600 / n, hoog = 150, max = 2000;
    let s = '<svg class="rit-svg" viewBox="-40 -14 640 190" role="img" aria-label="Tijd per toets in één zin">';
    s += '<line class="lijn" x1="-6" x2="600" y1="' + hoog / 2 + '" y2="' + hoog / 2 + '"/><text class="lijn-label" x="-10" y="' + (hoog / 2 + 5) + '" text-anchor="end">1 s</text>';
    [...zin.t].forEach((c, i) => {
      const ms = zin.ms[i] || 0, h = Math.min(hoog, ms / max * hoog), x = i * stap + 2;
      const begin = c !== ' ' && (i === 0 || zin.t[i - 1] === ' ');
      s += '<rect class="balk' + (begin ? ' begin' : '') + (c === ' ' ? ' spatie' : '') + '" x="' + x.toFixed(1) + '" y="' + (hoog - h).toFixed(1) + '" width="' + Math.max(1, stap - 4).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3"/>';
      s += '<text class="letter" x="' + (x + stap / 2 - 2).toFixed(1) + '" y="' + (hoog + 20) + '" text-anchor="middle">' + (c === ' ' ? '·' : H(c)) + '</text>';
    });
    return s + '<line class="basis" x1="0" x2="600" y1="' + hoog + '" y2="' + hoog + '"/></svg>';
  }

  /* paren die door elkaar gaan (doel+getypt), sterkste eerst; a-b en b-a tellen samen */
  function paren(w) {
    const m = {};
    Object.entries(w || {}).forEach(([k, n]) => {
      const [a, b] = k; if (!/[a-z]/.test(a) || !/[a-z]/.test(b)) return;
      const key = [a, b].sort().join(''); m[key] = (m[key] || 0) + n;
    });
    return Object.entries(m).filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ a: k[0], b: k[1], n }));
  }

  function html(tc, o) {
    const naam = H(o.naam || 'Je kind'), l = tc.l || {}, les = o.les || {}, vinger = o.vinger || (() => 'vinger');
    const letters = Object.keys(l).filter(c => /^[a-z]$/.test(c));
    const zoek = letters.filter(c => soort(l[c]) === 'zoekt').sort((a, b) => l[b].ms - l[a].ms);
    const traagst = letters.filter(c => soort(l[c]) !== 'leeg').sort((a, b) => l[b].ms - l[a].ms)[0];
    const pr = paren(tc.w).slice(0, 2);
    const ratio = tc.iw && tc.wsn >= 3 && tc.iwn >= 10 ? tc.ws / tc.iw : 0;
    const stotter = ratio >= 2;
    const k = zoek.length, vlot = tc.apm >= 60;

    let kop;
    if (k && vlot) kop = naam + ' typt al vlot, maar zoekt bij ' + tw(k) + ' letter' + (k === 1 ? '' : 's') + ' de toets.';
    else if (k) kop = naam + ' zoekt nog bij ' + tw(k) + ' letter' + (k === 1 ? '' : 's') + ' de toets.';
    else if (tc.fout > 5) kop = naam + ' typt vlot, maar maakt nog veel fouten.';
    else kop = naam + ' vindt de toetsen al goed. Nu nog zonder te kijken.';

    const duur = tc.sec >= 115 ? 'twee minuten' : (tc.sec >= 60 ? '1 minuut en ' + Math.round(tc.sec - 60) + ' seconden' : Math.round(tc.sec) + ' seconden');
    let t = '<div class="tr-vel">' +
      '<div class="tr-kopregel"><img src="assets/img/flits_logo.webp" alt=""><span class="tr-merk">Flitsvingers</span><span class="tr-sp"></span><span>Typ-check van ' + naam + ' · ' + H(o.datum || '') + '</span></div>' +
      '<h1>' + kop + '</h1>' +
      '<p>' + naam + ' typte ' + duur + ' op de eigen manier, nog zonder les. Dat was <b>' + tc.apm + ' aanslagen per minuut</b> met <b>' + String(tc.fout).replace('.', ',') + '% fouten</b>. ' +
      'Voor het diploma is dat straks ' + (o.norm || 100) + ' aanslagen, blind, met hooguit 3% fouten.</p>';
    if (stotter) t += '<p>Binnen een woord gaat het snel. Maar aan het begin van elk woord zoekt ' + naam + ' eerst de toets.</p>';
    else if (ratio && ratio < 1.5) t += '<p>Het tempo is mooi gelijkmatig: ook aan het begin van een woord gaat het vlot.</p>';

    /* 1: toetsenbord */
    let extra = '';
    pr.forEach(p => { const A = plek(p.a), B = plek(p.b); if (A && B && A.r === B.r && A.r !== 1 && Math.abs(A.x - B.x) <= STAP * 2) extra += boog(A.x < B.x ? p.a : p.b, A.x < B.x ? p.b : p.a); });
    t += '<h2><span class="tr-nr">1</span>Waar zoekt ' + naam + '?</h2>' +
      '<p>Om de letters waar ' + naam + ' het langst naar zocht, staat een oranje lus. Tik op een letter voor meer.</p>' +
      '<div class="tr-kb">' + toetsenbord(l, extra) + '</div>' +
      '<p class="tr-sleutel">Oranje lus: zoekt, meer dan 1,2 seconde per keer. Golflijntje: twijfelt, 0,6 tot 1,2 seconde. Zonder teken: vlot.' + (letters.length < 26 ? ' Grijs: kwam niet voor.' : '') + '</p>' +
      '<p class="tr-detail" id="tr-detail">' + (traagst ? 'De <b>' + U(traagst) + '</b> duurde het langst: ' + sec(l[traagst].ms) + ' seconde per keer.' : '') +
      (pr.length ? ' Vaak door elkaar: ' + pr.map(p => 'de ' + U(p.a) + ' en de ' + U(p.b)).join(', en ') + '.' : '') + '</p>';

    /* 2: ritme van één zin */
    if (tc.zin && tc.zin.t && tc.zin.t.split(' ').length >= 3 && tc.ws && tc.iw) {
      t += '<h2><span class="tr-nr">2</span>Het ritme van één zin</h2>' +
        '<p>Elke streep is één toets. Hoe hoger, hoe langer ' + naam + ' nadacht. De oranje strepen zijn steeds de eerste letter van een nieuw woord: <b>' + sec(tc.ws) + ' seconde</b>, tegen <b>' + sec(tc.iw) + ' seconde</b> midden in een woord.</p>' +
        '<div class="tr-rit">' + ritme(tc.zin) + '</div>' +
        (stotter ? '<p>Zo\'n patroon past bij kinderen die na elk woord even naar het toetsenbord kijken. Zeker weten doe je het pas als je meekijkt.</p>' : '');
    }

    /* 3: plan van Flits (vaste regels; elke stap hoort bij de les waarin die letters aan de beurt zijn) */
    const nr = tc.zin && tc.ws ? 3 : 2;
    const stappen = [['Les 1 tot 3', 'De thuisrij. Elke les heeft een rondje in de tunnel, waar het toetsenbord van het scherm verdwijnt. Zo leert ' + naam + ' de toetsen voelen in plaats van zoeken.']];
    pr.forEach(p => {
      const fa = vinger(p.a), fb = vinger(p.b), l2 = Math.max(les[p.a] || 1, les[p.b] || 1);
      stappen.push([l2, 0, 'De ' + U(p.a) + ' en de ' + U(p.b) + ' gaan nu vaak door elkaar' + (fa === fb ? ': allebei toetsen voor de ' + fa + '.' : '. De ' + U(p.a) + ' is voor de ' + fa + ', de ' + U(p.b) + ' voor de ' + fb + '.') +
        ' Dan komen er extra woorden waarin ze vlak na elkaar staan.']);
    });
    if (zoek.length) {
      const ls = zoek.map(c => les[c] || 1), van = Math.min(...ls), tot = Math.max(...ls);
      stappen.push([van, tot, 'De zoekletters ' + lijst(zoek.map(U)) + ' krijgen ' + (zoek.length === 1 ? 'een' : 'elk een') + ' extra blind-rondje.']);
    }
    let regels = stappen.map(s => typeof s[0] === 'string' ? s : [s[1] && s[1] !== s[0] ? 'Les ' + s[0] + ' tot ' + s[1] : 'Les ' + s[0], s[2]]);
    regels = [regels[0], ...regels.slice(1).sort((a, b) => parseInt(a[0].slice(4), 10) - parseInt(b[0].slice(4), 10))];
    if (stotter) regels.push(['In de races', 'Doortypen ná de spatie, zonder het volgende woord op te zoeken.']);
    if (tc.fout > 5) regels.push(['Elke training', 'Netjes gaat voor snel: liever een fout minder dan een seconde sneller.']);
    t += '<h2><span class="tr-nr">' + nr + '</span>Wat Flits gaat doen</h2>' +
      '<p>' + (vlot ? naam + ' heeft al een flink tempo, zonder één les. Knap!' : 'Mooi begin: ' + naam + ' kent het toetsenbord al een beetje.') +
      (k || stotter ? ' Ik ga vooral werken aan het zoeken.' : tc.fout > 5 ? ' Ik ga vooral werken aan netjes typen.' : ' Ik ga vooral werken aan typen zonder te kijken.') + '</p>' +
      '<ol class="tr-plan">' + regels.map(([w, x]) => '<li><span class="tr-wanneer">' + H(w) + '</span><span>' + x + '</span></li>').join('') + '</ol>' +
      (tc.apm >= 40 ? '<p><b>Eerlijk vooraf:</b> de eerste weken typt ' + naam + ' langzamer dan nu. Een nieuwe manier leren kost even tijd. Daarna gaat het tempo weer omhoog, en dan zonder te kijken.</p>' : '') +
      '<div class="tr-groet"><img src="assets/img/flits_logo.webp" alt=""><span>Flits</span></div>';

    /* 4: de nieuwe meting na les 3 (als die er is) */
    const na = tc.na3 ? naLes3(tc, naam) : '';
    if (na) t += '<h2><span class="tr-nr">' + (nr + 1) + '</span>Na les ' + tc.na3.les + ': zo gaat het nu</h2>' + na;

    /* 5: meekijken (tot de meting na les 3; daarna zegt de tunnelscore genoeg) */
    const kk = { scherm: 'Naar het scherm', handen: 'Naar de handen', allebei: 'Allebei' };
    if (!na) t += '<h2><span class="tr-nr">' + (nr + 1) + '</span>Kijk zelf even mee</h2>' +
      '<p>Kijk tijdens les ' + Math.min(3, Math.max(1, o.volgende || 1)) + ' tien tellen mee. Waar gaan de ogen van ' + naam + ' heen tijdens het typen?</p>' +
      '<div class="tr-kies">' + Object.entries(kk).map(([v, x]) => '<button type="button" data-kijk="' + v + '"' + (tc.kijkt === v ? ' class="aan"' : '') + '>' + x + '</button>').join('') + '</div>' +
      '<p class="tr-antwoord" id="tr-antwoord">' + (tc.kijkt ? antwoord(tc.kijkt, naam, o.volgende) : '') + '</p>' +
      '<p>Na les 3 meet Flits opnieuw. Dan zie je op deze plek of ' + naam + ' minder zoekt.</p>';
    t +=
      '<p class="tr-klein">Zo meten we: alleen welke toets ' + naam + ' indrukt en hoeveel tijd er tussen twee toetsen zit. Bij de tijd per letter tellen we de pauze aan het begin van een woord niet mee. "Zoekt" betekent dat ' + naam + ' langer over een toets deed dan gemiddeld. ' +
      'Dat kan door kijken komen, maar ook door nadenken over de spelling.</p></div>';
    return t;
  }
  /* vergelijking typ-check -> lessen 1 t/m 3, per letter die het kind nu kent */
  function naLes3(tc, naam) {
    const n3 = tc.na3, l = tc.l || {}, volg = 'qwertyuiopasdfghjklzxcvbnm';
    const letters = Object.keys(n3.l).filter(c => l[c] && l[c].mn && l[c].n).sort((a, b) => volg.indexOf(a) - volg.indexOf(b));
    if (!letters.length) return '';
    const gem = a => a.reduce((x, y) => x + y, 0) / a.length, pct = x => String(Math.round(x * 10) / 10).replace('.', ',') + '%';
    const voorMs = gem(letters.map(c => l[c].ms)), nuMs = gem(letters.map(c => n3.l[c].ms));
    const voorF = gem(letters.map(c => l[c].f / l[c].n * 100)), nuF = gem(letters.map(c => n3.l[c].fout));
    let t = '<p>Flits heeft in les 1 tot ' + n3.les + ' elke toets meegemeten, met de letters die ' + naam + ' nu kent (' + lijst(letters.map(U)) + '). ';
    t += nuMs < voorMs * .85 ? naam + ' zoekt minder dan bij de typ-check: gemiddeld <b>' + sec(nuMs) + ' seconde</b> per toets, toen <b>' + sec(voorMs) + ' seconde</b>.'
      : nuMs > voorMs * 1.15 ? 'Per toets gaat het nu nog wat langzamer (<b>' + sec(nuMs) + '</b> tegen <b>' + sec(voorMs) + ' seconde</b>). Dat hoort bij een nieuwe manier leren.'
      : 'Per toets gaat het ongeveer even snel als bij de typ-check (<b>' + sec(nuMs) + ' seconde</b>), maar nu op de nieuwe manier.';
    t += ' Fouten: <b>' + pct(nuF) + '</b>, bij de typ-check <b>' + pct(voorF) + '</b>.</p>';
    t += '<div class="tr-na3">' + letters.map(c => '<span class="tr-l">' + U(c) + '</span><span>' + sec(l[c].ms) + ' s → ' + sec(n3.l[c].ms) + ' s</span><span>' + pct(l[c].f / l[c].n * 100) + ' → ' + pct(n3.l[c].fout) + ' fout</span>').join('') + '</div>';
    if (n3.blind != null) t += '<p>In de tunnel, waar het toetsenbord van het scherm verdwijnt, was <b>' + n3.blind + '%</b> van de aanslagen goed.</p>';
    return t + '<p class="tr-klein" style="margin-top:8px;padding-top:0;border:0">In de gewone oefeningen ziet ' + naam + ' welke toets er komt; in de tunnel niet. De tunnelscore zegt dus het meest over blind typen.</p>';
  }
  function antwoord(v, naam, volgende) {
    if (v === 'scherm') return 'Mooi. Dan oefent Flits vooral op tempo en de zoekletters.';
    const les = [2, 3].filter(x => x >= (volgende || 1));   // alleen lessen die nog komen (zie extrasVoor in app.js)
    return les.length ? 'Dank je. Dan krijgt ' + naam + ' in les ' + les.join(' en ') + ' een extra blind-rondje in de tunnel.' : 'Dank je. Flits let er in de tunnel extra op.';
  }

  function toon(el, tc, o) {
    el.innerHTML = html(tc, o);
    const det = el.querySelector('#tr-detail'), l = tc.l || {}, naam = H(o.naam || 'Je kind');
    el.querySelectorAll('g.t[data-c]').forEach(g => g.addEventListener('click', () => {
      el.querySelectorAll('g.t.gekozen').forEach(x => x.classList.remove('gekozen'));
      g.classList.add('gekozen');
      const c = g.dataset.c, x = l[c], st = soort(x);
      if (st === 'leeg') { det.innerHTML = 'De <b>' + U(c) + '</b> kwam in de typ-check niet voor.'; return; }
      const vaak = Object.entries(tc.w || {}).filter(([kk]) => kk[0] === c).sort((a, b) => b[1] - a[1])[0];
      det.innerHTML = '<b>' + U(c) + '</b>: ' + (st === 'zoekt' ? 'zoekt' : st === 'twijfel' ? 'twijfelt' : 'vlot') + ', gemiddeld ' + sec(x.ms) + ' seconde per keer (' + x.n + ' keer getypt)' +
        (x.f ? ', ' + x.f + ' keer eerst een andere toets' + (vaak ? ', meestal de ' + U(vaak[0][1]) : '') : '') +
        '. Hoort bij de ' + H((o.vinger || (() => 'vinger'))(c)) + (o.les && o.les[c] ? ' en komt aan de beurt in les ' + o.les[c] : '') + '.';
    }));
    el.querySelectorAll('[data-kijk]').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('[data-kijk]').forEach(x => x.classList.toggle('aan', x === b));
      el.querySelector('#tr-antwoord').textContent = antwoord(b.dataset.kijk, o.naam || 'je kind', o.volgende);
      if (o.opKijk) o.opKijk(b.dataset.kijk);
    }));
  }
  return { toon, html, soort };
})();
