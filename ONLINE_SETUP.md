# FPSオンライン対戦（Firebaseなし・WebRTC P2P）

## 構成
- GitHub Pages：ゲーム本体（PC・スマホ対応）
- Cloudflare Worker + Durable Object：6桁ルームコード、自動マッチング、WebRTCの接続情報（シグナリング）の中継
- WebRTC DataChannel：最大8人のプレイヤー間で位置・向きをP2P同期
- STUN：Google公開STUNを使用。ネットワーク環境によってはTURNサーバーが別途必要

Firebaseは使用しません。

## Cloudflare Workerの公開手順
1. Cloudflareアカウントを作成し、Workers & Pagesを開く。
2. PCにNode.jsを用意し、ターミナルで `npm install -g wrangler` を実行。
3. このリポジトリをPCにダウンロードまたはGitでcloneする。
4. リポジトリのルートで `wrangler login` を実行。
5. `wrangler deploy` を実行する。
6. 表示されたWorkerのURLを確認する。例：`https://fps-p2p-signaling.<アカウント>.workers.dev`
7. `online-config.js` のURLを、`wss://fps-p2p-signaling.<アカウント>.workers.dev/ws` に変更してGitHubへ反映する。

## いま実装した機能
- Firebase依存を除いたルームUI
- Worker側での6桁コード発行・参加
- 最大8人の待機ルームと自動マッチング
- WebRTC offer / answer / ICE candidate の中継
- 最大7人とのP2P DataChannel接続
- PC・スマホ共通の位置・向き同期
- 受信プレイヤーの簡易3Dアバター表示

## 現時点の制限
- WorkerをCloudflareへデプロイし、`online-config.js` のURLを設定するまでは接続できません。
- STUNのみのため、一部のモバイル回線・学校/会社ネットワーク等ではP2P接続できず、TURNサーバーが必要です。TURNは別途費用が発生する場合があります。
- 現段階はプレイヤー表示と位置・向きの同期までです。プレイヤー同士の弾判定、HP・ダメージの同期、対戦開始/終了の管理、チート対策は未実装です。
- P2Pメッシュは8人時に各端末が最大7接続を持つため、端末性能・回線品質によって負荷が上がります。
- Workerのルーム情報は接続中の管理用です。ゲームの勝敗やHPを信頼できる形で管理するサーバーではありません。

## ゲーム
https://koike0324.github.io/
