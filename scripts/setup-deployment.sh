#!/bin/bash

set -e

echo "🚀 MiniURL AWS Fargate Deployment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform is not installed. Please install Terraform >= 1.0${NC}"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed. Please install AWS CLI${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites are installed${NC}"
}

# Collect configuration from user
collect_configuration() {
    echo -e "\n${BLUE}Configuration Setup${NC}"
    echo "Please provide the following information:"
    
    read -p "AWS Region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    read -p "Project Name (default: miniurl): " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-miniurl}
    
    read -p "Environment (default: prod): " ENVIRONMENT
    ENVIRONMENT=${ENVIRONMENT:-prod}
    
    read -p "Container CPU (256/512/1024, default: 256): " CONTAINER_CPU
    CONTAINER_CPU=${CONTAINER_CPU:-256}
    
    read -p "Container Memory in MB (512/1024/2048, default: 512): " CONTAINER_MEMORY
    CONTAINER_MEMORY=${CONTAINER_MEMORY:-512}
    
    read -p "Desired task count (default: 1): " DESIRED_COUNT
    DESIRED_COUNT=${DESIRED_COUNT:-1}
    
    echo -e "\n${YELLOW}Optional: Custom Domain Configuration${NC}"
    read -p "Domain name (leave empty for ALB DNS): " DOMAIN_NAME
    
    if [ ! -z "$DOMAIN_NAME" ]; then
        read -p "ACM Certificate ARN: " CERTIFICATE_ARN
        ENABLE_HTTPS="true"
    else
        CERTIFICATE_ARN=""
        ENABLE_HTTPS="false"
    fi
}

# Generate Terraform variables file
generate_terraform_vars() {
    echo -e "\n${BLUE}Generating Terraform configuration...${NC}"
    
    cat > terraform/terraform.tfvars << EOF
# AWS Configuration
aws_region = "$AWS_REGION"

# Project Configuration
project_name = "$PROJECT_NAME"
environment  = "$ENVIRONMENT"

# Container Configuration
container_port   = 5000
container_cpu    = $CONTAINER_CPU
container_memory = $CONTAINER_MEMORY
desired_count    = $DESIRED_COUNT

# Network Configuration
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]

# Domain Configuration
domain_name     = "$DOMAIN_NAME"
certificate_arn = "$CERTIFICATE_ARN"
enable_https    = $ENABLE_HTTPS
EOF
    
    echo -e "${GREEN}✅ Terraform variables file created: terraform/terraform.tfvars${NC}"
}

# Generate JWT secret
generate_jwt_secret() {
    echo -e "\n${BLUE}Generating JWT Secret...${NC}"
    
    if command -v node &> /dev/null; then
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
        echo -e "${GREEN}✅ JWT Secret generated${NC}"
        echo -e "${YELLOW}⚠️  Please save this JWT secret securely: ${JWT_SECRET}${NC}"
        echo -e "${YELLOW}⚠️  You'll need to update your production environment with this secret${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js not found. Please generate a JWT secret manually:${NC}"
        echo -e "${YELLOW}    openssl rand -hex 64${NC}"
    fi
}

# Check AWS credentials
check_aws_credentials() {
    echo -e "\n${BLUE}Checking AWS credentials...${NC}"
    
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        CURRENT_USER=$(aws sts get-caller-identity --query Arn --output text)
        echo -e "${GREEN}✅ AWS credentials are configured${NC}"
        echo -e "   Account ID: ${ACCOUNT_ID}"
        echo -e "   User/Role: ${CURRENT_USER}"
    else
        echo -e "${RED}❌ AWS credentials are not configured${NC}"
        echo -e "${YELLOW}Please configure AWS credentials using:${NC}"
        echo -e "   aws configure"
        echo -e "   or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
        exit 1
    fi
}

# Initialize Terraform
init_terraform() {
    echo -e "\n${BLUE}Initializing Terraform...${NC}"
    
    cd terraform
    
    if terraform init; then
        echo -e "${GREEN}✅ Terraform initialized successfully${NC}"
    else
        echo -e "${RED}❌ Terraform initialization failed${NC}"
        exit 1
    fi
    
    echo -e "\n${BLUE}Validating Terraform configuration...${NC}"
    
    if terraform validate; then
        echo -e "${GREEN}✅ Terraform configuration is valid${NC}"
    else
        echo -e "${RED}❌ Terraform configuration validation failed${NC}"
        exit 1
    fi
    
    cd ..
}

# Show next steps
show_next_steps() {
    echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Set up GitHub Secrets:"
    echo "   - AWS_ACCESS_KEY_ID"
    echo "   - AWS_SECRET_ACCESS_KEY"
    echo ""
    echo "2. Deploy infrastructure:"
    echo "   ${YELLOW}cd terraform && terraform plan && terraform apply${NC}"
    echo ""
    echo "3. Or push to GitHub to trigger automatic deployment"
    echo ""
    echo "4. Monitor deployment in:"
    echo "   - GitHub Actions (if using CI/CD)"
    echo "   - AWS Console > ECS > Clusters"
    echo "   - AWS Console > EC2 > Load Balancers"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "   # Check deployment status"
    echo "   aws ecs describe-services --cluster ${PROJECT_NAME}-cluster --services ${PROJECT_NAME}-service"
    echo ""
    echo "   # View logs"
    echo "   aws logs tail /ecs/${PROJECT_NAME} --follow"
    echo ""
    echo "   # Get load balancer URL"
    echo "   cd terraform && terraform output load_balancer_url"
    echo ""
    echo -e "${YELLOW}⚠️  Don't forget to update your JWT secret in production!${NC}"
}

# Main execution
main() {
    check_prerequisites
    collect_configuration
    generate_terraform_vars
    generate_jwt_secret
    check_aws_credentials
    init_terraform
    show_next_steps
}

# Run the script
main 