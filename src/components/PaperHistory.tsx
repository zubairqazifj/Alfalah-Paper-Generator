import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Paper } from '../types';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Trash2,
  FileText,
  Calendar,
  Tag,
  Printer,
  FileDown
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { downloadPaperAsTextWord } from '../lib/wordGenerator';
import ReactMarkdown from 'react-markdown';

export const PaperHistory: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeletePaper = async (paperId: string) => {
    if (!window.confirm('کیا آپ واقعی یہ پیپر ڈیلیٹ کرنا چاہتے ہیں؟')) return;
    
    setIsDeleting(paperId);
    try {
      await deleteDoc(doc(db, 'papers', paperId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `papers/${paperId}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadPaper = async (paper: Paper) => {
    try {
      await downloadPaperAsTextWord({
        institution: paper.institution,
        subject: paper.subject,
        classLevel: paper.classLevel,
        testType: paper.testType,
        totalMarks: paper.marks,
        totalTime: paper.time,
        content: paper.content
      }, `${paper.subject}_AlFalah`);
    } catch (err) {
      console.error(err);
      alert('Failed to download Word document');
    }
  };

  useEffect(() => {
    if (!profile) return;

    const q = isAdmin 
      ? query(collection(db, 'papers'))
      : query(collection(db, 'papers'), where('teacherId', '==', profile.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const papersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paper));
      // Sort in memory to avoid composite index requirement
      papersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPapers(papersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'papers');
    });

    return () => unsubscribe();
  }, [profile, isAdmin]);

  const filteredPapers = papers.filter(p => 
    p.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.testType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.institution.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6 no-print">
        <h1 className="text-4xl font-bold text-slate-900 font-urdu">پیپر ہسٹری</h1>
        <div className="flex gap-4 w-full md:w-auto flex-row-reverse">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="تلاش کریں..." 
              className="input-field pr-12 text-right font-urdu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-6 h-6 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden no-print">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr className="flex-row-reverse">
                <th className="px-8 py-5 font-urdu text-lg">مضمون</th>
                <th className="px-8 py-5 font-urdu text-lg">عنوان</th>
                <th className="px-8 py-5 font-urdu text-lg">تاریخ</th>
                <th className="px-8 py-5 font-urdu text-lg">کلاس</th>
                <th className="px-8 py-5 font-urdu text-lg text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPapers.map((paper) => (
                <tr key={paper.id} className="hover:bg-slate-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4 justify-end">
                      <span className="text-base font-bold text-slate-900">{paper.subject}</span>
                      <div className="w-10 h-10 bg-alfalah-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Tag className="w-5 h-5 text-alfalah-primary" />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-medium text-slate-600">{paper.testType}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 justify-end text-xs font-bold text-slate-400">
                      <span>{formatDate(paper.createdAt)}</span>
                      <Calendar className="w-4 h-4" />
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full border border-slate-200/50">
                      {paper.classLevel}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => setSelectedPaper(paper)}
                        className="p-2.5 bg-alfalah-primary/5 hover:bg-alfalah-primary hover:text-white rounded-xl text-alfalah-primary transition-all shadow-sm"
                        title="View"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDownloadPaper(paper)}
                        className="p-2.5 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-xl text-blue-500 transition-all shadow-sm" 
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      {(isAdmin || paper.teacherId === profile?.uid) && (
                        <button 
                          onClick={() => handleDeletePaper(paper.id)}
                          disabled={isDeleting === paper.id}
                          className={cn(
                            "p-2.5 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl text-red-500 transition-all shadow-sm",
                            isDeleting === paper.id && "opacity-50 cursor-not-allowed"
                          )}
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-50">
          {filteredPapers.map((paper) => (
            <div key={paper.id} className="p-6 space-y-4">
              <div className="flex justify-between items-start flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="w-10 h-10 bg-alfalah-primary/10 rounded-xl flex items-center justify-center">
                    <Tag className="w-5 h-5 text-alfalah-primary" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-slate-900">{paper.subject}</h4>
                    <p className="text-xs text-slate-400">{paper.testType}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-full border border-slate-200/50">
                  {paper.classLevel}
                </span>
              </div>
              
              <div className="flex justify-between items-center flex-row-reverse">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(paper.createdAt)}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedPaper(paper)}
                    className="p-2 bg-alfalah-primary/5 text-alfalah-primary rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDownloadPaper(paper)}
                    className="p-2 bg-blue-50 text-blue-500 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {(isAdmin || paper.teacherId === profile?.uid) && (
                    <button 
                      onClick={() => handleDeletePaper(paper.id)}
                      disabled={isDeleting === paper.id}
                      className={cn(
                        "p-2 bg-red-50 text-red-500 rounded-lg",
                        isDeleting === paper.id && "opacity-50"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredPapers.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-urdu text-lg">کوئی ریکارڈ نہیں ملا۔</p>
          </div>
        )}
      </div>

      {/* Paper Preview Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-row-reverse">
              <h3 className="font-bold text-2xl text-slate-900 font-urdu">{selectedPaper.subject} - {selectedPaper.testType}</h3>
              <div className="flex gap-3 no-print">
                <button 
                  onClick={() => window.print()}
                  className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm flex items-center gap-2"
                  title="Print"
                >
                  <Printer className="w-4 h-4" /> <span className="font-urdu text-sm">پرنٹ</span>
                </button>
                <button 
                  onClick={async () => {
                    if (!selectedPaper) return;
                    try {
                      await downloadPaperAsTextWord({
                        institution: selectedPaper.institution,
                        subject: selectedPaper.subject,
                        classLevel: selectedPaper.classLevel,
                        testType: selectedPaper.testType,
                        totalMarks: selectedPaper.marks,
                        totalTime: selectedPaper.time,
                        content: selectedPaper.content
                      }, `${selectedPaper.subject}_AlFalah`);
                    } catch (err) {
                      console.error(err);
                      alert('Failed to download Word document');
                    }
                  }}
                  className="btn-primary py-2.5 px-6 text-sm colorful-gradient"
                >
                  <FileDown className="w-4 h-4" /> Word ڈاؤن لوڈ کریں
                </button>
                <button 
                  onClick={() => setSelectedPaper(null)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  بند کریں
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 lg:p-12 bg-alfalah-accent/20">
              <div 
                className={cn(
                  "bg-white p-6 lg:p-12 shadow-xl rounded-3xl border border-slate-100 min-h-full markdown-body",
                  (selectedPaper.language === 'Urdu' || selectedPaper.language === 'Bilingual') ? "text-right" : "text-left"
                )}
                dir={(selectedPaper.language === 'Urdu' || selectedPaper.language === 'Bilingual') ? "rtl" : "ltr"}
              >
                <ReactMarkdown>{selectedPaper.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
