# SDK入門：APIを使いやすくする部品群

SDK（Software Development Kit）は、あるサービスや機能をアプリへ組み込むために必要な**道具一式**。単なるライブラリではなく、利用者が迷わず実装・テスト・公開できるように、複数の部品をまとめたものよ。

## API、ライブラリ、SDK、CLIの違い

| 言葉 | 何を提供するか | 例 |
| --- | --- | --- |
| API | 呼び出しの契約 | `POST /payments`、関数の引数と戻り値 |
| ライブラリ | プログラムから呼ぶ再利用コード | JSON変換、HTTPクライアント |
| SDK | 開発に必要な部品群 | ライブラリ、認証、型、例、テスト支援 |
| CLI | ターミナルから使う操作窓口 | `service deploy` |

HTTP API だけを公開した場合、利用者は URL、認証、JSON、リトライ、エラー処理を自分で組む。SDK はそこを、各言語で自然に使える形へ包む。

```text
HTTP API:  POST https://api.example.com/v1/messages
SDK:       client.messages.create(...)
CLI:       example messages create --text "hello"
```

## SDKは何を隠し、何を残すか

良い SDK は、繰り返し書く定型処理を隠す。一方で、失敗理由や通信の意味まで隠してはいけない。

```python
client = ExampleClient(api_key=os.environ["EXAMPLE_API_KEY"])

result = client.messages.create(
    recipient="user-42",
    text="こんにちは"
)
print(result.id)
```

この数行の裏側で SDK は、URL の組み立て、認証ヘッダー、JSON 化、HTTP 通信、レスポンスの型変換を担当する。利用者は本来の目的である「メッセージを送る」に集中できる。

ただし、タイムアウト、リトライ回数、HTTP ステータス、リクエスト ID は必要に応じて見えるべき。障害時に内部を観測できない SDK は、便利でも運用しづらい。

## SDKの典型的な構成

```text
SDK
├─ Client        接続先・認証・設定を持つ入口
├─ Resources     users / messages など機能ごとの窓口
├─ Models        入出力データの型
├─ Transport     HTTP、WebSocket、リトライ、タイムアウト
├─ Errors        失敗を分類する例外・エラー型
├─ Auth          APIキー、OAuth、トークン更新
└─ Examples      最小例、実運用例、テスト例
```

この分け方には理由がある。通信を変えても `Messages` の使い方は極力変えない。データ型を変えても認証処理は触らない。責務を分けると、SDK 自身も利用するアプリも壊れにくい。

## エラーは「catchできる意味」を持たせる

HTTP の `404` や `429` を文字列で返すだけでは、利用者は安全な処理を書けない。SDK は少なくとも、再試行可能か・利用者の入力ミスか・認証失敗かを区別できるようにする。

```python
try:
    client.messages.create(recipient="user-42", text="hello")
except RateLimitError as error:
    # 待って再試行する候補
    print(error.retry_after)
except AuthenticationError:
    # トークンや設定を見直す。自動リトライしても直らない
    raise
except ValidationError as error:
    # 入力を修正する
    print(error.field_errors)
```

「例外を握りつぶさない」「再試行可能な失敗だけを再試行する」が要点。ネットワーク障害と `400 Bad Request` を同じように再試行すると、遅くなるだけで直らない。

## バージョンと互換性

SDK はアプリへ組み込まれる。公開したメソッド名や戻り値を雑に変えると、利用者のビルドが壊れる。

```text
破壊的変更:
  client.send(text) → client.send_message(body)

段階的な変更:
  client.send(text) を残す
  client.send_message(body) を追加する
  移行方法と廃止予定をドキュメントへ書く
```

API バージョンと SDK バージョンも別物。SDK `2.0` が API `/v1` を呼ぶことは普通にある。何が変わった番号なのかを明記しないと、利用者は更新判断ができない。

## SDKを選ぶ・設計するチェック

- 初期化時に必要な設定が明確か
- 認証情報をコードへ直書きせずに済むか
- タイムアウトとリトライを制御できるか
- 型・戻り値・例外が分かるか
- HTTP の生の情報やリクエスト ID を必要に応じて取れるか
- 最小例、エラー例、テスト例があるか
- 依存関係と対応バージョンが明記されているか

SDK の価値は、HTTP を短く書けることだけじゃない。サービスとの契約を、各言語で間違えにくく・観測しやすく・更新しやすく渡すことにある。
