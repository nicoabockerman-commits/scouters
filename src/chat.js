// Kiinnostuneet, matchit ja chat. Molemmat osapuolet käyttävät samaa näkymää.
import { catOf } from './model.js';
import {
  whoLikedMe, getProfile, like, watchMatches, watchMessages, sendMessage, completeMatch,
  writeReview, myReview, uploadMedia
} from './db.js';
import { CLOUDINARY } from './firebase.js';
import { MAX_UPLOAD_MB } from './model.js';
import { $, esc, av, ic, I, toast, kindLine, moneyLine, where as whereTxt, headline, stars } from './ui.js';

export const chat = {
  matches: [],
  interested: [],
  profiles: new Map(),   // uid -> profiili, jotta samaa ei haeta moneen kertaan
  openId: null,
  messages: [],
  unsubMatches: null,
  unsubMsgs: null,
  loading: true,
  myReview: null,      // oma arvostelu avoimesta keskustelusta
  reviewOpen: false,   // arvostelulomake näkyvissä
  stars: 5,
  sending: false
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

export async function openChat(S, matchId, onChange) {
  chat.openId = matchId; chat.messages = []; chat.myReview = null; chat.reviewOpen = false; chat.stars = 5;
  myReview(matchId, S.user.uid).then(r => { chat.myReview = r; onChange(); }).catch(() => {});
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
      ${chat.messages.map(x => msgHTML(x, S)).join('')}
      ${done ? '<span class="sys">Keikka on merkitty valmiiksi.</span>' : ''}
      ${done && chat.myReview ? `<span class="sys">Kiitos arvostelusta. Se julkaistaan, kun toinenkin on arvostellut.</span>` : ''}
      ${done && !chat.myReview ? reviewForm() : ''}
    </div></main>
    <div class="composer-wrap">
      ${done ? '' : `<button class="btn ghost block small mb" data-act="complete">${ic('check')} Merkitse keikka valmiiksi</button>`}
      <form class="composer" onsubmit="return false">
        <label class="attach" title="Liitä kuva tai PDF">${I.clip}<input type="file" id="fileIn" accept="image/*,application/pdf"></label>
        <input id="chatIn" placeholder="Kirjoita viesti" autocomplete="off" aria-label="Viesti">
        <button class="send" data-act="send" aria-label="Lähetä" ${chat.sending ? 'disabled' : ''}>${I.send}</button>
      </form>
      <p class="fine">Liitteet: kuvat ja PDF, enintään ${MAX_UPLOAD_MB} Mt.</p>
    </div>`;
}

function msgHTML(x, S) {
  const mine = x.from === S.user.uid;
  let media = '';
  if (x.fileUrl) {
    media = x.fileType === 'application/pdf'
      ? `<a class="file-link" href="${esc(x.fileUrl)}" target="_blank" rel="noopener">${esc(x.fileName || 'Liite')}</a>`
      : `<a href="${esc(x.fileUrl)}" target="_blank" rel="noopener"><img class="msg-img" src="${esc(x.fileUrl)}" alt="Liite"></a>`;
  }
  return `<div class="bubble ${mine ? 'me' : 'them'}">${media}${x.text ? `<p>${esc(x.text)}</p>` : ''}</div>`;
}

function reviewForm() {
  return `<div class="review-box">
    <b>Arvostele yhteistyö</b>
    <div class="star-row">${[1,2,3,4,5].map(n => `<button class="star-btn ${n <= chat.stars ? 'on' : ''}" data-act="star" data-v="${n}" aria-label="${n} tähteä">★</button>`).join('')}</div>
    <textarea id="reviewText" class="text-in" placeholder="Miten yhteistyö sujui?"></textarea>
    <button class="btn primary block" data-act="send-review">Lähetä arvostelu</button>
    <p class="fine">Arvostelut julkaistaan vasta, kun molemmat ovat arvostelleet.</p>
  </div>`;
}

export async function sendReview(S) {
  const m = chat.matches.find(x => x.id === chat.openId); if (!m) return;
  const to = m.users.find(u => u !== S.user.uid);
  const text = ($('#reviewText') || {}).value || '';
  try {
    await writeReview(chat.openId, S.user.uid, to, chat.stars, text);
    chat.myReview = { stars: chat.stars, text };
    toast('Arvostelu tallennettu');
  } catch (e) { console.error(e); toast('Arvostelu ei tallentunut: ' + ((e && (e.code || e.message)) || '')); }
}

export async function sendFile(S, file) {
  if (!file) return;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) { toast(`Tiedosto on liian suuri. Raja on ${MAX_UPLOAD_MB} Mt.`); return; }
  const ok = file.type.startsWith('image/') || file.type === 'application/pdf';
  if (!ok) { toast('Vain kuvat ja PDF-tiedostot ovat sallittuja.'); return; }
  chat.sending = true; toast('Ladataan liitettä…');
  try {
    const url = await uploadMedia(file, CLOUDINARY, file.type === 'application/pdf' ? 'raw' : 'image');
    await sendMessage(chat.openId, S.user.uid, '', { url, type: file.type, name: file.name });
  } catch (e) { console.error(e); toast('Liitteen lähetys ei onnistunut.'); }
  chat.sending = false;
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
