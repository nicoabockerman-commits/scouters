// Kirjautuminen: Google tai sähköposti ja salasana.
import {
  GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser
} from 'firebase/auth';
import { auth } from './firebase.js';

export const watchAuth = cb => onAuthStateChanged(auth, cb);
export const logOut = () => signOut(auth);

export async function googleLogin() {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function emailLogin(email, password, isNew) {
  const fn = isNew ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
  const res = await fn(auth, email.trim(), password);
  return res.user;
}

// Tunnuksen poisto onnistuu vain tuoreella kirjautumisella. Jos ei onnistu,
// profiili on jo poistettu ja käyttäjää pyydetään kirjautumaan uudelleen.
export async function deleteAccount() {
  const u = auth.currentUser;
  if (!u) return 'nouser';
  try { await deleteUser(u); return 'deleted'; }
  catch (e) { return 'relogin'; }
}

// Firebase palauttaa englanninkieliset virheet, joten käännetään yleisimmät.
export function authError(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-email')) return 'Sähköpostiosoite ei kelpaa.';
  if (c.includes('missing-password') || c.includes('weak-password')) return 'Salasanan pitää olla vähintään kuusi merkkiä.';
  if (c.includes('email-already-in-use')) return 'Tunnus on jo olemassa. Kirjaudu sisään.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Tunnus tai salasana ei täsmää.';
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Kirjautumisikkuna suljettiin.';
  if (c.includes('network')) return 'Verkkoyhteydessä on ongelma.';
  return 'Kirjautuminen ei onnistunut. Yritä uudelleen.';
}
