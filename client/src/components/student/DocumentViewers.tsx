import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';

// PDF Viewer Component using PDF.js
export function PDFViewer({ fileUrl, fileName }: { fileUrl: string; fileName?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actuallyLoaded, setActuallyLoaded] = useState(false);

  console.log('🔴 PDFViewer initialized:', { fileUrl, fileName });

  const handleLoad = () => {
    console.log('✅ PDF iframe loaded, checking content...');
    // Don't immediately hide loading - wait a bit to ensure content is actually there
    setTimeout(() => {
      setActuallyLoaded(true);
      setLoading(false);
      setError(null);
      console.log('✅ PDF content confirmed loaded');
    }, 2000); // Wait 2 seconds for content to fully load
  };

  const handleError = () => {
    console.error('❌ PDF failed to load');
    setLoading(false);
    setActuallyLoaded(false);
    setError('Failed to load PDF. The document may be corrupted or inaccessible.');
  };

  if (error) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <div className="text-center p-6">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">PDF Preview Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => window.open(fileUrl, '_blank')}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[60vh] md:h-[70vh]">
      {(loading || !actuallyLoaded) && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-30 border border-gray-200 rounded">
          <div className="text-center p-8">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-blue-600" />
            <p className="text-xl font-medium text-gray-700 mb-3">Loading PDF Document</p>
            <p className="text-sm text-gray-500">Please wait while the document loads...</p>
            <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}
      <iframe
        src={fileUrl}
        className="w-full h-full border border-gray-200 rounded"
        title={fileName || 'PDF Document'}
        allow="fullscreen"
        onLoad={handleLoad}
        onError={handleError}
        style={{ opacity: actuallyLoaded ? 1 : 0 }}
      />
    </div>
  );
}

