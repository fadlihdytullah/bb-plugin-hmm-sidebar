const STYLE_ID = "hmm-title-shimmer";

export const TITLE_SHIMMER_CLASS = "hmm-title-shimmer";

const CSS =
  "@keyframes hmm-title-shimmer { from { background-position: 200% 0; } to { background-position: 0 0; } } " +
  `.${TITLE_SHIMMER_CLASS} { background-image: linear-gradient(90deg, color-mix(in oklch, currentColor 50%, transparent) 35%, currentColor 50%, color-mix(in oklch, currentColor 50%, transparent) 65%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: hmm-title-shimmer 2s linear infinite; } ` +
  `@media (prefers-reduced-motion: reduce) { .${TITLE_SHIMMER_CLASS} { animation: none; background-image: none; -webkit-text-fill-color: currentColor; } }`;

export function installTitleShimmer(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID) !== null) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
