// Scouters – sovelluksen runko: kirjautuminen, roolit, selaus, kiinnostuneet,
// matchit, chat ja profiili. Molemmat osapuolet käyttävät samoja näkymiä.
import { watchAuth, googleLogin, emailLogin, logOut, authError } from './auth.js';
import {
  getProfile, createProfile, saveProfile, uploadMedia, reviewsFor,
  completedMatches, blockUser, unblockUser, reportUser, deleteProfile
} from './db.js';
import { catOf, MIN_AGE } from './model.js';
import { deleteAccount } from './auth.js';
import { CLOUDINARY } from './firebase.js';
import { $, esc, av, I, toast, userCard, userSheet, gigSheet } from './ui.js';
import { viewProfile, previewUser } from './profile.js';
import { deck, loadDeck, viewBrowse, buildDeck, swipeTop, deckItem } from './browse.js';
import * as chat from './chat.js';

const S = {
  user: null, profile: null, screen: 'loading', tab: 'browse',
  role: null, kind: null, busy: false,
  birthYear: '', consent: false,
  myReviews: [], completedCount: 0
};

/* ---------------- näkymät ---------------- */

const vLoading = () => `<div class="center"><p class="muted">Ladataan…</p></div>`;

const vLogin = () => `<div class="page">
  <div class="logo">${I.logo}Scouters</div>
  <h1>Kirjaudu sisään</h1>
  <p class="lead">Osaajat esittelevät itsensä lyhyellä videolla ja yritykset kertovat mitä tarvitsevat. Match syntyy, kun kiinnostus on molemminpuolista.</p>
  <button class="btn primary block" data-act="google">Jatka Google-tilillä</button>
  <p class="or">tai sähköpostilla</p>
  <div class="field"><label for="email">Sähköposti</label><input id="email" class="text-in" type="email" autocomplete="email" placeholder="nimi@esimerkki.fi"></div>
  <div class="field"><label for="pw">Salasana</label><input id="pw" class="text-in" type="password" autocomplete="current-password" placeholder="Vähintään 6 merkkiä"></div>
  <div class="row-btns"><button class="btn ghost" data-act="email-login">Kirjaudu</button><button class="btn ink" data-act="email-signup">Luo tunnus</button></div>
</div>`;

const vRole = () => `<div class="page">
  <h1>Mitä teet Scoutersissa?</h1>
  <p class="lead">Molemmat puolet toimivat samalla tavalla: kerrot itsestäsi, selaat ja pyyhkäiset.</p>
  <button class="role-card" data-act="role" data-v="hirer"><strong>Etsin tekijää</strong><small>Tarvitsen apua esimerkiksi somessa, nettisivuissa tai kirjanpidossa</small></button>
  <button class="role-card" data-act="role" data-v="provider"><strong>Tarjoan palveluita</strong><small>Haluan asiakkaita ja keikkoja omalla osaamisellani</small></button>
  <button class="btn ghost block mt" data-act="logout">Kirjaudu ulos</button>
</div>`;

const vConsent = () => `<div class="page">
  <h1>Vielä pari asiaa</h1>
  <p class="lead">Scouters on tarkoitettu vähintään ${MIN_AGE}-vuotiaille.</p>
  <div class="field"><label for="birthYear">Syntymävuosi</label>
    <input id="birthYear" class="text-in" inputmode="numeric" maxlength="4" placeholder="Esim. 2005" value="${esc(S.birthYear)}"></div>
  <label class="toggle">Hyväksyn käyttöehdot ja tietosuojaselosteen
    <input type="checkbox" id="consent" ${S.consent ? 'checked' : ''}></label>
  <p class="hint">Profiilisi, kuvasi ja videosi näkyvät muille kirjautuneille käyttäjille. Voit poistaa tilisi ja tietosi milloin tahansa Tili-välilehdeltä.</p>
  <button class="btn primary block mt" data-act="accept">Jatka</button>
  <button class="btn ghost block mt" data-act="back-role">Takaisin</button>
</div>`;

const vKind = () => {
  const opts = S.role === 'hirer'
    ? [['person', 'Yksityishenkilö', 'Tarvitsen apua omaan projektiin'], ['business', 'Yritys', 'Pizzeria, kampaamo, ketju tai oma toiminimi']]
    : [['person', 'Opiskelija tai yksityinen osaaja', 'Myyn omaa osaamistani'], ['company', 'Yritys', 'Pieni toimisto, studio tai toiminimi']];
  return `<div class="page">
    <h1>Kuka olet?</h1>
    ${opts.map(([v, t, d]) => `<button class="role-card" data-act="kind" data-v="${v}"><strong>${t}</strong><small>${d}</small></button>`).join('')}
    <button class="btn ghost block mt" data-act="back-consent">Takaisin</button>
  </div>`;
};

