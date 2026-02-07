// ================= JARVIS WEB CLIENT =================

let recognition = null;
let isListening = false;
let speechSynthesis = window.speechSynthesis;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('commandInput').value = transcript;
        sendCommand();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        updateStatus('Error: ' + event.error);
        stopListening();
    };

    recognition.onend = () => {
        stopListening();
    };
}

// Toggle voice input
function toggleVoice() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    isListening = true;
    document.getElementById('voiceBtn').classList.add('bg-red-700', 'jarvis-active');
    document.getElementById('voiceText').textContent = 'Listening...';
    document.getElementById('listeningIndicator').classList.remove('hidden');
    
    try {
        recognition.start();
        speak('Listening');
    } catch (e) {
        console.error('Recognition start error:', e);
    }
}

function stopListening() {
    isListening = false;
    document.getElementById('voiceBtn').classList.remove('bg-red-700', 'jarvis-active');
    document.getElementById('voiceText').textContent = 'Voice';
    document.getElementById('listeningIndicator').classList.add('hidden');
    
    try {
        recognition.stop();
    } catch (e) {
        // Already stopped
    }
}

// Quick command buttons
function quickCommand(command) {
    document.getElementById('commandInput').value = command;
    sendCommand();
}

// Text-to-speech
function speak(text) {
    if (!document.getElementById('autoSpeak').checked) {
        return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
}

// Update status
function updateStatus(text) {
    document.getElementById('status').innerHTML = `
        <span class="inline-flex items-center space-x-2">
            <span class="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></span>
            <span>${text}</span>
        </span>
    `;
    
    setTimeout(() => {
        document.getElementById('status').innerHTML = `
            <span class="inline-flex items-center space-x-2">
                <span class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                <span>Online</span>
            </span>
        `;
    }, 3000);
}

// Add message to chat
function addMessage(text, isUser = false) {
    const chatDisplay = document.getElementById('chatDisplay');
    
    // Clear welcome message
    if (chatDisplay.children[0]?.classList.contains('text-center')) {
        chatDisplay.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `command-bubble mb-4 ${isUser ? 'text-right' : 'text-left'}`;
    
    messageDiv.innerHTML = `
        <div class="inline-block max-w-3xl ${isUser ? 'bg-blue-600' : 'bg-gray-700'} p-4 rounded-lg shadow-lg">
            <div class="flex items-start space-x-3">
                ${!isUser ? '<i class="fas fa-robot text-2xl"></i>' : ''}
                <div class="flex-1">
                    <div class="font-bold mb-1">${isUser ? 'You' : 'Jarvis'}</div>
                    <div class="text-sm">${text}</div>
                    <div class="text-xs text-gray-400 mt-1">${new Date().toLocaleTimeString()}</div>
                </div>
                ${isUser ? '<i class="fas fa-user text-2xl"></i>' : ''}
            </div>
        </div>
    `;

    chatDisplay.appendChild(messageDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Process command with intelligent routing
async function processCommand(command) {
    const lowerCommand = command.toLowerCase();

    // Time/Date commands
    if (lowerCommand.includes('time') || lowerCommand.includes('date')) {
        try {
            const response = await axios.get('/api/time');
            const { time, date } = response.data;
            const reply = `The current time is ${time} and today is ${date}.`;
            addMessage(reply);
            speak(reply);
            saveToHistory(command, reply);
            return;
        } catch (error) {
            console.error('Time API error:', error);
        }
    }

    // Weather commands
    if (lowerCommand.includes('weather')) {
        const cityMatch = command.match(/weather (?:in |at |for )?([a-zA-Z\s]+)/i);
        if (cityMatch) {
            const city = cityMatch[1].trim();
            try {
                updateStatus('Fetching weather data...');
                const response = await axios.get(`/api/weather/${encodeURIComponent(city)}`);
                const { temperature, condition, humidity, windSpeed } = response.data;
                const reply = `The weather in ${city} is ${condition} with a temperature of ${temperature}°C, ${humidity}% humidity, and wind speed of ${windSpeed} km/h.`;
                addMessage(reply);
                speak(reply);
                saveToHistory(command, reply);
                return;
            } catch (error) {
                const reply = 'Sorry, I could not fetch the weather data.';
                addMessage(reply);
                speak(reply);
                return;
            }
        }
    }

    // Calculator commands
    if (lowerCommand.includes('calculate') || lowerCommand.includes('compute') || /[\d+\-*/]/.test(command)) {
        const expressionMatch = command.match(/calculate\s+(.+)|compute\s+(.+)|^([\d+\-*/()\s.]+)$/i);
        if (expressionMatch) {
            const expression = (expressionMatch[1] || expressionMatch[2] || expressionMatch[3]).trim();
            try {
                const response = await axios.post('/api/calculate', { expression });
                const reply = `The result is ${response.data.result}`;
                addMessage(reply);
                speak(reply);
                saveToHistory(command, reply);
                return;
            } catch (error) {
                const reply = 'I could not calculate that expression.';
                addMessage(reply);
                speak(reply);
                return;
            }
        }
    }

    // Search commands
    if (lowerCommand.includes('search for') || lowerCommand.includes('look up') || lowerCommand.includes('find information')) {
        const searchMatch = command.match(/search (?:for |about )?(.+)|look up (.+)|find information (?:on |about )?(.+)/i);
        if (searchMatch) {
            const query = (searchMatch[1] || searchMatch[2] || searchMatch[3]).trim();
            try {
                updateStatus('Searching the web...');
                const response = await axios.post('/api/search', { query });
                const { abstract, url, relatedTopics } = response.data;
                
                let reply = abstract || 'No information found.';
                if (url) {
                    reply += ` You can read more at ${url}`;
                }
                
                addMessage(reply);
                speak(abstract || 'No information found');
                saveToHistory(command, reply);
                return;
            } catch (error) {
                console.error('Search error:', error);
            }
        }
    }

    // Exit commands
    if (lowerCommand.includes('exit') || lowerCommand.includes('quit') || lowerCommand.includes('stop jarvis')) {
        const reply = 'Goodbye Rakshith! I am always here when you need me.';
        addMessage(reply);
        speak(reply);
        return;
    }

    // Default: Use AI
    try {
        updateStatus('Thinking...');
        const response = await axios.post('/api/chat', { message: command });
        const reply = response.data.reply;
        addMessage(reply);
        speak(reply);
        saveToHistory(command, reply);
    } catch (error) {
        console.error('AI Error:', error);
        const errorMsg = 'I apologize, but I encountered an error processing your request. Please make sure the OpenAI API key is configured.';
        addMessage(errorMsg);
        speak(errorMsg);
    }
}

// Send command
async function sendCommand() {
    const input = document.getElementById('commandInput');
    const command = input.value.trim();

    if (!command) return;

    addMessage(command, true);
    input.value = '';

    await processCommand(command);
}

// Save to history
async function saveToHistory(command, response) {
    try {
        await axios.post('/api/history', { command, response });
        loadHistory();
    } catch (error) {
        console.error('History save error:', error);
    }
}

// Load history
async function loadHistory() {
    try {
        const response = await axios.get('/api/history');
        const history = response.data.history || [];
        
        const historyDisplay = document.getElementById('historyDisplay');
        
        if (history.length === 0) {
            historyDisplay.innerHTML = '<p class="text-gray-400 text-sm">No commands yet</p>';
            return;
        }

        historyDisplay.innerHTML = history.slice(0, 10).map(item => `
            <div class="text-sm bg-gray-700 p-2 rounded hover:bg-gray-600 cursor-pointer"
                 onclick="document.getElementById('commandInput').value='${item.command.replace(/'/g, "\\'")}'; sendCommand();">
                <i class="fas fa-history mr-2"></i>
                ${item.command}
            </div>
        `).join('');
    } catch (error) {
        console.error('History load error:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    speak('Hello Rakshith. Jarvis online and ready.');
});
