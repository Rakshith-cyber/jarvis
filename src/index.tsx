import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ============= AI BRAIN =============
async function aiBrain(command: string, db: D1Database): Promise<string> {
  // Try Gemini first if key exists, otherwise fallback to OpenAI
  const geminiKey = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('gemini_key').first())?.value as string;
  const openaiKey = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('openai_key').first())?.value as string;

  if (geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are Jarvis, an AI assistant. User says: ${command}` }] }]
        })
      });
      
      if (response.ok) {
        const data: any = await response.json();
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.error("Gemini Error:", e);
    }
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
          messages: [{ role: 'system', content: 'You are Jarvis.' }, { role: 'user', content: command }]
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        return data.choices[0].message.content;
      }
    } catch (e) {
      console.error("OpenAI Error:", e);
    }
  }

  return "No valid API keys found or providers failed. Please check your Settings.";
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

// ... (Keep other API routes for automations/notes as they were)

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
            .glass { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
            .logo-container { width: 120px; height: 120px; position: relative; margin: 0 auto; }
            .logo-base { position: absolute; inset: 0; border-radius: 50%; display: flex; items-center: center; justify-content: center; transition: all 0.5s ease; }
            
            /* User Speaking Logo */
            .logo-user { background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%); opacity: 0; transform: scale(0.8); }
            .logo-user.active { opacity: 1; transform: scale(1); animation: pulse-user 1.5s infinite; }
            
            /* AI Replying Logo */
            .logo-ai { background: radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%); opacity: 1; transform: scale(1); }
            .logo-ai.active { animation: pulse-ai 2s infinite; }
            
            @keyframes pulse-user { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
            @keyframes pulse-ai { 0% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.1); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
            
            #chat-container { height: 400px; overflow-y: auto; }
        </style>
    </head>
    <body class="bg-gray-900 text-white min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-4xl">
            <div class="text-center mb-8">
                <div class="logo-container mb-4">
                    <div id="logo-user" class="logo-base logo-user"><i class="fas fa-microphone text-4xl"></i></div>
                    <div id="logo-ai" class="logo-base logo-ai active"><i class="fas fa-brain text-4xl"></i></div>
                </div>
                <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">JARVIS</h1>
                <p id="status-text" class="text-blue-300 text-sm mt-2">Say "Jarvis" to start</p>
            </div>

            <div class="flex justify-center mb-6 space-x-2">
                <button onclick="showTab('chat')" class="px-4 py-2 rounded glass">Chat</button>
                <button onclick="showTab('settings')" class="px-4 py-2 rounded glass">Settings</button>
            </div>

            <div id="content-chat" class="tab-content">
                <div class="glass rounded-xl p-6">
                    <div id="chat-container" class="bg-gray-800 rounded-lg p-4 mb-4"></div>
                    <div class="flex space-x-2">
                        <input type="text" id="command-input" placeholder="Type or say 'Jarvis'..." class="flex-1 px-4 py-2 bg-gray-700 rounded-lg outline-none">
                        <button onclick="sendCommand()" class="px-4 py-2 bg-blue-600 rounded-lg"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>

            <div id="content-settings" class="tab-content hidden">
                <div class="glass rounded-xl p-6 space-y-4">
                    <div>
                        <label class="block text-sm mb-1">Gemini API Key</label>
                        <input type="password" id="gemini-key" class="w-full px-4 py-2 bg-gray-700 rounded">
                    </div>
                    <div>
                        <label class="block text-sm mb-1">OpenAI API Key</label>
                        <input type="password" id="openai-key" class="w-full px-4 py-2 bg-gray-700 rounded">
                    </div>
                    <button onclick="saveAllSettings()" class="w-full py-2 bg-blue-600 rounded">Save Keys</button>
                </div>
            </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app