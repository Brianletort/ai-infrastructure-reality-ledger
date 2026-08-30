"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ComparisonOption {
  id: string;
  label: string;
  kind: "facility" | "provider";
}

export function ComparisonSelector({
  options,
  initialIds,
}: {
  options: ComparisonOption[];
  initialIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialIds);
  const valid = selected.length >= 2 && selected.length <= 4;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : current.length < 4
          ? [...current, id]
          : current,
    );
  }

  function apply() {
    if (!valid) {
      return;
    }
    const parameters = new URLSearchParams();
    for (const id of selected) {
      parameters.append("id", id);
    }
    router.push(`/compare?${parameters.toString()}`);
  }

  return (
    <section className="compare-selector" aria-labelledby="compare-selector-title">
      <div>
        <p className="eyebrow">Selection</p>
        <h2 id="compare-selector-title">Choose 2–4 records</h2>
        <p>Only explicit fields are compared. Selection is stored in the URL.</p>
      </div>
      <div className="compare-selector__options">
        {options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className={checked ? "choice choice--selected" : "choice"}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.id)}
                disabled={!checked && selected.length >= 4}
              />
              <span>
                {option.label}
                <small>{option.kind}</small>
              </span>
            </label>
          );
        })}
      </div>
      <button type="button" disabled={!valid} onClick={apply}>
        Compare {selected.length || ""}
      </button>
      {!valid ? <p className="field-note">Select at least two records.</p> : null}
    </section>
  );
}
