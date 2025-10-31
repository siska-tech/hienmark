import { invoke } from '@tauri-apps/api/core';

/**
 * ChartOutput型定義（R-6.6.2）
 */
export interface ChartOutput {
  mermaid: string;
  data: Chart;
  // R-6.8.0: Add ECharts option field
  echarts?: any;
}

export type Chart =
  | { type: 'gantt'; title: string; date_format: string; sections: GanttSection[] }
  | { type: 'pie'; title: string; categories: CategoryCount[] }
  | { type: 'line'; title: string; y_axis_label: string; series: TimeSeriesPoint[] }
  | { type: 'bar'; title: string; x_axis: string[]; y_axis_label: string; values: number[]; max_value: number };

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

export interface CategoryCount {
  label: string;
  count: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * Analysis Service
 * タスク分析機能を提供するサービス
 */
export class AnalysisService {
  /**
   * ガントチャート用Mermaidコードを生成
   */
  static async generateGanttChart(workspacePath: string): Promise<string> {
    try {
      const mermaidCode = await invoke<string>('generate_gantt_chart', {
        workspacePath,
      });
      return mermaidCode;
    } catch (error) {
      console.error('Failed to generate gantt chart:', error);
      throw error;
    }
  }

  /**
   * 円グラフ用Mermaidコードを生成
   */
  static async generatePieChart(
    workspacePath: string,
    category: string
  ): Promise<string> {
    try {
      const mermaidCode = await invoke<string>('generate_pie_chart', {
        workspacePath,
        category,
      });
      return mermaidCode;
    } catch (error) {
      console.error('Failed to generate pie chart:', error);
      throw error;
    }
  }

  /**
   * 棒グラフ用Mermaidコードを生成
   */
  static async generateBarChart(
    workspacePath: string,
    category: string
  ): Promise<string> {
    try {
      const mermaidCode = await invoke<string>('generate_bar_chart', {
        workspacePath,
        category,
      });
      return mermaidCode;
    } catch (error) {
      console.error('Failed to generate bar chart:', error);
      throw error;
    }
  }

  /**
   * 折線グラフ用Mermaidコードを生成
   */
  static async generateLineChart(
    workspacePath: string,
    dateField: string
  ): Promise<string> {
    try {
      const mermaidCode = await invoke<string>('generate_line_chart', {
        workspacePath,
        dateField,
      });
      return mermaidCode;
    } catch (error) {
      console.error('Failed to generate line chart:', error);
      throw error;
    }
  }

