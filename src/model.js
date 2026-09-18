// Sovelluksen tietomalli ja jaetut vakiot.

export const CATS = [
  { id: 'some',    name: 'Markkinointi & some',  color: '#FF7A1A' },
  { id: 'web',     name: 'Nettisivut',           color: '#5B3DF5' },
  { id: 'ai',      name: 'AI-palvelut',          color: '#0E9F9E' },
  { id: 'video',   name: 'Videokuvaus',          color: '#E5484D' },
  { id: 'photo',   name: 'Valokuvaus',           color: '#C43BD9' },
  { id: 'design',  name: 'Grafiikka & logot',    color: '#E39A0B' },
  { id: 'finance', name: 'Kirjanpito & talous',  color: '#1C9E6A' },
  { id: 'it',      name: 'IT-tuki',              color: '#2F7BEA' },
  { id: 'text',    name: 'Tekstit & käännökset', color: '#5F6E8C' }
];
export const catOf = id => CATS.find(c => c.id === id) || CATS[0];

// users/{uid}
// Yhteiset kentät molemmilla rooleilla, jotta tili on yhtä laaja kummallakin.
export function emptyProfile(uid, role, kind, seed = {}) {
  return {
    uid,
    role,                 // 'provider' = tarjoaa palveluita, 'hirer' = etsii tekijää
    kind,                 // provider: 'person' | 'company', hirer: 'person' | 'business'
    name: seed.name || '',
    about: '',
    city: '',
    address: '',          // katuosoite tai sijainti, esim. "Leppävaarankatu 3"
    remote: true,
    cats: [],             // kategoriat: mitä osaa tai mitä etsii
    skills: [],
    price: 150,           // provider: aloitushinta, hirer: budjetti
    schedule: '',         // aikataulu, esim. "lokakuun aikana"
    website: '',
    socials: '',
    photoUrl: seed.photoUrl || '',
    videoUrl: '',

    // provider, henkilö
    school: '', program: '', degrees: '', certs: '', job: '', experience: '',
    // provider, yritys
    team: '', founded: '', refs: '',
    // hirer
    industry: '', need: '', size: '',

    birthYear: 0,
    consentAt: null,
    blocked: [],

    ratingAvg: 0,
    ratingCount: 0,
    active: true,
    createdAt: null,
    updatedAt: null
  };
}

export const MIN_AGE = 15;
export const MAX_UPLOAD_MB = 10;

// likes/{fromUid_toUid}   { from, to, dir: 'like' | 'super' | 'pass', createdAt }
// matches/{uidA_uidB}     { users: [a, b], status: 'active' | 'completed',
//                           lastMessage, lastAt, completedBy, completedAt, createdAt }
// matches/{id}/messages/{msgId}  { from, text, createdAt }
// gigs/{gigId}            { ownerUid, title, cat, city, budget, deadline, desc,
//                           tags, open, createdAt }
// reviews/{matchId_fromUid}      { matchId, from, to, stars, text, published, createdAt }

export const matchIdFor = (a, b) => [a, b].sort().join('_');
export const likeIdFor = (from, to) => `${from}_${to}`;
