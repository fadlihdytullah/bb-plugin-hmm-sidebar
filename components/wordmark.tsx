const GLYPHS: Record<string, readonly string[]> = {
  c: ["00000", "11111", "10000", "10000", "10000", "11111", "00000"],
  h: ["10000", "11111", "10001", "10001", "10001", "10001", "00000"],
  e: ["00000", "11111", "10001", "11111", "10000", "11111", "00000"],
  k: ["10000", "10001", "10010", "11100", "10010", "10001", "00000"],
  m: ["00000", "11111", "10101", "10101", "10101", "10101", "00000"],
  z: ["00000", "11111", "00010", "00100", "01000", "11111", "00000"],
  n: ["00000", "11111", "10001", "10001", "10001", "10001", "00000"],
};

const CELL = 4;
const ROWS = 7;

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
    cursor += glyph[0].length + 1;
  }
  const width = (cursor - 1) * CELL;
  return (
    <svg
      viewBox={`0 0 ${width} ${ROWS * CELL}`}
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
