import { GoogleGenerativeAI } from '@google/generative-ai';
import { uploadToCloudinary } from '../lib/cloudinary.js';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface QuizRepository {
  _id: string;
  title: string;
  description?: string;
  documentUrl: string;
  documentType: string;
  fileName: string;
  questions: QuizQuestion[];
  originCourse?: string;
  originModule?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractionError?: string;
}

/**
 * Extract questions from document content using Gemini AI
 */
export async function extractQuestionsWithAI(
  content: string,
  documentType: string
): Promise<QuizQuestion[]> {
  try {
    console.log('🤖 Starting AI question extraction with Gemini...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
You are an expert quiz creator. Extract multiple choice questions from the following content.

REQUIREMENTS:
1. Create questions with exactly 4 options (A, B, C, D)
2. Only ONE option should be correct
3. Questions should be clear and unambiguous
4. Options should be plausible but distinctly different
5. Include an explanation for the correct answer if possible
6. Extract 10-30 questions maximum
7. Focus on key concepts and important information

CONTENT TYPE: ${documentType}

CONTENT:
${content}

OUTPUT FORMAT (JSON):
{
  "questions": [
    {
      "id": "unique_id_1",
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text", 
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Explanation why A is correct"
    }
  ]
}

Only return valid JSON. Do not include any other text or formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🔍 AI Response received, parsing JSON...');
    
    // Clean up the response to ensure valid JSON
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleanedText);
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }
    
    // Validate and clean up questions
    const validQuestions: QuizQuestion[] = parsed.questions
      .filter((q: any) => 
        q.question && 
        q.options && 
        q.options.A && q.options.B && q.options.C && q.options.D &&
        q.correctAnswer && 
        ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
      )
      .map((q: any, index: number) => ({
        id: q.id || `q_${Date.now()}_${index}`,
        question: q.question.trim(),
        options: {
          A: q.options.A.trim(),
          B: q.options.B.trim(),
          C: q.options.C.trim(),
          D: q.options.D.trim()
        },
        correctAnswer: q.correctAnswer as 'A' | 'B' | 'C' | 'D',
        explanation: q.explanation?.trim()
      }));
    
    console.log(`✅ Successfully extracted ${validQuestions.length} questions`);
    return validQuestions;
    
  } catch (error) {
    console.error('❌ AI question extraction failed:', error);
    throw new Error(`Question extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text content from different document types
 */
export async function extractDocumentContent(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const extension = path.extname(fileName).toLowerCase();
  
  console.log(`📄 Extracting content from ${extension} file...`);
  
  try {
    if (extension === '.csv' || mimeType.includes('csv')) {
      // For CSV files, convert to readable text
      const csvContent = fileBuffer.toString('utf-8');
      return `CSV Content:\n${csvContent}`;
    }
    
    if (extension === '.txt' || mimeType.includes('text/plain')) {
      return fileBuffer.toString('utf-8');
    }
    
    if (extension === '.docx' || mimeType.includes('wordprocessingml')) {
      // Extract text from Word documents using mammoth
      console.log('📄 Extracting text from Word document...');
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }
    
    if (extension === '.doc' || mimeType.includes('msword')) {
      // For older .doc files, try to extract as plain text
      console.log('📄 Processing legacy Word document...');
      const content = fileBuffer.toString('utf-8');
      // Remove binary characters and keep readable text
      const cleanContent = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, ' ');
      return cleanContent;
    }
    
    if (extension === '.xlsx' || extension === '.xls' || mimeType.includes('spreadsheet')) {
      // Extract text from Excel files using xlsx
      console.log('📄 Extracting text from Excel document...');
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      let allText = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_txt(sheet);
        allText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      });
      
      return allText;
    }
    
    // Fallback for unsupported formats
    console.warn(`⚠️ Unsupported file format: ${extension}`);
    return `Document Content from ${fileName}:
Unable to extract content from ${extension} files. Please use Word (.docx), Excel (.xlsx), CSV, or TXT files for better extraction results.`;
    
  } catch (error) {
    console.error(`❌ Error extracting content from ${fileName}:`, error);
    throw new Error(`Failed to extract content from ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Randomize questions for student quiz attempt
 */
export function randomizeQuestions(
  questions: QuizQuestion[],
  maxQuestions: number = 10
): QuizQuestion[] {
  if (questions.length <= maxQuestions) {
    // If we have 10 or fewer questions, return all in random order
    return [...questions].sort(() => Math.random() - 0.5);
  }
  
  // Select random questions without duplicates
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, maxQuestions);
}

/**
 * Convert old quiz format to new repository format
 */
export function convertLegacyQuiz(
  legacyQuestions: any[],
  title: string,
  originCourse?: string,
  originModule?: number
): QuizRepository {
  const questions: QuizQuestion[] = legacyQuestions.map((q, index) => ({
    id: `legacy_${Date.now()}_${index}`,
    question: q.text || q.prompt || q.question,
    options: {
      A: q.choices?.[0] || q.options?.[0] || '',
      B: q.choices?.[1] || q.options?.[1] || '',
      C: q.choices?.[2] || q.options?.[2] || '',
      D: q.choices?.[3] || q.options?.[3] || ''
    },
    correctAnswer: (['A', 'B', 'C', 'D'][q.correctIndex] || 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: q.explanation
  }));
  
  return {
    _id: `legacy_${Date.now()}`,
    title,
    questions,
    originCourse,
    originModule,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    extractionStatus: 'completed',
    documentUrl: '',
    documentType: 'legacy',
    fileName: 'legacy_quiz'
  } as QuizRepository;
}

/**
 * Validate quiz question format
 */
export function validateQuizQuestion(question: any): boolean {
  return (
    question &&
    typeof question.question === 'string' &&
    question.options &&
    typeof question.options.A === 'string' &&
    typeof question.options.B === 'string' &&
    typeof question.options.C === 'string' &&
    typeof question.options.D === 'string' &&
    ['A', 'B', 'C', 'D'].includes(question.correctAnswer)
  );
}