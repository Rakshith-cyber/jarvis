import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ============= TOOLS =============
async function getWeather(city: string) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
    if (res.ok) {
      const text = await res.text();
      return `Current weather: ${text.trim()}`;
    }
    return "I couldn't reach the weather service right now.";
  } catch (e) {
    return "Weather service is currently unavailable.";
  }
}

// ============= AI BRAIN =============
async function aiBrain(command: string, db: D1Database): Promise<string> {
  const geminiKey = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('gemini_key').first())?.value as string;
  const openaiKey = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('openai_key').first())?.value as string;

  const lowerCmd = command.toLowerCase();
  
  // Tool: Weather
  if (lowerCmd.includes('weather in')) {
    const city = lowerCmd.split('weather in')[1].trim().replace(/[?!.]/g, '');
    return await getWeather(city);
  }

  // Tool: Search
  if (lowerCmd.includes('search for')) {
    const query = lowerCmd.split('search for')[1].trim();
    return `I've initiated a search for "${query}". You can find more details at: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  }

  const systemPrompt = "You are Jarvis, a highly advanced AI assistant. Be concise, helpful, and slightly formal but friendly.";

  if (geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${command}` }] }]
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) { console.error("Gemini Error:", e); }
  }

  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: command }]
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        return data.choices[0].message.content;
      }
    } catch (e) { console.error("OpenAI Error:", e); }
  }

  return "I'm having trouble connecting to my brain. Please check your API keys in Settings.";
}

// ============= API ROUTES =============

app.get('/api/settings/:key', async (c) => {
  const key = c.req.param('key')
  const result = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first()
  return c.json({ key, value: result ? result.value : null })
})

app.post('/api/settings', async (c) => {
  const { key, value } = await c.req.json()
  await c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').bind(key, value).run()
  return c.json({ success: true })
})

app.post('/api/command', async (c) => {
  const { command } = await c.req.json()
  const response = await aiBrain(command, c.env.DB)
  await c.env.DB.prepare('INSERT INTO command_history (command, response) VALUES (?, ?)').bind(command, response).run()
  return c.json({ response, status: 'success' })
})

app.get('/api/history', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM command_history ORDER BY timestamp DESC LIMIT 50').all()
  return c.json({ history: results || [] })
})

app.delete('/api/history', async (c) => {
  await c.env.DB.prepare('DELETE FROM command_history').run()
  return c.json({ success: true })
})

app.get('/api/automations', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM automations ORDER BY created_at DESC').all()
  return c.json({ automations: results || [] })
})

app.post('/api/automations', async (c) => {
  const { name, task_type, schedule } = await c.req.json()
  await c.env.DB.prepare('INSERT INTO automations (name, task_type, schedule, enabled) VALUES (?, ?, ?, 1)').bind(name, task_type, schedule).run()
  return c.json({ success: true })
})

app.delete('/api/automations/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM automations WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

app.get('/api/notes', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM notes WHERE completed = 0 ORDER BY created_at DESC').all()
  return c.json({ notes: results || [] })
})

app.post('/api/notes', async (c) => {
  const { title, content } = await c.req.json()
  await c.env.DB.prepare('INSERT INTO notes (title, content, completed) VALUES (?, ?, 0)').bind(title, content).run()
  return c.json({ success: true })
})

