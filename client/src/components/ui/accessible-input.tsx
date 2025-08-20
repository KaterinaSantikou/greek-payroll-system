import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AccessibleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  description?: string;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, id, error, required, description, className, ...props }, ref) => {
    const errorId = error ? `${id}-error` : undefined;
    const descriptionId = description ? `${id}-description` : undefined;
    
    return (
      <div className="space-y-2">
        <Label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium",
            error && "text-red-600 dark:text-red-400"
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </Label>
        
        {description && (
          <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
        
        <Input
          ref={ref}
          id={id}
          className={cn(
            className,
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            "focus:ring-2 focus:ring-offset-2 focus-visible:outline-none focus-visible:ring-2"
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            errorId && error ? errorId : undefined,
            description ? descriptionId : undefined
          )}
          {...props}
        />
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-600 dark:text-red-400" 
            role="alert" 
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';