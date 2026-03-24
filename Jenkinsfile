pipeline {
    agent any

    environment {
        GHCR_IMAGE = "ghcr.io/wanniarachchichaluka/support-ticket-api"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Set Variables') {
            steps {
                script {
                    env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    sh 'npm test'
                }
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Build Docker Image') {
            when { branch 'main' }
            steps {
                sh "docker build -t ${GHCR_IMAGE}:${GIT_SHA} ."
            }
        }

        stage('Push to GHCR') {
            when { branch 'main' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'ghcr-credentials',
                    usernameVariable: 'GHCR_USER',
                    passwordVariable: 'GHCR_TOKEN'
                )]) {
                    sh """
                        echo \$GHCR_TOKEN | docker login ghcr.io -u \$GHCR_USER --password-stdin
                        docker push ${GHCR_IMAGE}:${GIT_SHA}
                    """
                }
            }
        }

        stage('Deploy to Staging') {
            when { branch 'main' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'ghcr-credentials',
                    usernameVariable: 'GHCR_USER',
                    passwordVariable: 'GHCR_TOKEN'
                )]) {
                    sh """
                        echo \$GHCR_TOKEN | docker login ghcr.io -u \$GHCR_USER --password-stdin
                        docker pull ${GHCR_IMAGE}:${GIT_SHA}
                        docker stop support-ticket-staging || true
                        docker rm support-ticket-staging || true
                        docker run -d \
                            --name support-ticket-staging \
                            -p 3000:3000 \
                            --restart unless-stopped \
                            ${GHCR_IMAGE}:${GIT_SHA}
                    """
                }
            }
        }

        stage('Smoke Test') {
            when { branch 'main' }
            steps {
                sh '''
                    sleep 5
                    curl -f http://localhost:3000/health
                '''
            }
        }

        stage('Approval Gate') {
            when { branch 'main' }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    input message: 'Staging successful. Deploy to production?',
                          ok: 'Deploy to Production'
                }
            }
        }

        stage('Deploy to Production') {
            when { branch 'main' }
            steps {
                script {
                    def previousSha = sh(
                        script: "docker inspect support-ticket-prod --format '{{.Config.Image}}' 2>/dev/null | cut -d: -f2 || echo 'none'",
                        returnStdout: true
                    ).trim()

                    catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                        withCredentials([usernamePassword(
                            credentialsId: 'ghcr-credentials',
                            usernameVariable: 'GHCR_USER',
                            passwordVariable: 'GHCR_TOKEN'
                        )]) {
                            sh """
                                echo \$GHCR_TOKEN | docker login ghcr.io -u \$GHCR_USER --password-stdin
                                docker pull ${GHCR_IMAGE}:${GIT_SHA}
                                docker stop support-ticket-prod || true
                                docker rm support-ticket-prod || true
                                docker run -d \
                                    --name support-ticket-prod \
                                    -p 80:3000 \
                                    --restart unless-stopped \
                                    ${GHCR_IMAGE}:${GIT_SHA}
                            """
                        }

                        sh '''
                            sleep 5
                            curl -f http://localhost:80/health
                        '''
                    }

                    if (currentBuild.result == 'FAILURE') {
                        echo "Deploy failed. Rolling back to ${previousSha}..."
                        if (previousSha != 'none') {
                            sh """
                                docker stop support-ticket-prod || true
                                docker rm support-ticket-prod || true
                                docker run -d \
                                    --name support-ticket-prod \
                                    -p 80:3000 \
                                    --restart unless-stopped \
                                    ${GHCR_IMAGE}:${previousSha}
                            """
                            echo "Rollback complete. Running image: ${previousSha}"
                        } else {
                            echo "No previous image found. Attend Manully."
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                sh """
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{
                        "text": ":) BUILD PASSED",
                        "attachments": [
                            {
                                "color": "good",
                                "fields": [
                                    {"title": "Job", "value": "${env.JOB_NAME}", "short": true},
                                    {"title": "Branch", "value": "${env.BRANCH_NAME}", "short": true},
                                    {"title": "Commit", "value": "${env.GIT_SHA}", "short": true},
                                    {"title": "Build", "value": "#${env.BUILD_NUMBER}", "short": true},
                                    {"title": "URL", "value": "${env.BUILD_URL}"}
                                ]
                            }
                        ]
                    }' \$SLACK_URL
                """
            }
        }
        failure {
            withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                sh """
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{
                        "text": ":( BUILD FAILED",
                        "attachments": [
                            {
                                "color": "danger",
                                "fields": [
                                    {"title": "Job", "value": "${env.JOB_NAME}", "short": true},
                                    {"title": "Branch", "value": "${env.BRANCH_NAME}", "short": true},
                                    {"title": "Commit", "value": "${env.GIT_SHA}", "short": true},
                                    {"title": "Build", "value": "#${env.BUILD_NUMBER}", "short": true},
                                    {"title": "URL", "value": "${env.BUILD_URL}"}
                                ]
                            }
                        ]
                    }' \$SLACK_URL
                """
            }
        }
        aborted {
            withCredentials([string(credentialsId: 'slack-webhook', variable: 'SLACK_URL')]) {
                sh """
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{
                        "text": " :| BUILD ABORTED",
                        "attachments": [
                            {
                                "color": "warning",
                                "fields": [
                                    {"title": "Job", "value": "${env.JOB_NAME}", "short": true},
                                    {"title": "Branch", "value": "${env.BRANCH_NAME}", "short": true},
                                    {"title": "Build", "value": "#${env.BUILD_NUMBER}", "short": true},
                                    {"title": "URL", "value": "${env.BUILD_URL}"}
                                ]
                            }
                        ]
                    }' \$SLACK_URL
                """
            }
        }
    }
}