"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { GlobeControls } from "./globe-controls.js";
import {
  type CameraCommand,
  GlobeMap,
} from "./globe-map.js";
import type {
  GlobeQuality,
  LayerVisibility,
} from "./globe-layers.js";
import {
  LOCAL_GLOBE_SCENE,
  METRO_CAMERA_PRESETS,
  type GlobeEvent,
  type GlobeSceneData,
} from "./local-scene-data.js";
import {
  createInitialPlaybackState,
  filterEventsAtTime,
  playbackReducer,
} from "./playback.js";
import {
  resolveMarkerSelection,
  type AggregatedSceneMarker,
} from "./scene.js";
import { resolveSceneSelection } from "./semantic-state.js";
import {
  getLayerSemantic,
  type SemanticLayerId,
} from "./semantics.js";
import { getVisualTheme, type VisualThemeId } from "./themes.js";
import {
  GLOBE_HOME_VIEW,
  serializeGlobeUrlState,
  type GlobeViewState,
} from "./view-state.js";

interface GlobeExperienceProps {
  initialView?: GlobeViewState;
  scene?: GlobeSceneData;
  pmtilesPath?: string;
}

const DEFAULT_VISIBILITY: LayerVisibility = {
  land: true,
  grid: true,
  markers: true,
  changes: true,
};

const LEGEND_LAYERS: readonly SemanticLayerId[] = [
  "deep-metro",
  "inventory-point",
  "state-arc",
  "event-pulse",
];

function initialPlayback(scene: GlobeSceneData, view: GlobeViewState) {
  const first = scene.events[0];
  const last = scene.events.at(-1);
  if (!first || !last) {
    throw new Error("The local globe scene requires at least one reviewed event.");
  }
  const state = createInitialPlaybackState(first.occurredAt, last.occurredAt);
  return view.time
    ? playbackReducer(state, { type: "seek", time: view.time })
    : state;
}

function recommendedQuality(): Exclude<GlobeQuality, "auto"> {
  return navigator.hardwareConcurrency <= 4 || window.devicePixelRatio > 2
    ? "low"
    : "high";
}

function isGlobeEvent(
  object: AggregatedSceneMarker | GlobeEvent,
): object is GlobeEvent {
  return "occurredAt" in object;
}

