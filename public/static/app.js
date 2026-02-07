// Global state
let voiceOutputEnabled = true;
let isListening = false;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadHistory();
    loadAutomations();
    loadNotes();
});

// ============= TAB MANAGEMENT =============
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    // Update tab buttons
    document.querySelectorAll('[id^="tab-"]').forEach(btn => {
        btn.classList.remove('glow');
    });
    document.getElementById(`tab-${tabName}`).classList.add('glow');
}

// ============= VOICE INPUT/OUTPUT =============
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        addMessage('system', 'Voice input is not supported in your browser. Please use Chrome or Edge.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.innerHTML = '<i class="fas fa-microphone-slash mr-2"></i>Listening...';
    voiceBtn.classList.add('bg-red-600');
    isListening = true;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('command-input').value = transcript;
        sendCommand();
    };

    recognition.onerror = (event) => {
        addMessage('system', `Voice recognition error: ${event.error}`);
        resetVoiceButton();
    };

    recognition.onend = () => {
        resetVoiceButton();
    };

    recognition.start();
}

function resetVoiceButton() {
    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.innerHTML = '<i class="fas fa-microphone mr-2"></i>Voice Input';
    voiceBtn.classList.remove('bg-red-600');
    isListening = false;
}

function toggleVoiceOutput() {
    voiceOutputEnabled = !voiceOutputEnabled;
    const btn = document.getElementById('voice-output-btn');
    btn.innerHTML = voiceOutputEnabled 
        ? '<i class="fas fa-volume-up mr-2"></i>Voice Output: ON'
        : '<i class="fas fa-volume-mute mr-2"></i>Voice Output: OFF';
}

