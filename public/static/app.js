let voiceOutputEnabled = true;
let isJarvisActive = false;
let recognition;
let startTime = Date.now();

document.addEventListener('DOMContentLoaded', () => {
    initWakeWord();
    loadSettings();
    loadHistory();
    loadAutomations();
    loadNotes();
    startSystemStats();
    updateUptime();
});

// ============= SYSTEM STATS =============

function startSystemStats() {
    setInterval(() => {
        const cpu = Math.floor(Math.random() * 15) + 5;
        const mem = (Math.random() * 0.5 + 4.0).toFixed(1);
        const net = Math.floor(Math.random() * 40) + 60;

        document.getElementById('cpu-val').innerText = `${cpu}%`;
        document.getElementById('cpu-bar').style.width = `${cpu}%`;
        
        document.getElementById('mem-val').innerText = `${mem}GB`;
        document.getElementById('mem-bar').style.width = `${(mem/8)*100}%`;
        
        document.getElementById('net-val').innerText = `${net}ms`;
        document.getElementById('net-bar').style.width = `${(net/200)*100}%`;
    }, 3000);
}

function updateUptime() {
    setInterval(() => {
        const diff = Date.now() - startTime;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        document.getElementById('uptime-val').innerText = `${h}:${m}:${s}`;
    }, 1000);
}

// ============= CORE CHAT & VOICE =============

function initWakeWord() {
    if (!('webkitSpeechRecognition' in window)) return;
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.toLowerCase())
            .join('');

        if (transcript.includes('jarvis') && !isJarvisActive) {
            startJarvis();
        } else if (transcript.includes('stop jarvis') && isJarvisActive) {
            stopJarvis();
        } else if (isJarvisActive) {
            const last = event.results[event.results.length - 1];
            if (last.isFinal) {
                const cmd = last[0].transcript.trim();
                if (cmd && !cmd.includes('jarvis')) {
                    document.getElementById('command-input').value = cmd;
                    sendCommand();
                }
            }
        }
    };
    recognition.start();
}

function startJarvis() {
    isJarvisActive = true;
    updateUIState('speaking');
    document.getElementById('status-text').innerText = "Neural Link Active";
    document.getElementById('waveform').classList.add('active');
    speak("Yes, I am here.");
}

function stopJarvis() {
    isJarvisActive = false;
    updateUIState('idle');
    document.getElementById('status-text').innerText = "Neural Link Standby";
    document.getElementById('waveform').classList.remove('active');
    speak("Going to sleep.");
}

function updateUIState(state) {
    const logoUser = document.getElementById('logo-user');
    const logoAi = document.getElementById('logo-ai');
    if (state === 'speaking') {
        logoUser.classList.add('active');
        logoAi.classList.remove('active');
        logoAi.style.opacity = "0.1";
    } else if (state === 'replying') {
        logoUser.classList.remove('active');
        logoAi.classList.add('active');
        logoAi.style.opacity = "1";
    } else {
        logoUser.classList.remove('active');
        logoAi.classList.remove('active');
        logoAi.style.opacity = "1";
    }
}

async function sendCommand() {
    const input = document.getElementById('command-input');
    const command = input.value.trim();
    if (!command) return;

    input.value = '';
    addMessage('user', command);
    updateUIState('replying');

    try {
        const response = await axios.post('/api/command', { command });
        const reply = response.data.response;
        addMessage('jarvis', reply);
        speak(reply);
    } catch (error) {
        addMessage('system', "Error processing command");
    } finally {
        if (isJarvisActive) {
            setTimeout(() => updateUIState('speaking'), 1000);
        } else {
            updateUIState('idle');
        }
    }
}

function addMessage(type, content) {
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    const isUser = type === 'user';
    div.className = `flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`;
    div.innerHTML = `
        <div class="max-w-[85%] p-5 rounded-3xl ${isUser ? 'bg-blue-600/90 text-white rounded-tr-none shadow-lg shadow-blue-900/20' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'}">
            <p class="text-sm leading-relaxed">${content}</p>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function clearHistory() {
    if (!confirm("Purge all neural logs?")) return;
    await axios.delete('/api/history');
    document.getElementById('chat-container').innerHTML = '';
}

function speak(text) {
    if (!voiceOutputEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

// ============= DATA LOADING =============

async function loadHistory() {
    try {
        const res = await axios.get('/api/history');
        const history = res.data.history.reverse();
        document.getElementById('chat-container').innerHTML = '';
        history.forEach(item => {
            addMessage('user', item.command);
            addMessage('jarvis', item.response);
        });
    } catch (e) {}
}

async function loadAutomations() {
    try {
        const res = await axios.get('/api/automations');
        const list = document.getElementById('automations-list');
        list.innerHTML = res.data.automations.map(a => `
            <div class="p-5 glass rounded-2xl flex justify-between items-center group border-white/5">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <i data-lucide="zap" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-widest">${a.name}</h4>
                        <p class="text-[10px] text-gray-500 uppercase tracking-tighter">${a.task_type} • ${a.schedule}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="deleteAutomation(${a.id})" class="opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    <div class="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                        <div class="absolute right-1 top-1 bottom-1 w-3 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>
        `).join('') || '<p class="text-gray-600 text-[10px] uppercase tracking-widest text-center py-8">No active protocols</p>';
        lucide.createIcons();
    } catch (e) {}
}

async function createAutomation() {
    const name = document.getElementById('auto-name').value;
    const task_type = document.getElementById('auto-type').value;
    const schedule = document.getElementById('auto-time').value;
    if (!name || !schedule) return;
    await axios.post('/api/automations', { name, task_type, schedule });
    loadAutomations();
}

async function deleteAutomation(id) {
    await axios.delete(\`/api/automations/\${id}\`);
    loadAutomations();
}

async function loadNotes() {
    try {
        const res = await axios.get('/api/notes');
        const list = document.getElementById('notes-list');
        list.innerHTML = res.data.notes.map(n => `
            <div class="p-6 glass rounded-2xl border-l-4 border-purple-500 relative group border-white/5">
                <button onclick="deleteNote(${n.id})" class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
                <h4 class="text-xs font-bold uppercase tracking-widest mb-2 text-purple-400">${n.title}</h4>
                <p class="text-[11px] text-gray-400 leading-relaxed">${n.content}</p>
            </div>
        `).join('') || '<p class="text-gray-600 col-span-2 text-[10px] uppercase tracking-widest text-center py-8">Archives empty</p>';
        lucide.createIcons();
    } catch (e) {}
}

async function createNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    if (!title) return;
    await axios.post('/api/notes', { title, content });
    loadNotes();
}

async function deleteNote(id) {
    await axios.delete(\`/api/notes/\${id}\`);
    loadNotes();
}

// ============= SETTINGS & UI =============

async function loadSettings() {
    const g = await axios.get('/api/settings/gemini_key');
    const o = await axios.get('/api/settings/openai_key');
    if (g.data.value) document.getElementById('gemini-key').value = g.data.value;
    if (o.data.value) document.getElementById('openai-key').value = o.data.value;
}

async function saveAllSettings() {
    const g = document.getElementById('gemini-key').value;
    const o = document.getElementById('openai-key').value;
    await axios.post('/api/settings', { key: 'gemini_key', value: g });
    await axios.post('/api/settings', { key: 'openai_key', value: o });
    alert("Neural links updated successfully.");
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-${tab}`).classList.add('active');
}