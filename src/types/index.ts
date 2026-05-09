export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  paperQuota: number;
  quotaUsed: number;
  status?: 'active' | 'deactive';
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  level: string;
  classLevel: string;
  subject: string;
  board?: string;
  content?: string;
  fileUrl?: string;
  chapters?: string[];
  createdAt?: string;
}

export interface Paper {
  id: string;
  teacherId: string;
  institution: string;
  testType: string;
  subject: string;
  classLevel: string;
  marks: number;
  time: string;
  language: 'English' | 'Urdu' | 'Bilingual';
  content: string;
  createdAt: string;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type PaperPattern = 'Normal' | 'Detailed' | 'Short';
