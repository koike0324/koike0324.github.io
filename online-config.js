// Cloudflare Workerをデプロイした後、表示されたURLをここに設定します。
// 例：https://fps-p2p-signaling.example.workers.dev/ws → wss://fps-p2p-signaling.example.workers.dev/ws
export const SIGNALING_SERVER_URL = "wss://YOUR-WORKER-NAME.YOUR-ACCOUNT.workers.dev/ws";
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];
