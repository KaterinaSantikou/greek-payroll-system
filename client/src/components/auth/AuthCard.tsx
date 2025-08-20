import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, className, footer }: AuthCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">{title}</CardTitle>
          {description && (
            <CardDescription className="text-center">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
        {footer && (
          <div className="px-6 pb-6">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}