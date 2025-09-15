import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Provider icons from react-icons
// import {
//   FaGoogle,
//   FaMicrosoft,
//   FaGithub,
//   FaLinkedin,
//   FaApple,
//   FaAmazon,
// } from 'react-icons/fa';
// import { SiOkta, SiAuth0, SiOnelogin } from 'react-icons/si';

const providerIcons = {
  google: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  ),
  microsoft: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
    </svg>
  ),
  github: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  linkedin: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  apple: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C8.396 0 8.002.021 8.002 5.073c0 2.401 1.518 4.635 3.646 5.073C9.25 15.146 12.017 24 12.017 24s2.768-8.854.368-13.854C14.534 9.708 16.052 7.474 16.052 5.073 16.052.021 15.658 0 12.017 0z" />
    </svg>
  ),
  amazon: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.045 18.153c.012-.048.067-.125.17-.232 1.8-1.815 4.712-2.92 8.736-3.312l.257-.025c1.113-.108 2.176-.216 3.19-.324 2.927-.312 5.283-.563 7.067-.755.107-.012.214-.024.321-.036.321-.036.642-.072.963-.108.214-.024.428-.048.642-.072 1.39-.156 2.352-.252 2.885-.288.036-.003.072-.006.108-.009.036-.003.072-.006.108-.009.036-.003.072-.006.108-.009.036-.003.072-.006.108-.009l.09-.015c.024-.004.048-.008.072-.012.024-.004.048-.008.072-.012.024-.004.048-.008.072-.012.024-.004.048-.008.072-.012.024-.004.048-.008.072-.012.024-.004.048-.008.072-.012.024-.004.048-.008.072-.012l.054-.009c.018-.003.036-.006.054-.009.018-.003.036-.006.054-.009.018-.003.036-.006.054-.009.018-.003.036-.006.054-.009.018-.003.036-.006.054-.009.018-.003.036-.006.054-.009.018-.003.036-.006.054-.009l.045-.009c.015-.003.03-.006.045-.009.015-.003.03-.006.045-.009.015-.003.03-.006.045-.009.015-.003.03-.006.045-.009.015-.003.03-.006.045-.009.015-.003.03-.006.045-.009.015-.003.03-.006.045-.009l.036-.009c.012-.003.024-.006.036-.009.012-.003.024-.006.036-.009.012-.003.024-.006.036-.009.012-.003.024-.006.036-.009.012-.003.024-.006.036-.009.012-.003.024-.006.036-.009.012-.003.024-.006.036-.009l.027-.009c.009-.003.018-.006.027-.009.009-.003.018-.006.027-.009.009-.003.018-.006.027-.009.009-.003.018-.006.027-.009.009-.003.018-.006.027-.009.009-.003.018-.006.027-.009.009-.003.018-.006.027-.009l.018-.009c.006-.003.012-.006.018-.009.006-.003.012-.006.018-.009.006-.003.012-.006.018-.009.006-.003.012-.006.018-.009.006-.003.012-.006.018-.009.006-.003.012-.006.018-.009.006-.003.012-.006.018-.009l.009-.009c.003-.003.006-.006.009-.009.003-.003.006-.006.009-.009.003-.003.006-.006.009-.009.003-.003.006-.006.009-.009.003-.003.006-.006.009-.009.003-.003.006-.006.009-.009.003-.003.006-.006.009-.009 0 0 0-.003-.003-.003-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051-.015-.018-.03-.033-.045-.051z" />
    </svg>
  ),
  okta: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="6" />
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  auth0: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L24 12L12 24L0 12z" />
    </svg>
  ),
  onelogin: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <rect width="24" height="24" rx="4" />
    </svg>
  ),
  oidc: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  saml: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

const providerColors = {
  google: 'hover:bg-red-50 border-red-200 text-red-600',
  microsoft: 'hover:bg-blue-50 border-blue-200 text-blue-600',
  github: 'hover:bg-gray-50 border-gray-200 text-gray-800',
  linkedin: 'hover:bg-blue-50 border-blue-200 text-blue-600',
  apple: 'hover:bg-gray-50 border-gray-200 text-gray-800',
  amazon: 'hover:bg-orange-50 border-orange-200 text-orange-600',
  okta: 'hover:bg-blue-50 border-blue-200 text-blue-600',
  auth0: 'hover:bg-orange-50 border-orange-200 text-orange-600',
  onelogin: 'hover:bg-blue-50 border-blue-200 text-blue-600',
  oidc: 'hover:bg-green-50 border-green-200 text-green-600',
  saml: 'hover:bg-purple-50 border-purple-200 text-purple-600',
};

