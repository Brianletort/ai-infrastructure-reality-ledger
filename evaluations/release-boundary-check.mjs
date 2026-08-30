import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { relative, resolve } from "node:path";

import { findRestrictedPublishPaths } from "./core.mjs";

const ROOT = process.cwd();
const LOCAL_ROOT = resolve(ROOT, ".local");
const HOSTING_ROOT = resolve(ROOT, "apps/web/.next");

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return lstatSync(path).isDirectory() ? walk(path) : [path];
  });
}

function resolvesIntoLocal(paths) {
  if (!existsSync(LOCAL_ROOT)) {
    return [];
  }
  const localPrefix = `${realpathSync(LOCAL_ROOT)}/`;
  return paths.filter((path) => {
    const absolute = resolve(ROOT, path);
    return (
      existsSync(absolute) &&
      lstatSync(absolute).isSymbolicLink() &&
      `${realpathSync(absolute)}/`.startsWith(localPrefix)
    );
  });
}

const sourcePackagePaths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: ROOT, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const hostingPackagePaths = existsSync(HOSTING_ROOT)
  ? walk(HOSTING_ROOT).map((path) => relative(ROOT, path))
  : [];
const ignoredRulePresent = /^\.local\/$/m.test(readFileSync(resolve(ROOT, ".gitignore"), "utf8"));
const failures = [
  ...findRestrictedPublishPaths(sourcePackagePaths).map(
    (path) => `source package includes restricted path: ${path}`,
  ),
  ...findRestrictedPublishPaths(hostingPackagePaths).map(
    (path) => `hosting package includes restricted path: ${path}`,
  ),
  ...resolvesIntoLocal(sourcePackagePaths).map(
    (path) => `source package symlink resolves into .local/**: ${path}`,
  ),
  ...resolvesIntoLocal(hostingPackagePaths).map(
    (path) => `hosting package symlink resolves into .local/**: ${path}`,
  ),
];
if (!ignoredRulePresent) {
  failures.push(".gitignore must contain the exact .local/ exclusion");
}
if (!existsSync(HOSTING_ROOT)) {
  failures.push("hosting package is absent; run the production build before this check");
}

process.stdout.write(
  `${JSON.stringify({
    status: failures.length === 0 ? "pass" : "fail",
    sourcePackageFileCount: sourcePackagePaths.length,
    hostingPackageFileCount: hostingPackagePaths.length,
    excludedPattern: ".local/**",
    failures,
  })}\n`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
