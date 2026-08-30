import Link from "next/link";

import { ModeLabel, PageIntro } from "./components/editorial";

export default function NotFound() {
  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="404 · unsupported record"
        title="Nothing is asserted here"
        summary="The requested local record or route does not exist. The ledger will not synthesize a result for an unknown identifier."
        meta={<ModeLabel />}
      />
      <div className="button-row">
        <Link className="button" href="/">
          Return to briefing
        </Link>
        <Link className="text-link" href="/search">
          Search checked-in records
        </Link>
      </div>
    </div>
  );
}
