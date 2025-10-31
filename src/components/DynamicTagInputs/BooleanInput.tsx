// import React from 'react';

interface BooleanInputProps {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  schema?: {
    type: 'Boolean';
    options: {
      defaultValue?: boolean;
    };
  };
}

export function BooleanInput({ value, onChange, schema }: BooleanInputProps) {
  const isChecked = value ?? schema?.options?.defaultValue ?? false;

  return (
    <div className="dynamic-input boolean-input">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{isChecked ? '有効' : '無効'}</span>
      </label>
    </div>
  );
}
