// Firebase-yhteys. Nämä arvot ovat julkisia ja näkyvät joka tapauksessa
// selaimessa: suojaus hoidetaan firestore.rules-tiedoston säännöillä.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBFydqtyQ7JbSdHghw-IksCh06_ZZyxgHg',
  authDomain: 'scouters-2789d.firebaseapp.com',
  projectId: 'scouters-2789d',
  storageBucket: 'scouters-2789d.firebasestorage.app',
  messagingSenderId: '150837471574',
  appId: '1:150837471574:web:be377dfebd632b4e95cef7'
};

// Cloudinary: cloud name ja unsigned upload preset.
// Täytä cloudName, kun olet luonut Cloudinary-tilin.
export const CLOUDINARY = {
  cloudName: 'dicmfqyhr',
  preset: 'scouters'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
