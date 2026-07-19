(() => {
  const terms = [
    ["OpenID Connect", "OAuth 2.0 を拡張し、誰がログインしているかをアプリへ伝える仕組み。略して OIDC。"],
    ["Agent SDK", "AI エージェントの実行、ツール呼び出し、状態管理などを組み立てるための開発キット。"],
    ["GraphQL", "必要なデータ項目をクエリで指定して取得する API の方式。"],
    ["Webhook", "イベントが起きたとき、サービス側から指定 URL へ通知を送る仕組み。"],
    ["Bearer トークン", "HTTP ヘッダーに載せる認証情報。持っている者に権限があるため、漏えいさせてはいけない。"],
    ["API キー", "呼び出すアプリケーションや契約者を識別する秘密の文字列。利用者本人のログインとは別物。"],
    ["OAuth 2.0", "パスワードを渡さず、限定した権限をトークンとして委譲するための標準仕様。"],
    ["REST API", "URL でリソースを表し、GET・POST など HTTP メソッドで操作を表す Web API の設計方式。"],
    ["RPC", "遠隔の関数・操作を呼ぶように API を設計する方式。例: 注文をキャンセルする。"],
    ["CORS", "ブラウザが別のオリジンへリクエストする際に、サーバーが許可範囲を示す仕組み。"],
    ["CSRF", "ログイン済みブラウザを悪用し、別サイトから意図しない操作をさせる攻撃。"],
    ["IDOR", "URL の ID を変えるだけで他人のデータへアクセスできてしまう認可不備。"],
    ["HTTPS", "HTTP を TLS で暗号化し、盗み見や改ざんを防ぐ通信方式。"],
    ["HTTP", "Web ブラウザとサーバーがリクエストとレスポンスをやり取りするための通信規約。"],
    ["JSON", "キーと値でデータを表す、API でよく使われるテキスト形式。"],
    ["DNS", "ドメイン名を IP アドレスへ対応付ける仕組み。"],
    ["TCP", "通信の順序や到達を確認しながらデータを届けるネットワークプロトコル。"],
    ["TLS", "通信内容の暗号化と相手確認を行うプロトコル。HTTPS の安全性を支える。"],
    ["SDK", "特定の機能やサービスを利用するためのライブラリ・ツール・文書をまとめた開発キット。"],
    ["API", "別のプログラムの機能やデータを、決められた方法で利用するための窓口。"],
    ["Sandbox", "実行範囲や権限を制限し、外部への影響を抑えた隔離環境。"],
    ["カーネル", "OS の中核。プロセス、メモリ、ファイル、デバイスなどを管理する。"],
    ["プロセス", "OS が実行中のプログラムを管理する単位。"],
    ["OS", "ハードウェアとアプリケーションの間で、資源を管理する基本ソフトウェア。"]
  ];

  const skipSelector = "a, button, code, pre, script, style, textarea, input, select, svg, .term, .glossary-page, h1, h2, h3, h4, h5, h6";
  const pattern = new RegExp(terms.map(([term]) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  const definitionFor = new Map(terms);
  let sequence = 0;

  function createTerm(term, definition) {
    sequence += 1;
    const wrapper = document.createElement("span");
    const descriptionId = `term-description-${sequence}`;
    wrapper.className = "term";

    const label = document.createElement("span");
    label.className = "term__label";
    label.textContent = term;

    const button = document.createElement("button");
    button.className = "term__button";
    button.type = "button";
    button.textContent = "i";
    button.setAttribute("aria-label", `${term} の説明を表示`);
    button.setAttribute("aria-describedby", descriptionId);
    button.setAttribute("aria-expanded", "false");

    const description = document.createElement("span");
    description.className = "term__description";
    description.id = descriptionId;
    description.setAttribute("role", "tooltip");
    description.textContent = definition;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = wrapper.classList.contains("is-open");
      document.querySelectorAll(".term.is-open").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(".term__button")?.setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        wrapper.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
      }
    });

    wrapper.append(label, button, description);
    return wrapper;
  }

  function annotateTextNode(node, seenTerms) {
    const text = node.nodeValue;
    pattern.lastIndex = 0;
    if (!pattern.test(text)) return;

    pattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      fragment.append(document.createTextNode(text.slice(cursor, match.index)));
      if (seenTerms.has(match[0])) {
        fragment.append(document.createTextNode(match[0]));
      } else {
        fragment.append(createTerm(match[0], definitionFor.get(match[0])));
        seenTerms.add(match[0]);
      }
      cursor = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(cursor)));
    node.replaceWith(fragment);
  }

  function annotateTerms() {
    const article = document.querySelector("article.md-content__inner");
    if (!article || article.closest(".glossary-page")) return;
    const seenTerms = new Set();
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim() || node.parentElement.closest(skipSelector)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => annotateTextNode(node, seenTerms));
  }

  document.addEventListener("click", () => {
    document.querySelectorAll(".term.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".term__button")?.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.body.click();
  });

  document.addEventListener("DOMContentLoaded", annotateTerms);
})();
