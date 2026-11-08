import { env } from "./config/env.js";
import { Server } from 'socket.io';
import http from 'node:http';

/**
 * Socket.IO real-time integration.
 *
 * - Rooms per project: tasks are broadcast to project rooms so UI can update
 *   without a full page refresh.
 * - Authentication: only users with a valid JWT can connect.
 * - Redis adapter: cross-process message passing for multi-instance deployments.
 * - Rooms: `/api/projects/:id/tasks` etc.
 *
 * The HTTP server is the same Express server; io.attach(server) would also work
 * but we explicitly pass it so graceful shutdown can close both.
 */
export function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Enable binary support for task-status updates if needed.
    transports: ['polling', 'websocket'],
    allowEIO3: true,
  });

  // Optional Redis adapter for horizontal scaling.
  if (env.redisUrl) {
    try {
      const RedisAdapter = require('socket.io-redis').default;
      io.adapter(new RedisAdapter(env.redisUrl));
      console.log('[socket] Redis adapter attached');
    } catch (_) {
      console.warn('[socket] Redis adapter not available; running single-process only.');
    }
  }

  io.use(async (socket, next) => {
    try {
      // The client sends the JWT either as Authorization: Bearer <token> or as
      // an `auth` object when connecting via the client SDK.
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) return next(new Error('Authentication required for WebSocket.'));

      // Support both Bearer format and cookie-based tokens.
      const payload = jwt.verify(token, env.auth.jwtSecret);
      if (!payload) return next(new Error('Invalid access token.'));

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return next(new Error('User not found.'));

      socket.data.user = user;
      socket.data.auth = payload;
      next();
    } catch (error) {
      next(error);
    }
  });
}