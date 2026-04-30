import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key (GEMINI_API_KEY) is missing. Please check your environment variables.');
  }
  return new GoogleGenAI({ apiKey });
};

export interface PaperGenerationParams {
  institution: string;
  testType: string;
  subject: string;
  classLevel: string;
  totalMarks: number;
  totalTime: string;
  language: 'English' | 'Urdu' | 'Bilingual';
  difficulty: Difficulty;
  contentSource: string; // e.g. "Full Book" or "Chapters 1, 2"
  specificTopic?: string;
  mcqCount: number;
  shortCount: number;
  longCount: number;
  files?: { data: string; mimeType: string }[];
}

type Difficulty = 'Easy' | 'Medium' | 'Hard';

export async function generatePaper(params: PaperGenerationParams): Promise<string> {
  const ai = getAI();
  const {
    institution,
    testType,
    subject,
    classLevel,
    totalMarks,
    totalTime,
    language,
    difficulty,
    contentSource,
    specificTopic,
    mcqCount,
    shortCount,
    longCount,
    files,
  } = params;

    const prompt = `
    You are an expert Examination Controller. Output ONLY the paper content in a structured text format. 
    STRICTLY FORBIDDEN: Do not generate images, do not use 'oklch' colors, and do not include any technical notes or source citations. 
    Use pure black (#000000) for all text. 
    Format MCQs as single lines with options (A) (B) (C) (D) separated by spaces, not tables.
    For Urdu, use professional academic terminology.

    Institution: ${institution}
    Test Type: ${testType}
    Subject: ${subject}
    Class/Level: ${classLevel}
    Total Marks: ${totalMarks}
    Total Time: ${totalTime}
    Language: ${language}
    Difficulty Level: ${difficulty}
    Content Source: ${contentSource}
    ${specificTopic ? `Specific Topic/Focus: ${specificTopic}` : ''}
    ${files && files.length > 0 ? 'Custom Content: Use the attached files/images as the primary source of questions.' : ''}

    Structural Requirements (MANDATORY):
    - SECTION A: You MUST generate EXACTLY ${mcqCount} Multiple Choice Questions.
    - SECTION B: You MUST generate EXACTLY ${shortCount} Short Answer Questions.
    - SECTION C: You MUST generate EXACTLY ${longCount} Long/Detailed Questions.

    CRITICAL INSTRUCTION: ONLY provide the paper content. DO NOT include any introductory remarks, notes, or extra text. 
    DO NOT include the institution name, subject, class, marks, or time in your output. 
    Start directly with "### Section A: Multiple Choice Questions (MCQs)".

    Output Format (Markdown):
    ---
    ### Section A: Multiple Choice Questions (MCQs)
    1. [Question]
    (A) [Option 1]    (B) [Option 2]    (C) [Option 3]    (D) [Option 4]

    ### Section B: Short Answer Questions
    1. [Question]

    ### Section C: Long Answer Questions
    1. [Question]
    ---
    **[End of Paper]**
  `;

  console.log('Generating paper with params:', { ...params, files: params.files?.length });
  
  const parts: any[] = [{ text: prompt }];

  if (files && files.length > 0) {
    files.forEach(file => {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType,
        }
      });
    });
  }

    try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        maxOutputTokens: 4096,
      }
    });

    console.log('Gemini Response:', response);

    if (!response.text) {
      console.error('Gemini returned no text. Response:', response);
      return "Failed to generate paper.";
    }

    let text = response.text;
    
    // Clean Paper Data Filter (cleanPaperForSale)
    text = text
      // 1. Remove markdown code blocks
      .replace(/```html|```markdown|```/g, "")
      // 2. Remove HTML tags that might leak
      .replace(/<div.*?>|<\/div>|<span.*?>|<\/span>/gi, "")
      // 3. Force all colors to black (replace oklch or other color functions)
      .replace(/oklch\(.*?\)/g, "#000000")
      // 4. Remove AI intro phrases
      .replace(/^(Here is your paper:|Certainly!|Sure|I've generated|Certainly|This is your paper|I have prepared|Based on your requirements).*/gi, "")
      // 5. Remove file extensions or technical notes
      .replace(/\.pdf|\.docx/gi, "")
      .trim();

    // 6. Remove redundant headers (Institution, Subject, Marks, etc.) that AI might repeat
    const metadataPatterns = [
      institution.toLowerCase(),
      subject.toLowerCase(),
      classLevel.toLowerCase(),
      `marks: ${totalMarks}`,
      `time: ${totalTime}`,
      'monthly test',
      'examination',
      'test paper'
    ];
    
    let lines = text.split('\n');
    // We only want to strip headers from the TOP of the document
    let headerLinesRemoved = 0;
    const maxHeaderLinesToCheck = 10; 

    const cleanedLines = lines.filter((line, index) => {
      if (index > maxHeaderLinesToCheck) return true;
      
      const trimmedLine = line.trim().toLowerCase();
      if (!trimmedLine) return true;

      // If the line is just one of the metadata strings, remove it
      const isMetadata = metadataPatterns.some(pattern => {
        if (!pattern) return false;
        return trimmedLine === pattern || trimmedLine.includes(pattern);
      });

      if (isMetadata && trimmedLine.length < 150) {
        headerLinesRemoved++;
        return false;
      }
      return true;
    });

    return cleanedLines.join('\n').trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

/**
 * Extracts chapter names from a given text (usually from a PDF index).
 */
export async function extractChaptersFromText(text: string): Promise<string[]> {
  // اگر ٹیکسٹ خالی ہے تو خاموشی سے واپس جائیں، یوزر سے کچھ نہ مانگیں
  if (!text || text.trim() === "") {
    console.log("No text found to extract chapters.");
    return []; 
  }

  const ai = getAI();
  const prompt = `
    Task: Extract chapter names from the following book text.
    Rules: 
    1. Return ONLY a clean list of chapter names.
    2. If no chapters are found, return an empty array [].
    3. Do NOT explain anything. Do NOT ask the user for text.
    4. Do NOT say "No chapters found" or "Please provide text".
    Text: ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
    });

    const content = response.text;
    if (!content || content.toLowerCase().includes("provide text") || content.toLowerCase().includes("no chapter")) {
      return [];
    }
    
    // Clean and split by lines
    return content
      .split('\n')
      .map(line => line.replace(/[#*`\d.]/g, "").trim())
      .filter(line => line.length > 0);
  } catch (error) {
    console.error('Chapter Extraction Error:', error);
    return [];
  }
}
