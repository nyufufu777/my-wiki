# LangGraph：状態を持つワークフローを実装する

LangGraph は、LLM を使う処理を **state（状態）** と **graph（遷移）** として組み立てる Python/JavaScript 向けフレームワーク。単純な「入力→モデル→出力」ではなく、分岐、ループ、ツール実行、中断、再開を明示的に扱いたいときに向く。

```text
START → 入力検証 → モデル/処理 → 条件分岐 → tool実行 → モデル/処理 → END
                               ↑                         │
                               └──────── 必要ならループ ───┘
```

## 何を解決するのか

LLM を含むアプリは、次のように一度で終わらない処理になりがち。

- モデルが tool を呼ぶか、回答するかを選ぶ
- tool の結果を見て、もう一度モデルへ戻る
- 副作用のある処理の前に人の承認を待つ
- 失敗した地点から再開する

普通の `while` でも書ける。でも state、分岐、再開地点が散らばるとテストと運用が難しくなる。LangGraph は「今どの node にいて、state は何か」をグラフとして扱う。

## 最初に覚える5要素

| 要素 | 役割 |
| --- | --- |
| State | node 間で受け渡すデータの型 |
| Node | state を読み、更新分だけ返す関数 |
| Edge | 次に進む node を決める線 |
| Checkpointer | state のチェックポイントを保存する仕組み |
| Thread ID | 同じ処理・会話を再開するための識別子 |

node は state を直接破壊的に変更せず、**更新値を返す**。どの node が何を変えたのか追いやすくなるから。

## インストール

Python 3.10 以上を用意する。

```bash
python -m venv .venv
.venv/bin/pip install -U langgraph
```

Windows PowerShell なら、仮想環境の有効化はこう。

```powershell
.\.venv\Scripts\Activate.ps1
pip install -U langgraph
```

LLM や tool を使うなら、別途その provider 用パッケージを追加する。LangGraph 自体はモデルに依存しない。

## 最小のグラフ：入力を検証して分岐する

まず LLM を使わない例で、state と edge を掴む。`amount` が正なら承認待ち、負ならエラーにする。

```python
from typing import Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END


class PaymentState(TypedDict, total=False):
    amount: int
    status: str
    error: str


def validate(state: PaymentState) -> dict:
    if state["amount"] <= 0:
        return {"status": "invalid", "error": "amount must be positive"}
    return {"status": "pending_approval"}


def route_after_validation(
    state: PaymentState,
) -> Literal["request_approval", "finish"]:
    return "request_approval" if state["status"] == "pending_approval" else "finish"


def request_approval(state: PaymentState) -> dict:
    # 実運用では、ここでUI・Slack・メールなどへ承認依頼を出す
    return {"status": "approved"}


builder = StateGraph(PaymentState)
builder.add_node("validate", validate)
builder.add_node("request_approval", request_approval)
builder.add_node("finish", lambda state: state)

builder.add_edge(START, "validate")
builder.add_conditional_edges("validate", route_after_validation)
builder.add_edge("request_approval", "finish")
builder.add_edge("finish", END)

graph = builder.compile()

print(graph.invoke({"amount": 1200}))
# {'amount': 1200, 'status': 'approved'}

print(graph.invoke({"amount": -1}))
# {'amount': -1, 'status': 'invalid', 'error': 'amount must be positive'}
```

`add_conditional_edges` が分岐の要。分岐関数は I/O をせず、state から次の node 名だけを決める純粋な関数にするとテストしやすい。

## LLM + tool の基本ループ

agent の定番は、`model → tool → model`。最後の AI メッセージに tool call があれば tool node へ行き、なければ終了する。

```text
START → llm_call ── tool callあり → tools ─┐
                    tool callなし → END    │
                           └────────────────┘
```

state の messages を追記形式にするには、`add_messages` を使う。

```python
from typing_extensions import TypedDict, Annotated
from langchain_core.messages import AnyMessage
from langgraph.graph import add_messages


class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
```

この reducer がない単純な `list` では、node が返した messages が前の messages を置き換える。会話履歴や tool 結果を残したいなら、どの field を「上書き」「追記」「集計」するかを state 定義で決める。

