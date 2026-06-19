#!/usr/bin/env python3
"""
ci/quality_gate.py

Reads every scanner artifact in ./reports, normalizes findings into a single
severity model (CRITICAL / HIGH / MEDIUM / LOW / INFO), writes a consolidated
landing page (reports/summary.html) that links out to each tool's full report,
and exits non-zero if findings exceed the configured thresholds.

Thresholds are read from the environment (set in the Jenkinsfile):
    MAX_CRITICAL  (default 0)
    MAX_HIGH      (default 5)

The script is intentionally tolerant: a missing or empty report is treated as
"tool produced nothing" rather than an error, so one broken scanner never masks
the others.
"""

import os
import json
import glob
import html
import datetime
from collections import defaultdict

REPORTS_DIR = "reports"
SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]

MAX_CRITICAL = int(os.environ.get("MAX_CRITICAL", "0"))
MAX_HIGH = int(os.environ.get("MAX_HIGH", "5"))


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def _cvss_to_sev(score):
    try:
        s = float(score)
    except (TypeError, ValueError):
        return None
    if s >= 9.0:
        return "CRITICAL"
    if s >= 7.0:
        return "HIGH"
    if s >= 4.0:
        return "MEDIUM"
    if s > 0:
        return "LOW"
    return "INFO"


def _level_to_sev(level):
    return {"error": "HIGH", "warning": "MEDIUM",
            "note": "LOW", "none": "INFO"}.get((level or "").lower(), "LOW")


# --------------------------------------------------------------------------- #
# SARIF parsing (Semgrep, Trivy fs/image, Gitleaks)
# --------------------------------------------------------------------------- #
def parse_sarif(path):
    counts = defaultdict(int)
    data = _load_json(path)
    if not data:
        return counts
    for run in data.get("runs", []):
        # Build ruleId -> security-severity (CVSS) map from the driver rules.
        rule_sev = {}
        driver = run.get("tool", {}).get("driver", {})
        for rule in driver.get("rules", []):
            props = rule.get("properties", {}) or {}
            sev = _cvss_to_sev(props.get("security-severity"))
            if not sev:
                tags = [t.upper() for t in props.get("tags", [])]
                for cand in SEVERITIES:
                    if cand in tags:
                        sev = cand
                        break
            if sev:
                rule_sev[rule.get("id")] = sev

        for res in run.get("results", []):
            sev = None
            props = res.get("properties", {}) or {}
            sev = _cvss_to_sev(props.get("security-severity"))
            if not sev:
                sev = rule_sev.get(res.get("ruleId"))
            if not sev:
                sev = _level_to_sev(res.get("level"))
            counts[sev] += 1
    return counts


# --------------------------------------------------------------------------- #
# ZAP JSON parsing
# --------------------------------------------------------------------------- #
ZAP_RISK = {"3": "HIGH", "2": "MEDIUM", "1": "LOW", "0": "INFO"}


def parse_zap(path):
    counts = defaultdict(int)
    data = _load_json(path)
    if not data:
        return counts
    for site in data.get("site", []):
        for alert in site.get("alerts", []):
            sev = ZAP_RISK.get(str(alert.get("riskcode", "0")), "INFO")
            instances = len(alert.get("instances", [])) or 1
            counts[sev] += instances
    return counts


# --------------------------------------------------------------------------- #
# pip-audit JSON parsing
# --------------------------------------------------------------------------- #
def parse_pip_audit(path):
    counts = defaultdict(int)
    data = _load_json(path)
    if not data:
        return counts
    deps = data.get("dependencies", data) if isinstance(data, dict) else data
    if isinstance(deps, list):
        for dep in deps:
            for _vuln in dep.get("vulns", []):
                counts["MEDIUM"] += 1  # pip-audit omits severity; treat as MEDIUM
    return counts


# --------------------------------------------------------------------------- #
# npm audit JSON parsing
# --------------------------------------------------------------------------- #
NPM_SEV = {"critical": "CRITICAL", "high": "HIGH",
           "moderate": "MEDIUM", "low": "LOW", "info": "INFO"}


def parse_npm_audit(path):
    counts = defaultdict(int)
    data = _load_json(path)
    if not data:
        return counts
    meta = (data.get("metadata", {}) or {}).get("vulnerabilities", {})
    for k, v in meta.items():
        sev = NPM_SEV.get(k.lower())
        if sev:
            counts[sev] += int(v)
    return counts


# --------------------------------------------------------------------------- #
# Report registry: (label, category, parser, glob, linked_report)
# --------------------------------------------------------------------------- #
def gather():
    rows = []
    registry = [
        ("Gitleaks", "Secrets", parse_sarif, "gitleaks.sarif", "gitleaks.sarif"),
        ("Semgrep (api)", "SAST", parse_sarif, "semgrep-api.sarif", "semgrep-api.sarif"),
        ("Semgrep (ui)", "SAST", parse_sarif, "semgrep-ui.sarif", "semgrep-ui.sarif"),
        ("Bandit (api)", "SAST", None, "bandit-api.html", "bandit-api.html"),
        ("Trivy deps (api)", "SCA", parse_sarif, "trivy-fs-api.sarif", "trivy-fs-api.sarif"),
        ("Trivy deps (ui)", "SCA", parse_sarif, "trivy-fs-ui.sarif", "trivy-fs-ui.sarif"),
        ("pip-audit (api)", "SCA", parse_pip_audit, "pip-audit.json", "pip-audit.json"),
        ("npm audit (ui)", "SCA", parse_npm_audit, "npm-audit.json", "npm-audit.json"),
    ]
    for label, category, parser, fname, link in registry:
        path = os.path.join(REPORTS_DIR, fname)
        present = os.path.exists(path)
        counts = defaultdict(int)
        if present and parser:
            counts = parser(path)
        rows.append({
            "label": label, "category": category, "present": present,
            "counts": counts,
            "link": link if os.path.exists(os.path.join(REPORTS_DIR, link)) else None,
        })
    return rows


