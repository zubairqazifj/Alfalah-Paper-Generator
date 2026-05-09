import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  FileText, 
  Printer,
  Loader2,
  Upload,
  X,
  FileUp,
  FileDown,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { generatePaper, PaperGenerationParams } from '../lib/gemini';
import { useAuth } from '../lib/AuthContext';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { downloadPaperAsTextWord } from '../lib/wordGenerator';
import { cn } from '../lib/utils';

const multiUploadSchema = z.object({
  institution: z.string().min(3, 'Institution name is too short'),
  testType: z.string().min(1, 'Select test type'),
  subject: z.string().min(1, 'Select subject'),
  classLevel: z.string().min(1, 'Select class'),
  totalMarks: z.number().min(5).max(100),
  totalTime: z.string().min(1),
  language: z.enum(['English', 'Urdu', 'Bilingual']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  mcqCount: z.number().min(0).max(50),
  shortCount: z.number().min(0).max(50),
  longCount: z.number().min(0).max(20),
});

type MultiUploadFormData = z.infer<typeof multiUploadSchema>;

export const MultiUploadGenerator: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ data: string; mimeType: string; name: string; size: string; type: string; file?: File }[]>([]);
  const [readingFiles, setReadingFiles] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<MultiUploadFormData>({
    resolver: zodResolver(multiUploadSchema),
    defaultValues: {
      institution: 'Alfalah Multi Skills Institute',
      totalMarks: 50,
      totalTime: '60 Mints',
      language: 'English',
      difficulty: 'Medium',
      mcqCount: 10,
      shortCount: 5,
      longCount: 2,
    }
  });

  const watchInstitution = watch('institution');
  const watchTestType = watch('testType');
  const watchSubject = watch('subject');
  const watchClassLevel = watch('classLevel');
  const watchTotalMarks = watch('totalMarks');
  const watchTotalTime = watch('totalTime');

  const paperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chapter Selection State
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>(['مکمل کتاب']);
  const [unitInput, setUnitInput] = useState('');

  const addManualUnit = () => {
    if (unitInput.trim()) {
      const unit = unitInput.trim();
      setSelectedChapters(prev => {
        const filtered = prev.filter(c => c !== "مکمل کتاب");
        if (filtered.includes(unit)) return filtered;
        return [...filtered, unit];
      });
      setUnitInput('');
    }
  };

  const removeChapter = (chapter: string) => {
    setSelectedChapters(prev => {
      const filtered = prev.filter(c => c !== chapter);
      return filtered.length === 0 ? ["مکمل کتاب"] : filtered;
    });
  };

  const handleChapterChange = (chapter: string) => {
    if (chapter === "مکمل کتاب") {
      setSelectedChapters(["مکمل کتاب"]);
    } else {
      let updated = selectedChapters.filter(c => c !== "مکمل کتاب");
      if (updated.includes(chapter)) {
        updated = updated.filter(c => c !== chapter);
      } else {
        updated.push(chapter);
      }
      setSelectedChapters(updated.length === 0 ? ["مکمل کتاب"] : updated);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log('Files selected:', files.length);

    setReadingFiles(true);
    try {
      const newFiles = await Promise.all(Array.from(files).map(async (file) => {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        let fileType = 'File';
        if (file.type.includes('pdf')) fileType = 'PDF';
        else if (file.type.includes('image')) fileType = 'Image';
        else if (file.type.includes('text')) fileType = 'Text';
        
        return new Promise<{ data: string; mimeType: string; name: string; size: string; type: string; file: File }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            const result = reader.result as string;
            if (!result) {
              reject(new Error(`Failed to read file: ${file.name}`));
              return;
            }
            const base64 = result.split(',')[1];
            
            resolve({ 
              data: base64, 
              mimeType: file.type || 'application/octet-stream', 
              name: file.name,
              size: `${sizeInMB} MB`,
              type: fileType,
              file: file
            });
          };
          reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
          reader.readAsDataURL(file);
        });
      }));

      setUploadedFiles(prev => {
        const combined = [...prev, ...newFiles];
        if (combined.length > 10) {
          alert('آپ زیادہ سے زیادہ 10 فائلیں اپ لوڈ کر سکتے ہیں۔');
          return prev;
        }
        return combined;
      });
    } catch (err: any) {
      console.error('File Upload Error:', err);
      alert(`فائل لوڈ کرنے میں غلطی ہوئی: ${err.message}`);
    } finally {
      setReadingFiles(false);
      // Reset input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: MultiUploadFormData) => {
    if (!profile) return;

    if (profile.status === 'deactive') {
      alert('آپ کا اکاؤنٹ ڈی ایکٹیو ہے۔ براہ کرم ایڈمن سے رابطہ کریں۔');
      return;
    }

    if (profile.paperQuota <= 0) {
      alert("معذرت! آپ کا مفت پیپر کوٹہ ختم ہو چکا ہے۔ مزید پیپرز بنانے کے لیے الفلاح ایڈمن سے رابطہ کریں یا اپنا پلان اپگریڈ کریں۔");
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('براہ کرم کم از کم ایک فائل اپ لوڈ کریں۔');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting paper generation with files:', uploadedFiles.length);
      
      const chapterContext = selectedChapters.includes('مکمل کتاب') 
        ? "تمام اپ لوڈ کردہ فائلیں (All uploaded files)" 
        : `صرف ان ابواب یا ٹاپکس (Chapters/Topics) سے سوالات تیار کریں: ${selectedChapters.join(', ')}`;

      const params: PaperGenerationParams = {
        ...data,
        contentSource: chapterContext,
        files: uploadedFiles.map(f => ({ data: f.data, mimeType: f.mimeType }))
      };

      const content = await generatePaper(params);
      console.log('Paper generated successfully, content length:', content.length);
      setGeneratedContent(content);

      try {
        // Save to history
        await addDoc(collection(db, 'papers'), {
          ...data,
          teacherId: profile.uid,
          content,
          contentSource: 'Multi Upload',
          createdAt: new Date().toISOString(),
        });

        // Update quota
        await updateDoc(doc(db, 'teachers', profile.uid), {
          paperQuota: increment(-1),
          quotaUsed: increment(1)
        });

        alert(`پیپر تیار ہے! اب آپ کے پاس ${profile.paperQuota - 1} پیپرز کا کوٹہ باقی ہے۔`);
      } catch (dbError) {
        console.error('Database Error:', dbError);
        // Don't alert here, as the paper was already generated and shown
      }
    } catch (error: any) {
      console.error('Generation Error:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`پیپر جنریٹ کرنے میں غلطی ہوئی: ${errorMessage}\nبراہ کرم دوبارہ کوشش کریں یا ایڈمن سے رابطہ کریں۔`);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!generatedContent) return;
    
    setLoading(true);
    try {
      const element = document.getElementById('alfalah-paper');
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${(watchSubject || 'Paper').replace(/\.pdf$/i, '')}_AlFalah.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          onclone: (clonedDoc: Document) => {
            const styles = clonedDoc.getElementsByTagName('style');
            for (let i = 0; i < styles.length; i++) {
              const style = styles[i];
              if (style.innerHTML.includes('oklch')) {
                style.innerHTML = style.innerHTML.replace(/oklch\(.*?\)/g, '#000000');
              }
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };


  const downloadWord = async () => {
    if (!generatedContent) return;
    
    setLoading(true);
    try {
      const cleanSubject = (watchSubject || 'Paper').replace(/\.pdf$/i, '');
      await downloadPaperAsTextWord({
        institution: watchInstitution || 'Alfalah Multi Skills Institute',
        subject: watchSubject || '---',
        classLevel: watchClassLevel || '---',
        testType: watchTestType || '---',
        totalMarks: watchTotalMarks || '---',
        totalTime: watchTotalTime || '---',
        content: generatedContent
      }, `${cleanSubject}_AlFalah`);
    } catch (error) {
      console.error('Word Generation Error:', error);
      alert('Failed to generate Word document');
    } finally {
      setLoading(false);
    }
  };

  const printPaper = () => {
    window.print();
  };

  const language = watch('language');
  const isUrduLanguage = language === 'Urdu' || language === 'Bilingual';

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-xl p-6 lg:p-10 relative no-print" dir="rtl">
        <div className="absolute top-0 left-0 w-40 h-40 bg-alfalah-primary/5 rounded-full -ml-20 -mt-20" />
        
        <div className="text-center mb-10 relative">
          <h1 className="text-[#1e3a8a] text-4xl font-black font-urdu tracking-tight">ملٹی اپلوڈ پیپر جنریٹر</h1>
          <div className="h-1.5 w-24 bg-alfalah-primary/20 mx-auto mt-4 rounded-full" />
          <p className="text-slate-500 mt-4 text-lg font-urdu">اپنی فائلیں اپ لوڈ کریں اور ان کی بنیاد پر پیپر تیار کریں۔</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6">
              <div>
                <label className="label-urdu">سکول کا نام</label>
                <input {...register('institution')} type="text" className="input-field" />
                {errors.institution && <p className="text-red-500 text-xs mt-1 font-urdu">{errors.institution.message}</p>}
              </div>
              <div>
                <label className="label-urdu">ٹیسٹ کا نام</label>
                <input {...register('testType')} type="text" placeholder="مثلاً Monthly Test" className="input-field" />
                {errors.testType && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.testType.message}</p>}
              </div>
              <div>
                <label className="label-urdu">پیپر کی زبان</label>
                <select {...register('language')} className="input-field">
                  <option value="English">English</option>
                  <option value="Urdu">Urdu (Nastaliq)</option>
                  <option value="Bilingual">Bilingual (Urdu + English)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
              <div>
                <label className="label-urdu">مضمون</label>
                <input {...register('subject')} type="text" placeholder="مثلاً Physics" className="input-field" />
                {errors.subject && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="label-urdu">کلاس</label>
                <input {...register('classLevel')} type="text" placeholder="مثلاً Class 10" className="input-field" />
                {errors.classLevel && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.classLevel.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6">
              <div>
                <label className="label-urdu">کل نمبر</label>
                <input type="number" {...register('totalMarks', { valueAsNumber: true })} className="input-field" />
              </div>
              <div>
                <label className="label-urdu">وقت</label>
                <input type="text" {...register('totalTime')} className="input-field" />
              </div>
              <div>
                <label className="label-urdu">مشکل</label>
                <select {...register('difficulty')} className="input-field">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="col-span-full grid grid-cols-3 gap-4 border-t pt-6">
              <div>
                <label className="label-urdu">MCQs تعداد</label>
                <input type="number" {...register('mcqCount', { valueAsNumber: true })} className="input-field" />
              </div>
              <div>
                <label className="label-urdu">مختصر سوالات</label>
                <input type="number" {...register('shortCount', { valueAsNumber: true })} className="input-field" />
              </div>
              <div>
                <label className="label-urdu">تفصیلی سوالات</label>
                <input type="number" {...register('longCount', { valueAsNumber: true })} className="input-field" />
              </div>
            </div>

            <div className="col-span-full border-t pt-6">
              <label className="label-urdu text-xl mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                کن ابواب یا ٹاپکس سے پیپر بنانا ہے؟
              </label>
              
              <div className="bg-slate-50/50 p-6 rounded-3xl border border-dashed border-green-400">
                <label className="label-urdu text-base font-bold mb-3 block text-right">عنوانات یا اسباق شامل کریں</label>
                
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={addManualUnit}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 font-urdu font-bold whitespace-nowrap"
                  >
                    شامل کریں +
                  </button>
                  <input 
                    type="text"
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addManualUnit();
                      }
                    }}
                    placeholder="باب یا ٹاپک کا نام لکھیں (مثلاً: تحریکِ پاکستان)"
                    className="input-field py-2.5 text-sm text-right flex-1"
                  />
                </div>

                <div className="flex justify-start mb-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChapterChange('مکمل کتاب')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-urdu font-bold transition-all border shadow-sm",
                      selectedChapters.includes('مکمل کتاب')
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                    )}
                  >
                    مکمل کتاب (اپ لوڈ کردہ تمام مواد)
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                  <p className="w-full text-right text-xs font-bold text-slate-400 mb-2 font-urdu">منتخب شدہ ٹاپکس:</p>
                  <AnimatePresence>
                    {selectedChapters.map(chapter => (
                      <motion.span 
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        key={chapter} 
                        className={cn(
                          "group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-urdu border shadow-[0_2px_8px_-3px_rgba(0,0,0,0.1)] transition-all hover:shadow-md",
                          chapter === 'مکمل کتاب' 
                            ? "bg-blue-600 border-blue-500 text-white" 
                            : "bg-white border-green-200 text-green-800 hover:border-green-400"
                        )}
                      >
                        {chapter}
                        {chapter !== 'مکمل کتاب' && (
                          <button 
                            type="button" 
                            onClick={() => removeChapter(chapter)}
                            className="bg-green-100 group-hover:bg-green-200 text-green-800 rounded-full p-1 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {chapter === 'مکمل کتاب' && (
                          <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
                        )}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {selectedChapters.length === 0 && (
                    <span className="text-slate-400 text-sm font-urdu">کوئی باب منتخب نہیں کیا گیا۔</span>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-full border-t pt-6">
              <label className="label-urdu text-xl mb-4">فائلیں اپ لوڈ کریں</label>
              <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center hover:border-alfalah-primary/40 transition-all cursor-pointer relative group bg-slate-50/50 z-0">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple 
                  accept=".pdf,.jpg,.jpeg,.png,.txt" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  onChange={handleFileUpload} 
                />
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  {readingFiles ? <Loader2 className="w-8 h-8 text-alfalah-primary animate-spin" /> : <FileUp className="w-8 h-8 text-alfalah-primary" />}
                </div>
                <p className="text-xl font-black text-slate-900 font-urdu">{readingFiles ? 'فائلیں لوڈ ہو رہی ہیں...' : 'فائلیں منتخب کریں'}</p>
                <p className="text-sm text-slate-400 mt-2 font-medium">PDF, Images or Text (Max 10 files)</p>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">{file.type}</span>
                          <span className="text-[10px] font-bold text-slate-400">{file.size}</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(idx)} 
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-10 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-7 h-7 animate-spin" />
                <span className="font-urdu">پیپر تیار ہو رہا ہے...</span>
              </>
            ) : (
              <>
                <span className="text-xl">🚀</span>
                <span className="font-urdu">پیپر جنریٹ کریں</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 flex-row-reverse no-print gap-6">
          <div className="flex items-center gap-4 flex-row-reverse">
            <div className="w-12 h-12 bg-alfalah-primary/10 rounded-2xl flex items-center justify-center text-alfalah-primary shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-slate-900 font-urdu leading-tight">پیپر کا پیش نظارہ</h2>
              <p className="text-slate-400 text-sm font-medium">تیار کردہ پیپر یہاں دیکھیں</p>
            </div>
          </div>
          {generatedContent && (
            <div className="flex flex-wrap gap-3 no-print download-buttons w-full sm:w-auto">
              <button 
                onClick={downloadWord}
                className="flex-1 sm:flex-none px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 font-bold group" 
                title="Download Word"
              >
                <FileDown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-urdu">ڈاؤن لوڈ Word</span>
              </button>
              <button 
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="flex-1 sm:flex-none px-6 py-4 bg-green-700 hover:bg-green-800 text-white rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 font-bold group" 
                title="Print Directly"
              >
                <Printer className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-urdu">براہِ راست پرنٹ</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-12 bg-slate-100/50 min-h-[600px] flex justify-center">
          <AnimatePresence mode="wait">
            {generatedContent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white shadow-2xl rounded-none border border-slate-200 overflow-x-auto mx-auto paper-container"
                style={{ width: '210mm', minHeight: '297mm' }}
                id="alfalah-paper"
              >
                <div 
                  id="paper-content" 
                  ref={paperRef} 
                  className={cn(
                    "professional-paper p-12",
                    isUrduLanguage ? "text-right" : "text-left"
                  )}
                  style={{ 
                    fontFamily: 'Jameel Noori Nastaleeq, Urdu Typesetting, serif',
                    backgroundColor: 'white',
                    color: 'black'
                  }}
                  dir={isUrduLanguage ? "rtl" : "ltr"}
                >
                  {/* Watermark */}
                  <div className="watermark-text no-print">Alfalah Institute</div>
                  
                  {/* Professional Header */}
                  <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-4xl font-bold font-urdu leading-loose text-black">
                      {watchInstitution || 'Alfalah Multi Skills Institute'}
                    </h1>
                    <div className="flex justify-between mt-4 text-sm font-bold font-urdu text-black" dir={isUrduLanguage ? "rtl" : "ltr"}>
                      <span>{isUrduLanguage ? 'کلاس' : 'Class'}: {watchClassLevel || "---"}</span>
                      <span>{isUrduLanguage ? 'مضمون' : 'Subject'}: {watchSubject || "---"}</span>
                      <span>{isUrduLanguage ? 'کل نمبر' : 'Marks'}: {watchTotalMarks || "---"}</span>
                      <span>{isUrduLanguage ? 'وقت' : 'Time'}: {watchTotalTime || "---"}</span>
                    </div>
                  </div>

                  {/* Paper Body */}
                  <div 
                    className={cn(
                      "paper-body font-urdu leading-relaxed text-black markdown-body",
                      isUrduLanguage ? "text-right" : "text-left"
                    )}
                    style={{ color: 'black', colorScheme: 'light' }}
                  >
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{generatedContent}</ReactMarkdown>
                  </div>

                  {/* Paper Footer */}
                  <div className="mt-20 text-center border-t-2 border-black pt-4 text-sm font-bold font-urdu no-print">
                    یہ پرچہ الفلاح AI پورٹل سے تیار کیا گیا ہے۔
                  </div>

                  <style>{`
                    @page { size: A4; margin: 0; }
                    @media print {
                      button, .no-print, header, nav, aside { display: none !important; }
                      body { background: white !important; margin: 0 !important; padding: 0 !important; }
                      .paper-container { 
                        box-shadow: none !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        border: none !important;
                      }
                      * { color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                      .professional-paper { padding: 15mm !important; }
                    }
                    .font-urdu { font-family: 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif; }
                    
                    /* MCQ Spacing */
                    .paper-body p { margin-bottom: 0.8rem; }
                  `}</style>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center">
                  <Book className="w-12 h-12 text-slate-200" />
                </div>
                <div>
                  <p className="font-urdu text-2xl font-black text-slate-300">کوئی پیپر تیار نہیں کیا گیا</p>
                  <p className="text-slate-400 font-medium mt-2">فائلیں اپ لوڈ کریں اور 'پیپر جنریٹ کریں' پر کلک کریں۔</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
