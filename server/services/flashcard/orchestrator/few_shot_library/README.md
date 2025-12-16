# Few-Shot Example Library

> Guidelines and best practices for crafting and maintaining few-shot examples for the Flashcard Orchestrator.

---

## Overview

Few-shot examples are critical for guiding the LLM to produce high-quality flashcards. This library stores curated examples that:

1. Demonstrate the expected output format
2. Show domain-specific vocabulary and concepts
3. Establish quality standards for Q/A pairs
4. Provide evidence-grounding examples

---

## Directory Structure

```
few_shot_library/
├── README.md           # This file
├── hr_fewshots.json    # HR domain examples
├── finance_fewshots.json   # Finance domain (future)
├── engineering_fewshots.json   # Engineering domain (future)
└── general_fewshots.json   # General academic content
```

---

## Few-Shot JSON Format

Each file contains an array of examples:

```json
{
  "domain": "hr",
  "version": "1.0.0",
  "examples": [
    {
      "id": "hr-example-001",
      "stage": "stageB",
      "description": "Basic HR concept flashcard",
      "input": {
        "chunk_text": "The text from the content...",
        "learning_objective": "Understand organizational culture"
      },
      "output": {
        "question": "What is organizational culture?",
        "answer": "Organizational culture refers to...",
        "evidence_quote": "...key phrase from chunk...",
        "bloom_level": "understand",
        "difficulty": "medium"
      },
      "notes": "Demonstrates proper Q/A length and evidence linking",
      "approved_by": "sme@example.com",
      "approved_at": "2024-01-15"
    }
  ]
}
```

---

## Guidelines for Crafting Few-Shots

### DO ✅

1. **Use Real Content**
   - Base examples on actual course materials
   - Include authentic vocabulary and concepts

2. **Vary Bloom's Levels**
   - Include examples for: remember, understand, apply, analyze, evaluate
   - Show different question types for each level

3. **Ground in Evidence**
   - Always include `evidence_quote` from the source chunk
   - Evidence should directly support the answer

4. **Match Output Format Exactly**
   - Follow the JSON schema precisely
   - Include all required fields

5. **Keep Answers Concise**
   - Target 1-3 sentences for most answers
   - Use bullet points for lists of 3+ items

6. **Include Edge Cases**
   - Show how to handle ambiguous content
   - Demonstrate partial evidence scenarios

### DON'T ❌

1. **No Hallucinations**
   - Never include information not in the source chunk
   - If unsure, flag for review rather than guess

2. **No Leading Questions**
   - Avoid "Don't you think..." or "Isn't it true..."
   - Use neutral, objective phrasing

3. **No Trivial Questions**
   - Avoid yes/no questions that test recall only
   - Focus on understanding and application

4. **No Overly Long Answers**
   - If answer exceeds 100 words, consider splitting
   - Use rationale field for additional context

5. **No Jargon Without Context**
   - Define technical terms when first used
   - Assume learner is a beginner

---

## Testing Few-Shot Examples

### Using the Prompt Tuner

```bash
# Test a single example
npx ts-node tools/prompt_tuner/run_prompt_tuner.ts \
  --example-file=server/services/flashcard/orchestrator/few_shot_library/hr_fewshots.json \
  --example-id=hr-example-001 \
  --mode=mock

# Test with real LLM
export GEMINI_API_KEY=your-key
npx ts-node tools/prompt_tuner/run_prompt_tuner.ts \
  --example-file=hr_fewshots.json \
  --sample-chunks=test/fixtures/e2e/sample_module_manifest.json \
  --mode=real

# Approve and save after review
npx ts-node tools/prompt_tuner/run_prompt_tuner.ts \
  --example-file=new_example.json \
  --approve
```

### Validation Checklist

Before approving a few-shot example:

- [ ] Question tests a meaningful learning objective
- [ ] Answer is accurate and complete
- [ ] Evidence quote is present in source chunk
- [ ] Bloom level is correctly classified
- [ ] Difficulty rating is appropriate
- [ ] No hallucinated information
- [ ] Format matches schema exactly

---

## Common Issues to Watch For

### Hallucinations

**Bad:**
```json
{
  "question": "When was the HR department founded?",
  "answer": "The HR department was founded in 1920."  // ❌ Not in source!
}
```

**Good:**
```json
{
  "question": "What is the role of HR according to the lecture?",
  "answer": "According to the lecture, HR manages employee relations."  // ✅
}
```

### Missing Evidence

**Bad:**
```json
{
  "question": "What motivates employees?",
  "answer": "Employees are motivated by recognition.",
  "evidence_quote": ""  // ❌ No evidence!
}
```

**Good:**
```json
{
  "question": "What motivates employees according to the text?",
  "answer": "Recognition is a key motivator.",
  "evidence_quote": "Studies show recognition programs increase motivation by 40%"  // ✅
}
```

### Length Issues

**Too Short:**
```json
{
  "answer": "Yes."  // ❌ Not informative
}
```

**Too Long:**
```json
{
  "answer": "Organizational culture encompasses many different aspects including values, beliefs, assumptions, traditions, norms, behavioral patterns, artifacts, rituals, ceremonies, stories, heroes, symbols..."  // ❌ Too verbose
}
```

**Just Right:**
```json
{
  "answer": "Organizational culture refers to the shared values, beliefs, and practices that characterize an organization and guide employee behavior."  // ✅
}
```

---

## Adding New Domains

1. Create new file: `{domain}_fewshots.json`
2. Add 6-10 representative examples
3. Include variety of Bloom levels
4. Test with prompt tuner
5. Get SME approval
6. Submit PR for review

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial HR domain examples |

---

## Contact

For questions about few-shot examples:
- Technical: dev-team@example.com
- Content: sme-team@example.com
