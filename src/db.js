// Kaikki Firestore-kutsut yhdessä paikassa, jotta käyttöliittymä pysyy siistinä.
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where,
  orderBy, limit, onSnapshot, serverTimestamp, arrayRemove
} from 'firebase/firestore';
import { db } from './firebase.js';
import { emptyProfile, matchIdFor, likeIdFor } from './model.js';

/* ---------- profiilit ---------- */

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function createProfile(uid, role, kind, seed) {
  const data = {
    ...emptyProfile(uid, role, kind, seed),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', uid), data);
  return data;
}

// Tallentaa vain muuttuneet kentät. ratingAvg ja ratingCount jätetään pois,
// koska säännöt eivät salli niiden muuttamista käsin.
export async function saveProfile(uid, patch) {
  const clean = { ...patch };
  delete clean.ratingAvg; delete clean.ratingCount;
  delete clean.createdAt; delete clean.uid;
  clean.updatedAt = serverTimestamp();
  await updateDoc(doc(db, 'users', uid), clean);
}

/* ---------- selaus ---------- */

// Osaaja selaa tekijää etsiviä ja päinvastoin. Kaikki samassa pakassa.
export async function fetchDeck({ myUid, myRole, cat = null, max = 40 }) {
  const wanted = myRole === 'provider' ? 'hirer' : 'provider';
  const parts = [where('role', '==', wanted), where('active', '==', true)];
  if (cat) parts.push(where('cats', 'array-contains', cat));
  const q = query(collection(db, 'users'), ...parts, orderBy('updatedAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  const seen = await myLikedIds(myUid);
  return snap.docs.map(d => d.data()).filter(u => u.uid !== myUid && !seen.has(u.uid));
}

// Keikkailmoitukset näkyvät samassa pakassa profiilien kanssa.
export async function fetchGigs({ myRole, cat = null, max = 30 } = {}) {
  const wanted = myRole === 'provider' ? 'hirer' : 'provider';
  const parts = [where('open', '==', true), where('ownerRole', '==', wanted)];
  if (cat) parts.push(where('cat', '==', cat));
  const q = query(collection(db, 'gigs'), ...parts, orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Ilmoituksen voi jättää kumpi tahansa osapuoli: yritys etsii tekijää,
// osaaja tarjoaa palvelua. Nimi ja rooli kopioidaan mukaan, jotta kortin
// piirtäminen ei vaadi erillistä hakua.
export async function createGig(owner, gig) {
  return addDoc(collection(db, 'gigs'), {
    ownerUid: owner.uid,
    ownerName: owner.name || '',
    ownerRole: owner.role,
    ownerKind: owner.kind,
    open: true,
    tags: [],
    createdAt: serverTimestamp(),
    ...gig
  });
}

/* ---------- tykkäykset ja matchit ---------- */

async function myLikedIds(myUid) {
  const q = query(collection(db, 'likes'), where('from', '==', myUid), limit(500));
  const snap = await getDocs(q);
  return new Set(snap.docs.map(d => d.data().to));
}

// Palauttaa matchin id:n, jos kiinnostus oli molemminpuolista.
export async function like(myUid, targetUid, dir = 'like') {
  console.log('Scouters: tallennetaan tykkäys', { myUid, targetUid, dir });
  await setDoc(doc(db, 'likes', likeIdFor(myUid, targetUid)), {
    from: myUid, to: targetUid, dir, createdAt: serverTimestamp()
  });
  console.log('Scouters: tykkäys tallennettu');
  if (dir === 'pass') return null;

  const back = await getDoc(doc(db, 'likes', likeIdFor(targetUid, myUid)));
  console.log('Scouters: tykkäsikö toinen jo?', back.exists(), back.exists() ? back.data().dir : '-');
  if (!back.exists() || back.data().dir === 'pass') return null;

  const id = matchIdFor(myUid, targetUid);
  const existing = await getDoc(doc(db, 'matches', id));
  if (existing.exists()) return id;

  // Luodaan kerran ilman mergeä: säännöt sallivat myöhemmin vain viestikenttien
  // ja tilan päivityksen, joten koko dokumenttia ei saa kirjoittaa uudelleen.
  await setDoc(doc(db, 'matches', id), {
    users: [myUid, targetUid].sort(),
    status: 'active',
    lastMessage: '',
    lastAt: serverTimestamp(),
    completedBy: '',
    completedAt: null,
    createdAt: serverTimestamp()
  });
  return id;
}

// Ketkä ovat tykänneet minusta ilman että olen vastannut.
export async function whoLikedMe(myUid) {
  const q = query(collection(db, 'likes'), where('to', '==', myUid), limit(100));
  const snap = await getDocs(q);
  const mine = await myLikedIds(myUid);
  return snap.docs.map(d => d.data()).filter(l => l.dir !== 'pass' && !mine.has(l.from));
}

export function watchMatches(myUid, cb) {
  const q = query(collection(db, 'matches'), where('users', 'array-contains', myUid),
    orderBy('lastAt', 'desc'), limit(50));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function completeMatch(matchId, myUid) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'completed', completedBy: myUid, completedAt: serverTimestamp()
  });
}

/* ---------- viestit ---------- */

export function watchMessages(matchId, cb) {
  const q = query(collection(db, 'matches', matchId, 'messages'), orderBy('createdAt', 'asc'), limit(200));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function sendMessage(matchId, myUid, text) {
  const clean = String(text).trim().slice(0, 2000);
  if (!clean) return;
  await addDoc(collection(db, 'matches', matchId, 'messages'), {
    from: myUid, text: clean, createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'matches', matchId), {
    lastMessage: clean.slice(0, 120), lastAt: serverTimestamp()
  });
}

/* ---------- arvostelut ---------- */

export async function writeReview(matchId, from, to, stars, text) {
  await setDoc(doc(db, 'reviews', `${matchId}_${from}`), {
    matchId, from, to,
    stars: Math.max(1, Math.min(5, Math.round(stars))),
    text: String(text || '').slice(0, 1000),
    published: false,
    createdAt: serverTimestamp()
  });
  await publishIfBothDone(matchId, from, to);
}

// Molemmat arvostelut julkaistaan vasta, kun kumpikin on kirjoittanut omansa.
async function publishIfBothDone(matchId, a, b) {
  const mine = doc(db, 'reviews', `${matchId}_${a}`);
  const theirs = doc(db, 'reviews', `${matchId}_${b}`);
  const other = await getDoc(theirs);
  if (!other.exists()) return false;
  await updateDoc(mine, { published: true });
  await updateDoc(theirs, { published: true });
  return true;
}

export async function reviewsFor(uid, max = 20) {
  const q = query(collection(db, 'reviews'), where('to', '==', uid),
    where('published', '==', true), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function myReview(matchId, myUid) {
  const snap = await getDoc(doc(db, 'reviews', `${matchId}_${myUid}`));
  return snap.exists() ? snap.data() : null;
}

/* ---------- Cloudinary ---------- */

export async function uploadMedia(file, { cloudName, preset }, kind = 'image') {
  if (!cloudName || cloudName === 'TAYTA_TAHAN') throw new Error('Cloudinaryn cloud name puuttuu src/firebase.js-tiedostosta');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${kind === 'video' ? 'video' : 'image'}/upload`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Lataus epäonnistui');
  const data = await res.json();
  return data.secure_url;
}

export { arrayRemove };
