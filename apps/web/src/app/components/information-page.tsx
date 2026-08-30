import { Fragment, type ReactNode } from "react";

import { ModeLabel, PageIntro } from "./editorial";

export interface InformationSection {
  title: string;
  body: ReactNode;
}

export function InformationPage({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: InformationSection[];
}) {
  return (
    <div className="page-shell">
      <PageIntro
        eyebrow={eyebrow}
        title={title}
        summary={summary}
        meta={<ModeLabel />}
      />
      <div className="prose">
        {sections.map((section) => (
          <Fragment key={section.title}>
            <h2>{section.title}</h2>
            <div>{section.body}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
