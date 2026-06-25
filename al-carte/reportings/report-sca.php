<?php
// ── Software Composition Analysis (SCA) Report ─────────────────────────────
// Findings are parsed live from the scanner artefacts in reports/:
//   trivy-fs-api.sarif, trivy-fs-ui.sarif (vulnerabilities)
//   sbom-api.cdx.json, sbom-ui.cdx.json   (component counts)
// All counts/tables below are dynamic — nothing is hard-coded.
require __DIR__ . '/report-common.php';
require __DIR__ . '/report-findings.php';

$rcfg = v($d, 'reports.sca', []);
$ref  = v($rcfg, 'reference', 'SCOPT-SCA-2026-001');
$docName = 'Software Composition Analysis Report';

$C = rf_sca();
$counts = $C['counts'];
$post   = $C['posture'];
$apiPkgs = $C['api_pkgs'];
$uiPkgs  = $C['ui_pkgs'];
$totalPkgs = $apiPkgs + $uiPkgs;
$vulnTotal = rf_total($counts);

rpt_head([
  'key'       => 'sca',
  'title'     => v($rcfg, 'title', 'Software Composition Analysis Report'),
  'subtitle'  => v($rcfg, 'subtitle', ''),
  'reference' => $ref,
  'kicker'    => 'Confidential Security Assessment · SCA',
  'meta'      => [
    ['Report Date',  v($assess,'report_date','25 June 2026')],
    ['Assessment',   'Software Composition Analysis'],
    ['Scope',        'API (' . $apiPkgs . ' libs) + UI (' . $uiPkgs . ' libs)'],
    ['Overall Result', sev($post['word']), true],
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

  <div class="posture<?= $post['class'] ? ' ' . e($post['class']) : '' ?>">
    <div class="big"><?= e($post['word']) ?></div>
    <div class="txt">
      <?php if (($counts['CRITICAL'] + $counts['HIGH']) === 0): ?>
        <b>No Critical or High severity</b> component vulnerabilities were identified across the API and UI
        dependency trees.
      <?php else: ?>
        <b><?= e($counts['CRITICAL']) ?> Critical and <?= e($counts['HIGH']) ?> High</b> component
        vulnerabilities were identified and require remediation.
      <?php endif; ?>
      <?php if ($counts['MEDIUM'] > 0): ?>
        <?= e($counts['MEDIUM']) ?> <b>Medium</b> issue<?= $counts['MEDIUM'] === 1 ? '' : 's' ?> identified, with fixed
        versions noted where available.
      <?php endif; ?>
      Overall supply-chain risk is assessed as <b><?= e($vulnTotal ? rf_sev_label(rf_top_severity($counts)) : 'Low') ?></b>.</div>
  </div>

  <h3>Findings by Severity</h3>
  <?php rpt_kpis($counts); ?>

  <h3>Components Analysed</h3>
  <div class="statgrid">
    <div class="stat"><div class="l">API Libraries</div><div class="val"><?= e($apiPkgs) ?></div></div>
    <div class="stat"><div class="l">UI Libraries</div><div class="val"><?= e($uiPkgs) ?></div></div>
    <div class="stat"><div class="l">Total Components</div><div class="val"><?= e($totalPkgs) ?></div></div>
    <div class="stat"><div class="l">Vulnerable</div><div class="val"><?= e($vulnTotal) ?></div></div>
  </div>

  <h3>Scope &amp; Assets</h3>
  <table class="tight">
    <thead><tr><th>Asset</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="k">Application</td><td><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></td></tr>
      <tr><td class="k">Components Assessed</td><td><?= e(v($assess,'components','Web Application (UI) and REST API')) ?></td></tr>
      <tr><td class="k">API Dependencies</td><td>Python (PyPI) — <?= e($apiPkgs) ?> libraries (CycloneDX SBOM)</td></tr>
      <tr><td class="k">UI Dependencies</td><td>JavaScript / Node (npm) — <?= e($uiPkgs) ?> libraries (CycloneDX SBOM)</td></tr>
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
      <tr><td class="k">Trivy (filesystem)</td><td>Dependency vulnerability scanning &amp; SBOM generation</td><td>API + UI</td></tr>
      <tr><td class="k">CycloneDX SBOM</td><td>Authoritative component inventory (name, version, license, hash)</td><td>API + UI</td></tr>
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
    substitute for reading the detailed findings. Build-time and development-only dependencies are flagged but
    weighted lower than runtime-reachable packages.</div>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 4 — Detailed Findings ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">3</span> Detailed Findings</h2>
  <?php if ($vulnTotal === 0): ?>
    <div class="callout ok"><b>No component vulnerabilities identified.</b> Trivy reported no known advisories against the
      resolved API or UI dependency trees at the time of scanning.</div>
  <?php else: ?>
  <p><?= e($vulnTotal) ?> component finding<?= $vulnTotal === 1 ? '' : 's' ?> identified. Detail below.</p>

  <?php $i = 0; foreach ($C['vulns'] as $v): $i++; ?>
  <div class="finding avoid-break">
    <div class="fh">
      <span class="ttl">SCA-<?= sprintf('%03d', $i) ?> &middot; <?= e($v['package'] ?: $v['advisory']) ?></span>
      <?= sev(rf_sev_label($v['severity'])) ?>
    </div>
    <div class="fb">
      <table class="tight">
        <tbody>
          <tr><td class="k">Package</td><td><?= e($v['package'] ?: '—') ?></td></tr>
          <tr><td class="k">Installed Version</td><td><?= e($v['installed'] ?: '—') ?></td></tr>
          <tr><td class="k">Fixed Version</td><td><?= e($v['fixed'] ?: '— (no fix published)') ?></td></tr>
          <tr><td class="k">Advisory</td><td><?= e($v['advisory']) ?></td></tr>
          <tr><td class="k">Source</td><td><?= e($v['file'] ?: '—') ?></td></tr>
          <?php if ($v['link']): ?><tr><td class="k">Reference</td><td><?= e($v['link']) ?></td></tr><?php endif; ?>
          <tr><td class="k">Severity</td><td><?= sev(rf_sev_label($v['severity'])) ?></td></tr>
        </tbody>
      </table>
      <?php if ($v['title']): ?><p style="margin-top:8px;"><b>Summary.</b> <?= e($v['title']) ?></p><?php endif; ?>
      <?php if ($v['fixed']): ?><p><b>Recommendation.</b> Upgrade <code><?= e($v['package']) ?></code> to
        <b><?= e($v['fixed']) ?></b> or later and re-scan to confirm closure.</p><?php endif; ?>
    </div>
  </div>
  <?php endforeach; ?>
  <?php endif; ?>

  <h3>Per-Scanner Breakdown</h3>
  <table class="tight">
    <thead><tr><th>Scanner</th><th>Stage</th><th class="num">Crit</th><th class="num">High</th><th class="num">Med</th><th class="num">Low</th></tr></thead>
    <tbody>
      <tr><td>Trivy deps (api)</td><td>SCA</td>
        <td class="num"><?= e($C['api']['counts']['CRITICAL']) ?></td><td class="num"><?= e($C['api']['counts']['HIGH']) ?></td>
        <td class="num"><?= e($C['api']['counts']['MEDIUM']) ?></td><td class="num"><?= e($C['api']['counts']['LOW']) ?></td></tr>
      <tr><td>Trivy deps (ui)</td><td>SCA</td>
        <td class="num"><?= e($C['ui']['counts']['CRITICAL']) ?></td><td class="num"><?= e($C['ui']['counts']['HIGH']) ?></td>
        <td class="num"><?= e($C['ui']['counts']['MEDIUM']) ?></td><td class="num"><?= e($C['ui']['counts']['LOW']) ?></td></tr>
    </tbody>
  </table>
  <p class="legend">Counts reflect the assessment snapshot dated <?= e(v($assess,'assessment_date','25 June 2026')) ?>.</p>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 5 — Remediation & Sign-off ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">4</span> Remediation Summary</h2>
  <?php if ($vulnTotal === 0): ?>
    <div class="callout ok">No remediation actions are outstanding for third-party components at this time.</div>
  <?php else: ?>
  <table class="tight">
    <thead><tr><th>ID</th><th>Component</th><th>Action</th><th>Severity</th></tr></thead>
    <tbody>
      <?php $i = 0; foreach ($C['vulns'] as $v): $i++; ?>
      <tr>
        <td>SCA-<?= sprintf('%03d', $i) ?></td>
        <td><?= e(trim(($v['package'] ?: $v['advisory']) . ' ' . $v['installed'])) ?></td>
        <td><?= $v['fixed'] ? 'Upgrade to ' . e($v['fixed']) . '+' : 'Monitor — no fix published' ?></td>
        <td><?= sev(rf_sev_label($v['severity'])) ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>

  <h2><span class="sn">5</span> Recommendations</h2>
  <ol>
    <li>Apply available fixed versions and re-run the SCA scan to confirm closure.</li>
    <li>Integrate dependency scanning (Trivy) into the CI/CD pipeline to fail builds on new Critical/High advisories.</li>
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