## 中断と再開：副作用の前に人を入れる

メール送信、デプロイ、支払いのような副作用は、モデルや node が勝手に完了させない。`interrupt` で停止し、承認後に同じ thread を再開する。

```python
from typing_extensions import TypedDict
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt


class DeployState(TypedDict):
    version: str


def approval(state: DeployState) -> dict:
    approved = interrupt({
        "action": "deploy",
        "version": state["version"],
        "message": "本番へデプロイしてよいか"
    })
    if not approved:
        return {"version": state["version"]}
    return {"version": state["version"]}


builder = StateGraph(DeployState)
builder.add_node("approval", approval)
builder.add_edge(START, "approval")
builder.add_edge("approval", END)
graph = builder.compile(checkpointer=MemorySaver())

config = {"configurable": {"thread_id": "deploy-2026-07-19"}}
paused = graph.invoke({"version": "1.4.0"}, config=config)

# UI が paused の内容を表示し、ユーザーが承認した後
resumed = graph.invoke(Command(resume=True), config=config)
```

`MemorySaver` は開発用のインメモリ保存。プロセスが落ちても再開する本番処理には、DB など永続的な checkpointer を使う。thread ID を固定しないと、再開したい state を特定できない。

## 開発時の実践ルール

### state を小さく、型を厳しくする

state は何でも入る辞書にしない。入力、途中結果、最終出力、制御情報を分ける。

```text
悪い: state["data"] に会話・設定・秘密情報・tool結果を全部入れる
良い: messages / user_id / search_results / approval_status を分ける
```

秘密情報や巨大な生レスポンスを state へ無造作に入れると、checkpoint や trace に残りやすい。保存対象を先に決める。

### nodeは一つの責務にする

`call_model_and_search_and_send_email` のような node は、失敗と再試行の境界が曖昧。`call_model`、`search`、`draft_email`、`request_approval`、`send_email` に分ける。

### ループには終了条件を置く

tool call が続く agent は無限ループする可能性がある。最大ステップ数、最大 tool 呼び出し数、時間制限、同じ入力の繰り返し検出を置く。

```text
if state["step_count"] >= 8:
    次は END または人間への引き継ぎ
```

## テストの書き方

LLM を使う node まで毎回実通信しない。まず、分岐関数と tool node を固定入力でテストする。

```python
def test_invalid_amount_goes_to_finish():
    state = {"amount": -1, "status": "invalid"}
    assert route_after_validation(state) == "finish"
```

次に graph 全体を、モデルをスタブへ差し替えてテストする。確認したいのは「期待する state で、期待する node へ進み、禁止された tool を呼ばない」こと。自然な文章の一致だけをテストにすると壊れやすい。

## 運用で最低限見るもの

| 観測項目 | なぜ必要か |
| --- | --- |
| thread ID / run ID | 問題の実行を特定する |
| nodeごとの開始・終了時刻 | 遅い箇所を分ける |
| tool名・引数の要約・結果 | 意図しない操作を検知する |
| stateの要約 | 再開・失敗原因を追う |
| token・外部APIコスト | ループや高コストを検知する |
| interruptの回数・待ち時間 | 承認フローの詰まりを知る |

機密情報、認証ヘッダー、個人情報は trace にそのまま出さない。観測性は必要だけど、ログは新しい漏えい経路にもなる。

## 実装チェックリスト

- state の各 field に保存目的と更新規則があるか
- node が一つの責務だけを持つか
- すべての分岐に終了条件があるか
- 副作用の前に interrupt または承認 node があるか
- thread ID と永続 checkpointer の方針があるか
- tool の入力検証と権限を node の外でも行うか
- trace から秘密情報を除外しているか

LangGraph は「LLM をグラフで呼ぶライブラリ」ではない。途中で止まり、戻り、条件で分かれ、状態を保ちながら進む仕事を、実装・テスト・運用できる形にするための道具よ。

## 参考

- [LangGraph Quickstart](https://docs.langchain.com/oss/python/langgraph/quickstart)
- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api)
- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
