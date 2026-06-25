<?php
// ── Proposal / RFP print-ready renderer ────────────────────────────────────
// Renders the "Request for Proposal / Brief of Work" (proposal.md) in the same
// professional, A4 print-ready look & feel as the NDA (index.php).
// Brand & party data is loaded from data.json; the RFP body is sourced from
// proposal.md. Styling lives in style.css. Run: php -S localhost:8000
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
$dp    = v($d, 'disclosing_party', []);   // Customer — SCOPT Analytics
$rp    = v($d, 'receiving_party', []);    // Security Partner — CyEile Technologies
$sc    = v($d, 'scope', []);

$brandName  = v($brand, 'name', 'SCOPT Analytics');
$customer   = v($dp, 'name', 'SCOPT Analytics');
$partner    = v($rp, 'name', 'CyEile Technologies');
$gen_date   = date('d F Y');
$gen_time   = date('h:i A');

// ── Document meta (proposal-specific) ───────────────────────────────────────
$docTitle   = 'Request for Proposal';
$docSub     = 'Web Application Vulnerability Assessment and Penetration Testing Engagement';
$reference  = 'SCOPT-RFP-2026-001';
$classify   = 'Confidential';
$status     = 'Draft for RFP / Scope Confirmation';
$pageTitle  = $docTitle . ' — ' . $brandName . ' — ' . $classify;

// ── Commercial terms (from proposal.md §13) ─────────────────────────────────
$commercials = [
  ['Total Professional Fee',                    '₹30,000'],
  ['Advance Payment (before commencement)',     '₹15,000'],
  ['Balance Payment (after report & closure)',  '₹15,000'],
  ['GST',                                       'Payable extra, as applicable'],
];

// ── Engagement timeline (from proposal.md §10) ──────────────────────────────
$timeline = [
  ['Day 1',         'Onboarding, NDA confirmation, authorization, UAT URL sharing, test credentials sharing, and scope confirmation.'],
  ['Day 2 – Day 3', 'VAPT activity on the approved target.'],
  ['Day 4 – Day 5', 'Initial report submission and remediation by the ' . $customer . ' team.'],
  ['Day 6 – Day 7', 'Retesting, closure validation, and CERT-In aligned / empanelled report support.'],
];
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title><?= e($pageTitle) ?></title>
<meta name="author" content="<?= e($brandName) ?>" />
<meta name="description" content="<?= e($docSub) ?>" />
<meta name="generator" content="SCOPT Proposal Generator" />
<meta name="dcterms.created" content="<?= e(date('c')) ?>" />
<link rel="stylesheet" href="style.css" />
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
      <div>Reference: <b><?= e($reference) ?></b></div>
      <div>Issued: <b><?= e($gen_date) ?></b></div>
    </div>
  </div>

  <div class="cover-center">
    <div class="doc-kicker">Request for Proposal &middot; Brief of Work</div>
    <h1 class="doc-title"><?= e($docTitle) ?></h1>
    <div class="doc-sub"><?= e($docSub) ?></div>

    <div class="cover-parties">
      <div class="pp">
        <div class="role">Customer</div>
        <div class="nm"><?= e($customer) ?></div>
      </div>
      <div class="amp">&amp;</div>
      <div class="pp">
        <div class="role">Proposed Security Partner</div>
        <div class="nm"><?= e($partner) ?></div>
      </div>
    </div>

    <div class="cover-meta">
      <div class="cell">
        <div class="k">Engagement Type</div>
        <div class="val">Web Application VAPT</div>
      </div>
      <div class="cell">
        <div class="k">Application Scope</div>
        <div class="val"><?= e(v($sc,'web_pages','~25')) ?> pages &middot; <?= e(v($sc,'apis','~15')) ?> APIs</div>
      </div>
      <div class="cell">
        <div class="k">Standards</div>
        <div class="val">OWASP Top 10 2025 &middot; API Top 10</div>
      </div>
      <div class="cell">
        <div class="k">Status</div>
        <div class="val"><?= e($status) ?></div>
      </div>
    </div>
  </div>

  <div class="cover-foot">
    <div>
      <div><b><?= e($brandName) ?></b> &middot; <?= e(v($brand, 'website', '')) ?> &middot; <?= e(v($brand, 'email', '')) ?></div>
      <div style="margin-top:2px;">Document purpose: Request for proposal, scope confirmation, work brief, commercial confirmation, and expected delivery timeline.</div>
    </div>
    <div class="conf"><?= e($classify) ?></div>
  </div>
