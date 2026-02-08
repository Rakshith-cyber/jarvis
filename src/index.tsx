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
  const geminiKey = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('gemini_key').first())?.value as string;
  const openaiKey = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('openai_key').first())?.value as string;

  const lowerCmd = command.toLowerCase();
  
  if (lowerCmd.includes('weather in')) {
    const city = lowerCmd.split('weather in')[1].trim().replace(/[?!.]/g, '');
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
    return res.ok ? `Current weather: ${(await res.text()).trim()}` : "Weather service unavailable.";
  }

  const systemPrompt = "You are Jarvis, a highly advanced AI assistant. Be concise, helpful, and slightly formal.";

  // AI Provider Logic (Simplified for brevity)
  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: command }]
      })
    });
    if (res.ok) return (await res.json() as any).choices[0].message.content;
  }

  return "I'm having trouble connecting to my brain. Please check your API keys.";
}

// ============= API ROUTES =============
app.get('/api/settings/:key', async (c) => {
  const result = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(c.req.param('key')).first()
  return c.json({ value: result ? result.value : null })
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
  return c.json({ response })
})

app.get('/api/history', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM command_history ORDER BY timestamp DESC LIMIT 50').all()
  return c.json({ history: results || [] })
})

app.delete('/api/history', async (c) => {
  await c.env.DB.prepare('DELETE FROM command_history').run()
  return c.json({ success: true })
})

// ============= CRON TRIGGER =============
export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { results } = await env.DB.prepare('SELECT * FROM automations WHERE schedule = ? AND enabled = 1').bind(timeStr).all();
    
    for (const auto of (results || [])) {
      console.log(`Running automation: ${auto.name}`);
      // Here you would trigger the AI brain or send a notification
      await env.DB.prepare('UPDATE automations SET last_run = CURRENT_TIMESTAMP WHERE id = ?').bind(auto.id).run();
    }
  }
}

// Serve the main HTML (Vite will handle the React build)
app.get('*', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jarvis AI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Space Grotesk', sans-serif; background: #050507; color: #d1d5db; }
            .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.08); }
            .logo-container { width: 120px; height: 120px; position: relative; margin: 0 auto; }
            .logo-base { position: absolute; inset: 0; border-radius: 50%; display: flex; items-center: center; justify-content: center; }
            .logo-user { background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%); opacity: 0; transform: scale(0.8); }
            .logo-user.active { opacity: 1; transform: scale(1); animation: pulse-user 1.5s infinite; }
            .logo-ai { background: radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%); opacity: 1; transform: scale(1); }
            .logo-ai.active { animation: pulse-ai 2s infinite; }
            @keyframes pulse-user { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); } 70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
            @keyframes pulse-ai { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
            .waveform { display: flex; align-items: center; justify-content: center; gap: 3px; height: 20px; opacity: 0; }
            .waveform.active { opacity: 1; }
            .bar { width: 3px; height: 5px; background: #3b82f6; border-radius: 10px; animation: wave 1s infinite; }
            @keyframes wave { 0%, 100% { height: 5px; } 50% { height: 20px; } }
        </style>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
    </body>
    </html>
  `)
})