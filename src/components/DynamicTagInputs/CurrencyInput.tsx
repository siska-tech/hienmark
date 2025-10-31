// import React from 'react';

interface CurrencyInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  schema?: {
    type: 'Currency';
    options: {
      min?: number;
      max?: number;
      decimalPlaces?: number;
      defaultValue?: number;
      currencyFormat?: string;
    };
  };
}

export function CurrencyInput({ value, onChange, schema }: CurrencyInputProps) {
  const min = schema?.options?.min;
  const max = schema?.options?.max;
  const decimalPlaces = schema?.options?.decimalPlaces || 2;
  const currencyFormat = schema?.options?.currencyFormat || 'JPY';
  
  const step = Math.pow(10, -decimalPlaces);

  const formatCurrency = (amount: number): string => {
    if (currencyFormat === 'JPY') {
      return `¥${amount.toLocaleString()}`;
    } else if (currencyFormat === 'USD') {
      return `$${amount.toFixed(2)}`;
    } else if (currencyFormat === 'EUR') {
      return `€${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(2)}`;
  };

  return (
    <div className="dynamic-input currency-input">
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const numValue = parseFloat(e.target.value);
          if (!isNaN(numValue)) {
            onChange(numValue);
          }
        }}
        placeholder={min !== undefined && max !== undefined 
          ? `${min}~${max}の数値を入力` 
          : '金額を入力'}
      />
      <span className="input-suffix">{formatCurrency(value || 0)}</span>
      {(min !== undefined || max !== undefined) && (
        <div className="input-hint">
          範囲: {min !== undefined ? formatCurrency(min) : '∞'} ~ {max !== undefined ? formatCurrency(max) : '∞'}
        </div>
      )}
    </div>
  );
}