function header() {
  const label = S.profile.role === 'provider'
    ? (S.profile.kind === 'company' ? 'Palveluyritys' : 'Osaaja')
    : (S.profile.kind === 'business' ? 'Yritys' : 'Yksityishenkilö');
  return `<header class="top"><div class="logo">${I.logo}Scouters</div><span class="pill">${label}</span></header>`;
}

function nav() {
  const newOnes = chat.chat.interested.length;
  const unread = chat.chat.matches.filter(m => !m.lastMessage).length;
  const tabs = [
    ['browse', 'Selaa', I.cards, 0],
    ['interested', 'Kiinnostuneet', I.heartO, newOnes],
    ['matches', 'Viestit', I.chat, unread],
    ['account', 'Tili', I.user, 0]
  ];
  return `<nav class="bottom-nav" aria-label="Päävalikko">${tabs.map(([id, label, icon, n]) =>
    `<button class="nav-btn" data-act="tab" data-v="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${icon}${label}${n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</nav>`;
}

function view() {
  if (S.screen === 'login') return vLogin();
  if (S.screen === 'role') return vRole();
  if (S.screen === 'consent') return vConsent();
  if (S.screen === 'kind') return vKind();
  if (S.screen !== 'app') return vLoading();
  if (chat.chat.openId) return chat.viewChat(S);
  const body = S.tab === 'browse' ? viewBrowse(S)
    : S.tab === 'interested' ? chat.viewInterested(S)
    : S.tab === 'matches' ? chat.viewMatches(S)
    : viewProfile(S);
  return header() + body + nav();
}

function render(opts = {}) {
  const old = $('#scroller'), top = old ? old.scrollTop : 0;
  $('#view').innerHTML = view();
  if (S.screen === 'app' && S.tab === 'browse' && !chat.chat.openId) buildDeck(S, onMatch);
  const sc = $('#scroller');
  if (sc && chat.chat.openId) sc.scrollTop = sc.scrollHeight;
  else if (sc && opts.keepScroll) sc.scrollTop = top;
}
const updateCard = () => { const el = $('#myCard'); if (el) el.innerHTML = userCard(previewUser(S), { key: 'me', cls: 'static', own: true }); };

/* ---------------- match-ilmoitus ---------------- */

async function onMatch(matchId) {
  const otherUid = matchId.split('_').find(u => u !== S.user.uid);
  const u = await chat.profileOf(otherUid) || { name: 'Käyttäjä', cats: [] };
  const c = catOf(u.cats && u.cats[0]);
  $('#layer').innerHTML = `<div class="overlay match" role="dialog" aria-modal="true">
    <div class="match-inner">
      <div class="match-avs">${av(S.profile.name || 'Sinä', '#FF7A1A', 92, S.profile.photoUrl)}${av(u.name, c.color, 92, u.photoUrl)}</div>
      <h2>Se on match!</h2>
      <p>Sinä ja ${esc(u.name || 'käyttäjä')} olette kiinnostuneita toisistanne.</p>
      <button class="btn primary" data-act="open-chat" data-id="${matchId}">Lähetä viesti</button>
      <button class="btn ghost" data-act="close">Jatka</button>
    </div></div>`;
}
const closeLayer = () => { $('#layer').innerHTML = ''; };

/* ---------------- tarkempi näkymä ---------------- */

async function openDetail(key) {
  const item = deckItem(key);
  if (item) {
    const swiped = `<div class="sheet-actions"><button class="btn ghost" data-act="sheet-swipe" data-v="pass" data-key="${key}">Ohita</button><button class="btn primary" data-act="sheet-swipe" data-v="like" data-key="${key}">Kiinnostaa</button></div>`;
    const revs = item.type === 'user' ? await reviewsFor(item.data.uid, 3).catch(() => []) : [];
    $('#layer').innerHTML = `<div class="overlay" data-act="bg">${item.type === 'user' ? userSheet(item.data, swiped, revs) : gigSheet(item.data, swiped)}</div>`;
    return;
  }
  const uid = key.startsWith('u:') ? key.slice(2) : null;
  if (!uid) return;
  const u = await chat.profileOf(uid); if (!u) return;
  const revs = await reviewsFor(uid, 3).catch(() => []);
  $('#layer').innerHTML = `<div class="overlay" data-act="bg">${userSheet(u, '<div class="mt"><button class="btn ghost block" data-act="close">Sulje</button></div>', revs)}</div>`;
}

