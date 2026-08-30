import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlobeFallback } from "../app/globe/globe-fallback";
import { LOCAL_GLOBE_SCENE } from "../../../../packages/visuals/src/index";

describe("globe server fallback", () => {
  it("renders complete metro, facility, and event navigation without WebGL", () => {
    const html = renderToStaticMarkup(<GlobeFallback scene={LOCAL_GLOBE_SCENE} />);

    expect(html).toContain("Map summary");
    expect(html).toContain("Synthetic reviewed metros");
    expect(html).toContain("Synthetic inventory points");
    expect(html).toContain("Reviewed change events");
    expect(html).toContain('href="/metros/northern-virginia"');
    expect(html).toContain('href="/facilities/facility-osm-');
    expect(html).toContain('href="/timelines/');
    expect(html).toContain("This list remains usable without JavaScript or WebGL");
  });

  it("labels approximate synthetic locations and avoids capacity or traffic claims", () => {
    const html = renderToStaticMarkup(<GlobeFallback scene={LOCAL_GLOBE_SCENE} />);

    expect(html).toContain("Approximate synthetic location");
    expect(html).not.toContain("MW");
    expect(html).not.toContain("live traffic");
  });
});
