const STYLE_ID = "hmm-pane-stripes";
const NARROW_ATTRIBUTE = "data-hmm-narrow";
const MIN_PANE_WIDTH = 768;

const CSS =
  "[data-split-pane-id]::before, [data-split-pane-id]::after { background-image: linear-gradient(oklch(0.3211 0 0 / 0.14), oklch(0.3211 0 0 / 0.14)), repeating-linear-gradient(135deg, transparent 0 4px, oklch(0.3211 0 0 / 0.1) 4px 5px) !important; background-size: 1px 100%, 100% 100% !important; background-repeat: no-repeat !important; } " +
  `[data-split-pane-id][${NARROW_ATTRIBUTE}]::before, [data-split-pane-id][${NARROW_ATTRIBUTE}]::after { display: none !important; }`;

export function installPaneStripes(): void {
  if (
    typeof document === "undefined" ||
    typeof ResizeObserver === "undefined" ||
    document.getElementById(STYLE_ID) !== null
  ) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);

  const observed = new WeakSet<Element>();
  const resizeObserver = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      target.toggleAttribute(NARROW_ATTRIBUTE, contentRect.width < MIN_PANE_WIDTH);
    }
  });

  const scan = () => {
    document.querySelectorAll("[data-split-pane-id]").forEach((pane) => {
      if (observed.has(pane)) return;
      observed.add(pane);
      resizeObserver.observe(pane);
    });
  };

  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}
