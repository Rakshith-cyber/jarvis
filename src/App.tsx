/** @jsxImportSource react */
import React, { useState } from 'react';
import SystemDashboard from './components/SystemDashboard';
import ChatInterface from './components/ChatInterface';
import SettingsInterface from './components/SettingsInterface';
import TasksInterface from './components/TasksInterface';
import NotesInterface from './components/NotesInterface';
import { useJarvis } from './hooks/useJarvis';
import { MessageSquare, Zap, StickyNote, Settings as SettingsIcon } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { messages, sendCommand, isProcessing, setMessages } = useJarvis();

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <SystemDashboard />

      <nav className="flex justify-center mb-8 space-x-3">
        <TabButton id="chat" active={activeTab} onClick={setActiveTab} icon={<MessageSquare size={16} />} label="Chat" />
        <TabButton id="tasks" active={activeTab} onClick={setActiveTab} icon={<Zap size={16} />} label="Tasks" />
        <TabButton id="notes" active={activeTab} onClick={setActiveTab} icon={<StickyNote size={16} />} label="Notes" />
        <TabButton id="settings" active={activeTab} onClick={setActiveTab} icon={<SettingsIcon size={16} />} label="Core" />
      </nav>

      <main className="glass rounded-3xl p-6 shadow-2xl border-white/5 min-h-[400px]">
        {activeTab === 'chat' && (
          <ChatInterface 
            messages={messages} 
            onSend={sendCommand} 
            isProcessing={isProcessing} 
            setMessages={setMessages}
          />
        )}
        {activeTab === 'tasks' && <TasksInterface />}
        {activeTab === 'notes' && <NotesInterface />}
        {activeTab === 'settings' && <SettingsInterface />}
      </main>
    </div>
  );
};

const TabButton = ({ id, active, onClick, icon, label }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`px-6 py-2.5 rounded-xl glass text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
      active === id ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {icon} {label}
  </button>
);

export default App;