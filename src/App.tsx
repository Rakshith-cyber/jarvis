/** @jsxImportSource react */
import React, { useState } from 'react';
import SystemDashboard from './components/SystemDashboard';
import { MessageSquare, Zap, StickyNote, Settings as SettingsIcon } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <SystemDashboard />

      <nav className="flex justify-center mb-8 space-x-3">
        <TabButton id="chat" active={activeTab} onClick={setActiveTab} icon={<MessageSquare size={16} />} label="Chat" />
        <TabButton id="tasks" active={activeTab} onClick={setActiveTab} icon={<Zap size={16} />} label="Tasks" />
        <TabButton id="notes" active={activeTab} onClick={setActiveTab} icon={<StickyNote size={16} />} label="Notes" />
        <TabButton id="settings" active={activeTab} onClick={setActiveTab} icon={<SettingsIcon size={16} />} label="Core" />
      </nav>

      <main className="glass rounded-3xl p-6 shadow-2xl border-white/5">
        {activeTab === 'chat' && <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-xs">Chat Interface Initializing...</div>}
        {activeTab === 'tasks' && <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-xs">Task Protocols Standby</div>}
        {activeTab === 'notes' && <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-xs">Encrypted Archives Standby</div>}
        {activeTab === 'settings' && <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-xs">Core Configuration Standby</div>}
      </main>
    </div>
  );
};

const TabButton = ({ id, active, onClick, icon, label }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`px-6 py-2.5 rounded-xl glass text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
      active === id ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : ''
    }`}
  >
    {icon} {label}
  </button>
);

export default App;