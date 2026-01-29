import React from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WeatherCardProps {
  temperature: number;
  conditions: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  recommendation?: string;
  className?: string;
}

const weatherIcons: Record<string, React.ReactNode> = {
  '01d': <Sun className="w-12 h-12 text-yellow-500" />,
  '01n': <Sun className="w-12 h-12 text-yellow-400" />,
  '02d': <Cloud className="w-12 h-12 text-gray-400" />,
  '02n': <Cloud className="w-12 h-12 text-gray-500" />,
  '03d': <Cloud className="w-12 h-12 text-gray-500" />,
  '03n': <Cloud className="w-12 h-12 text-gray-600" />,
  '04d': <Cloud className="w-12 h-12 text-gray-600" />,
  '04n': <Cloud className="w-12 h-12 text-gray-700" />,
  '09d': <CloudRain className="w-12 h-12 text-blue-500" />,
  '09n': <CloudRain className="w-12 h-12 text-blue-600" />,
  '10d': <CloudRain className="w-12 h-12 text-blue-400" />,
  '10n': <CloudRain className="w-12 h-12 text-blue-500" />,
  '11d': <CloudRain className="w-12 h-12 text-purple-500" />,
  '11n': <CloudRain className="w-12 h-12 text-purple-600" />,
  '13d': <CloudSnow className="w-12 h-12 text-blue-200" />,
  '13n': <CloudSnow className="w-12 h-12 text-blue-300" />,
  '50d': <Cloud className="w-12 h-12 text-gray-400" />,
  '50n': <Cloud className="w-12 h-12 text-gray-500" />,
};

function getBackgroundGradient(icon: string): string {
  if (icon.startsWith('01')) {
    return 'from-yellow-400 to-orange-400';
  }
  if (icon.startsWith('02') || icon.startsWith('03')) {
    return 'from-blue-400 to-sky-400';
  }
  if (icon.startsWith('04')) {
    return 'from-gray-400 to-slate-400';
  }
  if (icon.startsWith('09') || icon.startsWith('10') || icon.startsWith('11')) {
    return 'from-blue-500 to-indigo-500';
  }
  if (icon.startsWith('13')) {
    return 'from-blue-100 to-slate-200';
  }
  return 'from-gray-400 to-slate-500';
}

export function WeatherCard({
  temperature,
  conditions,
  icon,
  humidity,
  windSpeed,
  recommendation,
  className,
}: WeatherCardProps) {
  const weatherIcon = weatherIcons[icon] || <Sun className="w-12 h-12 text-yellow-500" />;
  const bgGradient = getBackgroundGradient(icon);

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-white border border-border shadow-sm',
        className
      )}
    >
      {/* Main weather display */}
      <div className={cn('p-4 bg-gradient-to-br text-white', bgGradient)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold">{Math.round(temperature)}°C</p>
            <p className="text-lg capitalize opacity-90">{conditions}</p>
          </div>
          {weatherIcon}
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          {humidity !== undefined && (
            <div className="flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span>{humidity}% humidity</span>
            </div>
          )}
          {windSpeed !== undefined && (
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-gray-500" />
              <span>{windSpeed} km/h</span>
            </div>
          )}
        </div>

        {recommendation && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm text-foreground flex items-start gap-2">
              <Thermometer className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              {recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
