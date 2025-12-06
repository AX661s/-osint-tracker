import React from 'react';
import ReactCountryFlag from 'react-country-flag';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

// 常用國家及區號，顯示英文縮寫（印尼优先）
const COUNTRIES = [
  { code: 'ID', abbr: 'ID', dial: '62' },  // 印尼优先
  { code: 'US', abbr: 'US', dial: '1' },
  { code: 'CN', abbr: 'CN', dial: '86' },
  { code: 'GB', abbr: 'UK', dial: '44' },
  { code: 'IN', abbr: 'IN', dial: '91' },
  { code: 'JP', abbr: 'JP', dial: '81' },
  { code: 'KR', abbr: 'KR', dial: '82' },
  { code: 'RU', abbr: 'RU', dial: '7' },
  { code: 'DE', abbr: 'DE', dial: '49' },
  { code: 'FR', abbr: 'FR', dial: '33' },
  { code: 'BR', abbr: 'BR', dial: '55' },
];

// 根据 dial code 获取国家信息
const getCountryByDial = (dial) => COUNTRIES.find(c => c.dial === dial) || COUNTRIES[0];  // 默认印尼

export const CountryFlagSelect = ({ value = '62', onChange }) => {  // 默认印尼 +62
  const selectedCountry = getCountryByDial(value);
  
  return (
    <div className="w-[140px]">
      <Select value={value} onValueChange={(v) => onChange?.(v)}>
        <SelectTrigger className="h-16 px-3 bg-background/50 border-border/50 focus:border-primary/50">
          <div className="flex items-center gap-2">
            <ReactCountryFlag
              countryCode={selectedCountry.code}
              svg
              style={{ width: '1.5em', height: '1.5em' }}
            />
            <span className="text-muted-foreground">+{selectedCountry.dial}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.dial}>
              <div className="flex items-center gap-2">
                <ReactCountryFlag
                  countryCode={c.code}
                  svg
                  style={{ width: '1.5em', height: '1.5em' }}
                />
                <span className="font-medium">{c.abbr}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CountryFlagSelect;