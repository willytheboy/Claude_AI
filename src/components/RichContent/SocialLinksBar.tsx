import React, { useEffect, useState } from 'react';
import { Instagram, Facebook, Twitter, Youtube, MessageCircle, Music, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { SocialLink } from '../../types';

interface SocialLinksBarProps {
  className?: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-5 h-5" />,
  facebook: <Facebook className="w-5 h-5" />,
  twitter: <Twitter className="w-5 h-5" />,
  whatsapp: <MessageCircle className="w-5 h-5" />,
  youtube: <Youtube className="w-5 h-5" />,
  tiktok: <Music className="w-5 h-5" />,
};

const platformColors: Record<string, string> = {
  instagram: 'hover:text-pink-600 hover:bg-pink-50',
  facebook: 'hover:text-blue-600 hover:bg-blue-50',
  twitter: 'hover:text-sky-500 hover:bg-sky-50',
  whatsapp: 'hover:text-green-600 hover:bg-green-50',
  youtube: 'hover:text-red-600 hover:bg-red-50',
  tiktok: 'hover:text-black hover:bg-gray-100',
};

export function SocialLinksBar({ className }: SocialLinksBarProps) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLinks() {
      try {
        const { data, error } = await supabase
          .from('social_links')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setLinks(data as SocialLink[]);
      } catch (err) {
        console.error('Error loading social links:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadLinks();
  }, []);

  if (isLoading || links.length === 0) return null;

  return (
    <div className={cn('flex items-center justify-center gap-1 py-3 px-4', className)}>
      <span className="text-xs text-muted-foreground mr-2">Connect with us:</span>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-muted-foreground',
            platformColors[link.platform] || 'hover:text-primary hover:bg-primary/10'
          )}
          title={link.display_name}
        >
          {platformIcons[link.platform] || <ExternalLink className="w-5 h-5" />}
        </a>
      ))}
    </div>
  );
}
