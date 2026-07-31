import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  Star,
  Trash2,
  Upload,
  Plus,
  X,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { GalleryMedia } from '../../types';
import { uploadImageToStorage } from '../../../firebase/storage';

export const GalleryManagement: React.FC = () => {
  const { gallery, uploadGalleryMedia, deleteGalleryMedia } = useAdmin();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [newMedia, setNewMedia] = useState({
    title: '',
    type: 'image' as 'image' | 'video',
    url: '',
    category: 'Highlights' as GalleryMedia['category'],
    isFeatured: false,
  });

  const filteredGallery = filter === 'All' ? gallery : gallery.filter((g) => g.category === filter);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImageToStorage('gallery', file);
      setNewMedia((prev) => ({ ...prev, url, type: 'image' }));
    } catch {
      // Ignore upload errors; the URL field remains editable.
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedia.title.trim() || !newMedia.url.trim()) return;
    uploadGalleryMedia(newMedia);
    setNewMedia({ title: '', type: 'image', url: '', category: 'Highlights', isFeatured: false });
    setShowUploadForm(false);
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Media Library
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Gallery Management ({gallery.length})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            {['All', 'Highlights', 'Ceremony', 'Hackathon', 'Winners'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filter === cat ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2"
          >
            {showUploadForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showUploadForm ? 'Cancel' : 'Upload Media'}</span>
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="p-6 rounded-3xl bg-zinc-950/60 border border-violet-500/30 backdrop-blur-md flex flex-col gap-4"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-400" />
            <span>Upload New Media</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newMedia.title}
              onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
              placeholder="Media title..."
              required
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none"
            />
            <input
              id="gallery-file-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
              title="Upload image to Firebase Storage"
            />
            <input
              type="url"
              value={newMedia.url}
              onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
              placeholder="Image / Video URL..."
              required
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none sm:col-span-2"
            />
          </div>

          {uploading && (
            <p className="text-[11px] text-violet-400 font-semibold">Uploading to Firebase Storage...</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={newMedia.type}
              onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value as 'image' | 'video' })}
              className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>

            <select
              value={newMedia.category}
              onChange={(e) => setNewMedia({ ...newMedia, category: e.target.value as GalleryMedia['category'] })}
              className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="Highlights">Highlights</option>
              <option value="Ceremony">Ceremony</option>
              <option value="Hackathon">Hackathon</option>
              <option value="Winners">Winners</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={newMedia.isFeatured}
                onChange={(e) => setNewMedia({ ...newMedia, isFeatured: e.target.checked })}
                className="rounded"
              />
              <span>Mark as Featured</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="px-5 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer">
              Upload Media
            </button>
          </div>
        </form>
      )}

      {/* Drag & Drop Zone */}
      <div
        className="p-8 rounded-3xl border-2 border-dashed border-white/10 hover:border-violet-500/30 transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer group"
        onClick={() => {
          setShowUploadForm(true);
          setTimeout(() => document.getElementById('gallery-file-input')?.click(), 50);
        }}
      >
        <Upload className="w-8 h-8 text-white/20 group-hover:text-violet-400 transition-colors" />
        <span className="text-xs text-white/40 group-hover:text-white/70">
          Click or drag files here to upload images & videos
        </span>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGallery.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
            No media items found in this category.
          </div>
        ) : (
          filteredGallery.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/30 backdrop-blur-md overflow-hidden transition-all group"
            >
              {/* Image/Video Thumbnail */}
              <div
                className="relative h-48 overflow-hidden cursor-pointer"
                onClick={() => setZoomImage(item.url)}
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />

                {/* Featured Badge */}
                {item.isFeatured && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[9px] font-extrabold flex items-center gap-1 shadow-lg">
                    <Star className="w-2.5 h-2.5" />
                    <span>Featured</span>
                  </div>
                )}

                {/* Media type indicator */}
                <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 backdrop-blur-md">
                  {item.type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-white line-clamp-1">{item.title}</span>
                  <span className="text-[10px] text-white/40">
                    {item.category} · {item.uploadedDate}
                  </span>
                </div>

                <button
                  onClick={() => deleteGalleryMedia(item.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                  title="Delete Media"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/20">
            <img src={zoomImage} alt="Zoomed" className="w-full h-full object-contain" />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 text-white border border-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
