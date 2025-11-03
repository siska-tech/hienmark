/**
 * 設定画面の詳細パネル（ディテールパネル）
 */

import { useState, useEffect, useMemo } from 'react';
import type { WorkspaceConfig, ThemeType, TagTemplate, CustomSort, TagIndex, AnalysisSettings, Metric, GanttChartMapping, LineChartMapping, PieChartMapping, BarChartMapping } from '../../types/task';
import type { Translations, Language } from '../../i18n/types';
import { FilterSortService } from '../../services/filterSortService';
import { loadAnalysisSettings, saveAnalysisSettings } from '../../services/analysisSettingsService';
import { useTagSchema } from '../../hooks/useTagSchema';
import { MetricList } from './MetricList';
import { MetricEditor } from './MetricEditor';
import './Settings.css';

interface LicenseInfo {
  name: string;
  version: string;
  license: string;
  type: 'npm' | 'cargo';
  repository?: string;
}

interface LicenseData {
  generatedAt: string;
  totalPackages: number;
  npmPackages: number;
  cargoCrates: number;
  licenses: LicenseInfo[];
  formattedText: string;
}

interface AboutSectionContentProps {
  appVersion: string;
  buildTime: string;
  githubRepo: string;
  t: Translations;
}

interface AnalysisSettingsSectionProps {
  workspacePath?: string | null;
  tagIndex?: TagIndex | null;
  t: Translations;
}

