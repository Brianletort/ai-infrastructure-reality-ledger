import { describe, expect, it } from "vitest";

import { homeContent, siteMetadata } from "./site-content";

describe("Reality Ledger foundation content", () => {
  it("identifies the project in metadata", () => {
    expect(siteMetadata.title).toBe("AI Infrastructure Reality Ledger");
    expect(siteMetadata.description).toContain("evidence-first");
  });

  it("explains the foundation without starter marketing", () => {
    const serialized = JSON.stringify(homeContent);

    expect(homeContent.eyebrow).toBe("Open-source foundation");
    expect(homeContent.heading).toContain("Evidence");
    expect(serialized).not.toMatch(/Vercel|Deploy Now|Next\.js template/i);
  });

  it("warns that checked-in beta records are synthetic and not public facts", () => {
    expect(homeContent.status).toContain("SYNTHETIC REVIEWED BETA CORPUS");
    expect(homeContent.status).toContain("NOT PUBLIC FACTUAL DATA");
    expect(homeContent.status).toContain("100");
  });
});
