<?php
// ── Software Bill of Materials (SBOM) Report ───────────────────────────────
// Package inventory per service, sourced from the CycloneDX SBOMs:
//   reports/sbom-api.cdx.json  (API service — PyPI)
//   reports/sbom-ui.cdx.json   (UI service — npm)
// Notable component versions below are taken verbatim from those SBOMs.
require __DIR__ . '/report-common.php';
require __DIR__ . '/report-findings.php';

$rcfg = v($d, 'reports.sbom', []);
$ref  = v($rcfg, 'reference', 'SCOPT-SBOM-2026-001');
$docName = 'Software Bill of Materials Report';

// Authoritative counts parsed live from the CycloneDX SBOM components.
$B = rf_sbom();
$API_PKGS = $B['api_pkgs'];   // sbom-api.cdx.json — library components
$UI_PKGS  = $B['ui_pkgs'];    // sbom-ui.cdx.json  — library components
$TOTAL    = $B['total'];
$apiBy    = $B['api']['by_name'];   // package name → version (API)
$uiBy     = $B['ui']['by_name'];    // package name → version (UI)
// Guard against divide-by-zero if an SBOM artefact is missing.
$apiShare = $TOTAL ? round($API_PKGS / $TOTAL * 100) : 0;
$uiShare  = $TOTAL ? round($UI_PKGS  / $TOTAL * 100) : 0;

rpt_head([
  'key'       => 'sbom',
  'title'     => v($rcfg, 'title', 'Software Bill of Materials Report'),
  'subtitle'  => v($rcfg, 'subtitle', ''),
  'reference' => $ref,
  'kicker'    => 'Confidential · Software Bill of Materials',
  'meta'      => [
    ['Report Date',      v($assess,'report_date','25 June 2026')],
    ['Inventory Format', 'CycloneDX SBOM'],
    ['Total Packages',   (string)$TOTAL],
    ['Services Covered', '2 (API + UI)'],
  ],
]);
?>

