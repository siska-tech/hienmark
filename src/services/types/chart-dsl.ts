/**
 * Chart DSL Type Definitions
 * Based on R-6.6.2 specification
 */

export interface PieChart {
  type: 'pie';
  title: string;
  categories: CategoryCount[];
}

export interface BarChart {
  type: 'bar';
  title: string;
  categories?: CategoryCount[];
  // Alternative format from analysisService
  x_axis?: string[];
  y_axis_label?: string;
  values?: number[];
  max_value?: number;
}

export interface LineChart {
  type: 'line';
  title: string;
  y_axis_label: string;
  series: TimeSeriesPoint[];
}

export interface GanttChart {
  type: 'gantt';
  title: string;
  date_format: string;
  sections: GanttSection[];
}

export interface CategoryCount {
  label: string;
  count: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number; // f64 (float) をサポート
}

export interface GanttSection {
  name: string;
  tasks: GanttTask[];
}

export interface GanttTask {
  id: string;
  title: string;
  start: string;
  end: string;
  status?: string;
  depends_on?: string;
}

export type Chart = PieChart | BarChart | LineChart | GanttChart;

