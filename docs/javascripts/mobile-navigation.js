/* モバイルのドロワーは常に最上位ジャンルから始める。 */
(() => {
  const mobileQuery = window.matchMedia("(max-width: 76.234375em)");

  function collapseNavigation() {
    if (!mobileQuery.matches) return;

    document
      .querySelectorAll(".md-sidebar--primary .md-nav__toggle")
      .forEach((toggle) => {
        toggle.checked = false;
      });
  }

  document.addEventListener("DOMContentLoaded", collapseNavigation);
})();
