import { useState } from 'react';
import type { ReactNode } from 'react';
import Uppy from '@uppy/core';
import { DashboardModal } from '@uppy/react';
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import AwsS3 from '@uppy/aws-s3';
import type { UploadResult } from '@uppy/core';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  visibility?: 'public' | 'private';
  onGetUploadParameters?: () => Promise<{
    method: 'PUT';
    url: string;
    objectPath?: string;
    expiresAt?: Date;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * A file upload component with object storage integration
 *
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Integrates with Replit Object Storage via signed URLs
 * - Supports both public and private file uploads
 * - Automatic CORS handling for cross-origin uploads
 * - Progress tracking and error handling
 * - Configurable file size and type restrictions
 * - Greek/English bilingual support
 *
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.allowedFileTypes - Array of allowed MIME types (e.g., ['image/*', 'application/pdf'])
 * @param props.visibility - File visibility: 'public' or 'private' (default: 'private')
 * @param props.onGetUploadParameters - Custom function to get upload parameters
 * @param props.onComplete - Callback when upload completes
 * @param props.buttonClassName - CSS class for the button
 * @param props.children - Button content
 * @param props.disabled - Whether the upload button is disabled
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  allowedFileTypes,
  visibility = 'private',
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  disabled = false,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Default upload parameter fetcher using our API
  const defaultGetUploadParameters = async () => {
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxSizeBytes: maxFileSize,
          ttlSeconds: 900, // 15 minutes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get upload URL');
      }

      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.url,
        objectPath: data.objectPath,
        expiresAt: new Date(data.expiresAt),
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      toast({
        title: 'Σφάλμα μεταφόρτωσης / Upload Error',
        description:
          error instanceof Error
            ? error.message
            : 'Αποτυχία λήψης URL μεταφόρτωσης / Failed to get upload URL',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: false,
      locale: {
        strings: {
          // Greek translations for common upload messages
          addMoreFiles: 'Προσθήκη αρχείων',
          addingMoreFiles: 'Προσθήκη περισσότερων αρχείων',
          uploadComplete: 'Η μεταφόρτωση ολοκληρώθηκε',
          uploadFailed: 'Η μεταφόρτωση απέτυχε',
          retry: 'Επανάληψη',
          cancel: 'Ακύρωση',
          remove: 'Αφαίρεση',
          editFile: 'Επεξεργασία αρχείου',
          done: 'Ολοκληρώθηκε',
          uploadingXFiles: {
            0: 'Μεταφόρτωση %{smart_count} αρχείου',
            1: 'Μεταφόρτωση %{smart_count} αρχείων',
          },
          processingXFiles: {
            0: 'Επεξεργασία %{smart_count} αρχείου',
            1: 'Επεξεργασία %{smart_count} αρχείων',
          },
        },
      },
    });

    // Configure AWS S3 plugin for signed URL uploads
    uppyInstance.use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters: onGetUploadParameters || defaultGetUploadParameters,
    });

    // Handle upload events
    uppyInstance.on('upload', () => {
      setIsUploading(true);
    });

    uppyInstance.on('complete', async result => {
      setIsUploading(false);

      if (result.successful.length > 0) {
        toast({
          title: 'Επιτυχής μεταφόρτωση / Upload Successful',
          description: `${result.successful.length} αρχείο(α) μεταφορτώθηκαν επιτυχώς / file(s) uploaded successfully`,
        });

        // Set ACL policy for uploaded files
        for (const file of result.successful) {
          try {
            if (file.uploadURL) {
              await fetch('/api/objects/acl', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  objectURL: file.uploadURL,
                  visibility,
                }),
              });
            }
          } catch (error) {
            console.error('Error setting ACL policy:', error);
            // Don't block the upload completion, just log the error
          }
        }
      }

      if (result.failed.length > 0) {
        toast({
          title: 'Σφάλμα μεταφόρτωσης / Upload Error',
          description: `${result.failed.length} αρχείο(α) απέτυχαν / file(s) failed to upload`,
          variant: 'destructive',
        });
      }

      onComplete?.(result);
    });

    uppyInstance.on('error', error => {
      setIsUploading(false);
      console.error('Upload error:', error);
      toast({
        title: 'Σφάλμα μεταφόρτωσης / Upload Error',
        description:
          error.message ||
          'Παρουσιάστηκε σφάλμα κατά τη μεταφόρτωση / An error occurred during upload',
        variant: 'destructive',
      });
    });

    uppyInstance.on('restriction-failed', (file, error) => {
      toast({
        title: 'Περιορισμός αρχείου / File Restriction',
        description:
          error.message ||
          `Το αρχείο ${file?.name || 'Unknown'} δεν πληροί τις προϋποθέσεις / File does not meet requirements`,
        variant: 'destructive',
      });
    });

    return uppyInstance;
  });

  const handleOpenModal = () => {
    if (!disabled) {
      setShowModal(true);
    }
  };

  return (
    <div>
      <Button
        onClick={handleOpenModal}
        className={buttonClassName}
        disabled={disabled || isUploading}
        data-testid="button-upload-object"
      >
        {isUploading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Μεταφόρτωση... / Uploading...</span>
          </div>
        ) : (
          children
        )}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        locale={{
          strings: {
            // Additional Greek translations for the modal
            dropPasteFiles: 'Σύρετε αρχεία εδώ, επικολλήστε ή %{browse}',
            browse: 'περιηγηθείτε',
            uploadXFiles: {
              0: 'Μεταφόρτωση %{smart_count} αρχείου',
              1: 'Μεταφόρτωση %{smart_count} αρχείων',
            },
            uploadXNewFiles: {
              0: 'Μεταφόρτωση +%{smart_count} αρχείου',
              1: 'Μεταφόρτωση +%{smart_count} αρχείων',
            },
          },
        }}
      />
    </div>
  );
}
