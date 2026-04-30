import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PaperGenerator } from './components/PaperGenerator';
import { PaperHistory } from './components/PaperHistory';
import { Library } from './components/Library';
import { AdminPanel } from './components/AdminPanel';
import { MultiUploadGenerator } from './components/MultiUploadGenerator';
import { AlfalahSmartLibrary } from './components/AlfalahSmartLibrary';
import { Loader2, Menu, MailWarning, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { sendEmailVerification } from 'firebase/auth';

import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [resending, setResending] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-alfalah-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Check for email verification
  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-white/20"
        >
          <div className="flex justify-center mb-8">
            <div className="bg-orange-100 p-5 rounded-[2rem]">
              <MailWarning className="w-12 h-12 text-orange-600" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 urdu-text">ای میل ویریفیکیشن ضروری ہے</h2>
          <p className="text-slate-500 mb-8 urdu-text text-lg leading-relaxed">
            براہ کرم اپنی ای میل ({user.email}) چیک کریں اور ویریفیکیشن لنک پر کلک کریں۔ جب تک آپ ای میل ویریفائی نہیں کریں گے، آپ پورٹل استعمال نہیں کر سکتے۔
          </p>
          
          <div className="space-y-4">
            <button
              onClick={async () => {
                setResending(true);
                try {
                  await sendEmailVerification(user);
                  alert('ویریفیکیشن ای میل دوبارہ بھیج دی گئی ہے۔');
                } catch (err) {
                  alert('ای میل بھیجنے میں مسئلہ ہوا۔ تھوڑی دیر بعد کوشش کریں۔');
                } finally {
                  setResending(false);
                }
              }}
              disabled={resending}
              className="w-full bg-alfalah-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-alfalah-secondary transition-all shadow-lg disabled:opacity-50"
            >
              {resending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              <span className="urdu-text">دوبارہ ای میل بھیجیں</span>
            </button>
            
            <button
              onClick={() => auth.signOut()}
              className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="urdu-text">لاگ آؤٹ کریں</span>
            </button>
          </div>
          
          <p className="mt-8 text-xs text-slate-400 urdu-text">
            ای میل ویریفائی کرنے کے بعد اس پیج کو ریفریش کریں۔
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row-reverse min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-alfalah-secondary p-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-30 no-print">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-alfalah-primary text-white rounded-xl shadow-lg transition-all active:scale-95"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 flex-row-reverse">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-alfalah-primary font-bold text-lg shadow-sm">
            A
          </div>
          <h1 className="text-white font-bold text-lg">Alfalah AI</h1>
        </div>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'generator' && <PaperGenerator />}
          {activeTab === 'multi-upload' && <MultiUploadGenerator />}
          {activeTab === 'history' && <PaperHistory />}
          {activeTab === 'library' && <AlfalahSmartLibrary />}
          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
