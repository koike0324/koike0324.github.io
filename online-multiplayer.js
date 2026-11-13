import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, onValue, onDisconnect,
  runTransaction, query, orderByChild, equalTo, limitToFirst
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const $ = id => document.getElementById(id);
const panel = $("online-panel");
const statusEl = $("online-status");
const codeEl = $("online-room-code");
const codeInput = $("online-code-input");
let db = null;
let user = null;
let currentRoom = null;
let roomUnsubscribe = null;

function status(message) {
  if (statusEl) statusEl.textContent = message;
}
function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function showRoom(roomCode, room) {
  currentRoom = roomCode;
  codeEl.textContent = "ROOM " + roomCode;
  const players = room && room.players ? Object.keys(room.players).length : 0;
  status("ルーム作成・参加に成功。参加人数：" + players + " / 8\n現在はロビー基盤の段階です。P2P接続とゲーム内同期は次の実装段階で追加します。");
  if (roomUnsubscribe) roomUnsubscribe();
  roomUnsubscribe = onValue(ref(db, "rooms/" + roomCode), snap => {
    if (!snap.exists()) {
      status("ルームが終了しました。");
      codeEl.textContent = "";
      currentRoom = null;
      return;
    }
    const data = snap.val();
    const count = data.players ? Object.keys(data.players).length : 0;
    status("ルーム接続中： " + count + " / 8 人\nルームコードを友達に共有してください。");
  });
}
async function ensureReady() {
  if (!isFirebaseConfigured) throw new Error("firebase-config.js にFirebaseのWebアプリ設定を入力してください。");
  if (!db) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const credential = await signInAnonymously(auth);
    user = credential.user;
    db = getDatabase(app);
  }
}
async function createRoom() {
  await ensureReady();
  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const existing = await get(ref(db, "rooms/" + code));
    if (!existing.exists()) break;
    code = makeCode();
  }
  const room = {
    code,
    owner: user.uid,
    status: "waiting",
    maxPlayers: 8,
    createdAt: Date.now(),
    players: {
      [user.uid]: { name: "Player", joinedAt: Date.now(), ready: false }
    }
  };
  await set(ref(db, "rooms/" + code), room);
  await onDisconnect(ref(db, "rooms/" + code + "/players/" + user.uid)).remove();
  showRoom(code, room);
}
async function joinRoom(code) {
  await ensureReady();
  if (!/^\d{6}$/.test(code)) throw new Error("6桁のルームコードを入力してください。");
  const roomRef = ref(db, "rooms/" + code);
  let joined = false;
  const result = await runTransaction(roomRef, room => {
    if (!room || room.status !== "waiting") return;
    room.players = room.players || {};
    const ids = Object.keys(room.players);
    if (ids.length >= Math.min(8, room.maxPlayers || 8)) return;
    room.players[user.uid] = { name: "Player", joinedAt: Date.now(), ready: false };
    joined = true;
    return room;
  });
  if (!result.committed) throw new Error("部屋が見つからないか、満員または対戦開始済みです。");
  await onDisconnect(ref(db, "rooms/" + code + "/players/" + user.uid)).remove();
  showRoom(code, result.snapshot.val());
}
async function quickMatch() {
  await ensureReady();
  const waitingQuery = query(ref(db, "rooms"), orderByChild("status"), equalTo("waiting"), limitToFirst(30));
  const snapshot = await get(waitingQuery);
  if (snapshot.exists()) {
    for (const [code, room] of Object.entries(snapshot.val())) {
      if (room.owner === user.uid) continue;
      try {
        await joinRoom(code);
        return;
      } catch (error) {
        // 満員になった部屋などは次の候補を試す
      }
    }
  }
  await createRoom();
  status("参加可能な部屋がなかったため、新しい待機ルームを作成しました。コードを共有して参加者を待てます。");
}
$("online-open-button")?.addEventListener("click", () => {
  panel.style.display = panel.style.display === "block" ? "none" : "block";
});
$("online-close")?.addEventListener("click", () => { panel.style.display = "none"; });
$("online-create")?.addEventListener("click", async () => {
  status("ルームを作成しています…");
  try { await createRoom(); } catch (error) { status(error.message || "ルーム作成に失敗しました。"); }
});
$("online-join")?.addEventListener("click", async () => {
  status("ルームに参加しています…");
  try { await joinRoom((codeInput.value || "").trim()); } catch (error) { status(error.message || "参加できませんでした。"); }
});
$("online-match")?.addEventListener("click", async () => {
  status("参加できる部屋を探しています…");
  try { await quickMatch(); } catch (error) { status(error.message || "マッチングに失敗しました。"); }
});
if (!isFirebaseConfigured) {
  status("Firebase未設定：firebase-config.js にWebアプリの設定を入力すると、ルーム作成・参加が有効になります。");
} else {
  status("Firebase設定を読み込みました。ボタンから接続できます。");
}
