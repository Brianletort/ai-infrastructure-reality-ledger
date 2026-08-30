import type { KeyboardEvent } from "react";

import type { GlobeQuality, LayerVisibility } from "./globe-layers.js";
import {
  METRO_CAMERA_PRESETS,
  type GlobeEvent,
  type GlobeSceneData,
} from "./local-scene-data.js";
import type { PlaybackAction, PlaybackState } from "./playback.js";
import type { VisualThemeId } from "./themes.js";
import type { GlobeViewState } from "./view-state.js";

interface GlobeControlsProps {
  scene: GlobeSceneData;
  view: GlobeViewState;
  playback: PlaybackState;
  visibleEventCount: number;
  focusedEventId: string | null;
  visibility: LayerVisibility;
  quality: GlobeQuality;
  onPlayback: (action: PlaybackAction) => void;
  onTheme: (theme: VisualThemeId) => void;
  onPreset: (metroSlug: keyof typeof METRO_CAMERA_PRESETS) => void;
  onHome: () => void;
  onEventFocus: (event: GlobeEvent) => void;
  onVisibility: (visibility: LayerVisibility) => void;
  onQuality: (quality: GlobeQuality) => void;
}

const DAY_MILLISECONDS = 86_400_000;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function GlobeControls({
  scene,
  view,
  playback,
  visibleEventCount,
  focusedEventId,
  visibility,
  quality,
  onPlayback,
  onTheme,
  onPreset,
  onHome,
  onEventFocus,
  onVisibility,
  onQuality,
}: GlobeControlsProps) {
  const handleTimelineKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        onPlayback({ type: "step", direction: -1 });
        break;
      case "ArrowRight":
        event.preventDefault();
        onPlayback({ type: "step", direction: 1 });
        break;
      case " ":
        event.preventDefault();
        onPlayback({ type: playback.playing ? "pause" : "play" });
        break;
      case "Home":
        event.preventDefault();
        onPlayback({ type: "seek", time: playback.startTime });
        break;
      case "End":
        event.preventDefault();
        onPlayback({ type: "seek", time: playback.endTime });
        break;
      default:
        break;
    }
  };

  const updateLayer = (layer: keyof LayerVisibility, checked: boolean) => {
    onVisibility({ ...visibility, [layer]: checked });
  };

  return (
    <aside className="globe-controls" aria-label="Globe controls">
      <section className="globe-control-group" aria-labelledby="camera-controls-title">
        <div className="globe-control-group__heading">
          <p className="eyebrow">Camera</p>
          <h2 id="camera-controls-title">Navigate evidence</h2>
        </div>
        <div className="globe-preset-grid">
          <button type="button" onClick={onHome}>
            Continent overview
          </button>
          {Object.entries(METRO_CAMERA_PRESETS).map(([slug, preset]) => (
            <button
              key={slug}
              type="button"
              aria-pressed={view.selectedMetro === slug}
              onClick={() =>
                onPreset(slug as keyof typeof METRO_CAMERA_PRESETS)
              }
            >
              {slug === "dallas-fort-worth"
                ? "Dallas–Fort Worth"
                : slug
                    .split("-")
                    .map((word) => word[0]?.toUpperCase() + word.slice(1))
                    .join(" ")}
              <span>{preset.zoom.toFixed(1)}×</span>
            </button>
          ))}
        </div>
      </section>

      <section className="globe-control-group" aria-labelledby="appearance-controls-title">
        <div className="globe-control-group__heading">
          <p className="eyebrow">Appearance</p>
          <h2 id="appearance-controls-title">Visual direction</h2>
        </div>
        <label>
          Theme
          <select
            value={view.theme}
            onChange={(event) => onTheme(event.target.value as VisualThemeId)}
          >
            <option value="obsidian">Obsidian Atmosphere · preferred</option>
            <option value="infrared">Infrared Grid</option>
            <option value="daylight">Signal Daylight</option>
          </select>
        </label>
        <label>
          Rendering quality
          <select
            value={quality}
            onChange={(event) => onQuality(event.target.value as GlobeQuality)}
          >
            <option value="auto">Adaptive</option>
            <option value="high">High</option>
            <option value="low">Low power</option>
          </select>
        </label>
        <fieldset>
          <legend>Layers</legend>
          {(
            [
              ["land", "Public-domain land"],
              ["grid", "Reference grid"],
              ["markers", "Synthetic locations"],
              ["changes", "Reviewed changes"],
            ] as const
          ).map(([layer, label]) => (
            <label key={layer} className="globe-checkbox">
              <input
                type="checkbox"
                checked={visibility[layer]}
                onChange={(event) => updateLayer(layer, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </section>

      <section
        className="globe-control-group globe-time-controls"
        aria-labelledby="time-controls-title"
        onKeyDown={handleTimelineKeyboard}
      >
        <div className="globe-control-group__heading">
          <p className="eyebrow">Reviewed chronology</p>
          <h2 id="time-controls-title">What changed</h2>
        </div>
        <p className="globe-time-readout" aria-live="polite">
          <time dateTime={playback.currentTime}>{formatDate(playback.currentTime)}</time>
          <span>
            {visibleEventCount} of {scene.events.length} reviewed events
          </span>
        </p>
        <input
          className="globe-scrubber"
          type="range"
          aria-label="Reviewed event date"
          min={Date.parse(playback.startTime)}
          max={Date.parse(playback.endTime)}
          step={DAY_MILLISECONDS}
          value={Date.parse(playback.currentTime)}
          onChange={(event) =>
            onPlayback({
              type: "seek",
              time: new Date(Number(event.target.value)).toISOString(),
            })
          }
        />
        <div className="globe-transport">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => onPlayback({ type: "step", direction: -1 })}
          >
            ←
          </button>
          <button
            type="button"
            disabled={playback.reducedMotion}
            onClick={() =>
              onPlayback({ type: playback.playing ? "pause" : "play" })
            }
          >
            {playback.playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => onPlayback({ type: "step", direction: 1 })}
          >
            →
          </button>
          <label>
            <span className="sr-only">Playback speed</span>
            <select
              value={playback.speed}
              onChange={(event) =>
                onPlayback({ type: "speed", speed: Number(event.target.value) })
              }
            >
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="4">4×</option>
            </select>
          </label>
        </div>
        <p className="globe-keyboard-note">
          Arrow keys step one day; Space plays or pauses; Home and End move to range limits.
          {playback.reducedMotion ? " Continuous playback is disabled for reduced motion." : ""}
        </p>
      </section>

      <section className="globe-control-group" aria-labelledby="event-list-title">
        <div className="globe-control-group__heading">
          <p className="eyebrow">Equivalent event list</p>
          <h2 id="event-list-title">Reviewed events</h2>
        </div>
        <ol className="globe-event-list">
          {scene.events.map((event) => (
            <li key={event.id} data-focused={focusedEventId === event.id}>
              <button type="button" onClick={() => onEventFocus(event)}>
                <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                <strong>{event.label}</strong>
                <span>{event.summary}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
