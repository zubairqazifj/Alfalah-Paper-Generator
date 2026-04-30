import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | number | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatClass(classLevel: string, language: string, level: string): string {
  const isUrdu = language === 'Urdu' || language === 'Bilingual' || /[\u0600-\u06FF]/.test(classLevel);
  // Extract number from Class_01 or Class 01
  const match = classLevel.match(/\d+/);
  if (!match) return classLevel;
  
  const classNumStr = match[0];
  const classNum = parseInt(classNumStr);

  if (isUrdu) {
    const urduMap: Record<number, string> = {
      1: 'اول',
      2: 'دوم',
      3: 'سوم',
      4: 'چہارم',
      5: 'پنجم',
      6: 'ششم',
      7: 'ہفتم',
      8: 'ہشتم',
      9: 'نہم',
      10: 'دہم',
      11: 'گیارہویں',
      12: 'بارہویں',
    };
    return urduMap[classNum] || classLevel;
  } else {
    // English
    if (level === 'Primary') {
      const primaryMap: Record<number, string> = {
        1: 'One',
        2: 'Two',
        3: 'Three',
        4: 'Four',
        5: 'Five',
      };
      return primaryMap[classNum] || classLevel;
    } else if (level === 'Middle' || level === 'Matric') {
      const suffix = (n: number) => {
        if (n >= 11 && n <= 13) return 'th';
        switch (n % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };
      return `${classNum}${suffix(classNum)}`;
    } else if (level === 'Inter') {
      if (classNum === 11) return '1st Year';
      if (classNum === 12) return '2nd Year';
      return classLevel;
    }
  }
  return classLevel;
}
