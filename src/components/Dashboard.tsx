import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Paper, Book } from '../types';
import { motion } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Activity, 
  Clock,
  FileText,
  ChevronRight,
  PlusCircle,
  UserX
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { allBooks } from '../data/bookData';
import { QuotaDisplay } from './QuotaDisplay';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { profile } = useAuth();
  const [recentPapers, setRecentPapers] = useState<Paper[]>([]);
  const [bookCount, setBookCount] = useState(0);
  const [classCount, setClassCount] = useState(0);

  useEffect(() => {
    // Using static data counts
    const uniqueClasses = new Set(allBooks.map(b => `${b.level}-${b.class}`));
    setBookCount(allBooks.length);
    setClassCount(uniqueClasses.size);
  }, []);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'papers'),
      where('teacherId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const papersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paper));
      // Sort and limit in memory to avoid composite index requirement
      papersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentPapers(papersData.slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'papers');
    });

    const unsubscribeBooks = onSnapshot(collection(db, 'library'), (snapshot) => {
      setBookCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'library');
    });

    return () => {
      unsubscribe();
      unsubscribeBooks();
    };
  }, [profile]);

  const stats = [
    { label: 'کل کلاسز', value: classCount.toString().padStart(2, '0'), sub: 'Subjects Managed', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'کتابیں', value: bookCount.toString(), sub: 'Digital Library', icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'سسٹم سٹیٹس', value: 'Active', sub: 'AI Engine: Gemini Flash', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8">
      {profile?.status === 'deactive' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center justify-between flex-row-reverse shadow-lg shadow-red-500/5"
        >
          <div className="text-right">
            <h3 className="text-red-900 font-bold font-urdu text-xl">آپ کا اکاؤنٹ ڈی ایکٹیو ہے</h3>
            <p className="text-red-600 font-urdu text-base">براہ کرم پیپر جنریشن کے لیے ایڈمن سے رابطہ کریں۔</p>
          </div>
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
            <UserX className="w-7 h-7" />
          </div>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-slate-900 font-urdu mb-2">Assalam-o-Alaikum!</h1>
          <p className="text-xl text-slate-500 font-urdu">الفلاح انسٹیٹیوٹ کے اے آئی پورٹل میں خوش آمدید۔</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => setActiveTab('generator')}
            className="w-full sm:w-auto px-8 py-4 bg-alfalah-primary text-white rounded-2xl font-bold font-urdu shadow-lg shadow-alfalah-primary/20 hover:bg-alfalah-secondary transition-all flex items-center justify-center gap-3 group"
          >
            <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>نیا پیپر بنائیں</span>
          </button>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-sm text-slate-600 font-medium">
            <div className="w-2 h-2 bg-alfalah-vibrant-green rounded-full animate-pulse" />
            <Clock className="w-4 h-4 text-alfalah-primary" />
            <span>Current Session: Spring 2026</span>
          </div>
        </div>
      </div>

      {profile && <QuotaDisplay userId={profile.uid} teacherName={profile.name} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex justify-between items-start mb-6 flex-row-reverse">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("w-7 h-7", stat.color)} />
              </div>
            </div>
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 text-right">{stat.label}</h3>
            <div className="flex items-baseline gap-3 justify-end">
              <span className="text-xs text-slate-400 font-bold order-1">{stat.sub}</span>
              <span className="text-3xl font-black text-slate-900 order-2">{stat.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center flex-row-reverse">
            <h2 className="text-2xl font-bold text-slate-900 font-urdu">حالیہ سرگرمی</h2>
            <button className="text-alfalah-primary text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all group">
              <ChevronRight className="w-4 h-4 rotate-180" /> تمام دیکھیں
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {recentPapers.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {recentPapers.map((paper) => (
                  <div key={paper.id} className="p-6 hover:bg-slate-50/50 transition-all flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-5 flex-row-reverse">
                      <div className="w-12 h-12 bg-alfalah-primary/10 rounded-2xl flex items-center justify-center text-alfalah-primary">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-bold text-slate-900 text-lg">{paper.subject} - {paper.testType}</h4>
                        <p className="text-xs text-slate-400 font-medium">{formatDate(paper.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black bg-alfalah-accent text-alfalah-primary px-3 py-1.5 rounded-full border border-alfalah-primary/10">
                        {paper.classLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-slate-400 font-urdu text-lg">ابھی تک کوئی پیپر تیار نہیں کیا گیا۔</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-900 font-urdu text-right">ٹیچر کوٹہ</h2>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-alfalah-primary/5 rounded-full -mr-16 -mt-16" />
            <div className="text-center mb-8 relative">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Remaining Quota</p>
              <div className="relative w-40 h-40 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    className="text-slate-100 stroke-current"
                    strokeWidth="3"
                    fill="none"
                    cx="18" cy="18" r="15.9155"
                  />
                  <motion.circle
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${((profile?.paperQuota || 0) / ((profile?.paperQuota || 0) + (profile?.quotaUsed || 0) || 5)) * 100}, 100` }}
                    className="text-alfalah-primary stroke-current"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    cx="18" cy="18" r="15.9155"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{profile?.paperQuota}</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Papers Left</span>
                </div>
              </div>
            </div>
            <div className="space-y-6 relative">
              <div className="bg-alfalah-accent/50 p-5 rounded-2xl border border-alfalah-primary/5">
                <p className="text-sm text-alfalah-primary font-urdu leading-relaxed text-right">
                  آپ کے پاس ابھی {profile?.paperQuota} پیپرز کا کوٹہ باقی ہے۔ آپ اب تک {profile?.quotaUsed} پیپر بنا چکے ہیں۔ مزید پیپرز کے لیے کوٹہ بڑھانے کی درخواست کریں۔
                </p>
              </div>
              <button 
                onClick={() => {
                  const message = `Assalam-o-Alaikum! I am ${profile?.name}. I want to request a quota increase for my Alfalah AI account. My current remaining quota is ${profile?.paperQuota} papers.`;
                  const encodedMessage = encodeURIComponent(message);
                  window.open(`https://wa.me/923435159569?text=${encodedMessage}`, '_blank');
                }}
                className="w-full btn-primary py-4 colorful-gradient shadow-lg shadow-alfalah-primary/20 flex items-center justify-center gap-2"
              >
                <span className="text-xl">💬</span>
                <span>کوٹہ بڑھانے کی درخواست کریں</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
