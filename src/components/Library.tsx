import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Book } from '../types';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Upload,
  FileText,
  Search
} from 'lucide-react';

export const Library: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newBook, setNewBook] = useState({
    title: '',
    level: 'Matric',
    classLevel: '',
    subject: '',
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'library'), (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'library');
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'library'), {
        ...newBook,
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setNewBook({ title: '', level: 'Matric', classLevel: '', subject: '' });
    } catch (error) {
      console.error(error);
      alert('Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6">
        <div className="text-right">
          <h1 className="text-4xl font-black text-slate-900 font-urdu tracking-tight">لائبریری مینجمنٹ</h1>
          <p className="text-xl text-slate-400 font-urdu mt-1">کتابیں اپ لوڈ کریں اور مخصوص ابواب سے پیپر تیار کریں۔</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary py-3 px-8 text-lg font-urdu colorful-gradient shadow-lg shadow-alfalah-primary/20"
        >
          <Plus className="w-6 h-6" />
          <span>نئی کتاب شامل کریں</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input 
              type="text" 
              placeholder="کتاب تلاش کریں..." 
              className="input-field pr-14 text-right font-urdu text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBooks.map((book) => (
              <motion.div
                key={book.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 group hover:scale-[1.02] transition-all"
              >
                <div className="flex justify-between items-start mb-6 flex-row-reverse">
                  <div className="p-4 bg-alfalah-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <BookOpen className="w-8 h-8 text-alfalah-primary" />
                  </div>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'library', book.id))}
                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-black text-xl text-slate-900 mb-3 text-right font-urdu line-clamp-1">{book.title}</h3>
                <div className="flex flex-wrap gap-2 mb-6 justify-end">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200/50">{book.level}</span>
                  <span className="text-[10px] font-black bg-alfalah-primary/10 text-alfalah-primary px-3 py-1.5 rounded-full uppercase tracking-widest border border-alfalah-primary/20">{book.classLevel}</span>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-500 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">{book.subject}</span>
                </div>
                <button className="w-full py-3 bg-white border border-slate-100 rounded-xl text-sm font-black text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all shadow-sm">
                  View Chapters
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8 flex-row-reverse">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-black text-xl text-slate-900 font-urdu text-right">ملٹی اپ لوڈر</h3>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center hover:border-alfalah-primary/40 transition-all cursor-pointer bg-slate-50/50 group">
              <Upload className="w-12 h-12 text-slate-200 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-xl font-black text-slate-900 font-urdu">فائلیں یہاں ڈراپ کریں</p>
              <p className="text-sm text-slate-400 mt-2 font-medium">PDF, DOCX, Images</p>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex-row-reverse">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs font-black text-slate-700 truncate">Physics_9th_Notes.pdf</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">2.4 MB • Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 font-urdu">نئی کتاب شامل کریں</h2>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="label-urdu">کتاب کا نام</label>
                <input 
                  required
                  className="input-field"
                  value={newBook.title}
                  onChange={e => setNewBook({...newBook, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-urdu">لیول</label>
                  <select 
                    className="input-field"
                    value={newBook.level}
                    onChange={e => setNewBook({...newBook, level: e.target.value})}
                  >
                    <option value="Matric">Matric</option>
                    <option value="Intermediate">Intermediate</option>
                  </select>
                </div>
                <div>
                  <label className="label-urdu">کلاس</label>
                  <input 
                    required
                    className="input-field"
                    placeholder="e.g. 9th"
                    value={newBook.classLevel}
                    onChange={e => setNewBook({...newBook, classLevel: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="label-urdu">مضمون</label>
                <input 
                  required
                  className="input-field"
                  value={newBook.subject}
                  onChange={e => setNewBook({...newBook, subject: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={loading} className="flex-1 btn-primary">
                  {loading ? 'Adding...' : 'شامل کریں'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50"
                >
                  کینسل
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
