import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useJarvis = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [recognition, setRecognition] = useState<any>(null);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const sendCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: command }]);

    try {
      const res = await axios.post('/api/command', { command });
      const reply = res.data.response;
      setMessages(prev => [...prev, { role: 'jarvis', content: reply }]);
      speak(reply);
    } catch (error) {
      toast.error("Neural link failure. Check API keys.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        
        if (transcript.includes('jarvis')) {
          setIsListening(true);
          speak("Yes, I am here.");
        } else if (transcript.includes('stop jarvis')) {
          setIsListening(false);
          speak("Going to sleep.");
        } else if (isListening) {
          sendCommand(transcript);
        }
      };

      rec.start();
      setRecognition(rec);
    }
  }, [isListening, sendCommand]);

  const loadHistory = async () => {
    try {
      const res = await axios.get('/api/history');
      const history = res.data.history.reverse().map((item: any) => ([
        { role: 'user', content: item.command },
        { role: 'jarvis', content: item.response }
      ])).flat();
      setMessages(history);
    } catch (e) {}
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return { isListening, isProcessing, messages, sendCommand, setMessages };
};