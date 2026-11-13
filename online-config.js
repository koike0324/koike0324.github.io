// Cloudflare Workerをデプロイした後、wss://から始まるURLを設定してください。
export const SIGNALING_SERVER_URL = "wss://YOUR-WORKER-NAME.YOUR-ACCOUNT.workers.dev/ws";
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];
