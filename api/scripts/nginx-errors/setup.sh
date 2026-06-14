sudo mkdir -p /var/www/nginx-errors/vpn-required

sudo tee /var/www/nginx-errors/vpn-required/index.html > /dev/null <<'EOF'
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>VPN Required</title>
  <link rel="stylesheet" href="/_errors/vpn-required/style.css">
</head>
<body>
  <main class="card">
    <h1>403 · VPN Required</h1>
    <p>This application is restricted to authorized private network access.</p>
    <p>Please connect to VPN and reload this page.</p>
    <p>If you are already connected, contact the system administrator.</p>
  </main>
</body>
</html>
EOF


sudo tee /var/www/nginx-errors/vpn-required/style.css > /dev/null <<'EOF'
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #0f172a;
  color: #e5e7eb;
  min-height: 100vh;
  display: grid;
  place-items: center;
  margin: 0;
}

.card {
  max-width: 560px;
  padding: 32px;
  border-radius: 16px;
  background: #111827;
  border: 1px solid #334155;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

h1 {
  margin-top: 0;
  color: #f9fafb;
}

p {
  line-height: 1.6;
  color: #cbd5e1;
}
EOF

sudo chown -R root:root /var/www/nginx-errors
sudo find /var/www/nginx-errors -type d -exec chmod 755 {} \;
sudo find /var/www/nginx-errors -type f -exec chmod 644 {} \;