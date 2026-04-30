import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Download, GraduationCap } from 'lucide-react';
import { allBooks } from '../data/bookData';

export const AlfalahSmartLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const levels = useMemo(() => [...new Set(allBooks.map(b => b.level))], []);
  const classes = useMemo(() => {
    return [...new Set(allBooks.filter(b => b.level === levelFilter || !levelFilter).map(b => b.class))];
  }, [levelFilter]);

  const filteredBooks = useMemo(() => {
    return allBooks.filter(book => {
      const matchesSearch = book.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === "" || book.level === levelFilter;
      const matchesClass = classFilter === "" || book.class === classFilter;
      return matchesSearch && matchesLevel && matchesClass;
    });
  }, [searchTerm, levelFilter, classFilter]);

  return (
    <div className="space-y-8" dir="rtl">
      <div className="text-right">
        <h1 className="text-4xl font-black text-slate-900 font-urdu tracking-tight">الفلاح ڈیجیٹل لائبریری</h1>
        <p className="text-xl text-slate-400 font-urdu mt-1">تمام ضروری کتب یہاں سے ڈاؤن لوڈ کریں۔</p>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="کتاب کا نام تلاش کریں..." 
              className="input-field pr-12 text-right font-urdu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select 
              className="input-field pr-12 text-right font-urdu appearance-none"
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setClassFilter(""); }}
            >
              <option value="">تمام لیول</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="relative">
            <GraduationCap className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select 
              className="input-field pr-12 text-right font-urdu appearance-none disabled:bg-slate-50"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              disabled={!levelFilter}
            >
              <option value="">تمام کلاسیں</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 font-black font-urdu text-right">لیول</th>
                <th className="px-6 py-4 font-black font-urdu text-right">کلاس</th>
                <th className="px-6 py-4 font-black font-urdu text-right">کتاب / مضمون</th>
                <th className="px-6 py-4 font-black font-urdu text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.length > 0 ? (
                filteredBooks.map((book, index) => (
                  <motion.tr 
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest border border-slate-200">
                        {book.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-alfalah-primary/10 text-alfalah-primary rounded-full text-xs font-black border border-alfalah-primary/20">
                        {book.class}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{book.subject}</td>
                    <td className="px-6 py-4 text-center">
                      <a 
                        href={book.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span className="font-urdu">ڈاؤن لوڈ</span>
                      </a>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-urdu text-lg">
                    کوئی کتاب نہیں ملی!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AlfalahSmartLibrary;
