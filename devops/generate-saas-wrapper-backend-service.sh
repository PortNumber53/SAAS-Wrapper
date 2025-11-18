#!/usr/bin/env bash
set -euo pipefail

# generate-saas-wrapper-backend-service.sh
# Usage:
#   devops/generate-saas-wrapper-backend-service.sh <target-dir> [output-path]
# Example:
#   devops/generate-saas-wrapper-backend-service.sh /var/www/vhosts/api-saas.truvis.co /tmp/saas-wrapper-backend.service
#
# Writes a systemd unit file for the Go backend, matching the Jenkins deploy configuration.

usage() {
  echo "Usage: $0 <target-dir> [output-path]" >&2
  echo "  <target-dir>  Absolute directory where the backend binary and logs live" >&2
  echo "  [output-path] Path to write the unit file (default: saas-wrapper-backend.service in CWD)" >&2
}

TARGET_DIR="${1:-}"
OUT="${2:-saas-wrapper-backend.service}"

if [[ -z "${TARGET_DIR}" ]]; then
  echo "error: missing <target-dir>" >&2
  usage
  exit 1
fi

if [[ "${TARGET_DIR}" != /* ]]; then
  echo "error: <target-dir> must be an absolute path, got: ${TARGET_DIR}" >&2
  exit 1
fi

cat > "${OUT}" <<EOF
[Unit]
Description=SAAS Wrapper Backend
After=network-online.target

[Service]
User=grimlock
Group=grimlock
WorkingDirectory=${TARGET_DIR}
EnvironmentFile=/etc/saas-wrapper-backend/config.ini
Environment=PORT=18311
ExecStart=${TARGET_DIR}/saas-wrapper-backend
Restart=always
RestartSec=2s
NoNewPrivileges=true
LimitNOFILE=65536
StandardOutput=append:${TARGET_DIR}/logs/app.log
StandardError=append:${TARGET_DIR}/logs/error.log

[Install]
WantedBy=multi-user.target
EOF

echo "Wrote systemd unit to: ${OUT}" >&2


