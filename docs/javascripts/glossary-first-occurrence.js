(() => {
  function keepFirstOccurrenceOnly() {
    const article = document.querySelector("article.md-content__inner");
    if (!article) return;

    const seenTerms = new Set();
    article.querySelectorAll(".term").forEach((term) => {
      const label = term.querySelector(".term__label")?.textContent;
      if (!label) return;
      if (seenTerms.has(label)) {
        term.replaceWith(document.createTextNode(label));
      } else {
        seenTerms.add(label);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", keepFirstOccurrenceOnly);
})();
