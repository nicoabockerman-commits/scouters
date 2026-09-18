// Tili-näkymä. Molemmilla rooleilla yhtä laaja profiili: erot ovat vain
// kenttien nimissä, eivät siinä kuinka paljon tietoa voi kertoa.
import { CATS } from './model.js';
import { esc, userCard } from './ui.js';

export function previewUser(S) {
  const p = S.profile;
  return {
    ...p,
    name: p.name || (p.kind === 'person' ? 'Nimesi' : 'Yrityksesi nimi'),
    skills: typeof p.skills === 'string' ? p.skills.split(',').map(s => s.trim()).filter(Boolean) : (p.skills || [])
  };
}

const field = (S, key, label, ph = '', type = 'input') => {
  const v = esc(S.profile[key] ?? '');
  return `<div class="field"><label for="f_${key}">${label}</label>${type === 'textarea'
    ? `<textarea id="f_${key}" class="text-in" data-field="${key}" placeholder="${esc(ph)}">${v}</textarea>`
    : `<input id="f_${key}" class="text-in" data-field="${key}" placeholder="${esc(ph)}" value="${v}">`}</div>`;
};

export function viewProfile(S) {
  const p = S.profile;
  const provider = p.role === 'provider';
  const company = p.kind !== 'person';
  return `<main class="content" id="scroller">
    <h1 class="h">Tili</h1>
    <p class="sub">${provider ? 'Tältä korttisi näyttää tekijää etsiville.' : 'Tältä korttisi näyttää osaajille.'}</p>

    <div class="pad" id="myCard">${userCard(previewUser(S), { key: 'me', cls: 'static', own: true })}</div>

    <section class="sec"><h2>Kuva ja video</h2>
      <div class="media-row">
        <label class="media-btn">${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt=""><span class="over">Vaihda</span>` : `<span>${company ? 'Lisää logo tai kuva' : 'Lisää kuva'}</span>`}<input type="file" id="photoIn" accept="image/*"></label>
        <label class="media-btn">${p.videoUrl ? '<span>Vaihda video</span>' : '<span>Lisää esittelyvideo</span>'}<input type="file" id="videoIn" accept="video/*"></label>
      </div>
      ${p.videoUrl ? `<video class="vid" src="${esc(p.videoUrl)}" controls playsinline></video>` : ''}
      <p class="hint">Pidä video 15–30 sekunnissa. ${provider ? 'Kerro kuka olet ja mitä teet asiakkaille.' : 'Kerro yrityksestäsi ja siitä, millaista tekijää etsit.'}</p>
    </section>

    <section class="sec"><h2>Perustiedot</h2>
      ${field(S, 'name', company ? 'Yrityksen nimi' : 'Nimi')}
      ${field(S, 'about', 'Lyhyt esittely', provider ? 'Mitä teet ja kenelle?' : 'Millainen yritys tai projekti on kyseessä?', 'textarea')}
      ${field(S, 'city', 'Kaupunki', 'Esim. Espoo')}
      ${field(S, 'address', 'Osoite tai sijainti', 'Esim. Leppävaarankatu 3')}
      ${field(S, 'website', 'Verkkosivu', 'https://')}
      ${field(S, 'socials', 'Somekanavat', 'Esim. @scouters')}
      <label class="toggle">${provider ? 'Teen töitä myös etänä' : 'Etätyö käy'}<input type="checkbox" data-field="remote" ${p.remote ? 'checked' : ''}></label>
    </section>

    <section class="sec"><h2>${provider ? 'Osaaminen' : 'Mitä etsit'}</h2>
      <div class="field"><span class="lbl">Kategoriat</span><div class="chip-wrap">${CATS.map(c => `<button class="chip" data-act="pcat" data-v="${c.id}" aria-pressed="${p.cats.includes(c.id)}" style="--c:${c.color}"><span class="cdot"></span>${c.name}</button>`).join('')}</div></div>
      ${provider ? field(S, 'skills', 'Taidot ja työkalut', 'Erottele pilkulla') : field(S, 'need', 'Tarkempi kuvaus tarpeesta', 'Esim. somevideoita ja uudet nettisivut', 'textarea')}
      <div class="field"><label for="f_price">${provider ? 'Aloitushinta' : 'Budjetti'} <span class="range-val" id="priceVal">${p.price} €</span></label>
        <input id="f_price" class="range" type="range" min="10" max="1000" step="10" value="${p.price}" data-field="price"></div>
      ${field(S, 'schedule', 'Aikataulu', 'Esim. lokakuun aikana')}
    </section>

    ${provider && !company ? `<section class="sec"><h2>Koulutus</h2>
      ${field(S, 'school', 'Oppilaitos', 'Esim. Estonian Business School')}
      ${field(S, 'program', 'Opinnot tai tutkinto-ohjelma')}
      ${field(S, 'degrees', 'Suoritetut tutkinnot', 'Esim. ylioppilas, merkonomi')}
      ${field(S, 'certs', 'Todistukset ja sertifikaatit', 'Esim. Google Ads -sertifikaatti', 'textarea')}
    </section>
    <section class="sec"><h2>Työ ja kokemus</h2>
      ${field(S, 'job', 'Nykyinen työpaikka')}
      ${field(S, 'experience', 'Aiempi kokemus alalta', 'Mitä olet tehnyt ja kenelle?', 'textarea')}
    </section>` : ''}

    ${provider && company ? `<section class="sec"><h2>Yrityksen tiedot</h2>
      ${field(S, 'team', 'Tekijöiden määrä')}
      ${field(S, 'founded', 'Perustamisvuosi')}
      ${field(S, 'refs', 'Referenssit', 'Asiakkaat ja projektit, joista voit kertoa', 'textarea')}
    </section>` : ''}

    ${!provider ? `<section class="sec"><h2>${company ? 'Yrityksen tiedot' : 'Taustatiedot'}</h2>
      ${field(S, 'industry', 'Toimiala', 'Esim. pizzeria')}
      ${company ? field(S, 'size', 'Yrityksen koko', 'Esim. 4 työntekijää') : ''}
      ${field(S, 'refs', 'Aiemmat yhteistyöt', 'Kenen kanssa olet tehnyt töitä aiemmin?', 'textarea')}
    </section>` : ''}

    <div class="pad">
      <button class="btn primary block" data-act="save" ${S.busy ? 'disabled' : ''}>Tallenna</button>
      <button class="btn ghost block mt" data-act="logout">Kirjaudu ulos</button>
    </div>
  </main>`;
}
