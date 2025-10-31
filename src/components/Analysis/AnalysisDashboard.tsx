import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisService } from '../../services/analysisService';
import { loadAnalysisSettings } from '../../services/analysisSettingsService';
import { useTagSchema } from '../../hooks/useTagSchema';
import { useTags } from '../../hooks/useTags';
import { MermaidPreview } from '../TaskEditor/MermaidPreview';
import { EChartsWrapper } from './EChartsWrapper';
import { GanttChart } from '../GanttChart';
import { TaskDetailModal, type TaskData } from './TaskDetailModal';
import { transformDSLToEChartsOption, validateEChartsOption, sanitizeEChartsOption } from '../../services/echartsTransformer';
import type {
  ChartType,
  ChartMapping,
  GanttChartMapping,
  PieChartMapping,
  BarChartMapping,
  LineChartMapping,
  AnalysisSettings,
} from '../../types/task';
import './AnalysisDashboard.css';
import { useLanguage } from '../../contexts/LanguageContext';

interface AnalysisDashboardProps {
  workspacePath: string;
  onOpenTask?: (taskId: string) => void;
}

type ChartMode = 'preview' | 'source' | 'echarts';

/**
 * 分析ダッシュボードコンポーネント
 * チャート設定（マッピング）機能とタブUIを実装
 */
