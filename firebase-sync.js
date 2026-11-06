import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, onSnapshot,
  writeBatch, runTransaction
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const loginForm = $("loginForm");
const loginBtn = $("loginBtn");
const loginMessage = $("loginMessage");
const loginScreen = $("loginScreen");
const cloudStatus = $("cloudStatus");

let auth = null;
let db = null;
let activeUser = null;
let workspaceReady = false;
let stopListeners = [];
let flushTimer = null;
let flushing = false;
let flushAgain = false;
let knownSims = new Map();
let knownWanted = new Map();
let knownCounters = { T: 0, M: 0, O: 0, S: 0 };
const dirtySims = new Map();
const dirtyWanted = new Map();
let dirtyCounters = null;
let restorePending = false;
let importRequested = false;

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) out[key] = clean(val);
    }
    return out;
  }
  return value;
};
const stable = (value) => JSON.stringify(clean(value));
const countersOf = (value = {}) => ({
  T: Number(value.T) || 0,
  M: Number(value.M) || 0,
  O: Number(value.O) || 0,
  S: Number(value.S) || 0
});

function setLoginMessage(message, type = "") {
  loginMessage.textContent = message || "";
  loginMessage.className = `login-message ${type}`.trim();
}
function setStatus(message, type = "") {
  const lower = String(message || "").toLowerCase();
  let state = type;
  if (!state) {
    if (/error|failed|denied/.test(lower)) state = "error";
    else if (/offline/.test(lower)) state = "offline";
    else if (/waiting|syncing|connecting|changes sync/.test(lower)) state = "pending";
    else state = "synced";
  }
  // Header remains minimal: show a state icon and expose the full detail on hover/focus.
  cloudStatus.textContent = message || "";
  cloudStatus.className = `cloud-status ${state}`.trim();
  cloudStatus.title = message || "";
  cloudStatus.setAttribute("aria-label", message || state || "Sync status");
}
function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential": "Email বা password সঠিক নয়। আবার পরীক্ষা করুন।",
    "auth/invalid-email": "সঠিক email address লিখুন।",
    "auth/user-disabled": "এই account বন্ধ করা হয়েছে। Firebase administrator-এর সঙ্গে যোগাযোগ করুন।",
    "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    "auth/network-request-failed": "ইন্টারনেট সংযোগ পরীক্ষা করুন।",
    "permission-denied": "Firestore Rules অনুমতি দেয়নি। Rules Publish হয়েছে এবং allowedUsers collection-এ তোমার UID-এর active=true document আছে কি না দেখুন।",
    "unauthenticated": "সেশন শেষ হয়েছে। আবার Sign in করুন।"
  };
  return messages[code] || error?.message || "একটি অপ্রত্যাশিত সমস্যা হয়েছে।";
}
function setSignedInView(user) {
  activeUser = user;
  document.body.classList.add("sim-authenticated");
  loginScreen.hidden = true;
  const old = $("cloudUserEmail");
  if (old) old.remove();
}

function setSignedOutView() {
  activeUser = null;
  workspaceReady = false;
  document.body.classList.remove("sim-authenticated");
  loginScreen.hidden = false;
  const old = $("cloudUserEmail");
  if (old) old.remove();
  setStatus("Signed out", "offline");
  stopWorkspaceListeners();
  window.SIM_MANAGER_BRIDGE?.clearUserState?.();
}
function stopWorkspaceListeners() {
  for (const stop of stopListeners) {
    try { stop(); } catch { /* no-op */ }
  }
  stopListeners = [];
  workspaceReady = false;
  knownSims = new Map();
  knownWanted = new Map();
  knownCounters = { T: 0, M: 0, O: 0, S: 0 };
  dirtySims.clear();
  dirtyWanted.clear();
  dirtyCounters = null;
  restorePending = false;
  importRequested = false;
  if (flushTimer) clearTimeout(flushTimer);
}

