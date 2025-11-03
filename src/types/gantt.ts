export interface Task {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  progress: number;
}

export enum DependencyType {
  FinishToStart = 'FinishToStart',
}

export interface Dependency {
  fromTaskId: string;
  toTaskId: string;
  depType: DependencyType;
}

export interface ProjectData {
  tasks: Task[];
  dependencies: Dependency[];
}










