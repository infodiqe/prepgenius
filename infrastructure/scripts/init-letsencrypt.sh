#!/usr/bin/env bash
# infrastructure/scripts/init-letsencrypt.sh
#
# One-time certificate bootstrap for a fresh production VPS.
# Run this BEFORE starting the full stack.
#
# What it does:
#   1. Creates a temporary self-signed certificate so nginx can start.
#   2. Starts nginx (it needs to serve /.well-known/acme-challenge/ over HTTP).
#   3. Runs certbot to obtain a real Let's Encrypt certificate.
#   4. Reloads nginx to pick up the real certificate.
#
# Pre-requisites:
#   - .env exists with DOMAIN (and optionally LETSENCRYPT_EMAIL)
#   - Ports 80 and 443 are free on the host
#   - DNS A records for $DOMAIN and www.$DOMAIN point to this server

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

# ── Load config ───────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example → .env and set required values."
  exit 1
fi

DOMAIN="${DOMAIN:-$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"'"'" | head -1)}"
EMAIL="${LETSENCRYPT_EMAIL:-$(grep -E '^LETSENCRYPT_EMAIL=' .env 2>/dev/null | cut -d= -f2- | tr -d '"'"'" | head -1 || echo "")}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"

if [[ -z "${DOMAIN}" ]]; then
  echo "ERROR: DOMAIN is not set. Set DOMAIN= in .env."
  exit 1
fi

echo ""
echo "  Domain : ${DOMAIN}"
echo "  Email  : ${EMAIL}"
echo ""

# ── Check for existing certificate ───────────────────────────────────────────
CERT_EXISTS=$(
  docker compose run --rm --no-deps \
    --entrypoint /bin/sh certbot \
    -c "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem && echo yes || echo no" \
    2>/dev/null | tail -1
)

if [[ "$CERT_EXISTS" == "yes" ]]; then
  echo "Certificate already exists at /etc/letsencrypt/live/${DOMAIN}/"
  echo "Nothing to do. Start the stack:  docker compose up -d"
  exit 0
fi

# ── Step 1: Create placeholder directory and self-signed certificate ──────────
echo "[1/4] Creating self-signed placeholder certificate..."

docker compose run --rm --no-deps \
  --entrypoint /bin/sh certbot \
  -c "mkdir -p /etc/letsencrypt/live/${DOMAIN}"

docker compose run --rm --no-deps \
  --entrypoint openssl certbot \
  req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" \
  -out    "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
  -subj   "/CN=localhost"

# ── Step 2: Start nginx with the placeholder cert ─────────────────────────────
echo "[2/4] Starting nginx with placeholder certificate..."
docker compose up --force-recreate -d nginx
echo "      Waiting for nginx to be ready..."
sleep 6

# ── Step 3: Obtain real certificate ──────────────────────────────────────────
echo "[3/4] Requesting Let's Encrypt certificate..."
docker compose run --rm --no-deps certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email    "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}"

# ── Step 4: Reload nginx with real cert ──────────────────────────────────────
echo "[4/4] Reloading nginx with real certificate..."
docker compose exec nginx nginx -s reload

echo ""
echo "=== Certificate bootstrap complete! ==="
echo ""
echo "Start the full stack:"
echo "  docker compose up -d"
echo ""
echo "Auto-renewal runs every 12 hours via the certbot container."
