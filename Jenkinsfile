pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Test Backend') {
            agent {
                docker { 
                    image 'node:20-alpine' 
                    reuseNode true
                }
            }
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm run test'
                }
            }
        }
        
        
        stage('Deploy to Environment') {
            steps {
                script {
                    if (env.GIT_BRANCH == 'origin/dev') {
                        echo '🚀 Deploying to Staging Environment (Port 8081)...'
                        sh 'FRONTEND_PORT=8081 BACKEND_PORT=3002 COMPOSE_PROJECT_NAME=pdficasso-staging docker compose up -d --build'
                        
                    } else if (env.GIT_BRANCH == 'origin/main') {
                        echo '🚀 Deploying to Production Environment (Port 80)...'
                        sh 'FRONTEND_PORT=80 BACKEND_PORT=3000 COMPOSE_PROJECT_NAME=pdficasso-prod docker compose up -d --build'
                        
                    } else {
                        echo "🚀 Deploying to DEV Environment (Port 8082) for branch ${env.GIT_BRANCH}..."
                        sh 'FRONTEND_PORT=8082 BACKEND_PORT=3003 COMPOSE_PROJECT_NAME=pdficasso-dev docker compose up -d --build'
                    }
                }
            }
        }
    }
}
