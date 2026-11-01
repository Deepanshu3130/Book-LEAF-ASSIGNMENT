import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// Connect to socket server with dynamic JWT token authentication
export const initSocket = (userId, role) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        cb({ token: localStorage.getItem('token') });
      },
    });
  }

  return socket;
};

// Retrieve active socket instance
export const getSocket = () => socket;

// Clean disconnect
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
