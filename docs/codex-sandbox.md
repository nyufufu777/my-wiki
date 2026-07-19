# Codexのsandboxと承認

これは Codex 固有の雑な入口。OS の一般論は [Sandboxの内部：OSが境界を作る仕組み](sandbox-internals.md) を先に読む。

Codex では、sandbox がファイルとネットワークの到達範囲を決め、承認ポリシーが「その操作を実行前に確認するか」を決める。両者は別。

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

`workspace-write` はワークスペースと明示された writable roots に限って書けるモード。環境によっては `.git/` や `.codex/` が追加で保護されるため、ソース編集はできても Git の設定変更や commit には承認が必要になることがある。

後で実環境を調査するときは、まず読み取り操作だけで次を確認する。

- sandbox mode と approval policy
- 読み書きできるパス
- ネットワークが既定で閉じているか
- 管理ポリシーがローカル設定より優先していないか

このページは設定を覚えるためのものじゃない。拒否が起きたときに「OS の境界なのか、Codex の承認なのか、組織の管理ポリシーなのか」を切り分けるための地図よ。
