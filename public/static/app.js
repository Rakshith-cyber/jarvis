let voiceOutputEnabled = true;
let isJarvisActive = false;
let recognition;

document.addEventListener('DOMContentLoaded', () => {
    initWakeWord();
    loadSettings();
    loadHistory();
    loadAutomations();
    loadNotes();
});

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
    document.getElementById('status-text').innerText = "Listening...";
    speak("Yes, I am here.");
}

function stopJarvis() {
    isJarvisActive = false;
    updateUIState('idle');
    document.getElementById('status-text').innerText = "System Standby";
    speak("Going to sleep.");
}

function updateUIState(state) {
    const logoUser = document.getElementById('logo-user');
    const logoAi = document.getElementById('logo-ai');
    if (state === 'speaking') {
        logoUser.classList.add('active');
        logoAi.classList.remove('active');
        logoAi.style.opacity = "0.2";
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
    div.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
    div.innerHTML = `
        <div class="max-w-[80%] p-4 rounded-2xl ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}">
            <p class="text-sm">${content}</p>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function clearHistory() {
    if (!confirm("Clear all conversation history?")) return;
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
            <div class="p-4 glass rounded-xl flex justify-between items-center group">
                <div>
                    <h4 class="font-bold">${a.name}</h4>
                    <p class="text-xs text-gray-400">${a.task_type} @ ${a.schedule}</p>
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="deleteAutomation(${a.id})" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
                        <i class="fas fa-trash-can"></i>
                    </button>
                    <div class="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                        <div class="absolute right-1 top-1 bottom-1 w-3 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>
        `).join('') || '<p class="text-gray-500 text-center py-4">No active automations</p>';
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
            <div class="p-4 glass rounded-xl border-l-4 border-purple-500 relative group">
                <button onclick="deleteNote(${n.id})" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all">
                    <i class="fas fa-times"></i>
                </button>
                <h4 class="font-bold mb-1">${n.title}</h4>
                <p class="text-sm text-gray-400">${n.content}</p>
            </div>
        `).join('') || '<p class="text-gray-500 col-span-2 text-center py-4">No notes found</p>';
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
    alert("System keys updated successfully.");
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-${tab}`).classList.add('active');
}