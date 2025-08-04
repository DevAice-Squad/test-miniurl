# MiniURL - URL Shortener Application

A modern, full-stack URL shortener application built with React TypeScript frontend and Node.js backend, designed for AWS Fargate deployment.

## Features

- 🔗 **URL Shortening**: Create short URLs with custom algorithms (hash, UUID, custom)
- 👤 **User Management**: Registration, authentication, and user profiles
- 📊 **Analytics**: Detailed click analytics and user activity tracking
- 🛡️ **Admin Panel**: Complete admin dashboard for user and URL management
- 🔒 **Security**: Rate limiting, CORS protection, input validation
- 📱 **Responsive Design**: Modern, mobile-friendly interface with Tailwind CSS
- 🚀 **Production Ready**: Deployed on AWS Fargate with Terraform

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- React Query for state management
- Axios for API calls
- React Hook Form for form handling

### Backend
- Node.js with Express
- SQLite database (in-memory for development)
- JWT authentication
- Helmet for security headers
- Rate limiting with express-rate-limit
- CORS configuration
- Input validation

### Infrastructure
- AWS Fargate for container hosting
- Application Load Balancer for high availability
- EFS for persistent SQLite storage
- ECR for container registry
- CloudWatch for logging and monitoring
- Terraform for infrastructure as code
- GitHub Actions for CI/CD

## Quick Start

### Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd miniurl
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install

   # Frontend
   cd ../frontend && npm install
   ```

3. **Start development servers**

   **Option A: Traditional Development (Recommended for development)**
   ```bash
   # Backend Database Service (http://localhost:5000)
   cd backend && PORT=5000 npm run dev
   
   # Frontend React Dev Server (http://localhost:3000)
   cd frontend && npm start
   ```

   **Option B: Production-like Development (Multi-service testing)**
   ```bash
   # Backend Database Service (http://localhost:5000)
   cd backend && PORT=5000 npm run dev
   
       # Frontend Service with Proxy (http://localhost:3000)  
    cd backend && PORT=3000 BACKEND_URL=http://localhost:5000 node frontend-server.js
    ```

### Production Deployment

Deploy to AWS Fargate with a single container setup:

1. **Quick Setup**
   ```bash
   ./scripts/setup-deployment.sh
   ```

2. **Manual Setup**
   - Follow the detailed [Deployment Guide](DEPLOYMENT.md)
   - Configure AWS credentials and GitHub secrets
   - Deploy infrastructure with Terraform
   - Push code to trigger deployment

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │   Express API    │    │   SQLite DB     │
│   (Frontend)    │◄──►│   (Backend)      │◄──►│   (EFS Volume)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │   Single Container      │
                    │   (AWS Fargate)         │
                    └─────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │ Application Load        │
                    │ Balancer                │
                    └─────────────────────────┘
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile
- `PUT /auth/change-password` - Change password

### URL Management
- `POST /urls/shorten` - Shorten URL
- `GET /urls/:shortCode` - Redirect to original URL
- `GET /urls/user/urls` - Get user's URLs
- `GET /urls/analytics/:id` - Get URL analytics
- `PUT /urls/:id` - Update URL
- `DELETE /urls/:id` - Delete URL

### Admin (Admin only)
- `GET /admin/users` - Get all users
- `POST /admin/users` - Create user
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/urls` - Get all URLs
- `GET /admin/analytics/dashboard` - Dashboard analytics

### API v1 (Developer Features)
- `POST /api/v1/shorten` - Shorten with algorithms
- `POST /api/v1/shorten/bulk` - Bulk shortening
- `GET /api/v1/algorithms` - Available algorithms
- `GET /api/v1/stats` - API usage statistics

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret-key
DB_PATH=./database.sqlite
APP_DOMAIN=localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Production
   ```env
   NODE_ENV=production
PORT=3000
DB_PATH=/data/database.sqlite
   JWT_SECRET=your-production-secret
APP_DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
```

## Security Features

- JWT-based authentication
- Rate limiting (100 requests/15 minutes)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection protection
- XSS protection

## Monitoring

- CloudWatch logs for application monitoring
- ECS service health checks
- Load balancer health checks
- Custom metrics and alarms
- Access logs to S3

## Cost Estimation

Monthly AWS costs (us-east-1):
- ECS Fargate (256 CPU, 512 MB): ~$15-20
- Application Load Balancer: ~$18
- EFS storage: ~$1-5
- ECR storage: ~$1-2
- CloudWatch Logs: ~$1-3
- **Total: ~$35-50/month**

## Development

### Project Structure
```
miniurl/
├── backend/               # Express.js API
│   ├── config/           # Database configuration
│   ├── middleware/       # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js        # Express server
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
├── terraform/           # Infrastructure as code
├── .github/workflows/   # CI/CD pipelines
├── scripts/            # Deployment scripts
└── DEPLOYMENT.md       # Deployment guide
```

### Commands

```bash
# Backend development
npm run dev          # Start development server
npm start           # Start production server
npm run migrate     # Run database migrations
npm run seed        # Seed database

# Frontend development
npm start           # Start development server
npm run build       # Build for production
npm test           # Run tests
npm run type-check # TypeScript check

# Infrastructure
cd terraform
terraform plan      # Plan infrastructure changes
terraform apply     # Apply infrastructure changes
terraform destroy   # Destroy infrastructure
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Deployment Guide](DEPLOYMENT.md)
- 🐛 [GitHub Issues](https://github.com/your-username/miniurl/issues)
- 📧 Email: your-email@example.com

## Roadmap

- [ ] Redis caching layer
- [ ] Custom domain management
- [ ] QR code generation
- [ ] Bulk import/export
- [ ] API rate limiting per user
- [ ] Webhook notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-region deployment 