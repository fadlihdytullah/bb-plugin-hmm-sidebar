const GLYPHS: Record<string, readonly string[]> = {
  c: ["01110", "10001", "10000", "10001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001"],
  e: ["01110", "10001", "11111", "10000", "01110"],
  k: ["10010", "10100", "11000", "10100", "10010"],
  m: ["10001", "11011", "10101", "10001", "10001"],
  z: ["11111", "00010", "00100", "01000", "11111"],
  n: ["10001", "11001", "10101", "10011", "10001"],
};

const CELL = 4;

export function Wordmark({
  word,
  className = "h-12",
}: {
  word: string;
  className?: string;
}) {
  const cells: { x: number; y: number }[] = [];
  let cursor = 0;
  for (const char of word) {
    const glyph = GLYPHS[char];
    if (glyph === undefined) {
      cursor += 3;
      continue;
    }
    glyph.forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === "1") cells.push({ x: cursor + x, y });
      });
    });
    cursor += 6;
  }
  const width = (cursor - 1) * CELL;
  return (
    <svg
      viewBox={`0 0 ${width} ${5 * CELL}`}
      className={`${className} w-auto text-white/25`}
      fill="currentColor"
      aria-label={word}
      role="img"
    >
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x * CELL}
          y={y * CELL}
          width={CELL}
          height={CELL}
        />
      ))}
    </svg>
  );
}
