'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onImageUploaded, disabled }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      // Client-side image compression
      const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };

      let compressedFile = file;
      try {
        compressedFile = await imageCompression(file, options);
      } catch (err) {
        console.warn('Image compression fallback used:', err);
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        alert(`Failed to upload image: ${error.message}`);
        setUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      if (publicData?.publicUrl) {
        onImageUploaded(publicData.publicUrl);
      }
    } catch (err: any) {
      alert(`Error uploading image: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        title="Attach compressed image (expires in 24h)"
        className="p-2.5 rounded-lg text-ink-muted hover:text-magenta hover:bg-magenta/10 border border-transparent hover:border-magenta/20 transition-all disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-magenta" />
        ) : (
          <ImageIcon className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
