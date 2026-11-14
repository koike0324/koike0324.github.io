# FPSオンライン対戦（Firebaseなし・WebRTC P2P）

## 構成
- GitHub Pages：ゲーム本体
- Cloudflare Worker + Durable Object：6桁ルームコード、最大8人のルーム管理、自動マッチング、WebRTCシグナリング
- WebRTC DataChannel：プレイヤー間の位置・向き同期
- STUN：公開STUNサーバー

Firebaseは使用しません。

## Cloudflare Workerのデプロイ
このリポジトリにはWorker本体（cloudflare-worker.js）と設定（wrangler.jsonc）が含まれます。Cloudflare Workers & PagesでこのGitHubリポジトリをWorkerとして接続し、リポジトリのルートを使ってデプロイしてください。既存の手動Hello World Workerにコードを貼り付ける必要はありません。

Worker名は fps-online-server です。Durable Object bindingは設定ファイルに定義済みです。
- Binding variable: ROOMS
- Durable Object class: RoomHub
- Migration: v1

WebSocket URL: wss://fps-online-server.watatero-0324.workers.dev/ws

## 機能と制限
- 6桁ルームコードで作成・参加
- 空きがあるルームへの自動マッチング
- 最大8人
- WebRTC offer / answer / ICE candidate の中継
- 最大7人とのP2P DataChannel接続
- PC・スマホ対応の位置・向き同期

STUNのみのため、一部の回線ではP2P接続できず、TURNサーバーが別途必要になる場合があります。現段階ではプレイヤー表示と位置・向きの同期までです。HP・ダメージ・勝敗のサーバー管理やチート対策は未実装です。

ゲーム：https://koike0324.github.io/
