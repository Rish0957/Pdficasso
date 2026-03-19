import { useState, useCallback } from 'react';
import { FileUp, X, File } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxSizeMB?: number;
  multiple?: boolean;
}

export function FileUploader({ onFilesSelected, maxSizeMB = 50, multiple = true }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | File[]) => {
    setError(null);
    const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (newFiles.length !== files.length) {
        setError('Only PDF files are allowed.');
        return;
    }

    const currentTotalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    const newTotalSize = newFiles.reduce((acc, file) => acc + file.size, 0);
    
    if ((currentTotalSize + newTotalSize) > maxSizeMB * 1024 * 1024) {
      setError(`Total file size exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    const updatedFiles = multiple ? [...selectedFiles, ...newFiles] : newFiles;
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [selectedFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 overflow-hidden
          ${dragActive 
            ? 'border-indigo-400 bg-indigo-500/10' 
            : 'border-neutral-600 hover:border-indigo-500 hover:bg-neutral-800/80 bg-neutral-800/50'
          }`}
      >
        <input
          type="file"
          accept="application/pdf"
          multiple={multiple}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <FileUp className={`w-16 h-16 mx-auto transition-colors mb-6 ${dragActive ? 'text-indigo-400 scale-110' : 'text-neutral-500'}`} />
        <h3 className="text-2xl font-bold mb-2">
          {dragActive ? 'Drop PDFs here!' : `Drop your PDF ${multiple ? 'files' : 'file'} here`}
        </h3>
        <p className="text-neutral-400 mb-6">or click to browse from your computer</p>
        
        <div className="inline-block bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors border border-white/10 backdrop-blur-md pointer-events-none">
          Select Files
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center">
            <X className="w-4 h-4 mr-2" /> {error}
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 shadow-lg">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Selected Files</h4>
          <ul className="space-y-2">
            {selectedFiles.map((file, idx) => (
              <li key={`${file.name}-${idx}`} className="flex items-center justify-between bg-neutral-900/50 p-3 rounded-lg border border-neutral-700/50 group">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <File className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                  <span className="text-xs text-neutral-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button 
                  onClick={() => removeFile(idx)}
                  className="text-neutral-500 hover:text-red-400 p-1 rounded-md hover:bg-red-400/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
