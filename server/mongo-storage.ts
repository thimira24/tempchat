
import mongoose from 'mongoose';
import { type ChatRoom, type Message, type InsertChatRoom, type InsertMessage, type Participant } from "@shared/schema";
import { type IStorage } from './storage';

// MongoDB Schemas
const chatRoomSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  participantCount: { type: Number, default: 0 }
});

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderNickname: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const participantSchema = new mongoose.Schema({
  id: { type: String, required: true },
  roomId: { type: String, required: true },
  nickname: { type: String, required: true },
  socketId: { type: String, required: true, unique: true },
  joinedAt: { type: Date, default: Date.now }
});

// MongoDB Models
const ChatRoomModel = mongoose.model('ChatRoom', chatRoomSchema);
const MessageModel = mongoose.model('Message', messageSchema);
const ParticipantModel = mongoose.model('Participant', participantSchema);

export class MongoStorage implements IStorage {
  private static instance: MongoStorage;
  private isConnected = false;

  private constructor() {
    this.connect();
    this.startCleanupJob();
  }

  static getInstance(): MongoStorage {
    if (!MongoStorage.instance) {
      MongoStorage.instance = new MongoStorage();
    }
    return MongoStorage.instance;
  }

  private async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private startCleanupJob(): void {
    // Clean up inactive rooms every 5 minutes
    setInterval(async () => {
      try {
        const inactiveRooms = await this.getInactiveRooms(10);
        for (const room of inactiveRooms) {
          await this.deleteRoom(room.id);
          console.log(`Cleaned up inactive room: ${room.id}`);
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }, 5 * 60 * 1000);
  }

  // Room management
  async createRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const newRoom = new ChatRoomModel({
      id: room.id,
      createdAt: new Date(),
      lastActivity: new Date(),
      participantCount: 0
    });
    
    const savedRoom = await newRoom.save();
    return {
      id: savedRoom.id,
      createdAt: savedRoom.createdAt,
      lastActivityAt: savedRoom.lastActivity,
      participantCount: savedRoom.participantCount.toString()
    };
  }

  async getRoom(id: string): Promise<ChatRoom | undefined> {
    const room = await ChatRoomModel.findOne({ id });
    if (!room) return undefined;
    
    return {
      id: room.id,
      createdAt: room.createdAt,
      lastActivityAt: room.lastActivity,
      participantCount: room.participantCount.toString()
    };
  }

  async updateRoomActivity(id: string): Promise<void> {
    await ChatRoomModel.updateOne(
      { id },
      { lastActivity: new Date() }
    );
  }

  async deleteRoom(id: string): Promise<void> {
    await Promise.all([
      ChatRoomModel.deleteOne({ id }),
      MessageModel.deleteMany({ roomId: id }),
      ParticipantModel.deleteMany({ roomId: id })
    ]);
  }

  async getInactiveRooms(thresholdMinutes: number): Promise<ChatRoom[]> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    const rooms = await ChatRoomModel.find({
      lastActivity: { $lt: threshold }
    });
    
    return rooms.map(room => ({
      id: room.id,
      createdAt: room.createdAt,
      lastActivityAt: room.lastActivity,
      participantCount: room.participantCount.toString()
    }));
  }

  // Message management
  async addMessage(message: InsertMessage): Promise<Message> {
    const newMessage = new MessageModel({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId: message.roomId,
      senderId: message.senderId,
      senderNickname: message.senderNickname,
      content: message.content,
      timestamp: new Date()
    });
    
    const savedMessage = await newMessage.save();
    await this.updateRoomActivity(message.roomId);
    
    return {
      id: savedMessage.id,
      roomId: savedMessage.roomId,
      senderId: savedMessage.senderId,
      senderNickname: savedMessage.senderNickname,
      content: savedMessage.content,
      timestamp: savedMessage.timestamp
    };
  }

  async getRoomMessages(roomId: string): Promise<Message[]> {
    const messages = await MessageModel.find({ roomId }).sort({ timestamp: 1 });
    return messages.map(msg => ({
      id: msg.id,
      roomId: msg.roomId,
      senderId: msg.senderId,
      senderNickname: msg.senderNickname,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  async deleteRoomMessages(roomId: string): Promise<void> {
    await MessageModel.deleteMany({ roomId });
  }

  // Participant management
  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    const newParticipant = new ParticipantModel({
      id: participant.id,
      roomId,
      nickname: participant.nickname,
      socketId: participant.socketId,
      joinedAt: participant.joinedAt
    });
    
    await newParticipant.save();
    await this.updateParticipantCount(roomId);
    await this.updateRoomActivity(roomId);
  }

  async removeParticipant(roomId: string, socketId: string): Promise<void> {
    await ParticipantModel.deleteOne({ roomId, socketId });
    await this.updateParticipantCount(roomId);
    await this.updateRoomActivity(roomId);
  }

  async getRoomParticipants(roomId: string): Promise<Participant[]> {
    const participants = await ParticipantModel.find({ roomId });
    return participants.map(p => ({
      id: p.id,
      nickname: p.nickname,
      socketId: p.socketId,
      joinedAt: p.joinedAt
    }));
  }

  async updateParticipantCount(roomId: string): Promise<void> {
    const count = await ParticipantModel.countDocuments({ roomId });
    await ChatRoomModel.updateOne(
      { id: roomId },
      { participantCount: count }
    );
  }
}
