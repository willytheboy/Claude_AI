import React, { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import type { SocialLink } from '../../types';

const PLATFORMS = ['instagram', 'facebook', 'twitter', 'whatsapp', 'youtube', 'tiktok'];

export function SocialLinksTab() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLink, setNewLink] = useState({ platform: 'instagram', url: '', display_name: '' });

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      const { data } = await supabase.from('social_links').select('*').order('display_order');
      if (data) setLinks(data as SocialLink[]);
    } catch (error) {
      console.error('Error loading social links:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newLink.url || !newLink.display_name) return;
    try {
      const { data, error } = await supabase
        .from('social_links')
        .insert({ ...newLink, display_order: links.length })
        .select()
        .single();
      if (error) throw error;
      setLinks((prev) => [...prev, data as SocialLink]);
      setNewLink({ platform: 'instagram', url: '', display_name: '' });
    } catch (error) {
      console.error('Error adding social link:', error);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await supabase.from('social_links').update({ is_active: isActive }).eq('id', id);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: isActive } : l)));
    } catch (error) {
      console.error('Error toggling link:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this social link?')) return;
    try {
      await supabase.from('social_links').delete().eq('id', id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Add Social Link</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <select
            value={newLink.platform}
            onChange={(e) => setNewLink({ ...newLink, platform: e.target.value as SocialLink['platform'] })}
            className="input capitalize"
          >
            {PLATFORMS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
          <input
            type="text"
            value={newLink.display_name}
            onChange={(e) => setNewLink({ ...newLink, display_name: e.target.value })}
            placeholder="Display Name"
            className="input"
          />
          <input
            type="url"
            value={newLink.url}
            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            placeholder="https://..."
            className="input"
          />
        </div>
        <button onClick={handleAdd} disabled={!newLink.url || !newLink.display_name} className="btn btn-primary px-4 py-2">
          <Plus className="w-4 h-4 mr-2" />Add Link
        </button>
      </div>

      <div className="card divide-y divide-border">
        {links.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">No social links configured</p>
        ) : (
          links.map((link) => (
            <div key={link.id} className={cn('flex items-center gap-4 p-4', !link.is_active && 'opacity-50')}>
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
              <div className="flex-1">
                <p className="font-medium capitalize">{link.platform}</p>
                <p className="text-sm text-muted-foreground">{link.display_name}</p>
              </div>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-secondary rounded">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
              <button
                onClick={() => handleToggle(link.id, !link.is_active)}
                className={cn('px-2 py-1 text-xs rounded', link.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}
              >
                {link.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => handleDelete(link.id)} className="p-2 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
