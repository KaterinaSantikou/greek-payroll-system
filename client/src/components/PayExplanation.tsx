import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  InfoIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  EuroIcon,
  ExternalLinkIcon,
  LanguagesIcon
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PayExplanationProps {
  paycheckId: string;
  language?: 'el' | 'en';
  className?: string;
}

interface ExplanationItem {
  code: string;
  description: string;
  quantity?: string;
  rate?: string;
  amount: number;
  calculation?: string;
}

interface PolicyLink {
  text: string;
  url: string;
  type: 'law' | 'cba' | 'company';
}

interface ProvenanceInfo {
  source: string;
  lastUpdated: string;
  calculationMethod: string;
}

interface ExplanationBlock {
  type: 'earnings' | 'deductions' | 'summary';
  title: string;
  description: string;
  amount: number;
  currency: 'EUR';
  items: ExplanationItem[];
  policyLinks?: PolicyLink[];
  provenance: ProvenanceInfo;
}

interface PayExplanationData {
  narrative: string;
  blocks: ExplanationBlock[];
  significantChanges: string[];
}

const PolicyLinkIcon = ({ type }: { type: PolicyLink['type'] }) => {
  switch (type) {
    case 'law':
      return <InfoIcon className="h-3 w-3" />;
    case 'cba':
      return <InfoIcon className="h-3 w-3" />;
    case 'company':
      return <InfoIcon className="h-3 w-3" />;
    default:
      return <ExternalLinkIcon className="h-3 w-3" />;
  }
};

const ExplanationItemRow = ({ item }: { item: ExplanationItem }) => {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono">
            {item.code}
          </Badge>
          <span className="font-medium text-sm">{item.description}</span>
        </div>
        {(item.quantity || item.rate || item.calculation) && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-x-2">
            {item.quantity && <span>{item.quantity}</span>}
            {item.rate && <span>@ {item.rate}</span>}
            {item.calculation && <span className="font-mono">= {item.calculation}</span>}
          </div>
        )}
      </div>
      <div className="text-right">
        <span className={`font-semibold ${item.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
        </span>
      </div>
    </div>
  );
};

const ExplanationBlockCard = ({ block }: { block: ExplanationBlock }) => {
  const getBlockIcon = () => {
    switch (block.type) {
      case 'earnings':
        return <TrendingUpIcon className="h-5 w-5 text-green-600" />;
      case 'deductions':
        return <TrendingDownIcon className="h-5 w-5 text-red-600" />;
      case 'summary':
        return <EuroIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBlockColor = () => {
    switch (block.type) {
      case 'earnings':
        return 'border-green-200 dark:border-green-800';
      case 'deductions':
        return 'border-red-200 dark:border-red-800';
      case 'summary':
        return 'border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <Card className={`${getBlockColor()} transition-all hover:shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getBlockIcon()}
            <CardTitle className="text-lg">{block.title}</CardTitle>
          </div>
          <Badge variant={block.type === 'earnings' ? 'default' : block.type === 'deductions' ? 'destructive' : 'secondary'}>
            {formatCurrency(block.amount)}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {block.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          {block.items.map((item, index) => (
            <ExplanationItemRow key={`${item.code}-${index}`} item={item} />
          ))}
        </div>

        {block.policyLinks && block.policyLinks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Learn More
              </h4>
              <div className="flex flex-wrap gap-2">
                {block.policyLinks.map((link, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    asChild
                  >
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <PolicyLinkIcon type={link.type} />
                      {link.text}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div><strong>Source:</strong> {block.provenance.source}</div>
            <div><strong>Method:</strong> {block.provenance.calculationMethod}</div>
            <div><strong>Updated:</strong> {new Date(block.provenance.lastUpdated).toLocaleDateString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function PayExplanation({ paycheckId, language = 'el', className }: PayExplanationProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'el' | 'en'>(language);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/paycheck', paycheckId, 'explanation', { language: selectedLanguage }],
    queryFn: async () => {
      const response = await fetch(`/api/paycheck/${paycheckId}/explanation?language=${selectedLanguage}&includePolicy=true`);
      if (!response.ok) throw new Error('Failed to fetch pay explanation');
      return response.json();
    },
    retry: 1
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className={className}>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load pay explanation. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.explanation) {
    return (
      <Alert className={className}>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          No pay explanation available for this paycheck.
        </AlertDescription>
      </Alert>
    );
  }

  const explanation: PayExplanationData = data.explanation;
  const metadata = data.metadata;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with language switcher */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {selectedLanguage === 'el' ? 'Εξήγηση Μισθού' : 'Pay Explanation'}
        </h2>
        <div className="flex items-center gap-2">
          <LanguagesIcon className="h-4 w-4 text-gray-500" />
          <Button
            variant={selectedLanguage === 'el' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('el')}
          >
            ΕΛ
          </Button>
          <Button
            variant={selectedLanguage === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLanguage('en')}
          >
            EN
          </Button>
        </div>
      </div>

      {/* Narrative summary */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <p className="text-blue-900 dark:text-blue-100 font-medium text-center">
            {explanation.narrative}
          </p>
          {explanation.significantChanges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                {selectedLanguage === 'el' ? 'Σημαντικές Αλλαγές:' : 'Significant Changes:'}
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                {explanation.significantChanges.map((change, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation blocks */}
      <div className="space-y-4">
        {explanation.blocks.map((block, index) => (
          <ExplanationBlockCard key={`${block.type}-${index}`} block={block} />
        ))}
      </div>

      {/* Metadata footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1 pt-4 border-t">
        <div className="flex items-center justify-center gap-4">
          <span>
            {selectedLanguage === 'el' ? 'Σύγκριση:' : 'Comparison:'} {metadata?.hasComparison ? '✓' : '✗'}
          </span>
          <span>
            {selectedLanguage === 'el' ? 'Λεπτομερής Ανάλυση:' : 'Detailed Breakdown:'} {metadata?.hasDetailedBreakdown ? '✓' : '✗'}
          </span>
        </div>
        <div>
          {selectedLanguage === 'el' ? 'Δημιουργήθηκε:' : 'Generated:'} {new Date(metadata?.generatedAt || '').toLocaleString(selectedLanguage === 'el' ? 'el-GR' : 'en-US')}
        </div>
      </div>
    </div>
  );
}

export default PayExplanation;