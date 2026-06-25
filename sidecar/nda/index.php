<?php
// ── Document hub / landing page ────────────────────────────────────────────
// Single entry point that links to every generated document: the NDA, the
// Proposal, and the SCA / SAST / DAST security reports. Pulls brand, client
// and assessment metadata from data.json. Run: php -S localhost:8000
$raw = @file_get_contents(__DIR__ . '/data.json');
$d   = json_decode($raw ?: '{}', true);
if (!is_array($d)) { $d = []; }

function v($arr, $path, $fallback = '') {
  foreach (explode('.', $path) as $k) {
    if (is_array($arr) && array_key_exists($k, $arr)) { $arr = $arr[$k]; }
    else { return $fallback; }
  }
  return ($arr === null || $arr === '') ? $fallback : $arr;
}
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
// Only surface a document card if its file is actually present.
function has($file) { return is_file(__DIR__ . '/' . $file); }

$brand   = v($d, 'brand', []);
$client  = v($d, 'client', []);
$assess  = v($d, 'assessment', []);
$reports = v($d, 'reports', []);

$brandName = v($brand, 'name', 'SCOPT Analytics');
$today     = date('d F Y');

// Document catalogue → [file, group, ref, kicker, title, subtitle, accent]
$docs = [
  [
    'file'  => 'nda.php',
    'group' => 'Legal',
    'ref'   => v($d, 'document.reference', 'SCOPT-NDA-2026-001'),
    'title' => v($d, 'document.title', 'Non-Disclosure Agreement'),
    'sub'   => v($d, 'document.subtitle', 'Confidentiality agreement for the VAPT engagement.'),
    'accent'=> '#1a63c4',
  ],
  [
    'file'  => 'proposal.php',
    'group' => 'Commercial',
    'ref'   => 'SCOPT-RFP-2026-001',
    'title' => 'Request for Proposal',
    'sub'   => 'Technical and commercial proposal for the security assessment engagement.',
    'accent'=> '#0fa3a3',
  ],
  [
    'file'  => 'report-sca.php',
    'group' => 'Security Report',
    'ref'   => v($reports, 'sca.reference', 'SCOPT-SCA-2026-001'),
    'title' => v($reports, 'sca.title', 'Software Composition Analysis Report'),
    'sub'   => v($reports, 'sca.subtitle', 'Third-party dependency and supply-chain risk assessment.'),
    'accent'=> '#7048e8',
  ],
  [
    'file'  => 'report-sast.php',
    'group' => 'Security Report',
    'ref'   => v($reports, 'sast.reference', 'SCOPT-SAST-2026-001'),
    'title' => v($reports, 'sast.title', 'Static Application Security Testing Report'),
    'sub'   => v($reports, 'sast.subtitle', 'Source-code and secret-exposure static analysis.'),
    'accent'=> '#7048e8',
  ],
  [
    'file'  => 'report-dast.php',
    'group' => 'Security Report',
    'ref'   => v($reports, 'dast.reference', 'SCOPT-DAST-2026-001'),
    'title' => v($reports, 'dast.title', 'Dynamic Application Security Testing Report'),
    'sub'   => v($reports, 'dast.subtitle', 'Runtime assessment of the deployed application and APIs.'),
    'accent'=> '#7048e8',
  ],
  [
    'file'  => 'report-sbom.php',
    'group' => 'Security Report',
    'ref'   => v($reports, 'sbom.reference', 'SCOPT-SBOM-2026-001'),
    'title' => v($reports, 'sbom.title', 'Software Bill of Materials Report'),
    'sub'   => v($reports, 'sbom.subtitle', 'Inventory of third-party packages used to build each service.'),
    'accent'=> '#7048e8',
  ],
];
$pageTitle = $brandName . ' — Document Portal';
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title><?= e($pageTitle) ?></title>
<meta name="description" content="Document portal for the <?= e(v($assess,'application','Whirlpool Inspection Tool')) ?> security engagement." />
<style>
  :root {
    --ink:#16202e; --muted:#5c6677; --faint:#8a93a3;
    --line:#dde3ec; --soft:#f6f8fb; --soft2:#eef2f8;
    --brand:#0b2e6b; --brand2:#1a63c4; --accent:#0fa3a3; --paper:#fff;
  }
  * { box-sizing:border-box; }
  body {
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; line-height:1.5; font-size:14px;
    background:
      radial-gradient(1200px 600px at 80% -10%, rgba(26,99,196,.10), transparent 60%),
      radial-gradient(900px 500px at -10% 110%, rgba(15,163,163,.10), transparent 55%),
      #eef1f6;
    min-height:100vh;
  }
  .wrap { max-width:1040px; margin:0 auto; padding:40px 24px 64px; }

  /* ── Masthead ───────────────────────────────────────────── */
  .masthead {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:20px; border-bottom:3px solid var(--brand); margin-bottom:8px;
  }
  .brandblock { display:flex; align-items:center; gap:14px; }
  .mark {
    width:52px; height:52px; border-radius:12px;
    background:linear-gradient(135deg,var(--brand),var(--brand2));
    color:#fff; font-weight:800; font-size:22px;
    display:flex; align-items:center; justify-content:center; letter-spacing:.5px;
    box-shadow:0 6px 16px rgba(11,46,107,.32);
  }
  .brandblock .bt { display:flex; flex-direction:column; line-height:1.2; }
  .brandblock .bt b { font-size:20px; color:var(--brand); letter-spacing:.3px; }
  .brandblock .bt span { font-size:10.5px; color:var(--muted); letter-spacing:1.4px; text-transform:uppercase; }
  .masthead .meta { text-align:right; font-size:11px; color:var(--muted); letter-spacing:.3px; }
  .masthead .meta b { color:var(--ink); }

  /* ── Intro ──────────────────────────────────────────────── */
  .intro { margin:26px 0 30px; }
  .intro .kick { text-transform:uppercase; letter-spacing:4px; font-size:11px; color:var(--brand2); font-weight:700; margin-bottom:10px; }
  .intro h1 { font-size:34px; color:var(--brand); margin:0 0 10px; letter-spacing:-.4px; }
  .intro p { color:var(--muted); max-width:680px; font-size:14px; margin:0; }
  .pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
  .pill {
    background:var(--paper); border:1px solid var(--line); border-radius:999px;
    padding:6px 14px; font-size:12px; color:var(--ink); box-shadow:0 1px 2px rgba(15,30,55,.04);
  }
  .pill b { color:var(--brand); }

  /* ── Section groups ─────────────────────────────────────── */
  .group-label {
    font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:var(--faint);
    font-weight:700; margin:30px 0 12px;
  }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }

  /* ── Document card ──────────────────────────────────────── */
  a.card {
    display:flex; flex-direction:column; text-decoration:none; color:inherit;
    background:var(--paper); border:1px solid var(--line); border-radius:14px;
    padding:20px 20px 18px; position:relative; overflow:hidden;
    box-shadow:0 2px 10px rgba(15,30,55,.06);
    transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  }
  a.card::before {
    content:""; position:absolute; left:0; top:0; bottom:0; width:5px;
    background:var(--accent, #1a63c4);
  }
  a.card:hover { transform:translateY(-3px); box-shadow:0 12px 26px rgba(15,30,55,.14); border-color:#c7d2e3; }
  .card .top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .card .gtag {
    font-size:9.5px; text-transform:uppercase; letter-spacing:1px; font-weight:700;
    color:#fff; background:var(--accent,#1a63c4); border-radius:5px; padding:3px 9px;
  }
  .card .ref { font-size:10.5px; color:var(--faint); font-family:"Monaco",monospace; }
  .card h3 { margin:0 0 6px; font-size:17px; color:var(--brand); line-height:1.25; }
  .card p { margin:0; color:var(--muted); font-size:12.5px; flex:1; }
  .card .open {
    margin-top:16px; font-size:12px; font-weight:700; color:var(--brand2);
    display:inline-flex; align-items:center; gap:6px;
  }
  .card .open .ar { transition:transform .15s ease; }
  a.card:hover .open .ar { transform:translateX(3px); }
  .card.missing { opacity:.55; pointer-events:none; }
  .card.missing .open { color:var(--faint); }

  /* ── Footer ─────────────────────────────────────────────── */
  .foot {
    margin-top:42px; padding-top:18px; border-top:1px solid var(--line);
    display:flex; justify-content:space-between; align-items:center;
    font-size:11px; color:var(--faint); flex-wrap:wrap; gap:8px;
  }
  .foot a { color:var(--brand2); text-decoration:none; }
  @media (max-width:560px){ .masthead{flex-direction:column;gap:14px;align-items:flex-start;} .masthead .meta{text-align:left;} }
</style>
</head>
<body>
<div class="wrap">

  <div class="masthead">
    <div class="brandblock">
      <div class="mark"><?= e(v($brand,'initials','SA')) ?></div>
      <div class="bt">
        <b><?= e($brandName) ?></b>
        <span><?= e(v($brand,'tagline','Data · Security · Analytics')) ?></span>
      </div>
    </div>
    <div class="meta">
      <div>Prepared for <b><?= e(v($client,'name','Whirlpool')) ?></b></div>
      <div><?= e(v($brand,'website','')) ?></div>
      <div>Updated <b><?= e($today) ?></b></div>
    </div>
  </div>

  <div class="intro">
    <div class="kick">Document Portal</div>
    <h1><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?> — Engagement Documents</h1>
    <p>Central access point for all deliverables produced by <?= e($brandName) ?> for this security
       engagement. Open any document below; each is print-ready and can be saved as a PDF from the browser.</p>
    <div class="pills">
      <span class="pill">Application: <b><?= e(v($assess,'application','Whirlpool Inspection Tool')) ?></b></span>
      <span class="pill">Environment: <b><?= e(v($assess,'environment','UAT / Production')) ?></b></span>
      <span class="pill">Overall Result: <b><?= e(v($assess,'overall_result','PASSED')) ?></b></span>
    </div>
  </div>

  <?php
  // Render documents grouped, preserving catalogue order of groups.
  $order = [];
  foreach ($docs as $doc) { if (!in_array($doc['group'], $order, true)) { $order[] = $doc['group']; } }
  foreach ($order as $group):
  ?>
  <div class="group-label"><?= e($group) ?></div>
  <div class="grid">
    <?php foreach ($docs as $doc): if ($doc['group'] !== $group) { continue; }
      $exists = has($doc['file']);
    ?>
    <a class="card<?= $exists ? '' : ' missing' ?>" href="<?= e($exists ? $doc['file'] : '#') ?>" style="--accent:<?= e($doc['accent']) ?>">
      <div class="top">
        <span class="gtag" style="background:<?= e($doc['accent']) ?>"><?= e($doc['group']) ?></span>
        <span class="ref"><?= e($doc['ref']) ?></span>
      </div>
      <h3><?= e($doc['title']) ?></h3>
      <p><?= e($doc['sub']) ?></p>
      <span class="open"><?= $exists ? 'Open document' : 'Not available' ?> <span class="ar">&rarr;</span></span>
    </a>
    <?php endforeach; ?>
  </div>
  <?php endforeach; ?>

  <div class="foot">
    <div><b><?= e($brandName) ?></b> &middot; <?= e(v($brand,'email','')) ?> &middot; <?= e(v($brand,'website','')) ?></div>
    <div>Confidential — prepared for <?= e(v($client,'name','Whirlpool')) ?> · <?= e($today) ?></div>
  </div>

</div>
</body>
</html>
