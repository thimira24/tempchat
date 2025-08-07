import { type ChatRoom, type Message, type InsertChatRoom, type InsertMessage, type Participant } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Room management
  createRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getRoom(id: string): Promise<ChatRoom | undefined>;
  updateRoomActivity(id: string): Promise<void>;
  deleteRoom(id: string): Promise<void>;
  getInactiveRooms(thresholdMinutes: number): Promise<ChatRoom[]>;

  // Message management
  addMessage(message: InsertMessage): Promise<Message>;
  getRoomMessages(roomId: string): Promise<Message[]>;
  deleteRoomMessages(roomId: string): Promise<void>;

  // Participant management
  addParticipant(roomId: string, participant: Participant): Promise<void>;
  removeParticipant(roomId: string, socketId: string): Promise<void>;
  getRoomParticipants(roomId: string): Promise<Participant[]>;
  updateParticipantCount(roomId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private rooms: Map<string, ChatRoom>;
  private messages: Map<string, Message[]>; // roomId -> Message[]
  private participants: Map<string, Participant[]>; // roomId -> Participant[]

  constructor() {
    this.rooms = new Map();
    this.messages = new Map();
    this.participants = new Map();

    // Start cleanup job for inactive rooms
    this.startCleanupJob();
  }

  async createRoom(insertRoom: InsertChatRoom): Promise<ChatRoom> {
    const room: ChatRoom = {
      ...insertRoom,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      participantCount: "0"
    };

    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    this.participants.set(room.id, []);

    return room;
  }

  async getRoom(id: string): Promise<ChatRoom | undefined> {
    return this.rooms.get(id);
  }

  async updateRoomActivity(id: string): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      room.lastActivityAt = new Date();
      this.rooms.set(id, room);
    }
  }

  async deleteRoom(id: string): Promise<void> {
    this.rooms.delete(id);
    this.messages.delete(id);
    this.participants.delete(id);
  }

  async getInactiveRooms(thresholdMinutes: number): Promise<ChatRoom[]> {
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return Array.from(this.rooms.values()).filter(room => 
      room.lastActivityAt < cutoff
    );
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: randomUUID(),
      timestamp: new Date(),
      senderId: insertMessage.senderId || null,
      senderNickname: insertMessage.senderNickname || null
    };

    const roomMessages = this.messages.get(insertMessage.roomId) || [];
    roomMessages.push(message);
    this.messages.set(insertMessage.roomId, roomMessages);

    // Update room activity
    await this.updateRoomActivity(insertMessage.roomId);

    return message;
  }

  async getRoomMessages(roomId: string): Promise<Message[]> {
    return this.messages.get(roomId) || [];
  }

  async deleteRoomMessages(roomId: string): Promise<void> {
    this.messages.delete(roomId);
  }

  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    const participants = this.participants.get(roomId) || [];
    // Remove existing participant with same socketId if any
    const filtered = participants.filter(p => p.socketId !== participant.socketId);
    filtered.push(participant);
    this.participants.set(roomId, filtered);

    await this.updateParticipantCount(roomId);
  }

  async removeParticipant(roomId: string, socketId: string): Promise<void> {
    const participants = this.participants.get(roomId) || [];
    const filtered = participants.filter(p => p.socketId !== socketId);
    this.participants.set(roomId, filtered);

    await this.updateParticipantCount(roomId);
  }

  async getRoomParticipants(roomId: string): Promise<Participant[]> {
    return this.participants.get(roomId) || [];
  }

  async updateParticipantCount(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      const participants = this.participants.get(roomId) || [];
      room.participantCount = participants.length.toString();
      this.rooms.set(roomId, room);
    }
  }

  private startCleanupJob(): void {
    // Clean up inactive rooms every 2 minutes
    setInterval(async () => {
      const inactiveRooms = await this.getInactiveRooms(10); // 10 minutes threshold
      for (const room of inactiveRooms) {
        console.log(`Cleaning up inactive room: ${room.id}`);
        await this.deleteRoom(room.id);
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }
}

// Export storage instance
export const storage = new MemStorage();