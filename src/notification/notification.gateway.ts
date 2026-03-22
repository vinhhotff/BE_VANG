import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { Notification } from './schemas/notification.schema';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  guestId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://nesjt-agoda-fe.vercel.app'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'),
          });
          client.userId = payload._id || payload.sub;
          client.userRole = payload.role;
        } catch (error) {
          // If JWT fails, try guest ID
          const guestId = client.handshake.auth?.guestId || client.handshake.query?.guestId;
          if (guestId) {
            client.guestId = guestId;
          }
        }
      } else {
        // Try guest ID
        const guestId = client.handshake.auth?.guestId || client.handshake.query?.guestId;
        if (guestId) {
          client.guestId = guestId;
        }
      }

      // Join user-specific room
      if (client.userId) {
        client.join(`user:${client.userId}`);
        // Join admin/staff room if applicable
        if (client.userRole === 'admin' || client.userRole === 'staff') {
          client.join('admin');
          client.join('staff');
        }
      } else if (client.guestId) {
        client.join(`guest:${client.guestId}`);
      }

      this.connectedClients.set(client.id, client);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
  }

  // Send notification to specific user
  async sendToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Send notification to guest
  async sendToGuest(guestId: string, notification: Notification) {
    this.server.to(`guest:${guestId}`).emit('notification', notification);
  }

  // Send notification to all admins/staff
  async sendToAdmins(notification: Notification) {
    this.server.to('admin').to('staff').emit('notification', notification);
  }

  // Send notification to all connected clients (broadcast)
  async broadcast(notification: Notification) {
    this.server.emit('notification', notification);
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(@MessageBody() data: { id: string }, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const notification = await this.notificationService.markAsRead(data.id);
      return { success: true, notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const count = await this.notificationService.getUnreadCount(client.userId, client.guestId);
      return { count };
    } catch (error) {
      return { count: 0 };
    }
  }
}

