<?php
// ── Dynamic findings layer ─────────────────────────────────────────────────
// Parses the raw scanner artefacts in reports/ (SARIF, CycloneDX, Bandit JSON)
// into a normalised model the report-*.php pages render from. Nothing here is
// hard-coded: counts and tables reflect whatever currently sits in reports/.
//
// Severity model mirrors ci/quality_gate.py:
//   CRITICAL / HIGH / MEDIUM / LOW / INFO
//
// Every parser is deliberately tolerant — a missing, empty or malformed file is
// treated as "tool produced nothing" so one broken artefact never breaks a page.

const RF_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function rf_dir() { return __DIR__ . '/reports'; }
function rf_path($f) { return rf_dir() . '/' . $f; }
function rf_exists($f) { return is_file(rf_path($f)); }

function rf_load_json($f) {
  $p = rf_path($f);
  if (!is_file($p)) { return null; }
  $raw = @file_get_contents($p);
  if ($raw === false || $raw === '') { return null; }
  $d = json_decode($raw, true);
  return is_array($d) ? $d : null;
}

function rf_zero_counts() {
  return ['CRITICAL' => 0, 'HIGH' => 0, 'MEDIUM' => 0, 'LOW' => 0, 'INFO' => 0];
}
function rf_total($counts) { return array_sum($counts); }

// CVSS score → severity bucket.
function rf_cvss_to_sev($score) {
  if (!is_numeric($score)) { return null; }
  $s = (float)$score;
  if ($s >= 9.0) { return 'CRITICAL'; }
  if ($s >= 7.0) { return 'HIGH'; }
  if ($s >= 4.0) { return 'MEDIUM'; }
  if ($s > 0)    { return 'LOW'; }
  return 'INFO';
}
// SARIF result.level → severity (fallback when no CVSS / tag is present).
function rf_level_to_sev($level) {
  $m = ['error' => 'HIGH', 'warning' => 'MEDIUM', 'note' => 'LOW', 'none' => 'INFO'];
  return $m[strtolower((string)$level)] ?? 'LOW';
}

// Pull a CWE-NNN identifier out of a rule's properties / tags, if any.
function rf_cwe_from_rule($rule) {
  $props = $rule['properties'] ?? [];
  $cwe = $props['cwe'] ?? null;
  if (is_array($cwe)) { $cwe = $cwe[0] ?? null; }
  if (is_string($cwe) && preg_match('/CWE-\d+/i', $cwe, $m)) { return strtoupper($m[0]); }
  foreach (($props['tags'] ?? []) as $t) {
    if (is_string($t) && preg_match('/CWE-\d+/i', $t, $m)) { return strtoupper($m[0]); }
  }
  return '';
}

// Display helpers.
function rf_short_rule($id) {
  $parts = explode('.', (string)$id);
  return end($parts) ?: (string)$id;
}
function rf_trunc($s, $n = 120) {
  $s = trim(preg_replace('/\s+/', ' ', (string)$s));
  return (mb_strlen($s) > $n) ? (mb_substr($s, 0, $n - 1) . '…') : $s;
}
// Title-case a SEVERITY key for the sev() badge ('LOW' → 'Low').
function rf_sev_label($s) { return ucfirst(strtolower((string)$s)); }

