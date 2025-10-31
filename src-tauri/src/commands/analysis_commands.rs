use crate::models::{Workspace, ChartOutput, Metric};
use crate::service::{
    WorkspaceService,
    AnalysisService,
};
use std::path::PathBuf;
use std::fs;
use serde::Deserialize;

/// 分析機能のためのTauriコマンド

/// ガントチャート用Mermaidコードを生成（旧API - 後方互換性のため）
#[tauri::command]
pub async fn generate_gantt_chart(workspace_path: String) -> Result<String, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_gantt_chart(&workspace)
}

/// ガントチャートDSL + Mermaid双形式を生成（R-6.6.2: 新API）
#[tauri::command]
pub async fn generate_gantt_chart_with_dsl(workspace_path: String) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_gantt_chart_with_dsl(&workspace)
}

#[derive(Deserialize)]
pub struct GanttMapping {
    #[serde(rename = "title")] pub title_field: Option<String>,
    #[serde(rename = "startDate")] pub start_field: Option<String>,
    #[serde(rename = "endDate")] pub end_field: Option<String>,
    #[serde(rename = "dependsOn")] pub depends_on_field: Option<String>,
    #[serde(rename = "section")] pub section_field: Option<String>,
}

/// ガントチャートDSL + Mermaid（マッピング対応）
#[tauri::command]
pub async fn generate_gantt_chart_with_dsl_mapped(
    workspace_path: String,
    mapping: GanttMapping,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_gantt_chart_with_dsl_mapped(
        &workspace,
        mapping.title_field.as_deref(),
        mapping.start_field.as_deref(),
        mapping.end_field.as_deref(),
        mapping.depends_on_field.as_deref(),
        mapping.section_field.as_deref(),
    )
}

/// ガントチャートDSL + Mermaid双形式（フィルタ対応）
#[tauri::command]
pub async fn generate_gantt_chart_with_dsl_filtered(
    workspace_path: String,
    filter_date_field: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_gantt_chart_with_dsl_filtered(
        &workspace,
        filter_date_field.as_deref(),
        start_date.as_deref(),
        end_date.as_deref(),
    )
}

/// ガントチャートDSL + Mermaid（マッピング + フィルタ対応）
#[tauri::command]
pub async fn generate_gantt_chart_with_dsl_mapped_filtered(
    workspace_path: String,
    mapping: GanttMapping,
    filter_date_field: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_gantt_chart_with_dsl_mapped_filtered(
        &workspace,
        mapping.title_field.as_deref(),
        mapping.start_field.as_deref(),
        mapping.end_field.as_deref(),
        mapping.depends_on_field.as_deref(),
        mapping.section_field.as_deref(),
        filter_date_field.as_deref(),
        start_date.as_deref(),
        end_date.as_deref(),
    )
}

/// 円グラフ用Mermaidコードを生成（旧API）
#[tauri::command]
pub async fn generate_pie_chart(
    workspace_path: String,
    category: String,
) -> Result<String, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_pie_chart(&workspace, &category)
}

/// 円グラフDSL + Mermaid双形式を生成（R-6.6.2: 新API）
#[tauri::command]
pub async fn generate_pie_chart_with_dsl(
    workspace_path: String,
    category: String,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_pie_chart_with_dsl(&workspace, &category)
}

/// 棒グラフ用Mermaidコードを生成（旧API）
#[tauri::command]
pub async fn generate_bar_chart(
    workspace_path: String,
    category: String,
) -> Result<String, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_bar_chart(&workspace, &category)
}

/// 棒グラフDSL + Mermaid双形式を生成（R-6.6.2: 新API）
#[tauri::command]
pub async fn generate_bar_chart_with_dsl(
    workspace_path: String,
    category: String,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_bar_chart_with_dsl(&workspace, &category)
}

/// 折線グラフ用Mermaidコードを生成（旧API）
#[tauri::command]
pub async fn generate_line_chart(
    workspace_path: String,
    date_field: String,
) -> Result<String, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_line_chart(&workspace, &date_field)
}

/// 折線グラフDSL + Mermaid双形式を生成（R-6.6.2: 新API）
#[tauri::command]
pub async fn generate_line_chart_with_dsl(
    workspace_path: String,
    date_field: String,
    y_axis_label: Option<String>,
    metric_json: Option<String>,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    let metric: Option<Metric> = if let Some(ref json) = metric_json {
        serde_json::from_str(json).map_err(|e| format!("Failed to parse metric: {}", e))?
    } else {
        None
    };
    AnalysisService::generate_line_chart_with_dsl(
        &workspace, 
        &date_field, 
        y_axis_label.as_deref(),
        metric.as_ref(),
    )
}

