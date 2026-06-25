<?php
// ── Security report shared renderer ────────────────────────────────────────
// Loads dynamic values from data.json and provides the shared A4 print-ready
// chrome (cover, page header/footer, KPI cards, severity badges) used by the
// SCA, SAST and DAST reports. Run from this folder: php -S localhost:8000
//
// Each report file (report-sca.php / report-sast.php / report-dast.php) does:
//   require __DIR__ . '/report-common.php';
//   rpt_head([...]);   // doctype + cover
//   ... <section class="page"> content using rpt_page_head()/rpt_page_foot() ...
//   rpt_foot();        // close document

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

$brand     = v($d, 'brand', []);
$assessor  = v($d, 'assessor', []);
$client    = v($d, 'client', []);
$assess    = v($d, 'assessment', []);

$brandName = v($brand, 'name', 'SCOPT Analytics');
$gen_date  = date('d F Y');
$gen_time  = date('h:i A');

// Severity badge usage: echo sev('Critical');
function sev($level) {
  $l = strtolower(trim($level));
  $map = [
    'critical' => 'crit',
    'high'     => 'high',
    'medium'   => 'med',
    'low'      => 'low',
    'info'     => 'info',
    'informational' => 'info',
    'pass'     => 'pass',
    'none'     => 'pass',
  ];
  $cls = $map[$l] ?? 'info';
  return '<span class="sev sev-' . $cls . '">' . e($level) . '</span>';
}

// Render the five severity KPI cards from a normalised counts map
// (['CRITICAL'=>n,'HIGH'=>n,'MEDIUM'=>n,'LOW'=>n,'INFO'=>n]).
function rpt_kpis($counts) {
  $cards = [
    ['CRITICAL', 'Critical', 'is-crit'],
    ['HIGH',     'High',     'is-high'],
    ['MEDIUM',   'Medium',   'is-med'],
    ['LOW',      'Low',      'is-low'],
    ['INFO',     'Info',     'is-info'],
  ];
  echo '<div class="kpis">';
  foreach ($cards as [$key, $label, $cls]) {
    $n = (int)($counts[$key] ?? 0);
    $cls = $n > 0 ? $cls : 'is-zero';
    echo '<div class="kpi ' . $cls . '"><div class="n">' . $n . '</div><div class="l">' . e($label) . '</div></div>';
  }
  echo '</div>';
}

// Page header band (top of every interior page).
function rpt_page_head($docName) {
  global $brandName, $assess;
  $cls = v($assess, 'classification', 'Confidential');
  echo '<div class="pagehead"><span><b>' . e($brandName) . '</b> &middot; ' . e($docName)
     . '</span><span class="cls">' . e($cls) . '</span></div>';
}

// Page footer band (bottom of every interior page).
function rpt_page_foot($reference) {
  echo '<div class="pagefoot"><span>' . e($reference)
     . '</span><span>Page <span class="pageno"></span></span></div>';
}

/**
 * Emit doctype + <head> + cover page.
 * $cfg: key, title, subtitle, reference, kicker, meta (array of [label,value]).
 */
