'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMemo } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  // Debounce the onChange handler
  const debouncedOnChange = useMemo(() => {
    let timeoutId: NodeJS.Timeout;

    return (newValue: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onChange(newValue);
      }, 300);
    };
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder="Buscar por nome do ingresso ou evento..."
        defaultValue={value}
        onChange={(e) => debouncedOnChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
