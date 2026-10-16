// Small shared UI helpers.
export const $ = id => document.getElementById(id);
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : String(kid));
  return e;
}
export const COLOR_HEX = { white: '#f3f4ef', yellow: '#ffd21f', red: '#d3263a', orange: '#ff7a1a', blue: '#1f5fd6', green: '#16a34a' };
export const sw = (color, cls = 'sw') => h('span', { class: cls, style: `background:${COLOR_HEX[color] || color || 'var(--c-none)'}` });
export const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const fmtTime = ms => { if (ms == null) return '–'; const s = ms / 1000; return s < 60 ? s.toFixed(2) : `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`; };

const PART = { R: 'right side', L: 'left side', U: 'top layer', D: 'bottom layer', F: 'front face', B: 'back face' };
const SIDE = { R: 'right', L: 'left', U: 'top', D: 'bottom', F: 'front', B: 'back' };
const DIR = {
  U: ['to the left', 'to the right'], D: ['to the right', 'to the left'],
  R: ['up, away from you', 'down, toward you'], L: ['down, toward you', 'up, away from you'],
  F: ['clockwise', 'counterclockwise'], B: ['counterclockwise as seen from the front', 'clockwise as seen from the front'],
};
const ORD = ['', 'first', 'second', 'third', 'fourth'];
// Plain-language text for a move token. colorOf(faceLetter) optionally names the center color.
export function describeMove(tok, colorOf) {
  const m = /^(\d+)?([URFDLBMESxyz])(w)?(2'|2|')?$/.exec(tok);
  if (!m) return { action: tok, note: '' };
  const [, num, letter, wide, suf] = m;
  const prime = suf === "'", twice = suf && suf.startsWith('2');
  if ('xyz'.includes(letter)) {
    const t = { x: ['Tilt the whole cube so the front goes up', 'Tilt the whole cube so the front goes down'], y: ['Turn the whole cube so the front goes to the left', 'Turn the whole cube so the front goes to the right'], z: ['Roll the whole cube clockwise', 'Roll the whole cube counterclockwise'] }[letter];
    const half = { x: 'Flip the whole cube over, front over the top (a half turn).', y: 'Turn the whole cube around to face the back (a half turn).', z: 'Roll the whole cube upside down, keeping the front in front (a half turn).' }[letter];
    return { action: twice ? half : (prime ? t[1] : t[0]) + '.', note: 'Whole-cube rotation: no layer moves relative to the others.' };
  }
  let face = letter, part;
  if ('MES'.includes(letter)) { face = { M: 'L', E: 'D', S: 'F' }[letter]; part = 'middle layer'; }
  else if (wide) part = `${SIDE[face]} ${num ? num : 'two'} layers together`;
  else if (num && +num > 1) part = `${ORD[+num] || num + 'th'} layer from the ${SIDE[face]} (only that layer)`;
  else part = PART[face];
  const dir = DIR[face][prime ? 1 : 0];
  const action = twice ? `Turn the ${part} twice (a half turn, either direction).` : `Turn the ${part} ${dir}.`;
  const c = colorOf && !num && !wide && !'MES'.includes(letter) ? colorOf(face) : null;
  return { action, note: c ? `The ${PART[face]} has the ${c} center.` : '', color: c };
}

// Modal sheet. Resolves true/false. buttons: [{label, value, primary}]
export function sheet(title, bodyNodes, buttons) {
  return new Promise(res => {
    const root = $('sheet');
    root.innerHTML = '';
    const close = v => { root.hidden = true; root.innerHTML = ''; res(v); };
    const card = h('div', { class: 'sheet-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h2', {}, title), ...[].concat(bodyNodes),
      h('div', { class: 'row' }, buttons.map(b => h('button', { class: 'btn grow' + (b.primary ? ' primary' : ''), onclick: () => close(b.value) }, b.label))));
    root.append(h('div', { class: 'sheet-backdrop', onclick: () => close(false) }), card);
    root.hidden = false;
    card.querySelector('button.primary, button')?.focus();
  });
}
