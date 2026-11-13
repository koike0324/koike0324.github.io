# FPSオンライン対戦・Firebase設定手順

## 現在実装した範囲
- スタート画面にオンライン対戦パネルを追加
- Firebase匿名認証
- 6桁ルームコードの作成・参加
- 最大8人の部屋人数制限
- 待機中ルームを探す簡易自動マッチング
- 切断時にRealtime Databaseからプレイヤー登録を削除

**まだ未実装:** WebRTCのP2Pデータチャネル、STUN/TURN接続、3Dプレイヤー表示、位置・射撃・HP同期、対戦開始/終了処理。現時点ではロビー基盤であり、オンライン戦闘はまだできません。

## Firebase側の設定
1. https://console.firebase.google.com/ でFirebaseプロジェクトを作成。
2. プロジェクトにWebアプリを追加。
3. Authentication > Sign-in method で「匿名」を有効化。
4. Realtime Databaseを作成。
5. Project settings > Your apps のWeb設定を `firebase-config.js` に入力。
6. Realtime Databaseのルールを設定して公開。

## 注意
Realtime Databaseのセキュリティルールは、認証済みユーザーだけがアクセスできるように設定してください。開発中でもデータベース全体を一般公開するルール（read/write true）は使わないでください。オンライン対戦の本番公開前には、部屋の所有者・参加者ごとに読み書きを制限するルールと、サーバー側の検証を追加する必要があります。

## 次の実装段階
1. Firebaseを使ったWebRTCシグナリング（offer/answer/ICE候補）
2. 8人メッシュ接続の確立と切断復帰
3. Three.js上に他プレイヤーのモデルを表示
4. 移動・視点・射撃の同期
5. HP・ダメージ・撃破判定を信頼できる管理サーバーで検証
6. 自動マッチングの待機時間・人数条件を調整

ゲームURL: https://koike0324.github.io/
