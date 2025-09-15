/**
 * Greek Formatted Display Component
 * 
 * React component for displaying values with proper Greek formatting
 * including currency, numbers, dates, and percentages.
 */

import { 
  GreekDateTimeFormatter, 
  GreekNumericFormatter,
  type GreekFormattedDisplayProps 
} from '../lib/GreekFormats';
import { useTranslation } from '../contexts/LanguageContext';

export function GreekFormattedDisplay({
  value,
  type,
  decimals = 2,
  showSymbol = true,
  className = ''
}: GreekFormattedDisplayProps) {
  const { isGreek } = useTranslation();
  
  const formatValue = () => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (type) {
      case 'currency':
        const currencyValue = typeof value === 'string' ? parseFloat(value) : value as number;
        if (isGreek) {
          return showSymbol 
            ? GreekNumericFormatter.formatCurrency(currencyValue)
            : GreekNumericFormatter.formatCurrencyAmount(currencyValue);
        } else {
          // English formatting: 1,234.56 € or 1,234.56
          const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(currencyValue);
          return showSymbol ? `${formatted} €` : formatted;
        }
          
      case 'number':
        const numValue = typeof value === 'string' ? parseFloat(value) : value as number;
        if (isGreek) {
          return GreekNumericFormatter.formatDecimal(numValue, decimals);
        } else {
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          }).format(numValue);
        }
        
      case 'percentage':
        const pctValue = typeof value === 'string' ? parseFloat(value) : value as number;
        return GreekNumericFormatter.formatPercentage(pctValue, decimals);
        
      case 'date':
        const dateValue = typeof value === 'string' ? new Date(value) : value as Date;
        return GreekDateTimeFormatter.formatOfficialDate(dateValue);
        
      case 'datetime':
        const dateTimeValue = typeof value === 'string' ? new Date(value) : value as Date;
        return GreekDateTimeFormatter.formatOfficialDateTime(dateTimeValue);
        
      case 'time':
        const timeValue = typeof value === 'string' ? new Date(value) : value as Date;
        return GreekDateTimeFormatter.formatTime(timeValue);
        
      default:
        return String(value);
    }
  };

  return (
    <span 
      className={`greek-formatted-display ${className}`}
      data-testid={`formatted-${type}-${value}`}
    >
      {formatValue()}
    </span>
  );
}

/**
 * Specialized components for common Greek payroll displays
 */

export function GreekCurrencyDisplay({ 
  amount, 
  showSymbol = true,
  className = '' 
}: {
  amount: number;
  showSymbol?: boolean;
  className?: string;
}) {
  return (
    <GreekFormattedDisplay
      value={amount}
      type="currency"
      showSymbol={showSymbol}
      className={`currency-display ${className}`}
    />
  );
}

export function GreekDateDisplay({ 
  date, 
  showTime = false,
  className = '' 
}: {
  date: Date | string;
  showTime?: boolean;
  className?: string;
}) {
  return (
    <GreekFormattedDisplay
      value={date}
      type={showTime ? "datetime" : "date"}
      className={`date-display ${className}`}
    />
  );
}

export function GreekPercentageDisplay({ 
  percentage, 
  decimals = 2,
  className = '' 
}: {
  percentage: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <GreekFormattedDisplay
      value={percentage}
      type="percentage"
      decimals={decimals}
      className={`percentage-display ${className}`}
    />
  );
}