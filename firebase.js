import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPeMw751cSbhpT7SDxAUyj_H4HYsD8XyQ",
  authDomain: "battlechurch-866c2.firebaseapp.com",
  projectId: "battlechurch-866c2",
  storageBucket: "battlechurch-866c2.firebasestorage.app",
  messagingSenderId: "657219537020",
  appId: "1:657219537020:web:15adb9cb18dc0c1295e1f9",
  measurementId: "G-HJJR1FHFGN",
};

let app = null;
let auth = null;
let db = null;
let user = null;
let initPromise = null;
let authListenerBound = false;

async function ensureUser() {
  if (user) return user;
  await new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (nextUser) {
          user = nextUser;
          unsub();
          resolve();
        }
      },
      (err) => {
        unsub();
        reject(err);
      },
    );
  });
  return user;
}

function updateAuthGlobals(nextUser) {
  if (typeof window === "undefined") return;
  window.cloudUid = nextUser?.uid || null;
  window.cloudIsAnonymous = Boolean(nextUser?.isAnonymous);
  window.cloudAuthProvider = nextUser?.isAnonymous ? "anonymous" : (nextUser ? "google" : null);
  window.cloudEmail = nextUser?.email || null;
  window.cloudDisplayName = nextUser?.displayName || null;
  window.cloudPhotoUrl = nextUser?.photoURL || null;
}

async function initCloud() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    if (!authListenerBound) {
      authListenerBound = true;
      onAuthStateChanged(auth, (nextUser) => {
        user = nextUser || null;
        updateAuthGlobals(user);
      });
    }
    // Wait for Firebase to restore any persisted session before falling back
    // to anonymous auth. Without this, we can clobber a valid Google session.
    const restoredUser = await new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(
        auth,
        (nextUser) => {
          unsub();
          resolve(nextUser || null);
        },
        (err) => {
          unsub();
          reject(err);
        },
      );
    });
    if (restoredUser) {
      user = restoredUser;
      updateAuthGlobals(user);
    } else {
      await signInAnonymously(auth);
    }
    await ensureUser();
    if (typeof window !== "undefined") {
      window.cloudUid = user?.uid || null;
    }
    return user;
  })();
  return initPromise;
}

async function loadPlayerDoc() {
  await initCloud();
  if (!user) return null;
  const snap = await getDoc(doc(db, "players", user.uid));
  if (!snap.exists()) return null;
  return snap.data() || null;
}

async function savePlayerDoc(data) {
  await initCloud();
  if (!user || !data || typeof data !== "object") return false;
  // Full overwrite is required so removed nested save-file keys are truly deleted.
  await setDoc(doc(db, "players", user.uid), data);
  return true;
}

async function resetPlayerProgress() {
  await initCloud();
  if (!user) return false;
  const freshMapProgress = { version: 2, towns: {}, unlockedTownIds: [] };
  const freshDoc = {
    saveFiles: {
      save_1: {
        saveName: "Save 1",
        playerName: "Pastor",
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        playtimeSec: 0,
        mapProgress: freshMapProgress,
      },
    },
    activeSaveId: "save_1",
    mapProgress: freshMapProgress,
  };
  await setDoc(doc(db, "players", user.uid), freshDoc);
  return true;
}

async function signInWithGoogle() {
  await initCloud();
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    user = result?.user || auth.currentUser || null;
    updateAuthGlobals(user);
    return user;
  } catch (err) {
    await signInAnonymously(auth);
    user = auth.currentUser || null;
    updateAuthGlobals(user);
    return user;
  }
}

async function signOutCloud() {
  await initCloud();
  if (!auth) return null;
  await signOut(auth);
  await signInAnonymously(auth);
  user = auth.currentUser || null;
  updateAuthGlobals(user);
  return user;
}

window.Cloud = {
  initCloud,
  loadPlayerDoc,
  savePlayerDoc,
  resetPlayerProgress,
  signInWithGoogle,
  signOut: signOutCloud,
};
