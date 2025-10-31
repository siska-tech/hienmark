import type { EChartsOption, SeriesOption } from 'echarts';
import type { ProjectData, Task } from '../types/gantt';
import { DependencyType } from '../types/gantt';

type AnySeries = SeriesOption & Record<string, any>;

const IDX_TASK = 0;
const IDX_START = 1;
const IDX_END = 2;
const IDX_PROGRESS = 3;
const IDX_NAME = 4;
// reserved index for id if needed in future

function renderItem(_: any, api: any) {
  const start = api.value(IDX_START);
  const end = api.value(IDX_END);
  const name = api.value(IDX_NAME);
  const progress = Math.max(0, Math.min(1, api.value(IDX_PROGRESS)));

  const startCoord = api.coord([start, api.value(IDX_TASK)]);
  const endCoord = api.coord([end, api.value(IDX_TASK)]);
  const x = startCoord[0];
  const width = Math.max(0, endCoord[0] - startCoord[0]);
  const cy = startCoord[1];
  const barH = api.size([0, 1])[1] * 0.6;
  const y = cy - barH / 2;
  const progressW = Math.round(width * progress);

  return {
    type: 'group',
    children: [
      {
        type: 'rect',
        shape: { x, y, width, height: barH, r: 4 },
        style: { fill: '#e0e0e0' },
      },
      {
        type: 'rect',
        ignore: progress <= 0 || width <= 0,
        shape: { x, y, width: progressW, height: barH, r: 4 },
        style: { fill: '#5470C6' },
      },
      {
        type: 'text',
        ignore: width < 40,
        style: {
          text: name,
          x: x + 8,
          y: cy,
          textVerticalAlign: 'middle',
          textAlign: 'left',
          fill: '#000',
        },
      },
    ],
  };
}

function taskToSeriesValue(task: Task, index: number) {
  return [
    index,
    task.startTime,
    task.endTime,
    task.progress ?? 0,
    task.name,
    task.id,
  ];
}

export function generateGanttOptions(data: ProjectData): EChartsOption {
  const categories = data.tasks.map(t => t.name);
  const seriesData = data.tasks.map((t, i) => ({
    name: t.name,
    value: taskToSeriesValue(t, i),
  }));

  // dependency as graph (optional minimal)
  const idToIndex = new Map<string, number>(data.tasks.map((t, i) => [t.id, i]));
  const nodeMap: Map<string, any> = new Map();
  const links: any[] = [];
  for (const dep of data.dependencies || []) {
    if (dep.depType !== DependencyType.FinishToStart) continue;
    const fromIdx = idToIndex.get(dep.fromTaskId);
    const toIdx = idToIndex.get(dep.toTaskId);
    const fromTask = fromIdx != null ? data.tasks[fromIdx] : null;
    const toTask = toIdx != null ? data.tasks[toIdx] : null;
    if (!fromTask || !toTask) continue;
    const fromId = `${fromTask.id}_end`;
    const toId = `${toTask.id}_start`;
    if (!nodeMap.has(fromId)) nodeMap.set(fromId, { id: fromId, name: fromId, value: [fromTask.endTime, fromIdx], symbolSize: 0 });
    if (!nodeMap.has(toId)) nodeMap.set(toId, { id: toId, name: toId, value: [toTask.startTime, toIdx], symbolSize: 0 });
    links.push({ source: fromId, target: toId });
  }
  const graphData = Array.from(nodeMap.values());

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        if (p?.value && Array.isArray(p.value)) {
          const name = p.value[IDX_NAME];
          const s = new Date(p.value[IDX_START]).toLocaleString();
          const e = new Date(p.value[IDX_END]).toLocaleString();
          const pr = Math.round((p.value[IDX_PROGRESS] ?? 0) * 100);
          return `${name}<br/>Start: ${s}<br/>End: ${e}<br/>Progress: ${pr}%`;
        }
        return '';
      },
    },
    grid: { left: 140, right: 40, top: 40, bottom: 40 },
    xAxis: { type: 'time', position: 'top' },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0 },
    ],
    series: [
      {
        type: 'custom',
        name: 'Tasks',
        renderItem,
        encode: { x: [IDX_START, IDX_END], y: IDX_TASK },
        data: seriesData,
        itemStyle: { opacity: 1 },
        silent: false,
      } as AnySeries,
      graphData.length > 0 || links.length > 0
        ? ({
            type: 'graph',
            coordinateSystem: 'cartesian2d',
            data: graphData,
            links,
            edgeSymbol: ['none', 'arrow'],
            lineStyle: { color: '#666', type: 'dashed' },
            symbolSize: 0,
            silent: true,
            z: 2,
          } as AnySeries)
        : ({} as AnySeries),
    ].filter(Boolean) as AnySeries[],
  };

  return option;
}


