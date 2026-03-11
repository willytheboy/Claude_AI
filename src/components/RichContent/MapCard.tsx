
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MapCardProps {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  className?: string;
}

export function MapCard({ address, coordinates, zoom: _zoom = 15, className }: MapCardProps) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;

  const handleGetDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`;
    window.open(directionsUrl, '_blank');
  };

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-white border border-border shadow-sm',
        className
      )}
    >
      {/* Map placeholder - shows a styled card with map preview */}
      <div className="relative h-40 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Sporting Club Beach</p>
            <p className="text-xs text-muted-foreground">Beirut, Lebanon</p>
          </div>
        </div>
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(#1e3a5f 1px, transparent 1px), linear-gradient(90deg, #1e3a5f 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Info section */}
      <div className="p-3">
        <div className="flex items-start gap-3 mb-3">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{address}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-3 py-2 rounded-lg text-sm font-medium',
              'bg-secondary text-secondary-foreground',
              'hover:bg-secondary/80 transition-colors'
            )}
          >
            <ExternalLink className="w-4 h-4" />
            View Map
          </a>
          <button
            onClick={handleGetDirections}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-3 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Navigation className="w-4 h-4" />
            Directions
          </button>
        </div>
      </div>
    </div>
  );
}
