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
                sh 'npm test'
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
                    passwordVariable: 'GHCR_TOCKEN'
                )]) {
                    sh """
                        echo \$GHCR_TOCKEN | docker login ghcr.io -u \$GHCR_USER --password-stdin
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
                    passwordVariable: 'GHCR_TOCKEN'
                )]) {
                    sh """
                        echo \$GHCR_TOCKEN | docker login ghcr.io -u \$GHCR_USER --password-stdin
                        docker pull ${GHCR_IMAGE}:${GIT_SHA}
                        docker stop 
                    """
                }
            }
        }

    }
}