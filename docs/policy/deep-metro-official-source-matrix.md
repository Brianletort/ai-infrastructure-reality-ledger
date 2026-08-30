# Deep-metro official source matrix and limitations

These are verified official landing pages, not verified data-center APIs. All current adapters are
`manual-link-only`, declare no machine endpoint, and prohibit interactive portal scraping.

| Metro | Official source | Mode | Admissible use and limitation |
| --- | --- | --- | --- |
| Northern Virginia | [Loudoun County LandMARC](https://www.loudoun.gov/landmarc) | Manual/link-only | Official portal landing page. A specific manually retrieved record still needs exact-reference capture, entity matching, and independent review. |
| Northern Virginia | [Loudoun open-government property and land-use resources](https://www.loudoun.gov/5037/Open-Government-Property-and-Land-Use) | Manual/link-only | Resource index, not a data-center registry. Do not infer activation or facility identity. |
| Dallas–Fort Worth | [DallasNow official portal information](https://dallascityhall.com/departments/sustainabledevelopment/Pages/DallasNow.aspx) | Manual/link-only | Portal information only. No machine endpoint is asserted and portal access is not automated. |
| Dallas–Fort Worth | [Dallas commercial permits guidance](https://dallascityhall.com/departments/sustainabledevelopment/buildinginspection/Pages/commercial_overview.aspx) | Manual/link-only | Guidance, not permit evidence and not data-center-specific. |
| Phoenix | [Phoenix open-data portal statement/licensing](https://phoenixopendata.com/pages/tips) | Manual/link-only | Licensing and portal-use context only; it identifies no facility event. |
| Phoenix | [Phoenix building-permit dataset landing page](https://www.phoenixopendata.com/dataset/phoenix-az-building-permit-data) | Manual/link-only | Housing aggregate only, not data-center evidence. A separately verified directly matching official record is required. |
| Toronto | [Toronto Open Data](https://open.toronto.ca/) | Manual/link-only | Discovery portal, not a data-center registry. No machine endpoint is asserted. |
| Toronto | [Toronto active building permits landing page](https://open.toronto.ca/dataset/building-permits-active-permits/) | Manual/link-only | Currently retired. It is not a live source and cannot establish an event without separately preserved and reviewed official evidence. |

Machine-readable configuration is in
`sources/manifests/deep-metro-official-sources.json`. A healthy manual adapter means only that its
configuration is valid and manual review is required; it does not mean the underlying portal or a
particular factual record was fetched or approved.
