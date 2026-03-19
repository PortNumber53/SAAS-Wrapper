// Declarative Pipeline with a build matrix ready for CI and multi-arch
// Builds Linux binaries for amd64 and arm64; deploys amd64 to web1.

pipeline {
  agent any

  options {
    timestamps()
    skipDefaultCheckout(false)
  }

  environment {
    GO111MODULE = 'on'
    // Deployment targets
    TARGET_HOST     = 'web1'
    TARGET_DIR      = '/var/www/vhosts/api-saas.truvis.co'
    SERVICE_NAME    = 'saas-wrapper-backend'
    SSH_CREDENTIALS = 'brain-jenkins-private-key'  // Jenkins credential ID (Username with private key)

    // Cloudflare Worker / OAuth / backend configuration (production)
    GOOGLE_CLIENT_ID     = credentials('prod-google-client-id-saas-wrapper')
    GOOGLE_CLIENT_SECRET = credentials('prod-google-client-secret-saas-wrapper')
    // Shared secret used by the Worker to sign sessions (SESSION_SECRET)
    // and, optionally, to secure calls to the Go backend when configured.
    SESSION_SECRET       = credentials('prod-jwt-secret-saas-wrapper')
    // Backend origin that the Worker proxies /api/* requests to
    BACKEND_ORIGIN       = credentials('prod-backend-url-saas-wrapper')
    // Database Postgres DSN used by both dbtool migrations and the Worker
    DATABASE_URL    = credentials('prod-database-url-saas-wrapper')
    // Cloudflare API token used by Wrangler for Worker deploys
    CF_API_TOKEN         = credentials('cloudflare-api-token')
    // Cloudflare account id used by Wrangler (non-secret but stored as a credential for convenience)
    CLOUDFLARE_ACCOUNT_ID = credentials('cloudflare-account-id')
    // Stripe secret key used by backend (via config.ini) and Worker
    STRIPE_SECRET_KEY     = credentials('prod-stripe-secret-key-saas-wrapper')
    // Comma-separated admin emails for admin-gated endpoints
    ADMIN_EMAILS          = credentials('prod-admin-emails-saas-wrapper')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD'
      }
    }

    stage('Build Matrix') {
      matrix {
        axes {
          axis {
            name 'GOARCH'
            values 'amd64', 'arm64'
          }
        }
        stages {
          stage('Build') {
            steps {
              dir('backend') {
                sh label: 'Go build', script: '''
                  set -euo pipefail
                  go version || true
                  export GOOS=linux
                  export CGO_ENABLED=0
                  echo "Building for $GOOS/$GOARCH"
                  out="saas-wrapper-backend-${GOOS}-${GOARCH}"
                  go build -ldflags="-s -w" -o "$out" .
                '''
              }
            }
          }
          stage('Archive') {
            steps {
              sh '''
                set -euo pipefail
                mkdir -p artifacts
                cp backend/saas-wrapper-backend-linux-${GOARCH} artifacts/
              '''
              stash name: "bin-${GOARCH}", includes: "artifacts/saas-wrapper-backend-linux-${GOARCH}"
            }
          }
        }
        post {
          success {
            echo "Built ${GOARCH} successfully"
          }
        }
      }
    }

    stage('DB Migrate') {
      when { expression { return env.DATABASE_URL?.trim() } }
      steps {
        unstash "bin-amd64"
        dir('backend') {
          sh label: 'Run golang-migrate via backend binary', script: '''
            set -euo pipefail
            chmod +x ../artifacts/saas-wrapper-backend-linux-amd64
            ../artifacts/saas-wrapper-backend-linux-amd64 migrate up
          '''
        }
      }
    }

    stage('Deploy (amd64 → web1)') {
      steps {
        unstash "bin-amd64"
        sshagent(credentials: [env.SSH_CREDENTIALS]) {
          sh label: 'Upload & install', script: '''
set -euo pipefail
BIN_LOCAL="artifacts/saas-wrapper-backend-linux-amd64"

# Upload binary to /tmp on target
scp "$BIN_LOCAL" grimlock@${TARGET_HOST}:/tmp/saas-wrapper-backend

# Generate systemd unit file (no indentation, variables expanded)
bash deploy/generate-saas-wrapper-backend-service.sh "${TARGET_DIR}" saas-wrapper-backend.service

# Upload unit file to systemd location
scp saas-wrapper-backend.service grimlock@${TARGET_HOST}:/tmp/saas-wrapper-backend.service

# Prepare target and (re)start service
ssh grimlock@${TARGET_HOST} "
  set -euo pipefail
  sudo mkdir -p ${TARGET_DIR} ${TARGET_DIR}/logs
  sudo chown -R grimlock:grimlock ${TARGET_DIR}
  sudo mv /tmp/saas-wrapper-backend ${TARGET_DIR}/saas-wrapper-backend
  sudo chown grimlock:grimlock ${TARGET_DIR}/saas-wrapper-backend
  sudo chmod 0755 ${TARGET_DIR}/saas-wrapper-backend
  sudo mv /tmp/saas-wrapper-backend.service /etc/systemd/system/${SERVICE_NAME}.service
  sudo systemctl daemon-reload
  sudo systemctl enable ${SERVICE_NAME}
  sudo systemctl restart ${SERVICE_NAME}
"
          '''
        }
      }
    }

    stage('Deploy Worker (Cloudflare)') {
      steps {
        dir('frontend') {
          sh label: 'Deploy Cloudflare Worker', script: '''
            set -euo pipefail

            # Ensure Cloudflare credentials are present
            test -n "${CF_API_TOKEN:-}" || { echo "Missing CF_API_TOKEN for Wrangler"; exit 1; }
            test -n "${CLOUDFLARE_ACCOUNT_ID:-}" || { echo "Missing CLOUDFLARE_ACCOUNT_ID for Wrangler"; exit 1; }

            npm ci
            npm run build

            # Push secrets non-interactively into the production Worker environment
            printf "%s" "$GOOGLE_CLIENT_ID"     | npx wrangler secret put GOOGLE_CLIENT_ID     --env production
            printf "%s" "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
            printf "%s" "$SESSION_SECRET"       | npx wrangler secret put SESSION_SECRET       --env production
            printf "%s" "$DATABASE_URL"    | npx wrangler secret put DATABASE_URL    --env production
            printf "%s" "$STRIPE_SECRET_KEY" | npx wrangler secret put STRIPE_SECRET_KEY --env production
            printf "%s" "$ADMIN_EMAILS"      | npx wrangler secret put ADMIN_EMAILS      --env production

            # Deploy Worker with backend origin configured
            npx wrangler deploy \
              --env production \
              --var BACKEND_ORIGIN="$BACKEND_ORIGIN"
          '''
        }
      }
    }
  }

  post {
    success { echo 'Pipeline completed successfully.' }
    failure { echo 'Pipeline failed.' }
    always  { echo 'Pipeline finished.' }
  }
}
