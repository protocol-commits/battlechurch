import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
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
let bestScoreCache = null;

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

async function initCloud() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    if (!auth.currentUser) {
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

async function loadBestScore() {
  await initCloud();
  if (!user) return null;
  const snap = await getDoc(doc(db, "players", user.uid));
  if (!snap.exists()) {
    bestScoreCache = null;
    return null;
  }
  const raw = snap.data()?.bestScore;
  const value = Number(raw);
  bestScoreCache = Number.isFinite(value) ? value : null;
  return bestScoreCache;
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
  await setDoc(doc(db, "players", user.uid), data, { merge: true });
  return true;
}

async function saveBestScore(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return false;
  await initCloud();
  if (!user) return false;
  if (bestScoreCache == null) {
    await loadBestScore();
  }
  if (Number.isFinite(bestScoreCache) && numericScore <= bestScoreCache) {
    return false;
  }
  await setDoc(doc(db, "players", user.uid), { bestScore: numericScore }, { merge: true });
  bestScoreCache = numericScore;
  return true;
}

window.Cloud = {
  initCloud,
  loadBestScore,
  saveBestScore,
  loadPlayerDoc,
  savePlayerDoc,
};
