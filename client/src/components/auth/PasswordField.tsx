import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Lock, Shield, AlertTriangle } from 'lucide-react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
}

interface PasswordFieldProps {
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showStrengthMeter?: boolean;
  strengthOptions?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSymbols?: boolean;
  };
}

// Password strength calculation
function calculatePasswordStrength(password: string, options?: PasswordFieldProps['strengthOptions']): PasswordStrength {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = true,
  } = options || {};

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= minLength) {
    score += 25;
  } else {
    feedback.push(`At least ${minLength} characters required`);
  }

  // Character variety checks
  if (requireUppercase && /[A-Z]/.test(password)) {
    score += 20;
  } else if (requireUppercase) {
    feedback.push('Include uppercase letters');
  }

  if (requireLowercase && /[a-z]/.test(password)) {
    score += 20;
  } else if (requireLowercase) {
    feedback.push('Include lowercase letters');
  }

  if (requireNumbers && /\d/.test(password)) {
    score += 20;
  } else if (requireNumbers) {
    feedback.push('Include numbers');
  }

  if (requireSymbols && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 15;
  } else if (requireSymbols) {
    feedback.push('Include symbols (!@#$%^&*)');
  }

  // Determine level
  let level: PasswordStrength['level'] = 'weak';
  if (score >= 80) level = 'strong';
  else if (score >= 60) level = 'good';
  else if (score >= 40) level = 'fair';

  return { score, level, feedback };
}

// Standalone password field component
const PasswordFieldStandalone = forwardRef<HTMLInputElement, PasswordFieldProps & {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}>(({ 
  label = "Password", 
  placeholder = "Enter your password", 
  className, 
  disabled, 
  required, 
  showStrengthMeter = false,
  strengthOptions,
  value = '',
  onChange,
  error,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength = showStrengthMeter ? calculatePasswordStrength(value, strengthOptions) : null;

  const getStrengthColor = (level: PasswordStrength['level']) => {
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getStrengthIcon = (level: PasswordStrength['level']) => {
    switch (level) {
      case 'weak': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'fair': return <Shield className="h-4 w-4 text-orange-500" />;
      case 'good': return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'strong': return <Shield className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="password" className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
        {label}
      </Label>
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          {...props}
          ref={ref}
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn("pl-10 pr-10", className, error && "border-red-500")}
          autoComplete="current-password"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>
      
      {showStrengthMeter && strength && value && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            {getStrengthIcon(strength.level)}
            <Progress 
              value={strength.score} 
              className={cn("flex-1 h-2", getStrengthColor(strength.level))}
            />
            <span className="text-sm font-medium capitalize text-muted-foreground">
              {strength.level}
            </span>
          </div>
          {strength.feedback.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {strength.feedback.map((item, index) => (
                <li key={index} className="flex items-center space-x-1">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

PasswordFieldStandalone.displayName = "PasswordFieldStandalone";

// React Hook Form integrated password field
interface PasswordFieldFormProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<PasswordFieldProps, 'error'> {
  control: Control<TFieldValues>;
  name: TName;
}

function PasswordFieldFormComponent<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ 
  control, 
  name, 
  label = "Password", 
  placeholder = "Enter your password",
  showStrengthMeter = false,
  strengthOptions,
  ...props 
}: PasswordFieldFormProps<TFieldValues, TName>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const strength = showStrengthMeter ? calculatePasswordStrength(field.value || '', strengthOptions) : null;
        
        const getStrengthColor = (level: PasswordStrength['level']) => {
          switch (level) {
            case 'weak': return 'bg-red-500';
            case 'fair': return 'bg-orange-500';
            case 'good': return 'bg-yellow-500';
            case 'strong': return 'bg-green-500';
          }
        };

        const getStrengthIcon = (level: PasswordStrength['level']) => {
          switch (level) {
            case 'weak': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'fair': return <Shield className="h-4 w-4 text-orange-500" />;
            case 'good': return <Shield className="h-4 w-4 text-yellow-500" />;
            case 'strong': return <Shield className="h-4 w-4 text-green-500" />;
          }
        };

        return (
          <FormItem>
            <FormLabel className={cn(props.required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
            <FormControl>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    placeholder={placeholder}
                    disabled={props.disabled}
                    className={cn("pl-10 pr-10", props.className)}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={props.disabled}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>

                {showStrengthMeter && strength && field.value && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {getStrengthIcon(strength.level)}
                      <Progress 
                        value={strength.score} 
                        className={cn("flex-1 h-2", getStrengthColor(strength.level))}
                      />
                      <span className="text-sm font-medium capitalize text-muted-foreground">
                        {strength.level}
                      </span>
                    </div>
                    {strength.feedback.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {strength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center space-x-1">
                            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

// Export both components
export const PasswordField = PasswordFieldStandalone;
export const PasswordFieldForm = PasswordFieldFormComponent;