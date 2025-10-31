/**
 * ECharts Wrapper Component
 *
 * Wraps Apache ECharts for React rendering with theme support and optimization.
 * Provides common zoom controls (in/out/fit) and export buttons.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, CustomChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, ToolboxComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';  
import type { EChartsOption } from 'echarts';
// Note: Do not import useTheme here to avoid applying a global theme change.

// Register necessary components
echarts.use([
  LineChart, BarChart, PieChart, CustomChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  DataZoomComponent, ToolboxComponent, MarkLineComponent,
  CanvasRenderer, SVGRenderer,
]);

export interface TaskData {
  taskId: string;
  name: string;
  status?: string;
  section?: string;
  start: string;
  end: string;
  dependsOn?: string;
}

export interface EChartsWrapperProps {
  option: EChartsOption;
  theme?: string;
  height?: string | number;
  width?: string | number;
  onReady?: (chart: echarts.ECharts) => void;
  onTaskClick?: (task: TaskData) => void;
  showExportButtons?: boolean;
  showZoomControls?: boolean;
}

export const EChartsWrapper: React.FC<EChartsWrapperProps> = ({
  option,
  theme,
  height = '100%',
  width = '100%',
  onReady,
  onTaskClick,
  showExportButtons = false,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [echartsTheme, setEchartsTheme] = useState<string>(() => {
    if (theme) return theme;
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'hienmark-dark' ? 'dark' : 'light';
  });

  // Observe theme changes on the root element and update ECharts theme accordingly
  useEffect(() => {
    if (theme) {
      setEchartsTheme(theme);
      return;
    }
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      const attr = target.getAttribute('data-theme');
      setEchartsTheme(attr === 'hienmark-dark' ? 'dark' : 'light');
    });
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [theme]);

  // Initialize / update
  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, echartsTheme);
      if (onReady && chartInstanceRef.current) {
        try {
          onReady(chartInstanceRef.current);
        } catch {}
      }
    }
    const chart = chartInstanceRef.current;
    try {
      chart.setOption(option, { notMerge: false });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[EChartsWrapper] setOption failed', e);
    }

    // Click events for task data (if provided by series)
    if (onTaskClick) {
      const handleClick = (params: any) => {
        if (params?.data && typeof params.data === 'object' && 'taskId' in params.data) {
          const taskData: TaskData = {
            taskId: params.data.taskId,
            name: params.data.name,
            status: params.data.status,
            section: params.data.section,
            start: params.data.start,
            end: params.data.end,
            dependsOn: params.data.dependsOn,
          };
          onTaskClick(taskData);
        }
      };
      try { chart.on('click', handleClick); } catch {}
      return () => {
        try { chart.off('click', handleClick); } catch {}
      };
    }

    // Resize listener
    const handleResize = () => {
      try { chart.resize(); } catch {}
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [option, echartsTheme, onReady, onTaskClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // Recreate on theme change
  useEffect(() => {
    if (chartInstanceRef.current && chartRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = echarts.init(chartRef.current, echartsTheme);
      if (onReady && chartInstanceRef.current) {
        try { onReady(chartInstanceRef.current); } catch {}
      }
      try { chartInstanceRef.current.setOption(option, { notMerge: false }); } catch {}
    }
  }, [echartsTheme]);

  // Fit container height to viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const resize = () => {
      if (!containerRef.current) return;
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const crect = containerRef.current.getBoundingClientRect();
      const availableH = Math.max(300, Math.floor(viewportH - crect.top - 16));
      containerRef.current.style.height = `${availableH}px`;
      try { chartInstanceRef.current?.resize(); } catch {}
    };
    resize();
    window.addEventListener('resize', resize);
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window && containerRef.current) {
      ro = new ResizeObserver(() => resize());
      ro.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
    };
  }, [width, height]);

  const iconBtnStyle: React.CSSProperties = {
    padding: '6px',
    backgroundColor: 'var(--app-bg-main, rgba(0,0,0,0.5))',
    color: 'var(--app-text-main, #fff)',
    border: '1px solid var(--app-border, rgba(255,255,255,0.2))',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  

  const handleExportPNG = async () => {
    if (!chartInstanceRef.current) return;
    try {
      const dataUrl = await exportChartAsImage(chartInstanceRef.current, 'png');
      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  const handleExportSVG = async () => {
    if (!chartInstanceRef.current) return;
    try {
      const dataUrl = await exportChartAsSVG(chartInstanceRef.current);
      const link = document.createElement('a');
      link.download = 'chart.svg';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width, height, minHeight: '300px', overflow: 'auto' }}>
      {(showExportButtons) && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: 8 }}>
          {showExportButtons && (
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <button onClick={handleExportPNG} style={iconBtnStyle} title="PNG">PNG</button>
              <button onClick={handleExportSVG} style={iconBtnStyle} title="SVG">SVG</button>
            </div>
          )}
        </div>
      )}
      <div style={{ width: '100%', height: '100%', minHeight: '0px' }}>
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '0px',
          }}
        />
      </div>
    </div>
  );
};

export async function exportChartAsImage(chart: echarts.ECharts, format: 'png' | 'jpeg' = 'png'): Promise<string> {
  return chart.getDataURL({ type: format, pixelRatio: 2, backgroundColor: '#fff' });
}

export async function exportChartAsSVG(chart: echarts.ECharts): Promise<string> {
  return chart.getDataURL({ type: 'svg', pixelRatio: 2 });
}
