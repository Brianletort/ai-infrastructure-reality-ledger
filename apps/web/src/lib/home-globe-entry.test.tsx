import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "../app/page";

describe("home globe entry", () => {
  it("links to the production globe without placeholder language", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('href="/globe"');
    expect(html).toContain("Open evidence globe");
    expect(html).not.toContain("arrives in Task 6");
  });
});