/* ---------------- tapahtumat ---------------- */

const app = document.getElementById('app');

app.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act, v = t.dataset.v;
  if (act === 'bg') { if (e.target === t) closeLayer(); return; }
  try {
    switch (act) {
      case 'google': await googleLogin(); break;
      case 'email-login': await emailLogin($('#email').value, $('#pw').value, false); break;
      case 'email-signup': await emailLogin($('#email').value, $('#pw').value, true); break;
      case 'logout': chat.closeChat(); await logOut(); break;
      case 'role': S.role = v; S.screen = 'consent'; render(); break;
      case 'back-role': S.screen = 'role'; render(); break;
      case 'back-consent': S.screen = 'consent'; render(); break;
      case 'accept': {
        const year = parseInt(($('#birthYear') || {}).value, 10);
        const age = new Date().getFullYear() - year;
        if (!year || year < 1920 || age < 0) { toast('Tarkista syntymävuosi.'); break; }
        if (age < MIN_AGE) { toast(`Scouters on tarkoitettu vähintään ${MIN_AGE}-vuotiaille.`); break; }
        if (!($('#consent') || {}).checked) { toast('Hyväksy käyttöehdot jatkaaksesi.'); break; }
        S.birthYear = String(year); S.consent = true; S.screen = 'kind'; render(); break;
      }
      case 'kind':
        S.profile = await createProfile(S.user.uid, S.role, v, {
          name: S.user.displayName || '', photoUrl: S.user.photoURL || '',
          birthYear: +S.birthYear, consentAt: new Date().toISOString()
        });
        await enterApp();
        toast('Profiili luotu. Täydennä tiedot Tili-välilehdellä.');
        break;
      case 'tab':
        closeLayer(); chat.closeChat(); S.tab = v; render();
        if (v === 'browse') { await loadDeck(S); buildDeck(S, onMatch); }
        if (v === 'interested') { await chat.loadInterested(S.user.uid); render(); }
        if (v === 'account') { await loadMyReviews(); render(true); }
        break;
      case 'cat': {
        const chips = $('#chips'); deck.chipScroll = chips ? chips.scrollLeft : 0;
        deck.cat = v || null;
        document.querySelectorAll('#chips .chip').forEach(c => c.setAttribute('aria-pressed', (c.dataset.v || null) === deck.cat));
        deck.loading = true; buildDeck(S, onMatch);
        await loadDeck(S); buildDeck(S, onMatch);
        break;
      }
      case 'reload': deck.loading = true; buildDeck(S, onMatch); await loadDeck(S); buildDeck(S, onMatch); break;
      case 'side':
        deck.side = v; deck.loading = true; render();
        await loadDeck(S); buildDeck(S, onMatch); break;
      case 'swipe': swipeTop(v, S, onMatch); break;
      case 'star': chat.chat.stars = +v; render(true); break;
      case 'send-review': await chat.sendReview(S); render(true); break;
      case 'block': {
        closeLayer();
        const uid = t.dataset.uid;
        S.profile.blocked = await blockUser(S.user.uid, uid, S.profile.blocked || []);
        chat.closeChat();
        deck.loading = true; render(); await loadDeck(S); buildDeck(S, onMatch);
        toast('Käyttäjä estetty. Hän ei näy sinulle eikä sinä hänelle.');
        break;
      }
      case 'unblock': {
        S.profile.blocked = await unblockUser(S.user.uid, t.dataset.uid, S.profile.blocked || []);
        render(true); toast('Esto poistettu'); break;
      }
      case 'report': {
        closeLayer();
        const reason = window.prompt('Kerro lyhyesti, mistä ilmiannat käyttäjän:');
        if (!reason) break;
        await reportUser(S.user.uid, t.dataset.uid, reason, chat.chat.openId || '');
        toast('Ilmianto lähetetty. Käymme sen läpi.');
        break;
      }
      case 'delete-account': {
        if (!window.confirm('Poistetaanko tilisi ja tietosi? Tätä ei voi perua.')) break;
        await deleteProfile(S.user.uid);
        const res = await deleteAccount();
        if (res === 'relogin') toast('Profiilisi poistettiin. Kirjaudu uudelleen, jos haluat poistaa myös tunnuksen.');
        chat.closeChat(); S.profile = null; S.screen = 'login'; render();
        break;
      }
      case 'detail': await openDetail(t.dataset.key); break;
      case 'sheet-swipe': closeLayer(); swipeTop(v, S, onMatch, t.dataset.key); break;
      case 'close': closeLayer(); break;
      case 'int-like': case 'int-pass':
        closeLayer();
        await chat.answerInterest(S, t.dataset.uid, act === 'int-like' ? 'like' : 'pass', onMatch);
        render(true);
        break;
      case 'open-chat': closeLayer(); chat.openChat(S, t.dataset.id, () => render()); S.tab = 'matches'; render(); break;
      case 'attach': break;
      case 'close-chat': chat.closeChat(); render(); break;
      case 'send': await chat.send(S); break;
      case 'complete': await chat.markComplete(S); break;
      case 'pcat': {
        const cats = S.profile.cats, i = cats.indexOf(v);
        if (i >= 0) cats.splice(i, 1); else cats.push(v);
        t.setAttribute('aria-pressed', cats.includes(v)); updateCard(); break;
      }
      case 'save': {
        S.busy = true; render(true);
        const p = { ...S.profile };
        p.skills = typeof p.skills === 'string' ? p.skills.split(',').map(s => s.trim()).filter(Boolean) : p.skills;
        await saveProfile(S.user.uid, p);
        S.busy = false; render(true); toast('Tiedot tallennettu');
        break;
      }
    }
  } catch (err) {
    S.busy = false; render(true);
    toast(err && String(err.code || '').startsWith('auth/') ? authError(err) : 'Toiminto ei onnistunut. Tarkista verkkoyhteys.');
    console.error(err);
  }
});

