---
hide:
  - toc
---

<div class="glossary-page">

# 用語集

本文中の <span class="term__button" aria-hidden="true">i</span> を押すと、短い説明をその場で確認できる。このページでは用語を一覧で読む。

## API と Web

<dl>
  <dt>API</dt>
  <dd>別のプログラムの機能やデータを、決められた方法で利用するための窓口。</dd>
  <dt>HTTP / HTTPS</dt>
  <dd>Web の通信規約。HTTPS は HTTP を TLS で保護し、通信の盗み見や改ざんを防ぐ。</dd>
  <dt>JSON</dt>
  <dd>キーと値でデータを表すテキスト形式。Web API のレスポンスでよく使われる。</dd>
  <dt>REST API</dt>
  <dd>URL でリソースを表し、HTTP メソッドで操作を表す Web API の設計方式。</dd>
  <dt>GraphQL</dt>
  <dd>クライアントが必要なデータ項目をクエリで指定できる API の方式。</dd>
  <dt>Webhook</dt>
  <dd>イベント発生時に、サービス側から指定 URL へ通知を送る仕組み。</dd>
</dl>

## 認証とセキュリティ

<dl>
  <dt>認証 / 認可</dt>
  <dd>認証は「誰か」を確認すること。認可は「その操作をしてよいか」を確認すること。</dd>
  <dt>Bearer トークン</dt>
  <dd>持つ者に権限がある認証情報。通常は Authorization ヘッダーへ載せる。</dd>
  <dt>OAuth 2.0 / OpenID Connect</dt>
  <dd>OAuth 2.0 は限定した権限を委譲する標準。OpenID Connect はログイン情報を扱えるようにする拡張。</dd>
  <dt>CORS</dt>
  <dd>ブラウザが別のオリジンへの通信を許可する範囲を、サーバーが示す仕組み。</dd>
  <dt>CSRF</dt>
  <dd>ログイン済みブラウザを悪用し、別サイトから意図しない操作をさせる攻撃。</dd>
</dl>

## ネットワークと OS

<dl>
  <dt>DNS</dt>
  <dd>ドメイン名を IP アドレスへ対応付ける仕組み。</dd>
  <dt>TCP / TLS</dt>
  <dd>TCP は順序と到達を確認して届ける通信プロトコル。TLS は通信の暗号化と相手確認を担う。</dd>
  <dt>OS</dt>
  <dd>ハードウェアとアプリケーションの間で資源を管理する基本ソフトウェア。</dd>
  <dt>カーネル</dt>
  <dd>OS の中核。プロセス、メモリ、ファイル、デバイスを管理する。</dd>
  <dt>Sandbox</dt>
  <dd>実行範囲や権限を制限し、外部への影響を抑えた隔離環境。</dd>
</dl>

## 開発基盤

<dl>
  <dt>SDK</dt>
  <dd>特定の機能やサービスを利用するためのライブラリ・ツール・文書をまとめた開発キット。</dd>
  <dt>Agent SDK</dt>
  <dd>AI エージェントの実行、ツール呼び出し、状態管理などを組み立てるための開発キット。</dd>
</dl>

</div>
