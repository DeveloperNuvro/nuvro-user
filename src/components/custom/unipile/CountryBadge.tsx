import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CountryBadgeProps {
  country?: {
    code: string;
    name: string;
  } | null;
  className?: string;
}

/** ISO 3166-1 alpha-3 → alpha-2 for correct flag when backend sends 3-letter code */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  BGD: 'BD', USA: 'US', GBR: 'GB', IND: 'IN', CHN: 'CN', JPN: 'JP', DEU: 'DE', FRA: 'FR',
  ITA: 'IT', ESP: 'ES', RUS: 'RU', AUS: 'AU', BRA: 'BR', MEX: 'MX', ZAF: 'ZA', ARE: 'AE',
  SAU: 'SA', PAK: 'PK', IDN: 'ID', MYS: 'MY', SGP: 'SG', THA: 'TH', VNM: 'VN', PHL: 'PH',
  KOR: 'KR', TUR: 'TR', EGY: 'EG', NGA: 'NG', KEN: 'KE', CAN: 'CA', NLD: 'NL', POL: 'PL',
  BGR: 'BG', ROU: 'RO', HUN: 'HU', CZE: 'CZ', GRC: 'GR', PRT: 'PT', SWE: 'SE', NOR: 'NO',
  DNK: 'DK', FIN: 'FI', IRL: 'IE', NZL: 'NZ', ARG: 'AR', COL: 'CO', PER: 'PE', CHL: 'CL',
};

/**
 * Get country flag emoji from country code (supports 2-letter and 3-letter ISO).
 */
function getCountryFlag(countryCode: string): string {
  if (!countryCode || typeof countryCode !== 'string') return '🌍';
  const raw = countryCode.trim().toUpperCase();
  const code = raw.length === 3 ? (ALPHA3_TO_ALPHA2[raw] || raw.slice(0, 2)) : raw;
  if (code.length !== 2) return '🌍';

  try {
    const codePoints = code.split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
}

const CountryBadge: React.FC<CountryBadgeProps> = ({ country, className = '' }) => {
  if (!country || !country.code) {
    return null;
  }

  const code = (country.code as string).trim().toUpperCase();
  const displayCode = code.length === 3 ? (ALPHA3_TO_ALPHA2[code] || code.slice(0, 2)) : code;
  const flag = getCountryFlag(country.code);
  const countryName = country.name || displayCode || country.code;

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