</section>

<!-- ════════════════ PAGE 2 — Background, Target, Objective ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">1</span> Background</h2>
  <p><?= e($customer) ?> intends to engage <?= e($partner) ?> for a professional Vulnerability Assessment and Penetration Testing (VAPT) activity for a web application and associated APIs.</p>
  <p>The objective of this engagement is to identify security weaknesses, validate exploitable risks, document findings with practical proof-of-concept evidence, and provide remediation guidance that can be acted upon by the development team.</p>
  <p>The engagement is expected to support application security assurance, management review, remediation planning, and a mandatory CERT-In aligned / empanelled report.</p>

  <h2><span class="sn">2</span> Application Target</h2>
  <p>The application target shall be confirmed before the start of testing. Current application scope discussed:</p>
  <table>
    <thead><tr><th>Item</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td class="k">Application Type</td><td>Web Application with APIs</td></tr>
      <tr><td class="k">Web Pages</td><td><?= e(v($sc,'web_pages','Approximately 25')) ?></td></tr>
      <tr><td class="k">APIs</td><td><?= e(v($sc,'apis','Approximately 15')) ?></td></tr>
      <tr><td class="k">Access Type</td><td>Authenticated login-based access</td></tr>
      <tr><td class="k">Testing Environment</td><td>UAT preferred; Production only if explicitly approved</td></tr>
      <tr><td class="k">UAT Hosting</td><td><?= e(v($sc,'uat_environment','Hostinger')) ?></td></tr>
      <tr><td class="k">Production Hosting</td><td><?= e(v($sc,'production_environment','AWS')) ?></td></tr>
      <tr><td class="k">Credentials</td><td>Test credentials to be provided by <?= e($customer) ?></td></tr>
      <tr><td class="k">Compliance Requirement</td><td>CERT-In aligned / empanelled report &mdash; <b>mandatory</b></td></tr>
    </tbody>
  </table>
  <p class="muted">Final application URL, API endpoints, test user credentials, restricted areas, and approved testing window shall be shared after NDA completion and written authorization.</p>

  <h2><span class="sn">3</span> Engagement Objective</h2>
  <p><?= e($partner) ?> is expected to perform a controlled and professional VAPT activity covering both automated and manual security validation. The expected outcome is not only a tool-generated report, but a clear, validated, developer-actionable security assessment report containing:</p>
  <div class="cols2">
    <ol>
      <li>Confirmed vulnerabilities.</li>
      <li>Business and technical impact.</li>
      <li>Proof-of-concept evidence wherever safe and applicable.</li>
      <li>Severity and risk rating.</li>
      <li>Affected URL / API / parameter / role / function.</li>
      <li>Practical remediation recommendation.</li>
      <li>Retesting / closure status after fixes are applied.</li>
      <li>CERT-In aligned / empanelled report (mandatory deliverable).</li>
    </ol>
  </div>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 3 — Standards & In-Scope Areas ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">4</span> Standards and References</h2>
  <p>The assessment should be aligned with the following:</p>
  <ol>
    <li>OWASP Top 10 2025 for Web Application Security.</li>
    <li>Latest OWASP guidance applicable on the date of testing.</li>
    <li>OWASP API Security Top 10, wherever APIs are involved.</li>
    <li>Common web application security testing practices.</li>
    <li>CERT-In aligned / empanelled reporting expectations (mandatory).</li>
  </ol>
  <div class="callout"><b>Note:</b> If <?= e($partner) ?> follows any internal testing methodology, checklist, or CERT-In empanelled partner format, the same may be shared as part of the proposal.</div>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE — In-Scope Testing Areas (own page) ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">5</span> In-Scope Testing Areas</h2>
  <p>Testing should cover OWASP Top 10 2025 categories and related risks. The following areas are expected to be covered:</p>

  <div class="cardgrid">
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.1</span> OWASP Web Application Testing</div>
      <ul>
        <li>Broken access control</li>
        <li>Security misconfiguration</li>
        <li>Software supply chain / vulnerable dependencies</li>
        <li>Injection issues</li>
        <li>Cryptographic failures</li>
        <li>Authentication &amp; session management weaknesses</li>
        <li>Identification &amp; authentication failures</li>
        <li>Integrity &amp; deserialization risks</li>
        <li>Logging, monitoring &amp; visibility gaps</li>
        <li>Server-side request &amp; business logic risks</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.2</span> Access &amp; Authorization</div>
      <ul>
        <li>Horizontal privilege escalation</li>
        <li>Vertical privilege escalation</li>
        <li>Direct URL access to restricted pages</li>
        <li>API access with low-privilege credentials</li>
        <li>IDOR / BOLA style authorization bypass</li>
        <li>Forced browsing</li>
        <li>Role-based UI restriction bypass</li>
        <li>Backend API authorization enforcement</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.3</span> JWT / Session / Token Security</div>
      <ul>
        <li>JWT storage and exposure risks</li>
        <li>Token expiry and refresh behavior</li>
        <li>Token reuse after logout</li>
        <li>Weak token validation</li>
        <li>XSS leading to JWT/session compromise</li>
        <li>Token leakage via storage, logs, URLs or errors</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.4</span> XSS &amp; Client-Side Security</div>
      <ul>
        <li>Reflected, Stored &amp; DOM-based XSS</li>
        <li>Crafted payloads demonstrating realistic impact</li>
        <li>Access to sensitive browser-side data</li>
        <li>JWT/session hijack via insecure storage</li>
        <li>Whether CSP actually mitigates the exploit path</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.5</span> React Application Specific Checks</div>
      <ul>
        <li>React app shell <b>200 OK</b> not reported as a vuln by itself</li>
        <li>Filter false positives from frontend routing</li>
        <li>Manually validate scanner results</li>
        <li>Report build artifacts only if they reveal secrets</li>
        <li>No generic "source code disclosure" without impact</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.6</span> API Security Testing</div>
      <ul>
        <li>Broken Object Level Authorization (BOLA)</li>
        <li>Broken Function Level Authorization</li>
        <li>Mass assignment &amp; excessive data exposure</li>
        <li>Improper rate limiting where relevant</li>
        <li>Input validation &amp; parameter tampering</li>
        <li>Authentication bypass</li>
        <li>Error handling &amp; sensitive data leakage</li>
        <li>Endpoint discovery &amp; access control</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.7</span> Known CVE / Dependency / Config</div>
      <ul>
        <li>Known CVEs affecting exposed components</li>
        <li>Vulnerable JavaScript packages / dependencies</li>
        <li>Known bypass techniques for identified issues</li>
        <li>Misconfigured headers with actual impact</li>
        <li>Publicly known exploit paths where safe</li>
        <li>Validation on approved UAT unless Production approved</li>
      </ul>
    </div>
    <div class="card avoid-break">
      <div class="ct"><span class="ix">5.8</span> Manual Validation Expectation</div>
      <ul>
        <li>Business logic flaws</li>
        <li>Authorization bypass &amp; role confusion</li>
        <li>Workflow manipulation</li>
        <li>API misuse</li>
        <li>Session &amp; token misuse</li>
        <li>Data exposure through UI/API mismatch</li>
      </ul>
    </div>
  </div>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 4 — Out of Scope & Reporting Quality ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">6</span> Explicitly Out of Scope</h2>
  <p>The following activities are out of scope unless separately approved in writing:</p>
  <div class="cols2">
    <ol>
      <li>DDoS testing.</li>
      <li>Stress testing.</li>
      <li>Load testing.</li>
      <li>Resource exhaustion testing.</li>
      <li>Destructive exploitation.</li>
      <li>Data deletion or modification beyond safe test records.</li>
      <li>Malware upload or persistence testing.</li>
      <li>Social engineering.</li>
      <li>Phishing.</li>
      <li>Physical security testing.</li>
      <li>Testing third-party infrastructure not owned or authorized by <?= e($customer) ?>.</li>
      <li>Production testing without explicit written approval.</li>
    </ol>
  </div>

  <h2><span class="sn">7</span> Reporting Quality Expectations</h2>
  <p><?= e($customer) ?> expects a high-quality, practical report. The following should be avoided:</p>
  <ol>
    <li>Pure tool-generated output without manual validation.</li>
    <li>False positives and false negatives.</li>
    <li>Reporting React app shell <b>200 OK</b> behavior as a vulnerability without impact.</li>
    <li>Generic CSP observations without proof-of-concept or clear exploit path.</li>
    <li>Reporting harmless comments in built frontend code unless they disclose sensitive information.</li>
    <li>Generic low-value recommendations without context.</li>
    <li>Duplicate findings across multiple URLs without grouping.</li>
    <li>Reporting informational items as high severity without business impact.</li>
    <li>Copy-paste OWASP descriptions without application-specific evidence.</li>
  </ol>
  <div class="callout warn">For CSP-related findings, <b><?= e($partner) ?></b> should provide a practical explanation or PoC showing why the CSP weakness matters in this specific application context.</div>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 5 — Reporting Requirements ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">8</span> Reporting Requirements</h2>
  <p>The report should include the following minimum sections:</p>
  <div class="cols2">
    <ol>
      <li>Executive Summary.</li>
      <li>Scope of Assessment.</li>
      <li>Testing Methodology.</li>
      <li>Tools Used.</li>
      <li>Manual Testing Performed.</li>
      <li>Vulnerability Summary Table.</li>
      <li>Severity Rating.</li>
      <li>Detailed Findings.</li>
      <li>Proof-of-Concept Evidence.</li>
      <li>Business Impact.</li>
      <li>Technical Impact.</li>
      <li>Remediation Recommendation.</li>
      <li>Retesting Status.</li>
      <li>Closure Summary.</li>
      <li>CERT-In aligned / empanelled report section (mandatory).</li>
    </ol>
  </div>

  <h3>Each finding should include</h3>
  <table>
    <thead><tr><th>Field</th><th>Expected Detail</th></tr></thead>
    <tbody>
      <tr><td class="k">Finding ID</td><td>Unique ID</td></tr>
      <tr><td class="k">Title</td><td>Clear vulnerability name</td></tr>
      <tr><td class="k">Severity</td><td>
        <span class="chip critical">Critical</span>
        <span class="chip high">High</span>
        <span class="chip medium">Medium</span>
        <span class="chip low">Low</span>
        <span class="chip info">Informational</span>
      </td></tr>
      <tr><td class="k">Affected Asset</td><td>URL, API, page, endpoint, role, parameter</td></tr>
      <tr><td class="k">Description</td><td>Clear issue explanation</td></tr>
      <tr><td class="k">Evidence</td><td>Screenshot, request/response, payload, safe PoC</td></tr>
      <tr><td class="k">Impact</td><td>Business and technical impact</td></tr>
      <tr><td class="k">Reproduction Steps</td><td>Step-by-step validation</td></tr>
      <tr><td class="k">Recommendation</td><td>Practical fix</td></tr>
      <tr><td class="k">Retest Status</td><td>Open / Fixed / Risk Accepted / Not Applicable</td></tr>
    </tbody>
  </table>

  <h2><span class="sn">9</span> Critical Finding Notification</h2>
  <p>If any Critical or High severity vulnerability is identified during testing, <?= e($partner) ?> should notify <?= e($customer) ?> immediately instead of waiting until the final report. Examples include:</p>
  <div class="cols2">
    <ol>
      <li>Authentication bypass.</li>
      <li>Privilege escalation.</li>
      <li>Sensitive data exposure.</li>
      <li>Remote code execution.</li>
      <li>SQL injection or command injection.</li>
      <li>Token/session hijacking.</li>
      <li>Access to restricted data through a lower-privileged user.</li>
      <li>Any issue materially impacting confidentiality, integrity, or availability.</li>
    </ol>
  </div>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 6 — Timeline, Access & Authorization ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">10</span> Engagement Timeline</h2>
  <p>The expected timeline shall start from the engagement date and written authorization.</p>
  <div class="timeline">
    <?php foreach ($timeline as $t): ?>
    <div class="tl-row avoid-break">
      <div class="tl-day"><?= e($t[0]) ?></div>
      <div class="tl-body"><?= e($t[1]) ?></div>
    </div>
    <?php endforeach; ?>
  </div>
  <p class="muted">The above timeline assumes timely access sharing, stable UAT availability, and prompt remediation support from <?= e($customer) ?>. Any delay caused by access issues, application downtime, environment instability, or delayed fixes may require timeline adjustment.</p>

  <h2><span class="sn">11</span> Access and Authorization</h2>
  <p><?= e($customer) ?> shall provide the following before testing begins:</p>
  <div class="cols2">
    <ol>
      <li>Approved application URL.</li>
      <li>Approved API base URL / endpoints, wherever applicable.</li>
      <li>Approved testing environment.</li>
      <li>Test user credentials.</li>
      <li>User roles for authorization testing.</li>
      <li>Testing date and time window.</li>
      <li>Emergency contact person.</li>
      <li>Any restricted functionality or sensitive data areas.</li>
      <li>Written authorization for authenticated testing.</li>
      <li>Written authorization for any high-risk exploit validation, if required.</li>
    </ol>
  </div>
  <div class="callout warn"><b>No active security testing shall begin</b> without written authorization.</div>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 7 — Expected Inputs & Commercial Terms ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">12</span> Expected Inputs from <?= e($partner) ?></h2>
  <p><?= e($partner) ?> is requested to provide the following in response to this RFP:</p>
  <div class="cols2">
    <ol>
      <li>Confirmation of scope understanding.</li>
      <li>Proposed testing methodology.</li>
      <li>Confirmation of OWASP Top 10 2025 and API security coverage.</li>
      <li>Confirmation of manual testing coverage.</li>
      <li>Confirmation of CERT-In aligned / empanelled report support (mandatory).</li>
      <li>Report sample or report structure, if available.</li>
      <li>Team details / tester profile, if applicable.</li>
      <li>Confirmation of timeline feasibility.</li>
      <li>Commercial confirmation.</li>
      <li>Any assumptions, exclusions, or dependencies.</li>
    </ol>
  </div>

  <h2><span class="sn">13</span> Commercial Terms</h2>
  <p>The agreed commercial structure is as follows:</p>
  <table>
    <thead><tr><th>Item</th><th class="num">Amount</th></tr></thead>
    <tbody>
      <?php foreach ($commercials as $i => $row): ?>
      <tr>
        <td class="k"><?= e($row[0]) ?></td>
        <td class="num <?= $i === 0 ? 'amount' : '' ?>"><?= e($row[1]) ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <h4>Payment Milestones</h4>
  <ol>
    <li>₹15,000 advance before commencement of engagement.</li>
    <li>₹15,000 after report submission, retesting, and closure support.</li>
    <li>GST shall be paid by <?= e($customer) ?> as applicable.</li>
  </ol>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 8 — Assumptions, Deliverables, Acceptance, Contact ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">14</span> Assumptions</h2>
  <ol>
    <li>Testing shall be performed on UAT unless Production is explicitly approved.</li>
    <li><?= e($customer) ?> shall provide working credentials and required application access.</li>
    <li><?= e($partner) ?> shall not perform DDoS, stress, load, or destructive testing.</li>
    <li><?= e($partner) ?> shall maintain confidentiality of all information shared.</li>
    <li>All evidence captured shall be limited to what is necessary for reporting.</li>
    <li>Any customer, user, business, or production data encountered shall not be downloaded, modified, deleted, or shared.</li>
    <li>The final report should be suitable for management review and developer remediation.</li>
    <li>The CERT-In aligned / empanelled report is a mandatory deliverable; any certification dependencies involving a separate empanelled auditor should be clearly communicated.</li>
  </ol>

  <div class="parties">
    <div class="party avoid-break">
      <div class="ph">15 &middot; Deliverables</div>
      <div class="pb">
        <ol style="margin:0; padding-left:18px;">
          <li>Initial VAPT report.</li>
          <li>Detailed technical findings.</li>
          <li>Proof-of-concept evidence.</li>
          <li>Remediation recommendations.</li>
          <li>Retest report / closure report.</li>
          <li>CERT-In aligned / empanelled report (mandatory).</li>
          <li>Final summary for management &amp; compliance record.</li>
        </ol>
      </div>
    </div>
    <div class="party avoid-break">
      <div class="ph">16 &middot; Acceptance Criteria</div>
      <div class="pb">
        <ol style="margin:0; padding-left:18px;">
          <li>VAPT activity completed on the approved scope.</li>
          <li>Initial report is submitted.</li>
          <li>Clear remediation guidance is received.</li>
          <li>Retesting is performed after fixes are applied.</li>
          <li>Closure status is documented.</li>
          <li>CERT-In aligned / empanelled report is provided (mandatory).</li>
          <li>Final report is accepted by <?= e($customer) ?>.</li>
        </ol>
      </div>
    </div>
  </div>

  <h2><span class="sn">17</span> Contact and Coordination</h2>
  <p><?= e($customer) ?> shall nominate a technical contact and emergency contact before commencement of testing. <?= e($partner) ?> shall nominate a testing contact responsible for: daily coordination, clarification during testing, critical finding escalation, report submission, retesting coordination, and CERT-In aligned / empanelled report coordination.</p>

  <div class="pagefoot">
    <span><?= e($reference) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

