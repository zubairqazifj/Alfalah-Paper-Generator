import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, LogIn, Mail, Lock, User, ArrowRight, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // لاگ ان کامیاب
      console.log(result.user);
    } catch (err: any) {
      console.error("گوگل لاگ ان میں ایرر:", err.message);
      let message = err.message;
      if (err.code === 'auth/unauthorized-domain') {
        message = 'یہ ڈومین فائر بیس میں رجسٹرڈ نہیں ہے۔ براہ کرم فائر بیس کنسول میں "Authorized Domains" میں اس ڈومین کو شامل کریں۔';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('براہ کرم پہلے اپنی ای میل درج کریں۔');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('پاس ورڈ ری سیٹ لنک آپ کی ای میل پر بھیج دیا گیا ہے۔');
      setMode('login');
    } catch (err: any) {
      console.error('Reset Error:', err);
      let message = err.message;
      if (err.code === 'auth/user-not-found') message = 'اس ای میل کے ساتھ کوئی صارف نہیں ملا۔';
      if (err.code === 'auth/invalid-email') message = 'ای میل کا فارمیٹ درست نہیں ہے۔';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      return handleForgotPassword(e);
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        await sendEmailVerification(userCredential.user);
        setSuccess('رجسٹریشن کامیاب! براہ کرم اپنی ای میل ویریفائی کریں۔ ہم نے آپ کو ایک لنک بھیجا ہے۔');
        setMode('login');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          setError('براہ کرم پہلے اپنی ای میل ویریفائی کریں۔ ہم نے رجسٹریشن کے وقت آپ کو لنک بھیجا تھا۔');
        }
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      let message = 'لاگ ان کے دوران ایک غیر متوقع خرابی پیش آئی۔';
      
      if (errorCode === 'auth/user-not-found' || errorMessage.includes('user-not-found')) {
        message = 'اس ای میل کے ساتھ کوئی اکاؤنٹ نہیں ملا۔ براہ کرم ای میل چیک کریں یا رجسٹریشن کریں۔';
      } else if (errorCode === 'auth/wrong-password' || errorMessage.includes('wrong-password')) {
        message = 'آپ کا پاس ورڈ غلط ہے۔ براہ کرم دوبارہ کوشش کریں یا نیچے "پاس ورڈ بھول گئے" والے لنک پر کلک کریں۔';
      } else if (errorCode === 'auth/invalid-credential' || errorMessage.includes('invalid-credential') || errorMessage.includes('invalid-login-credentials')) {
        message = 'ای میل یا پاس ورڈ درست نہیں ہے۔ براہ کرم اپنی معلومات چیک کریں یا پاس ورڈ ری سیٹ کریں۔';
      } else if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
        message = 'یہ ای میل پہلے سے زیر استعمال ہے۔ براہ کرم لاگ ان کریں۔';
      } else if (errorCode === 'auth/weak-password' || errorMessage.includes('weak-password')) {
        message = 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔';
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
        message = 'ای میل کا فارمیٹ درست نہیں ہے۔';
      } else if (errorCode === 'auth/too-many-requests' || errorMessage.includes('too-many-requests')) {
        message = 'بہت زیادہ ناکام کوششیں کی گئیں۔ سیکیورٹی وجوہات کی بنا پر آپ کا اکاؤنٹ عارضی طور پر بلاک کر دیا گیا ہے۔ براہ کرم تھوڑی دیر بعد کوشش کریں۔';
      } else if (errorMessage) {
        // Only use the technical error if we don't have a better Urdu one
        message = `ایرر: ${errorMessage}`;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-alfalah-primary/20 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -ml-64 -mb-64 animate-pulse" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-lg text-center relative z-10 border border-white/20 backdrop-blur-sm"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-alfalah-primary/10 p-5 rounded-[2rem] colorful-gradient shadow-xl shadow-alfalah-primary/20">
            <GraduationCap className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Alfalah <span className="text-alfalah-primary">AI</span></h1>
        <p className="text-slate-400 mb-8 urdu-text text-lg font-black">ٹیچر پورٹل میں آپ کا خیر مقدم ہے</p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl mb-6 text-sm font-bold urdu-text leading-relaxed shadow-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-2 justify-center flex-row-reverse"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="urdu-text">{success}</span>
          </motion.div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-14"
                  required={mode === 'signup'}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-14"
              required
            />
          </div>

          <AnimatePresence mode="wait">
            {mode !== 'forgot' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-14 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-alfalah-primary transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {mode === 'login' && (
            <div className="text-right">
              <button 
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs font-bold text-slate-400 hover:text-alfalah-primary transition-colors urdu-text"
              >
                پاس ورڈ بھول گئے؟
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-alfalah-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-alfalah-secondary transition-all shadow-lg shadow-alfalah-primary/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="urdu-text">
                  {mode === 'login' ? 'لاگ ان کریں' : mode === 'signup' ? 'اکاؤنٹ بنائیں' : 'پاس ورڈ ری سیٹ کریں'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {mode !== 'forgot' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest text-[10px]">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 py-4 rounded-2xl font-black text-slate-700 hover:bg-slate-50 hover:border-alfalah-primary/30 transition-all shadow-sm hover:shadow-xl disabled:opacity-50 group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-base">Sign in with Google</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-col gap-4">
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-alfalah-primary font-black text-sm hover:underline urdu-text"
          >
            {mode === 'login' ? "اکاؤنٹ نہیں ہے؟ رجسٹریشن کریں" : mode === 'signup' ? "پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں" : "واپس لاگ ان پر جائیں"}
          </button>
          
          <div className="pt-6 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Alfalah Multi Skills Institute &copy; 2026
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