function userRefs(uid) {
  return {
    sims: collection(db, "users", uid, "sims"),
    wanted: collection(db, "users", uid, "wanted"),
    meta: doc(db, "users", uid, "meta", "main")
  };
}
function pendingStorageKey(uid) {
  return `simManagerCloudPending_v1_${String(uid).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
function persistPending(uid = activeUser?.uid) {
  if (!uid) return;
  const key = pendingStorageKey(uid);
  const payload = {
    sims: [...dirtySims.entries()],
    wanted: [...dirtyWanted.entries()],
    counters: dirtyCounters ? countersOf(dirtyCounters) : null,
    importRequested: !!importRequested
  };
  try {
    if (!payload.sims.length && !payload.wanted.length && !payload.counters && !payload.importRequested) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(payload));
    }
  } catch (error) {
    console.warn("Could not persist pending cloud changes in this browser", error);
  }
}
function loadPendingQueue(uid) {
  dirtySims.clear();
  dirtyWanted.clear();
  dirtyCounters = null;
  try {
    const raw = localStorage.getItem(pendingStorageKey(uid));
    if (!raw) return;
    const pending = JSON.parse(raw);
    for (const [id, value] of Array.isArray(pending.sims) ? pending.sims : []) {
      if (typeof id === "string") dirtySims.set(id, value === null ? null : clean(value));
    }
    for (const [id, value] of Array.isArray(pending.wanted) ? pending.wanted : []) {
      if (typeof id === "string") dirtyWanted.set(id, value === null ? null : clean(value));
    }
    if (pending.counters) dirtyCounters = countersOf(pending.counters);
    importRequested = !!pending.importRequested;
  } catch (error) {
    console.warn("Pending cloud queue was invalid and has been discarded", error);
    try { localStorage.removeItem(pendingStorageKey(uid)); } catch { /* no-op */ }
  }
}
function snapshotMap(snapshot) {
  const map = new Map();
  snapshot.forEach((item) => map.set(item.id, clean(item.data())));
  return map;
}
function snapshotArray(map) {
  return [...map.values()].map((item) => clean(item));
}
function mergeWithDirty(cloudMap, dirtyMap) {
  const merged = new Map(cloudMap);
  for (const [id, value] of dirtyMap) {
    if (value === null) merged.delete(id);
    else merged.set(id, clean(value));
  }
  return merged;
}
function publishMergedState() {
  if (!activeUser || !window.SIM_MANAGER_BRIDGE) return;
  const sims = mergeWithDirty(knownSims, dirtySims);
  const wanted = mergeWithDirty(knownWanted, dirtyWanted);
  const counters = dirtyCounters ? countersOf(dirtyCounters) : countersOf(knownCounters);
  window.SIM_MANAGER_BRIDGE.applyRemote({
    sims: snapshotArray(sims),
    wanted: snapshotArray(wanted),
    counters
  });
}
function detectLocalChanges() {
  if (!workspaceReady || !window.SIM_MANAGER_BRIDGE) return;
  const state = window.SIM_MANAGER_BRIDGE.getData();
  const currentSims = new Map((state.sims || []).filter(x => x?.id).map(x => [x.id, clean(x)]));
  const currentWanted = new Map((state.wanted || []).filter(x => x?.id).map(x => [x.id, clean(x)]));

  const simIds = new Set([...knownSims.keys(), ...currentSims.keys(), ...dirtySims.keys()]);
  for (const id of simIds) {
    const current = currentSims.get(id);
    const cloud = knownSims.get(id);
    if (!current && cloud) dirtySims.set(id, null);
    else if (current && (!cloud || stable(current) !== stable(cloud))) dirtySims.set(id, current);
    else dirtySims.delete(id);
  }

  const wantedIds = new Set([...knownWanted.keys(), ...currentWanted.keys(), ...dirtyWanted.keys()]);
  for (const id of wantedIds) {
    const current = currentWanted.get(id);
    const cloud = knownWanted.get(id);
    if (!current && cloud) dirtyWanted.set(id, null);
    else if (current && (!cloud || stable(current) !== stable(cloud))) dirtyWanted.set(id, current);
    else dirtyWanted.delete(id);
  }

  const localCounters = countersOf(state.counters);
  const higher = Object.keys(localCounters).some(k => localCounters[k] > (knownCounters[k] || 0));
  dirtyCounters = higher ? localCounters : null;
}
function scheduleFlush() {
  if (!activeUser || !workspaceReady) return;
  detectLocalChanges();
  persistPending();
  const pending = dirtySims.size + dirtyWanted.size + (dirtyCounters ? 1 : 0) + (importRequested ? 1 : 0);
  if (!pending) {
    setStatus(navigator.onLine ? "Live · synced" : "Offline · saved here", navigator.onLine ? "" : "offline");
    return;
  }
  setStatus(`${pending} change(s) waiting to sync`, "pending");
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushChanges().catch((error) => {
    console.error("Cloud sync failed", error);
    setStatus("Sync error · local copy kept", "error");
  }), 450);
}

async function commitMapChanges(ref, dirtyMap, knownMap, userId) {
  if (activeUser?.uid !== userId) return;
  const entries = [...dirtyMap.entries()];
  for (let offset = 0; offset < entries.length; offset += 400) {
    if (activeUser?.uid !== userId) return;
    const chunk = entries.slice(offset, offset + 400);
    const batch = writeBatch(db);
    for (const [id, value] of chunk) {
      const target = doc(ref, id);
      if (value === null) batch.delete(target);
      else batch.set(target, clean(value));
    }
    await batch.commit();
    if (activeUser?.uid !== userId) return;
    for (const [id, value] of chunk) {
      const latest = dirtyMap.get(id);
      if (stable(latest) === stable(value)) {
        dirtyMap.delete(id);
        if (value === null) knownMap.delete(id);
        else knownMap.set(id, clean(value));
      }
    }
  }
}
async function syncCountersMax(counters, userId) {
  const ref = userRefs(userId).meta;
  const result = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const old = countersOf(snap.exists() ? snap.data().counters : {});
    const next = {};
    for (const key of ["T", "M", "O", "S"]) next[key] = Math.max(old[key], counters[key] || 0);
    transaction.set(ref, { counters: next }, { merge: true });
    return next;
  });
  if (activeUser?.uid !== userId) return;
  knownCounters = countersOf(result);
  if (dirtyCounters && stable(dirtyCounters) === stable(counters)) dirtyCounters = null;
  // Keep local ID counters monotonic, even when another device allocated an ID first.
  const current = window.SIM_MANAGER_BRIDGE.getData();
  const merged = countersOf(current.counters);
  for (const key of ["T", "M", "O", "S"]) merged[key] = Math.max(merged[key], knownCounters[key]);
  window.SIM_MANAGER_BRIDGE.applyRemote({
    sims: current.sims,
    wanted: current.wanted,
    counters: merged
  });
}
async function flushChanges() {
  if (!activeUser || !workspaceReady) return;
  if (flushing) { flushAgain = true; return; }
  flushing = true;
  try {
    const userId = activeUser.uid;
    detectLocalChanges();
    const refs = userRefs(userId);
    await commitMapChanges(refs.sims, dirtySims, knownSims, userId);
    if (activeUser?.uid !== userId) return;
    await commitMapChanges(refs.wanted, dirtyWanted, knownWanted, userId);
    if (activeUser?.uid !== userId) return;
    if (restorePending && importRequested && (knownSims.size || knownWanted.size)) {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(refs.meta);
        if (snap.exists() && snap.data().needsImport) {
          transaction.set(refs.meta, { needsImport: false }, { merge: true });
        }
      });
      restorePending = false;
      importRequested = false;
    }
    if (dirtyCounters) {
      const sent = countersOf(dirtyCounters);
      await syncCountersMax(sent, userId);
    }
    if (activeUser?.uid !== userId) return;
    persistPending(userId);
    const remaining = dirtySims.size + dirtyWanted.size + (dirtyCounters ? 1 : 0) + (importRequested ? 1 : 0);
    if (remaining) {
      setStatus(`${remaining} change(s) waiting to sync`, "pending");
    } else {
      setStatus(navigator.onLine ? "Live · synced" : "Offline · saved here", navigator.onLine ? "" : "offline");
    }
  } finally {
    flushing = false;
    if (flushAgain) {
      flushAgain = false;
      scheduleFlush();
    }
  }
}

function normalizeBackup(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Backup file is invalid");
  return {
    sims: Array.isArray(raw.sims) ? raw.sims.map(clean) : [],
    wanted: Array.isArray(raw.wanted) ? raw.wanted.map(clean) : [],
    counters: countersOf(raw.counters)
  };
}
async function seedWorkspace(refs, data, needsImport) {
  const operations = [
    ...(data.sims || []).filter(x => x?.id).map(x => ({ ref: doc(refs.sims, String(x.id)), data: clean(x) })),
    ...(data.wanted || []).filter(x => x?.id).map(x => ({ ref: doc(refs.wanted, String(x.id)), data: clean(x) }))
  ];
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = writeBatch(db);
    operations.slice(offset, offset + 400).forEach(op => batch.set(op.ref, op.data));
    await batch.commit();
  }
  await syncSeedCounters(refs.meta, data.counters, needsImport);
}
async function syncSeedCounters(metaRef, counters, needsImport) {
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(metaRef);
    const old = countersOf(snap.exists() ? snap.data().counters : {});
    const next = {};
    for (const key of ["T", "M", "O", "S"]) next[key] = Math.max(old[key], counters[key] || 0);
    transaction.set(metaRef, { counters: next, needsImport: !!needsImport }, { merge: true });
  });
}

async function connectWorkspace(user) {
  stopWorkspaceListeners();
  activeUser = user;
  const refs = userRefs(user.uid);
  setStatus("Connecting to Firebase…", "pending");
  const bridge = window.SIM_MANAGER_BRIDGE;
  if (!bridge) throw new Error("SIM manager did not finish loading. Refresh the page.");
  bridge.selectUserScope(user.uid);
  loadPendingQueue(user.uid);

  const [simSnap, wantedSnap, metaSnap] = await Promise.all([
    getDocs(refs.sims), getDocs(refs.wanted), getDoc(refs.meta)
  ]);
  const hasCloudData = !simSnap.empty || !wantedSnap.empty || metaSnap.exists();

  let needsRestore = false;
  if (!hasCloudData) {
    let initial = bridge.getData();
    needsRestore = !(initial.sims?.length || initial.wanted?.length);
    initial = normalizeBackup(initial);
    await seedWorkspace(refs, initial, needsRestore);
    knownSims = new Map(initial.sims.filter(x => x?.id).map(x => [String(x.id), clean(x)]));
    knownWanted = new Map(initial.wanted.filter(x => x?.id).map(x => [String(x.id), clean(x)]));
    knownCounters = countersOf(initial.counters);
    dirtySims.clear(); dirtyWanted.clear(); dirtyCounters = null;
    persistPending(user.uid);
    bridge.applyRemote(initial);
  } else {
    knownSims = snapshotMap(simSnap);
    knownWanted = snapshotMap(wantedSnap);
    knownCounters = countersOf(metaSnap.exists() ? metaSnap.data().counters : {});
    needsRestore = !!(metaSnap.exists() && metaSnap.data().needsImport);
    publishMergedState();
  }
  restorePending = needsRestore;

  workspaceReady = true;
  setStatus("Live · synced", "");

  stopListeners = [
    onSnapshot(refs.sims, (snapshot) => {
      knownSims = snapshotMap(snapshot);
      publishMergedState();
      setStatus(dirtySims.size || dirtyWanted.size || dirtyCounters || importRequested ? "Changes syncing…" : "Live · synced", dirtySims.size || dirtyWanted.size || dirtyCounters || importRequested ? "pending" : "");
    }, (error) => setStatus(`SIM sync error: ${friendlyError(error)}`, "error")),
    onSnapshot(refs.wanted, (snapshot) => {
      knownWanted = snapshotMap(snapshot);
      publishMergedState();
      setStatus(dirtySims.size || dirtyWanted.size || dirtyCounters || importRequested ? "Changes syncing…" : "Live · synced", dirtySims.size || dirtyWanted.size || dirtyCounters || importRequested ? "pending" : "");
    }, (error) => setStatus(`Wanted sync error: ${friendlyError(error)}`, "error")),
    onSnapshot(refs.meta, (snapshot) => {
      knownCounters = countersOf(snapshot.exists() ? snapshot.data().counters : {});
      publishMergedState();
    }, (error) => setStatus(`Counter sync error: ${friendlyError(error)}`, "error"))
  ];
  if (dirtySims.size || dirtyWanted.size || dirtyCounters || importRequested) scheduleFlush();
  return { needsRestore };
}

// Every saved SIM/Wanted mutation in the original app reaches this bridge.
window.simCloudLocalChanged = () => scheduleFlush();
window.simCloudImportRequested = () => {
  if (!activeUser || !workspaceReady) return;
  importRequested = true;
  persistPending();
  scheduleFlush();
};

// IDs are allocated in a Firestore transaction so two computers cannot reserve S61/T24 simultaneously.
window.simCloudAllocateIds = async (purpose) => {
  if (!activeUser || !workspaceReady) throw new Error("Firebase workspace is not ready");
  const ref = userRefs(activeUser.uid).meta;
  const prefix = ({ tourist: "T", medical: "M", other: "O" })[purpose] || "";
  const allocated = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const current = countersOf(snap.exists() ? snap.data().counters : knownCounters);
    current.S += 1;
    if (prefix) current[prefix] += 1;
    transaction.set(ref, { counters: current }, { merge: true });
    return { sid: `S${current.S}`, pid: prefix ? `${prefix}${current[prefix]}` : "", counters: current };
  });
  knownCounters = countersOf(allocated.counters);
  return allocated;
};
window.simCloudAllocatePid = async (purpose) => {
  if (!activeUser || !workspaceReady) throw new Error("Firebase workspace is not ready");
  const prefix = ({ tourist: "T", medical: "M", other: "O" })[purpose] || "";
  if (!prefix) return { pid: "", counters: knownCounters };
  const ref = userRefs(activeUser.uid).meta;
  const allocated = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const current = countersOf(snap.exists() ? snap.data().counters : knownCounters);
    current[prefix] += 1;
    transaction.set(ref, { counters: current }, { merge: true });
    return { pid: `${prefix}${current[prefix]}`, counters: current };
  });
  knownCounters = countersOf(allocated.counters);
  return allocated;
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return setLoginMessage("আগে firebase-config.js-এ Firebase Web App config বসিয়ে আবার deploy করুন।", "error");
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  setLoginMessage("");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    setLoginMessage(friendlyError(error), "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
  }
});
$("retryBtn").addEventListener("click", async () => {
  const user = auth?.currentUser;
  if (!user) return setLoginMessage("আগে Firebase account দিয়ে Sign in করুন।", "error");
  const retry = $("retryBtn");
  retry.disabled = true;
  setLoginMessage("Firebase connection আবার পরীক্ষা করা হচ্ছে…");
  try {
    const result = await connectWorkspace(user);
    setSignedInView(user);
    if (result?.needsRestore) window.SIM_MANAGER_BRIDGE?.showMessage("Cloud workspace is ready. Open Backup → Restore and select PRIVATE-DATA/initial-sim-backup.json to import your existing records.", 11000);
    setLoginMessage("");
  } catch (error) {
    setLoginMessage(`Cloud connection failed: ${friendlyError(error)}`, "error");
  } finally { retry.disabled = false; }
});
$("forgotBtn").addEventListener("click", async () => {
  if (!auth) return setLoginMessage("আগে Firebase configuration বসাতে হবে।", "error");
  const email = $("loginEmail").value.trim();
  if (!email) return setLoginMessage("Password reset করতে উপরের ঘরে email address লিখুন।", "error");
  try {
    await sendPasswordResetEmail(auth, email);
    setLoginMessage("Password reset email পাঠানো হয়েছে। Inbox/Spam পরীক্ষা করুন।", "good");
  } catch (error) {
    setLoginMessage(friendlyError(error), "error");
  }
});
$("logoutBtn").addEventListener("click", async () => {
  if (!auth) return;
  try { await signOut(auth); } catch (error) { setStatus(friendlyError(error), "error"); }
});

window.addEventListener("online", () => {
  if (!activeUser) return;
  if (workspaceReady) scheduleFlush();
  else {
    const user = activeUser;
    connectWorkspace(user).then((result) => {
      setSignedInView(user);
      if (result?.needsRestore) window.SIM_MANAGER_BRIDGE?.showMessage("Cloud workspace is ready. Open Backup → Restore and select your private initial backup JSON to import existing records.", 11000);
    }).catch((error) => {
      setStatus("Cloud connection failed", "error");
      setLoginMessage(`Cloud connection failed: ${friendlyError(error)}`, "error");
    });
  }
});
window.addEventListener("offline", () => {
  if (activeUser) setStatus("Offline · local copy kept", "offline");
});

const configReady = firebaseConfig &&
  typeof firebaseConfig.apiKey === "string" && !firebaseConfig.apiKey.startsWith("PASTE_") &&
  typeof firebaseConfig.projectId === "string" && !firebaseConfig.projectId.startsWith("YOUR_") &&
  typeof firebaseConfig.appId === "string" && !firebaseConfig.appId.startsWith("PASTE_");

if (!configReady) {
  setLoginMessage("Firebase এখনো configure করা হয়নি। ZIP-এর STEP-BY-STEP-BN.md অনুসরণ করে firebase-config.js পূরণ করুন।", "error");
  setStatus("Firebase setup needed", "error");
} else {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    const watchAuthState = () => onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSignedOutView();
        $("retryBtn").hidden = true;
        setLoginMessage("");
        return;
      }
      activeUser = user;
      $("retryBtn").hidden = false;
      setLoginMessage("");
      try {
        const result = await connectWorkspace(user);
        setSignedInView(user);
        if (result?.needsRestore) window.SIM_MANAGER_BRIDGE?.showMessage("Cloud workspace is ready. Open Backup → Restore and select PRIVATE-DATA/initial-sim-backup.json to import existing records.", 11000);
        setLoginMessage("");
      } catch (error) {
        console.error("Firebase workspace connection failed", error);
        setStatus("Cloud connection failed", "error");
        setLoginMessage(`Cloud connection failed: ${friendlyError(error)}. Internet, Firestore Database and Rules পরীক্ষা করুন।`, "error");
        workspaceReady = false;
      }
    });
    // Keep this browser signed in across tabs and browser restarts. It ends on sign-out
    // or when the user clears this site's browser storage/cookies.
    loginBtn.disabled = true;
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        loginBtn.disabled = false;
        watchAuthState();
      })
      .catch((error) => {
        console.warn("Could not set browser-local auth persistence", error);
        setLoginMessage("Browser এই ডিভাইসে login session সংরক্ষণ করতে পারছে না। Site data settings পরীক্ষা করুন।", "error");
        loginBtn.disabled = false;
        watchAuthState();
      });
  } catch (error) {
    console.error("Firebase initialization failed", error);
    setLoginMessage(`Firebase initialization failed: ${friendlyError(error)}`, "error");
    setStatus("Firebase setup error", "error");
  }
}

// PWA install support. The service worker caches only the static app shell, not private data.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch((error) => {
    console.warn("Service worker registration failed", error);
  }));
}
