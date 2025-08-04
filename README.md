# MinURL - Professional URL Shortener Application

A comprehensive web-based URL shortener application built with modern technologies, featuring user authentication, analytics, admin panel, and developer API.

## 🚀 Features

### End-User Features
- **Simple URL Shortening**: Transform long URLs into short, memorable links
- **Custom Algorithms**: Choose from multiple shortening algorithms (Hash, UUID, Custom)
- **Analytics Dashboard**: Track clicks, geographic data, and referrer information
- **User Authentication**: Secure JWT-based authentication system
- **Social Sharing**: Easy copy-to-clipboard and social media integration

### Admin Features
- **User Management**: Create, edit, and manage user accounts
- **URL Management**: Monitor and manage all shortened URLs
- **Analytics Reporting**: Comprehensive system-wide analytics
- **Dashboard Overview**: Real-time statistics and insights

### Developer Features
- **REST API**: Comprehensive API with versioning
- **Custom Algorithms**: Configurable shortening algorithms
- **Bulk Operations**: Process multiple URLs simultaneously
- **API Documentation**: Complete endpoint documentation
- **Rate Limiting**: Built-in request rate limiting

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT with bcrypt password hashing
- **Security**: Helmet, CORS, CSRF protection, rate limiting
- **API**: RESTful API with versioning (v1)

### Frontend (React/TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Tailwind CSS with custom design system
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form with validation

### Domain
- **Short URLs**: mini.cloudrakshak.com

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=minurl_db
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Frontend URL
   FRONTEND_URL=http://localhost:3000

   # Application Domain
   APP_DOMAIN=mini.cloudrakshak.com
   ```

4. **Database Setup**:
   ```bash
   # Create PostgreSQL database
   createdb minurl_db
   
   # Run migrations (tables will be created automatically)
   npm run dev
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   Create `.env` file:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:5000
   ```

4. **Start Development Server**:
   ```bash
   npm start
   ```

### Full Application Setup

From the root directory:

```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend
npm run dev
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/change-password` - Change password

### URL Management
- `POST /urls/shorten` - Shorten a URL
- `GET /urls/:shortCode` - Redirect to original URL
- `GET /urls/user/urls` - Get user's URLs
- `GET /urls/analytics/:id` - Get URL analytics
- `PUT /urls/:id` - Update URL
- `DELETE /urls/:id` - Delete URL

### Admin (Requires Admin Role)
- `GET /admin/users` - Get all users
- `POST /admin/users` - Create user
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/urls` - Get all URLs
- `GET /admin/analytics/dashboard` - Dashboard analytics

### Developer API (v1)
- `POST /api/v1/shorten` - Shorten URL with custom algorithms
- `POST /api/v1/shorten/bulk` - Bulk URL shortening
- `GET /api/v1/url/:shortCode` - Get URL information
- `POST /api/v1/validate` - Validate URL format
- `GET /api/v1/algorithms` - Get available algorithms
- `GET /api/v1/stats` - Get API usage statistics

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **CSRF Protection**: Cross-site request forgery protection
- **Rate Limiting**: Request rate limiting per IP
- **Input Validation**: Comprehensive input validation
- **Security Headers**: Helmet.js security headers
- **CORS Configuration**: Configurable CORS policies

## 📊 Database Schema

### Users Table
```sql
- id (Primary Key)
- username (Unique)
- email (Unique)
- password_hash
- role (user/admin)
- isActive
- created_at
- updated_at
```

### URLs Table
```sql
- id (Primary Key)
- original_url
- short_url (Unique, 6-8 characters)
- user_id (Foreign Key)
- title
- description
- is_active
- expires_at
- created_at
- updated_at
```

### Clicks Table
```sql
- id (Primary Key)
- url_id (Foreign Key)
- ip_address
- user_agent
- referer
- country
- city
- browser
- os
- device_type
- date_time
```

## 🚀 Deployment

### Production Environment

1. **Environment Variables**:
   ```env
   NODE_ENV=production
   JWT_SECRET=your-production-secret
   DB_HOST=your-production-db-host
   APP_DOMAIN=mini.cloudrakshak.com
   ```

2. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

3. **Start Production Server**:
   ```bash
   cd backend
   npm start
   ```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile example for backend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔍 Available Scripts

### Root Directory
- `npm run dev` - Start both backend and frontend
- `npm run install:all` - Install all dependencies
- `npm run build` - Build frontend for production

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run type-check` - TypeScript type checking

## 📈 Analytics & Tracking

The application tracks comprehensive analytics:

- **Click Metrics**: Total clicks, unique visitors, click patterns
- **Geographic Data**: Country, city, timezone information
- **Device Information**: Browser, OS, device type
- **Referrer Data**: Traffic sources and referrer domains
- **Time-based Analytics**: Hourly, daily, weekly, monthly stats

## 🛠️ Development

### Code Structure
```
minurl-app/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── models/             # Sequelize models
│   ├── routes/             # Express routes
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic
│   └── server.js           # Entry point
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app component
│   └── public/             # Static assets
└── README.md              # Documentation
```

### Key Technologies
- **Backend**: Node.js, Express.js, PostgreSQL, Sequelize, JWT, bcrypt
- **Frontend**: React, TypeScript, Tailwind CSS, React Query, React Router
- **Security**: Helmet, CORS, Rate Limiting, Input Validation
- **Development**: ESLint, Prettier, Nodemon, Concurrently

## 📝 API Documentation

Full API documentation is available at `/api/docs` when the server is running.

Example API usage:

```javascript
// Shorten a URL
const response = await fetch('/api/v1/shorten', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    original_url: 'https://example.com/very/long/url',
    algorithm: 'hash',
    title: 'My Example URL'
  })
});

const data = await response.json();
console.log(data.data.full_short_url); // https://mini.cloudrakshak.com/abc123
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the API documentation at `/api/docs`
- Review the application logs for troubleshooting

## 🎯 Roadmap

- [ ] Advanced analytics with charts and graphs
- [ ] QR code generation for URLs
- [ ] Custom domain support
- [ ] URL expiration and scheduling
- [ ] Bulk import/export functionality
- [ ] Integration with social media platforms
- [ ] Mobile application
- [ ] API webhooks and notifications

---

Built with ❤️ for better link management and analytics. 