# BlinkUpZ - Professional Chat App

A modern, real-time chat application built with React, Node.js, Express, MongoDB, and Socket.io.

## Features

- 🔐 User Authentication (Signup/Login/Logout)
- 💬 Real-time messaging with Socket.io
- 👥 Direct messaging between users
- 📱 Responsive design with Tailwind CSS
- 🖼️ Profile management with image upload (Cloudinary)
- 🔍 User search functionality

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT for authentication
- Cloudinary for image uploads
- bcryptjs for password hashing

### Frontend

- React 19
- Redux Toolkit for state management
- React Router for navigation
- Socket.io client
- Tailwind CSS for styling
- Axios for API calls

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd BlinkUpZ
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the backend directory with:

```env
PORT=5000
MONGODB_URL=mongodb://localhost:27017/blinkupz
JWT_SECRET=your_jwt_secret_here
CLOUD_NAME=your_cloudinary_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret
CLIENT_URL=http://localhost:5173
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/logout` - User logout

### User Management

- `GET /api/user/current` - Get current user info
- `POST /api/user/profile` - Update user profile
- `GET /api/user/search?q=query` - Search users

### Chat

- `GET /api/chat` - Get user's chats
- `POST /api/chat` - Create new chat
- `GET /api/chat/:chatId/messages` - Get chat messages
- `POST /api/chat/:chatId/messages` - Send message

## Usage

1. Register a new account or login
2. Update your profile if desired
3. Click "New Chat" to search for users
4. Start chatting in real-time!

## Project Structure

```
BlinkUpZ/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── config/
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── context/
│   │   ├── Hooks/
│   │   └── main.jsx
│   └── public/
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the ISC License.