app.delete('/api/notes/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jarvis AI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
            .logo-container { width: 100px; height: 100px; position: relative; margin: 0 auto; }
            .logo-base { position: absolute; inset: 0; border-radius: 50%; display: flex; items-center: center; justify-content: center; transition: all 0.5s ease; }
            .logo-user { background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%); opacity: 0; transform: scale(0.8); }
            .logo-user.active { opacity: 1; transform: scale(1); animation: pulse-user 1.5s infinite; }
            .logo-ai { background: radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%); opacity: 1; transform: scale(1); }
            .logo-ai.active { animation: pulse-ai 2s infinite; }
            @keyframes pulse-user { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
            @keyframes pulse-ai { 0% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.05); filter: brightness(1.2); } 100% { transform: scale(1); filter: brightness(1); } }
            #chat-container { height: 450px; overflow-y: auto; scroll-behavior: smooth; }
            .tab-btn.active { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.5); }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        </style>
    </head>
    <body class="bg-[#0a0a0c] text-gray-200 min-h-screen font-sans">
        <div class="container mx-auto px-4 py-6 max-w-5xl">
            <header class="text-center mb-8">
                <div class="logo-container mb-4">
                    <div id="logo-user" class="logo-base logo-user"><i class="fas fa-microphone text-3xl"></i></div>
                    <div id="logo-ai" class="logo-base logo-ai active"><i class="fas fa-brain text-3xl"></i></div>
                </div>
                <h1 class="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">JARVIS</h1>
                <p id="status-text" class="text-blue-400/60 text-xs uppercase tracking-widest mt-1">System Standby</p>
            </header>

            <nav class="flex justify-center mb-8 space-x-2">
                <button onclick="showTab('chat')" id="btn-chat" class="tab-btn px-5 py-2 rounded-full glass text-sm font-medium transition-all active">Chat</button>
                <button onclick="showTab('automations')" id="btn-automations" class="tab-btn px-5 py-2 rounded-full glass text-sm font-medium transition-all">Automations</button>
                <button onclick="showTab('notes')" id="btn-notes" class="tab-btn px-5 py-2 rounded-full glass text-sm font-medium transition-all">Notes</button>
                <button onclick="showTab('settings')" id="btn-settings" class="tab-btn px-5 py-2 rounded-full glass text-sm font-medium transition-all">Settings</button>
            </nav>

            <main>
                <!-- Chat Tab -->
                <div id="content-chat" class="tab-content">
                    <div class="glass rounded-2xl p-4 shadow-2xl">
                        <div class="flex justify-between items-center mb-4 px-2">
                            <h3 class="text-sm font-bold text-gray-500 uppercase tracking-widest">Conversation</h3>
                            <button onclick="clearHistory()" class="text-xs text-red-400/60 hover:text-red-400 transition-colors">Clear History</button>
                        </div>
                        <div id="chat-container" class="space-y-4 mb-4 pr-2"></div>
                        <div class="relative">
                            <input type="text" id="command-input" placeholder="Ask Jarvis anything..." class="w-full pl-5 pr-14 py-4 bg-white/5 rounded-xl border border-white/10 outline-none focus:border-blue-500/50 transition-all">
                            <button onclick="sendCommand()" class="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Automations Tab -->
                <div id="content-automations" class="tab-content hidden">
                    <div class="grid md:grid-cols-3 gap-6">
                        <div class="md:col-span-1 glass rounded-2xl p-6 h-fit">
                            <h3 class="text-lg font-bold mb-4">New Automation</h3>
                            <div class="space-y-4">
                                <input type="text" id="auto-name" placeholder="Task Name" class="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 outline-none">
                                <select id="auto-type" class="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 outline-none">
                                    <option value="daily_reminder">Daily Reminder</option>
                                    <option value="weather_check">Weather Check</option>
                                    <option value="news_digest">News Digest</option>
                                </select>
                                <input type="time" id="auto-time" class="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 outline-none">
                                <button onclick="createAutomation()" class="w-full py-3 bg-blue-600 rounded-lg font-bold">Create</button>
                            </div>
                        </div>
                        <div class="md:col-span-2 glass rounded-2xl p-6">
                            <h3 class="text-lg font-bold mb-4">Active Tasks</h3>
                            <div id="automations-list" class="space-y-3"></div>
                        </div>
                    </div>
                </div>

                <!-- Notes Tab -->
                <div id="content-notes" class="tab-content hidden">
                    <div class="grid md:grid-cols-3 gap-6">
                        <div class="md:col-span-1 glass rounded-2xl p-6 h-fit">
                            <h3 class="text-lg font-bold mb-4">Quick Note</h3>
                            <div class="space-y-4">
                                <input type="text" id="note-title" placeholder="Title" class="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 outline-none">
                                <textarea id="note-content" placeholder="Content..." class="w-full px-4 py-2 bg-white/5 rounded-lg border border-white/10 outline-none h-32"></textarea>
                                <button onclick="createNote()" class="w-full py-3 bg-purple-600 rounded-lg font-bold">Save Note</button>
                            </div>
                        </div>
                        <div class="md:col-span-2 glass rounded-2xl p-6">
                            <h3 class="text-lg font-bold mb-4">Your Notes</h3>
                            <div id="notes-list" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
                        </div>
                    </div>
                </div>

                <!-- Settings Tab -->
                <div id="content-settings" class="tab-content hidden">
                    <div class="max-w-xl mx-auto glass rounded-2xl p-8 space-y-6">
                        <h3 class="text-xl font-bold border-b border-white/10 pb-4">System Configuration</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2">Gemini API Key</label>
                                <input type="password" id="gemini-key" class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:border-blue-500/50">
                            </div>
                            <div>
                                <label class="block text-xs uppercase tracking-widest text-gray-500 mb-2">OpenAI API Key</label>
                                <input type="password" id="openai-key" class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/10 outline-none focus:border-blue-500/50">
                            </div>
                            <button onclick="saveAllSettings()" class="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20">Update Core Keys</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app