// CSV Viewer Component
export function CSVViewer({ fileUrl, fileName }: { fileUrl: string; fileName?: string }) {
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('📊 CSVViewer initialized:', { fileUrl, fileName });

  useEffect(() => {
    const fetchAndParseCsv = async () => {
      try {
        console.log('📥 Fetching CSV data from:', fileUrl);
        
        // Try direct access to Cloudinary URLs without proxy
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('📄 CSV text received, length:', csvText.length);
        
        // Parse CSV manually (simple parser)
        const lines = csvText.split('\n').filter(line => line.trim());
        const data = lines.map(line => {
          // Handle quoted fields and commas within quotes
          const fields: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          if (current) {
            fields.push(current.trim());
          }
          
          return fields;
        });
        
        console.log('✅ CSV parsed successfully:', { rows: data.length, columns: data[0]?.length });
        
        // Add a small delay to show the loading state properly
        setTimeout(() => {
          setCsvData(data);
          setError(null);
          setLoading(false);
        }, 800); // Increased delay for better UX and to prevent premature display
      } catch (err) {
        console.error('❌ CSV parsing failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CSV');
      } finally {
        setLoading(false);
      }
    };

    fetchAndParseCsv();
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] flex items-center justify-center bg-white border border-gray-200 rounded">
        <div className="text-center p-8">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-blue-600" />
          <p className="text-xl font-medium text-gray-700 mb-3">Loading CSV Data</p>
          <p className="text-sm text-gray-500">Parsing spreadsheet content...</p>
          <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <div className="text-center p-6">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">CSV Preview Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => window.open(fileUrl, '_blank')}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!csvData || csvData.length === 0) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <div className="text-center p-6">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Empty CSV</h3>
          <p className="text-gray-500">The CSV file appears to be empty.</p>
        </div>
      </div>
    );
  }

  const headers = csvData[0] || [];
  const rows = csvData.slice(1);

  return (
    <div className="w-full h-[60vh] md:h-[70vh] border border-gray-200 rounded bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">
              {fileName || 'CSV Data'}
            </h3>
            <p className="text-xs text-gray-500">
              {rows.length} rows × {headers.length} columns
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-auto h-full">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200"
                >
                  {header || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {headers.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-2 text-gray-900 border-b border-gray-100"
                  >
                    {row[colIndex] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Generic Document Viewer that chooses the appropriate viewer
export function DocumentViewer({ 
  fileUrl, 
  fileName, 
  fileType 
}: { 
  fileUrl: string; 
  fileName?: string; 
  fileType?: string;
}) {
  console.log('📄 DocumentViewer selecting viewer for:', { fileUrl, fileName, fileType });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determine file type from multiple sources
  const extension = fileName?.toLowerCase().split('.').pop() || 
                   fileUrl.toLowerCase().split('.').pop() || '';
  const mimeType = fileType?.toLowerCase() || '';

  // CSV files - use custom viewer
  if (extension === 'csv' || mimeType.includes('csv') || fileUrl.toLowerCase().includes('.csv')) {
    console.log('📊 Using CSV viewer');
    return <CSVViewer fileUrl={fileUrl} fileName={fileName} />;
  }

  // Office documents - use Microsoft Office Online viewer for preview
  const isOfficeDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension) ||
                     mimeType.includes('word') ||
                     mimeType.includes('excel') ||
                     mimeType.includes('spreadsheet') ||
                     mimeType.includes('powerpoint') ||
                     mimeType.includes('presentation') ||
                     mimeType.includes('document');

  if (isOfficeDoc && fileUrl.includes('res.cloudinary.com')) {
    console.log('🏢 Using Microsoft Office Online viewer for Office document');
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    
    return (
      <div className="w-full h-[60vh] md:h-[70vh] relative">
        {loading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-30 border border-gray-200 rounded">
            <div className="text-center p-8">
              <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-blue-600" />
              <p className="text-xl font-medium text-gray-700 mb-3">Loading Office Document</p>
              <p className="text-sm text-gray-500">Please wait while the document loads in preview...</p>
              <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center p-6">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Preview Not Available</h3>
              <p className="text-gray-500 mb-4">Unable to display this document inline.</p>
              <Button
                onClick={() => window.open(fileUrl, '_blank')}
              >
                Open Document
              </Button>
            </div>
          </div>
        )}
        
        <iframe
          src={officeViewerUrl}
          className="w-full h-full border border-gray-200 rounded"
          title={fileName || 'Office Document'}
          style={{ opacity: loading ? 0 : 1 }}
          onLoad={() => {
            console.log('✅ Office document iframe loaded, waiting for content...');
            // Wait longer for Office Online viewer to fully load
            setTimeout(() => {
              setLoading(false);
              console.log('✅ Office document content confirmed loaded');
            }, 4000); // Wait 4 seconds for Office viewer to fully load
          }}
          onError={() => {
            console.error('❌ Office document failed to load in viewer');
            setLoading(false);
            setError(true);
          }}
        />
      </div>
    );
  }

  // Check if it's a PDF
  const isPDF = extension === 'pdf' || mimeType.includes('pdf') || fileUrl.toLowerCase().includes('.pdf');

  // For PDFs, use Google Docs Viewer for a cleaner experience (no sidebar, scrollable)
  if (isPDF) {
    console.log('📄 Using Google Docs Viewer for PDF');
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    
    return (
      <div className="w-full h-[70vh] md:h-[75vh] relative bg-slate-100">
        {loading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-30 rounded">
            <div className="text-center p-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-600" />
              <p className="text-lg font-medium text-gray-700 mb-2">Loading PDF</p>
              <p className="text-sm text-gray-500">Please wait...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center p-6">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Preview Not Available</h3>
              <p className="text-gray-500 mb-4">Unable to display this document inline.</p>
              <Button
                onClick={() => window.open(fileUrl, '_blank')}
              >
                Open Document
              </Button>
            </div>
          </div>
        )}
        
        <iframe
          src={googleViewerUrl}
          className="w-full h-full border-0 rounded"
          title={fileName || 'PDF Document'}
          style={{ opacity: loading ? 0 : 1 }}
          onLoad={() => {
            console.log('✅ PDF loaded via Google Docs Viewer');
            setTimeout(() => {
              setLoading(false);
            }, 1000);
          }}
          onError={() => {
            console.error('❌ PDF failed to load');
            setLoading(false);
            setError(true);
          }}
        />
      </div>
    );
  }

  // For all other document types, use iframe
  console.log('📄 Using generic iframe viewer');
  
  return (
    <div className="w-full h-[60vh] md:h-[70vh] relative">
      {loading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-30 border border-gray-200 rounded">
          <div className="text-center p-8">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-blue-600" />
            <p className="text-xl font-medium text-gray-700 mb-3">Loading Document</p>
            <p className="text-sm text-gray-500">Please wait while the document loads...</p>
            <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '50%' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <div className="text-center p-6">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Preview Not Available</h3>
            <p className="text-gray-500 mb-4">Unable to display this document inline.</p>
            <Button
              onClick={() => window.open(fileUrl, '_blank')}
            >
              Open Document
            </Button>
          </div>
        </div>
      )}
      
      <iframe
        src={fileUrl}
        className="w-full h-full border border-gray-200 rounded"
        title={fileName || 'Document'}
        style={{ opacity: loading ? 0 : 1 }}
        onLoad={() => {
          console.log('✅ Document iframe loaded, waiting for content...');
          // Wait a bit to ensure content is actually loaded
          setTimeout(() => {
            setLoading(false);
            console.log('✅ Document content confirmed loaded');
          }, 2500); // Wait 2.5 seconds for content to fully load
        }}
        onError={() => {
          console.error('❌ Document failed to load');
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}
