// Boot and tab navigation.
import { $ } from './ui.js';
import { data, onChange } from './state.js';
import { initSolve, pause as pauseSolve, resume as resumeSolve } from './solve.js';
import { initGame, showGame, hideGame, refreshSkin } from './game.js';
import { initAcademy, showAcademy } from './academy.js';
import { initShop, renderShop } from './shop.js';
import { initStore } from './store.js';
import { initAds, banner } from './ads.js';

const TABS = ['solve', 'play', 'learn', 'shop'];
let current = 'solve';

function go(tab) {
  if (!TABS.includes(tab)) tab = 'solve';
  if (current === 'solve' && tab !== 'solve') pauseSolve();
  if (current === 'play' && tab !== 'play') hideGame();
  current = tab;
  TABS.forEach(t => {
    $('tab-' + t).hidden = t !== tab;
    const b = $('tb-' + t); if (t === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  banner(false);
  if (tab === 'solve') resumeSolve();
  if (tab === 'play') showGame();
  if (tab === 'learn') showAcademy();
  if (tab === 'shop') renderShop();
  try { history.replaceState(null, '', '#' + tab); } catch (e) { /* sandboxed */ }
  window.scrollTo({ top: 0 });
}

function renderCoins() { $('coinCount').textContent = data.coins.toLocaleString(); $('proBadge').hidden = !data.pro; }

TABS.forEach(t => $('tb-' + t).onclick = () => go(t));
$('coinChip').onclick = () => go('shop');
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
onChange(() => { renderCoins(); refreshSkin(); });
renderCoins();
const topBar = document.querySelector('header.top');
const markScrolled = () => topBar.classList.toggle('scrolled', window.scrollY > 4);
window.addEventListener('scroll', markScrolled, { passive: true }); markScrolled();
initSolve(); initGame(); initAcademy(); initShop();
go((location.hash || '').slice(1) || 'solve');
initStore().then(renderCoins);
initAds();