function AnalysisSettingsSection({ workspacePath, tagIndex, t }: AnalysisSettingsSectionProps) {
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const { schema: tagSchema } = useTagSchema(workspacePath || null);

  // 分析設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      if (!workspacePath) {
        setLoading(false);
        return;
      }

      try {
        const settings = await loadAnalysisSettings(workspacePath);
        setAnalysisSettings(settings);
      } catch (error) {
        console.error('Failed to load analysis settings:', error);
        // デフォルト設定を使用
        setAnalysisSettings({
          chartMappings: {
            gantt: { type: 'gantt', mapping: {} as GanttChartMapping },
            pie: { type: 'pie', mapping: { value: '__default_count__' } },
            bar: { type: 'bar', mapping: { value: '__default_count__' } },
            line: { type: 'line', mapping: {} as LineChartMapping },
          },
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [workspacePath]);

  // 設定を保存
  const handleSave = async (newSettings: AnalysisSettings) => {
    if (!workspacePath || saving) return;

    setSaving(true);
    try {
      await saveAnalysisSettings(workspacePath, newSettings);
      setAnalysisSettings(newSettings);
    } catch (error) {
      console.error('Failed to save analysis settings:', error);
      alert(t.settings.saveFailed || '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 円グラフ/棒グラフのタグプリセットを更新
  const handlePieChartCategoryChange = async (category: string) => {
    if (!analysisSettings) return;
    
    const currentMapping = (analysisSettings.chartMappings.pie?.mapping || { value: '__default_count__' }) as PieChartMapping;
    const newMapping: PieChartMapping = {
      ...currentMapping,
      category: category || undefined,
    };
    
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      chartMappings: {
        ...analysisSettings.chartMappings,
        pie: {
          type: 'pie',
          mapping: newMapping,
        },
      },
    };
    await handleSave(newSettings);
  };

  const handleBarChartCategoryChange = async (category: string) => {
    if (!analysisSettings) return;
    
    const currentMapping = (analysisSettings.chartMappings.bar?.mapping || { value: '__default_count__' }) as BarChartMapping;
    const newMapping: BarChartMapping = {
      ...currentMapping,
      category: category || undefined,
    };
    
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      chartMappings: {
        ...analysisSettings.chartMappings,
        bar: {
          type: 'bar',
          mapping: newMapping,
        },
      },
    };
    await handleSave(newSettings);
  };

  // 円グラフのメトリックプリセットを更新
  const handlePieChartMetricChange = async (metricId: string) => {
    if (!analysisSettings) return;
    
    const currentMapping = (analysisSettings.chartMappings.pie?.mapping || {}) as PieChartMapping;
    const newMapping: PieChartMapping = {
      ...currentMapping,
      value: metricId || '__default_count__',
    };
    
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      chartMappings: {
        ...analysisSettings.chartMappings,
        pie: {
          type: 'pie',
          mapping: newMapping,
        },
      },
    };
    await handleSave(newSettings);
  };

  // 棒グラフのメトリックプリセットを更新
  const handleBarChartMetricChange = async (metricId: string) => {
    if (!analysisSettings) return;
    
    const currentMapping = (analysisSettings.chartMappings.bar?.mapping || {}) as BarChartMapping;
    const newMapping: BarChartMapping = {
      ...currentMapping,
      value: metricId || '__default_count__',
    };
    
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      chartMappings: {
        ...analysisSettings.chartMappings,
        bar: {
          type: 'bar',
          mapping: newMapping,
        },
      },
    };
    await handleSave(newSettings);
  };

  // ガントチャートの設定更新
  const handleGanttChartChange = async (field: keyof GanttChartMapping, value: string) => {
    if (!analysisSettings) return;
    
    const currentMapping = (analysisSettings.chartMappings.gantt?.mapping || {}) as GanttChartMapping;
    const newMapping: GanttChartMapping = {
      ...currentMapping,
      [field]: value || undefined,
    };
    
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      chartMappings: {
        ...analysisSettings.chartMappings,
        gantt: {
          type: 'gantt',
          mapping: newMapping,
        },
      },
    };
    await handleSave(newSettings);
  };

  // 折れ線グラフの設定更新
  const handleLineChartChange = async (field: keyof LineChartMapping, value: string) => {
    if (!analysisSettings) return;
    
    const currentMapping = (analysisSettings.chartMappings.line?.mapping || {}) as LineChartMapping;
    const newMapping: LineChartMapping = {
      ...currentMapping,
      [field]: field === 'aggregationUnit' ? (value as 'day' | 'week' | 'month' || undefined) : (value || undefined),
    };
    
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      chartMappings: {
        ...analysisSettings.chartMappings,
        line: {
          type: 'line',
          mapping: newMapping,
        },
      },
    };
    await handleSave(newSettings);
  };

  // デフォルトメトリック（タスク数）
  const getDefaultMetric = (): Metric => ({
    id: '__default_count__',
    name: t.settings.metricManagement.taskCount,
    calculationType: 'count',
    isDefault: true,
  });

  // メトリックリストを取得（デフォルトメトリックを含む）
  const getMetrics = (): Metric[] => {
    const defaultMetric = getDefaultMetric();
    const customMetrics = analysisSettings?.metrics?.filter(m => !m.isDefault) || [];
    return [defaultMetric, ...customMetrics];
  };

  // メトリックを保存
  const handleSaveMetric = async (metric: Metric) => {
    if (!analysisSettings || !workspacePath) return;

    const existingMetrics = analysisSettings.metrics || [];
    const isEditing = editingMetricId && editingMetricId !== '__NEW__';
    
    let newMetrics: Metric[];
    if (isEditing) {
      // 既存メトリックを更新
      newMetrics = existingMetrics.map(m => 
        m.id === editingMetricId ? metric : m
      );
    } else {
      // 新しいメトリックを追加
      newMetrics = [...existingMetrics, metric];
    }

    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      metrics: newMetrics,
    };

    await handleSave(newSettings);
    setEditingMetricId(null);
  };

  // メトリックを削除
  const handleDeleteMetric = async (metricId: string) => {
    if (!analysisSettings || !workspacePath) return;
    if (!confirm(t.settings.metricManagement.deleteConfirm)) return;

    const newMetrics = (analysisSettings.metrics || []).filter(m => m.id !== metricId);
    const newSettings: AnalysisSettings = {
      ...analysisSettings,
      metrics: newMetrics,
    };

    await handleSave(newSettings);
  };

  // メトリックを編集
  const handleEditMetric = (metricId: string) => {
    setEditingMetricId(metricId);
  };

  // 編集対象のメトリックを取得
  const getMetricById = (id: string | null): Metric | null => {
    if (!id || !analysisSettings) return null;
    return analysisSettings.metrics?.find(m => m.id === id) || null;
  };

  // 利用可能なタグカテゴリを取得
  const availableCategories = tagIndex ? Object.keys(tagIndex.categories || {}) : [];

  // 型別のタグを取得
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
      selectTags.push(...categoryKeys);
    }

    if (stringTags.length === 0 && categoryKeys.length > 0) {
      stringTags.push(...categoryKeys);
    }

    if (datetimeTags.length === 0 && categoryKeys.length > 0) {
      // 簡易ヒューリスティックで日付らしいタグを推定
      const dateLike = categoryKeys.filter((k) => /date|due|start|end/i.test(k));
      datetimeTags.push(...dateLike);
    }

    return {
      string: Array.from(new Set(stringTags)),
      datetime: Array.from(new Set(datetimeTags)),
      select: Array.from(new Set(selectTags)),
      multiselect: Array.from(new Set(multiselectTags)),
    };
  }, [tagSchema, tagIndex]);

  if (loading) {
    return (
      <section className="setting-section">
        <h3>{t.settings.analysis}</h3>
        <p>{t.tagConfig.loading}</p>
      </section>
    );
  }

  if (!analysisSettings) {
    return (
      <section className="setting-section">
        <h3>{t.settings.analysis}</h3>
        <p>{t.tagConfig.loadError}</p>
      </section>
    );
  }

  const pieMapping = (analysisSettings.chartMappings.pie?.mapping || { value: '__default_count__' }) as PieChartMapping;
  const barMapping = (analysisSettings.chartMappings.bar?.mapping || { value: '__default_count__' }) as BarChartMapping;
  const pieCategory = pieMapping.category || '';
  const barCategory = barMapping.category || '';
  const pieMetric = pieMapping.value || '__default_count__';
  const barMetric = barMapping.value || '__default_count__';
  const ganttMapping = (analysisSettings.chartMappings.gantt?.mapping || {}) as GanttChartMapping;
  const lineMapping = (analysisSettings.chartMappings.line?.mapping || {}) as LineChartMapping;
  const configuredMetrics = getMetrics();

  return (
    <>
      {/* メトリック管理セクション */}
      <section className="setting-section">
        <h3>{t.settings.metricManagement.title}</h3>
        <p className="section-description">
          {t.settings.metricManagement.description}
        </p>
        
        {/* 既存メトリックのリスト */}
        <MetricList
          metrics={configuredMetrics}
          onEdit={handleEditMetric}
          onDelete={handleDeleteMetric}
          onCreateNew={() => setEditingMetricId('__NEW__')}
          t={{
            metricManagement: {
              defaultMetric: t.settings.metricManagement.defaultMetric,
              taskCount: t.settings.metricManagement.taskCount,
              metricType: t.settings.metricManagement.metricType,
              countType: t.settings.metricManagement.countType,
              sumType: t.settings.metricManagement.sumType,
              averageType: t.settings.metricManagement.averageType,
              edit: t.settings.metricManagement.edit,
              delete: t.settings.metricManagement.delete,
              addNew: t.settings.metricManagement.addNew,
              tag: t.settings.metricManagement.tag,
            },
          }}
        />

        {/* 新規メトリック追加・編集フォーム */}
        {(editingMetricId === '__NEW__' || editingMetricId) && (
          <MetricEditor
            key={editingMetricId || 'new'}
            metric={editingMetricId === '__NEW__' ? null : getMetricById(editingMetricId)}
            tagSchema={tagSchema}
            onSave={handleSaveMetric}
            onCancel={() => setEditingMetricId(null)}
            t={{
              metricManagement: {
                newMetricTitle: t.settings.metricManagement.newMetricTitle,
                editMetricTitle: t.settings.metricManagement.editMetricTitle,
                metricName: t.settings.metricManagement.metricName,
                metricNamePlaceholder: t.settings.metricManagement.metricNamePlaceholder,
                calculationType: t.settings.metricManagement.calculationType,
                calculationTypeCount: t.settings.metricManagement.calculationTypeCount,
                calculationTypeSum: t.settings.metricManagement.calculationTypeSum,
                calculationTypeAverage: t.settings.metricManagement.calculationTypeAverage,
                sourceTag: t.settings.metricManagement.sourceTag,
                sourceTagPlaceholder: t.settings.metricManagement.sourceTagPlaceholder,
                save: t.settings.metricManagement.save,
                cancel: t.settings.metricManagement.cancel,
                required: t.settings.metricManagement.required,
                noNumericTags: t.settings.metricManagement.noNumericTags,
                applyFilter: t.settings.metricManagement.applyFilter,
                filterConditionsAllRequired: t.settings.metricManagement.filterConditionsAllRequired,
                selectTag: t.settings.metricManagement.selectTag,
                value: t.settings.metricManagement.value,
                removeCondition: t.settings.metricManagement.removeCondition,
                addCondition: t.settings.metricManagement.addCondition,
              },
            }}
          />
        )}
      </section>

      {/* 区切り線 */}
      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--ts-border)' }} />

      {/* 既存のセクション */}
      <section className="setting-section">
        <h3>{t.settings.analysis}</h3>
        <p className="section-description">
          {t.settings.analysisDescription || '作図用のタグ選択をプリセットとして設定できます。毎回選択する必要がなくなります。'}
        </p>
      </section>

      <section className="setting-section">
        <h4>{t.settings.pieChartPreset || '円グラフのタグプリセット'}</h4>
        <p className="section-description">
          {t.settings.pieChartPresetDescription || '円グラフで使用するデフォルトのタグカテゴリとメトリックを選択します。'}
        </p>
        <div className="setting-item">
          <label htmlFor="pieChartCategory">{t.settings.tagCategory || 'タグカテゴリ'}:</label>
          <select
            id="pieChartCategory"
            value={pieCategory}
            onChange={(e) => handlePieChartCategoryChange(e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="pieChartMetric">{t.settings.metricManagement.metricLabel}</label>
          <select
            id="pieChartMetric"
            value={pieMetric}
            onChange={(e) => handlePieChartMetricChange(e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            {configuredMetrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="setting-section">
        <h4>{t.settings.barChartPreset || '棒グラフのタグプリセット'}</h4>
        <p className="section-description">
          {t.settings.barChartPresetDescription || '棒グラフで使用するデフォルトのタグカテゴリとメトリックを選択します。'}
        </p>
        <div className="setting-item">
          <label htmlFor="barChartCategory">{t.settings.tagCategory || 'タグカテゴリ'}:</label>
          <select
            id="barChartCategory"
            value={barCategory}
            onChange={(e) => handleBarChartCategoryChange(e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="barChartMetric">{t.settings.metricManagement.metricLabel}</label>
          <select
            id="barChartMetric"
            value={barMetric}
            onChange={(e) => handleBarChartMetricChange(e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            {configuredMetrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="setting-section">
        <h4>{t.settings.metricManagement.ganttChartSettings}</h4>
        <p className="section-description">
          {t.settings.metricManagement.ganttChartDescription}
        </p>
        <div className="setting-item">
          <label htmlFor="ganttTitle">{t.settings.metricManagement.taskName}:</label>
          <select
            id="ganttTitle"
            value={ganttMapping.title || ''}
            onChange={(e) => handleGanttChartChange('title', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {availableTags.string.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="ganttStartDate">{t.settings.metricManagement.startDate}:</label>
          <select
            id="ganttStartDate"
            value={ganttMapping.startDate || ''}
            onChange={(e) => handleGanttChartChange('startDate', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {availableTags.datetime.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="ganttEndDate">{t.settings.metricManagement.endDate}:</label>
          <select
            id="ganttEndDate"
            value={ganttMapping.endDate || ''}
            onChange={(e) => handleGanttChartChange('endDate', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {availableTags.datetime.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="ganttDependsOn">{t.settings.metricManagement.dependency}:</label>
          <select
            id="ganttDependsOn"
            value={ganttMapping.dependsOn || ''}
            onChange={(e) => handleGanttChartChange('dependsOn', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {[...availableTags.multiselect, ...availableTags.string].map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="setting-section">
        <h4>{t.settings.metricManagement.lineChartSettings}</h4>
        <p className="section-description">
          {t.settings.metricManagement.lineChartDescription}
        </p>
        <div className="setting-item">
          <label htmlFor="lineMetric">{t.settings.metricManagement.metricYAxis}:</label>
          <select
            id="lineMetric"
            value={lineMapping.metric || '__default_count__'}
            onChange={(e) => handleLineChartChange('metric', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            {configuredMetrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="lineDateField">{t.settings.metricManagement.dateFieldXAxis}:</label>
          <select
            id="lineDateField"
            value={lineMapping.dateField || ''}
            onChange={(e) => handleLineChartChange('dateField', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.unselected || '未選択'}</option>
            {availableTags.datetime.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="lineAggregationUnit">{t.settings.metricManagement.aggregationUnit}:</label>
          <select
            id="lineAggregationUnit"
            value={lineMapping.aggregationUnit || 'day'}
            onChange={(e) => handleLineChartChange('aggregationUnit', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="day">{t.settings.metricManagement.aggregationUnitDay}</option>
            <option value="week">{t.settings.metricManagement.aggregationUnitWeek}</option>
            <option value="month">{t.settings.metricManagement.aggregationUnitMonth}</option>
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="lineSeriesBy">{t.settings.metricManagement.seriesBy}:</label>
          <select
            id="lineSeriesBy"
            value={lineMapping.seriesBy || ''}
            onChange={(e) => handleLineChartChange('seriesBy', e.target.value)}
            disabled={saving}
            className="font-family-select"
          >
            <option value="">{t.settings.metricManagement.noSeriesSplit}</option>
            {[...availableTags.select, ...availableTags.string].map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </section>
    </>
  );
}

function AboutSectionContent({ appVersion, buildTime, githubRepo, t }: AboutSectionContentProps) {
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);

  // Load license data
  useEffect(() => {
    const loadLicenses = async () => {
      try {
        const response = await fetch('/third-party-licenses.json');
        
        // Check if response is actually JSON (not HTML error page)
        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType?.includes('application/json')) {
          // File not found or invalid response - use fallback
          setLicenseData(null);
          setLicenseLoading(false);
          return;
        }

        const text = await response.text();
        
        // Check if response is HTML (error page)
        if (text.trim().startsWith('<!')) {
          setLicenseData(null);
          setLicenseLoading(false);
          return;
        }

        try {
          const data = JSON.parse(text);
          setLicenseData(data);
        } catch (parseError) {
          console.warn('Failed to parse license JSON:', parseError);
          setLicenseData(null);
        }
      } catch (error) {
        // Network error or other issues - silently use fallback
        console.warn('Failed to load license data:', error);
        setLicenseData(null);
      } finally {
        setLicenseLoading(false);
      }
    };

    loadLicenses();
  }, []);

  return (
    <section className="setting-section">
      <h3>{t.settings.about}</h3>
      <div className="about-content">
        {/* Application Information */}
        <div className="about-block">
          <h4>{t.settings.appInfo}</h4>
          <dl className="about-info-list">
            <dt>{t.settings.appName}:</dt>
            <dd>HienMark</dd>
            <dt>{t.settings.version}:</dt>
            <dd>v{appVersion}</dd>
            {buildTime && (
              <>
                <dt>{t.settings.buildTime}:</dt>
                <dd>{buildTime} (UTC)</dd>
              </>
            )}
            <dt>{t.settings.developer}:</dt>
            <dd>Shion Watanabe</dd>
          </dl>
        </div>

        {/* App Concept */}
        <div className="about-block">
          <h4>{t.settings.appConcept}</h4>
          <p className="section-description">{t.settings.aboutDescription}</p>
        </div>

        {/* Technology Stack */}
        <div className="about-block">
          <h4>{t.settings.techStack}</h4>
          <p className="section-description">{t.settings.techStackDescription}</p>
          <ul className="about-list">
            <li>
              <strong>{t.settings.framework}:</strong> Tauri (Rust + Webview)
            </li>
            <li>
              <strong>{t.settings.frontend}:</strong> React, TypeScript
            </li>
            <li>
              <strong>{t.settings.charts}:</strong> Apache ECharts
            </li>
            <li>
              <strong>{t.settings.markdownParser}:</strong> markdown-it
            </li>
          </ul>
        </div>

        {/* Contribution and Feedback */}
        <div className="about-block">
          <h4>{t.settings.contribution}</h4>
          <p className="section-description">{t.settings.contributionDescription}</p>
          <ul className="about-list">
            <li>
              <strong>{t.settings.githubRepo}:</strong>{' '}
              <a href={githubRepo} target="_blank" rel="noopener noreferrer" className="about-link">
                {githubRepo}
              </a>
            </li>
            <li>
              <strong>{t.settings.reportIssue}:</strong>{' '}
              <a href={`${githubRepo}/issues`} target="_blank" rel="noopener noreferrer" className="about-link">
                {githubRepo}/issues
              </a>
            </li>
          </ul>
        </div>

        {/* Copyright */}
        <div className="about-block">
          <h4>{t.settings.copyrightTitle}</h4>
          <p>© 2025 HienMark — Shion Watanabe</p>
          <p className="section-description">{t.settings.mitLicense}</p>
        </div>

        {/* Third-Party Licenses - Comprehensive List */}
        <div className="about-block">
          <h4>{t.settings.licensesTitle}</h4>
          <p className="section-description">
            {t.settings.licensesNote}
            {licenseData && ` (${licenseData.totalPackages} packages total)`}
          </p>
          
          {licenseLoading && (
            <p className="section-description">{t.settings.licensesLoading}</p>
          )}
          
          {/* Show comprehensive license list if available */}
          {licenseData && !licenseLoading && (
            <div className="license-scroll-box">
              <pre className="license-text">{licenseData.formattedText}</pre>
            </div>
          )}
          
          {/* Fallback to manual list if license file not available */}
          {!licenseData && !licenseLoading && (
            <div className="license-error">
              <ul className="about-list">
                <li>
                  <strong>Apache ECharts</strong> — {t.settings.apacheLicense}
                </li>
                <li>
                  <strong>echarts-for-react</strong> — {t.settings.mitLicense}
                </li>
                <li>
                  <strong>React</strong> — {t.settings.mitLicense}
                </li>
                <li>
                  <strong>Tauri</strong> — {t.settings.apacheLicense} / {t.settings.mitLicense}
                </li>
                <li>
                  <strong>Mermaid</strong> — {t.settings.mitLicense}
                </li>
                <li>
                  <strong>markdown-it</strong> — {t.settings.mitLicense}
                </li>
                <li>
                  <strong>CodeMirror</strong> — {t.settings.mitLicense}
                </li>
                <li>
                  <strong>Inter</strong> — {t.settings.silOflLicense}
                </li>
              </ul>
              <p className="section-description" style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontStyle: 'italic' }}>
                Note: Full license list will be available after building the application.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface SettingsDetailPanelProps {
  activeSection: 'general' | 'tags' | 'editor' | 'filters' | 'workflow' | 'advanced' | 'analysis' | 'about';
  config: WorkspaceConfig;
  language: Language;
  currentTheme?: ThemeType;
  newCategory: string;
  autoSaveInterval: string;
  editorFontFamily: string;
  editorFontSize: string;
  wordWrap: boolean;
  scrollSync: boolean;
  defaultTaskTemplate: string;
  defaultSortOrder: string;
  gitIntegration: boolean;
  templates: TagTemplate[];
  workspacePath?: string | null;
  tagIndex?: TagIndex | null;
  // イベントハンドラ
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: ThemeType) => void;
  onToggleMode: () => void;
  onAddCategory: () => void;
  onRemoveCategory: (category: string) => void;
  onNewCategoryChange: (value: string) => void;
  onToggleAutoSave: () => void;
  onAutoSaveIntervalChange: (value: string) => void;
  onAutoSaveIntervalBlur: () => void;
  onEditorFontFamilyChange: (fontFamily: string) => void;
  onEditorFontSizeChange: (value: string) => void;
  onEditorFontSizeBlur: () => void;
  onWordWrapChange: () => void;
  onScrollSyncChange: () => void;
  onDefaultTaskTemplateChange: (templateName: string) => void;
  onDefaultSortOrderChange: (sortOrder: string) => void;
  onGitIntegrationChange: () => void;
  onShowCustomFilterSort: () => void;
  t: Translations;
}

export function SettingsDetailPanel({
  activeSection,
  config,
  language,
  currentTheme,
  newCategory,
  autoSaveInterval,
  editorFontFamily,
  editorFontSize,
  wordWrap,
  scrollSync,
  defaultTaskTemplate,
  defaultSortOrder,
  gitIntegration,
  templates,
  workspacePath,
  tagIndex,
  onLanguageChange,
  onThemeChange,
  onToggleMode,
  onAddCategory,
  onRemoveCategory,
  onNewCategoryChange,
  onToggleAutoSave,
  onAutoSaveIntervalChange,
  onAutoSaveIntervalBlur,
  onEditorFontFamilyChange,
  onEditorFontSizeChange,
  onEditorFontSizeBlur,
  onWordWrapChange,
  onScrollSyncChange,
  onDefaultTaskTemplateChange,
  onDefaultSortOrderChange,
  onGitIntegrationChange,
  onShowCustomFilterSort,
  t,
}: SettingsDetailPanelProps) {
  const [customSorts, setCustomSorts] = useState<CustomSort[]>([]);

  // カスタムソートを読み込む
  useEffect(() => {
    const loadCustomSorts = async () => {
      if (!workspacePath) return;
      try {
        const data = await FilterSortService.getFiltersAndSorts(workspacePath);
        setCustomSorts(data.sorts);
      } catch (error) {
        console.error('Failed to load custom sorts:', error);
      }
    };
    loadCustomSorts();
  }, [workspacePath]);

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <>
            <section className="setting-section">
              <h3>{t.settings.language}</h3>
              <div className="language-selector">
                <button
                  className={`language-button ${language === 'ja' ? 'active' : ''}`}
                  onClick={() => onLanguageChange('ja')}
                >
                  {t.languages.ja}
                </button>
                <button
                  className={`language-button ${language === 'en' ? 'active' : ''}`}
                  onClick={() => onLanguageChange('en')}
                >
                  {t.languages.en}
                </button>
                <button
                  className={`language-button ${language === 'vi' ? 'active' : ''}`}
                  onClick={() => onLanguageChange('vi')}
                >
                  {t.languages.vi}
                </button>
              </div>
              <p className="section-description">{t.settings.languageDescription}</p>
            </section>

            <section className="setting-section">
              <h3>{t.tagConfig.colorTheme}</h3>
              <div className="theme-selector">
                <button
                  className={`theme-button ${(currentTheme || config.theme) === 'HienMark Dark' ? 'active' : ''}`}
                  onClick={() => onThemeChange('HienMark Dark')}
                >
                  <div className="theme-preview theme-preview-dark"></div>
                  <span>HienMark Dark</span>
                </button>
                <button
                  className={`theme-button ${(currentTheme || config.theme) === 'HienMark White' ? 'active' : ''}`}
                  onClick={() => onThemeChange('HienMark White')}
                >
                  <div className="theme-preview theme-preview-white"></div>
                  <span>HienMark White</span>
                </button>
              </div>
              <p className="section-description">
                {t.tagConfig.themeDescription}
              </p>
            </section>
          </>
        );

      case 'tags':
        return (
          <>
            <section className="setting-section">
              <h3>{t.tagConfig.tagInputMode}</h3>
              <div className="mode-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.strictTagMode}
                    onChange={onToggleMode}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <div className="mode-info">
                  <strong>{config.strictTagMode ? t.tagConfig.fixedMode : t.tagConfig.freeMode}</strong>
                  <p className="mode-description">
                    {config.strictTagMode
                      ? t.tagConfig.fixedModeDescription
                      : t.tagConfig.freeModeDescription}
                  </p>
                </div>
              </div>
            </section>

            {config.strictTagMode && (
              <section className="setting-section">
                <h3>{t.tagConfig.allowedCategories}</h3>
                <p className="section-description">
                  {t.tagConfig.allowedCategoriesDescription}
                </p>

                <div className="category-list">
                  {config.allowedCategories.map((category) => (
                    <div key={category} className="category-item-simple">
                      <span className="category-name-simple">{category}</span>
                      <button
                        className="btn-remove-small"
                        onClick={() => onRemoveCategory(category)}
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="add-category">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => onNewCategoryChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onAddCategory();
                    }}
                    placeholder={t.tagConfig.newCategoryPlaceholder}
                  />
                  <button className="btn-add" onClick={onAddCategory}>
                    {t.common.add}
                  </button>
                </div>
              </section>
            )}
          </>
        );

      case 'editor':
        return (
          <>
            <section className="setting-section">
              <h3>{t.settings.fontSettings}</h3>
              <div className="font-settings">
                <label htmlFor="editorFontFamily">{t.settings.fontFamilyLabel}</label>
                <select
                  id="editorFontFamily"
                  value={editorFontFamily}
                  onChange={(e) => onEditorFontFamilyChange(e.target.value)}
                  className="font-family-select"
                >
                  <option value="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">{t.settings.systemFont}</option>
                  <option value="'Consolas', 'Courier New', monospace">Consolas</option>
                  <option value="'Monaco', 'Courier New', monospace">Monaco</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Arial', sans-serif">Arial</option>
                  <option value="'Helvetica', sans-serif">Helvetica</option>
                  <option value="'Georgia', serif">Georgia</option>
                </select>
                <p className="section-description">{t.settings.fontFamilyDescription}</p>
              </div>
              
              <div className="font-settings">
                <label htmlFor="editorFontSize">{t.settings.fontSizeLabel}</label>
                <div className="font-size-input">
                  <input
                    id="editorFontSize"
                    type="number"
                    min="8"
                    max="72"
                    value={editorFontSize}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || !isNaN(Number(value))) {
                        onEditorFontSizeChange(value);
                      }
                    }}
                    onBlur={onEditorFontSizeBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onEditorFontSizeBlur();
                    }}
                  />
                  <span className="unit">px</span>
                </div>
                <p className="section-description">{t.settings.fontSizeDescription}</p>
              </div>
            </section>

            <section className="setting-section">
              <h3>{t.settings.wordWrap}</h3>
              <div className="mode-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={wordWrap}
                    onChange={onWordWrapChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <div className="mode-info">
                  <strong>{wordWrap ? t.settings.on : t.settings.off}</strong>
                  <p className="mode-description">
                    {wordWrap ? t.settings.wordWrapOnDescription : t.settings.wordWrapOffDescription}
                  </p>
                </div>
              </div>
            </section>

            <section className="setting-section">
              <h3>{t.settings.scrollSync}</h3>
              <div className="mode-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={scrollSync}
                    onChange={onScrollSyncChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <div className="mode-info">
                  <strong>{scrollSync ? t.settings.on : t.settings.off}</strong>
                  <p className="mode-description">
                    {scrollSync ? t.settings.scrollSyncOnDescription : t.settings.scrollSyncOffDescription}
                  </p>
                </div>
              </div>
            </section>

            <section className="setting-section">
              <h3>{t.settings.autoSave}</h3>
              <div className="mode-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.autoSaveEnabled}
                    onChange={onToggleAutoSave}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <div className="mode-info">
                  <strong>{t.settings.autoSaveEnabled}</strong>
                  <p className="mode-description">
                    {t.settings.autoSaveDescription}
                  </p>
                </div>
              </div>
              
              {config.autoSaveEnabled && (
                <div className="auto-save-interval">
                  <label htmlFor="autoSaveInterval">{t.settings.autoSaveInterval}</label>
                  <div className="auto-save-interval-input">
                    <input
                      id="autoSaveInterval"
                      type="number"
                      min="3"
                      value={autoSaveInterval}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || !isNaN(Number(value))) {
                          onAutoSaveIntervalChange(value);
                        }
                      }}
                      onBlur={onAutoSaveIntervalBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onAutoSaveIntervalBlur();
                      }}
                    />
                    <span className="unit">{t.settings.seconds}</span>
                  </div>
                </div>
              )}
            </section>
          </>
        );

      case 'workflow':
        return (
          <>
            <section className="setting-section">
              <h3>{t.settings.defaultTemplateTitle}</h3>
              <div className="template-selector">
                <label htmlFor="defaultTaskTemplate">{t.settings.templateLabel}</label>
                <select
                  id="defaultTaskTemplate"
                  value={defaultTaskTemplate}
                  onChange={(e) => onDefaultTaskTemplateChange(e.target.value)}
                  className="font-family-select"
                >
                  <option value="">{t.common.none || 'None'}</option>
                  {templates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="section-description">{t.settings.defaultTemplateDescription}</p>
              </div>
            </section>

            <section className="setting-section">
              <h3>{t.settings.defaultSortTitle}</h3>
              <div className="sort-selector">
                <label htmlFor="defaultSortOrder">{t.settings.sortOrderLabel}</label>
                <select
                  id="defaultSortOrder"
                  value={defaultSortOrder}
                  onChange={(e) => onDefaultSortOrderChange(e.target.value)}
                  className="font-family-select"
                >
                  <option value="modified-desc">{t.taskBrowser.modifiedNew}</option>
                  <option value="modified-asc">{t.taskBrowser.modifiedOld}</option>
                  <option value="name-asc">{t.taskBrowser.nameAsc}</option>
                  <option value="name-desc">{t.taskBrowser.nameDesc}</option>
                  {customSorts.map((sort) => (
                    <option key={sort.name} value={`custom:${sort.name}`}>
                      {t.settings.customPrefix}{sort.name}
                    </option>
                  ))}
                </select>
                <p className="section-description">{t.settings.defaultSortDescription}</p>
              </div>
            </section>
          </>
        );

      case 'advanced':
        return (
          <section className="setting-section">
            <h3>{t.settings.gitIntegration}</h3>
            <div className="mode-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={gitIntegration}
                  onChange={onGitIntegrationChange}
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="mode-info">
                <strong>{gitIntegration ? t.settings.on : t.settings.off}</strong>
                <p className="mode-description">
                  {gitIntegration ? '' : ''}
                </p>
              </div>
            </div>
            <p className="section-description" style={{ marginTop: '1rem' }}>
              {t.settings.gitExperimentalWarning}
            </p>
          </section>
        );

      case 'filters':
        return (
          <section className="setting-section">
            <h3>{t.tagConfig.customFilterSort}</h3>
            <p className="section-description">
              {t.tagConfig.customFilterSortDescription}
            </p>
            <button className="btn-manage-filters" onClick={onShowCustomFilterSort}>
              {t.tagConfig.manageFilters}
            </button>
          </section>
        );

      case 'analysis':
        return (
          <AnalysisSettingsSection
            workspacePath={workspacePath}
            tagIndex={tagIndex}
            t={t}
          />
        );

      case 'about':
        // Get version from package.json (import.meta.env.VITE_APP_VERSION will be set during build)
        const appVersion = import.meta.env.VITE_APP_VERSION || '0.2.0';
        const buildTime = import.meta.env.VITE_BUILD_TIME || '';
        const githubRepo = 'https://github.com/siska-tech/hienmark';
        
        return (
          <AboutSectionContent
            appVersion={appVersion}
            buildTime={buildTime}
            githubRepo={githubRepo}
            t={t}
          />
        );

      default:
        return null;
    }
  };

  return <div className="settings-detail-panel">{renderSection()}</div>;
}
