export const DETECTION = {
  debounceMs: 4000,
};

export const CARD_CATEGORIES = {
  persona: 'Persona',
  job: 'Job type',
  condition: 'Working condition',
  situation: 'Situation',
};

export const CARDS = [
  { classIndex: 0, id: 'no_card', label: 'No Card', category: 'system', description: 'Background frame', icon: 'NO' },
  { classIndex: 1, id: 'persona_job_seeker', label: 'Job Seeker', category: 'persona', description: 'Looking for work or a new direction', icon: 'JS', key: '1' },
  { classIndex: 2, id: 'persona_student', label: 'Student', category: 'persona', description: 'Studying or recently finished education', icon: 'ST', key: '2' },
  { classIndex: 3, id: 'persona_professional', label: 'Working Professional', category: 'persona', description: 'Employed but looking to grow or change', icon: 'WP', key: '3' },
  { classIndex: 4, id: 'persona_returning', label: 'Returning to Work', category: 'persona', description: 'Re-entering work after a break', icon: 'RT', key: '4' },
  { classIndex: 5, id: 'persona_employer', label: 'Employer', category: 'persona', description: 'Running a business and looking for staff', icon: 'EM', key: '5' },
  { classIndex: 6, id: 'job_plumber', label: 'Plumber', category: 'job', icon: 'PL', key: '6' },
  { classIndex: 7, id: 'job_electrician', label: 'Electrician', category: 'job', icon: 'EL', key: '7' },
  { classIndex: 8, id: 'job_carpenter', label: 'Carpenter / Construction', category: 'job', icon: 'CA', key: '8' },
  { classIndex: 9, id: 'job_catering', label: 'Catering / Hospitality', category: 'job', icon: 'CH', key: '9' },
  { classIndex: 10, id: 'job_healthcare', label: 'Healthcare / Caregiver', category: 'job', icon: 'HC', key: '0' },
  { classIndex: 11, id: 'job_it', label: 'IT / Technology', category: 'job', icon: 'IT', key: 'q' },
  { classIndex: 12, id: 'job_admin', label: 'Administration', category: 'job', icon: 'AD', key: 'w' },
  { classIndex: 13, id: 'job_driver', label: 'Driver / Logistics', category: 'job', icon: 'DL', key: 'e' },
  { classIndex: 14, id: 'condition_flexible', label: 'Flexible Hours', category: 'condition', icon: 'FH', key: 'a' },
  { classIndex: 15, id: 'condition_parttime', label: 'Part-time', category: 'condition', icon: 'PT', key: 's' },
  { classIndex: 16, id: 'condition_fulltime', label: 'Full-time', category: 'condition', icon: 'FT', key: 'd' },
  { classIndex: 17, id: 'condition_remote', label: 'Work Near Home', category: 'condition', icon: 'NH', key: 'f' },
  { classIndex: 18, id: 'situation_no_experience', label: 'No Experience', category: 'situation', description: 'Starting completely fresh', icon: 'NE', key: 'z' },
  { classIndex: 19, id: 'situation_training', label: 'Looking for Training', category: 'situation', description: 'Want to learn a new skill', icon: 'TR', key: 'x' },
  { classIndex: 20, id: 'situation_change', label: 'Changing Career', category: 'situation', description: 'Moving into something completely new', icon: 'CC', key: 'c' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((card) => [card.id, card]));
export const CARD_BY_KEY = Object.fromEntries(CARDS.filter((card) => card.key).map((card) => [card.key, card]));
export const CARD_BY_CLASS_INDEX = Object.fromEntries(CARDS.map((card) => [card.classIndex, card]));
