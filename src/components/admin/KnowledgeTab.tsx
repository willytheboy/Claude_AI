import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ExternalLink, RefreshCw, FileText, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatRelativeTime } from '../../lib/utils';
import type { KnowledgeUrl, KnowledgeFile } from '../../types';

export function KnowledgeTab() {
  const [urls, setUrls] = useState<KnowledgeUrl[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [urlsRes, filesRes] = await Promise.all([
        supabase.from('knowledge_urls').select('*').order('created_at', { ascending: false }),
        supabase.from('knowledge_files').select('*').order('created_at', { ascending: false }),
      ]);

      if (urlsRes.data) setUrls(urlsRes.data as KnowledgeUrl[]);
      if (filesRes.data) setFiles(filesRes.data as KnowledgeFile[]);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddUrl() {
    if (!newUrl.trim()) return;

    setIsAddingUrl(true);
    try {
      // First add the URL to the database
      const { data, error } = await supabase
        .from('knowledge_urls')
        .insert({ url: newUrl.trim() })
        .select()
        .single();

      if (error) throw error;
      setUrls((prev) => [data as KnowledgeUrl, ...prev]);
      setNewUrl('');

      // Then scrape the URL
      if (data) {
        await handleScrapeUrl(data.id);
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      alert('Failed to add URL. It may already exist in the knowledge base.');
    } finally {
      setIsAddingUrl(false);
    }
  }

  async function handleScrapeUrl(urlId: string) {
    setScrapingUrl(urlId);
    try {
      const url = urls.find((u) => u.id === urlId)?.url;
      if (!url) return;

      // Call the scrape-url edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/scrape-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error('Failed to scrape URL');

      const result = await response.json();

      // Update the URL with scraped content
      await supabase
        .from('knowledge_urls')
        .update({
          title: result.title,
          description: result.description,
          content: result.content,
          last_scraped_at: new Date().toISOString(),
        })
        .eq('id', urlId);

      // Update local state
      setUrls((prev) =>
        prev.map((u) =>
          u.id === urlId
            ? {
                ...u,
                title: result.title,
                description: result.description,
                content: result.content,
                last_scraped_at: new Date().toISOString(),
              }
            : u
        )
      );
    } catch (error) {
      console.error('Error scraping URL:', error);
    } finally {
      setScrapingUrl(null);
    }
  }

  async function handleDeleteUrl(id: string) {
    if (!confirm('Are you sure you want to remove this URL from the knowledge base?')) return;

    try {
      await supabase.from('knowledge_urls').delete().eq('id', id);
      setUrls((prev) => prev.filter((u) => u.id !== id));
    } catch (error) {
      console.error('Error deleting URL:', error);
    }
  }

  async function handleToggleUrl(id: string, isActive: boolean) {
    try {
      await supabase.from('knowledge_urls').update({ is_active: isActive }).eq('id', id);
      setUrls((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: isActive } : u)));
    } catch (error) {
      console.error('Error toggling URL:', error);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Supabase storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('knowledge-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Read file content if it's a text file
      let content = null;
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        content = await file.text();
      }

      // Save file metadata
      const { data, error } = await supabase
        .from('knowledge_files')
        .insert({
          filename: file.name,
          storage_path: uploadData.path,
          content,
          file_type: file.type,
        })
        .select()
        .single();

      if (error) throw error;
      setFiles((prev) => [data as KnowledgeFile, ...prev]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file.');
    }
  }

  async function handleDeleteFile(id: string, storagePath: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await supabase.storage.from('knowledge-files').remove([storagePath]);
      await supabase.from('knowledge_files').delete().eq('id', id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* URLs Section */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Knowledge URLs
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add URLs for the AI to learn from. Content will be scraped and used to answer questions.
        </p>

        {/* Add URL */}
        <div className="flex gap-2 mb-6">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://example.com/page"
            className="input flex-1"
          />
          <button
            onClick={handleAddUrl}
            disabled={!newUrl.trim() || isAddingUrl}
            className="btn btn-primary px-4"
          >
            {isAddingUrl ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* URL List */}
        <div className="space-y-3">
          {urls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No URLs added yet. Add a URL above to get started.
            </p>
          ) : (
            urls.map((url) => (
              <div
                key={url.id}
                className={cn(
                  'p-4 rounded-lg border',
                  url.is_active ? 'bg-white border-border' : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={url.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline truncate"
                      >
                        {url.title || url.url}
                      </a>
                      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    {url.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {url.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {url.last_scraped_at
                        ? `Last scraped ${formatRelativeTime(url.last_scraped_at)}`
                        : 'Not scraped yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleScrapeUrl(url.id)}
                      disabled={scrapingUrl === url.id}
                      className="p-1.5 hover:bg-secondary rounded"
                      title="Re-scrape URL"
                    >
                      <RefreshCw
                        className={cn(
                          'w-4 h-4 text-muted-foreground',
                          scrapingUrl === url.id && 'animate-spin'
                        )}
                      />
                    </button>
                    <button
                      onClick={() => handleToggleUrl(url.id, !url.is_active)}
                      className={cn(
                        'px-2 py-1 text-xs rounded',
                        url.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {url.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDeleteUrl(url.id)}
                      className="p-1.5 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Files Section */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Knowledge Files
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload documents for the AI to reference. Supports text files, PDFs, and more.
        </p>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block">
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.md,.pdf,.doc,.docx"
            />
            <div className="flex items-center justify-center px-6 py-8 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload a file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .txt, .md, .pdf, .doc, .docx
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* File List */}
        <div className="space-y-3">
          {files.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No files uploaded yet.
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  file.is_active ? 'bg-white border-border' : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.file_type} - Added {formatRelativeTime(file.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.id, file.storage_path)}
                  className="p-1.5 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
