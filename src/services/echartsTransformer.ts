/**
 * DSL to ECharts Transformer
 * 
 * Transforms internal Chart DSL into Apache ECharts configuration objects.
 * Based on R-6.8.0 specification.
 */

import type { Chart, PieChart, BarChart, LineChart, GanttChart } from '../services/types/chart-dsl';

export interface EChartsOption {
  [key: string]: any;
}

/**
 * Transform Chart DSL to ECharts option
 */
export function transformDSLToEChartsOption(dsl: Chart): EChartsOption {
  switch (dsl.type) {
    case 'pie':
      return transformPieChart(dsl);
    case 'bar':
      return transformBarChart(dsl);
    case 'line':
      return transformLineChart(dsl);
    case 'gantt':
      return transformGanttChart(dsl);
    default:
      throw new Error(`Unsupported chart type: ${(dsl as any).type}`);
  }
}

/**
 * Transform Pie Chart DSL to ECharts option
 */
function transformPieChart(dsl: PieChart): EChartsOption {
  return {
    title: {
      text: dsl.title || 'Pie Chart',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: dsl.title || 'Distribution',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        data: dsl.categories.map((cat) => ({
          name: cat.label,
          value: cat.count,
        })),
      },
    ],
  };
}

/**
 * Transform Bar Chart DSL to ECharts option
 */
