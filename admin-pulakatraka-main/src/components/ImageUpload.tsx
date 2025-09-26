import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  bucketName: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: Error) => void;
  currentImageUrl?: string;
  folder?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export default function ImageUpload({
  bucketName,
  onUploadComplete,
  onError,
  currentImageUrl,
  folder = '',
  maxSizeMB = 2,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações
    if (!acceptedTypes.includes(file.type)) {
      setError('Tipo de arquivo não suportado');
      onError?.(new Error('Tipo de arquivo não suportado'));
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo ${maxSizeMB}MB`);
      onError?.(new Error(`Arquivo muito grande. Máximo ${maxSizeMB}MB`));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${bucketName}/${fileName}`;

      // Upload para o Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      onUploadComplete(publicUrl);
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro ao fazer upload da imagem');
      setPreview(null);
      onError?.(err as Error);
    } finally {
      setIsUploading(false);
    }
  }, [bucketName, folder, maxSizeMB, acceptedTypes, onUploadComplete, onError]);

  const handleRemoveImage = useCallback(() => {
    setPreview(null);
    onUploadComplete('');
  }, [onUploadComplete]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        onChange={handleFileChange}
        accept={acceptedTypes.join(',')}
        className="hidden"
        id="image-upload"
        disabled={isUploading}
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Enviando...</span>
            </div>
          ) : (
            <>
              {error ? (
                <div className="flex flex-col items-center space-y-2 text-red-500">
                  <X className="w-8 h-8" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-600">Clique para fazer upload</span>
                    <span className="text-xs text-gray-500">ou arraste e solte</span>
                    <span className="text-xs text-gray-400 mt-1">
                      PNG, JPG ou WEBP até {maxSizeMB}MB
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </label>
      )}
    </div>
  );
} 