export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  workspacePath,
  onOpenTask,
}) => {
  const { t } = useLanguage();
  const [chartType, setChartType] = useState<ChartType>('gantt');
  const [mode, setMode] = useState<ChartMode>('echarts');
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [echartsOption, setEchartsOption] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [lastOutput, setLastOutput] = useState<any>(null);
  const [ganttProject, setGanttProject] = useState<import('../../types/gantt').ProjectData | null>(null);

  // Global date range filter
  const [filterDateField, setFilterDateField] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { schema: tagSchema } = useTagSchema(workspacePath);
  const { tagIndex } = useTags(workspacePath);

  // 依存関係の循環検出
  useEffect(() => {
    const detectCycles = async () => {
      try {
        // タスク一覧取得
        const taskIds = await (await import('../../services/workspaceService')).listTasks(workspacePath);
        // 依存関係グラフ構築
        const graph: Record<string, string[]> = {};
        await Promise.all(
          taskIds.map(async (id) => {
            try {
              const task = await (await import('../../services/workspaceService')).getTask(workspacePath, id);
              const fm = task.frontMatter as Record<string, any>;
              const depends = fm['depends_on'];
              let deps: string[] = [];
              if (Array.isArray(depends)) deps = depends as string[];
              else if (typeof depends === 'string' && depends.trim()) deps = [depends];
              graph[id] = deps.filter((d) => typeof d === 'string' && d.length > 0);
            } catch {}
          })
        );

        // DFSでサイクル検出
        const visited: Record<string, number> = {};
        const stack: string[] = [];
        const found: string[][] = [];

        const dfs = (node: string) => {
          visited[node] = 1; // visiting
          stack.push(node);
          const neighbors = graph[node] || [];
          for (const next of neighbors) {
            if (!(next in visited)) {
              dfs(next);
            } else if (visited[next] === 1) {
              // cycle found: extract from stack
              const idx = stack.lastIndexOf(next);
              if (idx !== -1) {
                const cycle = stack.slice(idx);
                // 正規化して重複排除
                const key = cycle.join('>');
                if (!found.some((c) => c.join('>') === key)) {
                  found.push(cycle);
                }
              }
            }
          }
          stack.pop();
          visited[node] = 2; // visited
        };

        Object.keys(graph).forEach((n) => {
          if (!(n in visited)) dfs(n);
        });

        setCycles(found);
      } catch (e) {
        setCycles([]);
      }
    };

    detectCycles();
  }, [workspacePath]);

  // 分析設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadAnalysisSettings(workspacePath);
        setAnalysisSettings(settings);
        setSettingsLoaded(true);
      } catch (err) {
        console.error('Failed to load analysis settings:', err);
        // デフォルト設定を使用
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, [workspacePath]);

  // チャート生成関数
  const generateChart = async (
    mapping: ChartMapping,
    overrideFilter?: { filterDateField?: string; startDate?: string; endDate?: string }
  ) => {
    setLoading(true);
    setError(null);
    setLoadingProgress(t.analysis.loadingChart);

    try {
      const isDev = (import.meta as any)?.env?.DEV;
      let code = '';
      let chartData = null;

      const effFilterDateField = overrideFilter?.filterDateField ?? filterDateField;
      const effStartDate = overrideFilter?.startDate ?? startDate;
      const effEndDate = overrideFilter?.endDate ?? endDate;

      switch (mapping.type) {
        case 'gantt': {
          const ganttMap = (mapping.mapping as GanttChartMapping) || {};
          const useFilter = !!(effFilterDateField || effStartDate || effEndDate);
          const output = useFilter
            ? await AnalysisService.generateGanttChartWithDslMappedFiltered(
                workspacePath,
                {
                  title: ganttMap.title,
                  startDate: ganttMap.startDate,
                  endDate: ganttMap.endDate,
                  dependsOn: ganttMap.dependsOn,
                  section: (ganttMap as any)?.section,
                },
                effFilterDateField || undefined,
                effStartDate || undefined,
                effEndDate || undefined,
              )
            : await AnalysisService.generateGanttChartWithDslMapped(
                workspacePath,
                {
                  title: ganttMap.title,
                  startDate: ganttMap.startDate,
                  endDate: ganttMap.endDate,
                  dependsOn: ganttMap.dependsOn,
                  section: (ganttMap as any)?.section,
                }
              );
          code = output.mermaid;
          chartData = output.data;
          setLastOutput(output);
          // Convert DSL Gantt to ProjectData for interactive component
          try {
            if (chartData && (chartData as any).type === 'gantt') {
              const dsl: any = chartData;
              const tasks: import('../../types/gantt').Task[] = [];
              const dependencies: import('../../types/gantt').Dependency[] = [];
              const seen = new Set<string>();
              const toMs = (s: string) => new Date(s).getTime();
              (dsl.sections || []).forEach((section: any) => {
                (section.tasks || []).forEach((t: any) => {
                  if (seen.has(t.id)) return;
                  seen.add(t.id);
                  tasks.push({ id: t.id, name: t.title, startTime: toMs(t.start), endTime: toMs(t.end), progress: 0 });
                  if (t.depends_on) {
                    const list = Array.isArray(t.depends_on) ? t.depends_on : [t.depends_on];
                    list.filter(Boolean).forEach((fid: string) => {
                      dependencies.push({ fromTaskId: fid, toTaskId: t.id, depType: 'FinishToStart' as any });
                    });
                  }
                });
              });
              setGanttProject({ tasks, dependencies });
            } else {
              setGanttProject(null);
            }
          } catch {
            setGanttProject(null);
          }
          break;
        }
        case 'pie': {
          const pieMapping = mapping.mapping as PieChartMapping;
          if (pieMapping.category) {
            const useFilter = !!(effFilterDateField || effStartDate || effEndDate);
            const output = useFilter
              ? await AnalysisService.generatePieChartWithDslFiltered(
                  workspacePath,
                  pieMapping.category,
                  effFilterDateField || undefined,
                  effStartDate || undefined,
                  effEndDate || undefined,
                )
              : await AnalysisService.generatePieChartWithDsl(
                  workspacePath,
                  pieMapping.category
                );
            code = output.mermaid;
            chartData = output.data;
            setLastOutput(output);
          } else {
            throw new Error('分類タグが設定されていません');
          }
          break;
        }
        case 'bar': {
          const barMapping = mapping.mapping as BarChartMapping;
          if (barMapping.category) {
            const useFilter = !!(effFilterDateField || effStartDate || effEndDate);
            const output = useFilter
              ? await AnalysisService.generateBarChartWithDslFiltered(
                  workspacePath,
                  barMapping.category,
                  effFilterDateField || undefined,
                  effStartDate || undefined,
                  effEndDate || undefined,
                )
              : await AnalysisService.generateBarChartWithDsl(
                  workspacePath,
                  barMapping.category
                );
            code = output.mermaid;
            chartData = output.data;
            setLastOutput(output);
          } else {
            throw new Error('分類タグが設定されていません');
          }
          break;
        }
        case 'line': {
          const lineMapping = mapping.mapping as LineChartMapping;
          const dateField = lineMapping.dateField || effFilterDateField || 'date';
          const metricId = lineMapping.metric || '__default_count__';
          
          // メトリック情報を取得
          let metricName = 'Count';
          let metric: any = null;
          if (metricId === '__default_count__') {
            metricName = 'タスク数';
            metric = {
              id: '__default_count__',
              name: 'タスク数',
              calculationType: 'count',
              isDefault: true,
            };
          } else if (analysisSettings?.metrics) {
            const foundMetric = analysisSettings.metrics.find(m => m.id === metricId);
            if (foundMetric) {
              metricName = foundMetric.name;
              metric = foundMetric;
            }
          }
          
          // TODO: 集計単位、系列分割の実装はRust側で対応が必要
          // 現時点ではdateFieldとメトリック情報を使用
          const useFilter = !!(effStartDate || effEndDate);
          const output = useFilter
            ? await AnalysisService.generateLineChartWithDslFiltered(
                workspacePath,
                dateField,
                effStartDate || undefined,
                effEndDate || undefined,
                metricName,
                metric,
              )
            : await AnalysisService.generateLineChartWithDsl(
                workspacePath,
                dateField,
                metricName,
                metric,
              );
          code = output.mermaid;
          chartData = output.data;
          setLastOutput(output);
          break;
        }
      }

      setMermaidCode(code);
      
      // Transform DSL to ECharts option (non-gantt charts only)
      if (chartData && (chartData as any).type !== 'gantt') {
        try {
          const option = transformDSLToEChartsOption(chartData);
          const validation = validateEChartsOption(option);
          if (isDev) {
            // eslint-disable-next-line no-console
            console.log('[Gantt][Option]', option);
          }
          
          if (validation.valid) {
            const sanitized = sanitizeEChartsOption(option);
            setEchartsOption(sanitized);
            
            console.log('DSL', chartData);
            console.log('EOption', option);
          } else {
            console.warn('ECharts option validation failed:', validation.error);
            setEchartsOption(null);
          }
        } catch (err) {
          console.error('Failed to transform to ECharts option:', err);
          setEchartsOption(null);
        }
      }
      
      setLoadingProgress('');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t.analysis.errorTitle;
      setError(errorMessage);
      console.error('Failed to generate chart:', err);
      setMermaidCode('');
      setEchartsOption(null);
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  };

  // チャートタイプ変更時の処理
  const handleChartTypeChange = (newType: ChartType) => {
    setChartType(newType);
    setError(null);
    if (analysisSettings) {
      const mapping = analysisSettings.chartMappings[newType];
      generateChart(mapping);
    }
  };

  // 現在のマッピングを取得
  const currentMapping = useMemo(() => {
    if (!analysisSettings) return null;
    return analysisSettings.chartMappings[chartType];
  }, [analysisSettings, chartType]);

  // タグスキーマから利用可能なタグを抽出（スキーマが無い場合はTagIndexにフォールバック）
  const availableTags = useMemo(() => {
    const stringTags: string[] = [];
    const datetimeTags: string[] = [];
    const selectTags: string[] = [];
    const multiselectTags: string[] = [];

    if (tagSchema) {
      Object.entries(tagSchema).forEach(([key, attr]) => {
        switch (attr.type) {
          case 'String':
            stringTags.push(key);
            break;
          case 'Datetime':
            datetimeTags.push(key);
            break;
          case 'Select':
            selectTags.push(key);
            break;
          case 'MultiSelect':
            multiselectTags.push(key);
            break;
        }
      });
    }

    // フォールバック: スキーマが無い/不足している場合はTagIndexから候補を補完
    const categoryKeys = tagIndex ? Object.keys(tagIndex.categories || {}) : [];

    if (selectTags.length === 0 && categoryKeys.length > 0) {
      // 円/棒グラフの分類用にカテゴリキーを候補として使用
      selectTags.push(...categoryKeys);
    }

    if (stringTags.length === 0 && categoryKeys.length > 0) {
      // 文字列タグ候補がない場合はカテゴリ名を流用
      stringTags.push(...categoryKeys);
    }

    if (datetimeTags.length === 0 && categoryKeys.length > 0) {
      // 簡易ヒューリスティックで日付らしいタグを推定
      const dateLike = categoryKeys.filter((k) => /date|due|start|end/i.test(k));
      datetimeTags.push(...dateLike);
    }

    return { string: Array.from(new Set(stringTags)), datetime: Array.from(new Set(datetimeTags)), select: Array.from(new Set(selectTags)), multiselect: Array.from(new Set(multiselectTags)) };
  }, [tagSchema, tagIndex]);

  // 設定読み込み後の初期チャート生成
  useEffect(() => {
    if (settingsLoaded && analysisSettings) {
      const mapping = analysisSettings.chartMappings[chartType];
      if (mapping.type === 'gantt') {
        const ganttMapping = mapping.mapping as GanttChartMapping;
        if (ganttMapping.startDate && ganttMapping.endDate) {
          generateChart(mapping);
        }
      } else if (mapping.type === 'line') {
        const lineMapping = mapping.mapping as LineChartMapping;
        if (lineMapping.dateField) {
          generateChart(mapping);
        }
      } else {
        // pie, bar はカテゴリがあれば生成可能
        generateChart(mapping);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, chartType]);

  return (
    <div className="analysis-dashboard">
      <div className="analysis-controls">
        <div className="analysis-controls-row">
          <div className="chart-type-selector">
            <label>{t.analysis.chartType}:</label>
            <select
              value={chartType}
              onChange={(e) => handleChartTypeChange(e.target.value as ChartType)}
              disabled={loading || !settingsLoaded}
            >
              <option value="gantt">{t.analysis.chartTypes.gantt}</option>
              <option value="pie">{t.analysis.chartTypes.pie}</option>
              <option value="bar">{t.analysis.chartTypes.bar}</option>
              <option value="line">{t.analysis.chartTypes.line}</option>
            </select>
          </div>

          <div className="mode-toggle">
            <button
              className={mode === 'echarts' ? 'active' : ''}
              onClick={() => setMode('echarts')}
              disabled={loading}
            >
              {t.analysis.modes.echarts}
            </button>
            <button
              className={mode === 'preview' ? 'active' : ''}
              onClick={() => setMode('preview')}
              disabled={loading}
            >
              {t.analysis.modes.mermaid}
            </button>
            <button
              className={mode === 'source' ? 'active' : ''}
              onClick={() => setMode('source')}
              disabled={loading}
            >
              {t.analysis.modes.source}
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="date-filter">
            <label>{t.analysis.dateFilter}:</label>
            <select
              value={filterDateField}
              onChange={(e) => setFilterDateField(e.target.value)}
              disabled={loading}
            >
              <option value="">{t.analysis.ganttSettings.unselected}</option>
              {availableTags.datetime.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <label>{t.analysis.start}:</label>
            <input className="date-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading} />
            <label>{t.analysis.end}:</label>
            <input className="date-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={loading} />
            <button
              className="icon-button"
              title={t.analysis.applyFilter}
              aria-label={t.analysis.applyFilter}
              onClick={() => {
                if (analysisSettings && currentMapping) {
                  generateChart(currentMapping, {
                    filterDateField,
                    startDate,
                    endDate,
                  });
                }
              }}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16"/>
                <path d="M6 8h12"/>
                <path d="M8 12h8"/>
                <path d="M10 16h4"/>
                <polyline points="12 20 12 16"/>
              </svg>
            </button>
            {(filterDateField || startDate || endDate) && (
              <button
                className="icon-button"
                title={t.analysis.clearFilter}
                aria-label={t.analysis.clearFilter}
                onClick={() => {
                  const next = { filterDateField: '', startDate: '', endDate: '' };
                  setFilterDateField('');
                  setStartDate('');
                  setEndDate('');
                  if (analysisSettings && currentMapping) {
                    // 明示的にフィルタ未適用で再生成
                    generateChart(currentMapping, next);
                  }
                }}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
              </button>
            )}
          </div>

          {/* removed zoom controls; rely on ECharts dataZoom */}
          {/* Export buttons */}
          <div className="export-controls" style={{ display: 'inline-flex', gap: 8, marginLeft: 'auto' }}>
            <button
              className="icon-button"
              title={t.analysis.exportJson}
              aria-label={t.analysis.exportJson}
              onClick={async () => {
                try {
                  let output = lastOutput;
                  if (!output && analysisSettings && currentMapping) {
                    await generateChart(currentMapping);
                    output = lastOutput;
                  }
                  if (!output) throw new Error(t.analysis.noOutput);
                  const ts = new Date().toISOString().replace(/[:.]/g, '-');
                  const path = `${workspacePath}/analysis-export-${chartType}-${ts}.json`;
                  await AnalysisService.exportChartJson(path, output);
                } catch (e) {
                  console.warn('Export JSON failed', e);
                }
              }}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button
              className="icon-button"
              title={t.analysis.generateReport}
              aria-label={t.analysis.generateReport}
              onClick={async () => {
                try {
                  let output = lastOutput;
                  if (!output && analysisSettings && currentMapping) {
                    await generateChart(currentMapping);
                    output = lastOutput;
                  }
                  const ts = new Date().toISOString().replace(/[:.]/g, '-');
                  const path = `${workspacePath}/analysis-report-${chartType}-${ts}.md`;
                  const mermaid = output?.mermaid || mermaidCode || '';
                  await AnalysisService.generateReport(path, [mermaid], 'Analysis Report');
                } catch (e) {
                  console.warn('Generate report failed', e);
                }
              }}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="analysis-content">
        {/* 循環依存の警告とナビゲーション */}
        {cycles.length > 0 && (
          <div className="cycle-warning">
            <strong>{t.analysis.cycleWarning}</strong>
            <ul>
              {cycles.map((cycle, i) => (
                <li key={`cycle-${i}`}>
                  {cycle.map((id, idx) => (
                    <>
                      <button
                        key={`${id}-${idx}`}
                        className="cycle-task-link"
                        onClick={() => onOpenTask?.(id)}
                        title={t.analysis.openTaskTitle.replace('{id}', id)}
                      >
                        {id}
                      </button>
                      {idx < cycle.length - 1 && <span className="cycle-sep"> → </span>}
                    </>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* エラー表示（R-3.1: ガイダンス追加） */}
        {error && (
          <div className="error-message">
            <div className="error-guidance">
              <strong>{t.analysis.errorTitle}</strong>
              <p>{t.analysis.errorHint}</p>
            </div>
            <div className="error-details">
              <code>{error}</code>
            </div>
            <button
              className="btn-retry"
              onClick={() => {
                setError(null);
                if (analysisSettings && currentMapping) {
                  generateChart(currentMapping);
                }
              }}
            >
              {t.analysis.retry}
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">
            {loadingProgress || t.analysis.loadingChart}
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="chart-container">
            {mode === 'echarts' && chartType === 'gantt' ? (
              <div className="echarts-preview-wrapper">
                <GanttChart data={ganttProject || undefined} readOnly={true} />
              </div>
            ) : mode === 'echarts' && echartsOption ? (
              <div className="echarts-preview-wrapper">
                <EChartsWrapper 
                  option={echartsOption} 
                  height="100%"
                  width="100%"
                  onTaskClick={(task) => {
                    if (chartType === 'gantt') {
                      setSelectedTask(task);
                    }
                  }}
                  showExportButtons={true}
                />
              </div>
            ) : mode === 'preview' ? (
              <div className="mermaid-preview-wrapper">
                <MermaidPreview content={mermaidCode} />
              </div>
            ) : (
              <textarea
                className="mermaid-editor"
                value={mermaidCode}
                readOnly
                placeholder={t.analysis.mermaidPlaceholder}
              />
            )}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onOpenTask={(taskId) => onOpenTask?.(taskId)}
      />
    </div>
  );
};
