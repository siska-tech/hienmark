import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { invoke } from '@tauri-apps/api/core';
import type { ProjectData } from '../types/gantt';
import { generateGanttOptions } from './useGanttOptions';
import { createMoveHandle, createResizeHandle } from './ganttInteraction';

interface GanttChartProps {
  data?: ProjectData;
  readOnly?: boolean;
}

export const GanttChart: React.FC<GanttChartProps> = ({ data, readOnly = false }) => {
  const ref = useRef<ReactECharts>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [option, setOption] = useState<EChartsOption>({});

  const debouncedSave = useRef<number | null>(null);
  const scheduleSave = (data: ProjectData) => {
    if (readOnly) return;
    if (debouncedSave.current) window.clearTimeout(debouncedSave.current);
    debouncedSave.current = window.setTimeout(() => {
      invoke('save_project', { projectData: data }).catch(() => {});
    }, 800);
  };

  const handleTaskUpdate = useCallback((taskId: string, newStart: number, newEnd: number) => {
    setProjectData(cur => {
      if (!cur) return cur;
      let changed = false;
      const tasks = cur.tasks.map(t => {
        if (t.id === taskId) {
          if (t.startTime !== newStart || t.endTime !== newEnd) {
            changed = true;
            return { ...t, startTime: newStart, endTime: newEnd };
          }
        }
        return t;
      });
      if (changed) {
        const next = { ...cur, tasks };
        scheduleSave(next);
        return next;
      }
      return cur;
    });
  }, []);

  // Load data: prefer prop "data"; otherwise load from backend
  useEffect(() => {
    if (data) {
      setProjectData(data);
      return;
    }
    (async () => {
      try {
        const loaded = await invoke<ProjectData>('load_project');
        if (!loaded || !Array.isArray((loaded as any).tasks) || (loaded as any).tasks.length === 0) {
          const now = Date.now();
          const sample: ProjectData = {
            tasks: [
              { id: 't1', name: 'Sample Task 1', startTime: now, endTime: now + 86400000, progress: 0.2 },
              { id: 't2', name: 'Sample Task 2', startTime: now + 86400000, endTime: now + 3 * 86400000, progress: 0.5 },
            ],
            dependencies: [
              { fromTaskId: 't1', toTaskId: 't2', depType: 'FinishToStart' as any },
            ],
          };
          setProjectData(sample);
        } else {
          setProjectData(loaded as ProjectData);
        }
      } catch {
        setProjectData(null);
      }
    })();
  }, [data]);

  useEffect(() => {
    const chart = ref.current?.getEchartsInstance();
    if (!chart || !projectData) return;

    const base = generateGanttOptions(projectData);
    // First, apply base option so coordinate system exists
    try { chart.setOption(base as any, { notMerge: true, lazyUpdate: true }); } catch {}
    setOption(base);

    // Then compute interaction handles using established model
    const model = (chart as any).getModel?.();
    const yAxisComp = model?.getComponent?.('yAxis', 0);
    const bandWidth = yAxisComp?.coordinateSystem?.getBandWidth?.();
    if (!bandWidth) return;

    const idxMap = new Map(projectData.tasks.map((t, i) => [t.id, i]));
    const api = {
      coord: (val: [number, number]) => chart.convertToPixel('grid', val) as [number, number],
      size: (_val: [number, number]) => [0, bandWidth] as [number, number],
      convertFromPixel: (cs: string, px: [number, number]) => chart.convertFromPixel(cs, px) as [number, number],
    } as const;

    const graphics = projectData.tasks.flatMap(t => {
      const i = idxMap.get(t.id);
      if (i == null) return [] as any[];
      return [
        createMoveHandle(t, i, api, handleTaskUpdate),
        createResizeHandle(t, i, api, handleTaskUpdate),
      ];
    });

    try { chart.setOption({ graphic: graphics } as any, { notMerge: false, lazyUpdate: true }); } catch {}
  }, [projectData, handleTaskUpdate]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {!projectData ? (
        <div>Loading Chart...</div>
      ) : (
        <ReactECharts
          ref={ref}
          option={option}
          notMerge={false}
          lazyUpdate={true}
          style={{ width: '100%', height: `${Math.max(projectData.tasks.length * 40, 600)}px` }}
        />
      )}
    </div>
  );
};


