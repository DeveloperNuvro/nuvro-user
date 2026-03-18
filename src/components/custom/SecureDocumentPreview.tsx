import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { api, baseURL, getApiBaseUrl } from '@/api/axios';

const DEBUG_DOC_PREVIEW = false;

function isAuthRequiredUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim();
  if (baseURL && normalized.startsWith(baseURL)) return true;
  return normalized.includes('/api/v1/unipile/attachments/');
}

function isGenericMime(mime: string): boolean {
  const g = (mime || '').toLowerCase();
  return !g || g === 'application/octet-stream' || g === 'application/binary' || g === 'binary/octet-stream';
}

async function inferMimeFromBlob(blob: Blob): Promise<string | null> {
  if (blob.size < 4) return null;
  const buf = await blob.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}

type Variant = 'pdf' | 'image' | 'placeholder';

/** Word/Excel/PowerPoint – browser cannot show these in iframe; show "Download to open" instead. */
const OFFICE_EXT = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i;

function isOfficeDocument(fileName?: string | null): boolean {
  return !!(fileName && OFFICE_EXT.test(fileName));
}

interface SecureDocumentPreviewProps {
  url: string | null;
  variant: Variant;
  fileName?: string | null;
  downloadLabel?: string;
  className?: string;
  showDownload?: boolean;
}

/**
 * Document preview that always works: we fetch the document (via auth proxy or backend document proxy),
 * create a blob URL, and use that SAME blob URL for both iframe preview and download.
 * This avoids iframe blocking (X-Frame-Options) from Cloudinary/CDNs.
 */
