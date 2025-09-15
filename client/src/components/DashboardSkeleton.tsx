import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-4">
        {/* Top Bar Skeleton */}
        <div className="sticky top-0 z-[60] bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg shadow-sm border mb-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-6 w-64" />
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Primary CTA Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-96" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-12 w-48" />
                  <Skeleton className="h-16 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Today Strip Skeleton */}
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-18" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Grid Skeleton */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(3)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2"
                    >
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Columns */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="py-3">
                  <div className="space-y-4">
                    {[...Array(4)].map((_, idx) => (
                      <div key={idx} className="space-y-3">
                        <Skeleton className="h-5 w-36" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[...Array(6)].map((_, cardIdx) => (
                            <Skeleton key={cardIdx} className="h-16 w-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
