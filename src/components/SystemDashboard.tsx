/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { Mic, BrainCircuit, Volume2, VolumeX } from 'lucide-react';

const SystemDashboard = ({ isListening, voiceEnabled }: any) => {
  const [stats, setStats] = useState({ cpu: 12, mem: 4.2, net: 84, uptime: '00:00:00' });
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.floor(Math.random() * 15) + 5,
        mem: parseFloat((Math.random() * 0.5 + 4.0).toFixed(1)),
        net: Math.floor(Math.random() * 40) + 60,
        uptime: formatUptime()
      }));
    }, 3000);

    const uptimeInterval = setInterval(() => {
      setStats(prev => ({ ...prev, uptime: formatUptime() }));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(uptimeInterval);
    };
  }, []);

  const formatUptime = () => {
    const diff = Date.now() - startTime;
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      <div className="lg:col-span-1 flex flex-col justify-center">
        <StatCard label="CPU Load" value={`${stats.cpu}%`} progress={stats.cpu} color="bg-blue-500" />
        <StatCard label="Memory" value={`${stats.mem}GB`} progress={(stats.mem / 8) * 100} color="bg-purple-500" />
      </div>

      <div className="lg:col-span-2 text-center">
        <div className="logo-container mb-4">
          <div className={`logo-base logo-user flex items-center justify-center ${isListening ? 'active' : ''}`}>
            <Mic className="w-10 h-10 text-white" />
          </div>
          <div className={`logo-base logo-ai flex items-center justify-center ${!isListening ? 'active' : ''}`}>
            <BrainCircuit className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">JARVIS</h1>
        <div className={`waveform mt-2 ${isListening ? 'active' : ''}`}>
          {[...Array(5)].map((_, i) => <div key={i} className="bar"></div>)}
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="text-blue-400/40 text-[10px] uppercase tracking-[0.3em]">
            {isListening ? 'Neural Link Active' : 'Neural Link Standby'}
          </p>
          {voiceEnabled ? <Volume2 size={10} className="text-blue-400/40" /> : <VolumeX size={10} className="text-red-400/40" />}
        </div>
      </div>

      <div className="lg:col-span-1 flex flex-col justify-center">
        <StatCard label="Network" value={`${stats.net}ms`} progress={(stats.net / 200) * 100} color="bg-green-500" />
        <StatCard label="Uptime" value={stats.uptime} progress={100} color="bg-yellow-500" />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, progress, color }: any) => (
  <div className="bg-white/5 border border-white/5 p-3 rounded-xl mb-3 last:mb-0">
    <div className="flex justify-between text-[10px] uppercase tracking-tighter text-gray-500 mb-1">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
      <div className={`${color} h-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
    </div>
  </div>
);

export default SystemDashboard;