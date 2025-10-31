import { useState, useEffect } from 'react';
import * as tagSchemaService from '../../services/tagSchemaService';

interface DateInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  schema?: {
    type: 'Datetime';
    options: {
      format?: 'dateOnly' | 'dateTime';
      defaultValue?: string | { type: 'static'; value: string } | { type: 'dynamic'; formula: string };
    };
  };
}

export function DateInput({ value, onChange, schema }: DateInputProps) {
  const [defaultValueResolved, setDefaultValueResolved] = useState<string | null>(null);

  useEffect(() => {
    const resolveDefaultValue = async () => {
      if (schema?.options?.defaultValue) {
        const defaultValue = schema.options.defaultValue;
        
        if (typeof defaultValue === 'string') {
          // Static value
          setDefaultValueResolved(defaultValue);
        } else if (defaultValue.type === 'static') {
          setDefaultValueResolved(defaultValue.value);
        } else if (defaultValue.type === 'dynamic') {
          try {
            const calculatedValue = await tagSchemaService.getDynamicDefaultValue(defaultValue.formula);
            setDefaultValueResolved(calculatedValue);
          } catch (err) {
            console.error('Failed to calculate dynamic default value:', err);
            setDefaultValueResolved(null);
          }
        }
      }
    };

    resolveDefaultValue();
  }, [schema?.options?.defaultValue]);

  const dateOnly = schema?.options?.format === 'dateOnly';
  const inputType = dateOnly ? 'date' : 'datetime-local';

  return (
    <input
      type={inputType}
      value={value || defaultValueResolved || ''}
      onChange={(e) => onChange(e.target.value)}
      className="dynamic-input date-input"
    />
  );
}
