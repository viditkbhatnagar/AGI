import { Request, Response } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client, LocalAuth, Message } = require('whatsapp-web.js');
import { Student } from '../models/student';
import { Course } from '../models/course';
import { Enrollment } from '../models/enrollment';
import Quiz from '../models/quiz';
import mongoose from 'mongoose';
import QRCode from 'qrcode';

// Store active quiz sessions
interface QuizSession {
  type: 'quiz';
  studentId: string;
  courseSlug: string;
  moduleIndex: number;
  currentQuestionIndex: number;
  answers: number[];
  quizId: string;
  startTime: Date;
}

const activeSessions = new Map<string, any>();

// WhatsApp client initialization
let whatsappClient: any = null;
let currentQRCode: string | null = null;
let isClientReady: boolean = false;

export const initializeWhatsApp = () => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-session' // Persistent session storage
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    }
  });

  whatsappClient.on('qr', (qr: string) => {
    console.log('QR RECEIVED - Please scan this QR code with your WhatsApp mobile app');
    currentQRCode = qr;
    isClientReady = false;
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isClientReady = true;
    currentQRCode = null; // Clear QR code once connected
  });

  whatsappClient.on('disconnected', (reason: string) => {
    console.log('WhatsApp client disconnected:', reason);
    isClientReady = false;
    currentQRCode = null;
  });

  whatsappClient.on('message', handleIncomingMessage);

  whatsappClient.initialize();
};

// Normalize phone number for consistent matching
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
    // Indian number with country code
    return digitsOnly;
  } else if (digitsOnly.length === 10) {
    // Indian number without country code
    return '91' + digitsOnly;
  } else if (digitsOnly.startsWith('971') && digitsOnly.length === 12) {
    // UAE number
    return digitsOnly;
  } else if (digitsOnly.startsWith('966') && digitsOnly.length === 12) {
    // Saudi number
    return digitsOnly;
  } else if (digitsOnly.startsWith('968') && digitsOnly.length === 12) {
    // Oman number
    return digitsOnly;
  } else if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    // US/Canada number
    return digitsOnly;
  }
  
  return digitsOnly; // Return as-is for other formats
};

// Handle incoming WhatsApp messages
const handleIncomingMessage = async (message: any) => {
  try {
    const rawPhoneNumber = message.from.replace('@c.us', '');
    const messageText = message.body.trim().toLowerCase();
    
    console.log(`📱 WhatsApp message from: ${rawPhoneNumber}`);
    console.log(`📝 Message: ${messageText}`);
    
    const normalizedWhatsAppNumber = normalizePhoneNumber(rawPhoneNumber);
    console.log(`🔄 Normalized WhatsApp number: ${normalizedWhatsAppNumber}`);

    // Try to find student by multiple phone number formats
    let student = null;
    
    // First try exact match
    student = await Student.findOne({ phone: rawPhoneNumber });
    
    if (!student) {
      // Try with normalized numbers
      const students = await Student.find({});
      student = students.find(s => {
        if (!s.phone) return false;
        const normalizedDbNumber = normalizePhoneNumber(s.phone);
        console.log(`🔍 Comparing ${normalizedWhatsAppNumber} with ${normalizedDbNumber} (${s.name})`);
        return normalizedDbNumber === normalizedWhatsAppNumber;
      });
    }
    
    if (!student) {
      console.log(`❌ No student found for phone: ${rawPhoneNumber} (normalized: ${normalizedWhatsAppNumber})`);
      await message.reply('📚 Welcome to AGI LMS! Please register your phone number in the portal first.');
      return;
    }
    
    console.log(`✅ Student found: ${student.name} (${student.phone})`);
    const phoneNumber = rawPhoneNumber; // Use original for session management

    // Handle all messages (commands and menu selections)
    await handleBotCommand(message, phoneNumber, student);

  } catch (error) {
    console.error('Error handling WhatsApp message:', error);
    await message.reply('❌ Sorry, something went wrong. Please try again.');
  }
};

