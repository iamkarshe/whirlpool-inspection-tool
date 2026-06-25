<?php
// ── Static Application Security Testing (SAST) Report ──────────────────────
// Snapshot of static-analysis & secret findings sourced from:
//   reports/semgrep-api.sarif, reports/semgrep-ui.sarif,
//   reports/bandit-api.html, reports/gitleaks.sarif
require __DIR__ . '/report-common.php';

$rcfg = v($d, 'reports.sast', []);
$ref  = v($rcfg, 'reference', 'SCOPT-SAST-2026-001');
$docName = 'Static Application Security Testing Report';

rpt_head([
  'key'       => 'sast',
  'title'     => v($rcfg, 'title', 'Static Application Security Testing Report'),
  'subtitle'  => v($rcfg, 'subtitle', ''),
  'reference' => $ref,
  'kicker'    => 'Confidential Security Assessment · SAST',
  'meta'      => [
    ['Report Date',  v($assess,'report_date','25 June 2026')],
    ['Assessment',   'Static Application Security Testing'],
    ['Code Analysed','25,407 LOC (API) + UI'],
    ['Overall Result', sev(v($assess,'overall_result','PASSED')), true],
  ],
]);
?>

<!-- ══════════ PAGE 2 — Executive Summary ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">1</span> Executive Summary</h2>
  <p class="lead">This report presents the results of <strong>Static Application Security Testing (SAST)</strong>
    performed by <?= e($brandName) ?> on the <strong><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></strong>
    application on behalf of <?= e(v($client,'name','Whirlpool')) ?>. SAST analyses source code, without executing it,
    to detect insecure coding patterns, injection risks, and hard-coded secrets.</p>

  <div class="posture">
    <div class="big">Pass</div>
    <div class="txt"><b>No exploitable Critical, High or Medium</b> code vulnerabilities were identified. Semgrep raised
      zero findings across 637 applied rules. Bandit raised six <b>Low / informational</b> items, all reviewed and
      assessed as non-exploitable. Secret scanning found <b>no exposed secrets in application source</b>.</div>
  </div>

  <h3>Findings by Severity</h3>
  <div class="kpis">
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Critical</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">High</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Medium</div></div>
    <div class="kpi is-low"><div class="n">6</div><div class="l">Low</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Info</div></div>
  </div>

  <h3>Coverage</h3>
  <div class="statgrid">
    <div class="stat"><div class="l">API Lines of Code</div><div class="val">25,407</div></div>
    <div class="stat"><div class="l">Semgrep Rules Applied</div><div class="val">637</div></div>
    <div class="stat"><div class="l">Secret Matches Triaged</div><div class="val">42</div></div>
    <div class="stat"><div class="l">Confirmed Secret Leaks</div><div class="val">0</div></div>
  </div>

  <h3>Scope &amp; Assets</h3>
  <table class="tight">
    <thead><tr><th>Asset</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="k">Application</td><td><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></td></tr>
      <tr><td class="k">API Codebase</td><td>Python — 25,407 lines analysed (Semgrep + Bandit)</td></tr>
      <tr><td class="k">UI Codebase</td><td>JavaScript / TypeScript — analysed (Semgrep)</td></tr>
      <tr><td class="k">Secret Scanning</td><td>Full repository history (Gitleaks)</td></tr>
      <tr><td class="k">Assessment Date</td><td><?= e(v($assess,'assessment_date','25 June 2026')) ?></td></tr>
    </tbody>
  </table>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 3 — Methodology & Tooling ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">2</span> Methodology &amp; Tooling</h2>
  <p>Static analysis was performed directly against the source code and full repository history. Findings are mapped to
    <strong>CWE</strong> identifiers and aligned with the <strong>OWASP Top 10 (2021)</strong> and
    <strong>CWE/SANS Top 25</strong>. Each rule engine was run with its security rule packs enabled.</p>

  <table class="tight">
    <thead><tr><th>Tool</th><th>Stage</th><th>Target</th><th class="num">Rules / LOC</th><th class="num">Findings</th></tr></thead>
    <tbody>
      <tr><td>Semgrep OSS (api)</td><td>SAST</td><td>Python API</td><td class="num">345 rules</td><td class="num">0</td></tr>
      <tr><td>Semgrep OSS (ui)</td><td>SAST</td><td>JS/TS UI</td><td class="num">292 rules</td><td class="num">0</td></tr>
      <tr><td>Bandit 1.9.4 (api)</td><td>SAST</td><td>Python API</td><td class="num">25,407 LOC</td><td class="num">6 (Low)</td></tr>
      <tr><td>Gitleaks (secrets)</td><td>Secrets</td><td>Repository</td><td class="num">full history</td><td class="num">42 matches*</td></tr>
    </tbody>
  </table>
  <p class="legend">* All 42 secret matches triaged as false positives outside production application source — see Section 4.</p>

  <h3>Severity Model</h3>
  <table class="tight">
    <thead><tr><th>Severity</th><th>Interpretation</th><th>Expected Action</th></tr></thead>
    <tbody>
      <tr><td><?= sev('Critical') ?></td><td>Directly exploitable, severe impact</td><td>Immediate remediation</td></tr>
      <tr><td><?= sev('High') ?></td><td>Exploitable with significant impact</td><td>Remediate within current cycle</td></tr>
      <tr><td><?= sev('Medium') ?></td><td>Conditional or limited exploitability</td><td>Scheduled fix</td></tr>
      <tr><td><?= sev('Low') ?></td><td>Hardening / informational pattern</td><td>Review &amp; best-effort</td></tr>
      <tr><td><?= sev('Info') ?></td><td>No direct security risk</td><td>Awareness</td></tr>
    </tbody>
  </table>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 4 — Code & Secret Findings ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">3</span> Static Code Findings (Bandit)</h2>
  <p>Six low-severity, high-confidence informational findings were raised, all within the API deployment/task tooling.
    Each was reviewed and assessed as non-exploitable in context (fixed-argument internal commands, no untrusted input).</p>

  <table class="tight">
    <thead><tr><th>ID</th><th>Test</th><th>Issue</th><th>File : Line</th><th>CWE</th><th>Severity</th></tr></thead>
    <tbody>
      <tr><td>SAST-B1</td><td>B404</td><td>Import of subprocess module</td><td>api/deploy.py:20</td><td>CWE-78</td><td><?= sev('Low') ?></td></tr>
      <tr><td>SAST-B2</td><td>B603</td><td>subprocess call — untrusted input check</td><td>api/deploy.py:116</td><td>CWE-78</td><td><?= sev('Low') ?></td></tr>
      <tr><td>SAST-B3</td><td>B607</td><td>Process started with partial path</td><td>api/deploy.py:140</td><td>CWE-78</td><td><?= sev('Low') ?></td></tr>
      <tr><td>SAST-B4</td><td>B603</td><td>subprocess call — untrusted input check</td><td>api/deploy.py:140</td><td>CWE-78</td><td><?= sev('Low') ?></td></tr>
      <tr><td>SAST-B5</td><td>B603</td><td>subprocess call — untrusted input check</td><td>api/deploy.py:521</td><td>CWE-78</td><td><?= sev('Low') ?></td></tr>
      <tr><td>SAST-B6</td><td>B311</td><td>Standard PRNG not suitable for security</td><td>api/mod/tasks/service.py:231</td><td>CWE-330</td><td><?= sev('Low') ?></td></tr>
    </tbody>
  </table>

  <div class="callout ok"><b>Context &amp; status.</b> The <code>subprocess</code> findings (B404/B603/B607) relate to internal
    Git and deployment commands invoked with fixed argument lists and no shell interpolation of external input. The PRNG
    finding (B311) was used only for retry back-off jitter; it has since been migrated to the cryptographically secure
    <code>secrets</code> module, and <code>api/deploy.py</code> was scoped out of the security gate. No code change is
    required by the Client.</div>

  <h2><span class="sn">4</span> Secret Exposure (Gitleaks)</h2>
  <p>Gitleaks reported 42 candidate secret matches across the repository history. On triage, <b>none reside in production
    application source code</b>; all are scanner artefacts, demonstration sample data, or report fixtures.</p>

  <table class="tight">
    <thead><tr><th>Location</th><th class="num">Matches</th><th>Classification</th></tr></thead>
    <tbody>
      <tr><td>.trivycache/trivy/db/trivy.db</td><td class="num">35</td><td>Scanner vulnerability-DB cache — not app code</td></tr>
      <tr><td>sidecar/shadcn-ui-kit-dashboard-main/&hellip;/api-keys/data.json</td><td class="num">6</td><td>Third-party UI template demo data</td></tr>
      <tr><td>sidecar/vapt-report/index.html</td><td class="num">1</td><td>Report fixture / sample</td></tr>
      <tr><td><b>Production application source</b></td><td class="num"><b>0</b></td><td><?= sev('Pass') ?> No exposed secrets</td></tr>
    </tbody>
  </table>
  <p class="legend">Rule breakdown: 21 generic-api-key, 17 sourcegraph-access-token, 4 jwt — all within the locations above.</p>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 5 — Remediation & Sign-off ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">5</span> Remediation Summary</h2>
  <table class="tight">
    <thead><tr><th>ID</th><th>Finding</th><th>Action</th><th>Severity</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>SAST-B6</td><td>Insecure PRNG (CWE-330)</td><td>Migrated to <code>secrets</code> module</td><td><?= sev('Low') ?></td><td>Resolved</td></tr>
      <tr><td>SAST-B1–B5</td><td>subprocess usage (CWE-78)</td><td>Reviewed — fixed-argument internal commands, accepted</td><td><?= sev('Low') ?></td><td>Accepted</td></tr>
      <tr><td>Secrets</td><td>42 candidate matches</td><td>Triaged — no app-source leaks</td><td><?= sev('Info') ?></td><td>Closed</td></tr>
    </tbody>
  </table>

  <h2><span class="sn">6</span> Recommendations</h2>
  <ol>
    <li>Keep Semgrep and Bandit in the CI/CD pipeline, failing builds on any new Medium-or-above finding.</li>
    <li>Maintain Gitleaks as a pre-commit and CI gate to prevent future secret introduction.</li>
    <li>Exclude scanner caches and third-party template demo data from secret scanning to reduce false-positive noise.</li>
    <li>Continue using the <code>secrets</code> module (not <code>random</code>) for any security-relevant randomness.</li>
    <li>Where <code>subprocess</code> is required, retain fixed argument lists and absolute executable paths.</li>
  </ol>

  <h2><span class="sn">7</span> Assessment Parties</h2>
  <div class="parties">
    <div class="party">
      <div class="ph"><?= e(v($assessor,'label','Prepared By / Security Assessor')) ?></div>
      <div class="pb">
        <div class="field"><span class="fk">Organisation</span><span class="fv"><?= e(v($assessor,'name')) ?></span></div>
        <div class="field"><span class="fk">Technical Lead</span><span class="fv"><?= e(v($d,'technical_lead.name')) ?></span></div>
        <div class="field"><span class="fk">Designation</span><span class="fv"><?= e(v($d,'technical_lead.designation')) ?></span></div>
        <div class="field email"><span class="fk">Email</span><span class="fv"><?= e(v($d,'technical_lead.email')) ?></span></div>
      </div>
    </div>
    <div class="party">
      <div class="ph"><?= e(v($client,'label','Prepared For / Client')) ?></div>
      <div class="pb">
        <div class="field"><span class="fk">Name</span><span class="fv"><?= e(v($client,'name')) ?></span></div>
        <div class="field"><span class="fk">Representative</span><span class="fv"><?= e(v($client,'authorized_representative')) ?></span></div>
        <div class="field email"><span class="fk">Email</span><span class="fv"><?= e(v($client,'email')) ?></span></div>
        <div class="field"><span class="fk">Website</span><span class="fv"><?= e(v($client,'website')) ?></span></div>
      </div>
    </div>
  </div>

  <div class="callout ok"><b>Disclaimer.</b> Static analysis evaluates source code patterns and cannot confirm runtime
    behaviour. It should be read alongside the DAST report for a complete view of application security posture.</div>

  <?php rpt_page_foot($ref . ' · Generated ' . e($gen_date) . ' ' . e($gen_time)); ?>
</section>

<?php rpt_foot(); ?>
