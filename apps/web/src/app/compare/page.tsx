import type { Metadata } from "next";

import {
  ComparisonSelector,
  type ComparisonOption,
} from "../components/comparison-selector";
import { ModeLabel, PageIntro } from "../components/editorial";
import {
  getExplicitProvider,
  getExplicitProviders,
  getSafeFacilities,
  getSafeFacility,
  parseComparisonSelection,
} from "../../lib/editorial-data";

interface ComparePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(props: ComparePageProps): Promise<Metadata> {
  const { id } = await props.searchParams;
  const parsed = parseComparisonSelection(id);
  const query = parsed.ids.map((value) => `id=${encodeURIComponent(value)}`).join("&");
  return {
    title: "Compare records",
    description: "Compare two to four explicit synthetic facility or provider records.",
    alternates: { canonical: query ? `/compare?${query}` : "/compare" },
  };
}

type Comparable =
  | {
      id: string;
      label: string;
      kind: "facility";
      operator: string | null;
      location: string | null;
      capacity: string | null;
      status: string;
      evidenceCount: number;
    }
  | {
      id: string;
      label: string;
      kind: "provider";
      operator: string;
      location: null;
      capacity: null;
      status: null;
      evidenceCount: number;
    };

function getComparable(id: string): Comparable | null {
  const facility = getSafeFacility(id);
  if (facility) {
    return {
      id,
      label: facility.name ?? "Unnamed facility",
      kind: "facility",
      operator: facility.operator,
      location:
        facility.location.locality ?? facility.location.metro ?? facility.location.macroRegion,
      capacity:
        facility.capacityMw === null ? null : `${facility.capacityMw.toLocaleString()} MW`,
      status: facility.lifecycleState,
      evidenceCount: facility.citations.length,
    };
  }
  const provider = getExplicitProvider(id);
  if (provider) {
    return {
      id,
      label: provider.name,
      kind: "provider",
      operator: provider.name,
      location: null,
      capacity: null,
      status: null,
      evidenceCount: provider.facilityCount,
    };
  }
  return null;
}

function display(value: string | number | null): string {
  return value === null ? "Unknown" : String(value);
}

export default async function ComparePage(props: ComparePageProps) {
  const { id } = await props.searchParams;
  const parsed = parseComparisonSelection(id);
  const options: ComparisonOption[] = [
    ...getSafeFacilities().map((facility) => ({
      id: facility.id,
      label: facility.name ?? "Unnamed facility",
      kind: "facility" as const,
    })),
    ...getExplicitProviders().map((provider) => ({
      id: provider.id,
      label: provider.name,
      kind: "provider" as const,
    })),
  ];
  const records = parsed.ids
    .map(getComparable)
    .filter((record): record is Comparable => record !== null);
  const unknownIds = parsed.ids.filter((selectedId) => getComparable(selectedId) === null);
  const rows: Array<
    [string, (record: Comparable) => string | number | null]
  > = [
    ["Record type", (record) => record.kind],
    ["Explicit operator", (record) => record.operator],
    ["Location", (record) => record.location],
    ["Commissioned capacity", (record) => record.capacity],
    ["Lifecycle state", (record) => record.status],
    ["Evidence / explicit links", (record) => record.evidenceCount],
  ];

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="Factual-field comparison"
        title="Compare records"
        summary="Place two to four synthetic fixture records side by side. The comparison uses only explicit fields and renders unsupported values as unknown."
        meta={<ModeLabel publicInventory />}
      />
      <ComparisonSelector options={options} initialIds={parsed.ids} />
      {!parsed.ok ? (
        <p className="empty-state">{parsed.error} Selection is encoded as repeated “id” query parameters.</p>
      ) : unknownIds.length > 0 ? (
        <p className="error-state" role="alert">
          {unknownIds.length} selected record{unknownIds.length === 1 ? " is" : "s are"} unknown
          and cannot be compared.
        </p>
      ) : (
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <caption className="sr-only">Comparison of selected ledger records</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                {records.map((record) => (
                  <th scope="col" key={record.id}>
                    {record.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, accessor]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {records.map((record) => (
                    <td key={record.id} data-unknown={accessor(record) === null || undefined}>
                      {display(accessor(record))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
