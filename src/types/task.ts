// src/types/task.ts

export interface Task {
  id: string;
  filePath: string;
  frontMatter: FrontMatter;
  content: string;
  modifiedAt: string; // ISO 8601形式
  tagOrder?: string[]; // Front Matterのタグ順序を保持
}

export interface FrontMatter {
  [key: string]: TagValue;
}

export type TagValue =
  | string
  | number
  | boolean
  | string[]
  | HyperlinkValue
  | null;

export interface TagIndex {
  categories: Record<string, TagCategory>;
  updatedAt: string;
}

export interface TagCategory {
  name: string;
  values: Record<string, number>;
  taskIds: string[];
}

export type ThemeType = 'HienMark Dark' | 'HienMark White';

export interface WorkspaceConfig {
  strictTagMode: boolean;
  allowedCategories: string[];
  watchEnabled: boolean;
  templates: TemplateCollection;
  tagConfigs: TagConfigCollection;
  theme?: ThemeType;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
  editorFontFamily?: string;
  editorFontSize?: number;
  wordWrap?: boolean;
  scrollSync?: boolean;
  defaultTaskTemplate?: string;
  defaultSortOrder?: string;
  gitIntegration?: boolean;
}

export interface Workspace {
  rootPath: string;
  tasks: Record<string, Task>;
  tagIndex: TagIndex;
  config: WorkspaceConfig;
}

