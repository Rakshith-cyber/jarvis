# JARVIS AI - Your Advanced Personal Assistant

## Project Overview
- **Name**: Jarvis AI
- **Goal**: A powerful web-based AI assistant that works 24/7 from anywhere without touching your PC or phone
- **Creator**: Built for Rakshith by AI Developer
- **Tech Stack**: Hono + TypeScript + Cloudflare Workers + D1 Database + OpenAI GPT-4

## 🚀 Features

### ✅ Currently Completed
1. **AI Chat Interface** - Talk to Jarvis using text or voice
2. **Voice Input/Output** - Browser-based speech recognition and synthesis
3. **Command History** - All interactions saved to database
4. **Automation System** - Schedule recurring tasks
5. **Notes & Reminders** - Create and manage notes with reminders
6. **Weather Integration** - Real-time weather information
7. **Web Search** - DuckDuckGo search integration
8. **Settings Management** - Configure OpenAI API key
9. **Responsive UI** - Beautiful glass-morphism design
10. **Database Storage** - Persistent data with Cloudflare D1

### 🎯 Main Capabilities
- **Natural Language Processing**: Powered by OpenAI GPT-4o-mini
- **Voice Control**: Full voice input and output support
- **Task Automation**: Create scheduled tasks and automations
- **Smart Reminders**: Set time-based reminders
- **Weather Reports**: Get weather for any city
- **Web Search**: Search the internet directly from chat
- **24/7 Availability**: Access from anywhere, anytime

## 📋 API Endpoints

### Chat & Commands
- `POST /api/command` - Send command to Jarvis
  - Body: `{ "command": "your command" }`
  - Returns: `{ "response": "AI response", "status": "success" }`

- `GET /api/history` - Get command history
  - Returns: `{ "history": [...] }`

- `DELETE /api/history` - Clear command history

### Automations
- `POST /api/automations` - Create automation
  - Body: `{ "name": "Task Name", "task_type": "daily_reminder", "schedule": "09:00", "config": {...} }`

- `GET /api/automations` - List all automations

- `PATCH /api/automations/:id` - Toggle automation
  - Body: `{ "enabled": true/false }`

- `DELETE /api/automations/:id` - Delete automation

### Notes & Reminders
- `POST /api/notes` - Create note
  - Body: `{ "title": "Note", "content": "...", "reminder_time": "2024-01-01T10:00" }`

- `GET /api/notes` - Get active notes

- `PATCH /api/notes/:id` - Mark note as complete

- `DELETE /api/notes/:id` - Delete note

### Utilities
- `GET /api/weather/:city` - Get weather for city
- `GET /api/search?q=query` - Web search
- `GET /api/settings/:key` - Get setting
- `POST /api/settings` - Save setting

## 🗄️ Data Architecture

### Database Models

**Commands Table**
```sql
- id: INTEGER PRIMARY KEY
- command: TEXT (user command)
- response: TEXT (AI response)
- status: TEXT (success/error)
- created_at: DATETIME
```

**Automations Table**
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT (task name)
- task_type: TEXT (type of automation)
- schedule: TEXT (when to run)
- config: TEXT (JSON configuration)
- enabled: INTEGER (0/1)
- last_run: DATETIME
- created_at: DATETIME
```

**Notes Table**
```sql
- id: INTEGER PRIMARY KEY
- title: TEXT
- content: TEXT
- reminder_time: DATETIME
- completed: INTEGER (0/1)
- created_at: DATETIME
```

**Settings Table**
```sql
- key: TEXT PRIMARY KEY
- value: TEXT
- updated_at: DATETIME
```

### Storage Services
- **Cloudflare D1**: SQLite database for all persistent data
- **Edge Workers**: Running on Cloudflare's global network
- **KV Storage**: (Future) For caching and sessions

## 🎮 User Guide

### Getting Started
1. **Open Jarvis**: Visit the web app URL
2. **Configure OpenAI**: Go to Settings tab and add your OpenAI API key
3. **Start Chatting**: Type or use voice input to talk to Jarvis

### Voice Commands
- Click "Voice Input" button and speak
- Jarvis will transcribe and respond
- Toggle "Voice Output" to hear responses

### Example Commands
- "What's the weather in London?"
- "Search for latest AI news"
- "Remind me to call mom"
- "Create an automation for daily weather"
- "Tell me a joke"
- "What can you help me with?"

### Creating Automations
1. Go to Automations tab
2. Enter task name
3. Select automation type
4. Set schedule (e.g., "09:00" for 9 AM)
5. Add configuration if needed
6. Click Create

### Managing Notes
1. Go to Notes tab
2. Enter title and content
3. Optionally set reminder time
4. Click Create Note
5. Mark complete or delete as needed

## 🔧 Development

### Local Setup
```bash
# Install dependencies
npm install

# Apply database migrations
npm run db:migrate:local

# Build the project
npm run build

# Start development server
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Check logs
pm2 logs jarvis-ai --nostream

# Test
curl http://localhost:3000
```

### Database Commands
```bash
# Apply migrations locally
npm run db:migrate:local

# Apply migrations to production
npm run db:migrate:prod

# Execute SQL locally
wrangler d1 execute jarvis-production --local --command="SELECT * FROM commands LIMIT 10"

# Execute SQL in production
wrangler d1 execute jarvis-production --command="SELECT COUNT(*) FROM commands"
```

## 🚀 Deployment

### Requirements
1. Cloudflare account
2. OpenAI API key
3. GitHub account (for version control)

### Deploy to Cloudflare Pages
```bash
# Create D1 database
wrangler d1 create jarvis-production

# Update wrangler.jsonc with database_id

# Apply migrations to production
npm run db:migrate:prod

# Build and deploy
npm run deploy:prod
```

### Production URLs
- Production: `https://jarvis-ai.pages.dev`
- API: `https://jarvis-ai.pages.dev/api/*`

## 🔒 Security

### API Keys
- Store OpenAI API key in Settings (encrypted in database)
- Never commit API keys to git
- Use environment variables for sensitive data

### Database
- All data stored securely in Cloudflare D1
- Automatic backups by Cloudflare
- Edge-optimized queries

## 📊 Current Status
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Last Updated**: 2026-02-07
- **Version**: 1.0.0

## 🎯 Future Enhancements
1. **Email Integration** - Send emails via API
2. **Calendar Sync** - Google Calendar integration
3. **SMS Notifications** - Twilio integration
4. **File Management** - Upload and manage files
5. **Multi-user Support** - Team collaboration
6. **Mobile App** - Native iOS/Android apps
7. **Telegram Bot** - Telegram integration
8. **Voice Calls** - Make phone calls through Jarvis
9. **Home Automation** - Smart home device control
10. **Custom Plugins** - Extensible plugin system

## 🐛 Known Issues
- Voice recognition requires Chrome/Edge browser
- OpenAI API key required for AI features
- Automation scheduling needs manual triggering (no cron yet)

## 📝 License
Created for personal use by Rakshith

## 🤝 Support
For issues or questions, create an issue on GitHub

---

**Jarvis is ready to assist you 24/7 from anywhere in the world! 🚀**
