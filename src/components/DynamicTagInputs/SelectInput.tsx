// import React from 'react';

interface SelectInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  schema?: {
    type: 'Select';
    options: {
      optionsList: string[];
      allowManualEntry?: boolean;
      defaultValue?: string;
      displayFormat?: 'dropdown' | 'radio';
    };
  };
}

export function SelectInput({ value, onChange, schema }: SelectInputProps) {
  const optionsList = schema?.options?.optionsList || [];
  const displayFormat = schema?.options?.displayFormat || 'dropdown';

  if (displayFormat === 'radio') {
    return (
      <div className="dynamic-input select-input radio-group">
        {optionsList.map((option) => (
          <label key={option} className="radio-label">
            <input
              type="radio"
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="dynamic-input select-input"
    >
      <option value="">選択してください</option>
      {optionsList.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
