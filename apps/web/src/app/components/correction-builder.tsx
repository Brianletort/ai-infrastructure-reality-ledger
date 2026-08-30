"use client";

import { useReducer } from "react";

import {
  buildCorrectionPacket,
  type CorrectionDraft,
  type CorrectionPacket,
  validateCorrectionDraft,
} from "../../lib/correction-packet";

const EMPTY_DRAFT: CorrectionDraft = {
  targetId: "",
  reason: "",
  evidenceUrl: "",
};

export interface CorrectionBuilderState {
  draft: CorrectionDraft;
  attempted: boolean;
  copied: boolean;
  packet: CorrectionPacket | null;
}

type CorrectionBuilderAction =
  | { type: "update"; key: keyof CorrectionDraft; value: string }
  | { type: "generate"; generatedAt: string }
  | { type: "copied" };

const INITIAL_STATE: CorrectionBuilderState = {
  draft: EMPTY_DRAFT,
  attempted: false,
  copied: false,
  packet: null,
};

export function reduceCorrectionBuilderState(
  state: CorrectionBuilderState,
  action: CorrectionBuilderAction,
): CorrectionBuilderState {
  switch (action.type) {
    case "update":
      return {
        ...state,
        draft: { ...state.draft, [action.key]: action.value },
        copied: false,
        packet: null,
      };
    case "generate": {
      const errors = validateCorrectionDraft(state.draft);
      return {
        ...state,
        attempted: true,
        copied: false,
        packet:
          Object.keys(errors).length === 0
            ? buildCorrectionPacket(state.draft, action.generatedAt)
            : null,
      };
    }
    case "copied":
      return { ...state, copied: true };
    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}

export function CorrectionBuilder({
  targets,
}: {
  targets: Array<{ id: string; name: string }>;
}) {
  const [state, dispatch] = useReducer(reduceCorrectionBuilderState, INITIAL_STATE);
  const { attempted, copied, draft, packet } = state;
  const errors = validateCorrectionDraft(draft);
  const valid = Object.keys(errors).length === 0;
  const serialized = packet ? JSON.stringify(packet, null, 2) : "";

  function update<Key extends keyof CorrectionDraft>(key: Key, value: CorrectionDraft[Key]) {
    dispatch({ type: "update", key, value });
  }

  function generatePacket() {
    dispatch({ type: "generate", generatedAt: new Date().toISOString() });
  }

  async function copyPacket() {
    if (!serialized) {
      return;
    }
    await navigator.clipboard.writeText(serialized);
    dispatch({ type: "copied" });
  }

  function downloadPacket() {
    if (!serialized || !packet) {
      return;
    }
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reality-ledger-correction-${packet.targetId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="correction-builder" aria-labelledby="correction-builder-title">
      <div className="correction-builder__form">
        <h2 id="correction-builder-title">Generate a review packet</h2>
        <p>
          This form never submits data. It validates locally, then creates a JSON packet you control.
        </p>
        <label>
          Ledger record
          <select
            value={draft.targetId}
            onChange={(event) => update("targetId", event.target.value)}
            aria-invalid={attempted && Boolean(errors.targetId)}
            aria-describedby="correction-target-error"
          >
            <option value="">Select a record</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
          <span id="correction-target-error" className="field-error">
            {attempted ? errors.targetId : ""}
          </span>
        </label>
        <label>
          Proposed correction and rationale
          <textarea
            value={draft.reason}
            minLength={20}
            maxLength={2_000}
            rows={7}
            onChange={(event) => update("reason", event.target.value)}
            aria-invalid={attempted && Boolean(errors.reason)}
            aria-describedby="correction-reason-error"
          />
          <span id="correction-reason-error" className="field-error">
            {attempted ? errors.reason : ""}
          </span>
        </label>
        <label>
          Supporting evidence URL
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={draft.evidenceUrl}
            onChange={(event) => update("evidenceUrl", event.target.value)}
            aria-invalid={attempted && Boolean(errors.evidenceUrl)}
            aria-describedby="correction-evidence-url-error"
          />
          <span id="correction-evidence-url-error" className="field-error">
            {attempted ? errors.evidenceUrl : ""}
          </span>
        </label>
        <div className="button-row">
          <button type="button" onClick={generatePacket}>
            Generate packet
          </button>
          <button type="button" className="button-secondary" disabled={!packet} onClick={copyPacket}>
            Copy packet
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={!packet}
            onClick={downloadPacket}
          >
            Download JSON
          </button>
        </div>
        <p className="form-status" role="status" aria-live="polite">
          {copied ? "Correction packet copied." : ""}
        </p>
      </div>
      <div className="correction-builder__preview">
        <p className="eyebrow">Local preview</p>
        <pre>
          {serialized ||
            (valid
              ? "Fields are valid. Generate a packet to assign its timestamp."
              : "Complete the required fields to preview a correction packet.")}
        </pre>
      </div>
    </section>
  );
}
