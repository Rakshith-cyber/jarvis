# J.A.R.V.I.S - Advanced AI Assistant

**Just A Rather Very Intelligent System**

A modern, web-based AI assistant that you can access from anywhere without touching your PC or phone. Built with Hono framework and deployed on Cloudflare Pages.

## 🚀 Current Features

### ✅ Completed Features
1. **Voice Input** - Use Web Speech API for hands-free commands
2. **Text-to-Speech** - Jarvis speaks responses back to you
3. **AI Conversations** - Powered by OpenAI GPT-4o-mini for intelligent responses
4. **Time & Date** - Get current time and date information
5. **Weather Information** - Real-time weather data for any city
6. **Web Search** - Search the web and get instant answers
7. **Calculator** - Perform mathematical calculations
8. **Command History** - Track and replay previous commands
9. **Quick Actions** - One-click shortcuts for common tasks
10. **Modern UI** - Beautiful, responsive interface with animations

### 📍 Functional Entry URIs

#### API Endpoints
- `POST /api/chat` - AI conversation endpoint
  - Body: `{ "message": "your message" }`
  - Returns: `{ "reply": "AI response" }`

- `GET /api/time` - Get current time and date
  - Returns: `{ "time": "...", "date": "...", "timestamp": "..." }`

- `GET /api/weather/:city` - Get weather for a city
  - Returns: `{ "location": "...", "temperature": "...", "condition": "...", ... }`

- `POST /api/search` - Web search
  - Body: `{ "query": "search query" }`
  - Returns: `{ "abstract": "...", "url": "...", "relatedTopics": [...] }`

- `POST /api/calculate` - Calculator
  - Body: `{ "expression": "15 * 234" }`
  - Returns: `{ "result": 3510 }`

- `POST /api/history` - Save command history
  - Body: `{ "command": "...", "response": "..." }`

- `GET /api/history` - Get command history
  - Returns: `{ "history": [...] }`

#### Web Interface
- `GET /` - Main Jarvis interface

## 🔮 Features Not Yet Implemented

1. **Telegram Integration** - Send messages via Telegram bot
2. **Email Automation** - Send and read emails
3. **Calendar Management** - Create and manage calendar events
4. **File Management** - Upload, download, and organize files
5. **WhatsApp Integration** - Send WhatsApp messages
6. **Task Automation** - Create custom automation rules
7. **Smart Home Control** - Control IoT devices
8. **Video Calls** - Initiate video meetings
9. **Music Control** - Play music from various services
10. **News Briefing** - Daily news summaries
11. **Reminder System** - Set and manage reminders
12. **Multi-language Support** - Support for multiple languages

## 🎯 Recommended Next Steps

1. **Add API Key** - Configure your OpenAI API key in Cloudflare Pages secrets
2. **Deploy to Production** - Deploy to Cloudflare Pages for global access
3. **Telegram Integration** - Add Telegram bot functionality
4. **Email Service** - Integrate with email API (SendGrid/Mailgun)
5. **Calendar API** - Connect to Google Calendar or similar
6. **Authentication** - Add user authentication for multi-user support
7. **Mobile App** - Create mobile companion app
8. **Voice Activation** - Add wake word detection ("Hey Jarvis")

## 📊 Data Architecture

### Data Models
- **command_history** - Stores all user commands and responses
  - `id` (INTEGER PRIMARY KEY)
  - `command` (TEXT)
  - `response` (TEXT)
  - `timestamp` (DATETIME)

- **automation_rules** - Stores custom automation rules (future feature)
  - `id` (INTEGER PRIMARY KEY)
  - `name` (TEXT)
  - `trigger` (TEXT)
  - `action` (TEXT)
  - `enabled` (INTEGER)
  - `created_at` (DATETIME)

- **user_preferences** - Stores user preferences
  - `key` (TEXT PRIMARY KEY)
  - `value` (TEXT)
  - `updated_at` (DATETIME)

### Storage Services
- **Cloudflare D1** - SQLite database for command history and user data
- **Cloudflare Pages** - Static hosting and edge functions

### Data Flow
1. User sends command (voice or text)
2. Frontend processes command and routes to appropriate API
3. Backend API endpoints handle specific tasks or forward to OpenAI
4. Response is returned and stored in command history
5. Frontend displays response and optionally speaks it

## 📖 User Guide

### Getting Started
1. Open the Jarvis web interface
2. Click the "Voice" button or type your command
3. Jarvis will process your command and respond

### Voice Commands
- **"What time is it?"** - Get current time and date
- **"What is the weather in [city]?"** - Get weather information
- **"Search for [topic]"** - Search the web
- **"Calculate [expression]"** - Perform calculations
- **"Exit"** - Say goodbye

### Using Quick Actions
- Click any quick action button for instant commands
- Time & Date, Web Search, Weather, Calculator

### Settings
- **Auto-speak responses** - Toggle checkbox to enable/disable voice responses
- **Command History** - Click any previous command to run it again

## 🛠️ Development

### Local Setup
```bash
# Install dependencies
npm install

# Apply database migrations
npm run db:migrate:local

# Build the project
npm run build

# Start development server
pm2 start ecosystem.config.cjs

# Test the service
curl http://localhost:3000
```

### Environment Variables
Create `.dev.vars` file:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 🚀 Deployment

### Status
- **Platform**: Cloudflare Pages
- **Status**: ⏳ Ready for deployment
- **Tech Stack**: Hono + TypeScript + Cloudflare D1 + OpenAI API
- **Last Updated**: 2026-02-07

### Production URLs
- **Production**: (To be deployed)
- **GitHub**: https://github.com/Rakshith-cyber/jarvis

### Deploy Steps
1. Create D1 database: `npx wrangler d1 create jarvis-production`
2. Update `wrangler.jsonc` with database ID
3. Apply migrations: `npm run db:migrate:prod`
4. Deploy: `npm run deploy`
5. Set secret: `npx wrangler pages secret put OPENAI_API_KEY`

## 🎨 Features Overview

### AI Capabilities
- Natural language understanding
- Context-aware responses
- Multi-turn conversations
- Intelligent task routing

### Voice Features
- Speech recognition (Web Speech API)
- Text-to-speech synthesis
- Hands-free operation
- Voice command confirmation

### Automation
- Command history tracking
- Quick action shortcuts
- Intelligent command routing
- Future: Custom automation rules

## 📝 Notes

- Original Python version backed up in `original_python_version/`
- Requires OpenAI API key for AI features
- Voice features require Chrome, Edge, or Safari browser
- Designed for global edge deployment on Cloudflare

---

Built with ❤️ by Rakshith using Hono, TypeScript, and Cloudflare Pages
