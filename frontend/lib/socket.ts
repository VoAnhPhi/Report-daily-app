import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Track pending room joins to ensure we (re)join on connect
let pendingUserId: string | null = null;
let pendingAdmin: { userId: string; role: string } | null = null;

/**
 * Server-side stub.
 *
 * This module is imported by client components that Next.js also evaluates on
 * the server during SSR. Calling `io()` at module scope therefore opened a real
 * connection attempt from the Node process on every render pass — before React
 * had even mounted. The stub keeps the default-export shape (18 call sites use
 * `import socket from '@/lib/socket'`) while doing nothing on the server; every
 * real usage lives inside a `useEffect`, so it only ever runs in the browser.
 */
function createServerStub(): Socket {
  const stub = {
    connected: false,
    disconnected: true,
    on: () => stub,
    once: () => stub,
    off: () => stub,
    emit: () => stub,
    connect: () => stub,
    disconnect: () => stub,
    removeAllListeners: () => stub,
  };

  return stub as unknown as Socket;
}

function createBrowserSocket(): Socket {
  const instance = io(SOCKET_URL, {
    // Add reconnection options to prevent spamming
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 5000, // 5 seconds delay between attempts
    reconnectionDelayMax: 10000, // Maximum delay of 10 seconds
    timeout: 20000, // Connection timeout
  });

  // Ensure pending joins are processed on connect
  instance.on('connect', () => {
    if (pendingUserId) {
      joinUserRoom(pendingUserId);
    }
    if (pendingAdmin) {
      joinAdminRoom(pendingAdmin.userId, pendingAdmin.role);
    }
  });

  return instance;
}

const socket: Socket =
  typeof window === 'undefined' ? createServerStub() : createBrowserSocket();

// Function to join user room
export const joinUserRoom = (userId: string) => {
  pendingUserId = userId;

  if (!socket.connected) {
    return;
  }

  socket.emit('joinUserRoom', { userId });
};

// Function to join admin room
export const joinAdminRoom = (userId: string, role: string) => {
  pendingAdmin = { userId, role };

  if (!socket.connected) {
    return;
  }

  socket.emit('joinAdminRoom', { userId, role });
};

export default socket;