// Handle bot commands and interactive responses
const handleBotCommand = async (message: any, phoneNumber: string, student: any) => {
  const originalMessage = message.body.trim();
  const command = originalMessage.toLowerCase();
  
  console.log(`🎯 HandleBotCommand: "${originalMessage}" (lowercase: "${command}")`);
  
  // Check if user is in an active session
  const activeSession = activeSessions.get(phoneNumber);
  console.log(`🔍 Looking for session for phone: ${phoneNumber}`);
  console.log(`🗂️ Active sessions count: ${activeSessions.size}`);
  console.log(`📋 Active sessions:`, Array.from(activeSessions.keys()));
  
  if (activeSession) {
    console.log(`📱 Active session found: ${activeSession.type}`);
    await handleSessionResponse(message, phoneNumber, student, originalMessage, activeSession);
    return;
  }
  
  console.log(`📋 No active session, processing main menu command: "${command}"`);
  
  // Handle main menu commands
  switch (command) {
    case '/start':
    case '/menu':
    case 'hi':
    case 'hello':
      console.log(`🏠 Showing main menu`);
      await showMainMenu(message);
      break;
      
    case '/courses':
    case '1':
      console.log(`📚 Showing courses`);
      await showCourses(message, student);
      break;
      
    case '/progress':
    case '2':
      console.log(`📊 Showing progress`);
      await showProgress(message, student);
      break;
      
    case '/help':
    case '3':
      console.log(`❓ Showing help`);
      await showHelp(message);
      break;
      
    default:
      if (command.startsWith('/quiz ')) {
        // Use original message to preserve case for course slug
        const parts = originalMessage.split(' ');
        if (parts.length === 3) {
          const courseSlug = parts[1]; // Preserve original case
          const moduleIndex = parseInt(parts[2]);
          console.log(`🎯 Quiz request: courseSlug="${courseSlug}", moduleIndex=${moduleIndex}`);
          await startQuiz(message, phoneNumber, student, courseSlug, moduleIndex);
        } else {
          await message.reply('❌ Invalid format. Use: /quiz [course-slug] [module-number]');
        }
      } else {
        await message.reply('❓ Unknown command. Type /start to see the main menu.');
      }
  }
};

// Handle session-based responses (course selection, module selection, etc.)
const handleSessionResponse = async (message: any, phoneNumber: string, student: any, userInput: string, session: any) => {
  const input = userInput.trim();
  
  if (session.type === 'course_selection') {
    const courseIndex = parseInt(input) - 1;
    
    if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= session.courses.length) {
      await message.reply('❌ Invalid selection. Please choose a valid course number.');
      return;
    }
    
    const selectedEnrollment = session.courses[courseIndex];
    await showModules(message, phoneNumber, student, selectedEnrollment);
  } 
  else if (session.type === 'module_selection') {
    const moduleIndex = parseInt(input) - 1;
    
    if (isNaN(moduleIndex) || moduleIndex < 0 || moduleIndex >= session.totalModules) {
      await message.reply('❌ Invalid selection. Please choose a valid module number.');
      return;
    }
    
    // Clear session and start quiz
    activeSessions.delete(phoneNumber);
    await startQuiz(message, phoneNumber, student, session.courseSlug, moduleIndex + 1);
  }
  else if (session.type === 'quiz') {
    // Handle quiz answers - let the existing handleQuizAnswer function handle the parsing
    await handleQuizAnswer(message, phoneNumber, session);
  }
};

// Show modules for a selected course
const showModules = async (message: any, phoneNumber: string, student: any, enrollment: any) => {
  try {
    const course = await Course.findOne({ slug: enrollment.courseSlug });
    
    if (!course) {
      await message.reply('❌ Course not found.');
      return;
    }
    
    let modulesText = `📖 *${course.title}*\n\nSelect a module to take quiz:\n\n`;
    
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const isCompleted = enrollment.completedModules?.includes(i) ? '✅' : '⏳';
      
      modulesText += `*${i + 1}.* ${isCompleted} ${module.title}\n`;
    }
    
    modulesText += `\n_Reply with the module number (1-${course.modules.length}) to start quiz_`;
    
    // Store module selection session
    activeSessions.set(phoneNumber, {
      type: 'module_selection',
      courseSlug: course.slug,
      totalModules: course.modules.length,
      timestamp: Date.now()
    });
    
    await message.reply(modulesText);
  } catch (error) {
    console.error('Error showing modules:', error);
    await message.reply('❌ Error fetching modules. Please try again.');
  }
};

