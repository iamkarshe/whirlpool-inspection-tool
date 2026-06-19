#!/usr/bin/env python3
"""
dep_tally.py — compare the packages declared in pyproject.toml, locked in
uv.lock, and pinned in requirements.txt, so you can see which file is the
real source of truth before retiring one.

Usage:
    python3 dep_tally.py                 # uses ./pyproject.toml ./uv.lock ./requirements.txt
    python3 dep_tally.py path/to/api     # looks for the three files in that dir

Requires Python 3.11+ (for the built-in tomllib).
"""

import sys
import os
import re

try:
    import tomllib
except ModuleNotFoundError:
    try:
        import tomli as tomllib  # Python < 3.11 fallback
    except ModuleNotFoundError:
        sys.exit(
            "Need a TOML parser. On Python 3.11+ it's built in; "
            "on older Python run: pip install tomli"
        )


# --------------------------------------------------------------------------- #
def normalize(name):
    """PEP 503 normalization: lowercase, collapse runs of -_. into a single -."""
    return re.sub(r"[-_.]+", "-", name.strip().lower())


def parse_pyproject(path):
    """Return {normalized_name: raw_spec} for declared (direct) dependencies."""
    deps = {}
    if not os.path.exists(path):
        return deps
    with open(path, "rb") as fh:
        data = tomllib.load(fh)

    project = data.get("project", {})
    # PEP 621 main dependencies
    raw = list(project.get("dependencies", []))
    # optional-dependencies (extras)
    for group in project.get("optional-dependencies", {}).values():
        raw.extend(group)
    # PEP 735 dependency-groups (e.g. dev)
    for group in data.get("dependency-groups", {}).values():
        raw.extend(g for g in group if isinstance(g, str))

    for spec in raw:
        name = re.split(r"[<>=!~;@ \[(]", spec, 1)[0]
        if name:
            deps[normalize(name)] = spec
    return deps


def parse_uv_lock(path):
    """Return {normalized_name: version} for every package in uv.lock."""
    pkgs = {}
    if not os.path.exists(path):
        return pkgs
    with open(path, "rb") as fh:
        data = tomllib.load(fh)
    for pkg in data.get("package", []):
        name = pkg.get("name")
        if name:
            pkgs[normalize(name)] = pkg.get("version", "?")
    return pkgs


def parse_requirements(path):
    """Return {normalized_name: version_or_spec} from requirements.txt."""
    reqs = {}
    if not os.path.exists(path):
        return reqs
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.split("#", 1)[0].strip()
            if not line or line.startswith("-"):
                continue  # skip blanks, comments, -r/-e/--hash
            line = line.split(";", 1)[0].strip()  # drop environment markers
            m = re.match(r"^([A-Za-z0-9._-]+)\s*(.*)$", line)
            if not m:
                continue
            name, rest = m.group(1), m.group(2).strip()
            ver = rest[2:].strip() if rest.startswith("==") else (rest or "(unpinned)")
            reqs[normalize(name)] = ver
    return reqs


# --------------------------------------------------------------------------- #
def section(title):
    print("\n" + title)
    print("-" * len(title))


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "."
    pyproj = parse_pyproject(os.path.join(base, "pyproject.toml"))
    lock = parse_uv_lock(os.path.join(base, "uv.lock"))
    reqs = parse_requirements(os.path.join(base, "requirements.txt"))

    print("=" * 60)
    print("DEPENDENCY TALLY")
    print("=" * 60)
    print(f"  pyproject.toml  declared (direct) : {len(pyproj):>4}")
    print(f"  uv.lock         resolved (all)     : {len(lock):>4}")
    print(f"  requirements.txt pinned            : {len(reqs):>4}")

    # --- requirements.txt vs uv.lock (the key comparison) ---
    only_req = sorted(set(reqs) - set(lock))
    only_lock = sorted(set(lock) - set(reqs))
    mismatches = sorted(
        n
        for n in (set(reqs) & set(lock))
        if reqs[n] not in ("(unpinned)",) and reqs[n] != lock[n]
    )

    section(f"In requirements.txt but NOT in uv.lock ({len(only_req)})")
    print("  (stale / extra entries — uv doesn't know about these)")
    for n in only_req:
        print(f"    {n} == {reqs[n]}")
    if not only_req:
        print("    none")

    section(f"In uv.lock but NOT in requirements.txt ({len(only_lock)})")
    print("  (requirements.txt is missing these — usually transitive deps)")
    for n in only_lock:
        print(f"    {n} == {lock[n]}")
    if not only_lock:
        print("    none")

    section(f"Version mismatches (same package, different version) ({len(mismatches)})")
    for n in mismatches:
        print(f"    {n}: requirements.txt={reqs[n]}  uv.lock={lock[n]}")
    if not mismatches:
        print("    none")

    # --- declared deps coverage ---
    missing_from_lock = sorted(set(pyproj) - set(lock))
    section("Declared deps (pyproject.toml) missing from uv.lock")
    if missing_from_lock:
        print("  (run `uv lock` — your lockfile is out of date)")
        for n in missing_from_lock:
            print(f"    {n}  ({pyproj[n]})")
    else:
        print("    none — uv.lock covers every declared dependency")

    # --- verdict ---
    section("VERDICT")
    if not reqs:
        print("  No requirements.txt found — uv.lock is already your only lock source.")
    elif not only_req and not mismatches:
        print("  requirements.txt is a SUBSET of uv.lock with no conflicts.")
        print("  -> Safe to delete requirements.txt; uv.lock is the source of truth.")
    elif only_req:
        print("  requirements.txt contains packages uv.lock does NOT have.")
        print("  -> Investigate those before deleting; they may be a real dependency")
        print("     missing from pyproject.toml, or genuinely stale.")
    else:
        print("  Versions differ between the two files.")
        print(
            "  -> Regenerate from uv (`uv export`) or reconcile before trusting either."
        )
    print()


if __name__ == "__main__":
    main()
