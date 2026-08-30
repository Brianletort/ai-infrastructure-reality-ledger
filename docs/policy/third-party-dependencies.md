# Third-party dependency disposition

This document records the project's approved handling for reviewed third-party packages in the
Reality Ledger open-source beta. It is operational compliance guidance, not legal advice. The
applicable license text controls.

## Source of truth

- `package-lock.json` defines the exact installed package set.
- `apps/worker/uv.lock` defines the exact locked Python package set.
- `THIRD_PARTY_NOTICES.json` records package-specific approvals, attribution, source and license
  links, obligations, and modification status.
- `THIRD_PARTY_NOTICES.python.json` records every registry package in `uv.lock`, matched to
  installed distribution metadata. Unknown, custom, missing, or unmapped licenses are denied;
  allow-listed permissive licenses use `allowed-policy`; review-list licenses remain
  `review-required` until separately approved.
- `THIRD_PARTY_NOTICES.md` is deterministic generated output for distribution.
- `npm run notices:check` proves that the generated notice matches the machine-readable manifest.
- The static licensing gate fails if a reviewed package is missing, stale, not explicitly
  approved, lacks a required field or obligation, or records a prohibited modification state.

Adding or upgrading a reviewed-license package requires a new explicit package/version
disposition. A license-level approval does not automatically approve future packages.

## Approved handling

### LGPL-3.0-or-later

The listed `@img/sharp-libvips-darwin-arm64` package is distributed as the exact, unmodified
prebuilt dependency installed from the lockfile and used through the upstream dynamically loaded
Sharp/libvips stack. Preserve the license and source links, notice, dynamic-linking arrangement,
and users' applicable relinking rights. Do not patch, statically incorporate, or replace covered
files under this disposition. Any such change requires renewed review before distribution.

### CC-BY-4.0

The listed `caniuse-lite` data package is distributed unmodified. Retain the Can I Use and
Browserslist attribution, identify CC-BY-4.0, and preserve the license and source links. If the
covered material is adapted, identify the changes and obtain a renewed disposition before
distribution.

### MPL-2.0

The approved axe-core and Lightning CSS packages are distributed unmodified. MPL is treated as
file-level copyleft: preserve notices, license and source links, and do not modify covered
dependency files under the current disposition. A proposed modification requires renewed review
and a plan to make the modified covered source available under the applicable terms.

The Python `certifi@2026.7.22` package is also MPL-2.0 and has a separate exact-package approval
under the same notice, attribution/source-link, file-level copyleft, and unmodified-file controls.
Future `certifi` versions require a new disposition.

### BlueOak-1.0.0

The listed `minimatch` package is distributed unmodified. Retain the recorded notice, attribution,
license terms, and source/license links.

## Release rule

Before any beta release:

1. Install from the exact lockfile without patching reviewed dependencies.
2. Run `npm run notices:check`.
3. Run `npm run gates:release`.
4. Confirm `license.packages` and `license.python-packages` pass and distribute
   `THIRD_PARTY_NOTICES.md` with the beta.
5. Stop for review if the manifest, lockfile, modification status, or distribution model changes.
