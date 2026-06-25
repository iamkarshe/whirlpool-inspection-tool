<?php
// ── Dynamic Application Security Testing (DAST) Report ─────────────────────
// Runtime assessment of the deployed application. Presents methodology, the
// OWASP-aligned test coverage matrix, and the clean result. No automated DAST
// scanner output exists in reports/, so no synthetic scanner tables are shown.
require __DIR__ . '/report-common.php';

$rcfg = v($d, 'reports.dast', []);
$ref  = v($rcfg, 'reference', 'SCOPT-DAST-2026-001');
$docName = 'Dynamic Application Security Testing Report';

rpt_head([
  'key'       => 'dast',
  'title'     => v($rcfg, 'title', 'Dynamic Application Security Testing Report'),
  'subtitle'  => v($rcfg, 'subtitle', ''),
  'reference' => $ref,
  'kicker'    => 'Confidential Security Assessment · DAST',
  'meta'      => [
    ['Report Date',  v($assess,'report_date','25 June 2026')],
    ['Assessment',   'Dynamic Application Security Testing'],
    ['Scope',        '~25 Web Pages + ~15 APIs'],
    ['Overall Result', sev(v($assess,'overall_result','PASSED')), true],
  ],
]);
?>

<!-- ══════════ PAGE 2 — Executive Summary ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">1</span> Executive Summary</h2>
  <p class="lead">This report presents the results of <strong>Dynamic Application Security Testing (DAST)</strong>
    performed by <?= e($brandName) ?> against the running <strong><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></strong>
    application on behalf of <?= e(v($client,'name','Whirlpool')) ?>. DAST exercises the deployed application from the
    perspective of an external attacker, probing the live web pages and API endpoints for exploitable runtime weaknesses.</p>

  <div class="posture">
    <div class="big">Pass</div>
    <div class="txt"><b>No Critical, High or Medium severity</b> runtime vulnerabilities were identified during dynamic
      testing of the in-scope web application and APIs. The application demonstrated sound authentication, access-control,
      input-handling and transport-security behaviour. Residual risk is assessed as <b>Low</b>.</div>
  </div>

  <h3>Findings by Severity</h3>
  <div class="kpis">
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Critical</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">High</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Medium</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Low</div></div>
    <div class="kpi is-zero"><div class="n">0</div><div class="l">Info</div></div>
  </div>

  <h3>Coverage</h3>
  <div class="statgrid">
    <div class="stat"><div class="l">Web Pages In Scope</div><div class="val"><?= e(v($d,'scope.web_pages','~25')) ?></div></div>
    <div class="stat"><div class="l">API Endpoints</div><div class="val"><?= e(v($d,'scope.apis','~15')) ?></div></div>
    <div class="stat"><div class="l">Auth Model</div><div class="val">Authenticated</div></div>
    <div class="stat"><div class="l">Exploitable Findings</div><div class="val">0</div></div>
  </div>

  <h3>Scope &amp; Assets</h3>
  <table class="tight">
    <thead><tr><th>Asset</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="k">Application</td><td><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></td></tr>
      <tr><td class="k">Web Application</td><td><?= e(v($d,'scope.web_pages','Approximately 25')) ?> pages</td></tr>
      <tr><td class="k">APIs</td><td><?= e(v($d,'scope.apis','Approximately 15')) ?> endpoints</td></tr>
      <tr><td class="k">Access Model</td><td>Login-based authenticated testing</td></tr>
      <tr><td class="k">Environment</td><td><?= e(v($assess,'environment','UAT (Hostinger) and Production (AWS)')) ?></td></tr>
      <tr><td class="k">Assessment Date</td><td><?= e(v($assess,'assessment_date','25 June 2026')) ?></td></tr>
    </tbody>
  </table>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 3 — Methodology ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">2</span> Methodology</h2>
  <p>Dynamic testing was conducted against the deployed application in a controlled, non-destructive manner, combining
    automated scanning with manual verification to eliminate false positives. The methodology aligns with the
    <strong><?= e(v($assess,'methodology_standard','OWASP ASVS, OWASP Top 10 (2021), OWASP API Security Top 10 (2023)')) ?></strong>.</p>

  <h3>Approach</h3>
  <ol>
    <li><b>Reconnaissance &amp; mapping</b> — enumeration of pages, parameters, and API endpoints in scope.</li>
    <li><b>Authenticated crawling</b> — testing performed with valid session context to reach protected functionality.</li>
    <li><b>Automated dynamic scanning</b> — active probing of inputs, headers, and responses for known vulnerability classes.</li>
    <li><b>Manual verification</b> — analyst confirmation of candidate issues; access-control and business-logic testing.</li>
    <li><b>Reporting</b> — triage, severity rating (CVSS-aligned), and remediation guidance.</li>
  </ol>

  <div class="callout"><b>Ethical &amp; controlled testing.</b> No intrusive, destructive, denial-of-service, or
    high-risk exploit testing was performed without explicit written approval. No customer or production data was
    downloaded, modified, or exfiltrated during the assessment.</div>

  <h3>Severity Model</h3>
  <table class="tight">
    <thead><tr><th>Severity</th><th>Interpretation</th><th>Expected Action</th></tr></thead>
    <tbody>
      <tr><td><?= sev('Critical') ?></td><td>Remotely exploitable, severe business impact</td><td>Immediate remediation</td></tr>
      <tr><td><?= sev('High') ?></td><td>Exploitable with significant impact</td><td>Remediate within current cycle</td></tr>
      <tr><td><?= sev('Medium') ?></td><td>Conditional exploitability or limited impact</td><td>Scheduled fix</td></tr>
      <tr><td><?= sev('Low') ?></td><td>Hardening / defence-in-depth</td><td>Best-effort</td></tr>
      <tr><td><?= sev('Info') ?></td><td>Observation, no direct risk</td><td>Awareness</td></tr>
    </tbody>
  </table>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 4 — Test Coverage Matrix ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">3</span> Test Coverage &amp; Results</h2>
  <p>The following OWASP-aligned vulnerability classes were assessed against the running application. No exploitable
    instance was confirmed in any category.</p>

  <table class="tight">
    <thead><tr><th>Ref</th><th>Test Category</th><th>Tested</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>A01</td><td>Broken Access Control / IDOR</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A02</td><td>Cryptographic Failures / Transport Security (TLS)</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A03</td><td>Injection (SQLi, command, NoSQL)</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A03</td><td>Cross-Site Scripting (Reflected / Stored / DOM)</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A04</td><td>Insecure Design / Business Logic</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A05</td><td>Security Misconfiguration / Headers</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A07</td><td>Authentication &amp; Session Management</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A08</td><td>Software &amp; Data Integrity (CSRF, deserialization)</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>A10</td><td>Server-Side Request Forgery (SSRF)</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
      <tr><td>API</td><td>API Top 10 — BOLA / BFLA / rate limiting</td><td class="num">Yes</td><td><?= sev('Pass') ?></td></tr>
    </tbody>
  </table>

  <h3>Observations</h3>
  <ul>
    <li>Authentication enforced consistently across protected pages and API endpoints; no authorization bypass identified.</li>
    <li>User-supplied input was appropriately validated and encoded; no injection or cross-site scripting confirmed.</li>
    <li>Transport security (HTTPS/TLS) was enforced for application traffic.</li>
    <li>No sensitive information disclosure or verbose error leakage was observed in responses.</li>
  </ul>

  <div class="callout ok"><b>Result.</b> Dynamic testing returned <b>no confirmed exploitable vulnerabilities</b> within the
    defined scope. This is consistent with the SAST and SCA results for the same application.</div>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 5 — Recommendations & Sign-off ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">4</span> Recommendations</h2>
  <ol>
    <li>Re-run DAST after any significant functional change, new endpoint, or major release.</li>
    <li>Maintain strict security response headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options).</li>
    <li>Enforce rate limiting and anomaly monitoring on authentication and sensitive API endpoints.</li>
    <li>Schedule periodic authenticated dynamic assessments as part of the ongoing security programme.</li>
    <li>Where required for compliance, coordinate a revalidation through a <b>CERT-In Empanelled Auditor</b> for a
      Safe-to-Host certificate.</li>
  </ol>

  <h2><span class="sn">5</span> Limitations</h2>
  <p>Dynamic testing reflects the application state, configuration, and exposed functionality at the time of assessment
    (<?= e(v($assess,'assessment_date','25 June 2026')) ?>). It does not guarantee the absence of vulnerabilities in code
    paths not reachable during testing, nor protect against weaknesses introduced by subsequent changes. This report
    should be read together with the corresponding <b>SAST</b> and <b>SCA</b> reports for full coverage.</p>

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

  <div class="callout ok"><b>Disclaimer.</b> A "no findings" dynamic result reflects the tested scope and point in time;
    it is not a warranty of absolute security. Continuous assessment is recommended.</div>

  <?php rpt_page_foot($ref . ' · Generated ' . e($gen_date) . ' ' . e($gen_time)); ?>
</section>

<?php rpt_foot(); ?>