function transformBarChart(dsl: BarChart): EChartsOption {
  // Handle both formats: categories or x_axis/values
  let xAxisData: string[] = [];
  let seriesData: number[] = [];
  
  if (dsl.categories && dsl.categories.length > 0) {
    xAxisData = dsl.categories.map((cat) => cat.label);
    seriesData = dsl.categories.map((cat) => cat.count);
  } else if (dsl.x_axis && dsl.values) {
    xAxisData = dsl.x_axis;
    seriesData = dsl.values;
  }
  
  return {
    title: {
      text: dsl.title || 'Bar Chart',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisTick: {
        alignWithLabel: true,
      },
    },
    yAxis: {
      type: 'value',
      name: dsl.y_axis_label,
      max: dsl.max_value,
    },
    series: [
      {
        name: dsl.title || 'Count',
        type: 'bar',
        barWidth: '60%',
        data: seriesData,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}

/**
 * Transform Line Chart DSL to ECharts option
 */
function transformLineChart(dsl: LineChart): EChartsOption {
  const series = dsl.series || [];
  
  // Sort by date
  const sortedSeries = [...series].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // メトリック名を取得（タイトルから推測、またはY軸ラベルを使用）
  const metricName = dsl.y_axis_label || 'Count';
  
  // ツールチップのフォーマッター
  const formatValue = (value: number) => {
    // 整数値の場合は整数として表示、小数の場合は小数点以下2桁まで表示
    if (Number.isInteger(value)) {
      return value.toString();
    } else {
      return value.toFixed(2);
    }
  };

  return {
    title: {
      text: dsl.title || 'Line Chart',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        if (!Array.isArray(params)) {
          return '';
        }
        const param = params[0];
        const date = param.name;
        const value = param.value;
        const formattedValue = formatValue(value);
        return `${date}<br/>${metricName}: ${formattedValue}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sortedSeries.map((point) => point.date),
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
    },
    yAxis: {
      type: 'value',
      name: metricName,
    },
    series: [
      {
        name: metricName,
        type: 'line',
        smooth: true,
        data: sortedSeries.map((point) => point.value),
        areaStyle: {
          opacity: 0.3,
        },
      },
    ],
  };
}

/**
 * Transform Gantt Chart DSL to ECharts option
 * 
 * Note: ECharts doesn't have a native Gantt chart, so we use a bar chart with time axis
 */
function transformGanttChart(dsl: GanttChart): EChartsOption {
  type TaskRow = {
    name: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    taskId: string;
    status?: string;
    section?: string;
  };

  const rows: TaskRow[] = [];

  dsl.sections.forEach((section) => {
    section.tasks.forEach((task) => {
      const startMs = new Date(task.start).getTime();
      const endMs = new Date(task.end).getTime();
      if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) return;
      rows.push({
        name: task.title,
        startMs,
        endMs,
        durationMs: endMs - startMs,
        taskId: task.id,
        status: task.status,
        section: section.name,
      });
    });
  });

  const yCategories = rows.map((r) => r.name);
  if ((import.meta as any)?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('[Gantt][rows]', rows.slice(0, 5), 'count=', rows.length);
  }
  if (rows.length === 0) {
    return {
      title: { text: dsl.title || 'Gantt Chart' },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
    };
  }

  const statusColors: Record<string, string> = {
    done: '#67C23A',
    completed: '#67C23A',
    progress: '#409EFF',
    'in-progress': '#409EFF',
    todo: '#909399',
    pending: '#909399',
    blocked: '#F56C6C',
    cancelled: '#909399',
    unknown: '#C0C4CC',
  };

  return {
    title: { text: dsl.title || 'Gantt Chart', left: 'center' },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const v = params?.data;
        if (!v) return '';
        let startMs: number | null = null;
        let endMs: number | null = null;
        let status = 'unknown';
        let taskId = '';
        let name = '';
        let section: string | undefined;
        if (Array.isArray(v)) {
          // [yIndexOrName, startMs, endMs, status, taskId, section, name?]
          startMs = Number(v[1]);
          endMs = Number(v[2]);
          status = String(v[3] || 'unknown');
          taskId = String(v[4] || '');
          section = v[5] ? String(v[5]) : undefined;
          name = String(v[6] ?? '');
        } else if (typeof v === 'object') {
          // object style fallback
          startMs = Number((v as any).startMs ?? (v as any)[1]);
          endMs = Number((v as any).endMs ?? (v as any)[2]);
          status = String((v as any).status || 'unknown');
          taskId = String((v as any).taskId || '');
          section = (v as any).section;
          name = String((v as any).name || '');
        }
        if (!isFinite(startMs!) || !isFinite(endMs!)) return '';
        const start = new Date(startMs!).toLocaleDateString('ja-JP');
        const end = new Date(endMs!).toLocaleDateString('ja-JP');
        const days = Math.ceil(((endMs! - startMs!) / (1000 * 60 * 60 * 24)));
        return `
          <strong>${taskId}</strong><br/>
          タイトル: ${name}<br/>
          開始日: ${start}<br/>
          終了日: ${end}<br/>
          期間: ${days}日<br/>
          ステータス: ${status || '未設定'}${section ? `<br/>セクション: ${section}` : ''}
        `;
      },
    },
    legend: { show: false },
    grid: { left: 120, right: 40, top: 50, bottom: 60, containLabel: true },
    xAxis: {
      type: 'time',
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      inverse: true,
    },
    dataZoom: [
      // Y軸（タスク一覧）スクロール
      { type: 'inside', yAxisIndex: 0, filterMode: 'weakFilter', start: 0, end: 100, moveOnMouseWheel: true, zoomOnMouseWheel: 'ctrl' },
      // X軸（日付）ズーム/スクロール
      { type: 'inside', xAxisIndex: 0, filterMode: 'weakFilter', start: 0, end: 100 },
      { type: 'slider', xAxisIndex: 0, filterMode: 'weakFilter', start: 0, end: 100, height: 24, bottom: 20 }
    ],
    series: [
      {
        type: 'custom',
        animation: false,
        progressive: 2000,
        progressiveThreshold: 3000,
        renderItem: (params: any, api: any) => {
          const yIndex = params.dataIndex; // カテゴリのインデックス
          const start = Number(api.value(1));
          const end = Number(api.value(2));
          const startCoord = api.coord([start, yIndex]);
          const endCoord = api.coord([end, yIndex]);
          const barHeight = Math.max(8, api.size([0, 1])[1] * 0.6);
          const x = Math.min(startCoord[0], endCoord[0]);
          const w = Math.max(1, Math.abs(endCoord[0] - startCoord[0]));
          const y = startCoord[1] - barHeight / 2;
          return {
            type: 'rect',
            shape: { x, y, width: w, height: barHeight },
            style: {
              fill: (() => {
                const s = String(api.value(3) || 'unknown').toLowerCase();
                return statusColors[s] || statusColors.unknown;
              })(),
            },
            // ensure drawn above grid
            z: 2,
            zlevel: 0,
          } as any;
        },
        data: rows.map((r) => [
          r.name, r.startMs, r.endMs, (r.status || 'unknown').toLowerCase(), r.taskId, r.section, r.name
        ]),
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => {
            const startMs = Number(p.value[1]);
            const endMs = Number(p.value[2]);
            const start = new Date(startMs);
            const end = new Date(endMs);
            const days = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
            return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()} (${days}日)`;
          },
        },
      },
    ],
  };
}

/**
 * Validate ECharts option for common issues
 */
export function validateEChartsOption(option: EChartsOption): { valid: boolean; error?: string } {
  if (!option) {
    return { valid: false, error: 'Option is null or undefined' };
  }
  
  if (!option.series || !Array.isArray(option.series) || option.series.length === 0) {
    return { valid: false, error: 'Series array is missing or empty' };
  }
  
  // Check for malicious patterns
  const optionStr = JSON.stringify(option);
  if (optionStr.includes('function(') || optionStr.includes('eval(') || optionStr.includes('Function(')) {
    return { valid: false, error: 'Option contains potentially malicious code' };
  }
  
  // Check for external URLs (optional security check)
  if (optionStr.includes('http://') || optionStr.includes('https://')) {
    // Allow but warn
    console.warn('ECharts option contains external URLs');
  }
  
  return { valid: true };
}

/**
 * Sanitize ECharts option by removing potentially dangerous fields
 */
export function sanitizeEChartsOption(option: EChartsOption): EChartsOption {
  // Deep clone to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(option));
  
  // Remove functions and other non-serializable content
  // This is handled by JSON.parse/stringify above
  
  return sanitized;
}

