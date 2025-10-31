// import React from 'react';

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  schema?: {
    type: 'Number';
    options: {
      min?: number;
      max?: number;
      decimalPlaces?: number;
      defaultValue?: number;
      formatAsPercentage?: boolean;
    };
  };
}

export function NumberInput({ value, onChange, schema }: NumberInputProps) {
  const min = schema?.options?.min;
  const max = schema?.options?.max;
  const step = schema?.options?.decimalPlaces ? 
    Math.pow(10, -schema.options.decimalPlaces) : 
    undefined;

  const formatAsPercentage = schema?.options?.formatAsPercentage;

  return (
    <div className="dynamic-input number-input">
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
        placeholder={formatAsPercentage ? 'パーセンテージを入力' : '数値を入力'}
      />
      {formatAsPercentage && (
        <span className="input-suffix">%</span>
      )}
      {(min !== undefined || max !== undefined) && (
        <div className="input-hint">
          範囲: {min !== undefined ? min : '∞'} ~ {max !== undefined ? max : '∞'}
        </div>
      )}
    </div>
  );
}
