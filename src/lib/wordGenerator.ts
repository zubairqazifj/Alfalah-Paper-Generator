import { 
    Document as DocxDocument, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, VerticalAlign
} from "docx";
import { saveAs } from "file-saver";

/**
 * Detects if a string contains Urdu/Arabic characters.
 */
const isUrdu = (text: string): boolean => {
    return /[\u0600-\u06FF]/.test(text);
};

export interface PaperWordParams {
    institution: string;
    subject: string;
    classLevel: string;
    testType: string;
    totalMarks: string | number;
    totalTime: string;
    content: string; // Markdown content
}

/**
 * Downloads a paper as a professional text-based Word document.
 * Supports RTL for Urdu and LTR for English.
 */
export const downloadPaperAsTextWord = async (params: PaperWordParams, filename: string) => {
    const { institution, subject, classLevel, testType, totalMarks, totalTime, content } = params;

    const children: any[] = [];
    const URDU_FONT = "Jameel Noori Nastaleeq";
    const ENGLISH_FONT = "Arial";
    const BLACK_COLOR = "000000";

    // Header: Institution Name
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ 
                    text: institution, 
                    bold: true, 
                    size: 36, 
                    font: URDU_FONT,
                    color: BLACK_COLOR
                }),
            ],
            spacing: { after: 200 },
        })
    );

    const urduHeader = isUrdu(institution) || isUrdu(subject) || isUrdu(classLevel);
    const labels = urduHeader ? {
        subject: "مضمون",
        class: "کلاس",
        marks: "کل نمبر",
        time: "وقت"
    } : {
        subject: "Subject",
        class: "Class",
        marks: "Marks",
        time: "Time"
    };

    // Clean subject: remove .pdf and any class-related suffixes
    const cleanSubject = subject
        .replace(/\.pdf$/i, '')
        .replace(/(_|\s)Class(_|\s)\d+/gi, '')
        .replace(/(_|\s)\d+(th|st|nd|rd)(_|\s)class/gi, '')
        .replace(/_/g, ' ')
        .trim();
    
    // Process classLevel
    const cleanClass = classLevel;

    // Meta Info Table for equal spacing
    children.push(
        new Table({
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
            alignment: AlignmentType.CENTER,
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 25, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({ 
                                alignment: urduHeader ? AlignmentType.RIGHT : AlignmentType.LEFT,
                                bidirectional: urduHeader,
                                children: [new TextRun({ text: `${labels.subject}: ${cleanSubject}`, bold: true, size: 22, font: URDU_FONT })] 
                            })],
                            borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }
                        }),
                        new TableCell({
                            width: { size: 25, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({ 
                                alignment: urduHeader ? AlignmentType.RIGHT : AlignmentType.LEFT,
                                bidirectional: urduHeader,
                                children: [new TextRun({ text: `${labels.class}: ${cleanClass}`, bold: true, size: 22, font: URDU_FONT })] 
                            })],
                            borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }
                        }),
                        new TableCell({
                            width: { size: 25, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({ 
                                alignment: urduHeader ? AlignmentType.RIGHT : AlignmentType.LEFT,
                                bidirectional: urduHeader,
                                children: [new TextRun({ text: `${labels.marks}: ${totalMarks}`, bold: true, size: 22, font: URDU_FONT })] 
                            })],
                            borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }
                        }),
                        new TableCell({
                            width: { size: 25, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({ 
                                alignment: urduHeader ? AlignmentType.RIGHT : AlignmentType.LEFT,
                                bidirectional: urduHeader,
                                children: [new TextRun({ text: `${labels.time}: ${totalTime}`, bold: true, size: 22, font: URDU_FONT })] 
                            })],
                            borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" } }
                        }),
                    ],
                }),
            ],
            borders: {
                top: { style: "none" },
                bottom: { style: "none" },
                left: { style: "none" },
                right: { style: "none" },
                insideHorizontal: { style: "none" },
                insideVertical: { style: "none" },
            }
        })
    );

    // Divider Line
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ 
                    text: "__________________________________________________________________________",
                    color: BLACK_COLOR
                }),
            ],
            spacing: { after: 300 },
        })
    );

    // Process content line by line with robust cleaning
    const cleanContent = content
        .replace(/<[^>]*>?/gm, '') // Strip HTML tags
        .replace(/```html|```markdown|```/g, "") // Strip markdown blocks
        .replace(/oklch\(.*?\)/g, "#000000") // Fix oklch colors
        .replace(/^(Here is your paper:|Certainly!|Sure|I've generated|Certainly|This is your paper|I have prepared|Based on your requirements).*/gi, "") // Strip AI filler
        .replace(/\.pdf|\.docx/gi, ""); // Strip file extensions

    const lines = cleanContent.split('\n');
    
    // Secondary safety: Strip redundant headers from the top
    const metadataPatterns = [
        institution.toLowerCase(),
        subject.toLowerCase(),
        classLevel.toLowerCase(),
        'monthly test',
        'examination',
        'test paper'
    ];

    let startLineIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const trimmed = lines[i].trim().toLowerCase();
        if (!trimmed) continue;
        
        const isMetadata = metadataPatterns.some(pattern => trimmed.includes(pattern));
        if (isMetadata && trimmed.length < 150 && !trimmed.startsWith('###')) {
            startLineIndex = i + 1;
        } else if (trimmed.startsWith('###')) {
            // Found the first real section, stop stripping
            startLineIndex = i;
            break;
        }
    }

    lines.slice(startLineIndex).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const urdu = isUrdu(trimmed);
        const currentFont = urdu ? URDU_FONT : ENGLISH_FONT;

        // Handle Sections (Headings)
        if (trimmed.startsWith('###')) {
            const text = trimmed.replace('###', '').trim();
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ 
                            text, 
                            bold: true, 
                            size: 28, 
                            font: currentFont,
                            rightToLeft: urdu,
                            color: BLACK_COLOR
                        })
                    ],
                    shading: { fill: "F0F0F0" },
                    bidirectional: urdu,
                    spacing: { before: 400, after: 200 },
                })
            );
            return;
        }

        // Handle MCQ Options (Single line with spacing)
        if (trimmed.includes('(A)') || trimmed.includes('(B)') || trimmed.includes('(C)') || trimmed.includes('(D)') ||
            trimmed.includes('(الف)') || trimmed.includes('(ب)') || trimmed.includes('(ج)') || trimmed.includes('(د)')) {
            
            // Replace multiple spaces between options with 2 tabs for better spacing
            const formattedOptions = trimmed
                .replace(/\s{2,}/g, "\t\t")
                .replace(/\)\s+\(/g, ")\t\t(");
            
            children.push(
                new Paragraph({
                    alignment: urdu ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    bidirectional: urdu,
                    children: [
                        new TextRun({ 
                            text: formattedOptions, 
                            size: 22, 
                            font: currentFont,
                            rightToLeft: urdu,
                            color: BLACK_COLOR
                        })
                    ],
                    spacing: { before: 100, after: 100 },
                })
            );
            return;
        }

        // Standard Paragraph
        children.push(
            new Paragraph({
                alignment: urdu ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: urdu,
                children: [
                    new TextRun({ 
                        text: trimmed, 
                        size: 24, 
                        font: currentFont,
                        rightToLeft: urdu,
                        color: BLACK_COLOR
                    })
                ],
                spacing: { before: 100, after: 100 },
            })
        );
    });

    const doc = new DocxDocument({
        sections: [{
            properties: {
                page: {
                    size: {
                        width: 12240, // twips (8.5 inches)
                        height: 20160, // twips (14 inches)
                    },
                    margin: {
                        top: 720, // 0.5 inch
                        right: 720,
                        bottom: 720,
                        left: 720,
                    }
                },
            },
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
};
