'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { HIGHLIGHT_COLORS } from '@/lib/constants';
import type { Highlight, HighlightRect } from '@/lib/types/database';
import { toast } from 'sonner';

interface PdfViewerProps {
  fileUrl: string;
  currentPage: number;
  onTotalPagesLoaded: (total: number) => void;
  scale: number;
  rotation: number;
  highlights: Highlight[];
  onAddHighlight: (highlight: {
    selected_text: string;
    page_number: number;
    rectangles: HighlightRect[];
    color: string;
  }) => Promise<void>;
  onDeleteHighlight: (highlightId: string) => Promise<void>;
  onExtractToc?: (toc: any[]) => void;
  translateMode?: boolean;
  onTranslateSelection?: (text: string, clientX: number, clientY: number) => void;
}

export function PdfViewer({
  fileUrl,
  currentPage,
  onTotalPagesLoaded,
  scale,
  rotation,
  highlights,
  onAddHighlight,
  onDeleteHighlight,
  onExtractToc,
  translateMode = false,
  onTranslateSelection,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection tooltip state
  const [selectionPopup, setSelectionPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
    rects: HighlightRect[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    rects: [],
  });

  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);

  // 1. Initialize PDF.js and load Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      try {
        setLoadingDoc(true);
        setError(null);

        // Dynamically import pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          onTotalPagesLoaded(doc.numPages);

          // Extract Table of contents (outline) if available
          if (onExtractToc) {
            try {
              const outline = await doc.getOutline();
              if (outline && outline.length > 0) {
                const formattedToc = outline.map((item: any) => ({
                  title: item.title,
                  dest: item.dest,
                }));
                onExtractToc(formattedToc);
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load PDF document');
        }
      } finally {
        if (!isCancelled) setLoadingDoc(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, onTotalPagesLoaded, onExtractToc]);

  // 2. Render Current Page & Text Layer
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    let renderTask: any = null;

    async function renderPage() {
      try {
        setRenderingPage(true);
        setSelectionPopup((prev) => ({ ...prev, visible: false }));
        setActiveHighlight(null);

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        // Render Canvas
        renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        await renderTask.promise;

        // Render Text Layer for selectable text
        const textLayerDiv = textLayerRef.current!;
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        const pdfjsLib = await import('pdfjs-dist');

        await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
          textDivs: [],
        }).promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      } finally {
        setRenderingPage(false);
      }
    }

    renderPage();

    return () => {
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  // 3. Handle Mouse and Touch Text Selection
  const handleProcessSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || !textLayerRef.current) {
      return;
    }

    // Ensure selection is inside textLayer
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (
      anchor &&
      !textLayerRef.current.contains(anchor) &&
      focus &&
      !textLayerRef.current.contains(focus)
    ) {
      return;
    }

    const containerRect = textLayerRef.current.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());

    if (clientRects.length === 0) return;

    // Convert client rects to relative normalized percentages (0.0 to 1.0)
    const relativeRects: HighlightRect[] = clientRects.map((r) => ({
      x0: Math.max(0, (r.left - containerRect.left) / containerRect.width),
      y0: Math.max(0, (r.top - containerRect.top) / containerRect.height),
      x1: Math.min(1, (r.right - containerRect.left) / containerRect.width),
      y1: Math.min(1, (r.bottom - containerRect.top) / containerRect.height),
    }));

    // Position popup near the selection
    const lastRect = clientRects[clientRects.length - 1];

    if (translateMode && onTranslateSelection) {
      // In Translation Mode: trigger translation popup with viewport coordinates
      onTranslateSelection(selectedText, lastRect.right, lastRect.bottom);
      setSelectionPopup((prev) => ({ ...prev, visible: false }));
    } else {
      // In Normal Mode: trigger color highlight picker
      setSelectionPopup({
        visible: true,
        x: lastRect.right - containerRect.left,
        y: lastRect.top - containerRect.top - 45,
        selectedText,
        rects: relativeRects,
      });
    }
  }, [translateMode, onTranslateSelection]);

  // 4. Handle mobile & iPad touch selection changes
  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout | null = null;

    const handleDocSelectionChange = () => {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => {
        handleProcessSelection();
      }, 250);
    };

    document.addEventListener('selectionchange', handleDocSelectionChange);

    return () => {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      document.removeEventListener('selectionchange', handleDocSelectionChange);
    };
  }, [handleProcessSelection]);

  const handleApplyHighlight = async (color: string) => {
    if (!selectionPopup.selectedText || selectionPopup.rects.length === 0) return;

    try {
      await onAddHighlight({
        selected_text: selectionPopup.selectedText,
        page_number: currentPage,
        rectangles: selectionPopup.rects,
        color,
      });

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelectionPopup((prev) => ({ ...prev, visible: false }));
      toast.success('Text highlighted');
    } catch (err: any) {
      toast.error('Failed to save highlight');
    }
  };

  // Filter highlights on current page
  const pageHighlights = highlights.filter((h) => h.page_number === currentPage);

  if (loadingDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-8">
        <Loader2 className="w-8 h-8 animate-spin text-mocha-blue" />
        <p className="text-xs text-mocha-subtext0 font-medium">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="p-3 bg-mocha-red/10 border border-mocha-red/20 rounded-xl text-mocha-red text-xs font-semibold">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-mocha-crust/60 flex justify-center p-4 sm:p-8 relative min-h-0 select-text touch-manipulation"
      onMouseUp={handleProcessSelection}
      onTouchEnd={() => {
        setTimeout(handleProcessSelection, 200);
      }}
    >
      <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white shrink-0 self-start border border-mocha-surface0">
        {/* PDF Canvas */}
        <canvas ref={canvasRef} className="block" />

        {/* PDF.js Text Layer (Overlaid precisely on top of canvas) */}
        <div
          ref={textLayerRef}
          className="textLayer absolute inset-0 select-text"
          style={{ pointerEvents: 'auto' }}
        />

        {/* Highlight Overlays (Rendered from database rectangles) */}
        <div className="absolute inset-0 pointer-events-none">
          {pageHighlights.map((hl) => (
            <React.Fragment key={hl.id}>
              {hl.rectangles.map((rect, idx) => (
                <div
                  key={`${hl.id}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveHighlight(hl);
                  }}
                  className="absolute pointer-events-auto cursor-pointer rounded-[2px] transition-opacity hover:opacity-80"
                  style={{
                    left: `${rect.x0 * 100}%`,
                    top: `${rect.y0 * 100}%`,
                    width: `${(rect.x1 - rect.x0) * 100}%`,
                    height: `${(rect.y1 - rect.y0) * 100}%`,
                    backgroundColor: hl.color,
                    mixBlendMode: 'multiply',
                    opacity: 0.45,
                  }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Selection Color Picker Tooltip */}
        {selectionPopup.visible && (
          <div
            className="absolute z-50 bg-mocha-base border border-mocha-surface1 rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 animate-in zoom-in-95 duration-100 pointer-events-auto"
            style={{
              left: `${Math.max(10, selectionPopup.x - 70)}px`,
              top: `${Math.max(10, selectionPopup.y)}px`,
            }}
          >
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleApplyHighlight(c.value)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 focus:outline-none"
                style={{
                  backgroundColor: c.value,
                  borderColor: c.border,
                }}
                title={`Highlight in ${c.label}`}
              />
            ))}
          </div>
        )}

        {/* Highlight Details Popup on Click */}
        {activeHighlight && (
          <div className="absolute top-4 right-4 z-50 bg-mocha-base/95 border border-mocha-surface1 rounded-xl shadow-2xl p-3 max-w-xs space-y-2 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-mocha-text">Highlight</span>
              <button
                onClick={async () => {
                  await onDeleteHighlight(activeHighlight.id);
                  setActiveHighlight(null);
                  toast.success('Highlight removed');
                }}
                className="text-mocha-red hover:bg-mocha-red/15 p-1 rounded transition-colors"
                title="Delete highlight"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-mocha-subtext0 italic line-clamp-3 bg-mocha-surface0/50 p-2 rounded border border-mocha-surface1">
              "{activeHighlight.selected_text}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