# --------------------------------------------------------------------------- #
# HTML summary
# --------------------------------------------------------------------------- #
SEV_COLOR = {"CRITICAL": "#b3001b", "HIGH": "#e8590c",
             "MEDIUM": "#f08c00", "LOW": "#2b8a3e", "INFO": "#868e96"}


def write_summary(rows, totals, gate_passed, breaches):
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    badge = ("PASSED", "#2b8a3e") if gate_passed else ("FAILED", "#b3001b")

    def cell(n, sev):
        if not n:
            return '<td style="text-align:center;color:#adb5bd">0</td>'
        return (f'<td style="text-align:center;font-weight:600;'
                f'color:{SEV_COLOR[sev]}">{n}</td>')

    body = []
    body.append("<tr>"
                "<th style='text-align:left'>Scanner</th><th>Stage</th>"
                + "".join(f"<th>{s.title()}</th>" for s in SEVERITIES)
                + "<th>Report</th></tr>")
    for r in rows:
        link = (f'<a href="{html.escape(r["link"])}">open</a>'
                if r["link"] else
                ('<span style="color:#adb5bd">—</span>'
                 if r["present"] else '<span style="color:#adb5bd">no data</span>'))
        body.append(
            "<tr>"
            f"<td>{html.escape(r['label'])}</td>"
            f"<td style='text-align:center'>{r['category']}</td>"
            + "".join(cell(r["counts"].get(s, 0), s) for s in SEVERITIES)
            + f"<td style='text-align:center'>{link}</td></tr>"
        )

    totals_row = ("<tr style='border-top:2px solid #343a40;font-weight:700'>"
                  "<td>TOTAL</td><td></td>"
                  + "".join(f"<td style='text-align:center;color:{SEV_COLOR[s]}'>"
                            f"{totals.get(s, 0)}</td>" for s in SEVERITIES)
                  + "<td></td></tr>")

    gate_note = ""
    if breaches:
        gate_note = ("<p style='color:#b3001b'><strong>Threshold breaches:</strong> "
                     + "; ".join(breaches) + "</p>")

    out = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Security Assessment Summary</title>
<style>
 body{{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
       margin:2rem auto;max-width:960px;color:#212529;padding:0 1rem}}
 h1{{font-size:1.5rem;margin-bottom:.25rem}}
 .meta{{color:#868e96;font-size:.9rem;margin-bottom:1.5rem}}
 .badge{{display:inline-block;padding:.2rem .8rem;border-radius:999px;
         color:#fff;font-weight:700;background:{badge[1]}}}
 table{{border-collapse:collapse;width:100%;font-size:.9rem}}
 th,td{{padding:.5rem .6rem;border-bottom:1px solid #e9ecef}}
 thead,tr:first-child{{background:#f8f9fa}}
 .legend{{margin-top:1rem;font-size:.8rem;color:#868e96}}
</style></head><body>
<h1>Security Assessment &mdash; <span class="badge">{badge[0]}</span></h1>
<div class="meta">Generated {ts} &middot; Thresholds: CRITICAL &le; {MAX_CRITICAL},
 HIGH &le; {MAX_HIGH}</div>
{gate_note}
<table>{''.join(body)}{totals_row}</table>
<p class="legend">SAST = static code analysis &middot; SCA = dependency analysis
 &middot; DAST = running-app testing. Click "open" for each tool's full report.
 Counts are normalized across tools and are a triage aid, not a substitute for
 reading the detailed findings.</p>
</body></html>"""

    with open(os.path.join(REPORTS_DIR, "summary.html"), "w", encoding="utf-8") as fh:
        fh.write(out)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)
    rows = gather()

    totals = defaultdict(int)
    for r in rows:
        for sev, n in r["counts"].items():
            totals[sev] += n

    breaches = []
    if totals.get("CRITICAL", 0) > MAX_CRITICAL:
        breaches.append(f"CRITICAL {totals['CRITICAL']} > {MAX_CRITICAL}")
    if totals.get("HIGH", 0) > MAX_HIGH:
        breaches.append(f"HIGH {totals['HIGH']} > {MAX_HIGH}")
    gate_passed = not breaches

    write_summary(rows, totals, gate_passed, breaches)

    # Console summary for the Jenkins log.
    print("\n=================  SECURITY ASSESSMENT  =================")
    for sev in SEVERITIES:
        print(f"  {sev:<9}: {totals.get(sev, 0)}")
    print("--------------------------------------------------------")
    print(f"  Thresholds : CRITICAL<={MAX_CRITICAL}  HIGH<={MAX_HIGH}")
    print(f"  Gate       : {'PASSED' if gate_passed else 'FAILED'}")
    if breaches:
        print("  Breaches   : " + "; ".join(breaches))
    print("  Summary    : reports/summary.html")
    print("========================================================\n")

    raise SystemExit(0 if gate_passed else 1)


if __name__ == "__main__":
    main()
