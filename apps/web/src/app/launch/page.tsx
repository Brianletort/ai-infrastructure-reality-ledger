import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Public beta launch",
  description:
    "The local public-beta package for the AI Infrastructure Reality Ledger, with explicit synthetic coverage and release-gate caveats.",
  alternates: { canonical: "/launch" },
  openGraph: {
    images: [
      {
        url: "/launch/reality-ledger-og.png",
        width: 1200,
        height: 630,
        alt: "AI Infrastructure Reality Ledger public beta: evidence before assertion",
      },
    ],
  },
};

const evidenceLoop = [
  ["01", "Source", "Record publisher, retrieval time, exact reference, and redistribution rights."],
  ["02", "Claim", "Keep announcement, construction, activation, contest, and correction distinct."],
  ["03", "Review", "Score authority, directness, entity match, conflicts, and explicit unknowns."],
  ["04", "Revision", "Preserve history. Corrections supersede claims; they do not erase them."],
] as const;

const architecture = [
  ["Public web", "Next.js pages and bounded read APIs; no third-party calls in request paths."],
  ["Evidence domain", "Versioned schemas for entities, events, claims, sources, and corrections."],
  ["Worker path", "Typed Python adapters, fixture-first ingestion, and asynchronous processing."],
  ["Optional scale path", "PostgreSQL/PostGIS, object storage, and PMTiles are documented, not provisioned."],
] as const;

export default function LaunchPage() {
  return (
    <div className="launch-page">
      <section className="launch-hero">
        <div>
          <p className="eyebrow">Local public-beta package</p>
          <h1>Evidence before infrastructure assertions.</h1>
          <p className="launch-hero__summary">
            The AI Infrastructure Reality Ledger separates what was announced, built, activated,
            contested, and corrected. The judgment is simple: a map is useful only when every
            material claim can be traced to evidence and uncertainty remains visible.
          </p>
          <div className="button-row">
            <Link className="button" href="/globe">
              Enter the visual demo
            </Link>
            <a className="text-link" href="#contribute">
              See contribution paths
            </a>
          </div>
        </div>
        <aside className="launch-truth" aria-label="Current public beta coverage">
          <p>Current beta truth</p>
          <strong>6 + 100</strong>
          <dl>
            <div>
              <dt>Inventory</dt>
              <dd>6 fixture-derived synthetic records</dd>
            </div>
            <div>
              <dt>Timelines</dt>
              <dd>100 synthetic reviewed timelines</dd>
            </div>
            <div>
              <dt>Market coverage</dt>
              <dd>None claimed</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="launch-warning" aria-label="Synthetic demo warning">
        <span>SYNTHETIC REVIEWED BETA</span>
        <strong>NOT PUBLIC FACTUAL DATA</strong>
        <p>
          The checked-in inventory and timeline corpus test the product model. They are not
          evidence of real facilities, events, capacity, operators, or market coverage.
        </p>
      </section>

      <section className="launch-demo" aria-labelledby="launch-demo-title">
        <div className="launch-section-heading">
          <p className="eyebrow">Visual entry</p>
          <h2 id="launch-demo-title">Move from place to claim to exact evidence.</h2>
          <p>
            The globe is an index, not the conclusion. Generalized coordinates lead into metro,
            timeline, and citation views while a persistent warning keeps the demo honest. The
            repaired headless path now shows a meaningful MapLibre/deck.gl scene.
          </p>
        </div>
        <div className="launch-shot launch-shot--wide">
          <Image
            src="/launch/globe.png"
            width={1440}
            height={1000}
            priority
            alt="Headless globe route showing visible MapLibre and deck.gl geometry, playback controls, and synthetic evidence"
          />
        </div>
        <p className="launch-media-status">Demo video status: captured.</p>
        <div className="launch-shot-grid">
          <figure className="launch-shot">
            <Image
              src="/launch/home.png"
              width={1440}
              height={1000}
              alt="Reality Ledger home page showing the six-record inventory and 100-timeline synthetic beta status"
            />
            <figcaption>Start with the limits, not a claim of coverage.</figcaption>
          </figure>
          <figure className="launch-shot">
            <Image
              src="/launch/timeline-evidence.png"
              width={1440}
              height={1000}
              alt="Synthetic facility timeline with lifecycle events and linked evidence references"
            />
            <figcaption>Follow a synthetic event into its evidence packet and timestamps.</figcaption>
          </figure>
        </div>
      </section>

      <section className="launch-loop" aria-labelledby="evidence-loop-title">
        <div className="launch-section-heading">
          <p className="eyebrow">Evidence model</p>
          <h2 id="evidence-loop-title">A ledger is a review loop, not a pin collection.</h2>
        </div>
        <ol>
          {evidenceLoop.map(([number, title, body]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="launch-architecture" aria-labelledby="launch-architecture-title">
        <div className="launch-section-heading">
          <p className="eyebrow">Architecture</p>
          <h2 id="launch-architecture-title">Static and synthetic now. Extensible by design.</h2>
          <p>
            The current beta runs locally from checked-in data. Optional production components are
            documented as paths, not represented as deployed capability.
          </p>
        </div>
        <div className="launch-architecture__grid">
          {architecture.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="launch-gates" aria-labelledby="launch-gates-title">
        <div>
          <p className="eyebrow">Release evidence</p>
          <h2 id="launch-gates-title">Measured gates are green. One material question remains open.</h2>
        </div>
        <dl>
          <div>
            <dt>Measured</dt>
            <dd>32 measured gates pass</dd>
          </div>
          <div>
            <dt>Failed</dt>
            <dd>0 measured gates fail</dd>
          </div>
          <div>
            <dt>Real-GPU laptop</dt>
            <dd>Pass · 120.00 FPS over 10,000.00 ms</dd>
          </div>
          <div>
            <dt>Representative mobile</dt>
            <dd>Midrange mobile target remains inconclusive</dd>
          </div>
        </dl>
        <p>
          The laptop result used scripted real-browser Chrome 151.0.0.0 with the Apple M4 Pro Metal
          renderer, route <code>/globe?theme=obsidian</code>, a matching <code>/globe</code>{" "}
          runtime fingerprint, a visible 1199 × 792 overlay and MapLibre canvas, consistent frame
          math, and bound globe PNG/demo WebM hashes. It does not substantiate mobile performance.
          Release still requires human approval before publication.
        </p>
      </section>

      <section className="launch-contribute" id="contribute" aria-labelledby="contribute-title">
        <div>
          <p className="eyebrow">Contribution wedge</p>
          <h2 id="contribute-title">Improve one source, correction, or adapter at a time.</h2>
        </div>
        <div className="launch-contribute__links">
          <Link href="/sources">
            <span>01</span>
            Request a source review
          </Link>
          <Link href="/corrections">
            <span>02</span>
            Build a correction packet
          </Link>
          <Link href="/contributors">
            <span>03</span>
            Read the review expectations
          </Link>
        </div>
      </section>
    </div>
  );
}
