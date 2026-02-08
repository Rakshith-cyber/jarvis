/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Plus, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TasksInterface = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('daily_reminder');
  const [time, setTime] = useState('09:00');

  const loadTasks = async () => {
    try {
      const res = await axios.get('/api/automations');
      setTasks(res.data.automations);
    } catch (e) {}
  };

  useEffect(() => { loadTasks(); }, []);

  const createTask = async () => {
    if (!name || !time) return;
    try {
      await axios.post('/api/automations', { name, task_type: type, schedule: time });
      setName('');
      loadTasks();
      toast.success("Automation protocol initialized.");
    } catch (e) {
      toast.error("Failed to initialize protocol.");
    }
  };

  const deleteTask = async (id: number) => {
    await axios.delete(`/api/automations/${id}`);
    loadTasks();
    toast.success("Protocol purged.");
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Protocol Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50" placeholder="Morning Briefing" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Task Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50">
            <option value="daily_reminder">Daily Reminder</option>
            <option value="weather_check">Weather Check</option>
            <option value="news_digest">News Digest</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Schedule (24h)</label>
          <div className="flex gap-2">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50" />
            <button onClick={createTask} className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl transition-all">
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map(task => (
          <div key={task.id} className="p-5 glass rounded-2xl flex justify-between items-center group border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest">{task.name}</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter flex items-center gap-1 mt-1">
                  <Clock size={10} /> {task.task_type} • {task.schedule}
                </p>
              </div>
            </div>
            <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className="col-span-2 text-center py-10 text-gray-600 text-[10px] uppercase tracking-widest">No active protocols</p>}
      </div>
    </div>
  );
};

export default TasksInterface;