import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Library, 
  History, 
  Settings, 
  LogOut, 
  PlusCircle,
  ShieldCheck,
  User,
  Upload,
  X
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { profile, isAdmin } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'ڈیش بورڈ', icon: LayoutDashboard },
    { id: 'generator', label: 'پیپر جنریٹر', icon: PlusCircle },
    { id: 'multi-upload', label: 'ملٹی اپلوڈ', icon: Upload },
    { id: 'library', label: 'ڈیجیٹل لائبریری', icon: Library },
    { id: 'history', label: 'پیپر ہسٹری', icon: History },
    ...(isAdmin ? [{ id: 'admin', label: 'ایڈمن پینل', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className={cn(
      "fixed lg:sticky top-0 right-0 h-screen bg-alfalah-secondary border-l border-white/10 flex flex-col shadow-2xl shadow-black/20 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 w-72",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="p-8 border-b border-white/5 bg-gradient-to-br from-alfalah-secondary to-alfalah-primary/30 flex items-center justify-between flex-row-reverse">
        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-alfalah-primary font-bold text-2xl shadow-lg shadow-black/20">
            A
          </div>
          <div className="text-right">
            <h2 className="font-bold text-xl text-white leading-tight tracking-tight">Alfalah AI</h2>
            <p className="text-[10px] text-alfalah-vibrant-green font-black tracking-[0.2em] uppercase mt-1">Professional Portal</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "sidebar-item w-full text-right flex-row-reverse group",
              activeTab === item.id && "sidebar-item-active"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              activeTab === item.id ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
            )}>
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-white" : "text-white/60"
              )} />
            </div>
            <span className="font-urdu text-xl flex-1">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 bg-black/10">
        <div className="bg-white/5 p-5 rounded-2xl mb-6 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4 flex-row-reverse">
            <div className="w-10 h-10 bg-gradient-to-tr from-white/10 to-white/20 rounded-full flex items-center justify-center border border-white/10">
              <User className="w-5 h-5 text-white/60" />
            </div>
            <div className="text-right flex-1">
              <p className="text-lg font-bold text-white truncate">{profile?.name}</p>
              <p className="text-[10px] text-alfalah-vibrant-green font-bold uppercase tracking-wider">{profile?.role}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
              <span>Left</span>
              <span>Total</span>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((profile?.paperQuota || 0) / ((profile?.paperQuota || 0) + (profile?.quotaUsed || 0) || 5)) * 100}%` }}
                className="h-full bg-gradient-to-r from-alfalah-vibrant-green to-emerald-400 transition-all duration-1000"
              />
            </div>
            <div className="flex justify-between text-xs font-black text-alfalah-vibrant-green">
              <span>{profile?.paperQuota}</span>
              <span>{(profile?.paperQuota || 0) + (profile?.quotaUsed || 0)}</span>
            </div>
            <button 
              onClick={() => {
                const message = `Assalam-o-Alaikum! I am ${profile?.name}. I want to request a quota increase for my Alfalah AI account. My current remaining quota is ${profile?.paperQuota} papers.`;
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/923435159569?text=${encodedMessage}`, '_blank');
              }}
              className="w-full mt-2 text-[10px] font-black text-white/40 hover:text-alfalah-vibrant-green transition-colors uppercase tracking-widest text-right"
            >
              Request Quota Increase
            </button>
          </div>
        </div>

        <button 
          onClick={() => auth.signOut()}
          className="sidebar-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 text-right flex-row-reverse group"
        >
          <div className="p-2 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-urdu text-xl flex-1">لاگ آؤٹ</span>
        </button>
      </div>
    </aside>
  );
};
