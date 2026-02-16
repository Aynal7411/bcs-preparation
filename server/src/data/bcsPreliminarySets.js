function toOrdinal(value) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) return `${value}st`;
  if (remainder10 === 2 && remainder100 !== 12) return `${value}nd`;
  if (remainder10 === 3 && remainder100 !== 13) return `${value}rd`;
  return `${value}th`;
}

const BASE_PRELIM_QUESTIONS = [
  {
    questionText: 'Bangladesh gained independence in which year?',
    options: ['1969', '1971', '1975', '1981'],
    correctOptionIndex: 1,
    explanation: 'Bangladesh became independent in 1971.'
  },
  {
    questionText: 'Which article of the Constitution covers fundamental rights?',
    options: ['Article 1-7', 'Article 26-47A', 'Article 70', 'Article 102'],
    correctOptionIndex: 1,
    explanation: 'Articles 26 to 47A discuss fundamental rights.'
  },
  {
    questionText: 'The capital of Bangladesh is:',
    options: ['Chattogram', 'Rajshahi', 'Khulna', 'Dhaka'],
    correctOptionIndex: 3,
    explanation: 'Dhaka is the capital city of Bangladesh.'
  },
  {
    questionText: 'Which is the correct synonym of "abundant"?',
    options: ['Scarce', 'Plentiful', 'Narrow', 'Tiny'],
    correctOptionIndex: 1,
    explanation: '"Abundant" means plentiful.'
  },
  {
    questionText: 'What is the value of 15% of 200?',
    options: ['20', '25', '30', '35'],
    correctOptionIndex: 2,
    explanation: '15% of 200 is 30.'
  },
  {
    questionText: 'Which river is known as the longest river in Bangladesh?',
    options: ['Padma', 'Jamuna', 'Meghna', 'Surma'],
    correctOptionIndex: 1,
    explanation: 'Jamuna is considered the longest river in Bangladesh.'
  },
  {
    questionText: 'The founder of the Mughal Empire in India was:',
    options: ['Akbar', 'Babur', 'Humayun', 'Shah Jahan'],
    correctOptionIndex: 1,
    explanation: 'Babur founded the Mughal Empire.'
  },
  {
    questionText: 'Which one is a prime number?',
    options: ['21', '27', '29', '35'],
    correctOptionIndex: 2,
    explanation: '29 is prime.'
  },
  {
    questionText: 'The headquarters of the United Nations is in:',
    options: ['Geneva', 'New York', 'Paris', 'London'],
    correctOptionIndex: 1,
    explanation: 'The UN headquarters is in New York.'
  },
  {
    questionText: 'The opposite of "expand" is:',
    options: ['increase', 'widen', 'contract', 'spread'],
    correctOptionIndex: 2,
    explanation: '"Contract" is the opposite of expand.'
  },
  {
    questionText: 'What is the square root of 144?',
    options: ['10', '11', '12', '13'],
    correctOptionIndex: 2,
    explanation: 'Square root of 144 is 12.'
  },
  {
    questionText: 'Which gas is most responsible for global warming?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    correctOptionIndex: 2,
    explanation: 'Carbon dioxide is a major greenhouse gas.'
  },
  {
    questionText: 'Who wrote the national anthem of Bangladesh?',
    options: ['Kazi Nazrul Islam', 'Jasimuddin', 'Rabindranath Tagore', 'Begum Rokeya'],
    correctOptionIndex: 2,
    explanation: 'Rabindranath Tagore wrote "Amar Sonar Bangla".'
  },
  {
    questionText: 'Which one is the correct past tense of "go"?',
    options: ['goed', 'goes', 'went', 'gone'],
    correctOptionIndex: 2,
    explanation: '"Went" is the past tense of go.'
  },
  {
    questionText: 'What is 7 x 8?',
    options: ['48', '54', '56', '64'],
    correctOptionIndex: 2,
    explanation: '7 multiplied by 8 equals 56.'
  },
  {
    questionText: 'The language movement in Bangladesh is remembered on:',
    options: ['16 December', '21 February', '26 March', '14 April'],
    correctOptionIndex: 1,
    explanation: 'Language martyrs are honored on 21 February.'
  },
  {
    questionText: 'Which continent is Bangladesh located in?',
    options: ['Africa', 'Europe', 'Asia', 'Australia'],
    correctOptionIndex: 2,
    explanation: 'Bangladesh is in Asia.'
  },
  {
    questionText: 'Which one is an example of a renewable energy source?',
    options: ['Coal', 'Natural gas', 'Solar power', 'Diesel'],
    correctOptionIndex: 2,
    explanation: 'Solar power is renewable.'
  },
  {
    questionText: 'The largest planet in the solar system is:',
    options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
    correctOptionIndex: 2,
    explanation: 'Jupiter is the largest planet.'
  },
  {
    questionText: 'Which one is correctly spelled?',
    options: ['Definately', 'Definitely', 'Defanitely', 'Defnitely'],
    correctOptionIndex: 1,
    explanation: 'Correct spelling is "Definitely".'
  },
  {
    questionText: 'What is the sum of angles in a triangle?',
    options: ['90 degrees', '120 degrees', '180 degrees', '360 degrees'],
    correctOptionIndex: 2,
    explanation: 'The sum of interior angles of a triangle is 180 degrees.'
  },
  {
    questionText: 'Which organization conducts BCS examinations?',
    options: ['NTRCA', 'PSC', 'NU', 'UGC'],
    correctOptionIndex: 1,
    explanation: 'Bangladesh Public Service Commission (PSC) conducts BCS.'
  },
  {
    questionText: 'Who is known as the Father of the Nation of Bangladesh?',
    options: ['Ziaur Rahman', 'A. K. Fazlul Huq', 'Sheikh Mujibur Rahman', 'Huseyn Shaheed Suhrawardy'],
    correctOptionIndex: 2,
    explanation: 'Sheikh Mujibur Rahman is known as Father of the Nation.'
  },
  {
    questionText: 'Which one is a correct fraction equivalent to 0.25?',
    options: ['1/2', '1/3', '1/4', '3/4'],
    correctOptionIndex: 2,
    explanation: '0.25 equals 1/4.'
  },
  {
    questionText: 'The term GDP stands for:',
    options: ['Gross Domestic Product', 'General Development Plan', 'Global Domestic Price', 'Gross Development Process'],
    correctOptionIndex: 0,
    explanation: 'GDP means Gross Domestic Product.'
  }
];

function mapQuestionsForBatch(batchNumber, year) {
  const label = `${toOrdinal(batchNumber)} BCS Preliminary (${year})`;
  return BASE_PRELIM_QUESTIONS.map((question, index) => ({
    questionText: `${label} - Q${index + 1}: ${question.questionText}`,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation
  }));
}

export function buildBcsPreliminaryExamSets(startBatch = 10, endBatch = 50) {
  if (startBatch > endBatch) {
    return [];
  }

  const exams = [];
  for (let batchNumber = startBatch; batchNumber <= endBatch; batchNumber += 1) {
    const year = 1978 + batchNumber;
    exams.push({
      title: `${toOrdinal(batchNumber)} BCS Preliminary`,
      category: 'BCS',
      examDate: new Date(`${year}-01-15T00:00:00.000Z`),
      totalMarks: 200,
      durationMinutes: 120,
      isFeatured: batchNumber >= 40,
      enrolledStudents: 0,
      questions: mapQuestionsForBatch(batchNumber, year)
    });
  }

  return exams;
}