// ── Generic SARIF (Semgrep, Gitleaks, Trivy) ───────────────────────────────
// Returns ['counts'=>[sev=>n], 'findings'=>[ row, ... ], 'rule_count'=>int].
function rf_parse_sarif($file) {
  $out = ['counts' => rf_zero_counts(), 'findings' => [], 'rule_count' => 0];
  $data = rf_load_json($file);
  if (!$data) { return $out; }

  foreach ($data['runs'] ?? [] as $run) {
    $driver = $run['tool']['driver'] ?? [];
    $rules  = $driver['rules'] ?? [];
    $out['rule_count'] += count($rules);

    // ruleId → [sev, cwe, title]
    $rmap = [];
    foreach ($rules as $rule) {
      $props = $rule['properties'] ?? [];
      $sev = rf_cvss_to_sev($props['security-severity'] ?? null);
      if (!$sev) {
        $tags = array_map('strtoupper', $props['tags'] ?? []);
        foreach (RF_SEVERITIES as $cand) { if (in_array($cand, $tags, true)) { $sev = $cand; break; } }
      }
      $rmap[$rule['id'] ?? ''] = [
        'sev'   => $sev,
        'cwe'   => rf_cwe_from_rule($rule),
        'title' => $rule['shortDescription']['text'] ?? ($rule['name'] ?? ($rule['id'] ?? '')),
      ];
    }

    foreach ($run['results'] ?? [] as $res) {
      $rid   = $res['ruleId'] ?? '';
      $rinfo = $rmap[$rid] ?? ['sev' => null, 'cwe' => '', 'title' => $rid];
      $props = $res['properties'] ?? [];
      // Note: pass the level through even when null — rf_level_to_sev maps
      // unknown/empty to LOW (matching ci/quality_gate.py), so do NOT default
      // a missing level to 'warning' (that would inflate findings to MEDIUM).
      $sev = rf_cvss_to_sev($props['security-severity'] ?? null)
           ?: ($rinfo['sev'] ?: rf_level_to_sev($res['level'] ?? ''));
      $out['counts'][$sev]++;

      $pl   = $res['locations'][0]['physicalLocation'] ?? [];
      $file_uri = $pl['artifactLocation']['uri'] ?? '';
      $line = $pl['region']['startLine'] ?? '';
      $out['findings'][] = [
        'rule'     => $rid,
        'title'    => $rinfo['title'],
        'message'  => $res['message']['text'] ?? '',
        'file'     => $file_uri,
        'line'     => $line,
        'severity' => $sev,
        'cwe'      => $rinfo['cwe'],
      ];
    }
  }
  return $out;
}

// ── Trivy SARIF → dependency vulnerability rows ────────────────────────────
// Trivy packs package / version / fix / advisory into message + rule.help text.
function rf_parse_trivy($file) {
  $out = ['counts' => rf_zero_counts(), 'vulns' => []];
  $data = rf_load_json($file);
  if (!$data) { return $out; }

  foreach ($data['runs'] ?? [] as $run) {
    $rules = [];
    foreach (($run['tool']['driver']['rules'] ?? []) as $rule) { $rules[$rule['id'] ?? ''] = $rule; }

    foreach ($run['results'] ?? [] as $res) {
      $rid  = $res['ruleId'] ?? '';
      $text = ($res['message']['text'] ?? '') . "\n" . ($rules[$rid]['help']['text'] ?? '');

      $grab = function ($label) use ($text) {
        return preg_match('/' . $label . ':\s*(.+)/i', $text, $m) ? trim($m[1]) : '';
      };
      $sevName = strtoupper($grab('Severity')) ?: '';
      $sev = in_array($sevName, RF_SEVERITIES, true)
        ? $sevName
        : (rf_cvss_to_sev($rules[$rid]['properties']['security-severity'] ?? null) ?: rf_level_to_sev($res['level'] ?? 'warning'));
      $out['counts'][$sev]++;

      $locMsg = $res['locations'][0]['message']['text'] ?? ''; // e.g. "uv.lock: pkg@1.2.3"
      $pkg = $grab('Package');
      if ($pkg === '' && preg_match('/:\s*([^@\s]+)@/', $locMsg, $m)) { $pkg = $m[1]; }

      $out['vulns'][] = [
        'package'   => $pkg,
        'installed' => $grab('Installed Version'),
        'fixed'     => $grab('Fixed Version'),
        'advisory'  => $rid,
        'title'     => $rules[$rid]['shortDescription']['text'] ?? '',
        'link'       => $rules[$rid]['helpUri'] ?? '',
        'severity'  => $sev,
        'file'      => $res['locations'][0]['physicalLocation']['artifactLocation']['uri'] ?? '',
      ];
    }
  }
  return $out;
}

