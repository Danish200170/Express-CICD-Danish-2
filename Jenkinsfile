pipeline {
    agent any
    options { timestamps(); disableConcurrentBuilds() }
    environment {
        DEPLOY_DIR = '/opt/express-app'
        SERVICE_NAME = 'express-app'
        HEALTH_URL = 'http://127.0.0.1:3000/health'
    }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Validate source') {
            steps { sh '''test -f server.js; test -f package.json; node --version; npm --version; git rev-parse --short HEAD''' }
        }
        stage('Install dependencies') { steps { sh 'npm install --no-audit --no-fund' } }
        stage('Test') {
            steps { sh '''node --check server.js; npm test --if-present; echo "Node syntax check passed."''' }
        }
        stage('Deploy') {
            steps { sh '''
                sudo install -d -o jenkins -g jenkins "$DEPLOY_DIR"
                rsync -a --delete --exclude='.git' --exclude='node_modules' ./ "$DEPLOY_DIR"/
                cd "$DEPLOY_DIR"
                npm install --omit=dev --no-audit --no-fund
                sudo systemctl restart "$SERVICE_NAME"
                sudo systemctl is-active --quiet "$SERVICE_NAME"
            ''' }
        }
        stage('Health check') {
            steps { sh '''for attempt in $(seq 1 15); do if curl --fail --silent "$HEALTH_URL"; then exit 0; fi; sleep 2; done; echo "Express health check failed" >&2; exit 1''' }
        }
    }
    post { success { echo 'Express deployment and health check passed.' } failure { echo 'Express pipeline failed; review console output and systemd journal.' } }
}
