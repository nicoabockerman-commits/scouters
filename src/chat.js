// Kiinnostuneet, matchit ja chat. Molemmat osapuolet käyttävät samaa näkymää.
import { catOf } from './model.js';
import { whoLikedMe, getProfile, like, watchMatches, watchMessages, sendMessage, completeMatch } from './db.js';
import { $, esc, av, ic, I, toast, kindLine, moneyLine, where as whereTxt, headline } from './ui.js';

export const chat = {
  matches: [],
  interested: [],
  profiles: new Map(),   // uid -> profiili, jotta samaa ei haeta moneen kertaan
  openId: null,
  messages: [],
  unsubMatches: null,
  unsubMsgs: null,
  loading: true
};

export async function profileOf(uid) {
  if (chat.profiles.has(uid)) return chat.profiles.get(uid);
  const p = await getProfile(uid);
  if (p) chat.profiles.set(uid, p);
  return p;
}

export function startMatchWatch(myUid, onChange) {
  if (chat.unsubMatches) chat.unsubMatches();
  chat.unsubMatches = watchMatches(myUid, async list => {
    chat.matches = list;
    await Promise.all(list.map(m => profileOf(m.users.find(u => u !== myUid))));
    onChange();
  });
}

export async function loadInterested(myUid) {
  chat.loading = true;
  try {
    const likes = await whoLikedMe(myUid);
    await Promise.all(likes.map(l => profileOf(l.from)));
    chat.interested = likes;
  } catch (e) { console.error(e); toast('Kiinnostuneita ei voitu ladata.'); }
  chat.loading = false;
}

const other = (m, myUid) => chat.profiles.get(m.users.find(u => u !== myUid)) || { name: 'Käyttäjä', cats: [] };

/* ---------- kiinnostuneet ---------- */

export function viewInterested(S) {
  if (chat.loading) return `<main class="content"><h1 class="h">Kiinnostuneet</h1><p class="sub">Ladataan…</p></main>`;
  const body = chat.interested.length ? chat.interested.map(l => {
    const u = chat.profiles.get(l.from); if (!u) return '';
    const c = catOf(u.cats && u.cats[0]);
    return `<div class="bcard">
      <div class="bcard-top">${av(u.name, c.color, 46, u.photoUrl)}<span><b>${esc(u.name || 'Nimetön')}</b><small>${esc(kindLine(u))}</small></span></div>
      <p class="need-line">${esc(headline(u)).slice(0, 140)}</p>
      <div class="tc-meta"><span>${ic('pin')} ${esc(whereTxt(u))}</span><span>${esc(moneyLine(u))}</span></div>
      <div class="bcard-actions">
        <button class="btn ghost small" data-act="int-pass" data-uid="${u.uid}">Ohita</button>
        <button class="btn primary small" data-act="int-like" data-uid="${u.uid}">Kiinnostaa</button>
      </div>
      <button class="link" data-act="detail" data-key="u:${u.uid}">Näytä koko profiili</button>
    </div>`;
  }).join('') : `<div class="empty"><h3>Ei uusia kiinnostuneita</h3><p>Täällä näkyvät ne, jotka ovat pyyhkäisseet sinut oikealle. Hyväksy, niin chat aukeaa.</p></div>`;
  return `<main class="content"><h1 class="h">Kiinnostuneet</h1>
    <p class="sub">${S.profile.role === 'provider' ? 'Nämä yritykset ja ihmiset ovat kiinnostuneita sinusta.' : 'Nämä osaajat ovat kiinnostuneita sinusta.'}</p>
    ${body}</main>`;
}

export async function answerInterest(S, uid, dir, onMatch) {
  chat.interested = chat.interested.filter(l => l.from !== uid);
  try {
    const matchId = await like(S.user.uid, uid, dir);
    if (matchId) onMatch(matchId);
    else if (dir !== 'pass') toast('Tallennettu');
  } catch (e) {
    console.error('Scouters kiinnostus-virhe:', e);
    toast('Tallennus ei onnistunut: ' + ((e && (e.code || e.message)) || 'tuntematon syy'));
  }
}

