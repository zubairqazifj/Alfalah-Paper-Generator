import * as pdfjsLib from 'pdfjs-dist';

// یہ لائن براؤزر کو بتاتی ہے کہ پی ڈی ایف پڑھنے والا انجن کہاں سے لینا ہے
// یہ لائن جادو کی طرح کام کرے گی اور ایرر ختم کر دے گی
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

/**
 * Extracts text from specific pages of a PDF file.
 */
export const extractSpecificPages = async (file: File, pageNumbers: number[]): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (const pageNum of pageNumbers) {
    if (pageNum > pdf.numPages) continue;
    
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n';
  }
  
  return fullText;
};

export async function extractChaptersContent(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let indexText = '';

    // پوری کتاب کے بجائے صرف پہلے 8 صفحات پڑھیں (جہاں فہرست ہوتی ہے)
    const pagesToRead = Math.min(8, pdf.numPages);

    for (let i = 1; i <= pagesToRead; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      indexText += pageText + '\n';
    }

    return indexText;
  } catch (error) {
    console.error("PDF Reading Error:", error);
    throw new Error("پی ڈی ایف فائل پڑھنے میں مسئلہ ہوا ہے۔");
  }
}
