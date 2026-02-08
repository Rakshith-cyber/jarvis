/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StickyNote, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const NotesInterface = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const loadNotes = async () => {
    try {
      const res = await axios.get('/api/notes');
      setNotes(res.data.notes);
    } catch (e) {}
  };

  useEffect(() => { loadNotes(); }, []);

  const createNote = async () => {
    if (!title) return;
    try {
      await axios.post('/api/notes', { title, content });
      setTitle('');
      setContent('');
      loadNotes();
      toast.success("Archive updated.");
    } catch (e) {
      toast.error("Failed to update archive.");
    }
  };

  const deleteNote = async (id: number) => {
    await axios.delete(`/api/notes/${id}`);
    loadNotes();
    toast.success("Archive purged.");
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
        <input 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-gray-700" 
          placeholder="Note Title..." 
        />
        <textarea 
          value={content} 
          onChange={e => setContent(e.target.value)} 
          className="w-full bg-transparent text-sm outline-none min-h-[100px] resize-none placeholder:text-gray-700" 
          placeholder="Neural data to archive..."
        />
        <div className="flex justify-end">
          <button onClick={createNote} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
            <Plus size={14} /> Archive Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(note => (
          <div key={note.id} className="p-6 glass rounded-2xl border-l-4 border-purple-500 relative group border-white/5">
            <button onClick={() => deleteNote(note.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
              <X size={14} />
            </button>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-purple-400">{note.title}</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">{note.content}</p>
          </div>
        ))}
        {notes.length === 0 && <p className="col-span-full text-center py-10 text-gray-600 text-[10px] uppercase tracking-widest">Archives empty</p>}
      </div>
    </div>
  );
};

export default NotesInterface;