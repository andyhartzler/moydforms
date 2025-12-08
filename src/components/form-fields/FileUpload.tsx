'use client';

import { useRef, useState } from 'react';
import { FormFieldConfig } from '@/types/forms';
import { Upload, X, File, FileText, FileImage, FileVideo, FileAudio } from 'lucide-react';

interface FileUploadProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  onFileUpload?: (file: File, fieldId: string) => Promise<string>;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

export default function FileUpload({ field, value, onChange, error, onBlur, onFocus, onFileUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const files: UploadedFile[] = value || [];
  const allowMultiple = field.allowMultipleFiles ?? false;
  const maxSizeMB = field.maxFileSizeMB ?? 10;
  const allowedExtensions = field.allowedExtensions;

  const getAcceptString = () => {
    if (field.fileTypeFilter === 'image') return 'image/*';
    if (field.fileTypeFilter === 'video') return 'video/*';
    if (field.fileTypeFilter === 'audio') return 'audio/*';
    if (allowedExtensions && allowedExtensions.length > 0) {
      return allowedExtensions.map(ext => `.${ext}`).join(',');
    }
    return '*/*';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('audio/')) return FileAudio;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    // Check size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check extension
    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        return `File type not allowed. Allowed: ${allowedExtensions.join(', ')}`;
      }
    }

    return null;
  };

  const handleFiles = async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validationError = validateFile(file);

      if (validationError) {
        alert(validationError);
        continue;
      }

      let url: string | undefined;
      if (onFileUpload) {
        setUploading(true);
        try {
          url = await onFileUpload(file, field.id);
        } catch (err) {
          console.error('Upload failed:', err);
          alert('File upload failed');
          continue;
        } finally {
          setUploading(false);
        }
      }

      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        file: onFileUpload ? undefined : file,
      });

      if (!allowMultiple) break;
    }

    if (allowMultiple) {
      onChange([...files, ...newFiles]);
    } else {
      onChange(newFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles.length > 0 ? newFiles : null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${field.enabled === false ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptString()}
          multiple={allowMultiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={field.enabled === false || uploading}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {allowedExtensions
                ? `${allowedExtensions.join(', ').toUpperCase()} up to ${maxSizeMB}MB`
                : `Up to ${maxSizeMB}MB`}
              {allowMultiple && ' (multiple files allowed)'}
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => {
            const Icon = getFileIcon(file.type);
            return (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center min-w-0">
                  <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  disabled={field.enabled === false}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
