/**
 * Flashcard Generation Pipeline - Example Usage
 * 
 * This file demonstrates how to use the flashcard generation pipeline
 * with sample data.
 */

import { createFlashcardService } from "./flashcardService";
import type { FlashcardGenerationInput, Chunk } from "./types";

// =============================================================================
// EXAMPLE: Generate flashcards from sample module content
// =============================================================================

async function exampleUsage() {
    // Sample chunks from a vector DB retrieval (simulated)
    const sampleChunks: Chunk[] = [
        {
            chunk_id: "c1",
            source_file: "hr_fundamentals.pptx",
            provider: "google_drive",
            slide_or_page: "slide 3",
            start_sec: null,
            end_sec: null,
            heading: "What is Human Resource Management?",
            text: "Human Resource Management (HRM) is the strategic approach to the effective management of people in an organization so that they help the business gain a competitive advantage. HRM is designed to maximize employee performance in service of an employer's strategic objectives.",
            tokens_est: 52
        },
        {
            chunk_id: "c2",
            source_file: "hr_fundamentals.pptx",
            provider: "google_drive",
            slide_or_page: "slide 5",
            start_sec: null,
            end_sec: null,
            heading: "Key Functions of HRM",
            text: "The key functions of HRM include: 1) Recruitment and Selection - finding and hiring the best candidates, 2) Training and Development - improving employee skills and knowledge, 3) Performance Management - evaluating and improving employee performance, 4) Compensation and Benefits - designing pay structures and benefits packages.",
            tokens_est: 58
        },
        {
            chunk_id: "c3",
            source_file: "hr_lecture_week1.mp4",
            provider: "local",
            slide_or_page: null,
            start_sec: 120.5,
            end_sec: 180.0,
            heading: "Strategic HRM",
            text: "Strategic HRM aligns HR practices with business strategy. Unlike traditional HR which focuses on administrative tasks, strategic HRM integrates people management with overall business planning. This means HR professionals must understand business goals and design HR initiatives that support them.",
            tokens_est: 48
        },
        {
            chunk_id: "c4",
            source_file: "hr_fundamentals.pptx",
            provider: "google_drive",
            slide_or_page: "slide 8",
            start_sec: null,
            end_sec: null,
            heading: "Employee Lifecycle",
            text: "The employee lifecycle consists of six stages: Attraction, Recruitment, Onboarding, Development, Retention, and Separation. Each stage requires different HR interventions and strategies to ensure organizational success and employee satisfaction.",
            tokens_est: 42
        },
        {
            chunk_id: "c5",
            source_file: "hr_lecture_week1.mp4",
            provider: "local",
            slide_or_page: null,
            start_sec: 240.0,
            end_sec: 300.0,
            heading: "Organizational Culture",
            text: "Organizational culture is a system of shared assumptions, values, and beliefs that governs how people behave in organizations. It shapes the work environment and influences employee engagement, productivity, and retention. HR plays a critical role in developing and maintaining organizational culture.",
            tokens_est: 50
        },
        {
            chunk_id: "c6",
            source_file: "hr_fundamentals.pptx",
            provider: "google_drive",
            slide_or_page: "slide 12",
            start_sec: null,
            end_sec: null,
            heading: "Performance Appraisal Methods",
            text: "Common performance appraisal methods include: Rating Scales (numerical ratings on various criteria), 360-Degree Feedback (input from supervisors, peers, and subordinates), Management by Objectives (evaluating based on goal achievement), and Behaviorally Anchored Rating Scales (combining narrative and quantitative methods).",
            tokens_est: 55
        },
        {
            chunk_id: "c7",
            source_file: "hr_quiz_practice.pdf",
            provider: "local",
            slide_or_page: "p.3",
            start_sec: null,
            end_sec: null,
            heading: "Compensation Types",
            text: "Compensation can be divided into direct and indirect forms. Direct compensation includes base salary, bonuses, and commissions. Indirect compensation includes health insurance, retirement plans, paid time off, and other employee benefits. Total compensation is the sum of all monetary and non-monetary rewards provided to employees.",
            tokens_est: 58
        },
        {
            chunk_id: "c8",
            source_file: "hr_lecture_week1.mp4",
            provider: "local",
            slide_or_page: null,
            start_sec: 420.0,
            end_sec: 480.0,
            heading: "Legal Compliance in HR",
            text: "HR must ensure compliance with employment laws including anti-discrimination legislation, wage and hour laws, workplace safety regulations, and employee privacy laws. Non-compliance can result in legal penalties, lawsuits, and reputational damage to the organization.",
            tokens_est: 45
        }
    ];

    // Build the input payload
    const input: FlashcardGenerationInput = {
        module_id: "hr_mod_1",
        course_id: "mba_hr_101",
        module_title: "Introduction to Human Resource Management",
        retrieved_chunks: sampleChunks,
        module_metadata: {
            total_duration_sec: 3600,
            course_outline_headings: [
                "What is HRM?",
                "Key Functions of HRM",
                "Strategic HRM",
                "Employee Lifecycle",
                "Organizational Culture",
                "Performance Management",
                "Compensation and Benefits",
                "Legal Compliance"
            ]
        },
        prompt_settings: {
            model_temperature: 0.1,
            max_output_tokens: 2000,
            max_context_tokens: 8000
        }
    };

    try {
        // Create the service
        const service = createFlashcardService({
            target_card_count: 10,
            difficulty_distribution: { easy: 3, medium: 4, hard: 3 },
            min_higher_order_bloom: 3
        });

        console.log("Starting flashcard generation...\n");

        // Generate the deck
        const deck = await service.generateFlashcardDeck(input);

        // Output results
        console.log("=".repeat(80));
        console.log("GENERATION COMPLETE");
        console.log("=".repeat(80));
        console.log(`\nModule: ${deck.module_title}`);
        console.log(`Cards Generated: ${deck.cards.length}`);
        console.log(`Warnings: ${deck.warnings.length > 0 ? deck.warnings.join(", ") : "None"}`);

        console.log("\n--- STAGE A SUMMARY ---");
        console.log(`Key Topics: ${deck.stage_a_output.key_topics.length}`);
        for (const topic of deck.stage_a_output.key_topics) {
            console.log(`  - ${topic.topic} [${topic.supports.join(", ")}]`);
        }

        console.log("\n--- FLASHCARDS ---");
        for (const card of deck.cards) {
            console.log(`\n[${card.card_id}] (${card.difficulty}, ${card.bloom_level})`);
            console.log(`Q: ${card.q}`);
            console.log(`A: ${card.a}`);
            console.log(`Confidence: ${(card.confidence_score * 100).toFixed(0)}%`);
            console.log(`Review Required: ${card.review_required}`);
            console.log(`Sources: ${card.sources.map(s => `${s.file} (${s.loc})`).join(", ")}`);
        }

        console.log("\n--- DIFFICULTY DISTRIBUTION ---");
        const easyCount = deck.cards.filter(c => c.difficulty === "easy").length;
        const mediumCount = deck.cards.filter(c => c.difficulty === "medium").length;
        const hardCount = deck.cards.filter(c => c.difficulty === "hard").length;
        console.log(`Easy: ${easyCount} | Medium: ${mediumCount} | Hard: ${hardCount}`);

        console.log("\n--- BLOOM DISTRIBUTION ---");
        const bloomCounts: Record<string, number> = {};
        for (const card of deck.cards) {
            bloomCounts[card.bloom_level] = (bloomCounts[card.bloom_level] || 0) + 1;
        }
        for (const [level, count] of Object.entries(bloomCounts)) {
            console.log(`${level}: ${count}`);
        }

        return deck;

    } catch (error) {
        console.error("Flashcard generation failed:", error);
        throw error;
    }
}

