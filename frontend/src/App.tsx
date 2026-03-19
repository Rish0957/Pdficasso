import { useState } from 'react';
import { Merge, SplitSquareVertical, Loader2, FileText } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import axios from 'axios';

function App() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitPages, setSplitPages] = useState('');

  const handleFilesSelected = (files: File[]) => {
      setSelectedFiles(files);
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('pdfs', file));

      const response = await axios.post('http://localhost:3001/api/merge', formData, {
        responseType: 'blob' // Important handling for binary data
      });

      // Create a download link for the merged PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'merged_result.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
    } catch (error) {
      console.error("Merge failed:", error);
      alert("Failed to merge PDFs. Please check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (selectedFiles.length !== 1 || !splitPages) return;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('pdf', selectedFiles[0]);
      formData.append('pages', splitPages);

      const response = await axios.post('http://localhost:3001/api/split', formData, {
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'split_result.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
    } catch (error) {
      console.error("Split failed:", error);
      alert("Failed to split PDF. Ensure page numbers are correct.");
    } finally {
      setIsProcessing(false);
    }
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
            Merge & Split PDFs
          </h1>
          <p className="text-neutral-400 max-w-xl mx-auto text-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-3 rounded-lg shadow-xl shadow-black/20">
            Secure, fast, and fully local. <span className="text-indigo-400 font-semibold">50MB limit</span> per operation.
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
           <div className="bg-neutral-800 p-1 rounded-xl flex space-x-1 border border-neutral-700 shadow-inner">
             <button 
                onClick={() => { setActiveTab('merge'); setSelectedFiles([]); }}
                className={`px-8 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all duration-300 ${activeTab === 'merge' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'}`}>
                <Merge className="w-5 h-5" />
                <span>Merge Files</span>
             </button>
             <button 
                onClick={() => { setActiveTab('split'); setSelectedFiles([]); }}
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

           {/* Split Page Selection */}
           {activeTab === 'split' && selectedFiles.length === 1 && (
              <div className="mt-8 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-700">
                <label className="block text-sm font-medium text-neutral-300 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-purple-400" />
                  Pages to Extract (e.g., 0, 2, 4)
                </label>
                <input 
                  type="text" 
                  value={splitPages}
                  onChange={(e) => setSplitPages(e.target.value)}
                  placeholder="Comma separated: 0, 1, 5"
                  className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
                <p className="text-neutral-500 text-xs mt-2">* Note: Pages are 0-indexed (Page 1 is 0).</p>
              </div>
           )}

           {/* Action Buttons */}
           <div className="mt-8 flex justify-end">
             <button 
                onClick={activeTab === 'merge' ? handleMerge : handleSplit}
                disabled={
                  selectedFiles.length === 0 || 
                  (activeTab === 'merge' && selectedFiles.length < 2) || 
                  (activeTab === 'split' && (!splitPages || selectedFiles.length > 1)) ||
                  isProcessing
                }
                className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center ${
                  (selectedFiles.length === 0 || 
                  (activeTab === 'merge' && selectedFiles.length < 2) || 
                  (activeTab === 'split' && (!splitPages || selectedFiles.length > 1)) ||
                  isProcessing)
                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                    : `bg-gradient-to-r ${activeTab === 'merge' ? 'from-indigo-500 to-blue-500 shadow-indigo-500/25 hover:shadow-indigo-500/40' : 'from-purple-500 to-pink-500 shadow-purple-500/25 hover:shadow-purple-500/40'} text-white shadow-lg hover:-translate-y-0.5`
                }`}
             >
               {isProcessing && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
               {isProcessing ? 'Processing...' : (activeTab === 'merge' ? 'Merge PDFs' : 'Split PDF')}
             </button>
           </div>
        </main>
      </div>
    </div>
  );
}

export default App;
