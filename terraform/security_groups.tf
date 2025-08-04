# Security Group for Application Load Balancer
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Application Load Balancer"

  # HTTP ingress
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS ingress
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.project_name}-ecs-tasks-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for ECS tasks"

  # SECURITY: Only allow ALB to access application port (3000)
  # This port serves both frontend and API - database is internal only
  ingress {
    description     = "Allow ALB access to application (frontend + API)"
    from_port       = var.container_port # Port 3000
    to_port         = var.container_port # Port 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Note: No direct database access allowed from external sources
  # SQLite database only accessible within container

  # Outbound traffic (for Docker pulls, AWS API calls, etc.)
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-tasks-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for EFS
resource "aws_security_group" "efs" {
  name_prefix = "${var.project_name}-efs-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for EFS file system"

  # Allow NFS traffic from ECS tasks
  ingress {
    description     = "NFS from ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-efs-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
} 