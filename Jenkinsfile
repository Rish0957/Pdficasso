pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Test Backend') {
            // We use the Docker Pipeline plugin to spin up a temporary Node container
            // just to run our tests. This keeps the Jenkins server clean!
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
        
        stage('Build App Containers') {
            // This stage runs directly on Jenkins, which has the docker CLI installed
            // and is connected to your PC's docker daemon via `/var/run/docker.sock`
            steps {
                echo 'Building production Docker images...'
                sh 'docker compose build'
            }
        }
        
        stage('Mock Deploy') {
            steps {
                echo 'Build successful. Images are ready.'
                echo 'Deploying to Staging Environment... (Simulated)'
                // In a real pipeline, we might do:
                // sh 'docker compose up -d'
            }
        }
    }
}
