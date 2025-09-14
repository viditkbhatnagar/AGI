import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from './button';
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';

// Set the worker source for PDF.js - using multiple fallbacks
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
  console.log('📦 PDF.js worker set to unpkg CDN');
}

interface PDFPreviewProps {
  fileUrl: string;
  fileName: string;
}

// Function to validate and fix Cloudinary URLs
const validateAndFixCloudinaryUrl = (url: string): { url: string; warnings: string[] } => {
  const warnings: string[] = [];
  let fixedUrl = url;
  
  console.log('🔧 Original URL:', url);
  
  // Check if it's a Cloudinary URL
  if (!url.includes('res.cloudinary.com')) {
    warnings.push('Not a Cloudinary URL');
    return { url: fixedUrl, warnings };
  }
  
  // Extract parts of the URL
  const urlParts = url.split('/');
  const cloudinaryIndex = urlParts.findIndex(part => part === 'res.cloudinary.com');
  
  if (cloudinaryIndex === -1) {
    warnings.push('Invalid Cloudinary URL structure');
    return { url: fixedUrl, warnings };
  }
  
  const cloudName = urlParts[cloudinaryIndex + 1];
  const resourceType = urlParts[cloudinaryIndex + 2]; // should be 'raw'
  const action = urlParts[cloudinaryIndex + 3]; // should be 'upload'
  
  console.log('📊 URL Analysis:', {
    cloudName,
    resourceType,
    action,
    fullPath: urlParts.slice(cloudinaryIndex + 4).join('/')
  });
  
  // Check for common issues
  if (resourceType !== 'raw') {
    warnings.push(`Resource type is "${resourceType}", should be "raw" for PDFs`);
  }
  
  if (action !== 'upload') {
    warnings.push(`Action is "${action}", should be "upload"`);
  }
  
  // Check for proper file extension
  if (!url.toLowerCase().endsWith('.pdf')) {
    warnings.push('URL does not end with .pdf extension');
  }
  
  // Remove any query parameters that might interfere
  if (url.includes('?')) {
    fixedUrl = url.split('?')[0];
    warnings.push('Removed query parameters from URL');
  }
  
  // Remove any hash fragments
  if (url.includes('#')) {
    fixedUrl = fixedUrl.split('#')[0];
    warnings.push('Removed hash fragment from URL');
  }
  
  console.log('🔧 Fixed URL:', fixedUrl);
  console.log('⚠️ Warnings:', warnings);
  
  return { url: fixedUrl, warnings };
};

export function PDFPreview({ fileUrl, fileName }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 PDF Preview Debug Info:');
        console.log('📄 Original fileUrl:', fileUrl);
        console.log('📏 URL length:', fileUrl.length);
        
        // Validate and fix the Cloudinary URL
        const { url: validatedUrl, warnings } = validateAndFixCloudinaryUrl(fileUrl);
        
        if (warnings.length > 0) {
          console.warn('⚠️ URL Issues Found:', warnings);
        }
        
        // Test if URL can be opened in browser
        console.log('🌐 Test this URL in browser:', validatedUrl);
        
        // Test direct fetch first
        console.log('🧪 Testing direct fetch to PDF URL...');
        try {
          const testResponse = await fetch(validatedUrl, { 
            method: 'HEAD',
            mode: 'cors',
            credentials: 'omit' // Don't send any credentials
          });
          console.log('📡 Direct fetch status:', testResponse.status);
          console.log('📡 Direct fetch headers:', Object.fromEntries(testResponse.headers.entries()));
          
          if (!testResponse.ok) {
            throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
          }
          
        } catch (fetchError) {
          console.warn('⚠️ Direct fetch failed:', fetchError);
          console.log('💡 Try opening this URL in a new tab:', validatedUrl);
        }
        
        // Configure PDF.js with proper options including CORS handling
        const loadingTask = pdfjsLib.getDocument({
          url: validatedUrl,
          httpHeaders: {},  // No authentication headers
          withCredentials: false,  // Don't send cookies
          verbosity: 1,  // Enable verbose logging for debugging
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
          // Try to handle CORS issues
          isEvalSupported: false,
          disableStream: false,
          disableAutoFetch: false
        });
        
        console.log('📚 PDF.js loading task created, waiting for promise...');
        const pdfDoc = await loadingTask.promise;
        console.log('✅ PDF loaded successfully! Pages:', pdfDoc.numPages);
        
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
        
        // Render first page
        await renderPage(pdfDoc, 1);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading PDF:', err);
        console.error('❌ Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        
        // Provide more specific error messages based on error type
        let errorMessage = 'Failed to load PDF. ';
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          errorMessage += 'Access denied - check Cloudinary permissions.';
        } else if (err.message?.includes('404')) {
          errorMessage += 'File not found - check the URL.';
        } else if (err.message?.includes('CORS')) {
          errorMessage += 'CORS issue - check Cloudinary CORS settings.';
        } else {
          errorMessage += 'The file might be corrupted or inaccessible.';
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadPDF();
  }, [fileUrl]);

  const renderPage = async (pdfDoc: any, pageNumber: number) => {
    if (!canvasRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      const viewport = page.getViewport({ scale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering PDF page:', err);
      setError('Failed to render PDF page');
    }
  };

  const goToPage = async (pageNumber: number) => {
    if (!pdf || pageNumber < 1 || pageNumber > totalPages) return;
    
    setCurrentPage(pageNumber);
    await renderPage(pdf, pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const handleZoomIn = async () => {
    const newScale = Math.min(scale + 0.2, 3.0);
    setScale(newScale);
    if (pdf) {
      await renderPage(pdf, currentPage);
    }
  };

  const handleZoomOut = async () => {
    const newScale = Math.max(scale - 0.2, 0.5);
    setScale(newScale);
    if (pdf) {
      await renderPage(pdf, currentPage);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const { url: validatedUrl } = validateAndFixCloudinaryUrl(fileUrl);
    
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-red-500 mb-4">
          <p className="font-medium">PDF Preview Error</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => window.open(validatedUrl, '_blank')} 
            variant="outline"
          >
            Test URL in Browser
          </Button>
          <Button 
            onClick={async () => {
              try {
                // Test with a known working PDF
                const testPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
                console.log('🧪 Testing PDF.js with known working PDF...');
                const testTask = pdfjsLib.getDocument(testPdf);
                const testDoc = await testTask.promise;
                console.log('✅ PDF.js test successful! Worker is functioning.');
                alert(`PDF.js is working! Test PDF has ${testDoc.numPages} pages.`);
              } catch (testError) {
                console.error('❌ PDF.js test failed:', testError);
                alert(`PDF.js test failed: ${testError.message}`);
              }
            }}
            variant="outline"
          >
            Test PDF.js Library
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <div className="text-xs text-gray-500 mt-2 max-w-md">
            URL: <code className="bg-gray-100 px-1 rounded break-all">{validatedUrl}</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center items-start p-4">
        <canvas
          ref={canvasRef}
          className="border shadow-lg bg-white"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}
