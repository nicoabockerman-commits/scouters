// Jaetut käyttöliittymäpalat. Sama korttipohja molemmille osapuolille:
// osaajan ja tekijää etsivän kortti rakennetaan samalla koodilla.
import { catOf } from './model.js';

export const $ = s => document.querySelector(s);
export const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const firstName = u => (u.kind === 'person' ? String(u.name || '').split(' ')[0] : u.name) || 'Käyttäjä';

export const I = {
  logo: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="#FF7A1A"/><path d="M16 1.5v7M16 23.5v7M1.5 16h7M23.5 16h7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M2.5 7v10M21.5 7v10"/></svg>',
  heartO: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.4A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M4 9l1.5-5h13L20 9M4 9h16M5 9v11h14V9M9.5 20v-5.5h5V20"/></svg>',
  grad: '<svg viewBox="0 0 24 24"><path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3v-5"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.2-8.5-11.4A4.8 4.8 0 0 1 12 6.8a4.8 4.8 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M3.5 11.5L20.5 4l-6.5 16.5-2.6-6.4z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5 11-11"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6"/></svg>'
};
export const ic = (name, fill) => I[name].replace('<svg ', `<svg class="ic${fill ? ' fill' : ''}" aria-hidden="true" `);

export const av = (name, color, size = 44, photo = null) =>
  `<span class="av" style="--c:${color};--s:${size}px" aria-hidden="true">${photo ? `<img src="${esc(photo)}" alt="">` : esc(initials(name))}</span>`;

let toastTimer;
export function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

export const where = u => (u.remote ? `${u.city || 'Sijainti'}, myös etänä` : (u.city || 'Sijainti'));
export const moneyLine = u => u.role === 'provider' ? `alk. ${u.price} €` : `Budjetti ${u.price} €`;
export const kindLine = u => {
  if (u.role === 'provider') {
    return u.kind === 'company'
      ? [u.team ? `${u.team} tekijää` : 'Palveluyritys', u.founded].filter(Boolean).join(', ')
      : [u.school, u.program].filter(Boolean).join(', ') || 'Osaaja';
  }
  return [u.kind === 'business' ? 'Yritys' : 'Yksityishenkilö', u.industry].filter(Boolean).join(', ');
};
export const headline = u => u.role === 'provider'
  ? (u.about || 'Osaaja Scoutersissa')
  : (u.need || u.about || 'Etsii tekijää');