// ── Bandit (JSON preferred, HTML fallback) ─────────────────────────────────
function rf_parse_bandit($jsonFile = 'bandit-api.json', $htmlFile = 'bandit-api.html') {
  $out = ['counts' => rf_zero_counts(), 'findings' => [], 'loc' => 0, 'nosec' => 0, 'source' => 'none'];

  $data = rf_load_json($jsonFile);
  if ($data) {
    $out['source'] = 'json';
    $totals = $data['metrics']['_totals'] ?? [];
    $out['loc']   = (int)($totals['loc'] ?? 0);
    $out['nosec'] = (int)($totals['nosec'] ?? 0);
    foreach ($data['results'] ?? [] as $r) {
      $sev = strtoupper($r['issue_severity'] ?? 'LOW');
      if (!in_array($sev, RF_SEVERITIES, true)) { $sev = 'LOW'; }
      $out['counts'][$sev]++;
      $cwe = $r['issue_cwe']['id'] ?? '';
      $out['findings'][] = [
        'test_id'    => $r['test_id'] ?? '',
        'test_name'  => $r['test_name'] ?? '',
        'text'       => $r['issue_text'] ?? '',
        'file'       => $r['filename'] ?? '',
        'line'       => $r['line_number'] ?? '',
        'severity'   => $sev,
        'confidence' => ucfirst(strtolower($r['issue_confidence'] ?? '')),
        'cwe'        => $cwe ? ('CWE-' . $cwe) : '',
      ];
    }
    return $out;
  }

  // Fallback: parse the HTML formatter output for the LOC metric and a rough
  // finding count (the structured detail is only available from JSON).
  $out['source'] = 'html';
  $p = rf_path($htmlFile);
  if (is_file($p)) {
    $h = (string)@file_get_contents($p);
    if (preg_match('/id="loc">(\d+)/', $h, $m))   { $out['loc']   = (int)$m[1]; }
    if (preg_match('/id="nosec">(\d+)/', $h, $m)) { $out['nosec'] = (int)$m[1]; }
    // Count severity classes ONLY within the results region — the <style> block
    // above it defines .issue-sev-* selectors that must not be counted.
    $rpos = strpos($h, 'id="results"');
    $body = $rpos !== false ? substr($h, $rpos) : '';
    $out['counts']['HIGH']   = preg_match_all('/issue-sev-high/', $body);
    $out['counts']['MEDIUM'] = preg_match_all('/issue-sev-medium/', $body);
    $out['counts']['LOW']    = preg_match_all('/issue-sev-low/', $body);
  }
  return $out;
}

// ── CycloneDX SBOM → component inventory ───────────────────────────────────
function rf_parse_cyclonedx($file) {
  $out = ['count' => 0, 'components' => [], 'by_name' => []];
  $data = rf_load_json($file);
  if (!$data) { return $out; }
  foreach ($data['components'] ?? [] as $c) {
    if (($c['type'] ?? '') !== 'library') { continue; }
    $name = $c['name'] ?? '';
    $ver  = $c['version'] ?? '';
    $out['components'][] = ['name' => $name, 'version' => $ver, 'purl' => $c['purl'] ?? ''];
    if ($name !== '') { $out['by_name'][strtolower($name)] = $ver; }
  }
  $out['count'] = count($out['components']);
  return $out;
}

// Resolve a version for a known package from an SBOM by_name map ("—" if absent).
function rf_ver($byName, $name) {
  $v = $byName[strtolower($name)] ?? '';
  return $v !== '' ? ($name . ' ' . $v) : ($name . ' —');
}

// ── Merge helpers ──────────────────────────────────────────────────────────
function rf_merge_counts(...$countSets) {
  $out = rf_zero_counts();
  foreach ($countSets as $c) { foreach ($out as $k => $_) { $out[$k] += (int)($c[$k] ?? 0); } }
  return $out;
}

// Highest non-zero severity present, or '' if clean.
function rf_top_severity($counts) {
  foreach (RF_SEVERITIES as $s) { if (($counts[$s] ?? 0) > 0) { return $s; } }
  return '';
}

