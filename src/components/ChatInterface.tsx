/** @jsxImportSource react */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatInterface = ({ messages, onSend, isProcessing, setMessages }: any) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    onSend(input);
    setInput('');
  };

  const clearLogs = async () => {
    if (!confirm("Purge all neural logs?")) return;
    await axios.delete('/api/history');
    setMessages([]);
    toast.success("Logs purged.");
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isProcessing ? 'bg-blue-500' : 'bg-green-500'}`}></div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {isProcessing ? 'Processing Sequence...' : 'Secure Channel Active'}
          </h3>
        </div>
        <button onClick={clearLogs} className="text-[10px] font-bold text-red-400/40 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1">
          <Trash2 size={10} /> Purge Logs
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 custom-scrollbar">
        {messages.map((msg: any, i: number) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            <div className={`max-w-[85%] p-5 rounded-3xl ${
              msg.role === 'user' 
                ? 'bg-blue-600/90 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Initialize command sequence..."
          className="relative w-full pl-6 pr-16 py-5 bg-[#0a0a0c] rounded-2xl border border-white/5 outline-none focus:border-blue-500/30 transition-all text-sm"
        />
        <button 
          onClick={handleSend}
          disabled={isProcessing}
          className="absolute right-3 top-3 bottom-3 px-5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;