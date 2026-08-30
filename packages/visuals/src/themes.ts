export type VisualThemeId = "obsidian" | "infrared" | "daylight";

export interface VisualTheme {
  id: VisualThemeId;
  name: string;
  description: string;
  tokens: {
    background: string;
    surface: string;
    land: string;
    landLine: string;
    grid: string;
    metro: string;
    inventory: string;
    event: string;
    text: string;
    muted: string;
    vignette: string;
  };
  effects: {
    atmosphere: number;
    bloom: number;
    grid: number;
    stars: number;
    vignette: number;
  };
}

export interface ThemeEffectStyle {
  "--globe-background": string;
  "--globe-glow": string;
  "--globe-vignette-color": string;
  "--globe-stars-opacity": string;
  "--globe-atmosphere-opacity": string;
  "--globe-bloom-opacity": string;
  "--globe-grid-opacity": string;
  "--globe-vignette-opacity": string;
}

export const DEFAULT_THEME_ID: VisualThemeId = "obsidian";

const OBSIDIAN: VisualTheme = {
  id: "obsidian",
  name: "Obsidian Atmosphere",
  description: "Preferred dark editorial direction with restrained depth and evidence-first color.",
  tokens: {
    background: "#050708",
    surface: "#0b1112",
    land: "#111d1d",
    landLine: "#6fc9b0",
    grid: "#24423e",
    metro: "#ffc56e",
    inventory: "#9de0ca",
    event: "#ff8b78",
    text: "#f2f1eb",
    muted: "#929992",
    vignette: "rgba(0, 0, 0, 0.68)",
  },
  effects: {
    atmosphere: 0.64,
    bloom: 0.34,
    grid: 0.42,
    stars: 0.42,
    vignette: 0.68,
  },
};

const INFRARED: VisualTheme = {
  id: "infrared",
  name: "Infrared Grid",
  description: "High-energy diagnostic direction using heat-map color without quantity encoding.",
  tokens: {
    background: "#100609",
    surface: "#19090e",
    land: "#211016",
    landLine: "#ff6f61",
    grid: "#5b2027",
    metro: "#ffd166",
    inventory: "#ff8f70",
    event: "#ff3d6e",
    text: "#fff1ea",
    muted: "#c29b98",
    vignette: "rgba(16, 0, 5, 0.72)",
  },
  effects: {
    atmosphere: 0.78,
    bloom: 0.62,
    grid: 0.64,
    stars: 0.2,
    vignette: 0.72,
  },
};

const DAYLIGHT: VisualTheme = {
  id: "daylight",
  name: "Signal Daylight",
  description: "Restrained light editorial direction optimized for analytical reading.",
  tokens: {
    background: "#e8e5dc",
    surface: "#f6f3eb",
    land: "#d7dbd1",
    landLine: "#235f55",
    grid: "#aab9b3",
    metro: "#9d4c11",
    inventory: "#176d61",
    event: "#a62c3b",
    text: "#17211f",
    muted: "#596662",
    vignette: "rgba(67, 74, 69, 0.2)",
  },
  effects: {
    atmosphere: 0.28,
    bloom: 0.08,
    grid: 0.24,
    stars: 0,
    vignette: 0.2,
  },
};

function assertNever(value: never): never {
  throw new Error(`Unsupported visual theme: ${String(value)}`);
}

export function getVisualTheme(themeId: VisualThemeId): VisualTheme {
  switch (themeId) {
    case "obsidian":
      return OBSIDIAN;
    case "infrared":
      return INFRARED;
    case "daylight":
      return DAYLIGHT;
    default:
      return assertNever(themeId);
  }
}

export const VISUAL_THEMES: readonly VisualTheme[] = [
  OBSIDIAN,
  INFRARED,
  DAYLIGHT,
];

export function createThemeEffectStyle(theme: VisualTheme): ThemeEffectStyle {
  return {
    "--globe-background": theme.tokens.background,
    "--globe-glow": theme.tokens.landLine,
    "--globe-vignette-color": theme.tokens.vignette,
    "--globe-stars-opacity": String(theme.effects.stars),
    "--globe-atmosphere-opacity": String(theme.effects.atmosphere),
    "--globe-bloom-opacity": String(theme.effects.bloom),
    "--globe-grid-opacity": String(theme.effects.grid),
    "--globe-vignette-opacity": String(theme.effects.vignette),
  };
}
