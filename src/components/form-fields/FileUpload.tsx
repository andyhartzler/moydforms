'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { FormFieldConfig, FileUploadResult } from '@/types/forms';
import { Upload, X, File, FileText, FileImage, FileVideo, FileAudio, HardDrive, Monitor } from 'lucide-react';

// Google Drive icon component using actual logo
const GoogleDriveIcon = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-10 w-10',
  };
  return (
    <img
      src="/icons/google-drive-icon.png"
      alt="Google Drive"
      className={sizeClasses[size]}
    />
  );
};

interface FileUploadProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  onFileUpload?: (file: File, fieldId: string) => Promise<FileUploadResult>;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  storage_path?: string;
  file?: File;
  source?: 'device' | 'google_drive';
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Helper to create File objects (works around TypeScript quirks with File constructor)
const createFile = (blob: Blob, name: string, type: string): File => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FileConstructor = globalThis.File as any;
  return new FileConstructor([blob], name, { type }) as File;
};

export default function FileUpload({ field, value, onChange, error, onBlur, onFocus, onFileUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSource, setUploadSource] = useState<'device' | 'google_drive'>('device');
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const files: UploadedFile[] = value || [];
  const allowMultiple = field.allowMultipleFiles ?? false;
  const maxSizeMB = field.maxFileSizeMB ?? 10;
  const allowedExtensions = field.allowedExtensions;

  // Google API configuration
  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  // Load Google API scripts
  useEffect(() => {
    if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) return;

    // Load GAPI
    const loadGapi = () => {
      if (window.gapi) {
        window.gapi.load('client:picker', () => {
          setGapiLoaded(true);
          setPickerLoaded(true);
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.gapi.load('client:picker', () => {
            setGapiLoaded(true);
            setPickerLoaded(true);
          });
        };
        document.body.appendChild(script);
      }
    };

    // Load GSI (Google Sign-In)
    const loadGsi = () => {
      if (!window.google?.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    };

    loadGapi();
    loadGsi();
  }, [GOOGLE_API_KEY, GOOGLE_CLIENT_ID]);

  const getAcceptString = () => {
    if (field.fileTypeFilter === 'image') return 'image/*';
    if (field.fileTypeFilter === 'video') return 'video/*';
    if (field.fileTypeFilter === 'audio') return 'audio/*';
    if (allowedExtensions && allowedExtensions.length > 0) {
      return allowedExtensions.map(ext => `.${ext}`).join(',');
    }
    return '*/*';
  };

  const getMimeTypesForPicker = (): string | undefined => {
    if (field.fileTypeFilter === 'image') return 'image/*';
    if (field.fileTypeFilter === 'video') return 'video/*';
    if (field.fileTypeFilter === 'audio') return 'audio/*';
    if (allowedExtensions && allowedExtensions.length > 0) {
      const mimeMap: Record<string, string> = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
      };
      return allowedExtensions
        .map(ext => mimeMap[ext.toLowerCase()] || `application/${ext}`)
        .join(',');
    }
    return undefined;
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
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      // Normalize allowed extensions by removing leading dots for comparison
      const normalizedAllowed = allowedExtensions.map(e => e.replace(/^\./, '').toLowerCase());
      if (!ext || !normalizedAllowed.includes(ext)) {
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
      let storagePath: string | undefined;
      if (onFileUpload) {
        setUploading(true);
        try {
          const result = await onFileUpload(file, field.id);
          url = result.url;
          storagePath = result.path;
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
        storage_path: storagePath,
        file: onFileUpload ? undefined : file,
        source: 'device',
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

  // Google Drive Picker
  const handleGoogleDriveAuth = useCallback(() => {
    if (!window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) return;

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      // Use drive.readonly to allow picking any file from user's Drive
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          openGooglePicker(response.access_token);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  }, [GOOGLE_CLIENT_ID]);

  const openGooglePicker = useCallback((token: string) => {
    if (!window.google?.picker || !GOOGLE_API_KEY) return;

    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    const mimeTypes = getMimeTypesForPicker();
    if (mimeTypes) {
      view.setMimeTypes(mimeTypes);
    }

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(handlePickerCallback)
      .setMaxItems(allowMultiple ? 10 : 1)
      .build();

    picker.setVisible(true);
  }, [GOOGLE_API_KEY, allowMultiple]);

  const handlePickerCallback = useCallback(async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      setUploading(true);
      const newFiles: UploadedFile[] = [];

      for (const doc of data.docs as Array<{ id: string; name: string; mimeType: string; sizeBytes?: number; url?: string }>) {
        const fileName: string = doc.name;
        const mimeType: string = doc.mimeType || 'application/octet-stream';

        // For Google Drive files, we store the sharing link
        const driveFile: UploadedFile = {
          name: fileName,
          size: doc.sizeBytes || 0,
          type: mimeType,
          url: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
          source: 'google_drive',
        };

        // If onFileUpload is provided and we need to download/re-upload the file
        if (onFileUpload && accessToken) {
          try {
            // Fetch the file content from Google Drive
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (response.ok) {
              const blob = await response.blob();

              // Validate file size
              if (blob.size > maxSizeMB * 1024 * 1024) {
                alert(`File "${fileName}" exceeds ${maxSizeMB}MB limit`);
                continue;
              }

              // Create File object from blob
              const file = createFile(blob, fileName, mimeType);
              const uploadResult = await onFileUpload(file, field.id);
              driveFile.url = uploadResult.url;
              driveFile.storage_path = uploadResult.path;
            }
          } catch (err) {
            console.error('Failed to download Google Drive file:', err);
            // Fall back to Google Drive URL
          }
        }

        newFiles.push(driveFile);

        if (!allowMultiple) break;
      }

      setUploading(false);

      if (newFiles.length > 0) {
        if (allowMultiple) {
          onChange([...files, ...newFiles]);
        } else {
          onChange(newFiles);
        }
      }
    }
  }, [accessToken, allowMultiple, files, maxSizeMB, onChange, onFileUpload, field.id]);

  const handleGoogleDriveClick = () => {
    if (accessToken) {
      openGooglePicker(accessToken);
    } else {
      handleGoogleDriveAuth();
    }
  };

  // Temporarily disabled while waiting for Google OAuth scope approval
  // TODO: Re-enable once drive.readonly scope is approved
  const googleDriveEnabled = false; // !!(GOOGLE_API_KEY && GOOGLE_CLIENT_ID);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}

      {/* Upload source tabs - only show if Google Drive is enabled */}
      {googleDriveEnabled && (
        <div className="flex mb-3 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setUploadSource('device')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              uploadSource === 'device'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Monitor className="h-4 w-4" />
            My Device
          </button>
          <button
            type="button"
            onClick={() => setUploadSource('google_drive')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              uploadSource === 'google_drive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GoogleDriveIcon size="md" />
            Google Drive
          </button>
        </div>
      )}

      {/* Device upload zone */}
      {uploadSource === 'device' && (
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
      )}

      {/* Google Drive upload zone */}
      {uploadSource === 'google_drive' && (
        <div
          onClick={handleGoogleDriveClick}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          } ${field.enabled === false ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
              <p className="text-sm text-gray-600">Importing from Google Drive...</p>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-2 flex items-center justify-center">
                <GoogleDriveIcon size="lg" />
              </div>
              <p className="text-sm text-gray-600">
                <span className="text-blue-600 font-medium">Click to select from Google Drive</span>
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
      )}

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
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                      {file.name}
                      {file.source === 'google_drive' && (
                        <span className="inline-flex items-center text-xs text-blue-600">
                          <GoogleDriveIcon />
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.size > 0 ? formatFileSize(file.size) : 'Google Drive'}
                    </p>
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
