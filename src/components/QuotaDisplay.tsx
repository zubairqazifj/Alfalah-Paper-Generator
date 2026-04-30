import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface QuotaDisplayProps {
  userId: string;
  teacherName: string;
}

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({ userId, teacherName }) => {
  const [quota, setQuota] = useState<number | null>(null);
  const adminWhatsApp = "923435159569";

  useEffect(() => {
    if (!userId) return;
    
    const unsub = onSnapshot(doc(db, "teachers", userId), (doc) => {
      if (doc.exists()) {
        setQuota(doc.data()?.paperQuota ?? 0);
      }
    });
    return () => unsub();
  }, [userId]);

  if (quota === null) return null;

  const getTheme = () => {
    if (quota > 1) return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
      accent: 'text-green-900'
    };
    if (quota === 1) return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      accent: 'text-yellow-900'
    };
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      accent: 'text-red-900'
    };
  };

  const theme = getTheme();

  const handleRequestQuota = () => {
    const whatsappMessage = `السلام علیکم! الفلاح ایڈمن! میں ${teacherName} بات کر رہا/رہی ہوں۔ میرا پیپر جنریٹر کوٹہ ختم ہو گیا ہے، براہ کرم اسے بڑھانے کے لیے تفصیلات فراہم کریں۔`;
    const whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-2xl border ${theme.border} ${theme.bg} flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm mb-8`}
      dir="rtl"
    >
      <div className="flex items-center gap-4 flex-row-reverse">
        <div className="p-3 bg-white rounded-xl shadow-sm">
          {theme.icon}
        </div>
        <div className="text-right">
          <h4 className={`text-lg font-bold font-urdu ${theme.accent}`}>Alfalah AI کوٹہ سٹیٹس</h4>
          <p className={`text-sm font-urdu ${theme.text}`}>
            {quota > 0 
              ? `آپ ابھی ${quota} مزید پیپرز بنا سکتے ہیں۔` 
              : "آپ کا فری کوٹہ ختم ہو چکا ہے۔"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 flex-row-reverse">
        {quota === 0 ? (
          <button 
            onClick={handleRequestQuota}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-5 py-2.5 rounded-xl font-urdu font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95"
          >
            <MessageCircle size={18} />
            <span>کوٹہ بڑھوائیں (WhatsApp)</span>
          </button>
        ) : (
          <div className="text-center px-6 border-r border-slate-200/50">
            <div className="w-12 h-12 bg-alfalah-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
              {quota}
            </div>
            <div className={`text-[10px] font-bold font-urdu mt-1 ${theme.text}`}>باقی ہیں</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