export function GlobeExperience({
  initialView = GLOBE_HOME_VIEW,
  scene = LOCAL_GLOBE_SCENE,
  pmtilesPath,
}: GlobeExperienceProps) {
  const [view, setView] = useState<GlobeViewState>(initialView);
  const [playback, dispatch] = useReducer(
    playbackReducer,
    initialPlayback(scene, initialView),
  );
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [quality, setQuality] = useState<GlobeQuality>("auto");
  const [selected, setSelected] = useState<
    AggregatedSceneMarker | GlobeEvent | null
  >(() => resolveSceneSelection(scene, initialView));
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const cameraSequence = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number | null>(null);
  const selectionRef = useRef<HTMLElement>(null);

  const actualQuality = useMemo(
    () => (quality === "auto" ? recommendedQuality() : quality),
    [quality],
  );
  const theme = useMemo(() => getVisualTheme(view.theme), [view.theme]);
  const visibleEvents = useMemo(
    () => filterEventsAtTime(scene.events, playback.currentTime),
    [scene.events, playback.currentTime],
  );
  const focusedEvent = visibleEvents.at(-1) ?? null;

  const issueCameraCommand = useCallback((target: GlobeViewState) => {
    cameraSequence.current += 1;
    setCameraCommand({ id: cameraSequence.current, target });
  }, []);

  const handleViewChange = useCallback(
    (
      camera: Pick<
        GlobeViewState,
        "longitude" | "latitude" | "zoom" | "bearing" | "pitch"
      >,
    ) => {
      setView((current) => ({ ...current, ...camera }));
    },
    [],
  );

  const handlePreset = useCallback(
    (metroSlug: keyof typeof METRO_CAMERA_PRESETS) => {
      const preset = METRO_CAMERA_PRESETS[metroSlug];
      const target: GlobeViewState = {
        ...preset,
        theme: view.theme,
        time: playback.currentTime,
      };
      setView(target);
      issueCameraCommand(target);
    },
    [issueCameraCommand, playback.currentTime, view.theme],
  );

  const handleHome = useCallback(() => {
    const target: GlobeViewState = {
      ...GLOBE_HOME_VIEW,
      theme: view.theme,
      time: playback.currentTime,
    };
    setSelected(null);
    setView(target);
    issueCameraCommand(target);
  }, [issueCameraCommand, playback.currentTime, view.theme]);

  const handleTheme = useCallback((themeId: VisualThemeId) => {
    setView((current) => ({ ...current, theme: themeId }));
  }, []);

  const handleSelect = useCallback(
    (object: AggregatedSceneMarker | GlobeEvent) => {
      if (isGlobeEvent(object)) {
        setSelected(object);
        dispatch({ type: "seek", time: object.occurredAt });
        const target: GlobeViewState = {
          ...view,
          longitude: object.position[0],
          latitude: object.position[1],
          zoom: 7,
          selectedMetro: object.metroSlug,
          time: object.occurredAt,
        };
        setView(target);
        issueCameraCommand(target);
        return;
      }
      const result = resolveMarkerSelection(
        view,
        object,
        playback.currentTime,
      );
      setSelected(result.selected);
      setView(result.target);
      issueCameraCommand(result.target);
    },
    [issueCameraCommand, playback.currentTime, view],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const synchronize = () =>
      dispatch({ type: "reduced-motion", enabled: media.matches });
    synchronize();
    media.addEventListener("change", synchronize);
    return () => media.removeEventListener("change", synchronize);
  }, []);

  useEffect(() => {
    const synchronize = () =>
      dispatch({ type: "visibility", hidden: document.hidden });
    document.addEventListener("visibilitychange", synchronize);
    return () => document.removeEventListener("visibilitychange", synchronize);
  }, []);

  useEffect(() => {
    if (!playback.playing || playback.reducedMotion) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastFrameTime.current = null;
      return;
    }
    const animate = (timestamp: number) => {
      const previous = lastFrameTime.current ?? timestamp;
      const elapsedMilliseconds = Math.min(timestamp - previous, 250);
      lastFrameTime.current = timestamp;
      dispatch({ type: "tick", elapsedMilliseconds });
      setPulsePhase(timestamp / 420);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [playback.playing, playback.reducedMotion]);

  useEffect(() => {
    const urlState: GlobeViewState = {
      ...view,
      time: playback.currentTime,
    };
    const query = serializeGlobeUrlState(urlState);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
  }, [playback.currentTime, view]);

  useEffect(() => {
    if (selected) {
      selectionRef.current?.focus({ preventScroll: true });
    }
  }, [selected]);

  return (
    <div className="globe-experience" data-theme={view.theme}>
      <div className="globe-experience__stage">
        <header className="globe-stage-header">
          <div>
            <p className="eyebrow">Local cinematic evidence index</p>
            <h2>{theme.name}</h2>
            <p>{theme.description}</p>
          </div>
          <p className="globe-stage-header__status">
            <span aria-hidden="true">●</span> {actualQuality} rendering ·{" "}
            {pmtilesPath ? "same-origin PMTiles configured" : "source-free basemap"}
          </p>
        </header>
        <GlobeMap
          scene={scene}
          view={view}
          selectedTime={playback.currentTime}
          selectedId={selected?.id ?? null}
          theme={theme}
          visibility={visibility}
          quality={actualQuality}
          reducedMotion={playback.reducedMotion}
          pulsePhase={pulsePhase}
          cameraCommand={cameraCommand}
          {...(pmtilesPath ? { pmtilesPath } : {})}
          onSelect={handleSelect}
          onViewChange={handleViewChange}
        />
        <section className="globe-legend" aria-label="Visual legend">
          {LEGEND_LAYERS.map((layerId) => {
            const semantic = getLayerSemantic(layerId);
            return (
              <div key={layerId} data-layer={layerId}>
                <span aria-hidden="true" />
                <p>
                  <strong>{semantic.label}</strong>
                  {semantic.meaning}
                </p>
              </div>
            );
          })}
          <p className="globe-legend__caveat">
            Arc direction and pulse size identify reviewed sequence and focus only. They do not
            encode capacity, traffic, power flow, activation, or certainty.
          </p>
        </section>
        {selected ? (
          <section
            ref={selectionRef}
            className="globe-selection"
            aria-live="polite"
            tabIndex={-1}
          >
            <p className="eyebrow">Selected evidence summary</p>
            <h3>{selected.label}</h3>
            <p>
              {isGlobeEvent(selected)
                ? selected.summary
                : `${selected.count} local synthetic or fixture-derived record${
                    selected.count === 1 ? "" : "s"
                  } at an approximate location.`}
            </p>
            <a href={selected.href}>Open the full evidence page</a>
          </section>
        ) : null}
        <p className="globe-stage-attribution">{scene.attribution}</p>
      </div>

      <GlobeControls
        scene={scene}
        view={view}
        playback={playback}
        visibleEventCount={visibleEvents.length}
        focusedEventId={focusedEvent?.id ?? null}
        visibility={visibility}
        quality={quality}
        onPlayback={dispatch}
        onTheme={handleTheme}
        onPreset={handlePreset}
        onHome={handleHome}
        onEventFocus={handleSelect}
        onVisibility={setVisibility}
        onQuality={setQuality}
      />
    </div>
  );
}

export default GlobeExperience;