// Show main menu with interactive options
const showMainMenu = async (message: any) => {
  const menuText = `🎓 *Welcome to AGI LMS Quiz Bot!*

Choose an option below:

📚 Reply with *1* for My Courses
📊 Reply with *2* for My Progress  
❓ Reply with *3* for Help

_Simply type the number of your choice_`;
  
  await message.reply(menuText);
};

// Show enrolled courses with numbered options
const showCourses = async (message: any, student: any) => {
  try {
    const enrollments = await Enrollment.find({ studentId: student._id });
    
    if (enrollments.length === 0) {
      await message.reply('📚 You are not enrolled in any courses yet.');
      return;
    }

    let coursesText = '📚 *Your Enrolled Courses:*\n\nSelect a course to view modules:\n\n';
    
    for (let i = 0; i < enrollments.length; i++) {
      const enrollment = enrollments[i];
      const course = await Course.findOne({ slug: enrollment.courseSlug });
      if (course) {
        const completedModules = enrollment.completedModules?.length || 0;
        const totalModules = course.modules.length;
        const progressPercent = Math.round((completedModules / totalModules) * 100);
        
        coursesText += `*${i + 1}.* 🎯 ${course.title}\n`;
        coursesText += `   📈 Progress: ${completedModules}/${totalModules} (${progressPercent}%)\n\n`;
      }
    }
    
    coursesText += `_Reply with the course number (1-${enrollments.length}) to see modules_`;
    
    // Store courses in session for selection
    const phoneNumber = message.from.replace('@c.us', '');
    console.log(`💾 Setting course_selection session for phone: ${phoneNumber}`);
    console.log(`📚 Storing ${enrollments.length} courses in session`);
    activeSessions.set(phoneNumber, {
      type: 'course_selection',
      courses: enrollments,
      timestamp: Date.now()
    });
    console.log(`✅ Session set. Total active sessions: ${activeSessions.size}`);
    await message.reply(coursesText);
  } catch (error) {
    console.error('Error showing courses:', error);
    await message.reply('❌ Error fetching courses. Please try again.');
  }
};

// Show student progress
const showProgress = async (message: any, student: any) => {
  try {
    const enrollments = await Enrollment.find({ studentId: student._id });
    
    if (enrollments.length === 0) {
      await message.reply('📊 No progress data available. Please enroll in a course first.');
      return;
    }

    let progressText = '📊 *Your Progress Summary:*\n\n';
    
    for (const enrollment of enrollments) {
      const course = await Course.findOne({ slug: enrollment.courseSlug });
      if (course) {
        const quizAttempts = enrollment.quizAttempts || [];
        const avgScore = quizAttempts.length > 0 
          ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length)
          : 0;
        
        progressText += `🎯 *${course.title}*\n`;
        progressText += `   📝 Quiz Attempts: ${quizAttempts.length}\n`;
        progressText += `   📊 Average Score: ${avgScore}%\n`;
        progressText += `   🏆 Modules Completed: ${enrollment.completedModules?.length || 0}/${course.modules.length}\n\n`;
      }
    }
    
    await message.reply(progressText);
  } catch (error) {
    console.error('Error showing progress:', error);
    await message.reply('❌ Error fetching progress. Please try again.');
  }
};

