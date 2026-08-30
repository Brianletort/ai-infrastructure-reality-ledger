import Link from "next/link";

import type { GlobeSceneData } from "@reality-ledger/visuals";

interface GlobeFallbackProps {
  scene: GlobeSceneData;
}

export function GlobeFallback({ scene }: GlobeFallbackProps) {
  const metros = scene.markers.filter((marker) => marker.kind === "deep-metro");
  const facilities = scene.markers.filter((marker) => marker.kind === "inventory");

  return (
    <section className="globe-fallback" aria-labelledby="map-summary-title">
      <div className="globe-fallback__heading">
        <div>
          <p className="eyebrow">Accessible geographic index</p>
          <h2 id="map-summary-title">Map summary</h2>
        </div>
        <p>
          This list remains usable without JavaScript or WebGL. {scene.syntheticWarning}{" "}
          {scene.coordinateNote}
        </p>
      </div>

      <div className="globe-fallback__columns">
        <section aria-labelledby="fallback-metros">
          <h3 id="fallback-metros">Synthetic reviewed metros</h3>
          <ul>
            {metros.map((metro) => (
              <li key={metro.id}>
                <Link href={metro.href}>{metro.label}</Link>
                <span>Approximate synthetic location</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="fallback-facilities">
          <h3 id="fallback-facilities">Synthetic inventory points</h3>
          <ul>
            {facilities.map((facility) => (
              <li key={facility.id}>
                <Link href={facility.href}>{facility.label}</Link>
                <span>Approximate synthetic location</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="fallback-events">
          <h3 id="fallback-events">Reviewed change events</h3>
          <ol>
            {scene.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.occurredAt}>
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                    new Date(event.occurredAt),
                  )}
                </time>
                <Link href={event.href}>{event.label}</Link>
                <span>{event.summary}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
