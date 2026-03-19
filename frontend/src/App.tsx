import { useState } from 'react';
import {
  Merge,
  SplitSquareVertical,
  Loader2,
  FileText,
  CircleAlert,
  CircleCheckBig,
  Info,
  RotateCw,
  Trash2,
  GripVertical,
  Download,
  Scissors,
  Check,
  WandSparkles,
  Stamp
} from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import axios from 'axios';

type BannerState = {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type SplitOutputMode = 'zip' | 'single';

type PageItem = {
  id: string;
  pageIndex: number;
  rotation: number;
  previewUrl: string;
};

type PdfInfoResponse = {
  pageCount: number;
  fileName: string;
  pages: PageItem[];
};

type SizeSummary = {
  originalSize: number;
  outputSize: number;
  savedBytes: number;
  savedPercent: number;
};

type SizeReductionMode = 'standard' | 'aggressive';

type LastSizeResult = {
  context: 'extract' | 'edit' | 'optimize';
  summary: SizeSummary;
};

const buildPageRangeLabel = (pages: number[]) => {
  if (pages.length === 0) return '';

  const ranges: string[] = [];
  let start = pages[0];
  let end = pages[0];

  for (let index = 1; index < pages.length; index += 1) {
    const current = pages[index];
    if (current === end + 1) {
      end = current;
      continue;
    }

    ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
    start = current;
    end = current;
  }

  ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
  return ranges.join(', ');
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

function App() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pageRangeInput, setPageRangeInput] = useState('');
  const [splitOutputMode, setSplitOutputMode] = useState<SplitOutputMode>('zip');
  const [pageItems, setPageItems] = useState<PageItem[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState('');
  const [optimizeOutput, setOptimizeOutput] = useState(true);
  const [sizeReductionMode, setSizeReductionMode] = useState<SizeReductionMode>('standard');
  const [lastSizeResult, setLastSizeResult] = useState<LastSizeResult | null>(null);

  const setStatus = (tone: NonNullable<BannerState>['tone'], title: string, message: string) => {
    setBanner({ tone, title, message });
  };

  const parsePageRanges = (value: string, maxPages: number) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return { pages: [] as number[], error: 'Enter pages like 1-3, 6, 9-12.' };
    }

    const parsedPages = new Set<number>();

    for (const rawToken of trimmedValue.split(',')) {
      const token = rawToken.trim();
      if (!token) continue;

      if (token.includes('-')) {
        const [startText, endText] = token.split('-').map((part) => part.trim());
        const start = Number(startText);
        const end = Number(endText);

        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > end) {
          return { pages: [] as number[], error: `Invalid range "${token}".` };
        }

        if (end > maxPages) {
          return { pages: [] as number[], error: `Page ${end} is outside this document's ${maxPages} pages.` };
        }

        for (let page = start; page <= end; page += 1) {
          parsedPages.add(page - 1);
        }
        continue;
      }

      const page = Number(token);
      if (!Number.isInteger(page) || page < 1) {
        return { pages: [] as number[], error: `Invalid page "${token}".` };
      }

      if (page > maxPages) {
        return { pages: [] as number[], error: `Page ${page} is outside this document's ${maxPages} pages.` };
      }

      parsedPages.add(page - 1);
    }

    return { pages: Array.from(parsedPages).sort((a, b) => a - b), error: null };
  };

  const syncSelection = (items: PageItem[], nextSelectedIds: Set<string>) => {
    setSelectedPageIds(nextSelectedIds);
    const selectedPositions = items.flatMap((item, index) => (nextSelectedIds.has(item.id) ? [index] : []));
    setPageRangeInput(buildPageRangeLabel(selectedPositions));
  };

  const buildPageDescriptors = (items: PageItem[]) =>
    items.map(({ pageIndex, rotation }) => ({ pageIndex, rotation }));

  const selectedPages = pageItems.filter((item) => selectedPageIds.has(item.id));
  const selectedPageCount = selectedPages.length;
  const hasWatermark = watermarkText.trim().length > 0;
  const activeFileSize = selectedFiles[0]?.size ?? 0;
  const sizeReductionHint =
    activeFileSize > 15 * 1024 * 1024
      ? 'Larger PDFs often benefit the most from the current size-reduction pass.'
      : pageItems.length > 12
        ? 'Multi-page edited documents usually see modest size savings with the current rebuild strategy.'
        : 'Expect light-to-moderate savings unless the PDF has a lot of structural overhead.';

  const readApiError = async (error: unknown, fallbackMessage: string) => {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;

      if (typeof responseData === 'string') {
        return responseData;
      }

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text) as { error?: string };
          return parsed.error ?? text ?? fallbackMessage;
        } catch {
          try {
            return await responseData.text();
          } catch {
            return fallbackMessage;
          }
        }
      }

      if (responseData && typeof responseData === 'object' && 'error' in responseData) {
        const apiError = responseData as { error?: string };
        return apiError.error ?? fallbackMessage;
      }
    }

    return fallbackMessage;
  };

  const readSizeSummary = (headers: Record<string, string | undefined>): SizeSummary | null => {
    const originalSize = Number(headers['x-original-size']);
    const outputSize = Number(headers['x-output-size']);
    const savedBytes = Number(headers['x-saved-bytes']);
    const savedPercent = Number(headers['x-saved-percent']);

    if ([originalSize, outputSize, savedBytes, savedPercent].some((value) => Number.isNaN(value))) {
      return null;
    }

    return {
      originalSize,
      outputSize,
      savedBytes,
      savedPercent,
    };
  };

  const downloadBlob = (blobData: BlobPart, type: string, fileName: string) => {
    const url = window.URL.createObjectURL(new Blob([blobData], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setSelectedPageIds(new Set());
    setPageItems([]);
    setPdfFileName('');
    setPageRangeInput('');
    setDraggedPageId(null);
    setWatermarkText('');
    setOptimizeOutput(true);
    setSizeReductionMode('standard');
    setLastSizeResult(null);
    setBanner(null);

    if (activeTab === 'split' && files.length === 1) {
      setIsLoadingPages(true);
      setStatus('info', 'Reading PDF', 'Preparing the page editor and generating previews.');
      try {
        const formData = new FormData();
        formData.append('pdf', files[0]);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await axios.post<PdfInfoResponse>(`${apiUrl}/api/pdf-info`, formData);
        setPdfFileName(response.data.fileName);
        setPageItems(response.data.pages);
        setStatus(
          'info',
          'Editor Ready',
          `Loaded ${response.data.pageCount} pages. Reorder, rotate, delete, or extract what you need.`
        );
      } catch (error) {
        console.error('Failed to get PDF info:', error);
        const message = await readApiError(error, 'The file may be corrupted or unsupported.');
        setStatus('error', 'Could Not Read PDF', message);
      } finally {
        setIsLoadingPages(false);
      }
    } else if (files.length > 0 && activeTab === 'merge') {
      setStatus('info', 'Files Ready', `${files.length} PDF${files.length === 1 ? '' : 's'} queued for merge.`);
    }
  };

  const togglePageSelection = (pageId: string) => {
    const nextSelectedIds = new Set(selectedPageIds);
    if (nextSelectedIds.has(pageId)) {
      nextSelectedIds.delete(pageId);
    } else {
      nextSelectedIds.add(pageId);
    }

    syncSelection(pageItems, nextSelectedIds);
  };

  const selectAllPages = () => {
    if (selectedPageIds.size === pageItems.length) {
      syncSelection(pageItems, new Set());
      return;
    }

    syncSelection(pageItems, new Set(pageItems.map((page) => page.id)));
  };

  const applyPageRangeInput = () => {
    const { pages, error } = parsePageRanges(pageRangeInput, pageItems.length);
    if (error) {
      setStatus('error', 'Invalid Page Selection', error);
      return;
    }

    const nextSelectedIds = new Set(pages.map((pagePosition) => pageItems[pagePosition]!.id));
    syncSelection(pageItems, nextSelectedIds);
    setStatus('info', 'Selection Updated', `${nextSelectedIds.size} page${nextSelectedIds.size === 1 ? '' : 's'} selected.`);
  };

  const rotatePage = (pageId: string) => {
    const nextItems = pageItems.map((item) =>
      item.id === pageId ? { ...item, rotation: (item.rotation + 90) % 360 } : item
    );

    setPageItems(nextItems);
    syncSelection(nextItems, new Set(selectedPageIds));
  };

  const deletePage = (pageId: string) => {
    const nextItems = pageItems.filter((item) => item.id !== pageId);
    const nextSelectedIds = new Set(selectedPageIds);
    nextSelectedIds.delete(pageId);

    setPageItems(nextItems);
    syncSelection(nextItems, nextSelectedIds);
    setStatus('info', 'Page Removed', `${nextItems.length} page${nextItems.length === 1 ? '' : 's'} remaining in the editor.`);
  };

  const movePage = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const fromIndex = pageItems.findIndex((item) => item.id === fromId);
    const toIndex = pageItems.findIndex((item) => item.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextItems = [...pageItems];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    setPageItems(nextItems);
    syncSelection(nextItems, new Set(selectedPageIds));
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) return;
    setIsProcessing(true);
    setStatus('info', 'Merging PDFs', `Combining ${selectedFiles.length} files in the selected order.`);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('pdfs', file));

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/merge`, formData, {
        responseType: 'blob'
      });

      downloadBlob(response.data, 'application/pdf', 'merged_result.pdf');
      setStatus('success', 'Merge Complete', `Merged ${selectedFiles.length} PDFs into one download.`);
    } catch (error) {
      console.error('Merge failed:', error);
      setStatus('error', 'Merge Failed', await readApiError(error, 'We could not merge these PDFs. Check the files and try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (selectedFiles.length !== 1 || selectedPageIds.size === 0) return;
    setIsProcessing(true);

    const selectedDescriptors = buildPageDescriptors(selectedPages);

    setStatus(
      'info',
      'Extracting Pages',
      `Preparing ${selectedDescriptors.length} selected page${selectedDescriptors.length === 1 ? '' : 's'} as ${
        splitOutputMode === 'single' ? 'one PDF' : 'a ZIP of individual PDFs'
      }.`
    );

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFiles[0]);
      formData.append('pageDescriptors', JSON.stringify(selectedDescriptors));
      formData.append('outputMode', splitOutputMode);
      formData.append('optimize', String(optimizeOutput));
      if (watermarkText.trim()) {
        formData.append('watermarkText', watermarkText.trim());
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/split`, formData, {
        responseType: 'blob'
      });

      const originalName = selectedFiles[0].name.replace(/\.pdf$/i, '');
      const mimeType = splitOutputMode === 'single' ? 'application/pdf' : 'application/zip';
      const fileName =
        splitOutputMode === 'single' ? `${originalName}_extracted.pdf` : `${originalName}_splitted.zip`;
      const sizeSummary = readSizeSummary(response.headers as Record<string, string | undefined>);
      if (sizeSummary) {
        setLastSizeResult({ context: 'extract', summary: sizeSummary });
      }

      downloadBlob(response.data, mimeType, fileName);
      setStatus(
        'success',
        'Split Complete',
        splitOutputMode === 'single' && sizeSummary
          ? `Prepared ${selectedDescriptors.length} page${selectedDescriptors.length === 1 ? '' : 's'} as one PDF. ${
              sizeSummary.savedBytes > 0
                ? `Reduced by ${formatFileSize(sizeSummary.savedBytes)} (${sizeSummary.savedPercent.toFixed(1)}%).`
                : `Final size ${formatFileSize(sizeSummary.outputSize)}.`
            }`
          : `Prepared ${selectedDescriptors.length} page${selectedDescriptors.length === 1 ? '' : 's'} as ${
              splitOutputMode === 'single' ? 'one PDF' : 'a ZIP download'
            }.`
      );
    } catch (error) {
      console.error('Split failed:', error);
      setStatus('error', 'Split Failed', await readApiError(error, 'We could not extract those pages. Check the selection and try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadEditedPdf = async () => {
    if (selectedFiles.length !== 1 || pageItems.length === 0) return;
    setIsProcessing(true);
    setStatus('info', 'Building Edited PDF', `Applying changes to ${pageItems.length} page${pageItems.length === 1 ? '' : 's'}.`);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFiles[0]);
      formData.append('pageDescriptors', JSON.stringify(buildPageDescriptors(pageItems)));
      formData.append('optimize', String(optimizeOutput));
      if (watermarkText.trim()) {
        formData.append('watermarkText', watermarkText.trim());
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/rebuild`, formData, {
        responseType: 'blob'
      });
      const sizeSummary = readSizeSummary(response.headers as Record<string, string | undefined>);
      if (sizeSummary) {
        setLastSizeResult({ context: 'edit', summary: sizeSummary });
      }

      const originalName = selectedFiles[0].name.replace(/\.pdf$/i, '');
      downloadBlob(response.data, 'application/pdf', `${originalName}_edited.pdf`);
      setStatus(
        'success',
        'Edited PDF Ready',
        sizeSummary
          ? `Downloaded the edited PDF with ${pageItems.length} page${pageItems.length === 1 ? '' : 's'}. ${
              sizeSummary.savedBytes > 0
                ? `Saved ${formatFileSize(sizeSummary.savedBytes)} (${sizeSummary.savedPercent.toFixed(1)}%).`
                : `Final size ${formatFileSize(sizeSummary.outputSize)}.`
            }`
          : `Downloaded the edited PDF with ${pageItems.length} page${pageItems.length === 1 ? '' : 's'}.`
      );
    } catch (error) {
      console.error('Rebuild failed:', error);
      setStatus('error', 'Edit Export Failed', await readApiError(error, 'We could not build the edited PDF. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptimizePdf = async () => {
    if (selectedFiles.length !== 1) return;
    setIsProcessing(true);
    setStatus('info', 'Optimizing PDF', 'Re-saving the PDF with optimized object streams.');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFiles[0]);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/optimize`, formData, {
        responseType: 'blob'
      });
      const sizeSummary = readSizeSummary(response.headers as Record<string, string | undefined>);
      if (sizeSummary) {
        setLastSizeResult({ context: 'optimize', summary: sizeSummary });
      }

      const originalName = selectedFiles[0].name.replace(/\.pdf$/i, '');
      downloadBlob(response.data, 'application/pdf', `${originalName}_optimized.pdf`);
      setStatus(
        'success',
        'Size Reduction Complete',
        sizeSummary
          ? sizeSummary.savedBytes > 0
            ? `Reduced the PDF by ${formatFileSize(sizeSummary.savedBytes)} (${sizeSummary.savedPercent.toFixed(1)}%). New size: ${formatFileSize(sizeSummary.outputSize)}.`
            : `Processed the PDF. Final size: ${formatFileSize(sizeSummary.outputSize)}.`
          : 'Downloaded the optimized PDF.'
      );
    } catch (error) {
      console.error('Optimize failed:', error);
      setStatus('error', 'Optimize Failed', await readApiError(error, 'We could not optimize this PDF. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFiles([]);
    setSelectedPageIds(new Set());
    setPageItems([]);
    setPdfFileName('');
    setPageRangeInput('');
    setSplitOutputMode('zip');
    setDraggedPageId(null);
    setWatermarkText('');
    setOptimizeOutput(true);
    setSizeReductionMode('standard');
    setLastSizeResult(null);
    setBanner(null);
  };

  const bannerStyles = banner
    ? banner.tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : banner.tone === 'error'
        ? 'border-red-500/30 bg-red-500/10 text-red-200'
        : 'border-sky-500/30 bg-sky-500/10 text-sky-200'
    : '';

  const BannerIcon = banner
    ? banner.tone === 'success'
      ? CircleCheckBig
      : banner.tone === 'error'
        ? CircleAlert
        : Info
    : null;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
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

        <div className="flex justify-center mb-8">
          <div className="bg-neutral-800 p-1 rounded-xl flex space-x-1 border border-neutral-700 shadow-inner">
            <button
              onClick={() => {
                setActiveTab('merge');
                resetState();
              }}
              className={`px-8 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all duration-300 ${
                activeTab === 'merge'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <Merge className="w-5 h-5" />
              <span>Merge Files</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('split');
                resetState();
              }}
              className={`px-8 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all duration-300 ${
                activeTab === 'split'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <SplitSquareVertical className="w-5 h-5" />
              <span>Edit Pages</span>
            </button>
          </div>
        </div>

        <main className="bg-neutral-800 border border-neutral-700 rounded-3xl p-8 shadow-2xl relative">
          <FileUploader
            selectedFiles={selectedFiles}
            onFilesSelected={handleFilesSelected}
            maxSizeMB={50}
            multiple={activeTab === 'merge'}
          />

          {banner && BannerIcon && (
            <div className={`mt-6 rounded-2xl border px-4 py-3 flex items-start gap-3 ${bannerStyles}`}>
              <BannerIcon className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{banner.title}</p>
                <p className="text-sm opacity-90">{banner.message}</p>
              </div>
            </div>
          )}

          {activeTab === 'split' && isLoadingPages && (
            <div className="mt-8 flex items-center justify-center space-x-3 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating page previews...</span>
            </div>
          )}

          {activeTab === 'split' && pageItems.length > 0 && !isLoadingPages && (
            <div className="mt-8 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-700">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-neutral-200">{pdfFileName}</span>
                  <span className="text-neutral-500 text-sm">- {pageItems.length} editable pages</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllPages}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
                  >
                    {selectedPageIds.size === pageItems.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={handleDownloadEditedPdf}
                    disabled={pageItems.length === 0 || isProcessing}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors ${
                      pageItems.length === 0 || isProcessing
                        ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                        : 'bg-neutral-100 text-neutral-900 hover:bg-white'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Edited PDF</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-sm text-neutral-400">
                <p>
                  Click cards to select pages. Drag to reorder, rotate with the action button, or delete pages you do not want.
                </p>
                <p>{selectedPageIds.size} selected</p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {pageItems.map((page, index) => (
                  <div
                    key={page.id}
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={() => togglePageSelection(page.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        togglePageSelection(page.id);
                      }
                    }}
                    onDragStart={() => setDraggedPageId(page.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedPageId) {
                        movePage(draggedPageId, page.id);
                      }
                      setDraggedPageId(null);
                    }}
                    onDragEnd={() => setDraggedPageId(null)}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      selectedPageIds.has(page.id)
                        ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                        : 'border-neutral-700 bg-neutral-800/80 hover:border-neutral-500'
                    } ${draggedPageId === page.id ? 'ring-2 ring-indigo-400/60' : ''} cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/60`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-500">
                        <GripVertical className="w-4 h-4" />
                        <span>Slot {index + 1}</span>
                      </div>
                      {selectedPageIds.has(page.id) && <Check className="w-4 h-4 text-purple-300" />}
                    </div>

                    <div className="aspect-[3/4] overflow-hidden rounded-xl border border-neutral-700 bg-white shadow-inner">
                      <object
                        data={page.previewUrl}
                        type="application/pdf"
                        aria-label={`Preview of page ${index + 1}`}
                        className="h-full w-full pointer-events-none"
                        style={{ transform: `rotate(${page.rotation}deg) scale(1.08)` }}
                      >
                        <div className="h-full w-full bg-neutral-100" />
                      </object>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-neutral-100">Page {index + 1}</span>
                        <span className="text-xs text-neutral-500">Source {page.pageIndex + 1}</span>
                      </div>
                      <p className="text-xs text-neutral-500">Rotation {page.rotation} degrees</p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          rotatePage(page.id);
                        }}
                        className="flex-1 rounded-xl border border-neutral-600 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700/60 transition-colors"
                      >
                        <span className="inline-flex items-center gap-1">
                          <RotateCw className="w-3.5 h-3.5" />
                          Rotate
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deletePage(page.id);
                        }}
                        className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-neutral-700 bg-gradient-to-br from-neutral-900 via-neutral-900/95 to-neutral-800/90 p-5 shadow-inner">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="xl:max-w-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Export Studio</p>
                    <h3 className="mt-2 text-xl font-semibold text-neutral-100">Package this document after you shape it</h3>
                    <p className="mt-2 text-sm text-neutral-400">
                      Review your pages first, then choose extraction, watermarking, and size-reduction options here.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Current Pages</p>
                      <p className="mt-2 text-2xl font-semibold text-neutral-100">{pageItems.length}</p>
                      <p className="mt-1 text-xs text-neutral-500">after reorder and deletions</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Selected</p>
                      <p className="mt-2 text-2xl font-semibold text-neutral-100">{selectedPageCount}</p>
                      <p className="mt-1 text-xs text-neutral-500">ready for extraction</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-700 bg-neutral-800/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Size Mode</p>
                      <p className="mt-2 text-sm font-semibold text-neutral-100">
                        {optimizeOutput ? 'Reduce file size' : 'Keep original structure'}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">{hasWatermark ? 'watermark enabled' : 'clean export'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="space-y-4 rounded-2xl border border-neutral-700 bg-neutral-800/70 p-4">
                    <div>
                      <label htmlFor="page-range" className="block text-sm font-medium text-neutral-300 mb-2">
                        Page ranges
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="page-range"
                          type="text"
                          value={pageRangeInput}
                          onChange={(e) => setPageRangeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyPageRangeInput();
                            }
                          }}
                          placeholder="1-3, 6, 9-12"
                          className="flex-1 rounded-xl border border-neutral-600 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={applyPageRangeInput}
                          className="rounded-xl border border-purple-500/40 px-4 py-3 text-sm font-semibold text-purple-200 hover:bg-purple-500/10 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">
                        Select by current page order after edits. Example: 1-3, 6, 9-12
                      </p>
                    </div>

                    <div>
                      <label htmlFor="watermark-text" className="block text-sm font-medium text-neutral-300 mb-2">
                        Watermark text
                      </label>
                      <div className="relative">
                        <Stamp className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
                        <input
                          id="watermark-text"
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          placeholder="Optional watermark for exports"
                          className="w-full rounded-xl border border-neutral-600 bg-neutral-900 pl-10 pr-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-purple-400"
                        />
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">
                        Applied to extracted and edited PDF downloads. Leave blank to export without a watermark.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-neutral-700 bg-neutral-800/70 p-4">
                    <div>
                      <label htmlFor="output-mode" className="block text-sm font-medium text-neutral-300 mb-2">
                        Extract format
                      </label>
                      <select
                        id="output-mode"
                        value={splitOutputMode}
                        onChange={(e) => setSplitOutputMode(e.target.value as SplitOutputMode)}
                        className="w-full rounded-xl border border-neutral-600 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-purple-400"
                      >
                        <option value="zip">Separate PDFs (ZIP)</option>
                        <option value="single">One extracted PDF</option>
                      </select>
                      <p className="mt-2 text-xs text-neutral-500">
                        Rotations and page order are preserved in extracted results.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-700 bg-neutral-900/70 p-4">
                      <div className="flex items-start gap-3">
                        <WandSparkles className="w-4 h-4 mt-0.5 text-purple-300" />
                        <div className="flex-1">
                          <label className="flex items-center justify-between gap-3 text-sm font-medium text-neutral-200">
                            <span>Reduce file size</span>
                            <input
                              type="checkbox"
                              checked={optimizeOutput}
                              onChange={(e) => setOptimizeOutput(e.target.checked)}
                              className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-purple-500"
                            />
                          </label>
                          <p className="mt-2 text-xs text-neutral-500">
                            Rebuilds the export with compact object streams. Great for edited and extracted PDFs, though image-heavy files may only shrink a little.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-700 bg-neutral-900/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Size reduction mode</p>
                      <div className="mt-3 grid gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSizeReductionMode('standard');
                            setOptimizeOutput(true);
                          }}
                          className={`rounded-2xl border p-4 text-left transition-colors ${
                            sizeReductionMode === 'standard'
                              ? 'border-purple-500/50 bg-purple-500/10'
                              : 'border-neutral-700 bg-neutral-800/70 hover:border-neutral-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-neutral-100">Standard</p>
                              <p className="mt-1 text-xs text-neutral-500">
                                Available now. Rebuilds the PDF with compact object streams and preserves editing features.
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                              Active
                            </span>
                          </div>
                        </button>

                        <div className="rounded-2xl border border-neutral-700 bg-neutral-800/40 p-4 opacity-75">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-neutral-100">Aggressive</p>
                              <p className="mt-1 text-xs text-neutral-500">
                                Not available yet. This would require a stronger compression engine for image-heavy PDFs.
                              </p>
                            </div>
                            <span className="rounded-full border border-neutral-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                              Coming later
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-neutral-500">{sizeReductionHint}</p>
                    </div>

                    {lastSizeResult && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Last size result</p>
                        <div className="mt-3 space-y-2 text-sm text-neutral-300">
                          <p>
                            {lastSizeResult.context === 'optimize'
                              ? 'Original PDF optimization'
                              : lastSizeResult.context === 'edit'
                                ? 'Edited PDF export'
                                : 'Extracted PDF export'}
                          </p>
                          <p>
                            {formatFileSize(lastSizeResult.summary.originalSize)} {'->'} {formatFileSize(lastSizeResult.summary.outputSize)}
                          </p>
                          <p>
                            {lastSizeResult.summary.savedBytes > 0
                              ? `Saved ${formatFileSize(lastSizeResult.summary.savedBytes)} (${lastSizeResult.summary.savedPercent.toFixed(1)}%)`
                              : 'No measurable size reduction on the last export'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/8 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-purple-300">Export summary</p>
                      <div className="mt-3 space-y-2 text-sm text-neutral-300">
                        <p>{selectedPageCount} page{selectedPageCount === 1 ? '' : 's'} selected for extraction</p>
                        <p>{hasWatermark ? `Watermark: "${watermarkText.trim()}"` : 'No watermark applied'}</p>
                        <p>{optimizeOutput ? `Size reduction enabled with ${sizeReductionMode} mode` : 'Size reduction disabled for edited and extracted exports'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'split' && !isLoadingPages && selectedFiles.length === 1 && pageItems.length === 0 && (
            <div className="mt-8 rounded-2xl border border-neutral-700 bg-neutral-900/50 p-6 text-center text-neutral-400">
              All pages have been removed from the editor. Upload the file again if you want to start over.
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            {activeTab === 'split' && pageItems.length > 0 && (
              <div className="rounded-2xl border border-neutral-700 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-400">
                <span className="font-medium text-neutral-200">Quick actions:</span>{' '}
                optimize the original upload, download the fully edited document, or extract just the selected pages.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {activeTab === 'split' && (
              <>
                <button
                  onClick={handleOptimizePdf}
                  disabled={selectedFiles.length !== 1 || isProcessing}
                  className={`px-6 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                    selectedFiles.length !== 1 || isProcessing
                      ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 shadow-lg border border-neutral-600'
                  }`}
                >
                  <WandSparkles className="w-5 h-5" />
                  <span>{isProcessing ? 'Processing...' : 'Reduce Original File Size'}</span>
                </button>

                <button
                  onClick={handleDownloadEditedPdf}
                  disabled={selectedFiles.length !== 1 || pageItems.length === 0 || isProcessing}
                  className={`px-6 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                    selectedFiles.length !== 1 || pageItems.length === 0 || isProcessing
                      ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-100 text-neutral-900 hover:bg-white shadow-lg'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  <span>{isProcessing ? 'Processing...' : 'Download Edited PDF'}</span>
                </button>
              </>
            )}

            <button
              onClick={activeTab === 'merge' ? handleMerge : handleSplit}
              disabled={
                selectedFiles.length === 0 ||
                (activeTab === 'merge' && selectedFiles.length < 2) ||
                (activeTab === 'split' && selectedPageIds.size === 0) ||
                isProcessing
              }
              className={`px-8 py-3 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                selectedFiles.length === 0 ||
                (activeTab === 'merge' && selectedFiles.length < 2) ||
                (activeTab === 'split' && selectedPageIds.size === 0) ||
                isProcessing
                  ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  : `bg-gradient-to-r ${
                      activeTab === 'merge'
                        ? 'from-indigo-500 to-blue-500 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                        : 'from-purple-500 to-pink-500 shadow-purple-500/25 hover:shadow-purple-500/40'
                    } text-white shadow-lg hover:-translate-y-0.5`
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : activeTab === 'merge' ? (
                <Merge className="w-5 h-5" />
              ) : (
                <Scissors className="w-5 h-5" />
              )}
              <span>
                {isProcessing
                  ? 'Processing...'
                  : activeTab === 'merge'
                    ? 'Merge PDFs'
                    : `Extract ${selectedPageIds.size} Page${selectedPageIds.size === 1 ? '' : 's'}`}
              </span>
            </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
