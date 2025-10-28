// Declarative Pipeline with a build matrix ready for CI and multi-arch
// Builds Linux binaries for amd64 and arm64; deploys amd64 to web1.

pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    skipDefaultCheckout(false)
  }

  environment {
    GO111MODULE = 'on'
    // Deployment targets
    TARGET_HOST    = 'web1'
    TARGET_DIR     = '/var/www/vhosts/social.portnumber53.com'
    SERVICE_NAME   = 'saas-wrapper-backend'
    SSH_CREDENTIALS = 'brain-jenkins-private-key'  // Jenkins credential ID (Username with private key)
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

    stage('Deploy (amd64 → web1)') {
      steps {
        unstash "bin-amd64"
        sshagent(credentials: [env.SSH_CREDENTIALS]) {
          sh label: 'Upload & install', script: '''
            set -euo pipefail
            BIN_LOCAL="artifacts/saas-wrapper-backend-linux-amd64"
            # Upload binary and unit file to /tmp on target
            scp "$BIN_LOCAL" grimlock@${TARGET_HOST}:/tmp/saas-wrapper-backend
            cat > saas-wrapper-backend.service << 'EOF'
            [Unit]
            Description=SAAS Wrapper Backend
            After=network-online.target
            [Service]
            User=grimlock
            Group=grimlock
            WorkingDirectory=${TARGET_DIR}
            EnvironmentFile=/etc/default/saas-wrapper-backend
            Environment=BACKEND_PORT=18000
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
  }

  post {
    success { echo 'Pipeline completed successfully.' }
    failure { echo 'Pipeline failed.' }
    always  { sh 'ls -lah artifacts || true' }
  }
}