/* ---------- matchit ---------- */

export function viewMatches(S) {
  const body = chat.matches.length ? chat.matches.map(m => {
    const u = other(m, S.user.uid), c = catOf(u.cats && u.cats[0]);
    return `<button class="row" data-act="open-chat" data-id="${m.id}">
      ${av(u.name, c.color, 50, u.photoUrl)}
      <span class="row-txt"><b>${esc(u.name || 'Käyttäjä')}</b><small>${m.lastMessage ? esc(m.lastMessage) : 'Uusi match. Sano moi!'}</small></span>
      ${m.status === 'completed' ? `<span class="pill-mini">Valmis</span>` : ''}
    </button>`;
  }).join('') : `<div class="empty"><h3>Ei vielä matcheja</h3><p>Match syntyy, kun kiinnostus on molemminpuolista. Aloita selaamalla.</p>
      <button class="btn primary small" data-act="tab" data-v="browse">Selaa</button></div>`;
  return `<main class="content"><h1 class="h">Viestit</h1><p class="sub">Keskustelut aukeavat, kun kiinnostus on molemminpuolista.</p>${body}</main>`;
}

/* ---------- chat ---------- */

export function openChat(S, matchId, onChange) {
  chat.openId = matchId; chat.messages = [];
  if (chat.unsubMsgs) chat.unsubMsgs();
  chat.unsubMsgs = watchMessages(matchId, msgs => { chat.messages = msgs; onChange(); });
}
export function closeChat() {
  chat.openId = null; chat.messages = [];
  if (chat.unsubMsgs) { chat.unsubMsgs(); chat.unsubMsgs = null; }
}

export function viewChat(S) {
  const m = chat.matches.find(x => x.id === chat.openId);
  if (!m) return `<main class="content"><div class="empty"><p class="muted">Keskustelua ei löytynyt.</p><button class="btn ghost small" data-act="tab" data-v="matches">Takaisin</button></div></main>`;
  const u = other(m, S.user.uid), c = catOf(u.cats && u.cats[0]);
  const done = m.status === 'completed';
  return `<div class="chat-head">
      <button class="icon-btn" data-act="close-chat" aria-label="Takaisin">${I.back}</button>
      ${av(u.name, c.color, 42, u.photoUrl)}
      <button class="chat-who" data-act="detail" data-key="u:${u.uid}"><b>${esc(u.name || 'Käyttäjä')}</b><small>${esc(kindLine(u))}</small></button>
    </div>
    <main class="content" id="scroller"><div class="thread">
      <span class="sys">Teillä on match. Sopikaa työstä ja aikataulusta.</span>
      ${chat.messages.map(x => `<div class="bubble ${x.from === S.user.uid ? 'me' : 'them'}"><p>${esc(x.text)}</p></div>`).join('')}
      ${done ? '<span class="sys">Keikka on merkitty valmiiksi. Arvostelut tulevat seuraavassa vaiheessa.</span>' : ''}
    </div></main>
    <div class="composer-wrap">
      ${done ? '' : `<button class="btn ghost block small mb" data-act="complete">${ic('check')} Merkitse keikka valmiiksi</button>`}
      <form class="composer" onsubmit="return false">
        <input id="chatIn" placeholder="Kirjoita viesti" autocomplete="off" aria-label="Viesti">
        <button class="send" data-act="send" aria-label="Lähetä">${I.send}</button>
      </form>
    </div>`;
}

export async function send(S) {
  const input = $('#chatIn'); if (!input) return;
  const text = input.value; input.value = '';
  try { await sendMessage(chat.openId, S.user.uid, text); }
  catch (e) { console.error(e); toast('Viestin lähetys ei onnistunut.'); }
}

export async function markComplete(S) {
  try {
    await completeMatch(chat.openId, S.user.uid);
    toast('Keikka merkitty valmiiksi');
  } catch (e) { console.error(e); toast('Merkintä ei onnistunut.'); }
}
