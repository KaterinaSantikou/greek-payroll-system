import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileOptimizedFormProps {
  children: ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent) => void;
}

export function MobileOptimizedForm({ children, className, onSubmit }: MobileOptimizedFormProps) {
  return (
    <form 
      onSubmit={onSubmit}
      className={cn(
        "space-y-4",
        // Mobile optimizations
        "sm:space-y-6",
        "px-4 sm:px-0",
        className
      )}
    >
      {children}
    </form>
  );
}

interface MobileInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

export function MobileInput({ 
  label, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  required, 
  error,
  className 
}: MobileInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={cn(
          // Base styles
          "w-full px-4 py-3 rounded-lg border border-input bg-background",
          "text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          "transition-colors",
          // Mobile optimizations
          "text-base", // Prevents iOS zoom
          "min-h-[44px]", // Touch target size
          // Error styles
          error && "border-destructive focus:ring-destructive",
          className
        )}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

interface MobileButtonProps {
  children: ReactNode;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MobileButton({ 
  children, 
  type = "button", 
  variant = "primary", 
  size = "md",
  disabled, 
  onClick,
  className 
}: MobileButtonProps) {
  const baseClasses = cn(
    // Base styles
    "inline-flex items-center justify-center rounded-lg font-medium",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    // Mobile touch target
    "min-h-[44px] min-w-[44px]",
    // Size variants
    {
      "px-3 py-2 text-sm": size === "sm",
      "px-4 py-3 text-base": size === "md",
      "px-6 py-4 text-lg": size === "lg",
    },
    // Color variants
    {
      "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary": variant === "primary",
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary": variant === "secondary",
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-ring": variant === "outline",
    },
    className
  );

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={baseClasses}
    >
      {children}
    </button>
  );
}