export default function SecureDocumentPreview({
  url,
  variant,
  fileName,
  downloadLabel = 'Download',
  className = '',
  showDownload = true,
}: SecureDocumentPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const revokedRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);
  const fetchedUrlRef = useRef<string | null>(null);

  const needsAuth = url ? isAuthRequiredUrl(url) : false;
  const isCloudinaryUrl = url ? url.includes('cloudinary.com') : false;
  const isCloudinaryImageUrl = Boolean(url && isCloudinaryUrl && url.includes('/image/upload/'));
  // For documents (PDF/placeholder), we need a blob URL so iframe can display (direct URLs are often blocked).
  const isDocumentVariant = variant === 'pdf' || variant === 'placeholder';
  const shouldFetchForPreview =
    url &&
    isDocumentVariant &&
    !isCloudinaryImageUrl &&
    (needsAuth || (isCloudinaryUrl && isDocumentVariant));

  // IMPORTANT: avoid auto-download.
  // If the upstream sends Content-Disposition: attachment, pointing iframe at the direct URL can trigger a download.
  // So when we plan to fetch + blob (auth proxy / cloudinary docs), only set iframe src AFTER blobUrl is ready.
  const mustUseBlobForPreview = Boolean(shouldFetchForPreview);

  // Single URL for download button: prefer blob when available (same file), else original url
  const previewAndDownloadUrl = blobUrl || url || null;
  const iframeSrc = mustUseBlobForPreview ? (blobUrl || undefined) : (previewAndDownloadUrl || undefined);

  // Trigger download only on explicit click (prevents auto-download when opening chat)
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!previewAndDownloadUrl) return;
    const a = document.createElement('a');
    a.href = previewAndDownloadUrl;
    a.download = fileName || 'document';
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (DEBUG_DOC_PREVIEW && url) {
    console.log('[DocPreview]', {
      url: url.slice(0, 60),
      needsAuth,
      shouldFetchForPreview,
      blobUrl: !!blobUrl,
      previewAndDownloadUrl: previewAndDownloadUrl?.slice(0, 60),
    });
  }

  // Fetch 1: Auth proxy (Unipile attachment) – get blob, use for preview + download
  useEffect(() => {
    if (!url || !needsAuth) {
      setBlobUrl(null);
      setLoading(false);
      setError(false);
      return;
    }
    if (fetchedUrlRef.current === url) return;

    revokedRef.current = false;
    fetchedUrlRef.current = url;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    const controller = new AbortController();
    api
      .get(url, { responseType: 'blob', signal: controller.signal })
      .then(async (res) => {
        if (revokedRef.current) return;
        const blob = res.data as Blob;
        const contentType = (res.headers && (res.headers['content-type'] as string)) || blob.type || '';
        let mime = (contentType.split(';')[0].trim().toLowerCase() || blob.type || '').toLowerCase();
        if ((!mime || isGenericMime(mime)) && blob.size >= 4) {
          const inferred = await inferMimeFromBlob(blob);
          if (inferred) mime = inferred;
        }
        const next = URL.createObjectURL(blob);
        blobUrlRef.current = next;
        setBlobUrl(next);
        setLoading(false);
      })
      .catch(() => {
        if (!revokedRef.current) {
          setError(true);
          setLoading(false);
          setBlobUrl(null);
        }
        fetchedUrlRef.current = null;
      });

    return () => {
      revokedRef.current = true;
      fetchedUrlRef.current = null;
      controller.abort();
      const toRevoke = blobUrlRef.current;
      if (toRevoke) {
        URL.revokeObjectURL(toRevoke);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
    };
  }, [url, needsAuth]);

  // Fetch 2: Cloudinary (and other proxy-allowlisted) documents – backend proxy returns blob, so iframe works
  useEffect(() => {
    const apiBase = getApiBaseUrl();
    if (
      !url ||
      !apiBase ||
      needsAuth ||
      isCloudinaryImageUrl ||
      !isDocumentVariant ||
      !isCloudinaryUrl
    ) {
      return;
    }
    if (fetchedUrlRef.current === url || blobUrlRef.current) return;

    revokedRef.current = false;
    fetchedUrlRef.current = url;
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const proxyUrl = `${apiBase}/api/v1/documents/proxy?url=${encodeURIComponent(url)}`;

    api
      .get(proxyUrl, { responseType: 'blob', signal: controller.signal, validateStatus: () => true })
      .then(async (res) => {
        if (revokedRef.current) return;
        if (res.status < 200 || res.status >= 300) {
          setError(true);
          setLoading(false);
          fetchedUrlRef.current = null;
          return;
        }
        const blob = res.data as Blob;
        const contentType = (res.headers && (res.headers['content-type'] as string)) || blob.type || '';
        let mime = (contentType.split(';')[0].trim().toLowerCase() || blob.type || '').toLowerCase();
        if ((!mime || isGenericMime(mime)) && blob.size >= 4) {
          const inferred = await inferMimeFromBlob(blob);
          if (inferred) mime = inferred;
        }
        const next = URL.createObjectURL(blob);
        blobUrlRef.current = next;
        setBlobUrl(next);
        setLoading(false);
        fetchedUrlRef.current = null;
      })
      .catch(() => {
        if (!revokedRef.current) {
          setError(true);
          setLoading(false);
        }
        fetchedUrlRef.current = null;
      });

    return () => {
      revokedRef.current = true;
      if (fetchedUrlRef.current === url) fetchedUrlRef.current = null;
      controller.abort();
      const toRevoke = blobUrlRef.current;
      blobUrlRef.current = null;
      if (toRevoke) {
        URL.revokeObjectURL(toRevoke);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
    };
  }, [url, needsAuth, isCloudinaryImageUrl, isDocumentVariant, isCloudinaryUrl]);

  if (!url) return null;

  // Image: direct URL is fine (no iframe blocking for img)
  if (isCloudinaryImageUrl || variant === 'image') {
    return (
      <div className={className}>
        <div className="rounded-md border overflow-hidden">
          <img
            src={previewAndDownloadUrl || undefined}
            alt={fileName || 'Document'}
            className="max-h-[240px] w-full object-contain bg-muted/30"
          />
        </div>
        {showDownload && previewAndDownloadUrl && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium mt-2"
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </button>
        )}
      </div>
    );
  }

  // Only Word/Excel/PowerPoint get the "cannot preview" card. PDF and everything else use iframe.
  const isOffice = isOfficeDocument(fileName);

  if (isOffice && (previewAndDownloadUrl || url)) {
    // Word, Excel, PowerPoint – browser can't preview; show message + download
    return (
      <div className={className}>
        <div className="rounded-md border bg-muted/50 overflow-hidden min-h-[200px] flex flex-col items-center justify-center gap-3 p-6">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
          {!loading && (
            <>
              <FileText className="h-14 w-14 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                {isOffice
                  ? 'Word, Excel, and PowerPoint files cannot be previewed in the browser. Download to open.'
                  : 'This file cannot be previewed in the browser. Download to open.'}
              </p>
            </>
          )}
        </div>
        {showDownload && (previewAndDownloadUrl || url) && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium mt-2"
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </button>
        )}
      </div>
    );
  }

  // PDF (or unknown with blob): same blob URL for preview and download
  return (
    <div className={className}>
      <div className="rounded-md border bg-muted/50 overflow-hidden min-h-[200px] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !previewAndDownloadUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">Preview could not be loaded</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open in new tab
            </a>
          </div>
        )}
        <iframe
          key={iframeSrc || 'empty'}
          src={iframeSrc}
          title="Document preview"
          className="w-full h-[240px] border-0 min-h-[200px]"
        />
      </div>
      {showDownload && previewAndDownloadUrl && (
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium mt-2"
        >
          <Download className="h-4 w-4" />
          {downloadLabel}
        </button>
      )}
    </div>
  );
}
