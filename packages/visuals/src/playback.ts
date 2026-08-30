const DAY_MILLISECONDS = 86_400_000;

export interface TemporalEvent {
  id: string;
  occurredAt: string;
}

export interface PlaybackState {
  currentTime: string;
  startTime: string;
  endTime: string;
  playing: boolean;
  speed: number;
  reducedMotion: boolean;
}

export type PlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "seek"; time: string }
  | { type: "speed"; speed: number }
  | { type: "step"; direction: -1 | 1 }
  | { type: "tick"; elapsedMilliseconds: number }
  | { type: "visibility"; hidden: boolean }
  | { type: "reduced-motion"; enabled: boolean };

function validTime(value: string): number {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid playback time: ${value}`);
  }
  return milliseconds;
}

function iso(milliseconds: number): string {
  return new Date(milliseconds).toISOString();
}

function boundedTime(state: PlaybackState, milliseconds: number): string {
  return iso(
    Math.min(
      Math.max(milliseconds, validTime(state.startTime)),
      validTime(state.endTime),
    ),
  );
}

export function createInitialPlaybackState(
  startTime: string,
  endTime: string,
): PlaybackState {
  const start = validTime(startTime);
  const end = validTime(endTime);
  if (end < start) {
    throw new Error("Playback end time must not precede its start time.");
  }
  return {
    currentTime: iso(start),
    startTime: iso(start),
    endTime: iso(end),
    playing: false,
    speed: 1,
    reducedMotion: false,
  };
}

export function filterEventsAtTime<T extends TemporalEvent>(
  events: readonly T[],
  selectedTime: string,
): T[] {
  const boundary = validTime(selectedTime);
  return events.filter((event) => validTime(event.occurredAt) <= boundary);
}

export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState {
  switch (action.type) {
    case "play":
      return state.reducedMotion ? state : { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "seek":
      return {
        ...state,
        currentTime: boundedTime(state, validTime(action.time)),
      };
    case "speed":
      return {
        ...state,
        speed: Math.min(Math.max(action.speed, 0.25), 4),
      };
    case "step":
      return {
        ...state,
        currentTime: boundedTime(
          state,
          validTime(state.currentTime) + action.direction * DAY_MILLISECONDS,
        ),
      };
    case "tick": {
      if (!state.playing || state.reducedMotion) {
        return state;
      }
      const currentTime = validTime(state.currentTime);
      const nextTime =
        currentTime +
        action.elapsedMilliseconds * state.speed * (DAY_MILLISECONDS / 1_000);
      const bounded = boundedTime(state, nextTime);
      return {
        ...state,
        currentTime: bounded,
        playing: bounded !== state.endTime,
      };
    }
    case "visibility":
      return action.hidden ? { ...state, playing: false } : state;
    case "reduced-motion":
      return {
        ...state,
        reducedMotion: action.enabled,
        playing: action.enabled ? false : state.playing,
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
