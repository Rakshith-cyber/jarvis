import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ============= AI BRAIN =============
async function aiBrain(command: string, openaiKey: string): Promise<string> {
  if (!openaiKey) {
    return "OpenAI API key is not configured. Please set it in Settings."
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Jarvis, an advanced AI assistant created to help Rakshith with various tasks. Be helpful, concise, and proactive.'
          },
          {
            role: 'user',
            content: command
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      return `OpenAI API error: ${response.statusText}`
    }

    const data: any = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    return `AI Error: ${error}`
  }
}

// ============= API ROUTES =============

// Get OpenAI key from settings
app.get('/api/settings/:key', async (c) => {
  const { DB } = c.env
  const key = c.req.param('key')

  try {
    const result = await DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind(key)
      .first()

    if (result) {
      return c.json({ key, value: result.value })
    }
    return c.json({ key, value: null })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Save setting
app.post('/api/settings', async (c) => {
  const { DB } = c.env
  const { key, value } = await c.req.json()

  try {
    await DB.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .bind(key, value)
      .run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Process command
app.post('/api/command', async (c) => {
  const { DB } = c.env
  const { command } = await c.req.json()

  try {
    // Get OpenAI key
    const keyResult = await DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('openai_key')
      .first()

    const openaiKey = keyResult?.value || ''

    // Process with AI
    const response = await aiBrain(command, openaiKey)

    // Save to history
    await DB.prepare('INSERT INTO command_history (command, response) VALUES (?, ?)')
      .bind(command, response)
      .run()

    return c.json({ response, status: 'success' })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Get command history
app.get('/api/history', async (c) => {
  const { DB } = c.env

  try {
    const { results } = await DB.prepare('SELECT * FROM command_history ORDER BY timestamp DESC LIMIT 50')
      .all()

    return c.json({ history: results || [] })
  } catch (error) {
    console.error('History Error:', error)
    return c.json({ history: [] })
  }
})

// Clear history
app.delete('/api/history', async (c) => {
  const { DB } = c.env

  try {
    await DB.prepare('DELETE FROM command_history').run()
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Create automation
app.post('/api/automations', async (c) => {
  const { DB } = c.env
  const { name, task_type, schedule, config } = await c.req.json()

  try {
    const result = await DB.prepare(
      'INSERT INTO automations (name, task_type, schedule, config) VALUES (?, ?, ?, ?)'
    ).bind(name, task_type, schedule, JSON.stringify(config)).run()

    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Get automations
app.get('/api/automations', async (c) => {
  const { DB } = c.env

  try {
    const { results } = await DB.prepare('SELECT * FROM automations ORDER BY created_at DESC')
      .all()

    return c.json({ automations: results })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Toggle automation
app.patch('/api/automations/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const { enabled } = await c.req.json()

  try {
    await DB.prepare('UPDATE automations SET enabled = ? WHERE id = ?')
      .bind(enabled ? 1 : 0, id)
      .run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Delete automation
app.delete('/api/automations/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  try {
    await DB.prepare('DELETE FROM automations WHERE id = ?')
      .bind(id)
      .run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Create note/reminder
app.post('/api/notes', async (c) => {
  const { DB } = c.env
  const { title, content, reminder_time } = await c.req.json()

  try {
    const result = await DB.prepare(
      'INSERT INTO notes (title, content, reminder_time) VALUES (?, ?, ?)'
    ).bind(title, content, reminder_time || null).run()

    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Get notes
app.get('/api/notes', async (c) => {
  const { DB } = c.env

  try {
    const { results } = await DB.prepare('SELECT * FROM notes WHERE completed = 0 ORDER BY created_at DESC')
      .all()

    return c.json({ notes: results })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Complete note
app.patch('/api/notes/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  try {
    await DB.prepare('UPDATE notes SET completed = 1 WHERE id = ?')
      .bind(id)
      .run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Delete note
app.delete('/api/notes/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  try {
    await DB.prepare('DELETE FROM notes WHERE id = ?')
      .bind(id)
      .run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Weather API (using wttr.in)
app.get('/api/weather/:city', async (c) => {
  const city = c.req.param('city')

  try {
    const response = await fetch(`https://wttr.in/${city}?format=j1`)
    const data = await response.json()

    return c.json({ weather: data })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// Web search API (using DuckDuckGo)
app.get('/api/search', async (c) => {
  const query = c.req.query('q')

  if (!query) {
    return c.json({ error: 'Query parameter required' }, 400)
  }

  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`)
    const data = await response.json()

    return c.json({ results: data })
  } catch (error) {
    return c.json({ error: String(error) }, 500)
  }
})

// ============= MAIN PAGE =============
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jarvis AI - Your Personal Assistant</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .glass {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .glow {
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
            }
            #chat-container {
                height: 500px;
                overflow-y: auto;
            }
            .message {
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .pulse-ring {
                animation: pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }
            @keyframes pulseRing {
                0% {
                    transform: scale(0.9);
                    opacity: 1;
                }
                100% {
                    transform: scale(1.3);
                    opacity: 0;
                }
            }
        </style>
    </head>
    <body class="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 min-h-screen text-white">
        <div class="container mx-auto px-4 py-8 max-w-6xl">
            <!-- Header -->
            <div class="text-center mb-8">
                <div class="inline-block relative mb-4">
                    <div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center glow pulse-ring absolute"></div>
                    <div class="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center glow relative">
                        <i class="fas fa-brain text-3xl"></i>
                    </div>
                </div>
                <h1 class="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    JARVIS AI
                </h1>
                <p class="text-blue-300">Your Advanced Personal Assistant - Always Online, Always Ready</p>
            </div>

            <!-- Navigation Tabs -->
            <div class="flex justify-center mb-6 space-x-2">
                <button onclick="showTab('chat')" id="tab-chat" class="px-6 py-2 rounded-lg glass glow">
                    <i class="fas fa-comments mr-2"></i>Chat
                </button>
                <button onclick="showTab('automations')" id="tab-automations" class="px-6 py-2 rounded-lg glass">
                    <i class="fas fa-robot mr-2"></i>Automations
                </button>
                <button onclick="showTab('notes')" id="tab-notes" class="px-6 py-2 rounded-lg glass">
                    <i class="fas fa-sticky-note mr-2"></i>Notes
                </button>
                <button onclick="showTab('settings')" id="tab-settings" class="px-6 py-2 rounded-lg glass">
                    <i class="fas fa-cog mr-2"></i>Settings
                </button>
            </div>

            <!-- Chat Tab -->
            <div id="content-chat" class="tab-content">
                <div class="glass rounded-xl p-6 mb-4">
                    <!-- Voice Controls -->
                    <div class="flex justify-center mb-4 space-x-4">
                        <button onclick="startVoiceInput()" id="voice-btn" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg glow">
                            <i class="fas fa-microphone mr-2"></i>Voice Input
                        </button>
                        <button onclick="toggleVoiceOutput()" id="voice-output-btn" class="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg">
                            <i class="fas fa-volume-up mr-2"></i>Voice Output: ON
                        </button>
                    </div>

                    <!-- Chat Container -->
                    <div id="chat-container" class="bg-gray-800 rounded-lg p-4 mb-4">
                        <div class="text-center text-gray-400 py-8">
                            <i class="fas fa-brain text-4xl mb-2"></i>
                            <p>Hello Rakshith! I'm Jarvis, ready to assist you.</p>
                            <p class="text-sm mt-2">Try: "What's the weather?" or "Search for AI news"</p>
                        </div>
                    </div>

                    <!-- Input -->
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            id="command-input" 
                            placeholder="Ask Jarvis anything..." 
                            class="flex-1 px-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onkeypress="if(event.key==='Enter') sendCommand()"
                        >
                        <button onclick="sendCommand()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg glow">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button onclick="clearHistory()" class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Automations Tab -->
            <div id="content-automations" class="tab-content hidden">
                <div class="glass rounded-xl p-6">
                    <h2 class="text-2xl font-bold mb-4"><i class="fas fa-robot mr-2"></i>Automation Tasks</h2>
                    
                    <!-- Add Automation Form -->
                    <div class="bg-gray-800 rounded-lg p-4 mb-4">
                        <h3 class="text-lg font-semibold mb-3">Create New Automation</h3>
                        <input type="text" id="auto-name" placeholder="Task name" class="w-full px-4 py-2 bg-gray-700 rounded mb-2">
                        <select id="auto-type" class="w-full px-4 py-2 bg-gray-700 rounded mb-2">
                            <option value="daily_reminder">Daily Reminder</option>
                            <option value="weather_check">Weather Check</option>
                            <option value="news_digest">News Digest</option>
                            <option value="custom">Custom Command</option>
                        </select>
                        <input type="text" id="auto-schedule" placeholder="Schedule (e.g., 09:00)" class="w-full px-4 py-2 bg-gray-700 rounded mb-2">
                        <textarea id="auto-config" placeholder="Configuration (JSON)" class="w-full px-4 py-2 bg-gray-700 rounded mb-2" rows="3"></textarea>
                        <button onclick="createAutomation()" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                            <i class="fas fa-plus mr-2"></i>Create Automation
                        </button>
                    </div>

                    <!-- Automations List -->
                    <div id="automations-list" class="space-y-2">
                        <div class="text-center text-gray-400 py-4">No automations yet</div>
                    </div>
                </div>
            </div>

            <!-- Notes Tab -->
            <div id="content-notes" class="tab-content hidden">
                <div class="glass rounded-xl p-6">
                    <h2 class="text-2xl font-bold mb-4"><i class="fas fa-sticky-note mr-2"></i>Notes & Reminders</h2>
                    
                    <!-- Add Note Form -->
                    <div class="bg-gray-800 rounded-lg p-4 mb-4">
                        <h3 class="text-lg font-semibold mb-3">Create Note</h3>
                        <input type="text" id="note-title" placeholder="Title" class="w-full px-4 py-2 bg-gray-700 rounded mb-2">
                        <textarea id="note-content" placeholder="Content" class="w-full px-4 py-2 bg-gray-700 rounded mb-2" rows="3"></textarea>
                        <input type="datetime-local" id="note-reminder" class="w-full px-4 py-2 bg-gray-700 rounded mb-2">
                        <button onclick="createNote()" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                            <i class="fas fa-plus mr-2"></i>Create Note
                        </button>
                    </div>

                    <!-- Notes List -->
                    <div id="notes-list" class="space-y-2">
                        <div class="text-center text-gray-400 py-4">No notes yet</div>
                    </div>
                </div>
            </div>

            <!-- Settings Tab -->
            <div id="content-settings" class="tab-content hidden">
                <div class="glass rounded-xl p-6">
                    <h2 class="text-2xl font-bold mb-4"><i class="fas fa-cog mr-2"></i>Settings</h2>
                    
                    <div class="bg-gray-800 rounded-lg p-4 mb-4">
                        <label class="block text-sm font-semibold mb-2">OpenAI API Key</label>
                        <input 
                            type="password" 
                            id="openai-key" 
                            placeholder="sk-..." 
                            class="w-full px-4 py-2 bg-gray-700 rounded mb-2"
                        >
                        <button onclick="saveSettings()" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                            <i class="fas fa-save mr-2"></i>Save Settings
                        </button>
                    </div>

                    <div class="bg-blue-900 border border-blue-700 rounded-lg p-4">
                        <h3 class="font-bold mb-2"><i class="fas fa-info-circle mr-2"></i>About Jarvis</h3>
                        <p class="text-sm text-blue-200">
                            Jarvis is your advanced AI assistant, available 24/7 from anywhere in the world.
                            It can help you with tasks, reminders, automation, and much more - all without touching your PC or phone!
                        </p>
                        <p class="text-xs text-blue-300 mt-2">
                            Powered by OpenAI GPT-4 • Built with Hono & Cloudflare Workers
                        </p>
                    </div>
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