function rpt_head(array $cfg) {
  global $brand, $brandName, $assessor, $client, $assess, $gen_date;
  $GLOBALS['RPT'] = $cfg;
  $title     = $cfg['title'];
  $subtitle  = $cfg['subtitle'] ?? '';
  $reference = $cfg['reference'] ?? '';
  $kicker    = $cfg['kicker'] ?? 'Confidential Security Assessment Report';
  $cls       = v($assess, 'classification', 'Confidential');
  $meta      = $cfg['meta'] ?? [];
  $pageTitle = $title . ' — ' . $brandName . ' — CONFIDENTIAL';
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title><?= e($pageTitle) ?></title>
<meta name="author" content="<?= e($brandName) ?>" />
<meta name="description" content="<?= e($subtitle) ?>" />
<meta name="generator" content="SCOPT Security Report Generator" />
<meta name="dcterms.created" content="<?= e(date('c')) ?>" />
<style>
  :root {
    --ink:#16202e; --muted:#5c6677; --faint:#8a93a3;
    --line:#dde3ec; --soft:#f6f8fb; --soft2:#eef2f8;
    --brand:#0b2e6b; --brand2:#1a63c4; --accent:#0fa3a3; --paper:#fff;
    --crit:#b3001b; --high:#e8590c; --med:#f08c00; --low:#2b8a3e; --info:#868e96;
  }
  * { box-sizing:border-box; }
  html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body {
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); margin:0; background:#e9edf3; line-height:1.5;
    font-size:11.5px; counter-reset:pg;
  }

  /* ── Page model ─────────────────────────────────────────── */
  .page {
    background:var(--paper); width:210mm; min-height:297mm;
    margin:16px auto; padding:16mm 18mm 24mm;
    box-shadow:0 4px 22px rgba(15,30,55,.14);
    position:relative; display:flex; flex-direction:column;
    counter-increment:pg;
  }
  .pagehead {
    display:flex; justify-content:space-between; align-items:center;
    border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:18px;
    font-size:9.5px; letter-spacing:.6px; color:var(--muted); text-transform:uppercase;
  }
  .pagehead b { color:var(--brand); font-weight:700; }
  .pagehead .cls {
    color:var(--brand2); border:1px solid var(--brand2); border-radius:3px;
    padding:1px 7px; font-weight:700;
  }
  .pagefoot {
    position:absolute; left:18mm; right:18mm; bottom:12mm; padding-top:8px;
    border-top:1px solid var(--line); display:flex; justify-content:space-between;
    align-items:center; font-size:9px; letter-spacing:.4px; color:var(--faint);
    text-transform:uppercase;
  }
  .pageno::before { content:counter(pg); }

  /* ── Typography ─────────────────────────────────────────── */
  h1,h2,h3,h4 { color:var(--brand); line-height:1.25; margin:0 0 .5em; }
  h2 {
    font-size:14.5px; letter-spacing:.2px; margin:15px 0 7px; padding-bottom:5px;
    border-bottom:2px solid var(--soft2); display:flex; align-items:baseline; gap:9px;
  }
  h2 .sn {
    color:#fff; background:var(--brand); font-size:11px; font-weight:700;
    border-radius:4px; padding:2px 8px; letter-spacing:.5px;
  }
  h3 { font-size:12.5px; color:var(--ink); margin:12px 0 5px; }
  p { margin:.4em 0; }
  strong, b { color:var(--ink); }
  .lead { font-size:12px; }
  ol, ul { margin:.4em 0 .6em; padding-left:20px; }
  li { margin:.22em 0; }
  .hl { color:var(--brand); font-weight:700; }
  .muted { color:var(--muted); }

  /* ── Cover ──────────────────────────────────────────────── */
  .cover { justify-content:flex-start; }
  .brandbar {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:16px; border-bottom:3px solid var(--brand);
  }
  .brandbar .logo { display:flex; align-items:center; gap:12px; }
  .logo .mark {
    width:46px; height:46px; border-radius:10px;
    background:linear-gradient(135deg,var(--brand),var(--brand2));
    color:#fff; font-weight:800; font-size:20px;
    display:flex; align-items:center; justify-content:center;
    letter-spacing:.5px; box-shadow:0 4px 10px rgba(11,46,107,.3);
  }
  .logo .lt { display:flex; flex-direction:column; line-height:1.15; }
  .logo .lt b { font-size:16px; color:var(--brand); letter-spacing:.3px; }
  .logo .lt span { font-size:9.5px; color:var(--muted); letter-spacing:1.2px; text-transform:uppercase; }
  .brandbar .ref { text-align:right; font-size:9.5px; color:var(--muted); letter-spacing:.4px; }
  .brandbar .ref b { color:var(--ink); }

  .cover-center { flex:1; display:flex; flex-direction:column; justify-content:center; padding:22px 0; }
  .doc-kicker {
    text-transform:uppercase; letter-spacing:4px; font-size:11px;
    color:var(--brand2); font-weight:700; margin-bottom:14px;
  }
  .doc-title {
    font-size:42px; line-height:1.05; color:var(--brand); font-weight:800;
    letter-spacing:-.5px; margin:0 0 18px;
  }
  .doc-sub {
    font-size:14.5px; color:var(--muted); max-width:90%; line-height:1.5;
    border-left:3px solid var(--accent); padding-left:14px;
  }
  .cover-meta {
    display:grid; grid-template-columns:1fr 1fr; gap:0; margin-top:34px;
    border:1px solid var(--line); border-radius:8px; overflow:hidden;
  }
  .cover-meta .cell { padding:14px 18px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
  .cover-meta .cell:nth-child(2n) { border-right:none; }
  .cover-meta .cell .k { font-size:9.5px; text-transform:uppercase; letter-spacing:1px; color:var(--faint); margin-bottom:3px; }
  .cover-meta .cell .val { font-size:13.5px; color:var(--ink); font-weight:600; }
  .cover-parties { display:grid; grid-template-columns:1fr auto 1fr; gap:0; align-items:center; margin-top:24px; }
  .cover-parties .pp { background:var(--soft); border:1px solid var(--line); border-radius:8px; padding:16px 18px; }
  .cover-parties .pp .role { font-size:9.5px; text-transform:uppercase; letter-spacing:1px; color:var(--brand2); font-weight:700; margin-bottom:6px; }
  .cover-parties .pp .nm { font-size:15px; font-weight:700; color:var(--ink); }
  .cover-parties .amp { padding:0 16px; font-size:13px; color:var(--faint); text-transform:uppercase; letter-spacing:1px; font-weight:600; }
  .cover-foot {
    position:absolute; left:18mm; right:18mm; bottom:14mm; padding-top:14px;
    border-top:1px solid var(--line); display:flex; justify-content:space-between;
    align-items:flex-end; font-size:10px; color:var(--muted);
  }
  .cover-foot .conf {
    color:var(--brand2); font-weight:700; text-transform:uppercase; letter-spacing:1.5px;
    border:1.5px solid var(--brand2); border-radius:4px; padding:4px 10px;
  }

  /* ── Tables ─────────────────────────────────────────────── */
  table { border-collapse:collapse; width:100%; margin:10px 0; font-size:11px; }
  th, td { border:1px solid var(--line); padding:6px 10px; text-align:left; vertical-align:top; }
  thead th { background:var(--brand); color:#fff; font-weight:700; font-size:10.5px; text-transform:uppercase; letter-spacing:.5px; }
  tbody tr:nth-child(even) td { background:var(--soft); }
  td.k { font-weight:600; color:var(--ink); width:34%; background:var(--soft2) !important; }
  table.tight th, table.tight td { padding:5px 8px; font-size:10.3px; }
  .num { text-align:center; font-variant-numeric:tabular-nums; }

  /* ── Severity badges ────────────────────────────────────── */
  .sev {
    display:inline-block; min-width:64px; text-align:center; padding:2px 8px;
    border-radius:999px; color:#fff; font-weight:700; font-size:9.5px;
    text-transform:uppercase; letter-spacing:.5px;
  }
  .sev-crit { background:var(--crit); }
  .sev-high { background:var(--high); }
  .sev-med  { background:var(--med); }
  .sev-low  { background:var(--low); }
  .sev-info { background:var(--info); }
  .sev-pass { background:var(--low); }

  /* ── KPI cards ──────────────────────────────────────────── */
  .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin:14px 0; }
  .kpi { border:1px solid var(--line); border-radius:8px; padding:12px 10px; text-align:center; background:var(--soft); }
  .kpi .n { font-size:26px; font-weight:800; line-height:1; color:var(--ink); }
  .kpi .l { font-size:9px; text-transform:uppercase; letter-spacing:.8px; color:var(--muted); margin-top:6px; }
  .kpi.is-crit .n { color:var(--crit); } .kpi.is-high .n { color:var(--high); }
  .kpi.is-med  .n { color:var(--med);  } .kpi.is-low  .n { color:var(--low); }
  .kpi.is-zero .n { color:var(--faint); }

  .statgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:14px 0; }
  .stat { border:1px solid var(--line); border-radius:8px; padding:12px 14px; background:var(--soft); }
  .stat .l { font-size:9px; text-transform:uppercase; letter-spacing:.8px; color:var(--faint); margin-bottom:4px; }
  .stat .val { font-size:15px; font-weight:700; color:var(--ink); }

  /* ── Posture banner ─────────────────────────────────────── */
  .posture {
    display:flex; align-items:center; gap:16px; margin:6px 0 14px;
    border:1px solid var(--line); border-left:5px solid var(--low);
    border-radius:8px; padding:14px 18px; background:var(--soft);
  }
  .posture.warn { border-left-color:var(--med); }
  .posture .big {
    font-size:22px; font-weight:800; color:var(--low); letter-spacing:.5px;
    text-transform:uppercase; white-space:nowrap;
  }
  .posture.warn .big { color:var(--med); }
  .posture .txt { font-size:11px; color:var(--muted); }
  .posture .txt b { color:var(--ink); }

  /* ── Party detail / signoff ─────────────────────────────── */
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0; }
  .party { border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .party .ph { background:var(--brand); color:#fff; padding:9px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; }
  .party .pb { padding:12px 14px; }
  .field { display:flex; margin:4px 0; font-size:11px; }
  .field .fk { width:104px; flex:none; color:var(--muted); font-weight:600; }
  .field .fv {
    flex:1; min-width:0; color:var(--ink); border-bottom:1px dotted var(--line);
    padding-bottom:1px; min-height:1.3em; overflow-wrap:anywhere; word-break:break-word;
  }
  .field.email .fv { font-size:9.5px; letter-spacing:0; line-height:1.45; }

  /* ── Callout / finding ──────────────────────────────────── */
  .callout {
    background:var(--soft); border:1px solid var(--line); border-left:4px solid var(--accent);
    border-radius:6px; padding:10px 14px; margin:12px 0; font-size:11px;
  }
  .callout b { color:var(--brand); }
  .callout.ok { border-left-color:var(--low); }
  .callout.warn { border-left-color:var(--med); }

  .finding { border:1px solid var(--line); border-radius:8px; overflow:hidden; margin:12px 0; }
  .finding .fh {
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    background:var(--soft2); padding:9px 14px; border-bottom:1px solid var(--line);
  }
  .finding .fh .ttl { font-size:12px; font-weight:700; color:var(--brand); }
  .finding .fb { padding:10px 14px; }
  .finding .fb table { margin:0; }

  .legend { font-size:9.5px; color:var(--faint); margin-top:6px; }
  .avoid-break { break-inside:avoid; page-break-inside:avoid; }

  /* ── Print rules ────────────────────────────────────────── */
  @page { size:A4; margin:0; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none !important; }
    .page {
      width:210mm; min-height:296mm; height:296mm; margin:0;
      box-shadow:none; overflow:hidden; padding:16mm 18mm 24mm;
      page-break-after:always; break-after:page;
    }
    .page:last-child { page-break-after:auto; break-after:auto; }
    .pagefoot { bottom:12mm; } .cover-foot { bottom:14mm; }
  }
  .toolbar { position:fixed; top:18px; right:18px; z-index:50; display:flex; gap:8px; }
  .toolbar button {
    font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:var(--brand); color:#fff; border:none; border-radius:7px;
    padding:11px 16px; cursor:pointer; box-shadow:0 4px 12px rgba(11,46,107,.32); letter-spacing:.3px;
  }
  .toolbar button:hover { background:var(--brand2); }
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
      <div>Reference: <b><?= e($reference) ?></b></div>
      <div>Issued: <b><?= e($gen_date) ?></b></div>
    </div>
  </div>

  <div class="cover-center">
    <div class="doc-kicker"><?= e($kicker) ?></div>
    <h1 class="doc-title"><?= e($title) ?></h1>
    <div class="doc-sub"><?= e($subtitle) ?></div>

    <div class="cover-parties">
      <div class="pp">
        <div class="role"><?= e(v($assessor, 'label', 'Prepared By / Security Assessor')) ?></div>
        <div class="nm"><?= e(v($assessor, 'name', 'SCOPT Analytics')) ?></div>
      </div>
      <div class="amp">&rarr;</div>
      <div class="pp">
        <div class="role"><?= e(v($client, 'label', 'Prepared For / Client')) ?></div>
        <div class="nm"><?= e(v($client, 'name', 'Client')) ?></div>
      </div>
    </div>

    <div class="cover-meta">
      <?php foreach ($meta as $cell): ?>
      <div class="cell">
        <div class="k"><?= e($cell[0]) ?></div>
        <div class="val"><?= isset($cell[2]) && $cell[2] ? $cell[1] : e($cell[1]) ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="cover-foot">
    <div>
      <div><b><?= e($brandName) ?></b> &middot; <?= e(v($brand, 'website', '')) ?> &middot; <?= e(v($brand, 'email', '')) ?></div>
      <div style="margin-top:2px;">Prepared for <?= e(v($client,'name','the Client')) ?>. This report contains confidential security findings and is intended solely for authorised recipients.</div>
    </div>
    <div class="conf"><?= e(v($assess, 'classification', 'Confidential')) ?></div>
  </div>
</section>
<?php } // end rpt_head

function rpt_foot() {
  echo "\n</body>\n</html>\n";
}
