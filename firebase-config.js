// Firebase Console > Project settings > Your apps > Web app の設定値をここに貼り付けてください。
// APIキーはFirebaseのセキュリティルールの代わりにはなりません。
// このファイルを設定するまではオンライン機能は無効です。
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};
export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
  firebaseConfig.appId !== "YOUR_APP_ID";