function speak(text) {
    if (!voiceOutputEnabled) return;
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// ============= CHAT FUNCTIONS =============
function addMessage(type, content) {
    const chatContainer = document.getElementById('chat-container');
    
    // Clear welcome message on first message
    if (chatContainer.querySelector('.text-center')) {
        chatContainer.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message mb-4 p-4 rounded-lg ${
        type === 'user' 
            ? 'bg-blue-600 ml-12' 
            : type === 'jarvis'
            ? 'bg-gray-700 mr-12'
            : 'bg-yellow-900 border border-yellow-600'
    }`;
    
    const icon = type === 'user' 
        ? '<i class="fas fa-user mr-2"></i>' 
        : type === 'jarvis'
        ? '<i class="fas fa-brain mr-2"></i>'
        : '<i class="fas fa-info-circle mr-2"></i>';
    
    messageDiv.innerHTML = `
        <div class="flex items-start">
            ${icon}
            <div class="flex-1">
                <strong>${type === 'user' ? 'You' : type === 'jarvis' ? 'Jarvis' : 'System'}:</strong>
                <p class="mt-1">${content}</p>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendCommand() {
    const input = document.getElementById('command-input');
    const command = input.value.trim();
    
    if (!command) return;
    
    input.value = '';
    addMessage('user', command);
    
    try {
        // Check for special commands
        if (command.toLowerCase().includes('weather')) {
            const cityMatch = command.match(/in ([a-zA-Z\s]+)/);
            const city = cityMatch ? cityMatch[1].trim() : 'London';
            await getWeather(city);
            return;
        }
        
        if (command.toLowerCase().startsWith('search ')) {
            const query = command.substring(7);
            await webSearch(query);
            return;
        }
        
        if (command.toLowerCase().includes('remind me')) {
            await quickReminder(command);
            return;
        }

        // Regular AI command
        const response = await axios.post('/api/command', { command });
        const reply = response.data.response;
        
        addMessage('jarvis', reply);
        speak(reply);
        
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
        addMessage('system', `Error: ${errorMsg}`);
    }
}

async function loadHistory() {
    try {
        const response = await axios.get('/api/history');
        // History loaded but not displayed to keep chat clean
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

async function clearHistory() {
    if (!confirm('Clear all chat history?')) return;
    
    try {
        await axios.delete('/api/history');
        document.getElementById('chat-container').innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-brain text-4xl mb-2"></i>
                <p>Chat history cleared. How can I help you?</p>
            </div>
        `;
        addMessage('system', 'Chat history cleared');
    } catch (error) {
        addMessage('system', 'Failed to clear history');
    }
}

// ============= WEATHER & SEARCH =============
async function getWeather(city) {
    try {
        const response = await axios.get(`/api/weather/${city}`);
        const weather = response.data.weather;
        
        if (weather && weather.current_condition && weather.current_condition[0]) {
            const current = weather.current_condition[0];
            const desc = current.weatherDesc[0].value;
            const temp = current.temp_C;
            const feelsLike = current.FeelsLikeC;
            
            const message = `Weather in ${city}: ${desc}, ${temp}°C (feels like ${feelsLike}°C)`;
            addMessage('jarvis', message);
            speak(message);
        } else {
            addMessage('system', 'Could not fetch weather data');
        }
    } catch (error) {
        addMessage('system', 'Weather service unavailable');
    }
}

async function webSearch(query) {
    try {
        const response = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
        const results = response.data.results;
        
        if (results && results.AbstractText) {
            addMessage('jarvis', results.AbstractText);
            speak(results.AbstractText);
        } else {
            addMessage('jarvis', `I searched for "${query}". Check DuckDuckGo for full results.`);
        }
    } catch (error) {
        addMessage('system', 'Search service unavailable');
    }
}

// ============= AUTOMATIONS =============
async function loadAutomations() {
    try {
        const response = await axios.get('/api/automations');
        const automations = response.data.automations || [];
        
        const container = document.getElementById('automations-list');
        
        if (automations.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">No automations yet</div>';
            return;
        }
        
        container.innerHTML = automations.map(auto => `
            <div class="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div class="flex-1">
                    <h4 class="font-semibold">${auto.name}</h4>
                    <p class="text-sm text-gray-400">${auto.task_type} - ${auto.schedule || 'No schedule'}</p>
                </div>
                <div class="flex space-x-2">
                    <button 
                        onclick="toggleAutomation(${auto.id}, ${auto.enabled})"
                        class="px-4 py-2 rounded ${auto.enabled ? 'bg-green-600' : 'bg-gray-600'}"
                    >
                        ${auto.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button 
                        onclick="deleteAutomation(${auto.id})"
                        class="px-4 py-2 bg-red-600 rounded"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load automations:', error);
    }
}

async function createAutomation() {
    const name = document.getElementById('auto-name').value.trim();
    const task_type = document.getElementById('auto-type').value;
    const schedule = document.getElementById('auto-schedule').value.trim();
    const config = document.getElementById('auto-config').value.trim();
    
    if (!name) {
        alert('Please enter a task name');
        return;
    }
    
    try {
        await axios.post('/api/automations', {
            name,
            task_type,
            schedule,
            config: config || '{}'
        });
        
        // Clear form
        document.getElementById('auto-name').value = '';
        document.getElementById('auto-schedule').value = '';
        document.getElementById('auto-config').value = '';
        
        loadAutomations();
        addMessage('system', `Automation "${name}" created successfully`);
    } catch (error) {
        alert('Failed to create automation');
    }
}

async function toggleAutomation(id, currentState) {
    try {
        await axios.patch(`/api/automations/${id}`, {
            enabled: !currentState
        });
        loadAutomations();
    } catch (error) {
        alert('Failed to toggle automation');
    }
}

async function deleteAutomation(id) {
    if (!confirm('Delete this automation?')) return;
    
    try {
        await axios.delete(`/api/automations/${id}`);
        loadAutomations();
        addMessage('system', 'Automation deleted');
    } catch (error) {
        alert('Failed to delete automation');
    }
}

// ============= NOTES =============
async function loadNotes() {
    try {
        const response = await axios.get('/api/notes');
        const notes = response.data.notes || [];
        
        const container = document.getElementById('notes-list');
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">No notes yet</div>';
            return;
        }
        
        container.innerHTML = notes.map(note => {
            const reminderText = note.reminder_time 
                ? new Date(note.reminder_time).toLocaleString()
                : 'No reminder';
            
            return `
                <div class="bg-gray-800 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h4 class="font-semibold">${note.title}</h4>
                            <p class="text-sm text-gray-300 mt-1">${note.content || ''}</p>
                            <p class="text-xs text-gray-500 mt-2">
                                <i class="fas fa-clock mr-1"></i>${reminderText}
                            </p>
                        </div>
                        <div class="flex space-x-2 ml-4">
                            <button 
                                onclick="completeNote(${note.id})"
                                class="px-3 py-1 bg-green-600 rounded text-sm"
                            >
                                <i class="fas fa-check"></i>
                            </button>
                            <button 
                                onclick="deleteNote(${note.id})"
                                class="px-3 py-1 bg-red-600 rounded text-sm"
                            >
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load notes:', error);
    }
}

async function createNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const reminder_time = document.getElementById('note-reminder').value;
    
    if (!title) {
        alert('Please enter a title');
        return;
    }
    
    try {
        await axios.post('/api/notes', {
            title,
            content,
            reminder_time: reminder_time || null
        });
        
        // Clear form
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-reminder').value = '';
        
        loadNotes();
        addMessage('system', `Note "${title}" created successfully`);
    } catch (error) {
        alert('Failed to create note');
    }
}

async function completeNote(id) {
    try {
        await axios.patch(`/api/notes/${id}`);
        loadNotes();
        addMessage('system', 'Note marked as complete');
    } catch (error) {
        alert('Failed to complete note');
    }
}

async function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    
    try {
        await axios.delete(`/api/notes/${id}`);
        loadNotes();
        addMessage('system', 'Note deleted');
    } catch (error) {
        alert('Failed to delete note');
    }
}

async function quickReminder(command) {
    // Simple parsing for "remind me to X"
    const reminderText = command.replace(/remind me to/i, '').trim();
    
    if (!reminderText) {
        addMessage('system', 'Please specify what to remind you about');
        return;
    }
    
    try {
        await axios.post('/api/notes', {
            title: reminderText,
            content: '',
            reminder_time: null
        });
        
        addMessage('jarvis', `I'll remind you: ${reminderText}`);
        speak(`Reminder created: ${reminderText}`);
        loadNotes();
    } catch (error) {
        addMessage('system', 'Failed to create reminder');
    }
}

// ============= SETTINGS =============
async function loadSettings() {
    try {
        const response = await axios.get('/api/settings/openai_key');
        if (response.data.value) {
            document.getElementById('openai-key').value = response.data.value;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

async function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    
    if (!openaiKey) {
        alert('Please enter your OpenAI API key');
        return;
    }
    
    try {
        await axios.post('/api/settings', {
            key: 'openai_key',
            value: openaiKey
        });
        
        alert('Settings saved successfully!');
        addMessage('system', 'OpenAI API key configured');
    } catch (error) {
        alert('Failed to save settings');
    }
}
