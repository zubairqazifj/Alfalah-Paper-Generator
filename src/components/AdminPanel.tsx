import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, History, PlusCircle, FileText, Users, ShieldCheck, Settings, Activity, Book, Link, Loader2, Save, Search } from 'lucide-react';
import { collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjs from 'pdfjs-dist';
import { extractChaptersFromText } from '../lib/gemini';

// یہ لائن براؤزر کو بتاتی ہے کہ پی ڈی ایف پڑھنے والا انجن کہاں سے لینا ہے
// یہ لائن جادو کی طرح کام کرے گی اور ایرر ختم کر دے گی
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

export const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalPapers: 0,
    systemHealth: '99.9%',
    activeNow: 3
  });

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setTeachers(users);
      setStats(prev => ({ ...prev, totalTeachers: users.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teachers');
    });

    const unsubscribePapers = onSnapshot(collection(db, 'papers'), (snapshot) => {
      setStats(prev => ({ ...prev, totalPapers: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'papers');
    });

    return () => {
      unsubscribe();
      unsubscribePapers();
    };
  }, [isAdmin]);

  const toggleStatus = async (uid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'deactive' : 'active';
      await updateDoc(doc(db, 'teachers', uid), { status: newStatus });
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  const increaseQuota = async (uid: string, currentLimit: number) => {
    try {
      await updateDoc(doc(db, 'teachers', uid), { paperQuota: currentLimit + 10 });
    } catch (error) {
      console.error(error);
      alert('Failed to update quota');
    }
  };

  // Global Library State
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [extractedChapters, setExtractedChapters] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const convertDriveUrl = (url: string) => {
    const match = url.match(/[-\w]{25,}/);
    if (match) {
      return `https://docs.google.com/uc?export=download&id=${match[0]}`;
    }
    return url;
  };

  const extractChaptersForAdmin = async () => {
    if (!driveUrl) {
      alert('براہ کرم گوگل ڈرائیو لنک درج کریں۔');
      return;
    }
    
    setIsExtracting(true);
    try {
      const directUrl = convertDriveUrl(driveUrl);
      // Use proxy route to bypass CORS
      const response = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(directUrl)}`);
      if (!response.ok) throw new Error('فائل لوڈ کرنے میں ناکامی۔ براہ کرم لنک چیک کریں یا فائل کو پبلک کریں۔');
      
      const arrayBuffer = await response.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      // صرف پہلے 3 صفحات کا متن نکالیں (تاکہ کام جلدی ہو)
      let fullText = "";
      for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(" ");
      }

      const chaptersList = await extractChaptersFromText(fullText); 
      setExtractedChapters(chaptersList);
    } catch (error: any) {
      console.error("Chapter Extraction Error:", error);
      alert(`خرابی: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const saveToGlobalLibrary = async () => {
    if (!bookTitle || !bookSubject || !driveUrl || extractedChapters.length === 0) {
      alert('براہ کرم تمام تفصیلات درج کریں اور ابواب نکالیں۔');
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "global_library"), {
        title: bookTitle,
        subject: bookSubject,
        driveUrl: driveUrl,
        chapters: extractedChapters,
        createdAt: serverTimestamp(),
        addedBy: "Admin"
      });

      alert("کتاب عالمی لائبریری میں کامیابی سے شامل ہوگئی!");
      setBookTitle('');
      setBookSubject('');
      setDriveUrl('');
      setExtractedChapters([]);
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("خرابی: کتاب محفوظ نہیں ہوسکی۔");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'کل اساتذہ', value: stats.totalTeachers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'کل پیپرز', value: stats.totalPapers, icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'سسٹم ہیلتھ', value: stats.systemHealth, icon: Settings, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'آن لائن', value: stats.activeNow, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
        <div className="p-6 bg-green-700 text-white flex justify-between items-center">
          <h2 className="text-2xl font-urdu font-bold">ٹیچر مینجمنٹ کنٹرول پینل</h2>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">کل اساتذہ: {teachers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 font-urdu text-slate-600">ٹیچر کی تفصیلات</th>
                <th className="p-4 font-urdu text-slate-600">سٹیٹس</th>
                <th className="p-4 font-urdu text-slate-600">باقی کوٹہ / استعمال شدہ</th>
                <th className="p-4 font-urdu text-slate-600">آخری لاگ ان</th>
                <th className="p-4 font-urdu text-center text-slate-600">ایکشنز</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.uid} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{teacher.name}</div>
                    <div className="text-xs text-slate-400">{teacher.email}</div>
                  </td>
                  
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      (teacher.status || 'active') === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {(teacher.status || 'active') === "active" ? "فعال" : "بلاکڈ"}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="w-full bg-slate-100 rounded-full h-2 max-w-[120px] mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(teacher.paperQuota / (teacher.paperQuota + teacher.quotaUsed || 5)) * 100}%` }}
                        className="bg-blue-600 h-2 rounded-full" 
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{teacher.paperQuota} باقی / {teacher.quotaUsed} کل</span>
                  </td>

                  <td className="p-4 text-sm text-slate-600 font-urdu">لائیو (Live)</td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => toggleStatus(teacher.uid, teacher.status || 'active')}
                        className={`p-2 rounded-xl transition-all ${
                          (teacher.status || 'active') === "active" 
                            ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white" 
                            : "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white"
                        }`}
                        title={(teacher.status || 'active') === "active" ? "بلاک کریں" : "بحال کریں"}
                      >
                        {(teacher.status || 'active') === "active" ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>

                      <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="ہسٹری دیکھیں">
                        <History size={18} />
                      </button>

                      <button 
                        onClick={() => increaseQuota(teacher.uid, teacher.paperQuota)}
                        className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all" 
                        title="کوٹہ بڑھائیں"
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <h3 className="font-black text-slate-900 flex items-center gap-2 mb-4 font-urdu text-xl">
            <FileText size={20} className="text-green-700" /> حالیہ سرگرمی (Activity Logs)
          </h3>
          <div className="text-lg text-slate-600 space-y-3">
            <div className="flex items-center justify-center bg-white p-8 rounded-xl border border-slate-100 shadow-sm italic text-slate-400 font-urdu">
              کوئی حالیہ سرگرمی موجود نہیں ہے۔
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
