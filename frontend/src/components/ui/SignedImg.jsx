import { useSignedUrl } from '../../hooks/useSignedUrl';

/**
 * SignedImg — renders an <img> with a signed Supabase storage URL.
 * For external URLs (YouTube, etc.) the URL is returned unchanged.
 * Falls back to `fallback` prop while loading or on error.
 */
export default function SignedImg({ src, fallback = null, alt = '', style = {}, className = '' }) {
  const signedSrc = useSignedUrl(src);

  if (!signedSrc) return fallback;

  return (
    <img
      src={signedSrc}
      alt={alt}
      style={style}
      className={className}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}