export interface TagTemplate {
  name: string;
  description?: string;
  tags: Record<string, TagValue>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCollection {
  templates: Record<string, TagTemplate>;
  defaultTemplate?: string;
}

// タグ設定関連の型定義
export type TagType = 
  | 'String'
  | 'Select'
  | 'MultiSelect'
  | 'Number'
  | 'Boolean'
  | 'Date'
  | 'Array';

export type AllowedValueType = 
  | { type: 'DirectInput' }
  | { type: 'List'; values: string[] }
  | { type: 'Pattern'; pattern: string }
  | { type: 'Range'; min: number; max: number };

export interface SortSettings {
  /** ソート順序（文字列値の場合）: 値 -> ソート順序（数値） */
  order?: Record<string, number>;
  /** 数値型の場合true */
  isNumeric?: boolean;
}

export interface FilterSettings {
  /** このタグをフィルタで使用するか */
  useInFilter: boolean;
  /** Overdue判定に使用するか */
  useForOverdue?: boolean;
  /** Status判定に使用するか */
  useForStatus?: boolean;
  /** Priority判定に使用するか */
  useForPriority?: boolean;
  /** DueDate判定に使用するか */
  useForDueDate?: boolean;
}

export interface TagConfig {
  alias?: string;
  tagType: TagType;
  allowedValueType?: AllowedValueType;
  defaultValue?: TagValue;
  required: boolean;
  description?: string;
  /** ソート設定 */
  sortSettings?: SortSettings;
  /** フィルタ設定 */
  filterSettings?: FilterSettings;
}

export interface TagConfigCollection {
  configs: Record<string, TagConfig>;
}

// カスタムフィルター/ソート設定

export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type SortOrder = 'asc' | 'desc';

export interface FilterCondition {
  tagKey: string;
  operator: ComparisonOperator;
  value: string | number | boolean | Date;
}

export interface FilterExpression {
  condition?: FilterCondition;
  expressions?: FilterExpression[];
  logicalOperator?: LogicalOperator;
}

export interface CustomFilter {
  name: string;
  description?: string;
  expression: FilterExpression;
  createdAt: string;
  updatedAt: string;
}

export interface SortKey {
  tagKey: string;
  order: SortOrder;
  customOrder?: string[]; // カスタム順序リスト
}

export interface CustomSort {
  name: string;
  description?: string;
  sortKeys: SortKey[];
  handleMissing: 'first' | 'last'; // 未定義値の扱い
  createdAt: string;
  updatedAt: string;
}

export interface CustomFiltersAndSorts {
  filters: CustomFilter[];
  sorts: CustomSort[];
}

// Tag Schema System Types (R-4.8)

export type TagAttributeType = 
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Datetime'
  | 'Select'
  | 'MultiSelect'
  | 'Currency'
  | 'Image'
  | 'Hyperlink';

export interface StringAttributeOptions {
  maxLength?: number;
  defaultValue?: string;
}

export interface NumberAttributeOptions {
  min?: number;
  max?: number;
  decimalPlaces?: number;
  defaultValue?: number;
  formatAsPercentage?: boolean;
}

export interface BooleanAttributeOptions {
  defaultValue?: boolean;
}

export interface DatetimeAttributeOptions {
  format?: 'dateOnly' | 'dateTime';
  defaultValue?: string | { type: 'static'; value: string } | { type: 'dynamic'; formula: string };
}

export interface SelectAttributeOptions {
  optionsList: string[];
  allowManualEntry?: boolean;
  defaultValue?: string;
  displayFormat?: 'dropdown' | 'radio';
}

export interface MultiSelectAttributeOptions {
  optionsList: string[];
  allowManualEntry?: boolean;
  defaultValue?: string[];
}

export interface CurrencyAttributeOptions {
  min?: number;
  max?: number;
  decimalPlaces?: number;
  defaultValue?: number;
  currencyFormat?: string; // e.g., 'JPY', 'USD'
}

export interface ImageAttributeOptions {
  // No options for now
}

export interface HyperlinkAttributeOptions {
  // No options for now
}

export type TagAttributeOptions = 
  | { type: 'String'; options: StringAttributeOptions }
  | { type: 'Number'; options: NumberAttributeOptions }
  | { type: 'Boolean'; options: BooleanAttributeOptions }
  | { type: 'Datetime'; options: DatetimeAttributeOptions }
  | { type: 'Select'; options: SelectAttributeOptions }
  | { type: 'MultiSelect'; options: MultiSelectAttributeOptions }
  | { type: 'Currency'; options: CurrencyAttributeOptions }
  | { type: 'Image'; options: ImageAttributeOptions }
  | { type: 'Hyperlink'; options: HyperlinkAttributeOptions };

export interface TagSchema {
  [tagKey: string]: TagAttributeOptions;
}

export interface HyperlinkValue {
  url: string;
  text: string;
}

// Tab UI System Types

export interface EditorState {
  frontMatter: FrontMatter;
  editorContent: string;
  isDirty: boolean;
  tagOrder?: string[];
}

// Analysis Dashboard Types (R-1)

export type ChartType = 'gantt' | 'pie' | 'bar' | 'line';

export interface GanttChartMapping {
  title?: string; // String型タグ
  startDate?: string; // Datetime型タグ
  endDate?: string; // Datetime型タグ
  dependsOn?: string; // MultiSelectまたはString型タグ
}

export interface PieChartMapping {
  category?: string; // Select型タグ
  value?: string; // メトリックID（デフォルト: '__default_count__'）
}

export interface BarChartMapping {
  category?: string; // Select型タグ
  value?: string; // メトリックID（デフォルト: '__default_count__'）
}

export interface LineChartMapping {
  metric?: string; // メトリックID（Y軸、デフォルト: '__default_count__'）
  dateField?: string; // Datetime型タグ（X軸）
  aggregationUnit?: 'day' | 'week' | 'month'; // 集計単位
  seriesBy?: string; // Select型タグ（系列分割、オプショナル）
}

export type ChartMapping = 
  | { type: 'gantt'; mapping: GanttChartMapping }
  | { type: 'pie'; mapping: PieChartMapping }
  | { type: 'bar'; mapping: BarChartMapping }
  | { type: 'line'; mapping: LineChartMapping }

// メトリック管理型定義
export type MetricCalculationType = 'count' | 'sum' | 'average';

export interface Metric {
  id: string;
  name: string;
  calculationType: MetricCalculationType;
  sourceTag?: string; // 'sum' または 'average' の場合のみ必須
  filterExpression?: FilterExpression; // フィルタ条件（オプショナル）
  isDefault?: boolean; // デフォルトメトリック（タスク数）の場合 true
}

export interface AnalysisSettings {
  chartMappings: Record<ChartType, ChartMapping>;
  metrics?: Metric[]; // メトリックリスト（オプション、後方互換性のため）
}
