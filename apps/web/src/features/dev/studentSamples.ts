/**
 * Labelled sample content for laying out four student screens in the component catalogue.
 * It is imported only by the development catalogue and never by an app route.
 */
import type { AssessmentQuestion, AttemptResult, Drive, WeeklyTask } from '@/lib/api/student-types'

export const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'q1',
    prompt: 'A train 150 m long passes a pole in 10 seconds. What is its speed in km/h?',
    options: ['45 km/h', '54 km/h', '60 km/h', '72 km/h'],
  },
  {
    id: 'q2',
    prompt: 'Which data structure gives O(1) average time to look up a value by key?',
    options: ['Linked list', 'Hash table', 'Binary search tree', 'Stack'],
  },
  {
    id: 'q3',
    prompt: 'What is the output of 7 % 3 in most programming languages?',
    options: ['0', '1', '2', '3'],
  },
  {
    id: 'q4',
    prompt: 'Choose the sentence that is grammatically correct.',
    options: [
      'Each of the students have submitted the form.',
      'Each of the students has submitted the form.',
      'Each of the students are submitting the form.',
      'Each of the students were submitted the form.',
    ],
  },
  {
    id: 'q5',
    prompt: 'If 3x + 5 = 20, what is the value of x?',
    options: ['3', '4', '5', '6'],
  },
  {
    id: 'q6',
    prompt: 'Which SQL clause filters rows after grouping?',
    options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
  },
]

export const SAMPLE_RESULT: AttemptResult = {
  attemptId: 'sample-attempt',
  assessmentTitle: 'Sample aptitude and core CS test',
  score: 4,
  maxScore: 6,
  timeSpentSeconds: 1260,
  topics: [
    { topic: 'Quantitative aptitude', correct: 2, total: 2 },
    { topic: 'Data structures', correct: 1, total: 2 },
    { topic: 'Verbal ability', correct: 0, total: 1 },
    { topic: 'Databases', correct: 1, total: 1 },
  ],
  answers: [
    {
      questionId: 'q1',
      prompt: SAMPLE_QUESTIONS[0]!.prompt,
      yourAnswer: '54 km/h',
      correctAnswer: '54 km/h',
      correct: true,
      explanation: '150 m in 10 s is 15 m/s, and 15 m/s multiplied by 3.6 is 54 km/h.',
    },
    {
      questionId: 'q2',
      prompt: SAMPLE_QUESTIONS[1]!.prompt,
      yourAnswer: 'Binary search tree',
      correctAnswer: 'Hash table',
      correct: false,
      explanation: 'A balanced search tree takes O(log n). A hash table averages O(1).',
    },
    {
      questionId: 'q4',
      prompt: SAMPLE_QUESTIONS[3]!.prompt,
      yourAnswer: null,
      correctAnswer: 'Each of the students has submitted the form.',
      correct: false,
      explanation: '"Each" is singular, so the verb is "has".',
    },
  ],
  recommended: [
    {
      topic: 'Verbal ability',
      reason: 'You did not answer the one verbal question.',
      to: '/s/training/non-technical',
    },
    {
      topic: 'Data structures',
      reason: 'One of two answers was incorrect.',
      to: '/s/training/technical',
    },
  ],
}

export const SAMPLE_TASKS: WeeklyTask[] = [
  {
    id: 't1',
    title: 'Practise 10 SQL join questions',
    priority: 'high',
    reason: 'SQL is a core skill for Data Analyst, and your last test showed a gap in joins.',
    estimatedMinutes: 45,
    done: false,
  },
  {
    id: 't2',
    title: 'Add a measurable result to your main project',
    priority: 'medium',
    reason: 'Your resume analysis found no numbers in your project descriptions.',
    estimatedMinutes: 20,
    done: false,
  },
  {
    id: 't3',
    title: 'Read the lesson on hash tables',
    priority: 'low',
    reason: 'You marked Backend Developer as an interest, and data structures are a core skill.',
    estimatedMinutes: 30,
    done: true,
  },
]

export const SAMPLE_DRIVE: Drive = {
  id: 'sample-drive',
  company: 'Sample Company',
  role: 'Associate Software Engineer',
  location: 'Hyderabad',
  deadline: '2026-12-05T18:00:00Z',
  summary:
    'A sample drive used to lay out the screen. The criteria below show each status: met, not met and unknown.',
  criteria: [
    {
      id: 'c1',
      label: 'Minimum CGPA',
      requirement: '7.0 or above',
      yourValue: '8.4',
      status: 'met',
    },
    {
      id: 'c2',
      label: 'Active backlogs',
      requirement: 'None',
      yourValue: '1',
      status: 'not_met',
    },
    {
      id: 'c3',
      label: 'Department',
      requirement: 'CSE, IT or ECE',
      yourValue: 'CSE',
      status: 'met',
    },
    {
      id: 'c4',
      label: '10th percentage',
      requirement: '60% or above',
      yourValue: null,
      status: 'unknown',
    },
  ],
}
