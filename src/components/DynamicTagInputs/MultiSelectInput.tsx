// import React from 'react';

interface MultiSelectInputProps {
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  schema?: {
    type: 'MultiSelect';
    options: {
      optionsList: string[];
      allowManualEntry?: boolean;
      defaultValue?: string[];
    };
  };
}

export function MultiSelectInput({ value, onChange, schema }: MultiSelectInputProps) {
  const optionsList = schema?.options?.optionsList || [];
  const selectedValues = value || [];
  const normalizedSelected = (selectedValues as any[]).map(v => String(v).trim());
  const selectedSet = new Set(normalizedSelected);

  const parseOption = (option: any): { label: string; items: string[] } => {
    if (Array.isArray(option)) {
      const items = option.map(v => String(v).trim());
      return { label: `[${items.join(', ')}]`, items };
    }
    const raw = String(option).trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1);
      const items = inner.split(',').map(s => s.trim()).filter(s => s.length > 0);
      return { label: raw, items };
    }
    if (raw.includes(',')) {
      const items = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
      return { label: `[${items.join(', ')}]`, items };
    }
    return { label: raw, items: [raw] };
  };

  return (
    <div className="dynamic-input multiselect-input">
      {optionsList.map((option) => {
        const { label, items } = parseOption(option);
        const isChecked = items.every(it => selectedSet.has(it));
        return (
        <label key={option} className="checkbox-label">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              if (e.target.checked) {
                const next = new Set(selectedSet);
                items.forEach(v => next.add(v));
                onChange(Array.from(next));
              } else {
                const next = new Set(selectedSet);
                items.forEach(v => next.delete(v));
                onChange(Array.from(next));
              }
            }}
          />
          <span>{label}</span>
        </label>
      );})}
      {selectedValues.length === 0 && schema?.options?.allowManualEntry && (
        <div className="manual-entry-hint">
          (リスト外の値も手動入力可能)
        </div>
      )}
    </div>
  );
}