// Overall posture derived from counts → ['word','class','clean_of']
// class: '' (green pass) or 'warn' (amber). Used to drive the posture banner.
function rf_posture($counts) {
  $top = rf_top_severity($counts);
  if ($top === 'CRITICAL' || $top === 'HIGH') {
    return ['word' => 'Action Required', 'class' => 'warn', 'top' => $top];
  }
  if ($top === 'MEDIUM' || $top === 'LOW' || $top === 'INFO') {
    return ['word' => 'Pass', 'class' => 'warn', 'top' => $top];
  }
  return ['word' => 'Pass', 'class' => '', 'top' => ''];
}

// ── Per-report aggregators ─────────────────────────────────────────────────
function rf_sast() {
  $semApi = rf_parse_sarif('semgrep-api.sarif');
  $semUi  = rf_parse_sarif('semgrep-ui.sarif');
  $bandit = rf_parse_bandit();
  $glApi  = rf_parse_sarif('gitleaks-api.sarif');
  $glUi   = rf_parse_sarif('gitleaks-ui.sarif');

  $code_counts = rf_merge_counts($semApi['counts'], $semUi['counts'], $bandit['counts']);
  $secret_total = rf_total($glApi['counts']) + rf_total($glUi['counts']);

  // Secret locations grouped by file across both gitleaks runs.
  $loc = [];
  foreach (array_merge($glApi['findings'], $glUi['findings']) as $f) {
    $loc[$f['file']] = ($loc[$f['file']] ?? 0) + 1;
  }

  return [
    'semgrep_api' => $semApi, 'semgrep_ui' => $semUi,
    'bandit' => $bandit, 'gitleaks_api' => $glApi, 'gitleaks_ui' => $glUi,
    'code_counts' => $code_counts,
    'semgrep_findings' => array_merge($semApi['findings'], $semUi['findings']),
    'semgrep_rules' => $semApi['rule_count'] + $semUi['rule_count'],
    'secret_total' => $secret_total,
    'secret_locations' => $loc,
    'posture' => rf_posture($code_counts),
  ];
}

function rf_sca() {
  $api = rf_parse_trivy('trivy-fs-api.sarif');
  $ui  = rf_parse_trivy('trivy-fs-ui.sarif');
  $sbomApi = rf_parse_cyclonedx('sbom-api.cdx.json');
  $sbomUi  = rf_parse_cyclonedx('sbom-ui.cdx.json');
  $counts = rf_merge_counts($api['counts'], $ui['counts']);
  return [
    'api' => $api, 'ui' => $ui,
    'counts' => $counts,
    'vulns' => array_merge($api['vulns'], $ui['vulns']),
    'api_pkgs' => $sbomApi['count'], 'ui_pkgs' => $sbomUi['count'],
    'posture' => rf_posture($counts),
  ];
}

function rf_sbom() {
  $api = rf_parse_cyclonedx('sbom-api.cdx.json');
  $ui  = rf_parse_cyclonedx('sbom-ui.cdx.json');
  return [
    'api' => $api, 'ui' => $ui,
    'api_pkgs' => $api['count'], 'ui_pkgs' => $ui['count'],
    'total' => $api['count'] + $ui['count'],
  ];
}

// DAST: parse an optional ZAP JSON if present; otherwise return a clean,
// no-scanner-artefact result so the page falls back to its manual narrative.
function rf_dast($file = 'zap.json') {
  $out = ['counts' => rf_zero_counts(), 'findings' => [], 'has_scan' => false];
  $data = rf_load_json($file);
  if (!$data) { return $out; }
  $out['has_scan'] = true;
  $risk = ['3' => 'HIGH', '2' => 'MEDIUM', '1' => 'LOW', '0' => 'INFO'];
  foreach ($data['site'] ?? [] as $site) {
    foreach ($site['alerts'] ?? [] as $a) {
      $sev = $risk[(string)($a['riskcode'] ?? '0')] ?? 'INFO';
      $n = max(count($a['instances'] ?? []), 1);
      $out['counts'][$sev] += $n;
      $out['findings'][] = [
        'name' => $a['alert'] ?? ($a['name'] ?? ''),
        'severity' => $sev, 'count' => $n,
        'cwe' => isset($a['cweid']) ? ('CWE-' . $a['cweid']) : '',
      ];
    }
  }
  return $out;
}
