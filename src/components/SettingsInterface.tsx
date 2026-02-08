/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';

const SettingsInterface = () => {
  const [keys, setKeys] = useState({ openai: '', gemini: '' });

  useEffect(() => {
    const loadKeys = async () => {
      const o = await axios.get('/api/settings/openai_key');
      const g = await axios.get('/api/settings/gemini_key');
      setKeys({ openai: o.data.value || '', gemini: g.data.value || '' });
    };
    loadKeys();
  }, []);

  const saveKeys = async () => {
    try {
      await axios.post('/api/settings', { key: 'openai_key', value: keys.openai });
      await axios.post('/api/settings', { key: 'gemini_key', value: keys.gemini });
      toast.success("Neural links updated successfully.");
    } catch (e) {
      toast.error("Failed to update settings.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-bold uppercase tracking-[0.2em]">Core Configuration</h3>
        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest flex items-center justify-center gap-2">
          <ShieldCheck size={12} /> System Authorization Required
        </p>
      </div>

      <div className="space-y-6">
        <div className="group">
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-3 group-focus-within:text-blue-400 transition-colors">Gemini Neural Key</label>
          <input
            type="password"
            value={keys.gemini}
            onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
            className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none focus:border-blue-500/30 transition-all"
            placeholder="••••••••••••••••"
          />
        </div>
        <div className="group">
          <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-3 group-focus-within:text-purple-400 transition-colors">OpenAI Neural Key</label>
          <input
            type="password"
            value={keys.openai}
            onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
            className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/5 outline-none focus:border-blue-500/30 transition-all"
            placeholder="••••••••••••••••"
          />
        </div>
        <button 
          onClick={saveKeys}
          className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20"
        >
          Update Neural Links
        </button>
      </div>
    </div>
  );
};

export default SettingsInterface;