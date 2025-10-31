use serde::{Deserialize, Serialize};

/// チャートDSL - 分析結果を構造化データとして表現
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Chart {
    Gantt(GanttChart),
    Pie(PieChart),
    Line(LineChart),
    Bar(BarChart),
}

/// ガントチャート用データ構造
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GanttChart {
    pub title: String,
    pub date_format: String,
    pub sections: Vec<GanttSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GanttSection {
    pub name: String,
    pub tasks: Vec<GanttTask>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GanttTask {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub status: Option<String>,
    pub depends_on: Option<String>,
}

/// 円グラフ用データ構造
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PieChart {
    pub title: String,
    pub categories: Vec<CategoryCount>,
}

/// 折線グラフ用データ構造
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineChart {
    pub title: String,
    pub y_axis_label: String,
    pub series: Vec<TimeSeriesPoint>,
}

/// 棒グラフ用データ構造
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BarChart {
    pub title: String,
    pub x_axis: Vec<String>,
    pub y_axis_label: String,
    pub values: Vec<usize>,
    pub max_value: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCount {
    pub label: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesPoint {
    pub date: String,
    pub value: f64,
}

/// Chart DSLからMermaidコードへの変換結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartOutput {
    /// Mermaid記法の可視化文字列（UI表示用）
    pub mermaid: String,
    
    /// 構造化データ（LLM・エクスポート用）
    pub data: Chart,
}

