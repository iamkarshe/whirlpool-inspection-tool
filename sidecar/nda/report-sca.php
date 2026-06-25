<?php
// ── Software Composition Analysis (SCA) Report ─────────────────────────────
// Snapshot of dependency / supply-chain findings sourced from:
//   reports/trivy-fs-api.sarif, reports/sbom-api.cdx.json, reports/sbom-ui.cdx.json
require __DIR__ . '/report-common.php';

$rcfg = v($d, 'reports.sca', []);
$ref  = v($rcfg, 'reference', 'SCOPT-SCA-2026-001');
$docName = 'Software Composition Analysis Report';

rpt_head([
  'key'       => 'sca',
  'title'     => v($rcfg, 'title', 'Software Composition Analysis Report'),
  'subtitle'  => v($rcfg, 'subtitle', ''),
  'reference' => $ref,
  'kicker'    => 'Confidential Security Assessment · SCA',
  'meta'      => [
    ['Report Date',  v($assess,'report_date','25 June 2026')],
    ['Assessment',   'Software Composition Analysis'],
    ['Scope',        'API (102 libs) + UI (285 libs)'],
    ['Overall Result', sev(v($assess,'overall_result','PASSED')), true],
  ],
]);
?>

<!-- ══════════ PAGE 2 — Executive Summary ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">1</span> Executive Summary</h2>
  <p class="lead">This report presents the results of a <strong>Software Composition Analysis (SCA)</strong> performed by
    <?= e($brandName) ?> on the <strong><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></strong>
    application on behalf of <?= e(v($client,'name','Whirlpool')) ?>. SCA inspects the third-party and open-source
    components bundled with the application to identify known vulnerabilities (CVEs/advisories), outdated packages,
    and software supply-chain risk.</p>

  <div class="posture warn">
    <div class="big">Pass</div>
    <div class="txt"><b>No Critical or High severity</b> component vulnerabilities were identified across the API and UI
      dependency trees. A single <b>Medium</b> issue was found in a transitive build-time dependency, with a fixed
      version already available. Overall supply-chain risk is assessed as <b>Low</b>.</div>
  </div>

  <h3>Findings by Severity</h3>
  <div class="kpis">
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Critical</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">High</div></div>
    <div class="kpi is-med"><div class="n">1</div><div class="l">Medium</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Low</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Info</div></div>
  </div>

  <h3>Components Analysed</h3>
  <div class="statgrid">
    <div class="stat"><div class="l">API Libraries</div><div class="val">102</div></div>
    <div class="stat"><div class="l">UI Libraries</div><div class="val">285</div></div>
    <div class="stat"><div class="l">Total Components</div><div class="val">387</div></div>
    <div class="stat"><div class="l">Vulnerable</div><div class="val">1</div></div>
  </div>

  <h3>Scope &amp; Assets</h3>
  <table class="tight">
    <thead><tr><th>Asset</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="k">Application</td><td><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></td></tr>
      <tr><td class="k">Components Assessed</td><td><?= e(v($assess,'components','Web Application (UI) and REST API')) ?></td></tr>
      <tr><td class="k">API Dependencies</td><td>Python (PyPI) — 102 libraries (CycloneDX SBOM)</td></tr>
      <tr><td class="k">UI Dependencies</td><td>JavaScript / Node (npm) — 285 libraries (CycloneDX SBOM)</td></tr>
      <tr><td class="k">Environment</td><td><?= e(v($assess,'environment','UAT (Hostinger) and Production (AWS)')) ?></td></tr>
      <tr><td class="k">Assessment Date</td><td><?= e(v($assess,'assessment_date','25 June 2026')) ?></td></tr>
    </tbody>
  </table>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 3 — Methodology & Tooling ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">2</span> Methodology &amp; Tooling</h2>
  <p>The dependency analysis was conducted by generating a <strong>Software Bill of Materials (SBOM)</strong> in
    CycloneDX format for each component and matching every resolved package against curated vulnerability databases
    (GitHub Advisory Database, OSV, NVD). The assessment aligns with the
    <strong>OWASP Top 10 (2021) A06 — Vulnerable and Outdated Components</strong> control area.</p>

  <table class="tight">
    <thead><tr><th>Tool</th><th>Purpose</th><th>Coverage</th></tr></thead>
    <tbody>
      <tr><td class="k">Trivy 0.71.2 (filesystem)</td><td>Dependency vulnerability scanning &amp; SBOM generation</td><td>API + UI</td></tr>
      <tr><td class="k">CycloneDX SBOM</td><td>Authoritative component inventory (name, version, license, hash)</td><td>API + UI</td></tr>
      <tr><td class="k">pip-audit</td><td>Python package advisory cross-check</td><td>API</td></tr>
      <tr><td class="k">npm audit</td><td>Node package advisory cross-check</td><td>UI</td></tr>
    </tbody>
  </table>

  <h3>Severity Model</h3>
  <p>Findings are normalised to a common five-level scale to provide a consistent triage view across tools:</p>
  <table class="tight">
    <thead><tr><th>Severity</th><th>Interpretation</th><th>Expected Action</th></tr></thead>
    <tbody>
      <tr><td><?= sev('Critical') ?></td><td>Remotely exploitable, severe impact</td><td>Immediate remediation</td></tr>
      <tr><td><?= sev('High') ?></td><td>Significant impact, exploit likely</td><td>Remediate within current cycle</td></tr>
      <tr><td><?= sev('Medium') ?></td><td>Limited impact or constrained exploitability</td><td>Scheduled upgrade</td></tr>
      <tr><td><?= sev('Low') ?></td><td>Minor / defence-in-depth</td><td>Best-effort</td></tr>
      <tr><td><?= sev('Info') ?></td><td>Informational, no direct risk</td><td>Awareness</td></tr>
    </tbody>
  </table>

  <div class="callout"><b>Note on counts.</b> Normalised counts are a triage aid produced by tooling and are not a
    substitute for reading the detailed finding below. Build-time and development-only dependencies are flagged but
    weighted lower than runtime-reachable packages.</div>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 4 — Detailed Findings ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">3</span> Detailed Findings</h2>
  <p>One component finding was identified. Full detail is provided below.</p>

  <div class="finding avoid-break">
    <div class="fh">
      <span class="ttl">SCA-001 &middot; pydantic-settings — Known Advisory</span>
      <?= sev('Medium') ?>
    </div>
    <div class="fb">
      <table class="tight">
        <tbody>
          <tr><td class="k">Package</td><td>pydantic-settings</td></tr>
          <tr><td class="k">Installed Version</td><td>2.14.1</td></tr>
          <tr><td class="k">Fixed Version</td><td>2.14.2</td></tr>
          <tr><td class="k">Advisory</td><td>GHSA-4xgf-cpjx-pc3j</td></tr>
          <tr><td class="k">Component</td><td>API (Python / PyPI)</td></tr>
          <tr><td class="k">Reference</td><td>https://github.com/advisories/GHSA-4xgf-cpjx-pc3j</td></tr>
          <tr><td class="k">Severity</td><td><?= sev('Medium') ?></td></tr>
        </tbody>
      </table>
      <p style="margin-top:8px;"><b>Description.</b> The installed version of <code>pydantic-settings</code> is affected by
        advisory GHSA-4xgf-cpjx-pc3j. The advisory is rated Medium severity and impacts configuration/settings handling.</p>
      <p><b>Impact.</b> Limited; the package is used for application configuration parsing rather than direct handling of
        untrusted external input, which constrains practical exploitability in this deployment.</p>
      <p><b>Recommendation.</b> Upgrade <code>pydantic-settings</code> to <b>2.14.2</b> or later. This is a non-breaking
        patch release and resolves the advisory.</p>
    </div>
  </div>

  <h3>No Findings Confirmed In</h3>
  <table class="tight">
    <thead><tr><th>Scanner</th><th>Stage</th><th class="num">Crit</th><th class="num">High</th><th class="num">Med</th><th class="num">Low</th></tr></thead>
    <tbody>
      <tr><td>Trivy deps (api)</td><td>SCA</td><td class="num">0</td><td class="num">0</td><td class="num">1</td><td class="num">0</td></tr>
      <tr><td>Trivy deps (ui)</td><td>SCA</td><td class="num">0</td><td class="num">0</td><td class="num">0</td><td class="num">0</td></tr>
      <tr><td>pip-audit (api)</td><td>SCA</td><td class="num">0</td><td class="num">0</td><td class="num">0</td><td class="num">0</td></tr>
      <tr><td>npm audit (ui)</td><td>SCA</td><td class="num">0</td><td class="num">0</td><td class="num">0</td><td class="num">0</td></tr>
    </tbody>
  </table>
  <p class="legend">Counts reflect the assessment snapshot dated <?= e(v($assess,'assessment_date','25 June 2026')) ?>.</p>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 5 — Remediation & Sign-off ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">4</span> Remediation Summary</h2>
  <table class="tight">
    <thead><tr><th>ID</th><th>Component</th><th>Action</th><th>Severity</th><th>Priority</th></tr></thead>
    <tbody>
      <tr><td>SCA-001</td><td>pydantic-settings 2.14.1</td><td>Upgrade to 2.14.2+</td><td><?= sev('Medium') ?></td><td>Scheduled</td></tr>
    </tbody>
  </table>

  <h2><span class="sn">5</span> Recommendations</h2>
  <ol>
    <li>Apply the <b>pydantic-settings 2.14.2</b> upgrade and re-run the SCA scan to confirm closure.</li>
    <li>Integrate dependency scanning (Trivy / pip-audit / npm audit) into the CI/CD pipeline to fail builds on new
      Critical/High advisories.</li>
    <li>Maintain and version the CycloneDX SBOM for both API and UI to support continuous supply-chain monitoring.</li>
    <li>Enable automated dependency-update pull requests to reduce time-to-patch for newly disclosed advisories.</li>
    <li>Periodically review and prune unused transitive dependencies to reduce the attack surface.</li>
  </ol>

  <h2><span class="sn">6</span> Assessment Parties</h2>
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

  <div class="callout ok"><b>Disclaimer.</b> This assessment reflects the state of dependencies at the time of scanning.
    New advisories may be disclosed against currently "clean" components at any time; continuous monitoring is recommended.</div>

  <?php rpt_page_foot($ref . ' · Generated ' . e($gen_date) . ' ' . e($gen_time)); ?>
</section>

<?php rpt_foot(); ?>
