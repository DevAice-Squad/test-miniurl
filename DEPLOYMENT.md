# MiniURL AWS Fargate Deployment Guide

This guide will help you deploy the MiniURL application to AWS Fargate using Terraform and GitHub Actions.

## Architecture Overview

The deployment creates:
- **Single Container**: React frontend + Node.js backend + SQLite database
- **AWS Fargate**: Serverless container hosting
- **Application Load Balancer**: High availability and SSL termination
- **EFS Storage**: Persistent SQLite database storage
- **ECR**: Container image registry
- **CloudWatch**: Logging and monitoring

## Prerequisites

### 1. AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI installed and configured
- IAM user with the following permissions:
  - ECS Full Access
  - ECR Full Access
  - VPC Full Access
  - IAM roles creation
  - CloudWatch Logs
  - Elastic Load Balancing
  - EFS Full Access
  - S3 (for ALB logs)

### 2. Tools Required
- Terraform >= 1.0
- Docker
- Git
- GitHub account

### 3. GitHub Repository Setup
- Fork or clone this repository
- Set up GitHub Secrets (see below)

## Step-by-Step Deployment

### Step 1: Configure AWS Credentials

Create an IAM user with programmatic access and the required permissions:

```bash
# Create IAM user (optional - you can use existing user)
aws iam create-user --user-name miniurl-deploy

# Create access key
aws iam create-access-key --user-name miniurl-deploy
```

### Step 2: Set GitHub Secrets

In your GitHub repository, go to Settings > Secrets and Variables > Actions, and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key ID | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | `wJalrXUt...` |

### Step 3: Configure Terraform Variables

1. Copy the example variables file:
```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

2. Edit `terraform/terraform.tfvars` with your settings:
```hcl
# Basic Configuration
aws_region   = "us-east-1"
project_name = "miniurl"
environment  = "prod"

# Container Configuration
container_cpu    = 256
container_memory = 512
desired_count    = 1

# Optional: Custom Domain (requires ACM certificate)
domain_name     = "miniurl.yourdomain.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
enable_https    = true
```

### Step 4: Deploy Infrastructure

#### Option A: Using GitHub Actions (Recommended)
1. Push your changes to the main branch
2. The Terraform workflow will automatically run
3. Check the Actions tab for progress

#### Option B: Manual Deployment
```bash
# Navigate to terraform directory
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply
```

### Step 5: Deploy Application

After infrastructure is ready:
1. Push any code changes to trigger the deployment workflow
2. Or manually trigger deployment from GitHub Actions

### Step 6: Verify Deployment

1. Check GitHub Actions for successful deployment
2. Get the Load Balancer URL from Terraform outputs:
```bash
cd terraform
terraform output load_balancer_url
```

3. Test the application:
```bash
# Health check
curl http://your-alb-dns-name/health

# API documentation
curl http://your-alb-dns-name/api/docs
```

## Configuration

### Environment Variables

The application uses these environment variables in production:

```env
NODE_ENV=production
PORT=5000
DB_PATH=/data/database.sqlite
JWT_SECRET=your-secret-key
APP_DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
```

### Security Configuration

**Important**: Change these before production deployment:
1. Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. Update the JWT_SECRET in your task definition or use AWS Secrets Manager

### Custom Domain Setup

To use a custom domain:
1. Purchase a domain and set up DNS in Route 53
2. Create an ACM certificate for your domain
3. Update Terraform variables with domain and certificate ARN
4. Apply Terraform changes

## Monitoring and Maintenance

### CloudWatch Logs
- Application logs: `/ecs/miniurl`
- Access logs: S3 bucket `miniurl-alb-logs-*`

### Scaling
Modify these Terraform variables to scale:
```hcl
desired_count    = 2  # Number of tasks
container_cpu    = 512
container_memory = 1024
```

### Database Backup
The SQLite database is stored on EFS. Consider setting up:
- EFS backups through AWS Backup
- Regular database exports to S3

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check CloudWatch logs in `/ecs/miniurl`
   - Verify environment variables
   - Check health check endpoint

2. **Database connection issues**
   - Verify EFS mount is working
   - Check EFS security group rules
   - Ensure /data directory permissions

3. **Load Balancer health checks failing**
   - Verify container port (5000)
   - Check security group rules
   - Test health endpoint: `/health`

### Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster miniurl-cluster --services miniurl-service

# View recent logs
aws logs tail /ecs/miniurl --follow

# Force new deployment
aws ecs update-service --cluster miniurl-cluster --service miniurl-service --force-new-deployment

# Check Load Balancer targets
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...
```

## Costs

Estimated monthly costs (us-east-1):
- ECS Fargate (256 CPU, 512 MB): ~$15-20
- Application Load Balancer: ~$18
- EFS (minimal usage): ~$1-5
- ECR storage: ~$1-2
- CloudWatch Logs: ~$1-3
- **Total: ~$35-50/month**

## Security Best Practices

1. **Secrets Management**: Use AWS Secrets Manager for sensitive data
2. **VPC Security**: Consider using private subnets with NAT Gateway
3. **WAF**: Add AWS WAF for additional protection
4. **SSL/TLS**: Always use HTTPS in production
5. **IAM**: Follow principle of least privilege
6. **Monitoring**: Set up CloudWatch alarms for anomalies

## Cleanup

To destroy all resources:
```bash
# Using Terraform
cd terraform
terraform destroy

# Or using GitHub Actions
# Go to Actions > Terraform Infrastructure > Run workflow > Select "destroy"
```

**Warning**: This will permanently delete all data including the database!

## Support

For issues:
1. Check this documentation
2. Review CloudWatch logs
3. Check GitHub Actions workflow logs
4. Verify AWS resource status in console

## Next Steps

After deployment:
1. Set up monitoring and alerting
2. Configure database backups
3. Set up CI/CD for automated testing
4. Configure custom domain and SSL
5. Implement proper secrets management
6. Set up staging environment 