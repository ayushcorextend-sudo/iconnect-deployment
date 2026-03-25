import { useState, useEffect } from 'react';
import { signArtifactUrl } from '../lib/signedUrl';

/**
 * Resolves a raw Supabase storage URL to a signed URL.
 * Returns null while loading, null if no rawUrl provided.
 *
 * Usage:
 *   const signedSrc = useSignedUrl(artifact.file_url);
 *   <iframe src={signedSrc || ''} />
 */
export function useSignedUrl(rawUrl) {
  const [signedUrl, setSignedUrl] = useState(null);

  useEffect(() => {
    if (!rawUrl) { setSignedUrl(null); return; }

    let cancelled = false;
    signArtifactUrl(rawUrl).then(url => {
      if (!cancelled) setSignedUrl(url);
    });

    return () => { cancelled = true; };
  }, [rawUrl]);

  return signedUrl;
}
