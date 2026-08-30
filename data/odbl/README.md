# ODbL data artifacts

Files in this directory are data artifacts, not Apache-2.0 source code.

`north-america-facilities.json` is attributed to © OpenStreetMap contributors and is distributed
under the [Open Data Commons Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Public use or redistribution must retain attribution and comply with ODbL share-alike obligations.

The current checked-in artifact declares `"synthetic": true`; its records are deterministic test
fixtures, not claims about real facilities. Run `npm run inventory:refresh` to attempt a bounded
worker-only live refresh, or `npm run inventory:fixture` to regenerate the fixture artifact.

Exact source geometry is intentionally excluded. Restricted content-addressed evidence is local
only under `.local/restricted-evidence/`.
