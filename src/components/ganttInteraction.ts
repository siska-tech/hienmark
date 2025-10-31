import type { Task } from '../types/gantt';

type EChartsApi = {
  coord: (val: [number, number]) => [number, number];
  size: (val: [number, number]) => [number, number];
  convertFromPixel: (coordSys: string, pixel: [number, number]) => [number, number];
};

type UpdateHandler = (taskId: string, newStartTime: number, newEndTime: number) => void;

export function createMoveHandle(
  task: Task,
  taskIndex: number,
  api: EChartsApi,
  updateHandler: UpdateHandler,
): any {
  const startPos = api.coord([task.startTime, taskIndex]);
  const endPos = api.coord([task.endTime, taskIndex]);
  const catH = api.size([0, 1])[1];
  const barH = catH * 0.6;
  const width = endPos[0] - startPos[0];
  const duration = task.endTime - task.startTime;

  return {
    type: 'rect',
    position: [startPos[0], startPos[1] - barH / 2],
    shape: { width, height: barH },
    style: { fill: 'rgba(0,0,0,0)', cursor: 'move' },
    draggable: true,
    ondrag: function (this: any) {
      const newPos = api.convertFromPixel('grid', [this.position[0], this.position[1] + barH / 2]);
      const newStart = Math.round(newPos[0]);
      const newEnd = newStart + duration;
      updateHandler(task.id, newStart, newEnd);
    },
    z: 100,
  };
}

export function createResizeHandle(
  task: Task,
  taskIndex: number,
  api: EChartsApi,
  updateHandler: UpdateHandler,
): any {
  const endPos = api.coord([task.endTime, taskIndex]);
  const catH = api.size([0, 1])[1];
  const barH = catH * 0.6;
  const handleW = 10;

  return {
    type: 'rect',
    position: [endPos[0] - handleW / 2, endPos[1] - barH / 2],
    shape: { width: handleW, height: barH },
    style: { fill: 'rgba(0,0,255,0)', cursor: 'ew-resize' },
    draggable: true,
    ondrag: function (this: any) {
      const newPos = api.convertFromPixel('grid', [this.position[0] + handleW / 2, this.position[1] + barH / 2]);
      const newEnd = Math.round(newPos[0]);
      if (newEnd > task.startTime) {
        updateHandler(task.id, task.startTime, newEnd);
      }
    },
    z: 101,
  };
}





