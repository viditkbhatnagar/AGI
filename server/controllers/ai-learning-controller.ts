import { Request, Response } from 'express';
import { createRequire } from 'module';

// Use createRequire for CommonJS pdfjs-dist module
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Disable worker for server-side usage (not needed in Node.js)
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
}

/**
 * Extract text content from a specific page of a PDF
 */
async function extractTextFromPDFPage(pdfUrl: string, pageNumber: number): Promise<string> {
  try {
    console.log(`📄 Extracting text from PDF page ${pageNumber}: ${pdfUrl}`);
    
    // Fetch the PDF document
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`📄 PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Validate page number
    if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
      throw new Error(`Invalid page number ${pageNumber}. PDF has ${pdfDocument.numPages} pages.`);
    }
    
    // Get the specific page
    const page = await pdfDocument.getPage(pageNumber);
    
    // Extract text content
    const textContent = await page.getTextContent();
    
    // Combine all text items
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`✅ Extracted ${pageText.length} characters from page ${pageNumber}`);
    
    return pageText;
  } catch (error) {
    console.error('❌ PDF text extraction error:', error);
    throw error;
  }
}

/**
 * Call OpenAI GPT-4o to explain the page content
 */
async function getAIExplanation(pageText: string, pageNumber: number, documentTitle?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const systemPrompt = `You are an expert educational tutor helping students understand their course materials. Your role is to explain content in clear, simple terms that make learning easier.

When explaining content, you should:
1. Summarize the main concepts in simple language
2. Explain any technical terms or jargon
3. Highlight the most important information students should remember
4. Provide context for why this information matters
5. Use analogies or examples when helpful

Keep your explanation concise but thorough - aim for 2-4 paragraphs. Write in a friendly, encouraging tone that makes learning feel approachable.`;

  const userPrompt = `Please explain the following content from ${documentTitle ? `"${documentTitle}" ` : ''}page ${pageNumber}:

---
${pageText}
---

Provide a clear, educational explanation that helps a student understand this material.`;

  try {
    console.log('🤖 Calling OpenAI GPT-4o for explanation...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;
    
    if (!explanation) {
      throw new Error('No explanation generated');
    }
    
    console.log('✅ AI explanation generated successfully');
    return explanation;
  } catch (error) {
    console.error('❌ OpenAI API call failed:', error);
    throw error;
  }
}

/**
 * POST /api/documents/explain
 * Explain the content of a specific PDF page using AI
 */
export const explainPage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { documentUrl, pageNumber, documentTitle } = req.body;

    if (!documentUrl || typeof documentUrl !== 'string') {
      return res.status(400).json({ message: 'documentUrl is required' });
    }

    if (!pageNumber || typeof pageNumber !== 'number' || pageNumber < 1) {
      return res.status(400).json({ message: 'Valid pageNumber is required' });
    }

    console.log(`📚 Explain page request: page ${pageNumber} of ${documentUrl}`);

    // Extract text from the PDF page
    const pageText = await extractTextFromPDFPage(documentUrl, pageNumber);

    if (!pageText || pageText.length < 10) {
      return res.status(400).json({ 
        message: 'Could not extract enough text from this page. The page may be an image or scanned document.' 
      });
    }

    // Get AI explanation
    const explanation = await getAIExplanation(pageText, pageNumber, documentTitle);

    return res.status(200).json({
      explanation,
      pageNumber,
      extractedTextLength: pageText.length
    });

  } catch (error: any) {
    console.error('Explain page error:', error);
    
    if (error.message?.includes('Invalid page number')) {
      return res.status(400).json({ message: error.message });
    }
    
    if (error.message?.includes('Failed to fetch PDF')) {
      return res.status(400).json({ message: 'Could not access the document. Please try again.' });
    }
    
    return res.status(500).json({ message: 'Failed to generate explanation. Please try again.' });
  }
};

/**
 * Get the total number of pages in a PDF
 */
export const getPDFPageCount = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { documentUrl } = req.query;

    if (!documentUrl || typeof documentUrl !== 'string') {
      return res.status(400).json({ message: 'documentUrl query parameter is required' });
    }

    console.log(`📄 Getting page count for: ${documentUrl}`);

    // Fetch the PDF document
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    return res.status(200).json({
      pageCount: pdfDocument.numPages
    });

  } catch (error: any) {
    console.error('Get PDF page count error:', error);
    return res.status(500).json({ message: 'Failed to get PDF page count' });
  }
};

export default {
  explainPage,
  getPDFPageCount
};
