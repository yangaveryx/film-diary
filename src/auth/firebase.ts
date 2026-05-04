/// <reference types="vite/client" />
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

declare global {
  interface Window { firebaseConfig?: Record<string, any> }
}

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const config = (window as any).firebaseConfig || (globalThis as any).firebaseConfig || envConfig;

if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
  throw new Error('Missing Firebase client config. Set VITE_FIREBASE_* env vars or window.firebaseConfig.');
}

if (!firebase.apps.length && config) {
  firebase.initializeApp(config);
}

const auth = firebase.auth();

const onAuthStateChanged = (cb: (user: firebase.User | null) => void) => auth.onAuthStateChanged(cb);

const signIn = (email: string, password: string) => {
  return auth.signInWithEmailAndPassword(email, password);
};

const createUser = (email: string, password: string) => {
  return auth.createUserWithEmailAndPassword(email, password);
};

const signOut = () => {
  return auth.signOut();
};

const getIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  return user ? user.getIdToken(true) : null;
};

export { auth, onAuthStateChanged, signIn, createUser, signOut, getIdToken };