export function stars(n) {
  const full = Math.round(Number(n) || 0);
  return `<span class="stars" aria-label="${full} / 5 tähteä">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}

export function reviewList(list, empty = 'Ei vielä arvosteluja.') {
  if (!list || !list.length) return `<p class="muted" style="margin:8px 0 0">${empty}</p>`;
  return `<ul class="rlist">${list.map(r => `<li>
    <div class="rhead">${stars(r.stars)}<span class="muted">${r.fromName ? esc(r.fromName) : ''}</span></div>
    ${r.text ? `<p>${esc(r.text)}</p>` : ''}
  </li>`).join('')}</ul>`;
}

function stamps(likeLabel) {
  return `<span class="stamp like">${likeLabel}</span><span class="stamp nope">Ohita</span>`;
}

// Sama kortti molemmille: vain tekstit vaihtuvat roolin mukaan.
export function userCard(u, { key, cls = '', own = false } = {}) {
  const c = catOf(u.cats && u.cats[0]);
  const rating = u.ratingCount
    ? `<span>${ic('star', true)} ${Number(u.ratingAvg).toFixed(1)} (${u.ratingCount})</span>`
    : '<span>Ei vielä arvosteluja</span>';
  const tags = (u.role === 'provider' ? (u.skills || []) : (u.cats || []).map(id => catOf(id).name)).slice(0, 4);
  return `<article class="tcard ${cls}" data-key="${key || 'u:' + u.uid}" style="--c:${c.color}">
    <div class="tc-media${u.photoUrl ? ' has-photo' : ''}">
      ${u.photoUrl ? `<img src="${esc(u.photoUrl)}" alt="">` : `<span class="mono">${esc(initials(u.name))}</span>`}
      <span class="tc-cat"><span class="cdot"></span>${u.role === 'provider' ? c.name : 'Etsii: ' + c.name}</span>
      <span class="tc-money">${esc(moneyLine(u))}</span>
      ${u.videoUrl ? `<span class="tc-play">${I.play}</span>` : ''}
      ${u.role === 'hirer' ? `<span class="tc-need">${esc(headline(u)).slice(0, 90)}</span>` : ''}
      ${stamps('Kiinnostaa')}
    </div>
    <div class="tc-body">
      <div class="tc-row"><h2>${esc(u.name || 'Nimetön')}</h2></div>
      <p class="tc-line">${ic(u.kind === 'person' ? (u.role === 'provider' ? 'grad' : 'user') : 'store')}<span>${esc(kindLine(u))}</span></p>
      <div class="tc-meta"><span>${ic('pin')} ${esc(where(u))}</span>${rating}</div>
      ${u.role === 'provider' ? `<p class="tc-bio">${esc(u.about || '')}</p>` : `<p class="tc-bio">${esc(u.about || '')}</p>`}
      ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${own ? '' : `<button class="tc-more" data-act="detail" data-key="${key || 'u:' + u.uid}">Näytä koko profiili</button>`}
    </div>
  </article>`;
}

export function gigCard(g) {
  const c = catOf(g.cat);
  return `<article class="tcard" data-key="g:${g.id}" style="--c:${c.color}">
    <div class="tc-media">
      <span class="mono">${esc(initials(g.ownerName || '?'))}</span>
      <span class="tc-cat"><span class="cdot"></span>Ilmoitus: ${c.name}</span>
      <span class="tc-money">${esc(g.budget || '')}</span>
      <span class="tc-need">${esc(g.title)}</span>
      ${stamps('Kiinnostaa')}
    </div>
    <div class="tc-body">
      <div class="tc-row"><h2>${esc(g.ownerName || 'Ilmoittaja')}</h2></div>
      <div class="tc-meta"><span>${ic('pin')} ${esc(g.city || '')}</span>${g.deadline ? `<span>${ic('clock')} ${esc(g.deadline)}</span>` : ''}</div>
      <p class="tc-bio">${esc(g.desc || '')}</p>
      <button class="tc-more" data-act="detail" data-key="g:${g.id}">Näytä lisää</button>
    </div>
  </article>`;
}

// Yhtä kattava tarkempi näkymä kummallekin osapuolelle.
export function userSheet(u, actionsHTML, reviews = []) {
  const c = catOf(u.cats && u.cats[0]);
  const provider = u.role === 'provider';
  const rows = provider
    ? [['Oppilaitos', u.school], ['Opinnot', u.program], ['Tutkinnot', u.degrees],
       ['Todistukset', u.certs], ['Nykyinen työ', u.job], ['Kokemus', u.experience],
       ['Tekijöitä', u.team], ['Perustettu', u.founded], ['Referenssit', u.refs]]
    : [['Toimiala', u.industry], ['Yrityksen koko', u.size], ['Osoite', u.address],
       ['Mitä etsii', u.need], ['Aikataulu', u.schedule]];
  const extra = rows.filter(([, v]) => v && String(v).trim());
  return `<div class="sheet" style="--c:${c.color}">
    <div class="handle"></div>
    <div class="tc-media sheet-media${u.photoUrl ? ' has-photo' : ''}">
      ${u.photoUrl ? `<img src="${esc(u.photoUrl)}" alt="">` : `<span class="mono">${esc(initials(u.name))}</span>`}
      <span class="tc-cat"><span class="cdot"></span>${provider ? c.name : 'Etsii: ' + c.name}</span>
      <span class="tc-money">${esc(moneyLine(u))}</span>
    </div>
    ${u.videoUrl ? `<video class="vid" src="${esc(u.videoUrl)}" controls playsinline></video>` : ''}
    <div class="prof-head"><h2>${esc(u.name || 'Nimetön')}</h2></div>
    <div class="meta-lines">
      <p>${ic(u.kind === 'person' ? (provider ? 'grad' : 'user') : 'store')}${esc(kindLine(u))}</p>
      <p>${ic('pin')}${esc(where(u))}${u.address ? ', ' + esc(u.address) : ''}</p>
      ${u.ratingCount ? `<p>${ic('star', true)}${Number(u.ratingAvg).toFixed(1)} (${u.ratingCount} arviota)</p>` : ''}
      ${u.website ? `<p>${esc(u.website)}</p>` : ''}
      ${u.socials ? `<p>${esc(u.socials)}</p>` : ''}
    </div>
    ${u.about ? `<p class="body-text">${esc(u.about)}</p>` : ''}
    ${(u.cats || []).length ? `<h3>${provider ? 'Osaaminen' : 'Mitä etsitään'}</h3><div class="tags">${u.cats.map(id => `<span class="tag">${catOf(id).name}</span>`).join('')}</div>` : ''}
    ${provider && (u.skills || []).length ? `<h3>Taidot</h3><div class="tags">${u.skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
    ${extra.length ? `<h3>Tiedot</h3><ul class="plist">${extra.map(([k, v]) => `<li><b>${k}:</b> ${esc(v)}</li>`).join('')}</ul>` : ''}
    <h3>Arvostelut</h3>
    ${reviewList(reviews)}
    ${actionsHTML || ''}
    <div class="safety">
      <button class="link danger" data-act="report" data-uid="${u.uid}">Ilmianna</button>
      <button class="link danger" data-act="block" data-uid="${u.uid}">Estä käyttäjä</button>
    </div>
  </div>`;
}

export function gigSheet(g, actionsHTML) {
  const c = catOf(g.cat);
  return `<div class="sheet" style="--c:${c.color}">
    <div class="handle"></div>
    <div class="tc-media sheet-media">
      <span class="mono">${esc(initials(g.ownerName || '?'))}</span>
      <span class="tc-cat"><span class="cdot"></span>Ilmoitus: ${c.name}</span>
      <span class="tc-money">${esc(g.budget || '')}</span>
    </div>
    <div class="prof-head"><h2>${esc(g.title)}</h2></div>
    <div class="meta-lines">
      <p>${ic('store')}${esc(g.ownerName || '')}</p>
      <p>${ic('pin')}${esc(g.city || '')}</p>
      ${g.deadline ? `<p>${ic('clock')}${esc(g.deadline)}</p>` : ''}
    </div>
    <p class="body-text">${esc(g.desc || '')}</p>
    ${actionsHTML || ''}
  </div>`;
}
