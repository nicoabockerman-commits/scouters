// Scouters – sovelluksen runko: kirjautuminen, roolin valinta ja profiili.
// Selaus, matchit, chat ja arvostelut tulevat seuraavaan vaiheeseen, ja niiden
// tietokantakutsut ovat jo valmiina db.js-tiedostossa.
import { watchAuth, googleLogin, emailLogin, logOut, authError } from './auth.js';
import { getProfile, createProfile, saveProfile, uploadMedia } from './db.js';
import { CATS, catOf } from './model.js';
import { CLOUDINARY } from './firebase.js';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const S = { user: null, profile: null, screen: 'loading', role: null, kind: null, busy: false };

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ---------------- näkymät ---------------- */

const logo = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="4" fill="#FF7A1A"/><path d="M16 1.5v7M16 23.5v7M1.5 16h7M23.5 16h7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;

function vLoading() {
  return `<div class="center"><p class="muted">Ladataan…</p></div>`;
}

function vLogin() {
  return `<div class="page">
    <div class="logo">${logo}Scouters</div>
    <h1>Kirjaudu sisään</h1>
    <p class="lead">Osaajat esittelevät itsensä lyhyellä videolla, ja yritykset kertovat mitä tarvitsevat. Match syntyy, kun kiinnostus on molemminpuolista.</p>
    <button class="btn primary block" data-act="google">Jatka Google-tilillä</button>
    <p class="or">tai sähköpostilla</p>
    <div class="field"><label for="email">Sähköposti</label><input id="email" class="text-in" type="email" autocomplete="email" placeholder="nimi@esimerkki.fi"></div>
    <div class="field"><label for="pw">Salasana</label><input id="pw" class="text-in" type="password" autocomplete="current-password" placeholder="Vähintään 6 merkkiä"></div>
    <div class="row-btns">
      <button class="btn ghost" data-act="email-login">Kirjaudu</button>
      <button class="btn ink" data-act="email-signup">Luo tunnus</button>
    </div>
    <p class="hint">Luomalla tunnuksen hyväksyt, että profiilisi näkyy muille Scoutersin käyttäjille.</p>
  </div>`;
}

function vRole() {
  return `<div class="page">
    <h1>Mitä teet Scoutersissa?</h1>
    <p class="lead">Voit vaihtaa valintaa myöhemmin tiliasetuksista.</p>
    <button class="role-card" data-act="role" data-v="hirer"><strong>Etsin tekijää</strong><small>Tarvitsen apua esimerkiksi somessa, nettisivuissa tai kirjanpidossa</small></button>
    <button class="role-card" data-act="role" data-v="provider"><strong>Tarjoan palveluita</strong><small>Haluan asiakkaita ja keikkoja omalla osaamisellani</small></button>
    <button class="btn ghost block mt" data-act="logout">Kirjaudu ulos</button>
  </div>`;
}

function vKind() {
  const opts = S.role === 'hirer'
    ? [['person', 'Yksityishenkilö', 'Tarvitsen apua omaan projektiin'], ['business', 'Yritys', 'Pizzeria, kampaamo, ketju tai oma toiminimi']]
    : [['person', 'Opiskelija tai yksityinen osaaja', 'Myyn omaa osaamistani'], ['company', 'Yritys', 'Pieni toimisto, studio tai toiminimi']];
  return `<div class="page">
    <h1>Kuka olet?</h1>
    ${opts.map(([v, t, d]) => `<button class="role-card" data-act="kind" data-v="${v}"><strong>${t}</strong><small>${d}</small></button>`).join('')}
    <button class="btn ghost block mt" data-act="back-role">Takaisin</button>
  </div>`;
}

const field = (key, label, ph = '', type = 'input') => {
  const v = esc(S.profile[key] ?? '');
  return `<div class="field"><label for="f_${key}">${label}</label>${type === 'textarea'
    ? `<textarea id="f_${key}" class="text-in" data-field="${key}" placeholder="${esc(ph)}">${v}</textarea>`
    : `<input id="f_${key}" class="text-in" data-field="${key}" placeholder="${esc(ph)}" value="${v}">`}</div>`;
};

