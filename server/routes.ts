import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import { z } from "zod";
import { insertMessageSchema } from "@shared/schema";
import type { ClientMessage, Participant, Message } from "@shared/schema";

// WebSocket message types
interface WSMessage {
  type: 'join_room' | 'leave_room' | 'send_message' | 'typing_start' | 'typing_stop';
  roomId?: string;
  nickname?: string;
  message?: string;
}

interface WSResponse {
  type: 'room_joined' | 'participant_update' | 'new_message' | 'typing_update' | 'room_destroyed' | 'error';
  data?: any;
  error?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server setup - no path restriction, handle upgrade manually
  const wss = new WebSocketServer({ 
    noServer: true 
  });

  // Handle WebSocket upgrade manually
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url;
    
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log('WebSocket server initialized with manual upgrade handling');

  // Store WebSocket connections by room
  const roomConnections = new Map<string, Map<string, WebSocket>>();
  const socketToRoom = new Map<WebSocket, string>();
  const socketToUser = new Map<WebSocket, Participant>();

  // API Routes
  
  // Create new chat room
  app.post("/api/rooms", async (req, res) => {
    try {
      const roomId = randomUUID().substring(0, 8).toUpperCase();
      const room = await storage.createRoom({ id: roomId });
      res.json({ roomId: room.id, created: true });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  // Get room info
  app.get("/api/rooms/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const participants = await storage.getRoomParticipants(roomId);
      const messages = await storage.getRoomMessages(roomId);

      res.json({
        room: {
          id: room.id,
          createdAt: room.createdAt,
          participantCount: participants.length
        },
        messages: messages.map((msg: Message) => ({
          id: msg.id,
          content: msg.content,
          senderNickname: msg.senderNickname,
          senderId: msg.senderId,
          timestamp: msg.timestamp
        }))
      });
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });

  // Destroy room
  app.delete("/api/rooms/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Notify all connected clients that room is being destroyed
      const connections = roomConnections.get(roomId);
      if (connections) {
        const destroyMessage: WSResponse = { type: 'room_destroyed' };
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(destroyMessage));
          }
        });
      }

      // Clean up storage
      await storage.deleteRoom(roomId);
      roomConnections.delete(roomId);

      res.json({ destroyed: true });
    } catch (error) {
      console.error("Error destroying room:", error);
      res.status(500).json({ error: "Failed to destroy room" });
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket, request) => {
    console.log('New WebSocket connection from:', request.url, request.headers.origin);

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_room':
            await handleJoinRoom(ws, message);
            break;
          case 'leave_room':
            await handleLeaveRoom(ws, message);
            break;
          case 'send_message':
            await handleSendMessage(ws, message);
            break;
          case 'typing_start':
            await handleTypingStart(ws, message);
            break;
          case 'typing_stop':
            await handleTypingStop(ws, message);
            break;
          case 'message_read':
            await handleMessageRead(ws, message);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        const errorResponse: WSResponse = { 
          type: 'error', 
          error: 'Invalid message format' 
        };
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(errorResponse));
        }
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // WebSocket message handlers
  async function handleJoinRoom(ws: WebSocket, message: WSMessage) {
    const { roomId, nickname } = message;
    
    if (!roomId) {
      const errorResponse: WSResponse = { type: 'error', error: 'Room ID required' };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorResponse));
      }
      return;
    }

    // Check if room exists
    const room = await storage.getRoom(roomId);
    if (!room) {
      const errorResponse: WSResponse = { type: 'error', error: 'Room not found' };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorResponse));
      }
      return;
    }

    // Create participant
    const participant: Participant = {
      id: randomUUID(),
      nickname: nickname || 'Anonymous',
      socketId: randomUUID(),
      joinedAt: new Date()
    };

    // Add to storage
    await storage.addParticipant(roomId, participant);

    // Track connections
    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Map());
    }
    roomConnections.get(roomId)!.set(participant.socketId, ws);
    socketToRoom.set(ws, roomId);
    socketToUser.set(ws, participant);

    // Send room joined confirmation
    const joinedResponse: WSResponse = {
      type: 'room_joined',
      data: {
        roomId,
        participant,
        messages: await storage.getRoomMessages(roomId)
      }
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(joinedResponse));
    }

    // Broadcast participant update to all room members
    await broadcastParticipantUpdate(roomId);
  }

  async function handleLeaveRoom(ws: WebSocket, message: WSMessage) {
    await handleDisconnect(ws);
  }

  async function handleSendMessage(ws: WebSocket, message: WSMessage) {
    const roomId = socketToRoom.get(ws);
    const user = socketToUser.get(ws);

    if (!roomId || !user || !message.message) {
      const errorResponse: WSResponse = { type: 'error', error: 'Invalid message' };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorResponse));
      }
      return;
    }

    try {
      // Validate message content
      const validatedMessage = insertMessageSchema.parse({
        roomId,
        senderId: user.id,
        senderNickname: user.nickname,
        content: message.message.trim()
      });

      // Store message
      const savedMessage = await storage.addMessage(validatedMessage);

      // Create client message with read receipt tracking
      const clientMessage: ClientMessage = {
        id: savedMessage.id,
        content: savedMessage.content,
        senderNickname: savedMessage.senderNickname || 'Anonymous',
        senderId: savedMessage.senderId || undefined,
        timestamp: savedMessage.timestamp,
        readBy: [],
        deliveredTo: []
      };

      // Broadcast to all room participants
      const connections = roomConnections.get(roomId);
      if (connections) {
        const messageResponse: WSResponse = {
          type: 'new_message',
          data: clientMessage
        };

        connections.forEach(clientWs => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify(messageResponse));
          }
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse: WSResponse = { type: 'error', error: 'Failed to send message' };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorResponse));
      }
    }
  }

  async function handleTypingStart(ws: WebSocket, message: WSMessage) {
    const roomId = socketToRoom.get(ws);
    const user = socketToUser.get(ws);

    if (!roomId || !user) return;

    // Broadcast typing indicator to other participants
    const connections = roomConnections.get(roomId);
    if (connections) {
      const typingResponse: WSResponse = {
        type: 'typing_update',
        data: {
          userId: user.id,
          nickname: user.nickname,
          isTyping: true
        }
      };

      connections.forEach(clientWs => {
        if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(typingResponse));
        }
      });
    }
  }

  async function handleTypingStop(ws: WebSocket, message: WSMessage) {
    const roomId = socketToRoom.get(ws);
    const user = socketToUser.get(ws);

    if (!roomId || !user) return;

    // Broadcast typing stop to other participants
    const connections = roomConnections.get(roomId);
    if (connections) {
      const typingResponse: WSResponse = {
        type: 'typing_update',
        data: {
          userId: user.id,
          nickname: user.nickname,
          isTyping: false
        }
      };

      connections.forEach(clientWs => {
        if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(typingResponse));
        }
      });
    }
  }

  async function handleDisconnect(ws: WebSocket) {
    const roomId = socketToRoom.get(ws);
    const user = socketToUser.get(ws);

    if (roomId && user) {
      // Remove from storage
      await storage.removeParticipant(roomId, user.socketId);

      // Remove from connection tracking
      const connections = roomConnections.get(roomId);
      if (connections) {
        connections.delete(user.socketId);
        if (connections.size === 0) {
          roomConnections.delete(roomId);
        }
      }

      // Broadcast participant update
      await broadcastParticipantUpdate(roomId);
    }

    socketToRoom.delete(ws);
    socketToUser.delete(ws);
  }

  async function handleMessageRead(ws: WebSocket, message: WSMessage) {
    const roomId = socketToRoom.get(ws);
    const user = socketToUser.get(ws);

    if (!roomId || !user || !message.messageId) {
      return;
    }

    // Broadcast read receipt to all room participants
    const connections = roomConnections.get(roomId);
    if (connections) {
      const readResponse: WSResponse = {
        type: 'message_read',
        data: {
          messageId: message.messageId,
          readerId: user.id,
          readerNickname: user.nickname
        }
      };

      connections.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(readResponse));
        }
      });
    }
  }

  async function broadcastParticipantUpdate(roomId: string) {
    const participants = await storage.getRoomParticipants(roomId);
    const connections = roomConnections.get(roomId);

    if (connections) {
      const updateResponse: WSResponse = {
        type: 'participant_update',
        data: {
          participants,
          count: participants.length
        }
      };

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(updateResponse));
        }
      });
    }
  }

  return httpServer;
}
