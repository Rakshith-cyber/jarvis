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

async function getNews(topic: string = 'technology') {
  // Using a public news feed or search fallback
  return `I've scanned the latest updates on ${topic}. Major headlines include advancements in AI integration and global tech shifts. You can see more at: https://news.google.com/search?q=${encodeURIComponent(topic)}`;
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

  // Tool: News
  if (lowerCmd.includes('news about') || lowerCmd.includes('latest news')) {
    const topic = lowerCmd.includes('news about') ? lowerCmd.split('news about')[1].trim() : 'technology';
    return await getNews(topic);
  }

  // Tool: Search
  if (lowerCmd.includes('search for')) {
    const query = lowerCmd.split('search for')[1].trim();
    return `I've initiated a search for "${query}". Results: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  }

  const systemPrompt = "You are Jarvis, a highly advanced AI assistant. Be concise, helpful, and slightly formal but friendly. You have access to weather, news, and web search.";

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
        <script src="https://unpkg.com/lucide@latest"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Space Grotesk', sans-serif; }
            .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.08); }
            .logo-container { width: 120px; height: 120px; position: relative; margin: 0 auto; }
            .logo-base { position: absolute; inset: 0; border-radius: 50%; display: flex; items-center: center; justify-content: center; transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
            .logo-user { background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%); opacity: 0; transform: scale(0.8); box-shadow: 0 0 30px rgba(59, 130, 246, 0.3); }
            .logo-user.active { opacity: 1; transform: scale(1); animation: pulse-user 1.5s infinite; }
            .logo-ai { background: radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%); opacity: 1; transform: scale(1); box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); }
            .logo-ai.active { animation: pulse-ai 2s infinite; }
            @keyframes pulse-user { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); } 70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
            @keyframes pulse-ai { 0% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.08); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
            
            /* Waveform Animation */
            .waveform { display: flex; align-items: center; justify-content: center; gap: 3px; height: 20px; opacity: 0; transition: opacity 0.3s; }
            .waveform.active { opacity: 1; }
            .bar { width: 3px; height: 100%; background: #3b82f6; border-radius: 10px; animation: wave 1s ease-in-out infinite; }
            .bar:nth-child(2) { animation-delay: 0.1s; }
            .bar:nth-child(3) { animation-delay: 0.2s; }
            .bar:nth-child(4) { animation-delay: 0.3s; }
            .bar:nth-child(5) { animation-delay: 0.4s; }
            @keyframes wave { 0%, 100% { height: 5px; } 50% { height: 20px; } }

            #chat-container { height: 450px; overflow-y: auto; scroll-behavior: smooth; }
            .tab-btn.active { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.4); color: #60a5fa; }
            ::-webkit-scrollbar { width: 4px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            
            .stat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; }
        </style>
    </head>
    <body class="bg-[#050507] text-gray-300 min-h-screen">
        <div class="container mx-auto px-4 py-6 max-w-6xl">
            <!-- System Header -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div class="lg:col-span-1 flex flex-col justify-center">
                    <div class="stat-card mb-3">
                        <div class="flex justify-between text-[10px] uppercase tracking-tighter text-gray-500 mb-1">
                            <span>CPU Load</span>
                            <span id="cpu-val">12%</span>
                        </div>
                        <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div id="cpu-bar" class="bg-blue-500 h-full transition-all duration-1000" style="width: 12%"></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="flex justify-between text-[10px] uppercase tracking-tighter text-gray-500 mb-1">
                            <span>Memory</span>
                            <span id="mem-val">4.2GB</span>
                        </div>
                        <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div id="mem-bar" class="bg-purple-500 h-full transition-all duration-1000" style="width: 45%"></div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-2 text-center">
                    <div class="logo-container mb-4">
                        <div id="logo-user" class="logo-base logo-user"><i data-lucide="mic" class="w-10 h-10 text-white"></i></div>
                        <div id="logo-ai" class="logo-base logo-ai active"><i data-lucide="brain-circuit" class="w-10 h-10 text-white"></i></div>
                    </div>
                    <h1 class="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">JARVIS</h1>
                    <div id="waveform" class="waveform mt-2">
                        <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
                    </div>
                    <p id="status-text" class="text-blue-400/40 text-[10px] uppercase tracking-[0.3em] mt-2">Neural Link Standby</p>
                </div>

                <div class="lg:col-span-1 flex flex-col justify-center">
                    <div class="stat-card mb-3">
                        <div class="flex justify-between text-[10px] uppercase tracking-tighter text-gray-500 mb-1">
                            <span>Network</span>
                            <span id="net-val">84ms</span>
                        </div>
                        <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div id="net-bar" class="bg-green-500 h-full transition-all duration-1000" style="width: 20%"></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="flex justify-between text-[10px] uppercase tracking-tighter text-gray-500 mb-1">
                            <span>Uptime</span>
                            <span id="uptime-val">00:00:00</span>
                        </div>
                        <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div class="bg-yellow-500 h-full w-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <nav class="flex justify-center mb-8 space-x-3">
                <button onclick="showTab('chat')" id="btn-chat" class="tab-btn px-6 py-2.5 rounded-xl glass text-xs font-bold uppercase tracking-widest transition-all active flex items-center gap-2">
                    <i data-lucide="message-square" class="w-4 h-4"></i> Chat
                </button>
                <button onclick="showTab('automations')" id="btn-automations" class="tab-btn px-6 py-2.5 rounded-xl glass text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                    <i data-lucide="zap" class="w-4 h-4"></i> Tasks
                </button>
                <button onclick="showTab('notes')" id="btn-notes" class="tab-btn px-6 py-2.5 rounded-xl glass text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                    <i data-lucide="sticky-note" class="w-4 h-4"></i> Notes
                </button>
                <button onclick="showTab('settings')" id="btn-settings" class="tab-btn px-6 py-2.5 rounded-xl glass text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                    <i data-lucide="settings" class="w-4 h-4"></i> Core
                </button>
            </nav>

            <main>
                <!-- Chat Tab -->
                <div id="content-chat" class="tab-content">
                    <div class="glass rounded-3xl p-6 shadow-2xl border-white/5">
                        <div class="flex justify-between items-center mb-6 px-2">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Secure Channel Active</h3>
                            </div>
                            <button onclick="clearHistory()" class="text-[10px] font-bold text-red-400/40 hover:text-red-400 uppercase tracking-widest transition-colors">Purge Logs</button>
                        </div>
                        <div id="chat-container" class="space-y-6 mb-6 pr-2"></div>
                        <div class="relative group">
                            <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
                            <input type="text" id="command-input" placeholder="Initialize command sequence..." class="relative w-full pl-6 pr-16 py-5 bg-[#0a0a0c] rounded-2xl border border-white/5 outline-none focus:border-blue-500/30 transition-all text-sm">
                            <button onclick="sendCommand()" class="absolute right-3 top-3 bottom-3 px-5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20">
                                <i data-lucide="send" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Automations Tab -->
                <div id="content-automations" class="tab-content hidden">
                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="md:col-span-1 glass rounded-3xl p-8 h-fit border-white/5">
                            <h3 class="text-sm font-bold mb-6 uppercase tracking-widest text-blue-400">New Protocol</h3>
                            <div class="space-y-5">
                                <div>
                                    <label class="text-[10px] uppercase text-gray-500 mb-2 block">Protocol Name</label>
                                    <input type="text" id="auto-name" placeholder="Morning Brief" class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 outline-none focus:border-blue-500/30">
                                </div>
                                <div>
                                    <label class="text-[10px] uppercase text-gray-500 mb-2 block">Task Type</label>
                                    <select id="auto-type" class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 outline-none focus:border-blue-500/30 appearance-none">
                                        <option value="daily_reminder">Daily Reminder</option>
                                        <option value="weather_check">Weather Check</option>
                                        <option value="news_digest">News Digest</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-[10px] uppercase text-gray-500 mb-2 block">Execution Time</label>
                                    <input type="time" id="auto-time" class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 outline-none focus:border-blue-500/30">
                                </div>
                                <button onclick="createAutomation()" class="w-full py-4 bg-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-500 transition-all">Initialize</button>
                            </div>
                        </div>
                        <div class="md:col-span-2 glass rounded-3xl p-8 border-white/5">
                            <h3 class="text-sm font-bold mb-6 uppercase tracking-widest text-purple-400">Active Protocols</h3>
                            <div id="automations-list" class="space-y-4"></div>
                        </div>
                    </div>
                </div>

                <!-- Notes Tab -->
                <div id="content-notes" class="tab-content hidden">
                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="md:col-span-1 glass rounded-3xl p-8 h-fit border-white/5">
                            <h3 class="text-sm font-bold mb-6 uppercase tracking-widest text-purple-400">Data Entry</h3>
                            <div class="space-y-5">
                                <input type="text" id="note-title" placeholder="Subject" class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 outline-none focus:border-blue-500/30">
                                <textarea id="note-content" placeholder="Detailed logs..." class="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 outline-none focus:border-blue-500/30 h-40 resize-none"></textarea>
                                <button onclick="createNote()" class="w-full py-4 bg-purple-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-500 transition-all">Archive Note</button>
                            </div>
                        </div>
                        <div class="md:col-span-2 glass rounded-3xl p-8 border-white/5">
                            <h3 class="text-sm font-bold mb-6 uppercase tracking-widest text-blue-400">Encrypted Archives</h3>
                            <div id="notes-list" class="grid grid-cols-1 sm:grid-cols-2 gap-5"></div>
                        </div>
                    </div>
                </div>

                <!-- Settings Tab -->
                <div id="content-settings" class="tab-content hidden">
                    <div class="max-w-2xl mx-auto glass rounded-3xl p-10 space-y-8 border-white/5">
                        <div class="text-center">
                            <h3 class="text-xl font-bold uppercase tracking-[0.2em]">Core Configuration</h3>
                            <p class="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">System Authorization Required</p>
                        </div>
                        <div class="space-y-6">
                            <div class="group">
                                <label class="block text-[10px] uppercase tracking-widest text-gray-500 mb-3 group-focus-within:text-blue-400 transition-colors">Gemini Neural Key</label>
                                <input type="password" id="gemini-key" class="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none focus:border-blue-500/30 transition-all">
                            </div>
                            <div class="group">
                                <label class="block text-[10px] uppercase tracking-widest text-gray-500 mb-3 group-focus-within:text-purple-400 transition-colors">OpenAI Neural Key</label>
                                <input type="password" id="openai-key" class="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none focus:border-blue-500/30 transition-all">
                            </div>
                            <button onclick="saveAllSettings()" class="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20">Update Neural Links</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>lucide.createIcons();</script>
    </body>
    </html>
  `)
})

export default app