import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Button } from './button';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from './input';

interface CSVPreviewProps {
  fileUrl: string;
  fileName: string;
}

export function CSVPreview({ fileUrl, fileName }: CSVPreviewProps) {
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  
  const rowsPerPage = 50;
  const maxDisplayRows = 1000; // Limit for performance

  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            const parsedData = results.data as string[][];
            
            if (parsedData.length === 0) {
              setError('CSV file appears to be empty');
              setLoading(false);
              return;
            }
            
            // First row as headers
            const csvHeaders = parsedData[0] || [];
            const csvRows = parsedData.slice(1);
            
            // Limit rows for performance
            const limitedRows = csvRows.slice(0, maxDisplayRows);
            
            setHeaders(csvHeaders);
            setData(limitedRows);
            setTotalRows(csvRows.length);
            setCurrentPage(1);
            setLoading(false);
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            setError('Failed to parse CSV file');
            setLoading(false);
          },
          skipEmptyLines: true,
          transform: (value) => value.trim() // Trim whitespace
        });
        
      } catch (err) {
        console.error('Error loading CSV:', err);
        setError('Failed to load CSV file. The file might be inaccessible.');
        setLoading(false);
      }
    };

    loadCSV();
  }, [fileUrl]);

  const filteredData = data.filter(row =>
    row.some(cell => 
      cell && cell.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalFilteredRows = filteredData.length;
  const totalPages = Math.ceil(totalFilteredRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayData = filteredData.slice(startIndex, endIndex);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading CSV...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-red-500 mb-4">
          <p className="font-medium">CSV Preview Error</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* CSV Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search in CSV..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <span className="text-sm text-gray-600">
            {totalFilteredRows} rows
            {totalRows > maxDisplayRows && (
              <span className="text-orange-600"> (showing first {maxDisplayRows})</span>
            )}
          </span>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center p-2 border-b">
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
              Page {currentPage} of {totalPages}
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
        </div>
      )}

      {/* CSV Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50"
                >
                  {header || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr 
                key={startIndex + rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {headers.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-300 px-3 py-2 text-sm text-gray-900 max-w-xs truncate"
                    title={row[cellIndex] || ''}
                  >
                    {row[cellIndex] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {displayData.length === 0 && searchTerm && (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No rows match your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
