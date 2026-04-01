'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, GripVertical, UploadCloud, Loader2, ImagePlus } from 'lucide-react';
import { useSupabaseWithAuth } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ImageItem {
  url: string;
  order: number;
}

interface ImageUploadProps {
  value?: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  organizationId: string;
}

export function ImageUpload({ value = [], onChange, maxImages = 10, organizationId }: ImageUploadProps) {
  const images = value || [];
  const [uploading, setUploading] = useState(false);
  const supabase = useSupabaseWithAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images.`);
      return;
    }

    setUploading(true);
    const newImages: ImageItem[] = [];

    for (const file of acceptedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `temp/${organizationId}/${fileName}`;

        const { error } = await supabase.storage
          .from('listing-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(filePath);
        newImages.push({ url: urlData.publicUrl, order: images.length + newImages.length });
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    setUploading(false);
    onChange([...images, ...newImages]);
  }, [images, maxImages, organizationId, supabase, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    disabled: uploading || images.length >= maxImages,
  });

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages.map((img, idx) => ({ ...img, order: idx })));
  };

  return (
    <div className="space-y-4">
      {/* Uploaded Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <img src={img.url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 text-slate-600 hover:text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              {idx === 0 && (
                <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 shadow-sm">
                  COVER
                </div>
              )}
            </div>
          ))}
          
          {/* Add More Box */}
          {images.length < maxImages && !uploading && (
            <div {...getRootProps()} className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <input {...getInputProps()} />
              <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-[#2BBE9A] transition-colors mb-2" />
              <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700">Add more</span>
            </div>
          )}
        </div>
      )}

      {/* Main Dropzone (Hides if we have images and are just adding more) */}
      {images.length === 0 && (
        <div {...getRootProps()} className={cn(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
          isDragActive ? 'border-[#2BBE9A] bg-[#2BBE9A]/5' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50',
          uploading && 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
        )}>
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-[#2BBE9A] animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Uploading images...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <UploadCloud className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Click or drag images here</p>
              <p className="text-xs text-slate-500">Upload up to {maxImages} high-res photos (JPG, PNG)</p>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay for when clicking "Add More" */}
      {uploading && images.length > 0 && (
        <div className="flex items-center gap-2 text-sm font-medium text-[#2BBE9A] animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading additional images...
        </div>
      )}
    </div>
  );
}

