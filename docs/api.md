# API入門：使う側から設計する側まで

API（Application Programming Interface）は、**別のプログラムの機能やデータを決められた形式で利用するための窓口**。Web API なら、アプリが HTTP でリクエストを送り、サーバーがレスポンスを返す。

たとえば天気アプリが「東京の今日の天気」を表示できるのは、天気サービスの API に問い合わせているから。画面の裏側で、人間ではなくプログラム同士が会話していると思えばいい。

## まずは全体像

オンライン書店の API から本を一冊取得する場合を考える。

```text
アプリ  --「ID 42 の本をください」-->  API サーバー
アプリ  <--「タイトル、著者、在庫です」--  API サーバー
```

この「ください」が **リクエスト**、「返答」が **レスポンス**。会話のルールは主に次の5点で決まる。

| 要素 | 例 | 意味 |
| --- | --- | --- |
| URL | `https://api.example.com/books/42` | どのデータ・機能を呼ぶか |
| HTTPメソッド | `GET` | 何をしたいか |
| ヘッダー | `Authorization: Bearer ...` | 認証やデータ形式などの追加情報 |
| ボディ | JSON | 送るデータ本体 |
| ステータスコード | `200` | 処理が成功したか |

## APIを呼んでみる

### GET：データを取得する

`GET` は「読ませて」。本の ID が `42` の情報を取得するリクエストはこうなる。

```bash
curl https://api.example.com/books/42
```

成功すれば、サーバーは通常 `200 OK` と JSON を返す。

```json
{
  "id": 42,
  "title": "実践Web API",
  "author": "Ada Lovelace",
  "inStock": true
}
```

JavaScript では `fetch` を使える。

```js
const response = await fetch("https://api.example.com/books/42");

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const book = await response.json();
console.log(book.title); // 実践Web API
```

`fetch` は `404` や `500` でも通信自体は成功扱いにする。だから `response.ok` を確認しないコードは、失敗レスポンスを正常なデータとして処理してしまう。ここは初心者がよく踏む罠ね。

### POST：データを作る

本を登録するなら `POST` を使う。送信する JSON には `Content-Type: application/json` を付ける。

```bash
curl --request POST https://api.example.com/books \
  --header "Content-Type: application/json" \
  --data '{"title":"API設計入門","author":"Grace Hopper"}'
```

作成に成功した場合は `201 Created` が自然。レスポンスには、サーバーが決めた ID を含める。

```json
{
  "id": 43,
  "title": "API設計入門",
  "author": "Grace Hopper",
  "inStock": true
}
```

JavaScript 版はこう。

```js
const response = await fetch("https://api.example.com/books", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "API設計入門",
    author: "Grace Hopper"
  })
});

const createdBook = await response.json();
```

## HTTPメソッドの使い分け

| メソッド | 意図 | 例 |
| --- | --- | --- |
| `GET` | 取得する | `GET /books/42` |
| `POST` | 新しく作る・処理を依頼する | `POST /books` |
| `PUT` | 一件を全体的に置き換える | `PUT /books/42` |
| `PATCH` | 一部だけ更新する | `PATCH /books/42` |
| `DELETE` | 削除する | `DELETE /books/42` |

`GET` は何度呼んでもデータを変えないようにする。ページを開き直すだけで注文が重複したら困るでしょ。作成や更新を `GET` に混ぜないのは、そのためでもある。

## URLの読み方と設計

URL は動詞ではなく **名詞（リソース）** を中心にすると理解しやすい。

```text
良い:  GET    /books/42
良い:  POST   /books
良い:  DELETE /books/42

避ける: GET /getBook?id=42
避ける: POST /createBook
```

「本の一覧から、在庫があるものだけ」を取りたいならクエリパラメータを使う。

```text
GET /books?inStock=true&limit=20
```

一意に対象を特定する値はパスに置く。

```text
GET /users/15
GET /users/15/orders
```

ただし階層を深くしすぎないこと。`/companies/1/teams/2/users/3/orders/4/items/5` のようになると、使う側も保守する側もつらい。必要なら `GET /orders/4/items` のように、主要なリソースを独立させる。

## ステータスコードを読めるようになる

レスポンス本文だけでなく、最初にステータスコードを見る癖をつける。

| コード | 意味 | 典型例 |
| --- | --- | --- |
| `200 OK` | 成功 | 取得・更新に成功 |
| `201 Created` | 作成成功 | `POST` で新規作成 |
| `204 No Content` | 成功、返す本文なし | 削除成功 |
| `400 Bad Request` | リクエストの形式が不正 | JSON が壊れている |
| `401 Unauthorized` | 認証情報がない・無効 | トークンなし、期限切れ |
| `403 Forbidden` | 認証済みだが権限がない | 一般ユーザーが管理 API を呼ぶ |
| `404 Not Found` | 対象が存在しない | 存在しない ID |
| `409 Conflict` | 現在の状態と衝突 | すでに使われているメールアドレス |
| `422 Unprocessable Content` | 形式は正しいが内容が不正 | 価格が負の値 |
| `500 Internal Server Error` | サーバー側の想定外の失敗 | バグ、依存サービス障害 |