// Start a quiz
const startQuiz = async (
  message: any, 
  phoneNumber: string, 
  student: any, 
  courseSlug: string, 
  moduleIndex: number
) => {
  try {
    // Validate enrollment
    const enrollment = await Enrollment.findOne({ 
      studentId: student._id, 
      courseSlug 
    });
    
    if (!enrollment) {
      await message.reply('❌ You are not enrolled in this course.');
      return;
    }

    // Get course and check module exists
    const course = await Course.findOne({ slug: courseSlug });
    if (!course || !course.modules[moduleIndex]) {
      await message.reply('❌ Invalid course or module number.');
      return;
    }

    // Check if module is unlocked
    if (moduleIndex > 0) {
      const completedModules = enrollment.completedModules || [];
      const previousModuleCompleted = completedModules.some(
        (cm: any) => cm.moduleIndex === moduleIndex - 1
      );
      
      if (!previousModuleCompleted) {
        await message.reply(`🔒 Module ${moduleIndex + 1} is locked. Complete the previous module first.`);
        return;
      }
    }

    // Find quiz for this module
    const quiz = await Quiz.findOne({ courseSlug, moduleIndex });
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      await message.reply('❌ No quiz available for this module.');
      return;
    }

    // Create quiz session
    const session: QuizSession = {
      type: 'quiz',
      studentId: student._id.toString(),
      courseSlug,
      moduleIndex,
      currentQuestionIndex: 0,
      answers: [],
      quizId: quiz._id?.toString() || '', // Handle potential undefined _id
      startTime: new Date()
    };
    
    activeSessions.set(phoneNumber, session);

    // Send first question
    await sendQuizQuestion(message, session, quiz);
    
  } catch (error) {
    console.error('Error starting quiz:', error);
    await message.reply('❌ Error starting quiz. Please try again.');
  }
};

// Send quiz question
const sendQuizQuestion = async (message: any, session: QuizSession, quiz: any) => {
  const question = quiz.questions[session.currentQuestionIndex];
  const questionNumber = session.currentQuestionIndex + 1;
  const totalQuestions = quiz.questions.length;
  
  let questionText = `🧩 *Quiz Question ${questionNumber}/${totalQuestions}*\n\n`;
  questionText += `❓ ${question.text}\n\n`;
  
  question.choices.forEach((choice: string, index: number) => {
    questionText += `${index + 1}. ${choice}\n`;
  });
  
  questionText += `\n💡 Reply with the number (1-${question.choices.length}) of your answer.`;
  questionText += `\n⏹️ Type 'quit' to exit the quiz.`;
  
  await message.reply(questionText);
};

// Handle quiz answer
const handleQuizAnswer = async (message: any, phoneNumber: string, session: QuizSession) => {
  const answerText = message.body.trim().toLowerCase();
  
  if (answerText === 'quit') {
    activeSessions.delete(phoneNumber);
    await message.reply('❌ Quiz cancelled. Your progress was not saved.');
    return;
  }

  const answerIndex = parseInt(answerText) - 1;
  const quiz = await Quiz.findById(session.quizId);
  
  if (!quiz) {
    activeSessions.delete(phoneNumber);
    await message.reply('❌ Quiz not found. Session ended.');
    return;
  }

  const currentQuestion = quiz.questions[session.currentQuestionIndex];
  
  if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= currentQuestion.choices.length) {
    await message.reply(`❌ Invalid answer. Please reply with a number between 1 and ${currentQuestion.choices.length}.`);
    return;
  }

  // Store answer
  session.answers.push(answerIndex);
  session.currentQuestionIndex++;

  // Check if quiz is complete
  if (session.currentQuestionIndex >= quiz.questions.length) {
    await completeQuiz(message, phoneNumber, session, quiz);
  } else {
    // Send next question
    await sendQuizQuestion(message, session, quiz);
  }
};

