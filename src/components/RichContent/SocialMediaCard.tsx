import React from 'react';
import { Instagram, Facebook, Twitter, Youtube, MessageCircle, Music, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SocialMediaCardProps {
  platform: string;
  url: string;
  label: string;
  className?: string;
}

const platformConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  instagram: {
    icon: <Instagram className="w-5 h-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
  },
  facebook: {
    icon: <Facebook className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
  },
  twitter: {
    icon: <Twitter className="w-5 h-5" />,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500',
  },
  whatsapp: {
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-500',
  },
  youtube: {
    icon: <Youtube className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-600',
  },
  tiktok: {
    icon: <Music className="w-5 h-5" />,
    color: 'text-black',
    bgColor: 'bg-black',
  },
};

export function SocialMediaCard({ platform, url, label, className }: SocialMediaCardProps) {
  const config = platformConfig[platform.toLowerCase()] || {
    icon: <ExternalLink className="w-5 h-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-500',
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'bg-white border border-border shadow-sm',
        'hover:shadow-md transition-all',
        'group',
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white',
          config.bgColor
        )}
      >
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground capitalize">{platform}</p>
        <p className="text-sm text-muted-foreground truncate">{label}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}
