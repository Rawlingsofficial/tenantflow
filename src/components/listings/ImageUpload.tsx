// src/components/listings/ImageUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, GripVertical, Upload } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ImageItem {
  id?: string; // for existing images from DB
  url: string;
  order: number;
  file?: File; // for new uploads (temporary)
}

interface ImageUploadProps {
  value: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  listingId?: string; // if provided, upload directly to listing folder; otherwise, use temp
  organizationId?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  maxImages = 10,
  listingId,
  organizationId,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        alert(`You can upload up to ${maxImages} images.`);
        return;
      }

      setUploading(true);
      const newImages: ImageItem[] = [];

      for (const file of acceptedFiles) {
        try {
          // Upload to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const folder = listingId
            ? `${organizationId}/listings/${listingId}`
            : `temp/${organizationId}`;
          const filePath = `${folder}/${fileName}`;

          const { data, error } = await supabase.storage
            .from('listing-images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('listing-images')
            .getPublicUrl(filePath);

          newImages.push({
            url: urlData.publicUrl,
            order: value.length + newImages.length,
            file,
          });
        } catch (err) {
          console.error('Upload error:', err);
        }
      }

      setUploading(false);
      onChange([...value, ...newImages]);
    },
    [value, maxImages, listingId, organizationId, supabase, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    disabled: uploading || value.length >= maxImages,
  });

  const removeImage = (index: number) => {
    const newImages = [...value];
    newImages.splice(index, 1);
    // Reorder
    newImages.forEach((img, idx) => (img.order = idx));
    onChange(newImages);
  };

  const moveImage = (from: number, to: number) => {
    const newImages = [...value];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    newImages.forEach((img, idx) => (img.order = idx));
    onChange(newImages);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {value.map((img, idx) => (
          <div key={idx} className="relative group">
            <img
              src={img.url}
              alt={`Listing image ${idx + 1}`}
              className="h-32 w-full object-cover rounded-md"
            />
            <div className="absolute top-2 left-2 cursor-move">
              <GripVertical className="h-4 w-4 text-white bg-black/50 rounded p-0.5" />
            </div>
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300',
          (uploading || value.length >= maxImages) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop images here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supported: JPG, PNG, WEBP. Max {maxImages} images.
        </p>
      </div>
    </div>
  );
}

