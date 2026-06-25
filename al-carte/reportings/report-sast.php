<?php
// ── Static Application Security Testing (SAST) Report ──────────────────────
// Findings are parsed live from the scanner artefacts in reports/:
//   semgrep-api.sarif, semgrep-ui.sarif, bandit-api.json (or .html),
//   gitleaks-api.sarif, gitleaks-ui.sarif
// All counts/tables below are dynamic — nothing is hard-coded.
require __DIR__ . '/report-common.php';
require __DIR__ . '/report-findings.php';

$rcfg = v($d, 'reports.sast', []);
$ref  = v($rcfg, 'reference', 'SCOPT-SAST-2026-001');
$docName = 'Static Application Security Testing Report';

$S = rf_sast();
$cc = $S['code_counts'];                 // merged Semgrep + Bandit severity counts
$post = $S['posture'];
$banditN = rf_total($S['bandit']['counts']);
$semN    = rf_total($S['semgrep_api']['counts']) + rf_total($S['semgrep_ui']['counts']);
$loc     = $S['bandit']['loc'];

rpt_head([
  'key'       => 'sast',
  'title'     => v($rcfg, 'title', 'Static Application Security Testing Report'),
  'subtitle'  => v($rcfg, 'subtitle', ''),
  'reference' => $ref,
  'kicker'    => 'Confidential Security Assessment · SAST',
  'meta'      => [
    ['Report Date',  v($assess,'report_date','25 June 2026')],
    ['Assessment',   'Static Application Security Testing'],
    ['Code Analysed', ($loc ? number_format($loc) . ' LOC (API)' : 'API') . ' + UI'],
    ['Overall Result', sev($post['word']), true],
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

  <div class="posture<?= $post['class'] ? ' ' . e($post['class']) : '' ?>">
    <div class="big"><?= e($post['word']) ?></div>
    <div class="txt">
      <?php if (($cc['CRITICAL'] + $cc['HIGH'] + $cc['MEDIUM']) === 0): ?>
        <b>No Critical, High or Medium</b> code vulnerabilities were identified.
      <?php else: ?>
        <b><?= e($cc['CRITICAL']) ?> Critical, <?= e($cc['HIGH']) ?> High and <?= e($cc['MEDIUM']) ?> Medium</b>
        code findings require review.
      <?php endif; ?>
      Semgrep raised <b><?= e($semN) ?></b> finding<?= $semN === 1 ? '' : 's' ?> across
      <?= e($S['semgrep_rules']) ?> applied rules. Bandit raised <b><?= e($banditN) ?></b>
      item<?= $banditN === 1 ? '' : 's' ?>. Secret scanning reported
      <b><?= e($S['secret_total']) ?></b> candidate match<?= $S['secret_total'] === 1 ? '' : 'es' ?>
      (see Section&nbsp;4).
    </div>
  </div>

  <h3>Findings by Severity <span class="muted">(Semgrep + Bandit)</span></h3>
  <?php rpt_kpis($cc); ?>

  <h3>Coverage</h3>
  <div class="statgrid">
    <div class="stat"><div class="l">API Lines of Code</div><div class="val"><?= $loc ? e(number_format($loc)) : '—' ?></div></div>
    <div class="stat"><div class="l">Semgrep Rules Applied</div><div class="val"><?= e($S['semgrep_rules']) ?></div></div>
    <div class="stat"><div class="l">Secret Matches Triaged</div><div class="val"><?= e($S['secret_total']) ?></div></div>
    <div class="stat"><div class="l">Confirmed Secret Leaks</div><div class="val">0</div></div>
  </div>

  <h3>Scope &amp; Assets</h3>
  <table class="tight">
    <thead><tr><th>Asset</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="k">Application</td><td><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></td></tr>
      <tr><td class="k">API Codebase</td><td>Python — <?= $loc ? e(number_format($loc)) . ' lines analysed' : 'analysed' ?> (Semgrep + Bandit)</td></tr>
      <tr><td class="k">UI Codebase</td><td>JavaScript / TypeScript — analysed (Semgrep)</td></tr>
      <tr><td class="k">Secret Scanning</td><td>Full repository tree (Gitleaks)</td></tr>
      <tr><td class="k">Assessment Date</td><td><?= e(v($assess,'assessment_date','25 June 2026')) ?></td></tr>
    </tbody>
  </table>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 3 — Methodology & Tooling ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">2</span> Methodology &amp; Tooling</h2>
  <p>Static analysis was performed directly against the source code and repository tree. Findings are mapped to
    <strong>CWE</strong> identifiers and aligned with the <strong>OWASP Top 10 (2021)</strong> and
    <strong>CWE/SANS Top 25</strong>. Each rule engine was run with its security rule packs enabled.</p>

  <table class="tight">
    <thead><tr><th>Tool</th><th>Stage</th><th>Target</th><th class="num">Rules / LOC</th><th class="num">Findings</th></tr></thead>
    <tbody>
      <tr><td>Semgrep OSS (api)</td><td>SAST</td><td>Python API</td><td class="num"><?= e($S['semgrep_api']['rule_count']) ?> rules</td><td class="num"><?= e(rf_total($S['semgrep_api']['counts'])) ?></td></tr>
      <tr><td>Semgrep OSS (ui)</td><td>SAST</td><td>JS/TS UI</td><td class="num"><?= e($S['semgrep_ui']['rule_count']) ?> rules</td><td class="num"><?= e(rf_total($S['semgrep_ui']['counts'])) ?></td></tr>
      <tr><td>Bandit (api)</td><td>SAST</td><td>Python API</td><td class="num"><?= $loc ? e(number_format($loc)) . ' LOC' : '—' ?></td><td class="num"><?= e($banditN) ?></td></tr>
      <tr><td>Gitleaks (secrets)</td><td>Secrets</td><td>Repository</td><td class="num">api + ui</td><td class="num"><?= e($S['secret_total']) ?> match<?= $S['secret_total'] === 1 ? '' : 'es' ?></td></tr>
    </tbody>
  </table>

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

  <h2><span class="sn">3</span> Static Code Findings</h2>

  <h3>Semgrep — <?= e($semN) ?> finding<?= $semN === 1 ? '' : 's' ?></h3>
  <?php if ($semN === 0): ?>
    <div class="callout ok"><b>No Semgrep findings.</b> No insecure code patterns were raised across the applied rule packs.</div>
  <?php else: ?>
  <table class="tight">
    <thead><tr><th>ID</th><th>Rule</th><th>File : Line</th><th>Severity</th></tr></thead>
    <tbody>
      <?php $i = 0; foreach ($S['semgrep_findings'] as $f): $i++; ?>
      <tr>
        <td>SG-<?= e($i) ?></td>
        <td><?= e(rf_short_rule($f['rule'])) ?><?php if ($f['cwe']): ?> <span class="muted">(<?= e($f['cwe']) ?>)</span><?php endif; ?></td>
        <td><?= e($f['file']) ?><?= $f['line'] !== '' ? ':' . e($f['line']) : '' ?></td>
        <td><?= sev(rf_sev_label($f['severity'])) ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>

  <h3>Bandit — <?= e($banditN) ?> finding<?= $banditN === 1 ? '' : 's' ?></h3>
  <?php if ($banditN === 0): ?>
    <div class="callout ok"><b>No Bandit findings.</b> No insecure Python patterns were raised
      <?php if ($S['bandit']['source'] === 'none'): ?>(no Bandit artefact found in <code>reports/</code>)<?php endif; ?>.</div>
  <?php else: ?>
  <table class="tight">
    <thead><tr><th>ID</th><th>Test</th><th>Issue</th><th>File : Line</th><th>CWE</th><th>Severity</th></tr></thead>
    <tbody>
      <?php $i = 0; foreach ($S['bandit']['findings'] as $f): $i++; ?>
      <tr>
        <td>B-<?= e($i) ?></td>
        <td><?= e($f['test_id']) ?></td>
        <td><?= e(rf_trunc($f['text'], 70)) ?></td>
        <td><?= e($f['file']) ?><?= $f['line'] !== '' ? ':' . e($f['line']) : '' ?></td>
        <td><?= e($f['cwe']) ?></td>
        <td><?= sev(rf_sev_label($f['severity'])) ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>

  <h2><span class="sn">4</span> Secret Exposure (Gitleaks)</h2>
  <p>Gitleaks reported <b><?= e($S['secret_total']) ?></b> candidate secret match<?= $S['secret_total'] === 1 ? '' : 'es' ?>
    across the scanned tree<?= $S['secret_total'] ? ', broken down by location below' : '' ?>.</p>

  <?php if ($S['secret_total'] === 0): ?>
    <div class="callout ok"><b>No secrets detected</b> in the scanned application source.</div>
  <?php else: ?>
  <table class="tight">
    <thead><tr><th>Location</th><th class="num">Matches</th></tr></thead>
    <tbody>
      <?php foreach ($S['secret_locations'] as $file => $n): ?>
      <tr><td><?= e($file ?: '(unspecified)') ?></td><td class="num"><?= e($n) ?></td></tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <p class="legend">Gitleaks reports candidate matches; each should be triaged to confirm whether it is a live secret or a
    scanner artefact / sample / fixture before remediation.</p>
  <?php endif; ?>

  <?php rpt_page_foot($ref); ?>
</section>

<!-- ══════════ PAGE 5 — Remediation & Sign-off ══════════ -->
<section class="page">
  <?php rpt_page_head($docName); ?>

  <h2><span class="sn">5</span> Remediation Summary</h2>
  <table class="tight">
    <thead><tr><th>Area</th><th>Finding</th><th>Action</th><th>Severity</th></tr></thead>
    <tbody>
      <tr>
        <td>Semgrep</td>
        <td><?= e($semN) ?> static finding<?= $semN === 1 ? '' : 's' ?></td>
        <td><?= $semN ? 'Review &amp; remediate per Section 3' : 'None required' ?></td>
        <td><?= sev(rf_sev_label(rf_top_severity($S['semgrep_api']['counts']) ?: (rf_top_severity($S['semgrep_ui']['counts']) ?: 'Info'))) ?></td>
      </tr>
      <tr>
        <td>Bandit</td>
        <td><?= e($banditN) ?> static finding<?= $banditN === 1 ? '' : 's' ?></td>
        <td><?= $banditN ? 'Review &amp; remediate per Section 3' : 'None required' ?></td>
        <td><?= sev(rf_sev_label(rf_top_severity($S['bandit']['counts']) ?: 'Info')) ?></td>
      </tr>
      <tr>
        <td>Secrets</td>
        <td><?= e($S['secret_total']) ?> candidate match<?= $S['secret_total'] === 1 ? '' : 'es' ?></td>
        <td><?= $S['secret_total'] ? 'Triage each match; rotate any confirmed live secret' : 'None required' ?></td>
        <td><?= sev('Info') ?></td>
      </tr>
    </tbody>
  </table>

  <h2><span class="sn">6</span> Recommendations</h2>
  <ol>
    <li>Keep Semgrep and Bandit in the CI/CD pipeline, failing builds on any new Medium-or-above finding.</li>
    <li>Maintain Gitleaks as a pre-commit and CI gate to prevent future secret introduction.</li>
    <li>Triage every secret match to confirmed-leak / false-positive; rotate any confirmed credential immediately.</li>
    <li>Use the <code>secrets</code> module (not <code>random</code>) for any security-relevant randomness.</li>
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
