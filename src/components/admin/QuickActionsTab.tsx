import React, { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, MessageSquare, ExternalLink, Phone, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import type { QuickAction } from '../../types';

const ACTION_TYPES = [
  { value: 'message', label: 'Send Message', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'link', label: 'Open Link', icon: <ExternalLink className="w-4 h-4" /> },
  { value: 'phone', label: 'Call Phone', icon: <Phone className="w-4 h-4" /> },
  { value: 'email', label: 'Send Email', icon: <Mail className="w-4 h-4" /> },
];

export function QuickActionsTab() {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAction, setNewAction] = useState({ label: '', action_type: 'message' as const, action_data: '', icon: 'message' });

  useEffect(() => {
    loadActions();
  }, []);

  async function loadActions() {
    try {
      const { data } = await supabase.from('quick_actions').select('*').order('display_order');
      if (data) setActions(data as QuickAction[]);
    } catch (error) {
      console.error('Error loading quick actions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newAction.label || !newAction.action_data) return;
    try {
      const { data, error } = await supabase
        .from('quick_actions')
        .insert({ ...newAction, display_order: actions.length })
        .select()
        .single();
      if (error) throw error;
      setActions((prev) => [...prev, data as QuickAction]);
      setNewAction({ label: '', action_type: 'message', action_data: '', icon: 'message' });
    } catch (error) {
      console.error('Error adding quick action:', error);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await supabase.from('quick_actions').update({ is_active: isActive }).eq('id', id);
      setActions((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: isActive } : a)));
    } catch (error) {
      console.error('Error toggling action:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this quick action?')) return;
    try {
      await supabase.from('quick_actions').delete().eq('id', id);
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  }

  const getPlaceholder = (type: string) => {
    switch (type) {
      case 'message': return 'Message to send (e.g., "What are the pool hours?")';
      case 'link': return 'URL to open (e.g., https://...)';
      case 'phone': return 'Phone number (e.g., +961...)';
      case 'email': return 'Email address';
      default: return 'Action data';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Add Quick Action</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={newAction.label}
              onChange={(e) => setNewAction({ ...newAction, label: e.target.value })}
              placeholder="Button Label"
              className="input"
            />
            <select
              value={newAction.action_type}
              onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value as QuickAction['action_type'] })}
              className="input"
            >
              {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input
            type="text"
            value={newAction.action_data}
            onChange={(e) => setNewAction({ ...newAction, action_data: e.target.value })}
            placeholder={getPlaceholder(newAction.action_type)}
            className="input w-full"
          />
          <button onClick={handleAdd} disabled={!newAction.label || !newAction.action_data} className="btn btn-primary px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />Add Quick Action
          </button>
        </div>
      </div>

      <div className="card divide-y divide-border">
        {actions.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">No quick actions configured</p>
        ) : (
          actions.map((action) => (
            <div key={action.id} className={cn('flex items-center gap-4 p-4', !action.is_active && 'opacity-50')}>
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
              <div className="flex-1">
                <p className="font-medium">{action.label}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {ACTION_TYPES.find((t) => t.value === action.action_type)?.icon}
                  {action.action_data.slice(0, 40)}{action.action_data.length > 40 ? '...' : ''}
                </p>
              </div>
              <button
                onClick={() => handleToggle(action.id, !action.is_active)}
                className={cn('px-2 py-1 text-xs rounded', action.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}
              >
                {action.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => handleDelete(action.id)} className="p-2 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
