import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import type { ClubImage } from '../../types';

const CATEGORIES = ['pool', 'restaurant', 'beach', 'sports', 'facilities', 'events', 'other'];

export function ImagesTab() {
  const [images, setImages] = useState<ClubImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingImage, setEditingImage] = useState<ClubImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      const { data, error } = await supabase
        .from('club_images')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data as ClubImage[]);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('club-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('club-images')
          .getPublicUrl(fileName);

        const { data, error } = await supabase
          .from('club_images')
          .insert({
            url: urlData.publicUrl,
            storage_path: uploadData.path,
            category: 'other',
            title: file.name.replace(/\.[^/.]+$/, ''),
            display_order: images.length,
          })
          .select()
          .single();

        if (error) throw error;
        setImages((prev) => [...prev, data as ClubImage]);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload some images');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleUpdateImage(image: ClubImage) {
    try {
      const { error } = await supabase
        .from('club_images')
        .update({
          title: image.title,
          description: image.description,
          category: image.category,
          tags: image.tags,
          is_active: image.is_active,
        })
        .eq('id', image.id);

      if (error) throw error;
      setImages((prev) => prev.map((i) => (i.id === image.id ? image : i)));
      setEditingImage(null);
    } catch (error) {
      console.error('Error updating image:', error);
    }
  }

  async function handleDeleteImage(id: string, storagePath: string) {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await supabase.storage.from('club-images').remove([storagePath]);
      await supabase.from('club_images').delete().eq('id', id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter((img) => img.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full whitespace-nowrap',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            All ({images.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full whitespace-nowrap capitalize',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {cat} ({images.filter((i) => i.category === cat).length})
            </button>
          ))}
        </div>

        <label className="btn btn-primary px-4 py-2 cursor-pointer">
          <input
            type="file"
            onChange={handleUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Upload Images
        </label>
      </div>

      {/* Image Grid */}
      {filteredImages.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No images in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={cn(
                'card overflow-hidden group',
                !image.is_active && 'opacity-50'
              )}
            >
              <div className="relative aspect-square">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setEditingImage(image)}
                    className="p-2 bg-white rounded-full"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteImage(image.id, image.storage_path)}
                    className="p-2 bg-white rounded-full"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-foreground text-sm truncate">{image.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{image.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Edit Image</h3>
              <button onClick={() => setEditingImage(null)} className="p-1 hover:bg-secondary rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <img
                src={editingImage.url}
                alt={editingImage.title}
                className="w-full h-48 object-cover rounded-lg"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editingImage.title}
                  onChange={(e) => setEditingImage({ ...editingImage, title: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editingImage.description || ''}
                  onChange={(e) => setEditingImage({ ...editingImage, description: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={editingImage.category}
                  onChange={(e) => setEditingImage({ ...editingImage, category: e.target.value })}
                  className="input w-full"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editingImage.tags.join(', ')}
                  onChange={(e) => setEditingImage({
                    ...editingImage,
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })}
                  className="input w-full"
                  placeholder="pool, summer, outdoor"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingImage.is_active}
                  onChange={(e) => setEditingImage({ ...editingImage, is_active: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm">Active (visible to AI)</label>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEditingImage(null)} className="btn btn-secondary px-4 py-2">
                Cancel
              </button>
              <button
                onClick={() => handleUpdateImage(editingImage)}
                className="btn btn-primary px-4 py-2"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
