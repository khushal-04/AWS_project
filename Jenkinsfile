pipeline {
    agent any

    environment {
        S3_BUCKET    = "khushal-dynamic-site-v1"
        ASG_NAME     = "demo-asg"          
        AWS_REGION   = "ap-south-1"
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo "Installing Node.js dependencies..."
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                echo "Running tests..."
                sh 'node --check server.js'
                echo "Syntax check passed."
            }
        }

        stage('Upload to S3') {
            steps {
                echo "Syncing application files to S3..."
                sh """
                    aws s3 sync . s3://${S3_BUCKET} \
                        --region ${AWS_REGION} \
                        --exclude ".git/*" \
                        --exclude "Jenkinsfile" \
                        --exclude "node_modules/*" \
                        --delete
                """
                echo "S3 sync complete."
            }
        }
    
        stage('Trigger ASG Instance Refresh') {
            steps {
                echo "Starting ASG instance refresh..."
                sh """
                    aws autoscaling start-instance-refresh \
                        --auto-scaling-group-name ${ASG_NAME} \
                        --region ${AWS_REGION} \
                        --preferences '{
                            "MinHealthyPercentage": 50,
                            "InstanceWarmup": 120
                        }'
                """
                echo "Instance refresh started. New instances will pull updated code from S3."
            }

        }
       

        stage('Verify Refresh') {
            steps {
                echo "Waiting for instance refresh to complete..."
                timeout(time: 10, unit: 'MINUTES') {
                    script {
                        def status = ""
                        while (status != "Successful") {
                            def result = sh(
                                script: """
                                    aws autoscaling describe-instance-refreshes \
                                        --auto-scaling-group-name ${ASG_NAME} \
                                        --region ${AWS_REGION} \
                                        --query 'InstanceRefreshes[0].Status' \
                                        --output text
                                """,
                                returnStdout: true
                            ).trim()
                            echo "Refresh status: ${result}"
                            if (result == "Failed" || result == "Cancelled") {
                                error("Instance refresh ${result}. Check ASG console.")
                            }
                            status = result
                            if (status != "Successful") sleep(30)
                        }
                    }
                }
                echo "All instances updated successfully."
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded. New code is live at https://khushalparashar.online"
        }
        failure {
            echo "Pipeline failed. Check logs above."
        }
    }
}
