(() => {
  const viewportPadding = 12;
  const gap = 10;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function positionPopover(button) {
    const term = button.closest(".term");
    const description = term?.querySelector(".term__description");
    if (!term?.classList.contains("is-open") || !description) return;

    const width = Math.min(288, window.innerWidth - viewportPadding * 2);
    description.style.setProperty("--term-popover-width", `${width}px`);
    description.style.setProperty("--term-popover-left", "0px");
    description.style.setProperty("--term-popover-top", "0px");

    const trigger = button.getBoundingClientRect();
    const height = description.getBoundingClientRect().height;
    const left = clamp(
      trigger.left + trigger.width / 2 - width / 2,
      viewportPadding,
      window.innerWidth - width - viewportPadding
    );
    const below = trigger.bottom + gap;
    const top = below + height <= window.innerHeight - viewportPadding
      ? below
      : Math.max(viewportPadding, trigger.top - gap - height);

    description.style.setProperty("--term-popover-left", `${left}px`);
    description.style.setProperty("--term-popover-top", `${top}px`);
  }

  function positionOpenPopovers() {
    document.querySelectorAll(".term.is-open .term__button").forEach(positionPopover);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".term__button");
    if (button) requestAnimationFrame(() => positionPopover(button));
  }, true);

  window.addEventListener("resize", positionOpenPopovers);
  window.addEventListener("scroll", positionOpenPopovers, { passive: true });
})();