/// 円グラフDSL + Mermaid双形式（フィルタ対応）
#[tauri::command]
pub async fn generate_pie_chart_with_dsl_filtered(
    workspace_path: String,
    category: String,
    filter_date_field: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_pie_chart_with_dsl_filtered(
        &workspace,
        &category,
        filter_date_field.as_deref(),
        start_date.as_deref(),
        end_date.as_deref(),
    )
}

/// 棒グラフDSL + Mermaid双形式（フィルタ対応）
#[tauri::command]
pub async fn generate_bar_chart_with_dsl_filtered(
    workspace_path: String,
    category: String,
    filter_date_field: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    AnalysisService::generate_bar_chart_with_dsl_filtered(
        &workspace,
        &category,
        filter_date_field.as_deref(),
        start_date.as_deref(),
        end_date.as_deref(),
    )
}

/// 折線グラフDSL + Mermaid双形式（フィルタ対応）
#[tauri::command]
pub async fn generate_line_chart_with_dsl_filtered(
    workspace_path: String,
    date_field: String,
    start_date: Option<String>,
    end_date: Option<String>,
    y_axis_label: Option<String>,
    metric_json: Option<String>,
) -> Result<ChartOutput, String> {
    let workspace = load_workspace(&workspace_path)?;
    let metric: Option<Metric> = if let Some(ref json) = metric_json {
        serde_json::from_str(json).map_err(|e| format!("Failed to parse metric: {}", e))?
    } else {
        None
    };
    AnalysisService::generate_line_chart_with_dsl_filtered(
        &workspace,
        &date_field,
        start_date.as_deref(),
        end_date.as_deref(),
        y_axis_label.as_deref(),
        metric.as_ref(),
    )
}

/// グラフデータのJSON出力（ChartOutputをファイルへ書き出し）
#[tauri::command]
pub async fn export_chart_json(output_path: String, chart_output_json: String) -> Result<(), String> {
    fs::write(&output_path, chart_output_json)
        .map_err(|e| format!("Failed to write JSON: {}", e))
}

/// 簡易レポート生成（MermaidコードをMarkdownに埋め込む）
#[tauri::command]
pub async fn generate_analysis_report(report_path: String, title: Option<String>, mermaid_blocks: Vec<String>) -> Result<(), String> {
    let mut md = String::new();
    md.push_str(&format!("# {}\n\n", title.unwrap_or_else(|| "Analysis Report".to_string())));
    for (i, block) in mermaid_blocks.iter().enumerate() {
        md.push_str(&format!("## Chart {}\n\n", i + 1));
        md.push_str("```mermaid\n");
        md.push_str(block);
        md.push_str("\n````\n\n");
    }
    fs::write(&report_path, md).map_err(|e| format!("Failed to write report: {}", e))
}

/// 分析設定を読み込む
#[tauri::command]
pub async fn load_analysis_settings(workspace_path: String) -> Result<String, String> {
    let root_path = PathBuf::from(&workspace_path);
    crate::service::AnalysisSettingsService::load_settings(&root_path)
}

/// 分析設定を保存
#[tauri::command]
pub async fn save_analysis_settings(
    workspace_path: String,
    settings_json: String,
) -> Result<(), String> {
    let root_path = PathBuf::from(&workspace_path);
    crate::service::AnalysisSettingsService::save_settings(&root_path, &settings_json)
}

/// ヘルパー: ワークスペースを読み込む
/// 責務分離: 入力検証とサービス呼び出しのみ
fn load_workspace(workspace_path: &str) -> Result<Workspace, String> {
    let root_path = PathBuf::from(workspace_path);

    // パスが存在するか確認（入力検証）
    if !root_path.exists() {
        return Err(format!("Path does not exist: {}", workspace_path));
    }

    if !root_path.is_dir() {
        return Err(format!("Path is not a directory: {}", workspace_path));
    }

    // サービス層に委譲
    let service = WorkspaceService::new();
    service
        .load_workspace(root_path)
        .map_err(|e| format!("Failed to load workspace: {}", e))
}

