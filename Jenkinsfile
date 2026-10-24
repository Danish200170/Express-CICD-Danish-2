
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate source') {
            steps {
                sh '''
                    set -eu
                    test -f server.js
                    test -f package.json
                    node --version
                    npm --version
                    git rev-parse --short HEAD
                '''
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm install --no-audit --no-fund'
            }
        }

        stage('Test') {
            steps {
                sh '''
                    set -eu
                    node --check server.js
                    npm test --if-present
                    echo "Node syntax check passed."
                '''
            }
        }
    }

    post {
        success {
            echo 'Express CI validation completed successfully.'
        }
        failure {
            echo 'Express CI validation failed. Review the console output.'
        }
    }
}
