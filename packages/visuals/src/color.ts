export type DeckColor = [number, number, number, number];

export function toDeckColor(hex: string, opacity = 1): DeckColor {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`Unsupported color token: ${hex}`);
  }
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    Math.round(Math.min(Math.max(opacity, 0), 1) * 255),
  ];
}
