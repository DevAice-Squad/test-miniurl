# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.project_name}-ecr"
  }
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# EFS File System for persistent data
resource "aws_efs_file_system" "app_data" {
  creation_token = "${var.project_name}-data"

  performance_mode                = "generalPurpose"
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 5

  encrypted = true

  tags = {
    Name = "${var.project_name}-efs"
  }
}

# EFS Mount Targets
resource "aws_efs_mount_target" "app_data" {
  count = length(aws_subnet.public)

  file_system_id  = aws_efs_file_system.app_data.id
  subnet_id       = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}

# EFS Access Point
resource "aws_efs_access_point" "app_data" {
  file_system_id = aws_efs_file_system.app_data.id

  posix_user {
    gid = 1001
    uid = 1001
  }

  root_directory {
    path = "/data"
    creation_info {
      owner_gid   = 1001
      owner_uid   = 1001
      permissions = "755"
    }
  }

  tags = {
    Name = "${var.project_name}-efs-access-point"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  volume {
    name = "app-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.app_data.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.app_data.id
      }
    }
  }

  container_definitions = jsonencode([
    {
      name  = var.project_name
      image = "${aws_ecr_repository.app.repository_url}:latest"

      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "FRONTEND_PORT"
          value = tostring(var.container_port)
        },
        {
          name  = "BACKEND_PORT"
          value = "5000"
        },
        {
          name  = "DB_PATH"
          value = "/data/database.sqlite"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "app-data"
          containerPath = "/data"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-task"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Force new deployment when task definition changes
  force_new_deployment = true

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.public[*].id
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.project_name
    container_port   = var.container_port
  }

  depends_on = [
    aws_lb_listener.app,
    aws_iam_role_policy_attachment.ecs_execution_role_policy
  ]

  tags = {
    Name = "${var.project_name}-service"
  }

  # Allow task definition updates to trigger service updates
  # Removed ignore_changes to enable port configuration updates
  lifecycle {
    create_before_destroy = true
  }
} 