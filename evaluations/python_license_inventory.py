import argparse
import importlib.metadata
import json
import re
from pathlib import Path
from typing import Any

import tomllib

ROOT = Path(__file__).parents[1]
LOCK_PATH = ROOT / "apps" / "worker" / "uv.lock"
CONFIG_PATH = ROOT / "evaluations" / "gate.config.json"

LICENSE_ALIASES = {
    "Apache 2.0": "Apache-2.0",
    "PSFL": "PSF-2.0",
}
CLASSIFIER_LICENSES = {
    "License :: OSI Approved :: Apache Software License": "Apache-2.0",
    "License :: OSI Approved :: BSD License": "BSD",
    "License :: OSI Approved :: MIT License": "MIT",
    "License :: OSI Approved :: Mozilla Public License 2.0 (MPL 2.0)": "MPL-2.0",
    "License :: OSI Approved :: Python Software Foundation License": "PSF-2.0",
}
PACKAGE_LICENSE_OVERRIDES = {
    ("colorama", "0.4.6"): "BSD-3-Clause",
    ("nodeenv", "1.10.0"): "BSD-3-Clause",
}
LICENSE_URLS = {
    "Apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0",
    "BSD-2-Clause": "https://opensource.org/license/bsd-2-clause",
    "BSD-3-Clause": "https://opensource.org/license/bsd-3-clause",
    "MIT": "https://opensource.org/license/mit",
    "MPL-2.0": "https://www.mozilla.org/MPL/2.0/",
    "PSF-2.0": "https://docs.python.org/3/license.html",
}


def _canonical_name(value: str) -> str:
    return re.sub(r"[-_.]+", "-", value).lower()


def _classify_license(license_name: str, policy: dict[str, Any]) -> str:
    if not license_name or re.search(
        r"unknown|custom|source-specific|dataset-specific|restricted",
        license_name,
        re.IGNORECASE,
    ):
        return "denied"
    terms = [term.strip() for term in re.sub(r"[()]", "", license_name).split(" OR ")]
    if all(term in policy["allow"] for term in terms):
        return "allowed-policy"
    if all(term in policy["allow"] or term in policy["review"] for term in terms):
        return "review-required"
    return "denied"


def _resolved_license(
    package_name: str,
    version: str,
    metadata: importlib.metadata.PackageMetadata,
) -> str:
    override = PACKAGE_LICENSE_OVERRIDES.get((package_name, version))
    if override:
        return override
    expression = metadata.get("License-Expression")
    if expression:
        return LICENSE_ALIASES.get(expression, expression)
    raw = metadata.get("License")
    if raw:
        normalized = LICENSE_ALIASES.get(raw, raw)
        if normalized != "BSD":
            return normalized
    candidates = {
        CLASSIFIER_LICENSES[classifier]
        for classifier in metadata.get_all("Classifier", [])
        if classifier in CLASSIFIER_LICENSES
    }
    return next(iter(candidates)) if len(candidates) == 1 else "UNKNOWN"


def _source_url(
    package_name: str,
    version: str,
    metadata: importlib.metadata.PackageMetadata,
) -> str:
    project_urls: list[tuple[str, str]] = []
    for value in metadata.get_all("Project-URL", []):
        label, separator, url = value.partition(",")
        if separator and url.strip().startswith(("https://", "http://")):
            project_urls.append((label.strip().lower(), url.strip()))
    for preferred in ("source", "repository", "code", "homepage"):
        for label, url in project_urls:
            if preferred in label:
                return url.replace("http://github.com/", "https://github.com/")
    homepage = metadata.get("Home-page")
    if homepage and homepage.startswith(("https://", "http://")):
        return homepage.replace("http://github.com/", "https://github.com/")
    return f"https://pypi.org/project/{package_name}/{version}/"


def _license_url(license_name: str, source_url: str) -> str:
    if license_name in LICENSE_URLS:
        return LICENSE_URLS[license_name]
    if " OR " in license_name:
        return "https://spdx.org/licenses/"
    return f"{source_url.rstrip('/')}/blob/main/LICENSE"


def _attribution(metadata: importlib.metadata.PackageMetadata) -> str:
    author = metadata.get("Author")
    if author:
        return f"{author} and contributors."
    name = metadata.get("Name", "Package")
    return f"{name} authors and contributors."


def build_inventory() -> dict[str, Any]:
    lock = tomllib.loads(LOCK_PATH.read_text(encoding="utf-8"))
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    policy = config["licenses"]
    installed = {
        _canonical_name(distribution.metadata["Name"]): distribution
        for distribution in importlib.metadata.distributions()
        if distribution.metadata.get("Name")
    }
    packages: list[dict[str, Any]] = []
    for package in lock["package"]:
        source = package.get("source", {})
        if "registry" not in source:
            continue
        name = _canonical_name(package["name"])
        version = package["version"]
        distribution = installed.get(name)
        if distribution is None or distribution.version != version:
            packages.append(
                {
                    "ecosystem": "python",
                    "name": name,
                    "version": version,
                    "license": "UNKNOWN",
                    "disposition": "denied",
                    "attribution": "",
                    "packageUrl": f"https://pypi.org/project/{name}/{version}/",
                    "sourceUrl": "",
                    "licenseUrl": "",
                    "obligations": [],
                    "modificationStatus": "unverified",
                    "modifiedFiles": [],
                    "metadataEvidence": {
                        "status": "missing-or-version-mismatch",
                    },
                }
            )
            continue
        metadata = distribution.metadata
        license_name = _resolved_license(name, version, metadata)
        source_url = _source_url(name, version, metadata)
        disposition = _classify_license(license_name, policy)
        obligations = [
            "include-notice",
            "provide-license-link",
            "provide-source-link",
        ]
        if disposition == "review-required":
            obligations.append("requires-explicit-approval")
        packages.append(
            {
                "ecosystem": "python",
                "name": name,
                "version": version,
                "license": license_name,
                "disposition": disposition,
                "attribution": _attribution(metadata),
                "packageUrl": f"https://pypi.org/project/{name}/{version}/",
                "sourceUrl": source_url,
                "licenseUrl": _license_url(license_name, source_url),
                "obligations": obligations,
                "modificationStatus": "unmodified",
                "modifiedFiles": [],
                "metadataEvidence": {
                    "status": "installed-metadata-matched-lock",
                    "installedName": metadata.get("Name"),
                    "licenseExpression": metadata.get("License-Expression"),
                    "license": metadata.get("License"),
                    "licenseClassifiers": sorted(
                        classifier
                        for classifier in metadata.get_all("Classifier", [])
                        if classifier.startswith("License ::")
                    ),
                },
            }
        )
    packages.sort(key=lambda package: (package["name"], package["version"]))
    return {
        "schemaVersion": "1.0.0",
        "ecosystem": "python",
        "lockfile": "apps/worker/uv.lock",
        "metadataSource": "installed importlib.metadata matched to uv.lock",
        "packages": packages,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", type=Path)
    arguments = parser.parse_args()
    rendered = json.dumps(build_inventory(), indent=2, sort_keys=True) + "\n"
    if arguments.check:
        if arguments.check.read_text(encoding="utf-8") != rendered:
            raise SystemExit(
                f"{arguments.check} is stale; regenerate the Python license inventory"
            )
        print("Python license inventory is deterministic and current.")
        return 0
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
