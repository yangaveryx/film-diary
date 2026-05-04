import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

declare global {
  interface Window { firebaseConfig?: Record<string, any> }
}

const config = (window as any).firebaseConfig || (globalThis as any).firebaseConfig || {
  apiKey: "***REMOVED***",
  authDomain: "trends-final-project-f289d.firebaseapp.com",
  projectId: "trends-final-project-f289d",
  storageBucket: "trends-final-project-f289d.firebasestorage.app",
  messagingSenderId: "1052702315028",
  appId: "1:1052702315028:web:173404e3ef2786f933cd01"
};

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
