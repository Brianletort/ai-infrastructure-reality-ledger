export const CORRECTION_CORPUS_MODE = "synthetic-reviewed-beta";
export const CORRECTION_CORPUS_WARNING =
  "SYNTHETIC REVIEWED BETA CORPUS — NOT PUBLIC FACTUAL DATA. Do not use these records as evidence of real facilities or events.";

export interface CorrectionDraft {
  targetId: string;
  reason: string;
  evidenceUrl: string;
}

export interface CorrectionPacket {
  schemaVersion: "reality-ledger-correction-v1";
  submission: "local-review-packet-only";
  corpusMode: typeof CORRECTION_CORPUS_MODE;
  warning: typeof CORRECTION_CORPUS_WARNING;
  targetId: string;
  reason: string;
  evidenceUrl: string;
  generatedAt: string;
}

export function validateCorrectionDraft(
  draft: CorrectionDraft,
): Partial<Record<keyof CorrectionDraft, string>> {
  const errors: Partial<Record<keyof CorrectionDraft, string>> = {};
  if (!draft.targetId.trim()) {
    errors.targetId = "Choose a ledger record.";
  }
  if (draft.reason.trim().length < 20 || draft.reason.trim().length > 2_000) {
    errors.reason = "Explain the proposed correction in at least 20 characters.";
  }
  try {
    const evidenceUrl = new URL(draft.evidenceUrl);
    if (evidenceUrl.protocol !== "https:") {
      errors.evidenceUrl = "Provide a valid HTTPS evidence URL.";
    }
  } catch {
    errors.evidenceUrl = "Provide a valid HTTPS evidence URL.";
  }
  return errors;
}

export function buildCorrectionPacket(
  draft: CorrectionDraft,
  generatedAt = new Date().toISOString(),
): CorrectionPacket {
  const errors = validateCorrectionDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error("Correction draft is invalid");
  }
  return {
    schemaVersion: "reality-ledger-correction-v1",
    submission: "local-review-packet-only",
    corpusMode: CORRECTION_CORPUS_MODE,
    warning: CORRECTION_CORPUS_WARNING,
    targetId: draft.targetId.trim(),
    reason: draft.reason.trim(),
    evidenceUrl: draft.evidenceUrl.trim(),
    generatedAt,
  };
}
