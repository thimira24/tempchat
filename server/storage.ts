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

  async validateRoomPassword(roomId: string, password: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    return room ? room.password === password : false;
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
    console.log('Starting room cleanup job - checking every 5 minutes for rooms inactive > 10 minutes');
    setInterval(async () => {
      try {
        const inactiveRooms = await this.getInactiveRooms(10); // 10 minutes threshold
        
        if (inactiveRooms.length > 0) {
          console.log(`Cleaning up ${inactiveRooms.length} inactive room(s):`);
          
          for (const room of inactiveRooms) {
            console.log(`- Deleting room: ${room.id} "${room.name}" (last active: ${room.lastActivityAt})`);
            await this.deleteRoom(room.id);
          }
          console.log(`Successfully cleaned up ${inactiveRooms.length} expired rooms`);
        }
      } catch (error) {
        console.error('Error during room cleanup:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

// For now, use in-memory storage until MongoDB is properly configured
// User can switch to MongoDB by uncommenting the import below and setting MONGODB_URI
console.log('Storage mode:', process.env.MONGODB_URI ? 'MongoDB' : 'In-Memory');
export const storage = new MemStorage();

// To use MongoDB, uncomment this line and comment the line above:
// import { MongoStorage } from './mongo-storage';
// export const storage = MongoStorage.getInstance();