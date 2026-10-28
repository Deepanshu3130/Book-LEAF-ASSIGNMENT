import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// Connect to socket server and join personal room + admins room if applicable
export const initSocket = (userId, role) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?.id) {
        socket.emit('join', { userId: u.id, role: u.role });
        if (u.role === 'admin') {
          socket.emit('join:admins');
        }
      }
    });
  }

  if (userId) {
    socket.emit('join', { userId, role });
    if (role === 'admin') {
      socket.emit('join:admins');
    }
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
