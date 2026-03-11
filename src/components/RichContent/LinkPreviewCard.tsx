import { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LinkPreviewCardProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  className?: string;
}

export function LinkPreviewCard({
  url,
  title,
  description,
  image,
  className,
}: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false);

  // Extract domain from URL
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-xl overflow-hidden bg-white border border-border shadow-sm',
        'hover:shadow-md transition-shadow group',
        className
      )}
    >
      {/* Image */}
      {image && !imageError && (
        <div className="relative h-40 bg-secondary">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </p>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span>{getDomain(url)}</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </a>
  );
}
