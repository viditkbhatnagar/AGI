import { Request, Response } from 'express';

export const proxyDocument = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    console.log('🔍 Document proxy request:', { url, query: req.query });
    
    if (!url || typeof url !== 'string') {
      console.error('❌ Invalid URL parameter:', url);
      return res.status(400).json({ error: 'URL parameter is required and must be a string' });
    }

    // Security check: Only allow Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) {
      console.error('❌ Non-Cloudinary URL rejected:', url);
      return res.status(403).json({ error: 'Only Cloudinary URLs are allowed' });
    }

    console.log('✅ Processing Cloudinary URL:', url);

    // Use the original URL without modifications to avoid 400 errors
    let modifiedUrl = url;
    console.log('🌤️ Using original URL without transformations:', modifiedUrl);

    // Add headers to help with Cloudinary authentication and CORS
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgiDashboard/1.0)',
        'Accept': '*/*'
      }
    };

    // Fetch the document from Cloudinary
    console.log('📄 Fetching document from:', modifiedUrl);
    const response = await fetch(modifiedUrl, fetchOptions);
    
    console.log('📋 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch document from ${modifiedUrl}: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: `Failed to fetch document: ${response.statusText}` });
    }

    // Get content type from the original response or infer from URL
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Infer content type from URL if not provided by Cloudinary
    if (contentType === 'application/octet-stream' || contentType === 'binary/octet-stream') {
      if (url.includes('.pdf')) contentType = 'application/pdf';
      else if (url.includes('.csv')) contentType = 'text/csv';
      else if (url.includes('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (url.includes('.doc')) contentType = 'application/msword';
      else if (url.includes('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Force inline display for all document types to prevent downloads
    res.setHeader('Content-Disposition', 'inline');
    
    // For CSV files, also set charset for proper text display
    if (contentType.includes('csv') || contentType.includes('text')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // Stream the document
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('Document proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