// =============================================================================
// EXAMPLE: API Request Payload (for testing with curl/Postman)
// =============================================================================

export const sampleApiPayload = {
    module_id: "hr_mod_1",
    course_id: "mba_hr_101",
    module_title: "Introduction to Human Resource Management",
    retrieved_chunks: [
        {
            chunk_id: "c1",
            source_file: "hr_fundamentals.pptx",
            provider: "google_drive",
            slide_or_page: "slide 3",
            start_sec: null,
            end_sec: null,
            heading: "What is Human Resource Management?",
            text: "Human Resource Management (HRM) is the strategic approach to the effective management of people...",
            tokens_est: 52
        }
        // ... more chunks
    ],
    prompt_settings: {
        model_temperature: 0.1
    }
};

// =============================================================================
// EXPECTED OUTPUT SCHEMA
// =============================================================================

export const expectedOutputSchema = {
    module_id: "hr_mod_1",
    module_title: "Introduction to Human Resource Management",
    generated_count: 10,
    cards: [
        {
            card_id: "Mhr_mod_1_C1",
            q: "What is Human Resource Management (HRM)?",
            a: "HRM is the strategic approach to the effective management of people in an organization to help the business gain a competitive advantage.",
            difficulty: "easy",
            bloom_level: "Remember",
            evidence: [
                {
                    chunk_id: "c1",
                    source_file: "hr_fundamentals.pptx",
                    loc: "slide 3",
                    start_sec: null,
                    end_sec: null,
                    excerpt: "Human Resource Management (HRM) is the strategic approach to the effective management of people in an organization so that they help the business gain a competitive advantage."
                }
            ],
            sources: [
                { type: "slides", file: "hr_fundamentals.pptx", loc: "slide 3" }
            ],
            confidence_score: 0.98,
            rationale: "Core definition of HRM; fundamental concept for the entire course.",
            review_required: false
        }
        // ... more cards
    ],
    warnings: [],
    generation_metadata: {
        model: "gemini-1.5-flash",
        temperature: 0.1,
        timestamp: "2024-12-11T20:18:16.000Z"
    }
};

// Run the example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    exampleUsage()
        .then(() => console.log("\nExample completed successfully!"))
        .catch(console.error);
}

export { exampleUsage };