  /**
   * 利用可能なタグカテゴリのリストを取得
   */
  static async getAvailableCategories(workspacePath: string): Promise<string[]> {
    try {
      const index = await invoke<any>('get_tag_index', { workspacePath });
      return Object.keys(index?.categories || {});
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  // ===== R-6.6.2: Dual Output with DSL =====

  /**
   * ガントチャートDSL + Mermaid双形式を生成
   */
  static async generateGanttChartWithDsl(workspacePath: string): Promise<ChartOutput> {
    try {
      const output = await invoke<ChartOutput>('generate_gantt_chart_with_dsl', {
        workspacePath,
      });
      return output;
    } catch (error) {
      console.error('Failed to generate gantt chart with DSL:', error);
      throw error;
    }
  }

  /**
   * ガントチャートDSL + Mermaid双形式を生成（マッピング対応）
   */
  static async generateGanttChartWithDslMapped(
    workspacePath: string,
    mapping: { title?: string; startDate?: string; endDate?: string; dependsOn?: string; section?: string }
  ): Promise<ChartOutput> {
    return await invoke<ChartOutput>('generate_gantt_chart_with_dsl_mapped', {
      workspacePath,
      mapping,
    });
  }

  /**
   * ガントチャートDSL + Mermaid双形式（フィルタ対応）
   */
  static async generateGanttChartWithDslFiltered(
    workspacePath: string,
    filterDateField?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChartOutput> {
    return await invoke<ChartOutput>('generate_gantt_chart_with_dsl_filtered', {
      workspacePath,
      filterDateField: filterDateField ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });
  }

  /**
   * ガントチャートDSL + Mermaid双形式（マッピング + フィルタ対応）
   */
  static async generateGanttChartWithDslMappedFiltered(
    workspacePath: string,
    mapping: { title?: string; startDate?: string; endDate?: string; dependsOn?: string; section?: string },
    filterDateField?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChartOutput> {
    return await invoke<ChartOutput>('generate_gantt_chart_with_dsl_mapped_filtered', {
      workspacePath,
      mapping,
      filterDateField: filterDateField ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });
  }

  /**
   * 円グラフDSL + Mermaid双形式を生成
   */
  static async generatePieChartWithDsl(
    workspacePath: string,
    category: string
  ): Promise<ChartOutput> {
    try {
      const output = await invoke<ChartOutput>('generate_pie_chart_with_dsl', {
        workspacePath,
        category,
      });
      return output;
    } catch (error) {
      console.error('Failed to generate pie chart with DSL:', error);
      throw error;
    }
  }

  /**
   * 円グラフDSL + Mermaid双形式（フィルタ対応）
   */
  static async generatePieChartWithDslFiltered(
    workspacePath: string,
    category: string,
    filterDateField?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChartOutput> {
    return await invoke<ChartOutput>('generate_pie_chart_with_dsl_filtered', {
      workspacePath,
      category,
      filterDateField: filterDateField ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });
  }

  /**
   * 棒グラフDSL + Mermaid双形式を生成
   */
  static async generateBarChartWithDsl(
    workspacePath: string,
    category: string
  ): Promise<ChartOutput> {
    try {
      const output = await invoke<ChartOutput>('generate_bar_chart_with_dsl', {
        workspacePath,
        category,
      });
      return output;
    } catch (error) {
      console.error('Failed to generate bar chart with DSL:', error);
      throw error;
    }
  }

  /**
   * 棒グラフDSL + Mermaid双形式（フィルタ対応）
   */
  static async generateBarChartWithDslFiltered(
    workspacePath: string,
    category: string,
    filterDateField?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ChartOutput> {
    return await invoke<ChartOutput>('generate_bar_chart_with_dsl_filtered', {
      workspacePath,
      category,
      filterDateField: filterDateField ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });
  }

  /**
   * 折線グラフDSL + Mermaid双形式を生成
   */
  static async generateLineChartWithDsl(
    workspacePath: string,
    dateField: string,
    yAxisLabel?: string,
    metric?: any
  ): Promise<ChartOutput> {
    try {
      const output = await invoke<ChartOutput>('generate_line_chart_with_dsl', {
        workspacePath,
        dateField,
        yAxisLabel: yAxisLabel ?? null,
        metricJson: metric ? JSON.stringify(metric) : null,
      });
      return output;
    } catch (error) {
      console.error('Failed to generate line chart with DSL:', error);
      throw error;
    }
  }

  /**
   * 折線グラフDSL + Mermaid双形式（フィルタ対応）
   */
  static async generateLineChartWithDslFiltered(
    workspacePath: string,
    dateField: string,
    startDate?: string,
    endDate?: string,
    yAxisLabel?: string,
    metric?: any,
  ): Promise<ChartOutput> {
    return await invoke<ChartOutput>('generate_line_chart_with_dsl_filtered', {
      workspacePath,
      dateField,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      yAxisLabel: yAxisLabel ?? null,
      metricJson: metric ? JSON.stringify(metric) : null,
    });
  }

  /** Export chart JSON to a file */
  static async exportChartJson(outputPath: string, chartOutput: ChartOutput): Promise<void> {
    await invoke('export_chart_json', {
      outputPath,
      chartOutputJson: JSON.stringify(chartOutput, null, 2),
    });
  }

  /** Generate markdown report from mermaid blocks */
  static async generateReport(reportPath: string, mermaidBlocks: string[], title?: string): Promise<void> {
    await invoke('generate_analysis_report', {
      reportPath,
      title: title ?? null,
      mermaidBlocks,
    });
  }
}

