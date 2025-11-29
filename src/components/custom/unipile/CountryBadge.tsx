import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CountryBadgeProps {
  country?: {
    code: string;
    name: string;
  } | null;
  className?: string;
}

/**
 * Get country flag emoji from country code
 */
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🌍';
  }

  try {
    // Convert country code to flag emoji
    // Each flag is represented by two regional indicator symbols
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));

    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
}

const CountryBadge: React.FC<CountryBadgeProps> = ({ country, className = '' }) => {
  if (!country || !country.code) {
    return null;
  }

  const flag = getCountryFlag(country.code);
  const countryName = country.name || country.code;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 text-xs font-medium cursor-pointer hover:bg-muted transition-colors ${className}`}
            title={countryName}
          >
            <span className="text-base leading-none">{flag}</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{country.code}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{countryName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CountryBadge;

