# QuickChat - Disposable Real-time Chat Application

## Overview

QuickChat is a lightweight, disposable chat application designed for temporary real-time messaging. The application prioritizes privacy and simplicity by requiring no user authentication and automatically clearing chat rooms after 10 minutes of inactivity. Built with a mobile-first approach, it provides instant chat room creation with shareable links for seamless collaboration.

The application is designed to be completely ephemeral - no persistent storage, no user tracking, and no data retention beyond the active session. Users can create temporary chat rooms instantly and share them via URL for others to join.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing with support for parameterized routes (`/chat/:roomId`)
- **State Management**: TanStack Query for server state management and caching, with local React state for UI interactions
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, mobile-first design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express framework for HTTP API endpoints
- **Real-time Communication**: WebSocket server for instant messaging using the native `ws` library
- **Storage**: In-memory storage implementation (`MemStorage`) for temporary data persistence
- **Session Management**: Memory-based participant tracking with automatic cleanup

### Data Storage Solutions
- **Primary Storage**: In-memory data structures (Maps) for rooms, messages, and participants
- **Database Schema**: Drizzle ORM with PostgreSQL schema definitions for potential future persistence
- **Cleanup Strategy**: Automatic deletion of inactive rooms after 10 minutes via scheduled cleanup jobs

### Real-time Communication Architecture
- **WebSocket Server**: Mounted on `/ws` path to avoid conflicts with Vite HMR
- **Message Types**: Structured messaging system for room operations (join/leave), message sending, and typing indicators
- **Connection Management**: Room-based connection pooling with automatic cleanup on disconnect
- **Error Handling**: Graceful degradation with connection retry logic

### Mobile-First Design Decisions
- **Responsive Layout**: Tailwind CSS breakpoints optimized for mobile devices first
- **Touch Interfaces**: Large tap targets and gesture-friendly interactions
- **Performance**: Lightweight bundle size and efficient re-renders for mobile networks
- **Accessibility**: Screen reader support and keyboard navigation

### Security and Privacy Architecture
- **No Persistent Storage**: All data exists only in server memory
- **No Authentication**: Zero-knowledge system requiring no user credentials
- **Automatic Cleanup**: Proactive data deletion prevents long-term storage
- **Session Isolation**: Room-based isolation prevents cross-chat data leakage

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing library for single-page application navigation
- **express**: Node.js web framework for API endpoints and static file serving

### UI and Styling Dependencies
- **@radix-ui/react-***: Headless UI components for accessibility and consistent behavior
- **tailwindcss**: Utility-first CSS framework for responsive design
- **class-variance-authority**: Type-safe component variant management
- **lucide-react**: Icon library optimized for React applications

### Real-time Communication Dependencies
- **ws**: WebSocket library for real-time messaging
- **socket.io**: Alternative real-time engine (available for future use)

### Database and Validation Dependencies
- **drizzle-orm**: Type-safe ORM for database schema management
- **drizzle-zod**: Schema validation integration
- **@neondatabase/serverless**: PostgreSQL driver for potential cloud deployment
- **zod**: Runtime type validation for API endpoints and data structures

### Development and Build Dependencies
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production builds

### Deployment Dependencies
- **@replit/vite-plugin-runtime-error-modal**: Replit-specific development tooling
- **@replit/vite-plugin-cartographer**: Development environment integration for Replit deployment