import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from '@uppy/core';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

/**
 * Example page component demonstrating the ObjectUploader usage
 *
 * Shows different upload scenarios:
 * - Profile picture upload (public, single file, images only)
 * - Document upload (private, multiple files, various types)
 * - Large file upload (with custom size limits)
 */
export function FileUploadExample() {
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      name: string;
      objectPath: string;
      size: number;
      type: string;
      uploadedAt: Date;
    }>
  >([]);
  const { toast } = useToast();

  const handleProfilePictureComplete = (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => {
    if (result.successful.length > 0) {
      const file = result.successful[0];
      setUploadedFiles(prev => [
        ...prev,
        {
          name: file.name,
          objectPath: (file.response as any)?.body?.objectPath || 'unknown',
          size: file.size || 0,
          type: file.type || 'unknown',
          uploadedAt: new Date(),
        },
      ]);
    }
  };

  const handleDocumentComplete = (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => {
    const newFiles = result.successful.map(file => ({
      name: file.name,
      objectPath: (file.response as any)?.body?.objectPath || 'unknown',
      size: file.size || 0,
      type: file.type || 'unknown',
      uploadedAt: new Date(),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Object Storage Upload Examples
        </h1>
        <p className="text-muted-foreground">
          Demonstration of different file upload scenarios using Replit Object
          Storage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile Picture Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👤 Profile Picture
              <Badge variant="secondary">Public</Badge>
            </CardTitle>
            <CardDescription>
              Upload a profile picture (public, single image file)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={2 * 1024 * 1024} // 2MB
              allowedFileTypes={['image/*']}
              visibility="public"
              onComplete={handleProfilePictureComplete}
              buttonClassName="w-full"
            >
              <div className="flex items-center gap-2">
                <span>📷</span>
                <span>Upload Profile Picture</span>
              </div>
            </ObjectUploader>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📄 Documents
              <Badge variant="outline">Private</Badge>
            </CardTitle>
            <CardDescription>
              Upload documents (private, multiple files allowed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10 * 1024 * 1024} // 10MB
              allowedFileTypes={[
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
              ]}
              visibility="private"
              onComplete={handleDocumentComplete}
              buttonClassName="w-full"
            >
              <div className="flex items-center gap-2">
                <span>📁</span>
                <span>Upload Documents</span>
              </div>
            </ObjectUploader>
          </CardContent>
        </Card>

        {/* Large File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💾 Large Files
              <Badge variant="destructive">50MB</Badge>
            </CardTitle>
            <CardDescription>Upload large files (up to 50MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <ObjectUploader
              maxNumberOfFiles={3}
              maxFileSize={50 * 1024 * 1024} // 50MB
              visibility="private"
              onComplete={handleDocumentComplete}
              buttonClassName="w-full"
            >
              <div className="flex items-center gap-2">
                <span>⬆️</span>
                <span>Upload Large Files</span>
              </div>
            </ObjectUploader>
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              Files successfully uploaded to object storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {file.type.startsWith('image/')
                        ? '🖼️'
                        : file.type.includes('pdf')
                          ? '📄'
                          : file.type.includes('word')
                            ? '📝'
                            : '📁'}
                    </div>
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} •{' '}
                        {file.uploadedAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {file.objectPath}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {file.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Details</CardTitle>
          <CardDescription>
            Key features of the object storage implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">🔐 Security Features</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• User authentication for private uploads</li>
                  <li>• ACL-based access control</li>
                  <li>• Signed URLs with expiration (15min)</li>
                  <li>• File type and size validation</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🌐 CORS & Storage</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Cross-origin upload support</li>
                  <li>• Ephemeral FS safe (no local disk usage)</li>
                  <li>• Automatic cleanup of expired objects</li>
                  <li>• Public and private file serving</li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🌍 Bilingual Support</h4>
              <p className="text-sm text-muted-foreground">
                Upload interface supports both Greek and English with automatic
                error message translation and localized file operation feedback.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
