import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Mail } from 'lucide-react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface EmailFieldProps {
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

// Standalone email field component
const EmailFieldStandalone = forwardRef<
  HTMLInputElement,
  EmailFieldProps & {
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
  }
>(
  (
    {
      label = 'Email',
      placeholder = 'Enter your email',
      className,
      disabled,
      required,
      value,
      onChange,
      error,
      ...props
    },
    ref
  ) => {
    return (
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className={cn(
            required && "after:content-['*'] after:ml-0.5 after:text-red-500"
          )}
        >
          {label}
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            {...props}
            ref={ref}
            id="email"
            type="email"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            disabled={disabled}
            className={cn('pl-10', className, error && 'border-red-500')}
            autoComplete="email"
            spellCheck={false}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

EmailFieldStandalone.displayName = 'EmailFieldStandalone';

// React Hook Form integrated email field
interface EmailFieldFormProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<EmailFieldProps, 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

function EmailFieldFormComponent<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label = 'Email',
  placeholder = 'Enter your email',
  ...props
}: EmailFieldFormProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel
            className={cn(
              props.required &&
                "after:content-['*'] after:ml-0.5 after:text-red-500"
            )}
          >
            {label}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                {...field}
                type="email"
                placeholder={placeholder}
                disabled={props.disabled}
                className={cn('pl-10', props.className)}
                autoComplete="email"
                spellCheck={false}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Export both components
export const EmailField = EmailFieldStandalone;
export const EmailFieldForm = EmailFieldFormComponent;
