import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import './FilterPopover.css';
import type { TagAttributeType } from '../../types/task';

interface FilterPopoverProps {
  sortKey: 'usage' | 'name' | 'attribute' | 'valueName';
  sortOrder: 'asc' | 'desc';
  attributeFilter: TagAttributeType | 'all';
  minUsage: number | '';
  hideUnused: boolean;
  templateFilter?: string | '';
  templateNames?: string[];

  onSortKeyChange: (key: 'usage' | 'name' | 'attribute' | 'valueName') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onAttributeFilterChange: (attr: TagAttributeType | 'all') => void;
  onMinUsageChange: (value: number | '') => void;
  onHideUnusedChange: (checked: boolean) => void;
  onTemplateFilterChange?: (name: string | '') => void;
}

export function FilterPopover({
  sortKey,
  sortOrder,
  attributeFilter,
  minUsage,
  hideUnused,
  templateFilter = '',
  templateNames = [],
  onSortKeyChange,
  onSortOrderChange,
  onAttributeFilterChange,
  onMinUsageChange,
  onHideUnusedChange,
  onTemplateFilterChange,
}: FilterPopoverProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (triggerRef.current && triggerRef.current.contains(target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Calculate and clamp popover position to viewport
  useEffect(() => {
    const updatePosition = () => {
      if (!open || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = 320; // desired popover width
      const margin = 8;
      const viewportWidth = window.innerWidth;
      const leftPreferred = rect.right - width; // align right edge to trigger right
      const left = Math.max(margin, Math.min(leftPreferred, viewportWidth - width - margin));
      const top = Math.max(margin, rect.bottom + margin);
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn-save"
        title={t.common.filter}
        aria-label={t.common.filter}
        onClick={() => setOpen(o => !o)}
        ref={triggerRef}
        style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Funnel icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
        </svg>
      </button>

      {open && position && createPortal(
        <div
          ref={ref}
          role="dialog"
          aria-label="Filter options"
          className="popover-panel"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '320px',
            zIndex: 1000,
          }}
        >
          <div className="popover-content">
            {/* Sort */}
            <div className="space-y-2">
              <div className="popover-section-title">{t.common.sort}</div>
              <div className="popover-row">
                <select className="popover-select" value={sortKey} onChange={(e) => onSortKeyChange(e.target.value as any)}>
                  <option value="usage">Usage</option>
                  <option value="name">Category</option>
                  <option value="attribute">Attribute</option>
                  <option value="valueName">Value</option>
                </select>
                <select className="popover-select" value={sortOrder} onChange={(e) => onSortOrderChange(e.target.value as any)}>
                  <option value="desc">{t.customFilterSort.descending}</option>
                  <option value="asc">{t.customFilterSort.ascending}</option>
                </select>
              </div>
            </div>

            {/* Filter */}
            <div className="space-y-2">
              <div className="popover-section-title">{t.common.filter}</div>
              <select className="popover-select" value={attributeFilter} onChange={(e) => onAttributeFilterChange(e.target.value as any)}>
                <option value="all">All</option>
                <option value="String">String</option>
                <option value="Number">Number</option>
                <option value="Boolean">Boolean</option>
                <option value="Datetime">Datetime</option>
                <option value="Select">Select</option>
                <option value="MultiSelect">MultiSelect</option>
                <option value="Currency">Currency</option>
                <option value="Image">Image</option>
                <option value="Hyperlink">Hyperlink</option>
              </select>
              <input
                className="popover-control"
                type="number"
                placeholder="Min usage count"
                value={minUsage === '' ? '' : String(minUsage)}
                onChange={(e) => onMinUsageChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <label className="popover-label-inline">
                <input className="popover-checkbox" type="checkbox" checked={hideUnused} onChange={(e) => onHideUnusedChange(e.target.checked)} />
                Hide unused tags
              </label>

              {onTemplateFilterChange && (
                <select className="popover-select" value={templateFilter} onChange={(e) => onTemplateFilterChange(e.target.value)}>
                  <option value="">Template: {t.common.all || 'All'}</option>
                  {templateNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default FilterPopover;


