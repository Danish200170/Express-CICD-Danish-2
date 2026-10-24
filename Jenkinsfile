
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    environment {
        APP_HOST = '172.31.1.79'
        APP_DIR = '/home/ubuntu/Docker_Danish_EC2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate and Test') {
            steps {
                sh '''
                    set -eu

                    test -f server.js
                    test -f package.json
                    test -f package-lock.json
                    test -f Dockerfile
                    test -f views/index.ejs
                    test -f public/styles.css

                    node --check server.js
                    npm install --no-audit --no-fund
                    npm test --if-present

                    echo "Express validation passed."
                '''
            }
        }

        stage('Preflight Application Server') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'app-server-ssh',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set +x

                        ssh -i "$SSH_KEY" \
                            -o BatchMode=yes \
                            -o IdentitiesOnly=yes \
                            -o StrictHostKeyChecking=accept-new \
                            "$SSH_USER@$APP_HOST" '
                                set -eu
                                cd /home/ubuntu/Docker_Danish_EC2

                                MEM_KB=$(awk "/MemAvailable:/ {print \\$2}" /proc/meminfo)
                                DISK_KB=$(df -Pk . | awk "NR==2 {print \\$4}")

                                free -h
                                df -h .

                                if [ "$MEM_KB" -lt 300000 ]; then
                                    echo "Preflight stopped: available RAM is below 300 MB." >&2
                                    exit 1
                                fi

                                if [ "$DISK_KB" -lt 1000000 ]; then
                                    echo "Preflight stopped: less than 1 GB disk space is available." >&2
                                    exit 1
                                fi

                                sudo docker compose config --services | grep -qx frontend
                                test -n "$(sudo docker compose ps -q frontend)"

                                echo "Current frontend health:"
                                curl -fsS --max-time 5 http://127.0.0.1:3000/health
                                echo
                            '
                    '''
                }
            }
        }

        stage('Copy Frontend Files') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'app-server-ssh',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set +x

                        ssh -i "$SSH_KEY" \
                            -o BatchMode=yes \
                            -o IdentitiesOnly=yes \
                            -o StrictHostKeyChecking=accept-new \
                            "$SSH_USER@$APP_HOST" \
                            "mkdir -p '$APP_DIR/frontend/public' '$APP_DIR/frontend/views'"

                        scp -i "$SSH_KEY" \
                            -o BatchMode=yes \
                            -o IdentitiesOnly=yes \
                            -o StrictHostKeyChecking=accept-new \
                            server.js package.json package-lock.json Dockerfile .dockerignore \
                            "$SSH_USER@$APP_HOST:$APP_DIR/frontend/"

                        scp -i "$SSH_KEY" \
                            -o BatchMode=yes \
                            -o IdentitiesOnly=yes \
                            -o StrictHostKeyChecking=accept-new \
                            public/styles.css \
                            "$SSH_USER@$APP_HOST:$APP_DIR/frontend/public/"

                        scp -i "$SSH_KEY" \
                            -o BatchMode=yes \
                            -o IdentitiesOnly=yes \
                            -o StrictHostKeyChecking=accept-new \
                            views/index.ejs \
                            "$SSH_USER@$APP_HOST:$APP_DIR/frontend/views/"
                    '''
                }
            }
        }

        stage('Build and Deploy Frontend') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'app-server-ssh',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set +x

                        ssh -i "$SSH_KEY" \
                            -o BatchMode=yes \
                            -o IdentitiesOnly=yes \
                            -o StrictHostKeyChecking=accept-new \
                            "$SSH_USER@$APP_HOST" '
                                set -eu
                                cd /home/ubuntu/Docker_Danish_EC2

                                MEM_KB=$(awk "/MemAvailable:/ {print \\$2}" /proc/meminfo)
                                DISK_KB=$(df -Pk . | awk "NR==2 {print \\$4}")

                                if [ "$MEM_KB" -lt 300000 ] || [ "$DISK_KB" -lt 1000000 ]; then
                                    echo "Resource check failed; deployment was not started." >&2
                                    exit 1
                                fi

                                FRONTEND_CONTAINER=$(sudo docker compose ps -q frontend)
                                test -n "$FRONTEND_CONTAINER"

                                OLD_IMAGE_ID=$(sudo docker inspect --format="{{.Image}}" "$FRONTEND_CONTAINER")
                                sudo docker tag "$OLD_IMAGE_ID" local/express-frontend-backup:jenkins-latest

                                echo "Building frontend only..."
                                sudo docker compose build frontend

                                echo "Replacing frontend only..."
                                sudo docker compose up -d --no-deps frontend

                                HEALTHY=0
                                for attempt in $(seq 1 20); do
                                    if curl --fail --silent --max-time 3 http://127.0.0.1:3000/health >/dev/null; then
                                        HEALTHY=1
                                        break
                                    fi
                                    sleep 3
                                done

                                if [ "$HEALTHY" -ne 1 ]; then
                                    echo "New frontend failed health checks. Rolling back." >&2
                                    sudo docker tag "$OLD_IMAGE_ID" danish70/docker-assignment-frontend:1.0
                                    sudo docker compose up -d --no-deps --no-build --force-recreate frontend
                                    sudo docker compose ps frontend
                                    exit 1
                                fi

                                echo "Frontend health response:"
                                curl --fail --silent --show-error http://127.0.0.1:3000/health
                                echo

                                sudo docker compose ps frontend
                                echo "Frontend deployment completed."
                            '
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Express CI/CD pipeline and frontend health check succeeded.'
        }
        failure {
            echo 'Express pipeline failed. Review the Console Output.'
        }
    }
}