function vProfile() {
  const p = S.profile;
  const provider = p.role === 'provider';
  const company = p.kind === 'company' || p.kind === 'business';
  return `<header class="top"><div class="logo">${logo}Scouters</div><button class="btn ghost small" data-act="logout">Kirjaudu ulos</button></header>
  <main class="content" id="scroller">
    <h1 class="h">Tili</h1>
    <p class="sub">${provider ? 'Nämä tiedot näkyvät kortissasi tekijää etsiville.' : 'Nämä tiedot näkyvät kortissasi osaajille.'}</p>

    <div class="pad"><div class="prev" style="--c:${catOf(p.cats[0]).color}">
      <div class="prev-media">${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="">` : `<span class="mono">${esc(initials(p.name))}</span>`}</div>
      <div class="prev-body">
        <b>${esc(p.name || 'Nimesi')}</b>
        <span class="muted">${esc([p.industry || p.school, p.city].filter(Boolean).join(', ') || 'Täytä tiedot alta')}</span>
        <span class="price">${provider ? `alk. ${p.price} €` : `Budjetti ${p.price} €`}</span>
      </div>
    </div></div>

    <section class="sec"><h2>Kuva ja video</h2>
      <div class="media-row">
        <label class="media-btn">${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="">` : '<span>Lisää kuva</span>'}<input type="file" id="photoIn" accept="image/*"></label>
        ${provider ? `<label class="media-btn">${p.videoUrl ? '<span>Vaihda video</span>' : '<span>Lisää esittelyvideo</span>'}<input type="file" id="videoIn" accept="video/*"></label>` : ''}
      </div>
      ${provider && p.videoUrl ? `<video class="vid" src="${esc(p.videoUrl)}" controls playsinline></video>` : ''}
      <p class="hint">Pidä video 15–30 sekunnissa, muuten lataus on hidas ja Cloudinaryn kiintiö kuluu nopeasti.</p>
    </section>

    <section class="sec"><h2>Perustiedot</h2>
      ${field('name', company ? 'Yrityksen nimi' : 'Nimi')}
      ${field('about', provider ? 'Lyhyt esittely' : 'Kuvaus', provider ? 'Mitä teet ja kenelle?' : 'Kerro yrityksestäsi tai projektistasi', 'textarea')}
      ${field('city', 'Kaupunki', 'Esim. Espoo')}
      ${field('address', 'Osoite tai sijainti', 'Esim. Leppävaarankatu 3')}
      ${field('website', 'Verkkosivu', 'https://')}
      ${field('socials', 'Somekanavat', 'Esim. @scouters')}
      <label class="toggle">${provider ? 'Teen töitä myös etänä' : 'Etätyö käy'}<input type="checkbox" data-field="remote" ${p.remote ? 'checked' : ''}></label>
    </section>

    <section class="sec"><h2>${provider ? 'Osaaminen' : 'Mitä etsit'}</h2>
      <div class="field"><span class="lbl">Kategoriat</span><div class="chip-wrap">${CATS.map(c => `<button class="chip" data-act="cat" data-v="${c.id}" aria-pressed="${p.cats.includes(c.id)}">${c.name}</button>`).join('')}</div></div>
      ${provider ? field('skills', 'Taidot ja työkalut', 'Erottele pilkulla') : field('need', 'Tarkempi kuvaus tarpeesta', 'Esim. somevideoita ja uudet nettisivut', 'textarea')}
      <div class="field"><label for="f_price">${provider ? 'Aloitushinta' : 'Budjetti'} <span class="range-val" id="priceVal">${p.price} €</span></label>
        <input id="f_price" class="range" type="range" min="10" max="1000" step="10" value="${p.price}" data-field="price"></div>
      ${field('schedule', 'Aikataulu', 'Esim. lokakuun aikana')}
    </section>

    ${provider && p.kind === 'person' ? `<section class="sec"><h2>Koulutus</h2>
      ${field('school', 'Oppilaitos')}${field('program', 'Opinnot tai tutkinto-ohjelma')}
      ${field('degrees', 'Suoritetut tutkinnot')}${field('certs', 'Todistukset ja sertifikaatit', '', 'textarea')}
    </section>
    <section class="sec"><h2>Työ ja kokemus</h2>${field('job', 'Nykyinen työpaikka')}${field('experience', 'Aiempi kokemus alalta', '', 'textarea')}</section>` : ''}

    ${provider && p.kind === 'company' ? `<section class="sec"><h2>Yrityksen tiedot</h2>
      ${field('team', 'Tekijöiden määrä')}${field('founded', 'Perustamisvuosi')}${field('refs', 'Referenssit', '', 'textarea')}
    </section>` : ''}

    ${!provider ? `<section class="sec"><h2>Yrityksen tiedot</h2>
      ${field('industry', 'Toimiala', 'Esim. pizzeria')}${field('size', 'Yrityksen koko', 'Esim. 4 työntekijää')}
    </section>` : ''}

    <div class="pad"><button class="btn primary block" data-act="save" ${S.busy ? 'disabled' : ''}>Tallenna</button></div>
  </main>`;
}

