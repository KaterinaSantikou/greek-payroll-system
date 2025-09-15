import { Badge } from './badge';

interface FallbackContextBannerProps {
  userRole: string;
  propertyName: string;
}

export function FallbackContextBanner({
  userRole,
  propertyName,
}: FallbackContextBannerProps) {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white dark:bg-gray-800">
            {userRole}
          </Badge>
          <span className="text-sm text-blue-800 dark:text-blue-200">
            Active Property: {propertyName}
          </span>
        </div>
      </div>
    </div>
  );
}
