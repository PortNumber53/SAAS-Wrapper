#!/usr/bin/env bash
set -euo pipefail

# Matrix axis (provided by Jenkins Multi-Configuration job)
ARCH="${GOARCH:-amd64}"

# Workspace and paths
WS="${WORKSPACE:-$(pwd)}"
ART_DIR="${WS}/artifacts"
BACKEND_DIR="${WS}/backend"

# Target deployment settings (can be overridden in Jenkins job env)
TARGET_HOST="${TARGET_HOST:-web1}"
TARGET_DIR="${TARGET_DIR:-/var/www/vhosts/social.portnumber53.com}"
SERVICE_NAME="${SERVICE_NAME:-saas-wrapper-backend}"
TARGET_USER="${TARGET_USER:-grimlock}"

echo "[build] Building backend for linux/${ARCH}"

mkdir -p "${ART_DIR}"
cd "${BACKEND_DIR}"
export GOOS=linux
export GOARCH="${ARCH}"
export CGO_ENABLED=0
OUT="saas-wrapper-backend-linux-${GOARCH}"
go version || true
go build -ldflags="-s -w" -o "${OUT}" .
cp "${OUT}" "${ART_DIR}/"

if [[ "${GOARCH}" == "amd64" ]]; then
  echo "[deploy] Deploying ${OUT} to ${TARGET_HOST}:${TARGET_DIR}"

  # Upload binary
  scp "${OUT}" "${TARGET_USER}@${TARGET_HOST}:/tmp/saas-wrapper-backend"

  # Create and upload systemd unit with expanded variables
  UNIT_FILE="${WS}/saas-wrapper-backend.service"
  cat >"${UNIT_FILE}" <<EOF
[Unit]
Description=SAAS Wrapper Backend
After=network-online.target

[Service]
User=${TARGET_USER}
Group=${TARGET_USER}
WorkingDirectory=${TARGET_DIR}
EnvironmentFile=/etc/default/saas-wrapper-backend
Environment=PORT=18000
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

  scp "${UNIT_FILE}" "${TARGET_USER}@${TARGET_HOST}:/tmp/${SERVICE_NAME}.service"

  # Upload environment sample file (do not overwrite current env file)
  SAMPLE_LOCAL="${WS}/deploy/saas-wrapper-backend.env.sample"
  if [[ -f "${SAMPLE_LOCAL}" ]]; then
    scp "${SAMPLE_LOCAL}" "${TARGET_USER}@${TARGET_HOST}:/tmp/saas-wrapper-backend.env.sample"
  fi

  # Install on target and restart service
  ssh "${TARGET_USER}@${TARGET_HOST}" "
    set -euo pipefail
    sudo mkdir -p '${TARGET_DIR}' '${TARGET_DIR}/logs'
    sudo chown -R ${TARGET_USER}:${TARGET_USER} '${TARGET_DIR}'
    sudo mv /tmp/saas-wrapper-backend '${TARGET_DIR}/saas-wrapper-backend'
    sudo chown ${TARGET_USER}:${TARGET_USER} '${TARGET_DIR}/saas-wrapper-backend'
    sudo chmod 0755 '${TARGET_DIR}/saas-wrapper-backend'
    sudo mv /tmp/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service
    # Install env sample; if main env file missing, seed it from sample
    if [ -f /tmp/saas-wrapper-backend.env.sample ]; then
      sudo mkdir -p /etc/default
      sudo mv /tmp/saas-wrapper-backend.env.sample /etc/default/saas-wrapper-backend.env.sample
      sudo chown root:root /etc/default/saas-wrapper-backend.env.sample
      sudo chmod 0644 /etc/default/saas-wrapper-backend.env.sample
      if [ ! -f /etc/default/saas-wrapper-backend ]; then
        sudo cp /etc/default/saas-wrapper-backend.env.sample /etc/default/saas-wrapper-backend
        sudo chmod 0640 /etc/default/saas-wrapper-backend
      fi
    fi
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}
    sudo systemctl restart ${SERVICE_NAME}
    sudo systemctl --no-pager status ${SERVICE_NAME} | sed -n '1,20p'
  "

  echo "[deploy] Deploy complete"
else
  echo "[deploy] Skipping deploy for GOARCH=${GOARCH}"
fi
