/**
 * Seed Final MCQ Exams from existing module quizzes.
 *
 * Usage:
 *   npx tsx server/seeds/seedFinalExams.ts                          # Dry-run (default)
 *   npx tsx server/seeds/seedFinalExams.ts --execute                 # Execute with confirmation
 *   npx tsx server/seeds/seedFinalExams.ts --replace-essays          # Also replace essay exams with MCQ
 *   npx tsx server/seeds/seedFinalExams.ts --courseSlug <slug>        # Single course only
 *
 * Modes:
 *   Default:          Creates MCQ final exams only for courses that have NO final exam yet
 *   --replace-essays: Also replaces existing essay/mixed final exams with MCQ-only versions
 *
 * Safety:
 *   - Default mode is DRY-RUN — prints what would be done, writes nothing
 *   - --execute requires interactive y/n confirmation before writing
 *   - Backs up old exam titles/question counts in logs before replacing
 *   - Skips courses with no real quiz questions available
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../db';
import { Course } from '../models/course';
import Quiz from '../models/quiz';
import FinalExamination from '../models/finalExamination';
import * as readline from 'readline';

// Parse CLI args
const args = process.argv.slice(2);
const executeMode = args.includes('--execute');
const replaceEssays = args.includes('--replace-essays');
const courseSlugIndex = args.indexOf('--courseSlug');
const targetCourseSlug = courseSlugIndex !== -1 ? args[courseSlugIndex + 1] : null;

interface FinalExamPlan {
  courseSlug: string;
  courseTitle: string;
  questionCount: number;
  modulesUsed: number;
  action: 'create' | 'replace';
  oldExamTitle?: string;
  oldExamQuestionCount?: number;
  oldExamType?: string;
  questions: Array<{
    type: 'mcq';
    text: string;
    choices: string[];
    correctIndex: number;
  }>;
}

function pickRandomQuestions(
  questions: Array<{ text: string; choices: string[]; correctIndex: number }>,
  count: number
): Array<{ text: string; choices: string[]; correctIndex: number }> {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function filterRealQuestions(questions: Array<{ text: string; choices: string[]; correctIndex: number }>) {
  return questions.filter(q => {
    if (!q.text) return false;
    if (q.text.match(/^Question \d+ for module \d+$/)) return false;
    if (q.choices.length > 0 && q.choices.every(c => c === q.choices[0])) return false;
    if (q.text.toLowerCase().includes('click any option')) return false;
    return true;
  });
}

const MAX_QUESTIONS = 25;

// Handcrafted MCQs for courses that have no real module quiz data
const manualFinalExamQuestions: Record<string, FinalExamPlan['questions']> = {
  'Certified-Sustainability-And-Leadership': [
    { type: 'mcq', text: 'What does ESG stand for?', choices: ['Environmental, Social, and Governance', 'Economic, Sustainability, and Growth', 'Environmental, Strategic, and Global', 'Equity, Social, and Governance'], correctIndex: 0 },
    { type: 'mcq', text: 'Which of the following is a key component of ESG reporting?', choices: ['Carbon emissions disclosure', 'Marketing budget allocation', 'Competitor analysis', 'Product pricing strategy'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the primary purpose of sustainability assurance?', choices: ['To verify the accuracy and reliability of sustainability data', 'To increase company profits', 'To reduce employee headcount', 'To expand market share'], correctIndex: 0 },
    { type: 'mcq', text: 'What is a "tipping point" in the context of sustainability?', choices: ['A critical threshold beyond which a system reorganizes, often abruptly and irreversibly', 'The point at which a company becomes profitable', 'A marketing strategy for sustainable products', 'The moment a new CEO takes charge'], correctIndex: 0 },
    { type: 'mcq', text: 'How does ESG influence corporate governance?', choices: ['By integrating environmental and social considerations into board-level decision making', 'By eliminating the need for financial audits', 'By reducing the number of board members', 'By focusing solely on shareholder returns'], correctIndex: 0 },
    { type: 'mcq', text: 'Which of the following best describes the "dual intersection" between technology and ESG?', choices: ['Technology enables ESG measurement and reporting while ESG principles guide responsible technology development', 'Technology replaces ESG requirements entirely', 'ESG prevents technology adoption', 'Technology and ESG are unrelated domains'], correctIndex: 0 },
    { type: 'mcq', text: 'What does "mainstreaming ESG" mean for organizations?', choices: ['Embedding ESG principles into core business strategy and operations', 'Creating a separate ESG department isolated from business operations', 'Focusing only on environmental issues', 'Outsourcing all sustainability initiatives'], correctIndex: 0 },
    { type: 'mcq', text: 'How does ESG impact financial services?', choices: ['Through ESG-integrated investment strategies and sustainable finance products', 'By eliminating all financial regulations', 'By increasing short-term trading volumes', 'By reducing transparency in markets'], correctIndex: 0 },
    { type: 'mcq', text: 'What is a common criticism of ESG frameworks?', choices: ['Lack of standardized metrics and potential for greenwashing', 'They are too simple to implement', 'They focus too much on financial returns', 'They are only relevant to small businesses'], correctIndex: 0 },
    { type: 'mcq', text: 'What is a sustainability report?', choices: ['A document disclosing an organization\'s environmental, social, and governance performance', 'A financial statement showing quarterly profits', 'A marketing brochure for green products', 'An internal memo about office recycling'], correctIndex: 0 },
    { type: 'mcq', text: 'Which global framework is commonly used for sustainability reporting?', choices: ['Global Reporting Initiative (GRI)', 'Generally Accepted Accounting Principles (GAAP)', 'Six Sigma', 'Agile Methodology'], correctIndex: 0 },
    { type: 'mcq', text: 'What is "greenwashing"?', choices: ['Making misleading claims about the environmental benefits of a product or company', 'A method of cleaning industrial waste', 'A government regulation on green energy', 'An investment strategy focused on green bonds'], correctIndex: 0 },
    { type: 'mcq', text: 'Which stakeholder group is most directly affected by the "S" in ESG?', choices: ['Employees, communities, and supply chain workers', 'Only shareholders', 'Only government regulators', 'Only competitors'], correctIndex: 0 },
    { type: 'mcq', text: 'What role does corporate governance play in ESG?', choices: ['It ensures accountability, transparency, and ethical decision-making at the organizational level', 'It focuses only on executive compensation', 'It eliminates the need for sustainability reporting', 'It is irrelevant to environmental concerns'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the UN Sustainable Development Goals (SDGs) framework?', choices: ['A collection of 17 global goals for peace, prosperity, and planet protection by 2030', 'A financial regulation for banking institutions', 'A marketing certification for consumer products', 'A technology standard for software development'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the purpose of a materiality assessment in ESG?', choices: ['To identify the most significant ESG issues for an organization and its stakeholders', 'To calculate the company\'s total assets', 'To determine employee satisfaction levels', 'To plan the annual marketing budget'], correctIndex: 0 },
    { type: 'mcq', text: 'Which of the following is an example of the "E" pillar in ESG?', choices: ['Reducing carbon emissions and managing water resources', 'Improving board diversity', 'Enhancing employee benefits', 'Strengthening anti-corruption policies'], correctIndex: 0 },
    { type: 'mcq', text: 'What is "impact investing"?', choices: ['Investing with the intention to generate positive social and environmental impact alongside financial return', 'Investing only in technology startups', 'Short-term speculative trading', 'Investing exclusively in government bonds'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the significance of Scope 1, 2, and 3 emissions?', choices: ['They categorize greenhouse gas emissions by source: direct, indirect from energy, and value chain', 'They represent three levels of financial reporting', 'They classify employee skill levels', 'They define three types of corporate governance structures'], correctIndex: 0 },
    { type: 'mcq', text: 'Why is stakeholder engagement important for ESG?', choices: ['It helps organizations understand and address the concerns of those affected by their operations', 'It is only required by law', 'It replaces the need for financial audits', 'It is only relevant for non-profit organizations'], correctIndex: 0 },
  ],
  'Positive-Psychology-Leadership-and-Mindfulness': [
    { type: 'mcq', text: 'What is Theory U primarily concerned with?', choices: ['Leading from the emerging future through deep listening and presence', 'Maximizing quarterly profits', 'Traditional top-down management structures', 'Statistical analysis of market trends'], correctIndex: 0 },
    { type: 'mcq', text: 'What does "presencing" mean in the context of Theory U?', choices: ['Connecting with the deepest source of self and will to let the future emerge', 'Giving a presentation to stakeholders', 'Being physically present in an office', 'Tracking employee attendance'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the role of attention in mindfulness practice?', choices: ['Deliberately focusing awareness on the present moment without judgment', 'Multitasking on several projects simultaneously', 'Ignoring distractions by suppressing thoughts', 'Planning future activities in detail'], correctIndex: 0 },
    { type: 'mcq', text: 'What is "automaticity" in the context of mindfulness?', choices: ['The tendency to operate on autopilot without conscious awareness', 'A manufacturing process for efficiency', 'A leadership style focused on delegation', 'A method of automated decision-making using AI'], correctIndex: 0 },
    { type: 'mcq', text: 'How does non-judgment relate to mindfulness?', choices: ['It involves observing experiences without labeling them as good or bad', 'It means never making decisions', 'It requires avoiding all critical thinking', 'It means agreeing with everyone'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the concept of "acceptance" in positive psychology?', choices: ['Acknowledging and allowing present-moment experiences without trying to change them', 'Accepting poor performance from team members', 'Agreeing with all organizational decisions', 'Giving up on personal goals'], correctIndex: 0 },
    { type: 'mcq', text: 'How do goals relate to well-being in positive psychology?', choices: ['Intrinsic goals aligned with personal values lead to greater well-being than extrinsic goals', 'Only financial goals contribute to happiness', 'Goal-setting has no impact on well-being', 'More goals always lead to more happiness'], correctIndex: 0 },
    { type: 'mcq', text: 'What role does compassion play in leadership?', choices: ['It enhances trust, connection, and team psychological safety', 'It makes leaders appear weak to subordinates', 'It is irrelevant to organizational performance', 'It only applies to healthcare settings'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the "ego" in the context of mindfulness and leadership?', choices: ['The constructed self-identity that can create barriers to authentic leadership', 'A positive trait that drives ambition', 'A financial metric for measuring growth', 'A management framework for team building'], correctIndex: 0 },
    { type: 'mcq', text: 'What does "integration" mean in the context of mindfulness practice?', choices: ['Combining mindfulness insights with daily life and leadership practices', 'Merging two companies together', 'Integrating new software into existing systems', 'Combining different departments into one'], correctIndex: 0 },
    { type: 'mcq', text: 'What is "presence" in leadership?', choices: ['The ability to be fully attentive, aware, and engaged in the current moment with others', 'Having a commanding physical stature', 'Being in the office for long hours', 'Having a strong social media presence'], correctIndex: 0 },
    { type: 'mcq', text: 'Which of the following best describes positive leadership?', choices: ['Focusing on strengths, fostering positive emotions, and creating meaning in work', 'Focusing only on correcting weaknesses and mistakes', 'Avoiding all conflict within a team', 'Maintaining strict hierarchical control'], correctIndex: 0 },
    { type: 'mcq', text: 'What are the key components of emotional intelligence?', choices: ['Self-awareness, self-regulation, motivation, empathy, and social skills', 'IQ, technical skills, and financial literacy', 'Physical fitness, appearance, and communication', 'Academic qualifications and work experience'], correctIndex: 0 },
    { type: 'mcq', text: 'How does self-awareness contribute to effective leadership?', choices: ['It helps leaders understand their emotions, strengths, and impact on others', 'It makes leaders focus only on their own needs', 'It reduces the need for team collaboration', 'It eliminates the need for feedback from others'], correctIndex: 0 },
    { type: 'mcq', text: 'What is psychological safety in a team context?', choices: ['A shared belief that the team is safe for interpersonal risk-taking', 'Physical safety measures in the workplace', 'A team with no disagreements', 'Having insurance for all employees'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the "flow state" in positive psychology?', choices: ['A state of complete absorption in an activity where challenge matches skill', 'A state of relaxation achieved through meditation', 'An organizational workflow process', 'A technique for managing cash flow'], correctIndex: 0 },
    { type: 'mcq', text: 'How does empathy differ from sympathy in leadership?', choices: ['Empathy involves understanding and sharing feelings while sympathy involves feeling pity for someone', 'They are exactly the same concept', 'Sympathy is more effective than empathy in leadership', 'Empathy is a weakness while sympathy is a strength'], correctIndex: 0 },
    { type: 'mcq', text: 'What is the PERMA model in positive psychology?', choices: ['A framework of well-being: Positive Emotions, Engagement, Relationships, Meaning, and Accomplishment', 'A performance management system', 'A permanent employment contract model', 'A project evaluation and review methodology'], correctIndex: 0 },
    { type: 'mcq', text: 'What is a growth mindset?', choices: ['The belief that abilities and intelligence can be developed through dedication and hard work', 'The belief that intelligence is fixed and unchangeable', 'A strategy for business expansion', 'A financial investment approach'], correctIndex: 0 },
    { type: 'mcq', text: 'How does mindfulness benefit decision-making in leadership?', choices: ['By reducing reactive responses and enabling more thoughtful, considered decisions', 'By eliminating the need for data analysis', 'By making decisions faster without reflection', 'By delegating all decisions to subordinates'], correctIndex: 0 },
  ],
};

function buildMCQFromQuizzes(
  quizzes: Array<{ questions: Array<{ text: string; choices: string[]; correctIndex: number }> }>
): { questions: FinalExamPlan['questions']; modulesUsed: number } {
  // First pass: collect all real questions grouped by module
  const moduleQuestions: Array<{ text: string; choices: string[]; correctIndex: number }[]> = [];

  for (const quiz of quizzes) {
    const realQuestions = filterRealQuestions(quiz.questions);
    if (realQuestions.length > 0) {
      moduleQuestions.push(realQuestions);
    }
  }

  const modulesUsed = moduleQuestions.length;
  if (modulesUsed === 0) return { questions: [], modulesUsed: 0 };

  // Calculate how many questions to pick per module to stay within MAX_QUESTIONS
  // Distribute evenly, at least 1 per module
  const perModule = Math.max(1, Math.floor(MAX_QUESTIONS / modulesUsed));

  const selectedQuestions: FinalExamPlan['questions'] = [];

  for (const modQs of moduleQuestions) {
    const pickCount = Math.min(perModule, modQs.length);
    const picked = pickRandomQuestions(modQs, pickCount);

    for (const q of picked) {
      selectedQuestions.push({
        type: 'mcq',
        text: q.text,
        choices: q.choices,
        correctIndex: q.correctIndex,
      });
    }
  }

  // If still over MAX_QUESTIONS (shouldn't happen often), trim randomly
  if (selectedQuestions.length > MAX_QUESTIONS) {
    const shuffled = selectedQuestions.sort(() => Math.random() - 0.5);
    shuffled.length = MAX_QUESTIONS;
    return { questions: shuffled, modulesUsed };
  }

  return { questions: selectedQuestions, modulesUsed };
}

function getExamType(exam: any): string {
  const hasEssay = exam.questions.some((q: any) => q.type === 'essay');
  const hasMcq = exam.questions.some((q: any) => q.type === 'mcq');
  if (hasEssay && hasMcq) return 'mixed';
  if (hasEssay) return 'essay';
  return 'mcq';
}

async function planFinalExams(): Promise<{
  toProcess: FinalExamPlan[];
  skipped: Array<{ courseSlug: string; reason: string }>;
}> {
  const toProcess: FinalExamPlan[] = [];
  const skipped: Array<{ courseSlug: string; reason: string }> = [];

  // Get all distinct course slugs from Quiz collection + manual question courses
  const quizCourseSlugs: string[] = await Quiz.distinct('courseSlug');
  const manualCourseSlugs = Object.keys(manualFinalExamQuestions).filter(s => !quizCourseSlugs.includes(s));
  const courseSlugs = [...quizCourseSlugs, ...manualCourseSlugs];

  for (const courseSlug of courseSlugs) {
    if (targetCourseSlug && courseSlug !== targetCourseSlug) continue;

    // Get course title
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      skipped.push({ courseSlug, reason: 'Course not found in Course collection' });
      continue;
    }

    // Check if FinalExamination already exists
    const existingExam = await FinalExamination.findOne({ courseSlug });

    if (existingExam) {
      const examType = getExamType(existingExam);

      // If it's already MCQ-only, skip
      if (examType === 'mcq') {
        skipped.push({ courseSlug, reason: `Already MCQ-only: "${existingExam.title}" (${existingExam.questions.length} questions)` });
        continue;
      }

      // It has essay questions — only replace if --replace-essays flag is set
      if (!replaceEssays) {
        skipped.push({ courseSlug, reason: `Has ${examType} exam: "${existingExam.title}" (use --replace-essays to convert)` });
        continue;
      }

      // Build MCQ replacement from module quizzes
      const quizzes = await Quiz.find({ courseSlug }).sort({ moduleIndex: 1 });
      const { questions, modulesUsed } = buildMCQFromQuizzes(quizzes);

      // Fall back to manual questions if no quiz data
      if (questions.length === 0 && manualFinalExamQuestions[courseSlug]) {
        const manualQs = manualFinalExamQuestions[courseSlug];
        toProcess.push({
          courseSlug,
          courseTitle: course.title,
          questionCount: manualQs.length,
          modulesUsed: 0,
          action: 'replace',
          oldExamTitle: existingExam.title,
          oldExamQuestionCount: existingExam.questions.length,
          oldExamType: examType,
          questions: manualQs,
        });
        continue;
      }

      if (questions.length === 0) {
        skipped.push({ courseSlug, reason: `No valid quiz questions to replace ${examType} exam (all placeholders)` });
        continue;
      }

      toProcess.push({
        courseSlug,
        courseTitle: course.title,
        questionCount: questions.length,
        modulesUsed,
        action: 'replace',
        oldExamTitle: existingExam.title,
        oldExamQuestionCount: existingExam.questions.length,
        oldExamType: examType,
        questions,
      });
    } else {
      // No existing exam — create new one
      const quizzes = await Quiz.find({ courseSlug }).sort({ moduleIndex: 1 });
      let { questions, modulesUsed } = buildMCQFromQuizzes(quizzes);

      // Fall back to manual questions if no quiz data
      if (questions.length === 0 && manualFinalExamQuestions[courseSlug]) {
        questions = manualFinalExamQuestions[courseSlug];
        modulesUsed = 0;
      }

      if (questions.length === 0) {
        skipped.push({ courseSlug, reason: 'No valid quiz questions found (all placeholders)' });
        continue;
      }

      toProcess.push({
        courseSlug,
        courseTitle: course.title,
        questionCount: questions.length,
        modulesUsed,
        action: 'create',
        questions,
      });
    }
  }

  return { toProcess, skipped };
}

function printReport(toProcess: FinalExamPlan[], skipped: Array<{ courseSlug: string; reason: string }>) {
  console.log('\n' + '='.repeat(70));
  console.log('FINAL MCQ EXAM SEED REPORT');
  console.log('='.repeat(70));

  const creates = toProcess.filter(p => p.action === 'create');
  const replaces = toProcess.filter(p => p.action === 'replace');

  if (creates.length > 0) {
    console.log(`\n--- WILL CREATE (${creates.length} new final exams) ---\n`);
    for (const plan of creates) {
      console.log(`  Course: ${plan.courseTitle}`);
      console.log(`  Slug:   ${plan.courseSlug}`);
      console.log(`  Questions: ${plan.questionCount} (${plan.modulesUsed > 0 ? `from ${plan.modulesUsed} modules` : 'handcrafted'})`);
      for (const q of plan.questions.slice(0, 3)) {
        console.log(`    - ${q.text.substring(0, 80)}${q.text.length > 80 ? '...' : ''}`);
      }
      if (plan.questionCount > 3) console.log(`    ... and ${plan.questionCount - 3} more`);
      console.log('');
    }
  }

  if (replaces.length > 0) {
    console.log(`\n--- WILL REPLACE (${replaces.length} essay/mixed → MCQ-only) ---\n`);
    for (const plan of replaces) {
      console.log(`  Course: ${plan.courseTitle}`);
      console.log(`  Slug:   ${plan.courseSlug}`);
      console.log(`  OLD: "${plan.oldExamTitle}" (${plan.oldExamType}, ${plan.oldExamQuestionCount} questions)`);
      console.log(`  NEW: ${plan.questionCount} MCQ questions (${plan.modulesUsed > 0 ? `from ${plan.modulesUsed} modules` : 'handcrafted'})`);
      for (const q of plan.questions.slice(0, 2)) {
        console.log(`    - ${q.text.substring(0, 80)}${q.text.length > 80 ? '...' : ''}`);
      }
      if (plan.questionCount > 2) console.log(`    ... and ${plan.questionCount - 2} more`);
      console.log('');
    }
  }

  if (skipped.length > 0) {
    console.log(`\n--- SKIPPED (${skipped.length} courses) ---\n`);
    for (const s of skipped) {
      console.log(`  ${s.courseSlug}: ${s.reason}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Summary: ${creates.length} to create, ${replaces.length} to replace, ${skipped.length} skipped`);
  console.log('='.repeat(70) + '\n');
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function executeChanges(plans: FinalExamPlan[]) {
  let created = 0;
  let replaced = 0;
  let failed = 0;

  for (const plan of plans) {
    try {
      if (plan.action === 'replace') {
        // Update existing exam: replace questions, update title
        const result = await FinalExamination.findOneAndUpdate(
          { courseSlug: plan.courseSlug },
          {
            $set: {
              title: `Final Assessment - ${plan.courseTitle}`,
              description: 'Final MCQ assessment covering all course modules. You must pass this exam to be eligible for certificate issuance.',
              questions: plan.questions,
              passingScore: 70,
              maxAttempts: 3,
              isActive: true,
            }
          },
          { new: true }
        );

        if (result) {
          console.log(`  🔄 Replaced: ${plan.courseSlug} — "${plan.oldExamTitle}" (${plan.oldExamType}) → ${plan.questionCount} MCQs`);
          replaced++;
        } else {
          console.error(`  ❌ Failed to find exam for replacement: ${plan.courseSlug}`);
          failed++;
        }
      } else {
        // Create new exam
        const finalExam = new FinalExamination({
          courseSlug: plan.courseSlug,
          title: `Final Assessment - ${plan.courseTitle}`,
          description: 'Final MCQ assessment covering all course modules. You must pass this exam to be eligible for certificate issuance.',
          questions: plan.questions,
          passingScore: 70,
          maxAttempts: 3,
          isActive: true,
        });

        await finalExam.save();
        console.log(`  ✅ Created: ${plan.courseSlug} (${plan.questionCount} questions)`);
        created++;
      }
    } catch (error: any) {
      console.error(`  ❌ Failed: ${plan.courseSlug} — ${error.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${created} created, ${replaced} replaced, ${failed} failed`);
}

async function main() {
  console.log(`\nMode: ${executeMode ? '🔴 EXECUTE' : '🟢 DRY-RUN'}${replaceEssays ? ' + REPLACE-ESSAYS' : ''}`);
  if (targetCourseSlug) console.log(`Target: ${targetCourseSlug} only`);

  await connectDB();

  const { toProcess, skipped } = await planFinalExams();
  printReport(toProcess, skipped);

  if (toProcess.length === 0) {
    console.log('Nothing to do. Exiting.');
    process.exit(0);
  }

  if (!executeMode) {
    console.log('This was a DRY-RUN. No data was written.');
    console.log('Run with --execute to apply changes.\n');
    process.exit(0);
  }

  const creates = toProcess.filter(p => p.action === 'create').length;
  const replaces = toProcess.filter(p => p.action === 'replace').length;
  const confirmed = await confirm(
    `⚠️  About to create ${creates} and replace ${replaces} final exam(s) in the database. Proceed? (y/n): `
  );

  if (!confirmed) {
    console.log('Aborted. No data was written.\n');
    process.exit(0);
  }

  await executeChanges(toProcess);
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
