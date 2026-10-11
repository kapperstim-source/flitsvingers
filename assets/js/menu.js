/* Menu: de knop met drie streepjes opent en sluit de lijst; sluit ook na een klik op een link, met Escape of bij een tik buiten het menu */
(() => {
  const knop = document.querySelector('.menu-knop'), menu = document.getElementById('menu');
  if (!knop || !menu) return;
  const zet = open => {
    knop.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (open) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'menu-geopend', title: 'Menu geopend', event: true }); } catch (e) {} }
  };
  knop.addEventListener('click', e => { e.stopPropagation(); zet(menu.hidden); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) zet(false); });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('nav')) zet(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { zet(false); knop.focus(); } });
})();