function view() {
  switch (S.screen) {
    case 'login': return vLogin();
    case 'role': return vRole();
    case 'kind': return vKind();
    case 'profile': return vProfile();
    default: return vLoading();
  }
}
function render(keepScroll) {
  const sc = $('#scroller'), top = sc ? sc.scrollTop : 0;
  $('#view').innerHTML = view();
  const n = $('#scroller'); if (n && keepScroll) n.scrollTop = top;
}

/* ---------------- tapahtumat ---------------- */

$('#app').addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act, v = t.dataset.v;
  try {
    if (act === 'google') { await googleLogin(); return; }
    if (act === 'email-login' || act === 'email-signup') {
      await emailLogin($('#email').value, $('#pw').value, act === 'email-signup'); return;
    }
    if (act === 'logout') { await logOut(); return; }
    if (act === 'role') { S.role = v; S.screen = 'kind'; render(); return; }
    if (act === 'back-role') { S.screen = 'role'; render(); return; }
    if (act === 'kind') {
      S.kind = v;
      S.profile = await createProfile(S.user.uid, S.role, v, {
        name: S.user.displayName || '', photoUrl: S.user.photoURL || ''
      });
      S.screen = 'profile'; render(); toast('Profiili luotu. Täydennä tiedot.'); return;
    }
    if (act === 'cat') {
      const cats = S.profile.cats, i = cats.indexOf(v);
      if (i >= 0) cats.splice(i, 1); else cats.push(v);
      t.setAttribute('aria-pressed', cats.includes(v));
      render(true); return;
    }
    if (act === 'save') {
      S.busy = true; render(true);
      const p = { ...S.profile };
      p.skills = typeof p.skills === 'string' ? p.skills.split(',').map(s => s.trim()).filter(Boolean) : p.skills;
      await saveProfile(S.user.uid, p);
      S.busy = false; render(true); toast('Tiedot tallennettu');
    }
  } catch (err) {
    S.busy = false; render(true);
    toast(err && err.code && String(err.code).startsWith('auth/') ? authError(err) : 'Toiminto ei onnistunut. Tarkista verkkoyhteys.');
    console.error(err);
  }
});

$('#app').addEventListener('input', e => {
  const el = e.target, f = el.dataset.field;
  if (!f || el.type === 'checkbox' || el.type === 'file') return;
  S.profile[f] = f === 'price' ? +el.value : el.value;
  if (f === 'price') { const pv = $('#priceVal'); if (pv) pv.textContent = el.value + ' €'; }
});

$('#app').addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.field === 'remote') { S.profile.remote = el.checked; return; }
  if ((el.id === 'photoIn' || el.id === 'videoIn') && el.files && el.files[0]) {
    const isVideo = el.id === 'videoIn';
    toast(isVideo ? 'Ladataan videota…' : 'Ladataan kuvaa…');
    try {
      const url = await uploadMedia(el.files[0], CLOUDINARY, isVideo ? 'video' : 'image');
      S.profile[isVideo ? 'videoUrl' : 'photoUrl'] = url;
      await saveProfile(S.user.uid, { [isVideo ? 'videoUrl' : 'photoUrl']: url });
      render(true); toast(isVideo ? 'Video lisätty' : 'Kuva lisätty');
    } catch (err) { console.error(err); toast(err.message || 'Lataus ei onnistunut'); }
  }
});

/* ---------------- käynnistys ---------------- */

render();
watchAuth(async user => {
  S.user = user;
  if (!user) { S.profile = null; S.screen = 'login'; render(); return; }
  S.profile = await getProfile(user.uid);
  if (!S.profile) { S.screen = 'role'; render(); return; }
  if (typeof S.profile.skills === 'object') S.profile.skills = (S.profile.skills || []).join(', ');
  S.screen = 'profile'; render();
});
