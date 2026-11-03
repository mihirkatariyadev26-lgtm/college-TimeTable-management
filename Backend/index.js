import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import { getAllowedOrigins } from './config/cors.js';
import { initSocket } from './config/socket.js';
import authRoutes from './routes/authRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import swapRoutes from './routes/swapRoutes.js';
import freeSlotRoutes from './routes/freeSlotRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { responseFormatterMiddleware } from './middlewares/responseEnvelope.js';

// Load environment variables
dotenv.config();

// Do not accept requests until the database connection is ready.
await connectDB();

const app = express();
const server = createServer(app);

// Initialize Socket.io
initSocket(server);

// Global Middlewares
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
}));
app.use(express.json());
app.use(responseFormatterMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/free-slots', freeSlotRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route
app.get('/', (req, res) => {
  res.success({ status: 'healthy' }, 'College Timetable Management System API');
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
