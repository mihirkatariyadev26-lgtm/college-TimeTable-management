import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust to match frontend domain in production
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key_for_development');
      socket.user = decoded; // Attach user metadata (id, role, semester, division) to socket
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);

    // Join room based on user role and metadata
    if (socket.user.role === 'Student') {
      const studentRoom = `room:sem_${socket.user.semester}_div_${socket.user.division}`;
      socket.join(studentRoom);
      console.log(`User ${socket.user.id} joined student room: ${studentRoom}`);
    } else if (socket.user.role === 'Teacher') {
      socket.join('room:faculty');
      socket.join(`room:user_${socket.user.id}`);
      console.log(`User ${socket.user.id} joined room:faculty and user room: room:user_${socket.user.id}`);
    } else if (socket.user.role === 'Admin') {
      socket.join('room:admin');
      console.log(`User ${socket.user.id} joined room:admin`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

/**
 * Emit event to a specific room
 */
export const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
    console.log(`[Socket.io] Emitted ${event} to ${room}`);
  }
};