`401` と `403` は似ているけれど別物。**本人確認ができない**のが `401`、**本人ではあるが許可されない**のが `403` ね。

## エラーは機械にも人間にも読める形にする

失敗時に `"error"` だけ返しても、画面もログも改善できない。エラーコード・説明・対象フィールドを揃える。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください。",
    "details": [
      {
        "field": "title",
        "message": "1文字以上で入力してください。"
      }
    ]
  }
}
```

クライアントは `code` で処理を分岐し、人間向けには `message` を表示できる。内部の例外文や SQL をそのまま返すのは、情報漏えいになるから駄目。

## 認証：鍵をURLやコードに埋め込まない

ログインが必要な API では、アクセストークンを HTTP ヘッダーに渡すことが多い。

```bash
curl https://api.example.com/me \
  --header "Authorization: Bearer eyJhbGciOi..."
```

API キーでも同じ発想。

```text
Authorization: Bearer <secret>
```

次は絶対に避ける。

```text
https://api.example.com/books?api_key=秘密の値
```

URL はブラウザ履歴、アクセスログ、監視ツールに残りやすい。秘密情報はソースコードにもコミットしない。環境変数や秘密情報管理機能に置く。

## 一覧APIではページネーションを考える

`GET /books` が10万件を一度に返す API は、遅いし、通信量も大きい。最初から範囲を指定できるようにする。

```text
GET /books?limit=20&offset=40
```

```json
{
  "items": [
    { "id": 41, "title": "分散システム入門" },
    { "id": 42, "title": "実践Web API" }
  ],
  "limit": 20,
  "offset": 40,
  "total": 125
}
```

更新が多いデータでは、`offset` より **カーソル方式** が安定することがある。

```text
GET /books?limit=20&cursor=eyJpZCI6NDJ9
```

カーソルは「前回の続き」を表す不透明な値。クライアントは中身を解釈せず、そのまま次のリクエストへ渡す。

## APIを作る最小例

Python の FastAPI を使うと、次の程度で API の形が見える。

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class BookInput(BaseModel):
    title: str
    author: str


books = {42: {"id": 42, "title": "実践Web API", "author": "Ada Lovelace"}}


@app.get("/books/{book_id}")
def get_book(book_id: int):
    book = books.get(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.post("/books", status_code=201)
def create_book(input: BookInput):
    book_id = max(books, default=0) + 1
    book = {"id": book_id, **input.model_dump()}
    books[book_id] = book
    return book
```

実運用では、ここにデータベース、認証、入力制約、ログ、テストを足す。それでも URL・メソッド・JSON・ステータスコードという API の骨組みは変わらない。

## 中級者へ：壊れにくいAPIにする判断

### 互換性を守る

使われているレスポンスのフィールドを、予告なく消したり意味を変えたりしない。大きな変更が必要ならバージョンを分ける方法がある。

```text
GET /v1/books/42
GET /v2/books/42
```

ただし、何でも `v2` に逃がすのは雑。新しい任意フィールドを追加するだけなら、多くの場合は既存クライアントを壊さない。

### 再試行されても安全にする

ネットワークが切れると、クライアントは「サーバーに届かなかった」のか「処理は済んだが返事を受け取れなかった」のか分からない。注文作成の `POST` を無造作に再試行すると二重注文になる。

そこで `Idempotency-Key` のような一意なキーを送る。

```text
POST /orders
Idempotency-Key: 93d9db7f-1a1f-4d2a-8d09-f71d1f2c1b32
```

同じキーのリクエストは一度だけ処理するようサーバーが記録すれば、通信失敗後に安全に再試行できる。

### ドキュメントとテストもAPIの一部

利用者が必要なのは URL 一覧だけじゃない。各エンドポイントに、少なくとも次を用意する。

- 認証の要否と必要な権限
- リクエスト例と成功レスポンス例
- 起こりうるエラーとステータスコード
- 制限値（1回の件数、レート制限、サイズ）
- 変更履歴と廃止予定

サーバー側では、期待するリクエストに対して期待するレスポンスが返るテストを書く。API の契約をテストにしておけば、リファクタリングで利用者を壊しにくい。

## 実装・利用前チェックリスト

- URL はリソースを表しているか
- メソッドとステータスコードの意味が合っているか
- 成功時と失敗時の JSON 例があるか
- `401`、`403`、`404`、入力エラーを区別できるか
- トークンや API キーを URL・ソースコード・ログへ出していないか
- 一覧に上限とページネーションがあるか
- 変更しても既存クライアントを壊さないか

API は単なる通信手段じゃない。利用者との契約なの。名前、入力、出力、失敗時の振る舞いを揃えるほど、後から使う側も直す側も楽になるわ。
