import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  FileText, 
  Languages, 
  BarChart3, 
  Settings2, 
  Sparkles,
  Printer,
  ChevronLeft,
  Loader2,
  Upload,
  X,
  FileDown,
  PlusCircle,
  BookOpen
} from 'lucide-react';
import { generatePaper, PaperGenerationParams } from '../lib/gemini';
import { useAuth } from '../lib/AuthContext';
import { collection, addDoc, updateDoc, doc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Book as BookType } from '../types';
import { allBooks } from '../data/bookData';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { downloadPaperAsTextWord } from '../lib/wordGenerator';
import { cn, formatClass } from '../lib/utils';
import { extractChaptersContent, extractFullTextFromUrl } from '../lib/pdfUtils';
import { extractChaptersFromText } from '../lib/gemini';

const paperSchema = z.object({
  institution: z.string().min(3, 'Institution name is too short'),
  testType: z.string().min(1, 'Select test type'),
  subject: z.string().min(1, 'Select subject'),
  classLevel: z.string().min(1, 'Select class'),
  level: z.string().min(1, 'Select level'),
  totalMarks: z.number().min(5).max(100),
  totalTime: z.string().min(1),
  language: z.enum(['English', 'Urdu', 'Bilingual']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  specificTopic: z.string().optional(),
  mcqCount: z.number().min(0).max(50),
  shortCount: z.number().min(0).max(50),
  longCount: z.number().min(0).max(20),
});

export const PaperGenerator: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [books, setBooks] = useState<BookType[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [isExtractingChapters, setIsExtractingChapters] = useState(false);

  const loadLessonsFromPDF = async () => {
    if (!watchSubject || !watchLevel || !watchClass) {
      alert("براہ کرم پہلے لیول، کلاس اور مضمون منتخب کریں۔");
      return;
    }

    const currentBook = allMergedBooks.find(b => 
      b.level === watchLevel && 
      b.classLevel === watchClass && 
      b.subject === watchSubject
    );

    const bookUrl = currentBook?.id.startsWith('static-') 
      ? allBooks.find(b => b.subject === watchSubject && b.class === watchClass)?.link
      : (currentBook as any)?.fileUrl;

    if (!bookUrl) {
      alert("اس کتاب کی فائل دستیاب نہیں ہے۔");
      return;
    }

    setIsExtractingChapters(true);
    try {
      const rawText = await extractFullTextFromUrl(bookUrl);
      
      // Use Gemini to extract chapter names from the text
      const extractedChapters = await extractChaptersFromText(rawText.substring(0, 15000));
      
      if (extractedChapters && extractedChapters.length > 0) {
        setChapters(prev => [...new Set([...prev, ...extractedChapters])]);
        alert("اسباق کامیابی سے لوڈ ہو گئے ہیں۔ اب آپ ان کو منتخب کر سکتے ہیں۔");
      } else {
        alert("اسباق کی فہرست نہیں مل سکی۔ آپ مینوئل بھی لکھ سکتے ہیں۔");
      }
    } catch (error) {
      console.error(error);
      alert("پی ڈی ایف سے اسباق نکالنے میں مسئلہ ہوا ہے۔");
    } finally {
      setIsExtractingChapters(false);
    }
  };

  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>(['مکمل کتاب']);
  const [unitInput, setUnitInput] = useState('');
  const paperRef = useRef<HTMLDivElement>(null);

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      institution: 'Alfalah Multi Skills Institute',
      totalMarks: 50,
      totalTime: '60 Mints',
      language: 'English',
      difficulty: 'Medium',
      level: '',
      classLevel: '',
      subject: '',
      mcqCount: 10,
      shortCount: 5,
      longCount: 2
    }
  });

  const watchLevel = watch('level');
  const watchClass = watch('classLevel');
  const watchSubject = watch('subject');
  const watchInstitution = watch('institution');
  const watchTestType = watch('testType');
  const watchTotalMarks = watch('totalMarks');
  const watchTotalTime = watch('totalTime');

  const allMergedBooks = useMemo(() => {
    const staticMerged = allBooks.map(b => ({
      level: b.level,
      classLevel: b.class,
      subject: b.subject,
      id: `static-${b.subject}-${b.class}`
    } as unknown as BookType));
    
    return [...staticMerged, ...books];
  }, [books]);

  // Using Merged Data
  const levels = useMemo(() => [...new Set(allMergedBooks.map(b => b.level))], [allMergedBooks]);
  const classes = useMemo(() => {
    return [...new Set(allMergedBooks.filter(b => b.level === watchLevel).map(b => b.classLevel))];
  }, [watchLevel, allMergedBooks]);
  const subjects = useMemo(() => {
    return allMergedBooks.filter(b => b.level === watchLevel && b.classLevel === watchClass);
  }, [watchLevel, watchClass, allMergedBooks]);

  // Trigger MathJax re-render
  useEffect(() => {
    if (generatedContent && (window as any).MathJax) {
      (window as any).MathJax.typesetPromise?.();
    }
  }, [generatedContent]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'library'), (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookType)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!watchLevel || !watchClass || !watchSubject) {
      setSelectedBook(null);
      return;
    }

    const libraryBook = books.find(b => 
      b.level === watchLevel && 
      b.classLevel === watchClass && 
      b.subject === watchSubject
    );

    const isSameBook = selectedBook?.subject === watchSubject && 
                       selectedBook?.classLevel === watchClass && 
                       selectedBook?.level === watchLevel;

    if (libraryBook) {
      if (!isSameBook || selectedBook?.id !== libraryBook.id) {
        setSelectedBook(libraryBook);
      }
    } else if (!isSameBook) {
      setSelectedBook(null);
    }
  }, [watchLevel, watchClass, watchSubject, books]);

  const onSubmit = async (data: any) => {
    if (!profile) return;
    
    if (profile.status === 'deactive') {
      alert('آپ کا اکاؤنٹ ڈی ایکٹیو ہے۔ براہ کرم ایڈمن سے رابطہ کریں۔');
      return;
    }

    if (profile.paperQuota <= 0) {
      alert("معذرت! آپ کا مفت پیپر کوٹہ ختم ہو چکا ہے۔ مزید پیپرز بنانے کے لیے الفلاح ایڈمن سے رابطہ کریں یا اپنا پلان اپگریڈ کریں۔");
      return;
    }

    setLoading(true);
    try {
      const chapterContext = selectedChapters.includes('مکمل کتاب') 
        ? "مکمل کتاب (Full Book)" 
        : `صرف ان ابواب (Chapters) سے سوالات تیار کریں: ${selectedChapters.join(', ')}`;

      const params: PaperGenerationParams = {
        ...data,
        contentSource: `Subject: ${watchSubject}. Grade: ${watchClass}. Level: ${watchLevel}. ${chapterContext}`,
        specificTopic: data.specificTopic,
        files: []
      };

      const content = await generatePaper(params);
      setGeneratedContent(content);

      // Save to history
      await addDoc(collection(db, 'papers'), {
        ...data,
        teacherId: profile.uid,
        content,
        createdAt: new Date().toISOString(),
      });

      // Update quota
      await updateDoc(doc(db, 'teachers', profile.uid), {
        paperQuota: increment(-1),
        quotaUsed: increment(1)
      });

      alert(`پیپر تیار ہے! اب آپ کے پاس ${profile.paperQuota - 1} پیپرز کا کوٹہ باقی ہے۔`);
    } catch (error) {
      console.error(error);
      alert('Failed to generate paper. Please try again.');
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
        classLevel: formatClass(watchClass || '---', watch('language'), watchLevel),
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
      <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm p-6 lg:p-10 relative no-print shadow-xl" dir="rtl">
        <div className="absolute top-0 left-0 w-40 h-40 bg-alfalah-primary/5 rounded-full -ml-20 -mt-20" />
        
        <div className="text-center mb-10 relative">
          <h1 className="text-[#1e3a8a] text-5xl font-black font-urdu tracking-tight">الفلاح پیپر جنریٹر</h1>
          <div className="h-1.5 w-24 bg-alfalah-primary/20 mx-auto mt-4 rounded-full" />
          <p className="text-slate-500 mt-4 text-lg font-urdu">کتاب منتخب کریں اور مخصوص چیپٹرز سے پیپر تیار کریں۔</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label-urdu">لیول منتخب کریں</label>
              <select {...register('level')} className="input-field">
                <option value="">لیول منتخب کریں</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="label-urdu">کلاس منتخب کریں</label>
              <select {...register('classLevel')} className="input-field">
                <option value="">{!watchLevel ? 'پہلے لیول منتخب کریں' : 'کلاس منتخب کریں'}</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.classLevel && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.classLevel.message as string}</p>}
            </div>

            <div>
              <label className="label-urdu">مضمون / کتاب</label>
              <select {...register('subject')} className="input-field">
                <option value="">{!watchClass ? 'پہلے کلاس منتخب کریں' : 'کتاب منتخب کریں'}</option>
                {subjects.map(s => <option key={s.subject} value={s.subject}>{s.subject}</option>)}
              </select>
              {errors.subject && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.subject.message as string}</p>}
            </div>
          </div>

          <div className="space-y-8">
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                 <label className="label-urdu text-xl flex items-center gap-2">
                   <BookOpen className="w-5 h-5 text-green-600" />
                   کن ابواب سے پیپر بنانا ہے؟
                 </label>
                  <button 
                    type="button"
                    onClick={loadLessonsFromPDF}
                    disabled={isExtractingChapters}
                    className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-urdu hover:bg-green-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isExtractingChapters ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isExtractingChapters ? 'لوڈ ہو رہے ہیں...' : 'اسباق لوڈ کریں'}
                  </button>
              </div>
              
              <div className="bg-slate-50/50 p-6 rounded-3xl border border-dashed border-green-400">
                <label className="label-urdu text-base font-bold mb-3 block text-right">کن ابواب سے پیپر بنانا ہے؟</label>
                
                {/* Manual Input and Add Button */}
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
                    placeholder="باب یا یونٹ کا نام لکھیں (مثلاً: تحریکِ پاکستان)"
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
                    مکمل کتاب
                  </button>
                </div>

                {/* Chapter Selection Options (Loaded from PDF) */}
                {chapters.length > 0 && (
                  <div className="mb-4 pt-4 border-t border-slate-200">
                    <p className="text-right text-xs font-bold text-slate-400 mb-2 font-urdu">کتاب کے ابواب:</p>
                    <div className="flex flex-wrap gap-2">
                      {chapters.map(chapter => (
                        <button
                          key={chapter}
                          type="button"
                          onClick={() => handleChapterChange(chapter)}
                          className={cn(
                            "px-4 py-1.5 rounded-xl text-xs font-urdu transition-all border",
                            selectedChapters.includes(chapter)
                              ? "bg-green-600 border-green-600 text-white shadow-md"
                              : "bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:bg-blue-50"
                          )}
                        >
                          {chapter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Chapters Tags */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                  <p className="w-full text-right text-xs font-bold text-slate-400 mb-2 font-urdu">منتخب شدہ اسباق:</p>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6">
              <div>
                <label className="label-urdu">سکول کا نام</label>
                <input {...register('institution')} type="text" className="input-field" />
                {errors.institution && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.institution.message as string}</p>}
              </div>
              <div>
                <label className="label-urdu">ٹیسٹ کا نام</label>
                <input {...register('testType')} type="text" placeholder="مثلاً Monthly Test" className="input-field" />
                {errors.testType && <p className="text-red-500 text-sm mt-1 font-urdu">{errors.testType.message as string}</p>}
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

            <div className="grid grid-cols-3 gap-4 border-t pt-6">
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

            <div className="mt-6">
              <label className="label-urdu">مخصوص ٹاپک (اختیاری)</label>
              <input 
                {...register('specificTopic')}
                type="text" 
                placeholder="مثلاً: Prompt Engineering" 
                className="input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-10 bg-[#16a34a] hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"
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
                      <span>{isUrduLanguage ? 'کلاس' : 'Class'}: {formatClass(watchClass || "---", language, watchLevel)}</span>
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
                  <p className="text-slate-400 font-medium mt-2">بائیں جانب سے کتاب اور پیپر کی ترتیب منتخب کر کے 'پیپر تیار کریں' پر کلک کریں۔</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