<!-- ══════════ PAGE 2 — Executive Summary ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">1</span> Executive Summary</h2>
  <p class="lead">This <strong>Software Bill of Materials (SBOM)</strong> report records the third-party software packages
    used to build each service of the <strong><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></strong>
    application. An SBOM is a complete, machine-readable inventory of every open-source and third-party component —
    the "ingredients list" of the software — used by <?= e(v($client,'name','Whirlpool India')) ?> to understand
    composition, licensing exposure, and supply-chain risk.</p>

  <p>The application is composed of <strong>two services</strong>: a Python <strong>API</strong> service and a JavaScript
    <strong>UI</strong> service. Across both, a total of <strong><?= e($TOTAL) ?> third-party packages</strong> were
    inventoried.</p>

  <h3>Packages by Service</h3>
  <div class="statgrid">
    <div class="stat"><div class="l">API Service (PyPI)</div><div class="val"><?= e($API_PKGS) ?></div></div>
    <div class="stat"><div class="l">UI Service (npm)</div><div class="val"><?= e($UI_PKGS) ?></div></div>
    <div class="stat"><div class="l">Total Packages</div><div class="val"><?= e($TOTAL) ?></div></div>
    <div class="stat"><div class="l">Services</div><div class="val">2</div></div>
  </div>

  <h3>Service Composition</h3>
  <table class="tight">
    <thead><tr><th>Service</th><th>Role</th><th>Ecosystem</th><th class="num">Packages</th><th class="num">Share</th></tr></thead>
    <tbody>
      <tr>
        <td class="k">API</td>
        <td>Backend application &amp; REST API</td>
        <td>Python (PyPI)</td>
        <td class="num"><?= e($API_PKGS) ?></td>
        <td class="num"><?= e($apiShare) ?>%</td>
      </tr>
      <tr>
        <td class="k">UI</td>
        <td>Web application front-end</td>
        <td>JavaScript / Node (npm)</td>
        <td class="num"><?= e($UI_PKGS) ?></td>
        <td class="num"><?= e($uiShare) ?>%</td>
      </tr>
      <tr style="font-weight:700;">
        <td class="k">Total</td>
        <td>All services</td>
        <td>PyPI + npm</td>
        <td class="num"><?= e($TOTAL) ?></td>
        <td class="num">100%</td>
      </tr>
    </tbody>
  </table>

  <div class="callout"><b>How to read this report.</b> Counts reflect <i>library</i> components only (the application's
    own code is excluded). Each count is the number of distinct third-party packages resolved for that service at the
    time of inventory, <?= e(v($assess,'assessment_date','25 June 2026')) ?>.</div>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 3 — API Service Composition ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">2</span> API Service — Package Composition</h2>
  <p>The API service is a Python application comprising <strong><?= e($API_PKGS) ?> third-party packages</strong> from the
    PyPI ecosystem. The principal components, grouped by function, are listed below (versions as inventoried).</p>

  <table class="tight">
    <thead><tr><th>Function</th><th>Key Packages (version)</th></tr></thead>
    <tbody>
      <tr><td class="k">Web Framework / Server</td><td><?= e(rf_ver($apiBy,'fastapi')) ?> · <?= e(rf_ver($apiBy,'starlette')) ?> · <?= e(rf_ver($apiBy,'uvicorn')) ?></td></tr>
      <tr><td class="k">Data &amp; ORM</td><td><?= e(rf_ver($apiBy,'sqlalchemy')) ?> · <?= e(rf_ver($apiBy,'alembic')) ?> · <?= e(rf_ver($apiBy,'psycopg')) ?></td></tr>
      <tr><td class="k">Validation &amp; Config</td><td><?= e(rf_ver($apiBy,'pydantic')) ?> · <?= e(rf_ver($apiBy,'pydantic-settings')) ?></td></tr>
      <tr><td class="k">Async Tasks / Messaging</td><td><?= e(rf_ver($apiBy,'celery')) ?> · <?= e(rf_ver($apiBy,'kombu')) ?> · <?= e(rf_ver($apiBy,'amqp')) ?> · <?= e(rf_ver($apiBy,'redis')) ?></td></tr>
      <tr><td class="k">HTTP Clients</td><td><?= e(rf_ver($apiBy,'httpx')) ?> · <?= e(rf_ver($apiBy,'aiohttp')) ?> · <?= e(rf_ver($apiBy,'requests')) ?></td></tr>
      <tr><td class="k">Security &amp; Cryptography</td><td><?= e(rf_ver($apiBy,'cryptography')) ?> · <?= e(rf_ver($apiBy,'bcrypt')) ?> · <?= e(rf_ver($apiBy,'passlib')) ?></td></tr>
      <tr><td class="k">Cloud / AWS</td><td><?= e(rf_ver($apiBy,'boto3')) ?></td></tr>
    </tbody>
  </table>

  <h3>API Inventory Summary</h3>
  <table class="tight">
    <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td class="k">Ecosystem</td><td>Python (PyPI)</td></tr>
      <tr><td class="k">Total Third-Party Packages</td><td><?= e($API_PKGS) ?></td></tr>
      <tr><td class="k">SBOM Source</td><td>reports/sbom-api.cdx.json (CycloneDX)</td></tr>
      <tr><td class="k">Inventory Tool</td><td>Trivy 0.71.2</td></tr>
    </tbody>
  </table>

  <p class="legend">The table above highlights principal frameworks; the complete enumeration of all <?= e($API_PKGS) ?>
    packages with exact versions is held in the machine-readable CycloneDX SBOM.</p>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 4 — UI Service Composition ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">3</span> UI Service — Package Composition</h2>
  <p>The UI service is a JavaScript web application comprising <strong><?= e($UI_PKGS) ?> third-party packages</strong>
    from the npm ecosystem. The principal components, grouped by function, are listed below (versions as inventoried).</p>

  <table class="tight">
    <thead><tr><th>Function</th><th>Key Packages (version)</th></tr></thead>
    <tbody>
      <tr><td class="k">UI Framework</td><td><?= e(rf_ver($uiBy,'react')) ?> · <?= e(rf_ver($uiBy,'react-dom')) ?> · <?= e(rf_ver($uiBy,'react-router-dom')) ?></td></tr>
      <tr><td class="k">Build Tooling</td><td><?= e(rf_ver($uiBy,'vite')) ?> · <?= e(rf_ver($uiBy,'esbuild')) ?> · <?= e(rf_ver($uiBy,'rollup')) ?></td></tr>
      <tr><td class="k">Styling</td><td><?= e(rf_ver($uiBy,'tailwindcss')) ?></td></tr>
      <tr><td class="k">HTTP / Networking</td><td><?= e(rf_ver($uiBy,'axios')) ?></td></tr>
    </tbody>
  </table>

  <h3>UI Inventory Summary</h3>
  <table class="tight">
    <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td class="k">Ecosystem</td><td>JavaScript / Node (npm)</td></tr>
      <tr><td class="k">Total Third-Party Packages</td><td><?= e($UI_PKGS) ?></td></tr>
      <tr><td class="k">SBOM Source</td><td>reports/sbom-ui.cdx.json (CycloneDX)</td></tr>
      <tr><td class="k">Inventory Tool</td><td>Trivy 0.71.2</td></tr>
    </tbody>
  </table>

  <div class="callout"><b>Note.</b> The UI package count is higher than the API count largely because the npm ecosystem
    resolves many small, single-purpose transitive packages (including platform-specific build binaries) compared with
    Python's coarser-grained packaging. This is expected and not in itself an indicator of risk.</div>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 5 — Methodology & Sign-off ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">4</span> Methodology</h2>
  <p>A Software Bill of Materials was generated for each service by scanning its resolved dependency manifest and lock
    files with <strong>Trivy 0.71.2</strong>, producing a standardised <strong>CycloneDX</strong> inventory. Each entry
    records the package name, exact version, type, and package URL (PURL). The SBOM underpins the Software Composition
    Analysis (SCA) report, where these same components are matched against known vulnerability advisories.</p>

  <h3>Why an SBOM Matters</h3>
  <ul>
    <li><b>Transparency</b> — a verifiable inventory of every third-party component in each service.</li>
    <li><b>Vulnerability response</b> — when a new advisory is published, affected packages can be located instantly.</li>
    <li><b>Licence awareness</b> — supports review of open-source licensing obligations.</li>
    <li><b>Supply-chain assurance</b> — enables continuous monitoring as the application evolves.</li>
  </ul>

  <div class="callout ok"><b>Companion report.</b> For the security risk rating of these components, refer to the
    <b>Software Composition Analysis (SCA)</b> report (<?= e(v($d,'reports.sca.reference','SCOPT-SCA-2026-001')) ?>).</div>

  <h2><span class="sn">5</span> Report Parties</h2>
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

  <div class="callout"><b>Disclaimer.</b> This inventory reflects the resolved dependencies at the time of scanning.
    Package counts and versions will change as the application is updated; the SBOM should be regenerated on each release.</div>

  <?php rpt_page_foot($ref . ' · Generated ' . e($gen_date) . ' ' . e($gen_time)); ?>
</section>

<?php rpt_foot(); ?>
