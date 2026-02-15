export const categoryMeta = [
  { id: 'bcs', slug: 'bcs', name: 'BCS', description: 'Bangladesh Civil Service preparation track.' },
  { id: 'primary', slug: 'primary', name: 'Primary', description: 'Primary teacher recruitment preparation.' },
  { id: 'ntrca', slug: 'ntrca', name: 'NTRCA', description: 'NTRCA teacher registration preparation.' },
  { id: 'bank', slug: 'bank', name: 'Bank', description: 'Bank job exam preparation.' },
  { id: 'others', slug: 'others', name: 'Others', description: 'Other competitive exam tracks.' }
];

export const categoryMaterials = {
  bcs: [
    { id: 'bcs-syllabus', title: 'BCS Full Syllabus', type: 'pdf', level: 'beginner' },
    { id: 'bcs-math-sheet', title: 'BCS Math Formula Sheet', type: 'note', level: 'intermediate' },
    { id: 'bcs-model-set', title: 'BCS Previous Model Questions', type: 'question-bank', level: 'advanced' }
  ],
  primary: [
    { id: 'primary-pedagogy', title: 'Primary Pedagogy Notes', type: 'note', level: 'beginner' },
    { id: 'primary-bangla', title: 'Primary Bangla Grammar Guide', type: 'pdf', level: 'intermediate' },
    { id: 'primary-mock', title: 'Primary Mock Test Set', type: 'question-bank', level: 'advanced' }
  ],
  ntrca: [
    { id: 'ntrca-syllabus', title: 'NTRCA Syllabus Overview', type: 'pdf', level: 'beginner' },
    { id: 'ntrca-teaching', title: 'Teaching Methods Crash Course', type: 'video', level: 'intermediate' },
    { id: 'ntrca-past-questions', title: 'NTRCA Previous Questions', type: 'question-bank', level: 'advanced' }
  ],
  bank: [
    { id: 'bank-aptitude', title: 'Bank Aptitude Practice Book', type: 'pdf', level: 'beginner' },
    { id: 'bank-english', title: 'Bank English Masterclass', type: 'video', level: 'intermediate' },
    { id: 'bank-short-math', title: 'Short Math Drill Set', type: 'question-bank', level: 'advanced' }
  ],
  others: [
    { id: 'others-gk', title: 'General Knowledge Digest', type: 'pdf', level: 'beginner' },
    { id: 'others-reasoning', title: 'Reasoning Essentials', type: 'note', level: 'intermediate' },
    { id: 'others-mixed-set', title: 'Mixed Practice Set', type: 'question-bank', level: 'advanced' }
  ]
};