app.addEventListener('input', e => {
  const el = e.target, f = el.dataset.field;
  if (!f || el.type === 'checkbox' || el.type === 'file') return;
  S.profile[f] = f === 'price' ? +el.value : el.value;
  if (f === 'price') { const pv = $('#priceVal'); if (pv) pv.textContent = el.value + ' €'; }
  updateCard();
});

app.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.field === 'remote') { S.profile.remote = el.checked; updateCard(); return; }
  if (el.id === 'fileIn' && el.files && el.files[0]) {
    await chat.sendFile(S, el.files[0]); el.value = ''; return;
  }
  if ((el.id === 'photoIn' || el.id === 'videoIn') && el.files && el.files[0]) {
    const isVideo = el.id === 'videoIn';
    toast(isVideo ? 'Ladataan videota…' : 'Ladataan kuvaa…');
    try {
      const url = await uploadMedia(el.files[0], CLOUDINARY, isVideo ? 'video' : 'image');
      const key = isVideo ? 'videoUrl' : 'photoUrl';
      S.profile[key] = url;
      await saveProfile(S.user.uid, { [key]: url });
      render(true); toast(isVideo ? 'Video lisätty' : 'Kuva lisätty');
    } catch (err) { console.error(err); toast(err.message || 'Lataus ei onnistunut'); }
  }
});

app.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'chatIn') { e.preventDefault(); chat.send(S); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#layer').innerHTML) closeLayer();
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if (S.screen === 'app' && S.tab === 'browse' && !chat.chat.openId && !$('#layer').innerHTML && !typing) {
    if (e.key === 'ArrowLeft') swipeTop('pass', S, onMatch);
    if (e.key === 'ArrowRight') swipeTop('like', S, onMatch);
  }
});
// Kortin napautus avaa profiilin (pyyhkäisykoodi lähettää tämän tapahtuman).
document.addEventListener('scouters:detail', e => openDetail(e.detail));

/* ---------------- käynnistys ---------------- */

async function loadMyReviews() {
  try {
    const [revs, done] = await Promise.all([
      reviewsFor(S.user.uid, 20),
      completedMatches(S.user.uid)
    ]);
    S.myReviews = revs; S.completedCount = done.length;
  } catch (e) { console.error(e); }
}

async function enterApp() {
  S.screen = 'app'; S.tab = 'browse';
  if (typeof S.profile.skills === 'object') S.profile.skills = (S.profile.skills || []).join(', ');
  render();
  chat.startMatchWatch(S.user.uid, () => { if (S.screen === 'app') render(true); });
  chat.loadInterested(S.user.uid).then(() => { if (S.tab === 'interested') render(true); else render(true); });
  await loadDeck(S);
  if (S.tab === 'browse') buildDeck(S, onMatch);
}

render();
watchAuth(async user => {
  S.user = user;
  if (!user) { S.profile = null; chat.closeChat(); S.screen = 'login'; render(); return; }
  S.profile = await getProfile(user.uid);
  if (!S.profile) { S.screen = 'role'; render(); return; }
  await enterApp();
});
