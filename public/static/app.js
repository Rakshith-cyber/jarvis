let voiceOutputEnabled = true;
let isJarvisActive = false;
let recognition;

document.addEventListener('DOMContentLoaded', () => {
    initWakeWord();
    loadSettings();
});

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
            // If active, look for the final result to send as command
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
    document.getElementById('status-text').innerText = "Say 'Jarvis' to start";
    speak("Going to sleep.");
}

function updateUIState(state) {
    const logoUser = document.getElementById('logo-user');
    const logoAi = document.getElementById('logo-ai');

    if (state === 'speaking') {
        logoUser.classList.add('active');
        logoAi.classList.remove('active');
        logoAi.style.opacity = "0.3";
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
    div.className = `mb-2 p-2 rounded ${type === 'user' ? 'bg-blue-900 ml-8' : 'bg-gray-700 mr-8'}`;
    div.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${content}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function speak(text) {
    if (!voiceOutputEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

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
    alert("Settings saved!");
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(`content-${tab}`).classList.remove('hidden');
}