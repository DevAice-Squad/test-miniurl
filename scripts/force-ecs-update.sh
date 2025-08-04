#!/bin/bash

echo "🔧 Force ECS Service Update Script"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install AWS CLI first."
    exit 1
fi

# Set variables
CLUSTER_NAME="miniurl-cluster"
SERVICE_NAME="miniurl-service"
REGION="us-east-1"

echo "📋 Current service status:"
aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --query 'services[0].{Status:status,TaskDefinition:taskDefinition,RunningCount:runningCount,DesiredCount:desiredCount}' \
    --output table

echo ""
echo "🚀 Forcing new deployment..."

# Force new deployment
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --region $REGION \
    --force-new-deployment \
    --query 'service.{Status:status,TaskDefinition:taskDefinition}' \
    --output table

if [ $? -eq 0 ]; then
    echo "✅ Force deployment initiated successfully!"
    echo ""
    echo "📊 Monitoring deployment progress..."
    echo "You can check the status with:"
    echo "aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
    echo ""
    echo "Or wait for service stability with:"
    echo "aws ecs wait services-stable --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
else
    echo "❌ Failed to initiate force deployment"
    exit 1
fi

echo ""
echo "🔍 Alternative solution if the above doesn't work:"
echo "1. Delete the existing ECS service:"
echo "   aws ecs delete-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --region $REGION --force"
echo ""
echo "2. Wait for service deletion, then run Terraform apply again:"
echo "   cd terraform && terraform apply"
echo ""
echo "⚠️ Note: Deleting the service will cause temporary downtime!" 