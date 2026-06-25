<?php
// ── NDA print-ready renderer ───────────────────────────────────────────────
// Loads dynamic values from data.json and renders a professional, A4
// print-ready Non-Disclosure Agreement. Run: php -S localhost:8000
$raw = @file_get_contents(__DIR__ . '/data.json');
$d   = json_decode($raw ?: '{}', true);
if (!is_array($d)) { $d = []; }

// Safe accessor: dotted path with fallback.
function v($arr, $path, $fallback = '') {
  foreach (explode('.', $path) as $k) {
    if (is_array($arr) && array_key_exists($k, $arr)) { $arr = $arr[$k]; }
    else { return $fallback; }
  }
  return ($arr === null || $arr === '') ? $fallback : $arr;
}
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$brand = v($d, 'brand', []);
$doc   = v($d, 'document', []);
$dp    = v($d, 'disclosing_party', []);
$rp    = v($d, 'receiving_party', []);
$sc    = v($d, 'scope', []);
$sig   = v($d, 'signatures', []);

$brandName = v($brand, 'name', 'SCOPT Analytics');
$gen_date  = date('d F Y');
$gen_time  = date('h:i A');
$pageTitle = v($doc, 'title', 'Non-Disclosure Agreement') . ' — ' . $brandName . ' — CONFIDENTIAL';
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title><?= e($pageTitle) ?></title>
<meta name="author" content="<?= e($brandName) ?>" />
<meta name="description" content="<?= e(v($doc, 'subtitle', '')) ?>" />
<meta name="generator" content="CyEile NDA Generator" />
<meta name="dcterms.created" content="<?= e(date('c')) ?>" />
<style>
  :root {
    --ink:#16202e;
    --muted:#5c6677;
    --faint:#8a93a3;
    --line:#dde3ec;
    --soft:#f6f8fb;
    --soft2:#eef2f8;
    --brand:#0b2e6b;
    --brand2:#1a63c4;
    --accent:#0fa3a3;
    --paper:#fff;
  }
  * { box-sizing:border-box; }
  html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body {
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink);
    margin:0;
    background:#e9edf3;
    line-height:1.5;
    font-size:11.5px;
    counter-reset:pg;
  }

  /* ── Page model ─────────────────────────────────────────── */
  .page {
    background:var(--paper);
    width:210mm;
    min-height:297mm;
    margin:16px auto;
    padding:16mm 18mm 24mm;
    box-shadow:0 4px 22px rgba(15,30,55,.14);
    position:relative;
    display:flex;
    flex-direction:column;
    counter-increment:pg;
  }
  .pagehead {
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-bottom:1px solid var(--line);
    padding-bottom:8px;
    margin-bottom:18px;
    font-size:9.5px;
    letter-spacing:.6px;
    color:var(--muted);
    text-transform:uppercase;
  }
  .pagehead b { color:var(--brand); font-weight:700; }
  .pagehead .cls {
    color:var(--brand2);
    border:1px solid var(--brand2);
    border-radius:3px;
    padding:1px 7px;
    font-weight:700;
  }
  .pagefoot {
    position:absolute;
    left:18mm;
    right:18mm;
    bottom:12mm;
    padding-top:8px;
    border-top:1px solid var(--line);
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:9px;
    letter-spacing:.4px;
    color:var(--faint);
    text-transform:uppercase;
  }
  .pageno::before { content:counter(pg); }

  /* ── Typography ─────────────────────────────────────────── */
  h1,h2,h3,h4 { color:var(--brand); line-height:1.25; margin:0 0 .5em; }
  h2 {
    font-size:14.5px;
    letter-spacing:.2px;
    margin:15px 0 7px;
    padding-bottom:5px;
    border-bottom:2px solid var(--soft2);
    display:flex;
    align-items:baseline;
    gap:9px;
  }
  h2 .sn {
    color:#fff;
    background:var(--brand);
    font-size:11px;
    font-weight:700;
    border-radius:4px;
    padding:2px 8px;
    letter-spacing:.5px;
  }
  h3 { font-size:12.5px; color:var(--ink); margin:12px 0 5px; }
  p { margin:.4em 0; }
  strong, b { color:var(--ink); }
  .lead { font-size:12px; }
  ol, ul { margin:.4em 0 .6em; padding-left:20px; }
  li { margin:.22em 0; }
  .hl { color:var(--brand); font-weight:700; }

  /* ── Cover ──────────────────────────────────────────────── */
  .cover { justify-content:flex-start; }
  .brandbar {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding-bottom:16px;
    border-bottom:3px solid var(--brand);
  }
  .brandbar .logo {
    display:flex; align-items:center; gap:12px;
  }
  .logo .mark {
    width:46px; height:46px; border-radius:10px;
    background:linear-gradient(135deg,var(--brand),var(--brand2));
    color:#fff; font-weight:800; font-size:20px;
    display:flex; align-items:center; justify-content:center;
    letter-spacing:.5px;
    box-shadow:0 4px 10px rgba(11,46,107,.3);
  }
  .logo .lt { display:flex; flex-direction:column; line-height:1.15; }
  .logo .lt b { font-size:16px; color:var(--brand); letter-spacing:.3px; }
  .logo .lt span { font-size:9.5px; color:var(--muted); letter-spacing:1.2px; text-transform:uppercase; }
  .brandbar .ref { text-align:right; font-size:9.5px; color:var(--muted); letter-spacing:.4px; }
  .brandbar .ref b { color:var(--ink); }

  .cover-center {
    flex:1;
    display:flex;
    flex-direction:column;
    justify-content:center;
    padding:24px 0;
  }
  .doc-kicker {
    text-transform:uppercase;
    letter-spacing:4px;
    font-size:11px;
    color:var(--brand2);
    font-weight:700;
    margin-bottom:14px;
  }
  .doc-title {
    font-size:46px;
    line-height:1.05;
    color:var(--brand);
    font-weight:800;
    letter-spacing:-.5px;
    margin:0 0 18px;
  }
  .doc-sub {
    font-size:15px;
    color:var(--muted);
    max-width:88%;
    line-height:1.5;
    border-left:3px solid var(--accent);
    padding-left:14px;
  }
  .cover-meta {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:0;
    margin-top:38px;
    border:1px solid var(--line);
    border-radius:8px;
    overflow:hidden;
  }
  .cover-meta .cell {
    padding:14px 18px;
    border-right:1px solid var(--line);
    border-bottom:1px solid var(--line);
  }
  .cover-meta .cell:nth-child(2n) { border-right:none; }
  .cover-meta .cell .k {
    font-size:9.5px; text-transform:uppercase; letter-spacing:1px;
    color:var(--faint); margin-bottom:3px;
  }
  .cover-meta .cell .val { font-size:13.5px; color:var(--ink); font-weight:600; }
  .cover-parties {
    display:grid; grid-template-columns:1fr auto 1fr; gap:0;
    align-items:center; margin-top:26px;
  }
  .cover-parties .pp {
    background:var(--soft); border:1px solid var(--line);
    border-radius:8px; padding:16px 18px;
  }
  .cover-parties .pp .role {
    font-size:9.5px; text-transform:uppercase; letter-spacing:1px;
    color:var(--brand2); font-weight:700; margin-bottom:6px;
  }
  .cover-parties .pp .nm { font-size:15px; font-weight:700; color:var(--ink); }
  .cover-parties .amp {
    padding:0 16px; font-size:13px; color:var(--faint);
    text-transform:uppercase; letter-spacing:1px; font-weight:600;
  }
  .cover-foot {
    position:absolute; left:18mm; right:18mm; bottom:14mm;
    padding-top:14px; border-top:1px solid var(--line);
    display:flex; justify-content:space-between; align-items:flex-end;
    font-size:10px; color:var(--muted);
  }
  .cover-foot .conf {
    color:var(--brand2); font-weight:700; text-transform:uppercase;
    letter-spacing:1.5px; border:1.5px solid var(--brand2);
    border-radius:4px; padding:4px 10px;
  }

  /* ── Party detail blocks ────────────────────────────────── */
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0; }
  .party {
    border:1px solid var(--line); border-radius:8px; overflow:hidden;
  }
  .party .ph {
    background:var(--brand); color:#fff; padding:9px 14px;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px;
  }
  .party .pb { padding:12px 14px; }
  .field { display:flex; margin:4px 0; font-size:11px; }
  .field .fk { width:120px; flex:none; color:var(--muted); font-weight:600; }
  .field .fv { flex:1; color:var(--ink); border-bottom:1px dotted var(--line); padding-bottom:1px; min-height:1.3em; }
  .joiner { text-align:center; font-weight:700; color:var(--brand2); letter-spacing:1px; margin:2px 0; text-transform:uppercase; font-size:11px; }

  /* ── Tables ─────────────────────────────────────────────── */
  table { border-collapse:collapse; width:100%; margin:10px 0; font-size:11px; }
  th, td { border:1px solid var(--line); padding:6px 10px; text-align:left; vertical-align:top; }
  thead th { background:var(--brand); color:#fff; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
  tbody tr:nth-child(even) td { background:var(--soft); }
  td.k { font-weight:600; color:var(--ink); width:38%; background:var(--soft2) !important; }

  /* ── Callout ────────────────────────────────────────────── */
  .callout {
    background:var(--soft); border:1px solid var(--line);
    border-left:4px solid var(--accent); border-radius:6px;
    padding:10px 14px; margin:12px 0; font-size:11px;
  }
  .callout b { color:var(--brand); }

  /* ── Signatures ─────────────────────────────────────────── */
  .sigwrap { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:14px; }
  .sigbox { border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .sigbox .sh {
    background:var(--soft2); color:var(--brand); padding:9px 14px;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px;
    border-bottom:1px solid var(--line);
  }
  .sigbox .sbody { padding:14px; }
  .sigline { margin:14px 0 4px; }
  .sigline .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); margin-bottom:2px; }
  .sigline .ln { border-bottom:1px solid var(--ink); min-height:1.4em; padding-bottom:2px; font-weight:600; color:var(--ink); }
  .sigstamp {
    margin-top:16px; height:74px; border:1px dashed var(--line); border-radius:6px;
    display:flex; align-items:center; justify-content:center;
    font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--faint);
  }

  /* ── Print button ───────────────────────────────────────── */
  .toolbar {
    position:fixed; top:18px; right:18px; z-index:50; display:flex; gap:8px;
  }
  .toolbar button {
    font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:var(--brand); color:#fff; border:none; border-radius:7px;
    padding:11px 16px; cursor:pointer; box-shadow:0 4px 12px rgba(11,46,107,.32);
    letter-spacing:.3px;
  }
  .toolbar button:hover { background:var(--brand2); }
  .toolbar button.ghost { background:#fff; color:var(--brand); border:1px solid var(--line); }

  .avoid-break { break-inside:avoid; page-break-inside:avoid; }

  /* ── Print rules ────────────────────────────────────────── */
  @page { size:A4; margin:0; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none !important; }
    .page {
      width:210mm;
      min-height:296mm;   /* a hair under A4 so it never spills to a 2nd sheet */
      height:296mm;
      margin:0;
      box-shadow:none;
      overflow:hidden;
      padding:16mm 18mm 24mm;
      page-break-after:always;
      break-after:page;
    }
    .page:last-child { page-break-after:auto; break-after:auto; }
    .pagefoot { bottom:12mm; }
    .cover-foot { bottom:14mm; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <button onclick="window.print()">⎙ Print / Save as PDF</button>
</div>

<!-- ════════════════ COVER ════════════════ -->
<section class="page cover">
  <div class="brandbar">
    <div class="logo">
      <?php if (v($brand, 'show_logo', false)): ?>
      <div class="mark"><?= e(v($brand, 'initials', 'SA')) ?></div>
      <?php endif; ?>
      <div class="lt">
        <b><?= e($brandName) ?></b>
        <span><?= e(v($brand, 'tagline', 'Data · Security · Analytics')) ?></span>
      </div>
    </div>
    <div class="ref">
      <div>Reference: <b><?= e(v($doc, 'reference', '—')) ?></b></div>
      <div>Issued: <b><?= e($gen_date) ?></b></div>
    </div>
  </div>

  <div class="cover-center">
    <div class="doc-kicker">Confidential Legal Document</div>
    <h1 class="doc-title"><?= e(v($doc, 'title', 'Non-Disclosure Agreement')) ?></h1>
    <div class="doc-sub"><?= e(v($doc, 'subtitle', '')) ?></div>

    <div class="cover-parties">
      <div class="pp">
        <div class="role"><?= e(v($dp, 'label', 'Disclosing Party')) ?></div>
        <div class="nm"><?= e(v($dp, 'name', '________________')) ?></div>
      </div>
      <div class="amp">&amp;</div>
      <div class="pp">
        <div class="role"><?= e(v($rp, 'label', 'Receiving Party')) ?></div>
        <div class="nm"><?= e(v($rp, 'name', 'CyEile Technologies')) ?></div>
      </div>
    </div>

    <div class="cover-meta">
      <div class="cell">
        <div class="k">Agreement Date</div>
        <div class="val"><?= e(trim(v($doc,'agreement_date_day').' '.v($doc,'agreement_date_month').' '.v($doc,'agreement_date_year'))) ?></div>
      </div>
      <div class="cell">
        <div class="k">Confidentiality Term</div>
        <div class="val"><?= e(v($doc, 'confidentiality_term_years', 'three (3)')) ?> years</div>
      </div>
      <div class="cell">
        <div class="k">Governing Law</div>
        <div class="val"><?= e(v($doc, 'governing_law', 'India')) ?></div>
      </div>
      <div class="cell">
        <div class="k">Classification</div>
        <div class="val"><?= e(v($doc, 'classification', 'Strictly Confidential')) ?></div>
      </div>
    </div>
  </div>

  <div class="cover-foot">
    <div>
      <div><b><?= e($brandName) ?></b> &middot; <?= e(v($brand, 'website', '')) ?> &middot; <?= e(v($brand, 'email', '')) ?></div>
      <div style="margin-top:2px;">This document and its contents are the property of the Parties named herein and are intended solely for authorised recipients.</div>
    </div>
    <div class="conf"><?= e(v($doc, 'classification', 'Confidential')) ?></div>
  </div>
</section>

<!-- ════════════════ PAGE 2 — Parties, Purpose, CI ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Non-Disclosure Agreement</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <p class="lead">This Non-Disclosure Agreement (&ldquo;Agreement&rdquo;) is entered into on this
    <span class="hl"><?= e(v($doc, 'agreement_date_day', '____')) ?></span> day of
    <span class="hl"><?= e(v($doc, 'agreement_date_month', '______________')) ?></span>
    <span class="hl"><?= e(v($doc, 'agreement_date_year', '2026')) ?></span>.</p>

  <h2><span class="sn">1</span> Parties</h2>
  <p>This Agreement is made between:</p>
  <div class="parties">
    <div class="party">
      <div class="ph"><?= e(v($dp, 'label', 'Customer / Disclosing Party')) ?></div>
      <div class="pb">
        <div class="field"><span class="fk">Name</span><span class="fv"><?= e(v($dp,'name')) ?></span></div>
        <div class="field"><span class="fk">Registered Address</span><span class="fv"><?= e(v($dp,'registered_address')) ?></span></div>
        <div class="field"><span class="fk">Authorized Rep.</span><span class="fv"><?= e(v($dp,'authorized_representative')) ?></span></div>
        <div class="field"><span class="fk">Designation</span><span class="fv"><?= e(v($dp,'designation')) ?></span></div>
        <div class="field"><span class="fk">Email</span><span class="fv"><?= e(v($dp,'email')) ?></span></div>
        <div class="field"><span class="fk">Website</span><span class="fv"><?= e(v($dp,'website')) ?></span></div>
      </div>
    </div>
    <div class="party">
      <div class="ph"><?= e(v($rp, 'label', 'CyEile Technologies / Receiving Party')) ?></div>
      <div class="pb">
        <div class="field"><span class="fk">Name</span><span class="fv"><?= e(v($rp,'name')) ?></span></div>
        <div class="field"><span class="fk">Registered Address</span><span class="fv"><?= e(v($rp,'registered_address')) ?></span></div>
        <div class="field"><span class="fk">Authorized Rep.</span><span class="fv"><?= e(v($rp,'authorized_representative')) ?></span></div>
        <div class="field"><span class="fk">Designation</span><span class="fv"><?= e(v($rp,'designation')) ?></span></div>
        <div class="field"><span class="fk">Email</span><span class="fv"><?= e(v($rp,'email')) ?></span></div>
        <div class="field"><span class="fk">Website</span><span class="fv"><?= e(v($rp,'website')) ?></span></div>
      </div>
    </div>
  </div>
  <p>The Customer and <?= e(v($rp,'name','CyEile Technologies')) ?> may individually be referred to as a &ldquo;Party&rdquo; and collectively as the &ldquo;Parties.&rdquo;</p>

  <h2><span class="sn">2</span> Purpose</h2>
  <p>The purpose of this Agreement is to enable the Parties to exchange confidential and sensitive information required for conducting an <strong>Application Vulnerability Assessment and Penetration Testing (VAPT)</strong> engagement.</p>
  <p>The proposed assessment may include testing of the Customer&rsquo;s application hosted in either the <strong>UAT environment on Hostinger</strong> or the <strong>Production environment on AWS</strong>, subject to management approval and mutual agreement.</p>
  <p>The application scope currently discussed includes approximately:</p>
  <ul>
    <li>25 Web Application Pages</li>
    <li>15 APIs</li>
    <li>Login-based authenticated access</li>
    <li>Supporting technical and deployment information shared by the Customer</li>
  </ul>
  <p>The engagement may further include assistance related to security validation, remediation review, and coordination for a secondary assessment or revalidation through a <strong>CERT-In Empanelled Auditor</strong>, wherever applicable.</p>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 3 — Confidential Info & Obligations ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Non-Disclosure Agreement</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <h2><span class="sn">3</span> Confidential Information</h2>
  <p>For the purpose of this Agreement, &ldquo;Confidential Information&rdquo; includes, but is not limited to:</p>
  <ul>
    <li>Application URLs, API endpoints, architecture details, hosting details, and deployment information</li>
    <li>UAT, Production, AWS, Hostinger, server, network, cloud, and infrastructure details</li>
    <li>Login credentials, test user accounts, access tokens, API keys, secrets, or authentication information</li>
    <li>Source code, configuration files, environment details, logs, screenshots, database details, and application workflows</li>
    <li>Business logic, customer data, internal processes, and operational details</li>
    <li>Security findings, vulnerabilities, proof-of-concepts, exploitation evidence, and assessment reports</li>
    <li>Commercial proposal, pricing, engagement scope, timelines, and contractual discussions</li>
    <li>Any information marked or reasonably understood to be confidential, sensitive, proprietary, or security-critical</li>
  </ul>

  <h2><span class="sn">4</span> Obligations of Receiving Party</h2>
  <p><?= e(v($rp,'name','CyEile Technologies')) ?> agrees to:</p>
  <ol>
    <li>Use the Confidential Information solely for the purpose of evaluating, proposing, and performing the Application VAPT engagement.</li>
    <li>Maintain strict confidentiality of all information received from the Customer.</li>
    <li>Not disclose Confidential Information to any third party without prior written approval from the Customer.</li>
    <li>Restrict access to Confidential Information only to authorized personnel directly involved in the engagement.</li>
    <li>Take reasonable technical, administrative, and operational measures to protect Confidential Information from unauthorized access, disclosure, misuse, loss, or alteration.</li>
    <li>Not copy, reproduce, distribute, publish, or transmit Confidential Information except as required for the approved engagement.</li>
    <li>Not use any credentials, access, or technical details beyond the agreed scope of assessment.</li>
    <li>Immediately notify the Customer in case of any suspected or actual unauthorized disclosure, data breach, misuse, or compromise of Confidential Information.</li>
  </ol>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 4 — Security testing, Exclusions, CERT-In ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Non-Disclosure Agreement</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <h2><span class="sn">5</span> Security Testing and Ethical Use</h2>
  <p><?= e(v($rp,'name','CyEile Technologies')) ?> shall perform the security assessment in a professional, ethical, and controlled manner.</p>
  <p><?= e(v($rp,'name','CyEile Technologies')) ?> agrees that:</p>
  <ol>
    <li>Testing shall be conducted only on the environment and scope approved by the Customer.</li>
    <li>Any intrusive, high-risk, destructive, denial-of-service, stress, load, or exploit-based testing shall be performed only after explicit written approval from the Customer.</li>
    <li>No intentional damage shall be caused to the Customer&rsquo;s application, infrastructure, data, users, or business operations.</li>
    <li>Any critical or high-risk vulnerability discovered during the assessment shall be reported to the Customer promptly.</li>
    <li>Customer data, if encountered during testing, shall not be downloaded, modified, deleted, copied, or shared unless specifically required and approved for validation.</li>
    <li>All evidence collected during the assessment shall be limited to what is necessary for reporting and validation.</li>
  </ol>

  <h2><span class="sn">6</span> Exclusions from Confidential Information</h2>
  <p>Confidential Information shall not include information that:</p>
  <ol>
    <li>Is publicly available at the time of disclosure.</li>
    <li>Becomes publicly available through no fault of the Receiving Party.</li>
    <li>Was lawfully known to the Receiving Party before disclosure by the Customer.</li>
    <li>Is independently developed by the Receiving Party without use of the Customer&rsquo;s Confidential Information.</li>
    <li>Is required to be disclosed by law, court order, regulatory authority, or government agency, provided that the Receiving Party gives prompt notice to the Customer where legally permitted.</li>
  </ol>

  <h2><span class="sn">7</span> CERT-In Empanelled Auditor and Compliance Disclosure</h2>
  <p>The Parties acknowledge that, for compliance requirements, a secondary assessment, revalidation, or certification activity may be carried out through a <strong>CERT-In Empanelled Auditor</strong>.</p>
  <p>Any sharing of Confidential Information, vulnerability reports, technical details, or assessment evidence with such auditor shall be done only:</p>
  <ol>
    <li>With prior approval from the Customer.</li>
    <li>For the limited purpose of revalidation, compliance reporting, or obtaining a Safe-to-Host Certificate.</li>
    <li>Under appropriate confidentiality obligations.</li>
  </ol>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 5 — Ownership → Jurisdiction ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Non-Disclosure Agreement</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <h2><span class="sn">8</span> Ownership of Information</h2>
  <p>All Confidential Information shared by the Customer shall remain the property of the Customer.</p>
  <p>Nothing in this Agreement grants <?= e(v($rp,'name','CyEile Technologies')) ?> any ownership, license, intellectual property right, or commercial right over the Customer&rsquo;s applications, systems, data, documents, credentials, or technical information.</p>

  <h2><span class="sn">9</span> Return or Destruction of Confidential Information</h2>
  <p>Upon completion, termination, or written request by the Customer, <?= e(v($rp,'name','CyEile Technologies')) ?> shall return or securely destroy all Confidential Information received from the Customer, including copies, notes, credentials, reports, screenshots, and test artifacts, except where retention is required by law, audit, or compliance obligations.</p>
  <p>Any retained information shall continue to remain protected under this Agreement.</p>

  <h2><span class="sn">10</span> Duration of Confidentiality</h2>
  <p>This Agreement shall remain effective from the date of signing and shall continue for a period of <strong><?= e(v($doc,'confidentiality_term_years','three (3)')) ?> years</strong> from the date of disclosure of Confidential Information.</p>
  <p>Confidentiality obligations related to credentials, security findings, vulnerabilities, proprietary technical information, and customer-sensitive data shall survive as long as such information remains confidential or sensitive in nature.</p>

  <h2><span class="sn">11</span> No Warranty</h2>
  <p>Confidential Information is provided &ldquo;as is&rdquo; for the purpose of the engagement. The Customer does not make any warranties regarding the completeness or accuracy of such information unless expressly agreed in writing.</p>

  <h2><span class="sn">12</span> No Obligation to Proceed</h2>
  <p>This Agreement does not obligate either Party to proceed with the VAPT engagement, commercial proposal, purchase order, work order, or any further business transaction.</p>
  <p>The engagement shall commence only after mutual agreement on scope, commercial terms, timelines, authorization, and required access arrangements.</p>

  <h2><span class="sn">13</span> Governing Law and Jurisdiction</h2>
  <p>This Agreement shall be governed by and interpreted in accordance with the laws of <?= e(v($doc,'governing_law','India')) ?>.</p>
  <p>Any dispute arising out of or in connection with this Agreement shall be subject to the jurisdiction of the competent courts located at <span class="hl"><?= e(v($doc,'jurisdiction_city','________________')) ?></span>, <?= e(v($doc,'governing_law','India')) ?>.</p>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 6 — Signatures ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Non-Disclosure Agreement</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <h2><span class="sn">14</span> Authorized Signatures</h2>
  <p>By signing below, both Parties agree to the terms and conditions of this Non-Disclosure Agreement.</p>

  <div class="sigwrap">
    <div class="sigbox avoid-break">
      <div class="sh"><?= e(v($sig,'customer.heading','For Customer / Disclosing Party')) ?></div>
      <div class="sbody">
        <div class="sigline"><div class="lbl">Authorized Signatory Name</div><div class="ln"><?= e(v($sig,'customer.signatory_name')) ?></div></div>
        <div class="sigline"><div class="lbl">Designation</div><div class="ln"><?= e(v($sig,'customer.designation')) ?></div></div>
        <div class="sigline"><div class="lbl">Company Name</div><div class="ln"><?= e(v($sig,'customer.company_name')) ?></div></div>
        <div class="sigline"><div class="lbl">Signature</div><div class="ln">&nbsp;</div></div>
        <div class="sigline"><div class="lbl">Date</div><div class="ln">&nbsp;</div></div>
        <div class="sigstamp">Seal / Stamp</div>
      </div>
    </div>

    <div class="sigbox avoid-break">
      <div class="sh"><?= e(v($sig,'receiving.heading','For CyEile Technologies / Receiving Party')) ?></div>
      <div class="sbody">
        <div class="sigline"><div class="lbl">Authorized Signatory Name</div><div class="ln"><?= e(v($sig,'receiving.signatory_name')) ?></div></div>
        <div class="sigline"><div class="lbl">Designation</div><div class="ln"><?= e(v($sig,'receiving.designation')) ?></div></div>
        <div class="sigline"><div class="lbl">Company Name</div><div class="ln"><?= e(v($sig,'receiving.company_name','CyEile Technologies')) ?></div></div>
        <div class="sigline"><div class="lbl">Signature</div><div class="ln">&nbsp;</div></div>
        <div class="sigline"><div class="lbl">Date</div><div class="ln">&nbsp;</div></div>
        <div class="sigstamp">Seal / Stamp</div>
      </div>
    </div>
  </div>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 7 — Annexure A ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Annexure A</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <h2>Annexure A &mdash; Preliminary Assessment Scope</h2>
  <div class="callout">The following scope was discussed during the meeting held on <b><?= e(v($sc,'meeting_date','19 June 2026')) ?> at <?= e(v($sc,'meeting_time','12:00 PM')) ?></b>.</div>

  <h3>Application Details</h3>
  <table>
    <thead><tr><th>Item</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td class="k">Application Type</td><td>Web Application with APIs</td></tr>
      <tr><td class="k">Web Pages</td><td><?= e(v($sc,'web_pages','Approximately 25')) ?></td></tr>
      <tr><td class="k">APIs</td><td><?= e(v($sc,'apis','Approximately 15')) ?></td></tr>
      <tr><td class="k">UAT Environment</td><td><?= e(v($sc,'uat_environment','Hosted on Hostinger')) ?></td></tr>
      <tr><td class="k">Production Environment</td><td><?= e(v($sc,'production_environment','Hosted on AWS')) ?></td></tr>
      <tr><td class="k">Testing Access</td><td>Login credentials / access details to be provided by Customer</td></tr>
      <tr><td class="k">Testing Environment</td><td>UAT or Production, subject to management approval</td></tr>
      <tr><td class="k">Compliance Requirement</td><td>CERT-In Safe-to-Host Certificate assistance, if applicable</td></tr>
    </tbody>
  </table>

  <h3>Initial Engagement Flow</h3>
  <ol>
    <li>Customer to share the signed NDA.</li>
    <li><?= e(v($rp,'name','CyEile Technologies')) ?> to countersign the NDA.</li>
    <li>Customer to provide necessary technical and access details.</li>
    <li><?= e(v($rp,'name','CyEile Technologies')) ?> to submit technical and commercial proposal.</li>
    <li>Scope, environment, timeline, and commercials to be finalized.</li>
    <li>VAPT activity to begin only after written approval and authorization.</li>
    <li>Initial assessment and validation to be conducted by <?= e(v($rp,'name','CyEile Technologies')) ?>.</li>
    <li>Secondary assessment / revalidation may be coordinated through a CERT-In Empanelled Auditor, if required.</li>
  </ol>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 8 — Annexure B ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Annexure B</span>
    <span class="cls"><?= e(v($doc, 'classification', 'Confidential')) ?></span>
  </div>

  <h2>Annexure B &mdash; Authorization Requirement</h2>
  <p>The Customer shall provide written authorization before the commencement of any security testing activity.</p>
  <p>The authorization should clearly mention:</p>
  <ul>
    <li>Approved application URL(s)</li>
    <li>Approved API endpoint(s), if applicable</li>
    <li>Approved testing environment: UAT or Production</li>
    <li>Approved testing dates and time window</li>
    <li>Test user credentials or access method</li>
    <li>Restricted areas, if any</li>
    <li>Emergency contact person during assessment</li>
    <li>Approval for authenticated testing</li>
    <li>Approval for any high-risk or exploit-based validation, if applicable</li>
  </ul>

  <div class="callout"><b>No active security testing shall be performed</b> until the above authorization is received from the Customer.</div>

  <div class="pagefoot">
    <span><?= e(v($doc,'reference','')) ?> &middot; Generated <?= e($gen_date) ?> <?= e($gen_time) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

</body>
</html>
