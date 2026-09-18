// Selausnäkymä: profiilit ja ilmoitukset samassa pakassa, pyyhkäisy molempiin
// suuntiin. Sama koodi palvelee sekä osaajaa että tekijää etsivää.
import { CATS, catOf } from './model.js';
import { fetchDeck, fetchGigs, like } from './db.js';
import { $, esc, userCard, gigCard, toast, I } from './ui.js';

export const deck = {
  items: [],      // { key, type: 'user' | 'gig', data }
  cat: null,      // valittu kategoria tai null
  loading: false,
  chipScroll: 0   // muistetaan kategorialistan vierityskohta
};

export async function loadDeck(S) {
  deck.loading = true;
  console.log('Scouters: haetaan pakkaa roolille', S.profile.role, 'kategoria', deck.cat);
  try {
    const [users, gigs] = await Promise.all([
      fetchDeck({ myUid: S.user.uid, myRole: S.profile.role, cat: deck.cat }),
      fetchGigs({ myRole: S.profile.role, cat: deck.cat })
    ]);
    const mine = new Set([S.user.uid]);
    const list = [
      ...users.map(u => ({ key: 'u:' + u.uid, type: 'user', data: u })),
      ...gigs.filter(g => !mine.has(g.ownerUid)).map(g => ({ key: 'g:' + g.id, type: 'gig', data: g }))
    ];
    // Sekoitetaan kevyesti, jotta ilmoitukset eivät jää pakan pohjalle.
    deck.items = list.sort(() => Math.random() - 0.5);
  } catch (e) {
    console.error(e);
    toast('Selausta ei voitu ladata: ' + (e && (e.code || e.message) || 'tuntematon syy'));
    deck.items = [];
  }
  deck.loading = false;
}

export function viewBrowse(S) {
  const chips = [{ id: null, name: 'Kaikki' }, ...CATS];
  return `<main class="content fixed">
    <div class="chips" id="chips" role="toolbar" aria-label="Kategoriat">
      ${chips.map(c => `<button class="chip" data-act="cat" data-v="${c.id || ''}" aria-pressed="${deck.cat === c.id}" style="--c:${c.color || 'var(--brand)'}">${c.id ? '<span class="cdot"></span>' : ''}${c.name}</button>`).join('')}
    </div>
    <div class="deck-wrap"><div class="deck" id="deck"></div></div>
    <div class="actions" id="actions">
      <button class="act big pass" data-act="swipe" data-v="pass" aria-label="Ohita">${I.x}</button>
      <button class="act big like" data-act="swipe" data-v="like" aria-label="Kiinnostaa">${I.heart}</button>
    </div>
  </main>`;
}

export function buildDeck(S, onMatch) {
  const el = $('#deck'); if (!el) return;
  const chips = $('#chips'); if (chips) chips.scrollLeft = deck.chipScroll;
  const actions = $('#actions');

  if (deck.loading) {
    el.innerHTML = '<div class="empty"><p class="muted">Ladataan…</p></div>';
    if (actions) actions.style.visibility = 'hidden';
    return;
  }
  if (!deck.items.length) {
    el.innerHTML = `<div class="empty">
      <h3>Ei näytettävää juuri nyt</h3>
      <p>${S.profile.role === 'provider'
        ? 'Uudet yritykset ja ilmoitukset ilmestyvät tähän heti, kun ne liittyvät mukaan.'
        : 'Uudet osaajat ilmestyvät tähän heti, kun he liittyvät mukaan.'}</p>
      <button class="btn ghost small" data-act="reload">Päivitä</button>
    </div>`;
    if (actions) actions.style.visibility = 'hidden';
    return;
  }
  if (actions) actions.style.visibility = '';
  const top3 = deck.items.slice(0, 3).reverse();
  el.innerHTML = top3.map(i => i.type === 'user' ? userCard(i.data, { key: i.key }) : gigCard(i.data)).join('');
  bindDrag(el.lastElementChild, S, onMatch);
}

function bindDrag(card, S, onMatch) {
  if (!card) return;
  const key = card.dataset.key;
  const like$ = card.querySelector('.stamp.like'), nope$ = card.querySelector('.stamp.nope');
  let sx = 0, sy = 0, dx = 0, dy = 0, down = false, moved = false;

  card.addEventListener('pointerdown', e => {
    if (e.target.closest('.tc-more')) return;
    down = true; moved = false; sx = e.clientX; sy = e.clientY; dx = dy = 0;
    try { card.setPointerCapture(e.pointerId); } catch (_) {}
    card.style.transition = 'none';
  });
  card.addEventListener('pointermove', e => {
    if (!down) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    card.style.transform = `translate(${dx}px, ${dy * .25}px) rotate(${dx / 18}deg)`;
    like$.style.opacity = Math.max(0, Math.min(1, dx / 100));
    nope$.style.opacity = Math.max(0, Math.min(1, -dx / 100));
  });
  const end = () => {
    if (!down) return; down = false; card.style.transition = '';
    if (dx > 110) fling(card, key, 'like', S, onMatch);
    else if (dx < -110) fling(card, key, 'pass', S, onMatch);
    else {
      card.style.transform = ''; like$.style.opacity = 0; nope$.style.opacity = 0;
      if (!moved) document.dispatchEvent(new CustomEvent('scouters:detail', { detail: key }));
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

export function fling(card, key, dir, S, onMatch) {
  if (card) {
    const right = dir !== 'pass';
    card.style.transition = 'transform .35s ease, opacity .35s ease';
    card.style.transform = `translate(${right ? 620 : -620}px, 40px) rotate(${right ? 28 : -28}deg)`;
    card.style.opacity = '0';
    const st = card.querySelector(right ? '.stamp.like' : '.stamp.nope'); if (st) st.style.opacity = 1;
  }
  const item = deck.items.find(i => i.key === key);
  deck.items = deck.items.filter(i => i.key !== key);
  setTimeout(() => { buildDeck(S, onMatch); }, card ? 300 : 0);
  if (!item) return;

  const targetUid = item.type === 'user' ? item.data.uid : item.data.ownerUid;
  const label = item.type === 'user' ? item.data.name : (item.data.ownerName || 'Ilmoittaja');

  like(S.user.uid, targetUid, dir).then(matchId => {
    if (dir === 'pass') return;
    if (matchId) onMatch(matchId);
    else toast(`${label} sai kiinnostuksesi. Saat ilmoituksen, jos kiinnostus on molemminpuolista.`);
  }).catch(e => {
    console.error(e);
    // Näytetään virheen syy suoraan ruudulla, jotta ongelman näkee ilman konsolia.
    toast('Tallennus ei onnistunut: ' + (e && (e.code || e.message) || 'tuntematon syy'));
  });
}

export function swipeTop(dir, S, onMatch, key) {
  const el = $('#deck'), card = el && el.lastElementChild;
  if (card && card.classList.contains('tcard') && (!key || card.dataset.key === key)) {
    fling(card, card.dataset.key, dir, S, onMatch);
  } else if (key) {
    fling(null, key, dir, S, onMatch);
  }
}

export const deckItem = key => deck.items.find(i => i.key === key);
