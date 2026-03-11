import { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ImageCardProps {
  url: string;
  caption?: string;
  alt?: string;
  className?: string;
}

export function ImageCard({ url, caption, alt, className }: ImageCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden bg-secondary cursor-pointer group',
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {hasError ? (
          <div className="h-48 flex items-center justify-center bg-secondary">
            <p className="text-sm text-muted-foreground">Failed to load image</p>
          </div>
        ) : (
          <img
            src={url}
            alt={alt || caption || 'Image'}
            className={cn(
              'w-full h-48 object-cover transition-transform duration-300',
              'group-hover:scale-105',
              isLoading && 'opacity-0'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}

        {/* Zoom indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Caption */}
        {caption && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-sm text-white">{caption}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsOpen(false)}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <img
            src={url}
            alt={alt || caption || 'Image'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-lg">
              <p className="text-white text-center">{caption}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
