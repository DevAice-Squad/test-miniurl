output "load_balancer_url" {
  description = "Load Balancer URL"
  value       = "http://${aws_lb.app.dns_name}"
}

output "load_balancer_dns" {
  description = "Load Balancer DNS name"
  value       = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  description = "ECR Repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS Service name"
  value       = aws_ecs_service.app.name
}

output "ecs_task_definition_arn" {
  description = "ECS Task Definition ARN"
  value       = aws_ecs_task_definition.app.arn
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "efs_file_system_id" {
  description = "EFS File System ID"
  value       = aws_efs_file_system.app_data.id
}

output "s3_alb_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  value       = aws_s3_bucket.alb_logs.bucket
} 