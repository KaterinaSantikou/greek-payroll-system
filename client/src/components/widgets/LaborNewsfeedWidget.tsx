import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface NewsItem {
  id: string;
  date: string;
  category: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  citations: string[];
  last_checked?: string;
}

interface NewsfeedData {
  widget_id: string;
  title: string;
  last_updated: string;
  update_policy: {
    refresh_interval_minutes: number;
    sources_note: string;
  };
  items: NewsItem[];
}

const categoryColors = {
  'Minimum Wage':
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Digital Work Card':
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Working Time':
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Leave & Benefits':
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  Context: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function LaborNewsfeedWidget() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: newsfeedData,
    isLoading,
    error,
  } = useQuery<NewsfeedData>({
    queryKey: ['/api/labor-newsfeed'],
    refetchInterval: 4 * 60 * 60 * 1000, // 4 hours
    refetchIntervalInBackground: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiRequest('/api/labor-newsfeed/refresh', {
        method: 'POST',
      });

      await queryClient.invalidateQueries({
        queryKey: ['/api/labor-newsfeed'],
      });

      toast({
        title: 'Ενημερώθηκε επιτυχώς',
        description:
          'Τα εργασιακά νέα ενημερώθηκαν με τις τελευταίες εξελίξεις.',
      });
    } catch (error) {
      toast({
        title: 'Σφάλμα ενημέρωσης',
        description:
          'Δεν ήταν δυνατή η ενημέρωση των νέων. Παρακαλώ δοκιμάστε ξανά.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTimeSinceUpdate = (lastUpdated: string) => {
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffHours = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 1) return 'Μόλις ενημερώθηκε';
    if (diffHours === 1) return 'Πριν 1 ώρα';
    return `Πριν ${diffHours} ώρες`;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Εργασιακά Νέα & Νομοθεσία
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Δεν ήταν δυνατή η φόρτωση των εργασιακών νέων.
          </p>
          <Button onClick={handleRefresh} size="sm" disabled={isRefreshing}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Δοκιμάστε ξανά
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            🇬🇷 Εργασιακά Νέα & Νομοθεσία
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
        <CardDescription className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          {newsfeedData?.last_updated
            ? getTimeSinceUpdate(newsfeedData.last_updated)
            : 'Δεν υπάρχουν δεδομένα'}
          <span className="text-xs text-gray-500">
            • Ενημέρωση κάθε{' '}
            {newsfeedData?.update_policy.refresh_interval_minutes || 240} λεπτά
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newsfeedData?.items?.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              Δεν υπάρχουν διαθέσιμα νέα αυτή τη στιγμή.
            </p>
          </div>
        ) : (
          newsfeedData?.items?.map(item => (
            <div
              key={item.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              {/* Header with category and date */}
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="secondary"
                  className={
                    categoryColors[
                      item.category as keyof typeof categoryColors
                    ] ||
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  }
                >
                  {item.category}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(item.date)}
                </span>
              </div>

              {/* Headline */}
              <h4 className="font-medium text-sm leading-tight text-gray-900 dark:text-gray-100">
                {item.headline}
              </h4>

              {/* Summary */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.summary}
              </p>

              {/* Footer with source and link */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Πηγή: {item.source}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    window.open(item.url, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Άρθρο
                </Button>
              </div>

              {/* Citations (small) */}
              {item.citations && item.citations.length > 0 && (
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-xs text-gray-400">Παραπομπές:</span>
                  {item.citations.slice(0, 3).map((citation, idx) => (
                    <span key={idx} className="text-xs text-gray-400">
                      [{citation}]
                      {idx < Math.min(item.citations.length - 1, 2) ? ',' : ''}
                    </span>
                  ))}
                  {item.citations.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{item.citations.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {newsfeedData?.update_policy.sources_note}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
