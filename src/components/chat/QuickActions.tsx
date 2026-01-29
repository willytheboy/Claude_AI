import React, { useEffect, useState } from 'react';
import {
  Waves,
  Utensils,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { QuickAction } from '../../types';

interface QuickActionsProps {
  onAction: (action: string) => void;
  className?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  waves: <Waves className="w-4 h-4" />,
  utensils: <Utensils className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  'map-pin': <MapPin className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  link: <ExternalLink className="w-4 h-4" />,
  message: <MessageSquare className="w-4 h-4" />,
};

export function QuickActions({ onAction, className }: QuickActionsProps) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActions() {
      try {
        const { data, error } = await supabase
          .from('quick_actions')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setActions(data as QuickAction[]);
      } catch (err) {
        console.error('Error loading quick actions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadActions();
  }, []);

  const handleClick = (action: QuickAction) => {
    switch (action.action_type) {
      case 'message':
        onAction(action.action_data);
        break;
      case 'link':
        window.open(action.action_data, '_blank');
        break;
      case 'phone':
        window.location.href = `tel:${action.action_data}`;
        break;
      case 'email':
        window.location.href = `mailto:${action.action_data}`;
        break;
    }
  };

  if (isLoading || actions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleClick(action)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full',
            'bg-primary/10 text-primary hover:bg-primary/20',
            'transition-colors text-sm font-medium',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
          )}
        >
          {action.icon && iconMap[action.icon]}
          {action.label}
        </button>
      ))}
    </div>
  );
}
