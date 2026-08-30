"use client";

import Link from "next/link";
import { useState } from "react";

const MOBILE_LINKS = [
  ["/launch", "Public beta"],
  ["/regions", "Regions"],
  ["/metros", "Metros"],
  ["/providers", "Providers"],
  ["/changes", "What changed"],
  ["/methodology", "Methodology"],
] as const;

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-navigation">
      <button
        type="button"
        className="mobile-navigation__toggle"
        aria-expanded={open}
        aria-controls="mobile-navigation-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Menu</span>
        <span aria-hidden="true">{open ? "×" : "≡"}</span>
      </button>
      {open ? (
        <nav id="mobile-navigation-menu" aria-label="Mobile navigation">
          {MOBILE_LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