// Complete quiz and save results
const completeQuiz = async (message: any, phoneNumber: string, session: QuizSession, quiz: any) => {
  try {
    // Calculate score
    let correctAnswers = 0;
    quiz.questions.forEach((question: any, index: number) => {
      if (session.answers[index] === question.correctIndex) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const passed = score >= 70; // 70% passing grade
    
    // Save quiz attempt to enrollment
    const enrollment = await Enrollment.findOne({
      studentId: new mongoose.Types.ObjectId(session.studentId),
      courseSlug: session.courseSlug
    });

    if (enrollment) {
      enrollment.quizAttempts.push({
        quizId: session.quizId,
        score,
        maxScore: quiz.questions.length,
        attemptedAt: new Date(),
        passed,
        moduleIndex: session.moduleIndex
      });

      // Mark module as completed if passed and not already completed
      const isAlreadyCompleted = enrollment.completedModules.some(
        (cm: any) => cm.moduleIndex === session.moduleIndex
      );

      if (passed && !isAlreadyCompleted) {
        enrollment.completedModules.push({
          moduleIndex: session.moduleIndex,
          completed: true,
          completedAt: new Date()
        });
      }

      await enrollment.save();
    }

    // Send results
    const resultText = `
🎉 *Quiz Completed!*

📊 *Results:*
✅ Correct Answers: ${correctAnswers}/${quiz.questions.length}
📈 Score: ${score}%
${passed ? '🏆 Status: PASSED' : '❌ Status: FAILED (Need 70% to pass)'}

${passed ? '🎯 Module completed! You can now access the next module.' : '📚 Keep studying and try again!'}

📱 View detailed results in your LMS dashboard.
💬 Type /menu to see more options.
    `;

    await message.reply(resultText);
    
    // Clean up session
    activeSessions.delete(phoneNumber);
    
  } catch (error) {
    console.error('Error completing quiz:', error);
    await message.reply('❌ Error saving quiz results. Please check your LMS dashboard.');
    activeSessions.delete(phoneNumber);
  }
};

// Show help
const showHelp = async (message: any) => {
  const helpText = `
❓ *AGI LMS Bot Help*

*Available Commands:*
📚 /courses - View your enrolled courses
📊 /progress - Check your quiz progress
🧩 /quiz [course] [module] - Start a module quiz
🏠 /menu - Show main menu
❓ /help - Show this help

*Quiz Instructions:*
• Use course slug and module number (starting from 0)
• Example: /quiz cscp-course 0
• Answer questions by typing the number (1, 2, 3, etc.)
• Type 'quit' during a quiz to cancel
• You need 70% to pass a quiz

*Tips:*
• Complete modules in order
• Each module must be passed to unlock the next
• Quiz scores sync with your LMS dashboard
• Use your registered phone number

🎓 Happy learning!
  `;
  
  await message.reply(helpText);
};

// Webhook endpoint for WhatsApp Business API (alternative to whatsapp-web.js)
export const webhookHandler = async (req: Request, res: Response) => {
  try {
    // Verify webhook (for WhatsApp Business API)
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(req.query['hub.challenge']);
      return;
    }

    // Handle incoming messages (for WhatsApp Business API)
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            // Process WhatsApp Business API messages here
            // This would be an alternative implementation to whatsapp-web.js
          }
        });
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
};

// Get WhatsApp client status
export const getWhatsAppStatus = async (req: Request, res: Response) => {
  try {
    res.json({ 
      connected: isClientReady,
      clientInfo: whatsappClient?.info || null,
      activeSessions: activeSessions.size,
      hasQRCode: !!currentQRCode,
      needsQRScan: !!currentQRCode && !isClientReady
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WhatsApp status' });
  }
};

// Get QR Code image
export const getQRCode = async (req: Request, res: Response) => {
  try {
    if (!currentQRCode) {
      return res.status(404).json({ error: 'No QR code available. Please restart the WhatsApp bot.' });
    }

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(currentQRCode, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({ 
      qrCode: qrCodeImage,
      message: 'Scan this QR code with your WhatsApp mobile app'
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

// Send test message (for admin testing)
export const sendTestMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!whatsappClient) {
      return res.status(400).json({ error: 'WhatsApp client not initialized' });
    }

    if (!isClientReady) {
      return res.status(400).json({ error: 'WhatsApp client not connected. Please scan QR code first.' });
    }

    const chatId = `${phoneNumber}@c.us`;
    await whatsappClient.sendMessage(chatId, message);
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export { whatsappClient };
