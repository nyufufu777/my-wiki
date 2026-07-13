# my-wiki

学んだ技術を、あとから自分で読み直し、ほかのプロジェクトでも再利用できる形で残す学習Wikiです。
GitHub上でMarkdownを読む **Docs as Code** 方式を採用しています。ページの更新はPull Requestでレビューでき、スマホではこのREADMEを入口に各ページを開けます。

## このWikiの使い方

1. まずは「何を学ぶか」を [学習の進め方](docs/learning-path/README.md) で確認します。
2. 用語や仕組みが分からないときは [基礎概念](docs/concepts/README.md) を開きます。
3. 技術を使うときは [技術別ノート](docs/technologies/README.md) を開きます。
4. 実際の実装を題材に読むときは [プロジェクト解説](docs/projects/README.md) を開きます。
5. Issue、PR、レビューなどの進め方は [開発・運用](docs/practices/README.md) を開きます。

## ページ一覧

| 分類 | 置くもの | 入口 |
| --- | --- | --- |
| 学習の進め方 | 学ぶ順番、到達目標、学習ログ | [learning-path](docs/learning-path/README.md) |
| 基礎概念 | 用語、仕組み、試験・実務共通の基礎 | [concepts](docs/concepts/README.md) |
| 技術別ノート | Docker、Python、DB、Web、テストなど | [technologies](docs/technologies/README.md) |
| プロジェクト解説 | 特定リポジトリの構成と実装を読む記事 | [projects](docs/projects/README.md) |
| 開発・運用 | Git、Issue、PR、レビュー、AI活用のルール | [practices](docs/practices/README.md) |
| 設計判断 | 「なぜこの選択をしたか」を残す記録 | [decisions](docs/decisions/README.md) |

## 新しいページを書くとき

- 置き場所は各カテゴリのREADMEにある判断基準で決めます。
- [記事テンプレート](templates/learning-page.md) をコピーして書き始めます。
- 一つの記事では一つの問いに答えます。複数のテーマを詰め込みすぎません。
- 定義だけで終わらず、具体例、レビュー観点、よくある誤解、参考資料を残します。
- 公式ドキュメントなど、読み手が確認できる一次資料を優先してリンクします。

詳しいルールは [執筆ガイド](docs/writing-guide.md) を参照してください。
