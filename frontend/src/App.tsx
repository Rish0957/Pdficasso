import { useState } from 'react';
import { Merge, SplitSquareVertical, Loader2, FileText, Check } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import axios from 'axios';

function App() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Split-specific state
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setSelectedPages(new Set());
    setTotalPages(0);

    // If in split mode and a file was uploaded, fetch page count
    if (activeTab === 'split' && files.length === 1) {
      setIsLoadingPages(true);
      try {
        const formData = new FormData();
        formData.append('pdf', files[0]);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await axios.post(`${apiUrl}/api/pdf-info`, formData);
        setTotalPages(response.data.pageCount);
        setPdfFileName(response.data.fileName);
      } catch (error) {
        console.error('Failed to get PDF info:', error);
        alert('Could not read PDF. The file may be corrupted.');
      } finally {
        setIsLoadingPages(false);
      }
    }
  };

  const togglePage = (pageIndex: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
  };

  const selectAllPages = () => {
    if (selectedPages.size === totalPages) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i)));
    }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('pdfs', file));

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/merge`, formData, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'merged_result.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

    } catch (error) {
      console.error('Merge failed:', error);
      alert('Failed to merge PDFs. Please check the console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (selectedFiles.length !== 1 || selectedPages.size === 0) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFiles[0]);
      formData.append('pages', Array.from(selectedPages).sort((a, b) => a - b).join(','));

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/split`, formData, {
        responseType: 'blob'
      });

      // Download as ZIP
      const originalName = selectedFiles[0].name.replace(/\.pdf$/i, '');
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${originalName}_splitted.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

    } catch (error) {
      console.error('Split failed:', error);
      alert('Failed to split PDF. Ensure page numbers are correct.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFiles([]);
    setSelectedPages(new Set());
    setTotalPages(0);
    setPdfFileName('');
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
            <Merge className="w-8 h-8 text-indigo-400" />
            <SplitSquareVertical className="w-8 h-8 text-indigo-400 ml-2" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            PDFicasso
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto text-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-3 rounded-lg shadow-xl shadow-black/20">
            Merge & split your PDFs. Secure, fast, and fully local. <span className="text-indigo-400 font-semibold">50MB limit</span> per operation.
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-neutral-800 p-1 rounded-xl flex space-x-1 border border-neutral-700 shadow-inner">
            <button
              onClick={() => { setActiveTab('merge'); resetState(); }}
              className={`px-8 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all duration-300 ${activeTab === 'merge' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'}`}>
              <Merge className="w-5 h-5" />
              <span>Merge Files</span>
            </button>
            <button
              onClick={() => { setActiveTab('split'); resetState(); }}
              className={`px-8 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all duration-300 ${activeTab === 'split' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'}`}>
              <SplitSquareVertical className="w-5 h-5" />
              <span>Split Pages</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="bg-neutral-800 border border-neutral-700 rounded-3xl p-8 shadow-2xl relative">

          <FileUploader
            onFilesSelected={handleFilesSelected}
            maxSizeMB={50}
            multiple={activeTab === 'merge'}
          />

          {/* Page Selector for Split */}
          {activeTab === 'split' && isLoadingPages && (
            <div className="mt-8 flex items-center justify-center space-x-3 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Reading PDF pages...</span>
            </div>
          )}

          {activeTab === 'split' && totalPages > 0 && !isLoadingPages && (
            <div className="mt-8 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-neutral-200">{pdfFileName}</span>
                  <span className="text-neutral-500 text-sm">— {totalPages} pages</span>
                </div>
                <button
                  onClick={selectAllPages}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium">
                  {selectedPages.size === totalPages ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <p className="text-neutral-500 text-xs mb-4">Click on pages to select them for extraction. Each selected page will become a separate PDF in the downloaded ZIP.</p>

              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => togglePage(i)}
                    className={`relative aspect-[3/4] rounded-lg border-2 flex flex-col items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-105 ${
                      selectedPages.has(i)
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10'
                        : 'border-neutral-600 bg-neutral-800 text-neutral-400 hover:border-neutral-500 hover:bg-neutral-700'
                    }`}
                  >
                    {selectedPages.has(i) && (
                      <Check className="w-3 h-3 absolute top-1 right-1 text-purple-400" />
                    )}
                    <span className="text-xs text-neutral-500">Page</span>
                    <span className="text-lg">{i + 1}</span>
                  </button>
                ))}
              </div>

              <p className="text-neutral-500 text-sm mt-4">
                {selectedPages.size} of {totalPages} pages selected
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={activeTab === 'merge' ? handleMerge : handleSplit}
              disabled={
                selectedFiles.length === 0 ||
                (activeTab === 'merge' && selectedFiles.length < 2) ||
                (activeTab === 'split' && selectedPages.size === 0) ||
                isProcessing
              }
              className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center ${
                (selectedFiles.length === 0 ||
                (activeTab === 'merge' && selectedFiles.length < 2) ||
                (activeTab === 'split' && selectedPages.size === 0) ||
                isProcessing)
                  ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  : `bg-gradient-to-r ${activeTab === 'merge' ? 'from-indigo-500 to-blue-500 shadow-indigo-500/25 hover:shadow-indigo-500/40' : 'from-purple-500 to-pink-500 shadow-purple-500/25 hover:shadow-purple-500/40'} text-white shadow-lg hover:-translate-y-0.5`
              }`}
            >
              {isProcessing && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {isProcessing ? 'Processing...' : (activeTab === 'merge' ? 'Merge PDFs' : `Split ${selectedPages.size} Pages`)}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