const providerLabels = {
  google: 'Continue with Google',
  microsoft: 'Continue with Microsoft',
  github: 'Continue with GitHub',
  linkedin: 'Continue with LinkedIn',
  apple: 'Continue with Apple',
  amazon: 'Continue with Amazon',
  okta: 'Continue with Okta',
  auth0: 'Continue with Auth0',
  onelogin: 'Continue with OneLogin',
  oidc: 'Continue with SSO',
  saml: 'Continue with SAML',
};

export type SsoProvider = keyof typeof providerIcons;

interface SsoButtonProps {
  provider: SsoProvider;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline';
}

export function SsoButton({
  provider,
  onClick,
  loading = false,
  disabled = false,
  className,
  children,
  size = 'default',
  variant = 'outline',
}: SsoButtonProps) {
  const IconComponent = providerIcons[provider];
  const colorClass =
    providerColors[provider] ||
    'hover:bg-gray-50 border-gray-200 text-gray-600';
  const label = children || providerLabels[provider];

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative w-full transition-colors duration-200',
        variant === 'outline' && colorClass,
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : IconComponent ? (
          <IconComponent className="h-4 w-4" />
        ) : null}
        <span>{label}</span>
      </div>
    </Button>
  );
}

interface SsoButtonGroupProps {
  providers: Array<{
    provider: SsoProvider;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  }>;
  className?: string;
  title?: string;
  divider?: boolean;
}

export function SsoButtonGroup({
  providers,
  className,
  title = 'Or continue with',
  divider = true,
}: SsoButtonGroupProps) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {divider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {providers.map(({ provider, onClick, loading, disabled }) => (
          <SsoButton
            key={provider}
            provider={provider}
            onClick={onClick}
            loading={loading}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * SSO Button with domain discovery
 * Automatically shows appropriate SSO button based on email domain
 */
interface SsoDiscoveryButtonProps {
  email?: string;
  onSsoClick: (provider: SsoProvider) => void;
  availableProviders?: SsoProvider[];
  loading?: boolean;
  className?: string;
}

export function SsoDiscoveryButton({
  email,
  onSsoClick,
  availableProviders = ['google', 'microsoft', 'oidc'],
  loading = false,
  className,
}: SsoDiscoveryButtonProps) {
  // Domain to provider mapping
  const domainProviderMap: Record<string, SsoProvider> = {
    'gmail.com': 'google',
    'googlemail.com': 'google',
    'outlook.com': 'microsoft',
    'hotmail.com': 'microsoft',
    'live.com': 'microsoft',
    'github.com': 'github',
    'apple.com': 'apple',
    'icloud.com': 'apple',
  };

  const getProviderForEmail = (email: string): SsoProvider | null => {
    try {
      const domain = email.split('@')[1]?.toLowerCase();
      if (
        domain &&
        domainProviderMap[domain] &&
        availableProviders.includes(domainProviderMap[domain])
      ) {
        return domainProviderMap[domain];
      }
    } catch {
      // Invalid email format
    }
    return null;
  };

  const suggestedProvider = email ? getProviderForEmail(email) : null;

  if (suggestedProvider) {
    return (
      <SsoButton
        provider={suggestedProvider}
        onClick={() => onSsoClick(suggestedProvider)}
        loading={loading}
        className={className}
      >
        Continue with {providerLabels[suggestedProvider].split(' ').pop()}
      </SsoButton>
    );
  }

  // Show all available providers if no specific suggestion
  if (availableProviders.length === 1) {
    return (
      <SsoButton
        provider={availableProviders[0]}
        onClick={() => onSsoClick(availableProviders[0])}
        loading={loading}
        className={className}
      />
    );
  }

  return (
    <SsoButtonGroup
      providers={availableProviders.map(provider => ({
        provider,
        onClick: () => onSsoClick(provider),
        loading,
      }))}
      className={className}
    />
  );
}