<!-- ════════════════ PAGE 9 — Confirmation & Acknowledgement ════════════════ -->
<section class="page">
  <div class="pagehead">
    <span><b><?= e($brandName) ?></b> &middot; Request for Proposal</span>
    <span class="cls"><?= e($classify) ?></span>
  </div>

  <h2><span class="sn">18</span> Confirmation Requested</h2>
  <p><?= e($partner) ?> is requested to confirm the following:</p>
  <ol>
    <li>Acceptance of the proposed scope.</li>
    <li>Acceptance of the proposed timeline.</li>
    <li>Acceptance of the commercial terms.</li>
    <li>Confirmation of the mandatory CERT-In aligned / empanelled report.</li>
    <li>Confirmation that testing will be performed in a controlled and non-destructive manner.</li>
    <li>Confirmation that the final report will contain validated findings and not only automated scanner output.</li>
  </ol>

  <div class="callout">This document serves as a Request for Proposal, scope confirmation, and brief of work. Acknowledgement below indicates acceptance of the scope, timeline, and commercial terms set out herein, subject to NDA completion and written authorization.</div>

  <div class="sigwrap">
    <div class="sigbox avoid-break">
      <div class="sh">For Customer</div>
      <div class="sbody">
        <div class="sigline"><div class="lbl">Authorized Signatory Name</div><div class="ln"><?= e(v($dp,'authorized_representative')) ?></div></div>
        <div class="sigline"><div class="lbl">Designation</div><div class="ln"><?= e(v($dp,'designation')) ?></div></div>
        <div class="sigline"><div class="lbl">Company Name</div><div class="ln"><?= e($customer) ?></div></div>
        <div class="sigline"><div class="lbl">Signature</div><div class="ln">&nbsp;</div></div>
        <div class="sigline"><div class="lbl">Date</div><div class="ln">&nbsp;</div></div>
        <div class="sigstamp">Seal / Stamp</div>
      </div>
    </div>

    <div class="sigbox avoid-break">
      <div class="sh">For Proposed Security Partner</div>
      <div class="sbody">
        <div class="sigline"><div class="lbl">Authorized Signatory Name</div><div class="ln">&nbsp;</div></div>
        <div class="sigline"><div class="lbl">Designation</div><div class="ln">&nbsp;</div></div>
        <div class="sigline"><div class="lbl">Company Name</div><div class="ln"><?= e($partner) ?></div></div>
        <div class="sigline"><div class="lbl">Signature</div><div class="ln">&nbsp;</div></div>
        <div class="sigline"><div class="lbl">Date</div><div class="ln">&nbsp;</div></div>
        <div class="sigstamp">Seal / Stamp</div>
      </div>
    </div>
  </div>

  <div class="pagefoot">
    <span><?= e($reference) ?> &middot; Generated <?= e($gen_date) ?> <?= e($gen_time) ?></span>
    <span>Page <span class="pageno"></span></span>
  </div>
</section>

</body>
</html>
