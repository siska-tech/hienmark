use crate::models::{
    Task, Workspace, Metric,
};
use crate::models::chart::{
    Chart, ChartOutput, GanttChart, GanttSection, GanttTask,
    PieChart, LineChart, BarChart,
    CategoryCount, TimeSeriesPoint,
};
use chrono::{NaiveDate, Utc};
use std::collections::{HashMap, HashSet};

/// 分析サービス
pub struct AnalysisService;

impl AnalysisService {
    /// ガントチャート用Mermaidコードを生成
    pub fn generate_gantt_chart(workspace: &Workspace) -> Result<String, String> {
        let mut gantt_lines = vec![
            "gantt".to_string(),
            "    dateFormat  YYYY-MM-DD".to_string(),
            "    title       Task Schedule".to_string(),
            "".to_string(),
        ];

        // 日付情報を持つタスクを抽出（有効な日付形式のみ）
        let mut scheduled_tasks: Vec<&Task> = workspace.tasks.values()
            .filter(|task| {
                Self::has_valid_date_fields(task)
            })
            .collect();

        if scheduled_tasks.is_empty() {
            return Ok("gantt\ndateFormat  YYYY-MM-DD\ntitle   Task Schedule\n\n日付情報を持つタスクが見つかりませんでした。タスクに開始日（start_date）と終了日（end_date）を追加してください。".to_string());
        }

        // 循環依存を検出
        let cyclic_deps = Self::detect_cyclic_dependencies(workspace);
        if !cyclic_deps.is_empty() {
            let dep_list = cyclic_deps.join(", ");
            return Err(format!("循環依存が検出されました。以下のタスク間で依存関係を見直してください: {}", dep_list));
        }

        // 開始日でソート
        scheduled_tasks.sort_by(|a, b| {
            let a_start = Self::extract_validated_date_string(a, "start_date");
            let b_start = Self::extract_validated_date_string(b, "start_date");
            a_start.cmp(&b_start)
        });

        // セクション分け (statusタグがあればそれで分類)
        let mut sections: HashMap<String, Vec<&Task>> = HashMap::new();
        for task in scheduled_tasks {
            let section = Self::extract_tag_value_string(task, "status")
                .unwrap_or_else(|| "未分類".to_string());

            sections.entry(section).or_insert_with(Vec::new).push(task);
        }

        // Mermaidコード生成
        for (section_name, tasks) in sections {
            gantt_lines.push(format!("    section {}", section_name));

            for task in tasks {
                let task_name = task.id.replace("-", " ").replace("_", " ");
                let start = Self::extract_validated_date_string(task, "start_date")
                    .unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let end = Self::extract_validated_date_string(task, "end_date")
                    .unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());

                // 依存関係の処理
                let depends = Self::extract_tag_value_array(task, "depends_on");

                let task_line = if let Some(deps) = depends {
                    if !deps.is_empty() {
                        let dep_id = deps[0].replace("-", "_").replace(" ", "_");
                        format!("    {} :after {}, {}~{}", task_name, dep_id, start, end)
                    } else {
                        format!("    {} :{}, {}", task_name, start, end)
                    }
                } else {
                    format!("    {} :{}, {}", task_name, start, end)
                };

                gantt_lines.push(task_line);
            }
        }

        Ok(gantt_lines.join("\n"))
    }

    /// 円グラフ用Mermaidコードを生成
    pub fn generate_pie_chart(workspace: &Workspace, category: &str) -> Result<String, String> {
        let category_data = workspace.tag_index.categories
            .get(category)
            .ok_or_else(|| format!("カテゴリ '{}' が見つかりませんでした。タグ管理でカテゴリを確認してください。", category))?;

        let mut pie_lines = vec![
            "pie".to_string(),
            format!("    title {} Distribution", category),
        ];

        for (value, count) in &category_data.values {
            pie_lines.push(format!("    \"{}\" : {}", value, count));
        }

        Ok(pie_lines.join("\n"))
    }

    /// 棒グラフ用Mermaidコードを生成
    pub fn generate_bar_chart(workspace: &Workspace, category: &str) -> Result<String, String> {
        let category_data = workspace.tag_index.categories
            .get(category)
            .ok_or_else(|| format!("カテゴリ '{}' が見つかりませんでした。タグ管理でカテゴリを確認してください。", category))?;

        if category_data.values.is_empty() {
            return Err(format!("カテゴリ '{}' に値が見つかりませんでした。このカテゴリを持つタスクがありません。", category));
        }

        let max_count = *category_data.values.values().max().unwrap_or(&0);

        let mut chart_lines = vec![
            "xychart-beta".to_string(),
            format!("    title \"{}\"", category),
            "    x-axis [".to_string(),
        ];

        // X軸ラベル
        let labels: Vec<String> = category_data.values.keys()
            .map(|k| format!("\"{}\"", k))
            .collect();
        chart_lines.push(format!("        {}", labels.join(", ")));
        chart_lines.push("    ]".to_string());

        // Y軸データ
        let values: Vec<String> = category_data.values.values()
            .map(|v| v.to_string())
            .collect();
        chart_lines.push(format!("    y-axis \"Count\" 0 --> {}", max_count + 5));
        chart_lines.push(format!("    bar [{}]", values.join(", ")));

        Ok(chart_lines.join("\n"))
    }

    /// 折線グラフ用Mermaidコードを生成（時系列分析）
    pub fn generate_line_chart(workspace: &Workspace, date_field: &str) -> Result<String, String> {
        let mut date_counts: HashMap<NaiveDate, usize> = HashMap::new();

        for task in workspace.tasks.values() {
            if let Some(date_str) = Self::extract_date_string(task, date_field) {
                if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                    *date_counts.entry(date).or_insert(0) += 1;
                }
            }
        }

        if date_counts.is_empty() {
            return Err(format!("日付フィールド '{}' を持つタスクが見つかりませんでした。タスクに日付タグを追加してください。", date_field));
        }

        // 日付順にソート
        let mut sorted_dates: Vec<_> = date_counts.into_iter().collect();
        sorted_dates.sort_by_key(|(date, _)| *date);

        let mut chart_lines = vec![
            "xychart-beta".to_string(),
            format!("    title \"Tasks by {}\"", date_field),
            "    x-axis [".to_string(),
        ];

        // X軸（日付）
        let date_labels: Vec<String> = sorted_dates.iter()
            .map(|(date, _)| format!("\"{}\"", date.format("%m/%d")))
            .collect();
        chart_lines.push(format!("        {}", date_labels.join(", ")));
        chart_lines.push("    ]".to_string());

        // Y軸データ
        let counts: Vec<String> = sorted_dates.iter()
            .map(|(_, count)| count.to_string())
            .collect();
        let max_count = sorted_dates.iter().map(|(_, c)| c).max().unwrap_or(&0);
        chart_lines.push(format!("    y-axis \"Count\" 0 --> {}", max_count + 5));
        chart_lines.push(format!("    line [{}]", counts.join(", ")));

        Ok(chart_lines.join("\n"))
    }

    // ヘルパー関数
    
    /// 日付文字列を抽出（検証付き）
    fn extract_validated_date_string(task: &Task, field: &str) -> Option<String> {
        task.front_matter.tags.get(field).and_then(|v| match v {
            crate::models::TagValue::String(s) => {
                // 日付形式を検証（YYYY-MM-DD）
                if NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok() {
                    Some(s.clone())
                } else {
                    None
                }
            }
            _ => None,
        })
    }
    
    /// 日付文字列を抽出（非検証版、折線グラフ用）
    fn extract_date_string(task: &Task, field: &str) -> Option<String> {
        task.front_matter.tags.get(field).and_then(|v| match v {
            crate::models::TagValue::String(s) => {
                // パース可能な日付のみ返す
                if NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok() {
                    Some(s.clone())
                } else {
                    None
                }
            }
            _ => None,
        })
    }

    fn extract_tag_value_string(task: &Task, field: &str) -> Option<String> {
        task.front_matter.tags.get(field).and_then(|v| match v {
            crate::models::TagValue::String(s) => Some(s.clone()),
            _ => None,
        })
    }

    fn extract_tag_value_array(task: &Task, field: &str) -> Option<Vec<String>> {
        task.front_matter.tags.get(field).and_then(|v| match v {
            crate::models::TagValue::Array(arr) => Some(arr.clone()),
            _ => None,
        })
    }

    /// 有効な日付フィールドを持つかチェック
    fn has_valid_date_fields(task: &Task) -> bool {
        Self::extract_validated_date_string(task, "start_date").is_some() &&
        Self::extract_validated_date_string(task, "end_date").is_some()
    }
    
    /// 循環依存を検出
    fn detect_cyclic_dependencies(workspace: &Workspace) -> Vec<String> {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();
        let mut cycles = Vec::new();
        
        for task_id in workspace.tasks.keys() {
            if !visited.contains(task_id) {
                let mut cycle_path = Vec::new();
                if Self::has_cycle(workspace, task_id, &mut visited, &mut rec_stack, &mut cycle_path) {
                    cycles.extend_from_slice(&cycle_path);
                }
            }
        }
        
        cycles
    }
    
    /// 循環依存の再帰的チェック
    fn has_cycle(
        workspace: &Workspace,
        task_id: &str,
        visited: &mut HashSet<String>,
        rec_stack: &mut HashSet<String>,
        cycle_path: &mut Vec<String>
    ) -> bool {
        visited.insert(task_id.to_string());
        rec_stack.insert(task_id.to_string());
        
        if let Some(task) = workspace.tasks.get(task_id) {
            if let Some(deps) = Self::extract_tag_value_array(task, "depends_on") {
                for dep in deps {
                    if !visited.contains(&dep) {
                        cycle_path.push(format!("{} -> {}", task_id, dep));
                        if Self::has_cycle(workspace, &dep, visited, rec_stack, cycle_path) {
                            return true;
                        }
                        cycle_path.pop();
                    } else if rec_stack.contains(&dep) {
                        // 循環依存を検出
                        cycle_path.push(format!("{} -> {}", task_id, dep));
                        cycle_path.push(format!("{} (循環)", dep));
                        return true;
                    }
                }
            }
        }
        
        rec_stack.remove(task_id);
        false
    }

    // ===== R-6.6.2: DSL生成とDual Output 機能 =====

    /// ガントチャートDSLを生成し、MermaidとJSON両方を返す
    pub fn generate_gantt_chart_with_dsl(workspace: &Workspace) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_gantt_dsl(workspace)?;
        let mermaid = Self::dsl_to_mermaid_gantt(&chart_dsl);
        
        Ok(ChartOutput {
            mermaid,
            data: Chart::Gantt(chart_dsl),
        })
    }

    /// ガントチャートDSL（マッピング対応）を生成し、MermaidとJSON両方を返す
    pub fn generate_gantt_chart_with_dsl_mapped(
        workspace: &Workspace,
        title_field: Option<&str>,
        start_field: Option<&str>,
        end_field: Option<&str>,
        depends_on_field: Option<&str>,
        section_field: Option<&str>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_gantt_dsl_mapped(workspace, title_field, start_field, end_field, depends_on_field, section_field)?;
        let mermaid = Self::dsl_to_mermaid_gantt(&chart_dsl);

        Ok(ChartOutput { mermaid, data: Chart::Gantt(chart_dsl) })
    }

    /// ガントチャートDSLを生成（フィルタ対応）し、MermaidとJSON両方を返す
    pub fn generate_gantt_chart_with_dsl_filtered(
        workspace: &Workspace,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_gantt_dsl_filtered(workspace, filter_date_field, start_date, end_date)?;
        let mermaid = Self::dsl_to_mermaid_gantt(&chart_dsl);

        Ok(ChartOutput {
            mermaid,
            data: Chart::Gantt(chart_dsl),
        })
    }

    /// ガントチャートDSL（マッピング + フィルタ対応）
    pub fn generate_gantt_chart_with_dsl_mapped_filtered(
        workspace: &Workspace,
        title_field: Option<&str>,
        start_field: Option<&str>,
        end_field: Option<&str>,
        depends_on_field: Option<&str>,
        section_field: Option<&str>,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_gantt_dsl_mapped_filtered(
            workspace,
            title_field, start_field, end_field, depends_on_field, section_field,
            filter_date_field, start_date, end_date,
        )?;
        let mermaid = Self::dsl_to_mermaid_gantt(&chart_dsl);
        Ok(ChartOutput { mermaid, data: Chart::Gantt(chart_dsl) })
    }

    /// 円グラフDSLを生成し、MermaidとJSON両方を返す
    pub fn generate_pie_chart_with_dsl(workspace: &Workspace, category: &str) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_pie_dsl(workspace, category)?;
        let mermaid = Self::dsl_to_mermaid_pie(&chart_dsl);
        
        Ok(ChartOutput {
            mermaid,
            data: Chart::Pie(chart_dsl),
        })
    }

    /// 折線グラフDSLを生成し、MermaidとJSON両方を返す
    pub fn generate_line_chart_with_dsl(
        workspace: &Workspace, 
        date_field: &str, 
        y_axis_label: Option<&str>,
        metric: Option<&Metric>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_line_dsl(workspace, date_field, y_axis_label, metric)?;
        let mermaid = Self::dsl_to_mermaid_line(&chart_dsl);
        
        Ok(ChartOutput {
            mermaid,
            data: Chart::Line(chart_dsl),
        })
    }

    /// 棒グラフDSLを生成し、MermaidとJSON両方を返す
    pub fn generate_bar_chart_with_dsl(workspace: &Workspace, category: &str) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_bar_dsl(workspace, category)?;
        let mermaid = Self::dsl_to_mermaid_bar(&chart_dsl);
        
        Ok(ChartOutput {
            mermaid,
            data: Chart::Bar(chart_dsl),
        })
    }

    // ===== R-6.8.x: 日付範囲フィルタ付き集計 =====

    /// フィルタ（任意）を適用して円グラフDSL + Mermaidを生成
    pub fn generate_pie_chart_with_dsl_filtered(
        workspace: &Workspace,
        category: &str,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_pie_dsl_filtered(workspace, category, filter_date_field, start_date, end_date)?;
        let mermaid = Self::dsl_to_mermaid_pie(&chart_dsl);

        Ok(ChartOutput {
            mermaid,
            data: Chart::Pie(chart_dsl),
        })
    }

    /// フィルタ（任意）を適用して棒グラフDSL + Mermaidを生成
    pub fn generate_bar_chart_with_dsl_filtered(
        workspace: &Workspace,
        category: &str,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_bar_dsl_filtered(workspace, category, filter_date_field, start_date, end_date)?;
        let mermaid = Self::dsl_to_mermaid_bar(&chart_dsl);

        Ok(ChartOutput {
            mermaid,
            data: Chart::Bar(chart_dsl),
        })
    }

    /// フィルタ（任意）を適用して折線グラフDSL + Mermaidを生成
    pub fn generate_line_chart_with_dsl_filtered(
        workspace: &Workspace,
        date_field: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
        y_axis_label: Option<&str>,
        metric: Option<&Metric>,
    ) -> Result<ChartOutput, String> {
        let chart_dsl = Self::generate_line_dsl_filtered(workspace, date_field, start_date, end_date, y_axis_label, metric)?;
        let mermaid = Self::dsl_to_mermaid_line(&chart_dsl);

        Ok(ChartOutput {
            mermaid,
            data: Chart::Line(chart_dsl),
        })
    }

    // ===== DSL生成（内部メソッド） =====

    fn generate_gantt_dsl(workspace: &Workspace) -> Result<GanttChart, String> {
        let mut scheduled_tasks: Vec<&Task> = workspace.tasks.values()
            .filter(|task| Self::has_valid_date_fields(task))
            .collect();

        if scheduled_tasks.is_empty() {
            return Ok(GanttChart {
                title: "Task Schedule".to_string(),
                date_format: "YYYY-MM-DD".to_string(),
                sections: vec![],
            });
        }

        // 循環依存を検出
        let cyclic_deps = Self::detect_cyclic_dependencies(workspace);
        if !cyclic_deps.is_empty() {
            let dep_list = cyclic_deps.join(", ");
            return Err(format!("循環依存が検出されました。以下のタスク間で依存関係を見直してください: {}", dep_list));
        }

        // 開始日でソート
        scheduled_tasks.sort_by(|a, b| {
            let a_start = Self::extract_validated_date_string(a, "start_date");
            let b_start = Self::extract_validated_date_string(b, "start_date");
            a_start.cmp(&b_start)
        });

        // セクション分け
        let mut section_map: HashMap<String, Vec<&Task>> = HashMap::new();
        for task in scheduled_tasks {
            let section = Self::extract_tag_value_string(task, "status")
                .unwrap_or_else(|| "未分類".to_string());
            section_map.entry(section).or_insert_with(Vec::new).push(task);
        }

        let sections: Vec<GanttSection> = section_map.into_iter()
            .map(|(name, tasks)| {
                let gantt_tasks: Vec<GanttTask> = tasks.into_iter()
                    .map(|task| {
                        let task_name = task.id.replace("-", " ").replace("_", " ");
                        let start = Self::extract_validated_date_string(task, "start_date")
                            .unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                        let end = Self::extract_validated_date_string(task, "end_date")
                            .unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                        let status = Self::extract_tag_value_string(task, "status");
                        let depends_on = Self::extract_tag_value_array(task, "depends_on")
                            .and_then(|deps| deps.first().cloned());

                        GanttTask {
                            id: task.id.clone(),
                            title: task_name,
                            start,
                            end,
                            status,
                            depends_on,
                        }
                    })
                    .collect();

                GanttSection {
                    name,
                    tasks: gantt_tasks,
                }
            })
            .collect();

        Ok(GanttChart {
            title: "Task Schedule".to_string(),
            date_format: "YYYY-MM-DD".to_string(),
            sections,
        })
    }

    fn generate_gantt_dsl_mapped(
        workspace: &Workspace,
        title_field: Option<&str>,
        start_field: Option<&str>,
        end_field: Option<&str>,
        depends_on_field: Option<&str>,
        section_field: Option<&str>,
    ) -> Result<GanttChart, String> {
        let start_key = start_field.unwrap_or("start_date");
        let end_key = end_field.unwrap_or("end_date");
        let title_key = title_field.unwrap_or("");
        let depends_key = depends_on_field.unwrap_or("depends_on");
        let section_key = section_field.unwrap_or("status");

        let mut scheduled_tasks: Vec<&Task> = workspace.tasks.values()
            .filter(|task| Self::extract_validated_date_string(task, start_key).is_some() && Self::extract_validated_date_string(task, end_key).is_some())
            .collect();

        if scheduled_tasks.is_empty() {
            return Ok(GanttChart { title: "Task Schedule".to_string(), date_format: "YYYY-MM-DD".to_string(), sections: vec![] });
        }

        // 循環依存チェック（depends_onのキーは可変だが、検出は従来のキーに依存。簡易にスキップ）
        // 開始日でソート
        scheduled_tasks.sort_by(|a, b| {
            let a_start = Self::extract_validated_date_string(a, start_key);
            let b_start = Self::extract_validated_date_string(b, start_key);
            a_start.cmp(&b_start)
        });

        let mut section_map: HashMap<String, Vec<&Task>> = HashMap::new();
        for task in scheduled_tasks {
            let section = if !section_key.is_empty() {
                Self::extract_tag_value_string(task, section_key).unwrap_or_else(|| "未分類".to_string())
            } else {
                "Tasks".to_string()
            };
            section_map.entry(section).or_insert_with(Vec::new).push(task);
        }

        let sections: Vec<GanttSection> = section_map.into_iter().map(|(name, tasks)| {
            let gantt_tasks: Vec<GanttTask> = tasks.into_iter().map(|task| {
                let task_name = if !title_key.is_empty() {
                    Self::extract_tag_value_string(task, title_key).unwrap_or_else(|| task.id.replace("-", " ").replace("_", " "))
                } else {
                    task.id.replace("-", " ").replace("_", " ")
                };
                let start = Self::extract_validated_date_string(task, start_key).unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let end = Self::extract_validated_date_string(task, end_key).unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let status = if section_key == "status" { Self::extract_tag_value_string(task, "status") } else { None };
                let depends_on = if depends_key.is_empty() { None } else { Self::extract_tag_value_array(task, depends_key).and_then(|deps| deps.first().cloned()) };
                GanttTask { id: task.id.clone(), title: task_name, start, end, status, depends_on }
            }).collect();
            GanttSection { name, tasks: gantt_tasks }
        }).collect();

        Ok(GanttChart { title: "Task Schedule".to_string(), date_format: "YYYY-MM-DD".to_string(), sections })
    }

    fn generate_gantt_dsl_mapped_filtered(
        workspace: &Workspace,
        title_field: Option<&str>,
        start_field: Option<&str>,
        end_field: Option<&str>,
        depends_on_field: Option<&str>,
        section_field: Option<&str>,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<GanttChart, String> {
        let start_key = start_field.unwrap_or("start_date");
        let end_key = end_field.unwrap_or("end_date");
        let title_key = title_field.unwrap_or("");
        let depends_key = depends_on_field.unwrap_or("depends_on");
        let section_key = section_field.unwrap_or("status");

        let start = match start_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };
        let end = match end_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };

        let mut scheduled_tasks: Vec<&Task> = workspace.tasks.values()
            .filter(|task| Self::extract_validated_date_string(task, start_key).is_some() && Self::extract_validated_date_string(task, end_key).is_some())
            .collect();

        if filter_date_field.is_some() || start.is_some() || end.is_some() {
            scheduled_tasks.retain(|task| Self::matches_date_filter(task, filter_date_field, start, end));
        }

        if scheduled_tasks.is_empty() {
            return Ok(GanttChart { title: "Task Schedule".to_string(), date_format: "YYYY-MM-DD".to_string(), sections: vec![] });
        }

        scheduled_tasks.sort_by(|a, b| {
            let a_start = Self::extract_validated_date_string(a, start_key);
            let b_start = Self::extract_validated_date_string(b, start_key);
            a_start.cmp(&b_start)
        });

        let mut section_map: HashMap<String, Vec<&Task>> = HashMap::new();
        for task in scheduled_tasks {
            let section = if !section_key.is_empty() {
                Self::extract_tag_value_string(task, section_key).unwrap_or_else(|| "未分類".to_string())
            } else {
                "Tasks".to_string()
            };
            section_map.entry(section).or_insert_with(Vec::new).push(task);
        }

        let sections: Vec<GanttSection> = section_map.into_iter().map(|(name, tasks)| {
            let gantt_tasks: Vec<GanttTask> = tasks.into_iter().map(|task| {
                let task_name = if !title_key.is_empty() {
                    Self::extract_tag_value_string(task, title_key).unwrap_or_else(|| task.id.replace("-", " ").replace("_", " "))
                } else {
                    task.id.replace("-", " ").replace("_", " ")
                };
                let start = Self::extract_validated_date_string(task, start_key).unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let end = Self::extract_validated_date_string(task, end_key).unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let status = if section_key == "status" { Self::extract_tag_value_string(task, "status") } else { None };
                let depends_on = if depends_key.is_empty() { None } else { Self::extract_tag_value_array(task, depends_key).and_then(|deps| deps.first().cloned()) };
                GanttTask { id: task.id.clone(), title: task_name, start, end, status, depends_on }
            }).collect();
            GanttSection { name, tasks: gantt_tasks }
        }).collect();

        Ok(GanttChart { title: "Task Schedule".to_string(), date_format: "YYYY-MM-DD".to_string(), sections })
    }

    fn generate_gantt_dsl_filtered(
        workspace: &Workspace,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<GanttChart, String> {
        let mut scheduled_tasks: Vec<&Task> = workspace.tasks.values()
            .filter(|task| Self::has_valid_date_fields(task))
            .collect();

        let start = match start_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };
        let end = match end_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };

        if filter_date_field.is_some() || start.is_some() || end.is_some() {
            scheduled_tasks.retain(|task| Self::matches_date_filter(task, filter_date_field, start, end));
        }

        if scheduled_tasks.is_empty() {
            return Ok(GanttChart { title: "Task Schedule".to_string(), date_format: "YYYY-MM-DD".to_string(), sections: vec![] });
        }

        let cyclic_deps = Self::detect_cyclic_dependencies(workspace);
        if !cyclic_deps.is_empty() {
            let dep_list = cyclic_deps.join(", ");
            return Err(format!("循環依存が検出されました。以下のタスク間で依存関係を見直してください: {}", dep_list));
        }

        scheduled_tasks.sort_by(|a, b| {
            let a_start = Self::extract_validated_date_string(a, "start_date");
            let b_start = Self::extract_validated_date_string(b, "start_date");
            a_start.cmp(&b_start)
        });

        let mut section_map: HashMap<String, Vec<&Task>> = HashMap::new();
        for task in scheduled_tasks {
            let section = Self::extract_tag_value_string(task, "status").unwrap_or_else(|| "未分類".to_string());
            section_map.entry(section).or_insert_with(Vec::new).push(task);
        }

        let sections: Vec<GanttSection> = section_map.into_iter().map(|(name, tasks)| {
            let gantt_tasks: Vec<GanttTask> = tasks.into_iter().map(|task| {
                let task_name = task.id.replace("-", " ").replace("_", " ");
                let start = Self::extract_validated_date_string(task, "start_date").unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let end = Self::extract_validated_date_string(task, "end_date").unwrap_or_else(|| Utc::now().date_naive().format("%Y-%m-%d").to_string());
                let status = Self::extract_tag_value_string(task, "status");
                let depends_on = Self::extract_tag_value_array(task, "depends_on").and_then(|deps| deps.first().cloned());
                GanttTask { id: task.id.clone(), title: task_name, start, end, status, depends_on }
            }).collect();
            GanttSection { name, tasks: gantt_tasks }
        }).collect();

        Ok(GanttChart { title: "Task Schedule".to_string(), date_format: "YYYY-MM-DD".to_string(), sections })
    }

    fn generate_pie_dsl(workspace: &Workspace, category: &str) -> Result<PieChart, String> {
        let category_data = workspace.tag_index.categories
            .get(category)
            .ok_or_else(|| format!("カテゴリ '{}' が見つかりませんでした。", category))?;

        let categories: Vec<CategoryCount> = category_data.values.iter()
            .map(|(label, count)| CategoryCount {
                label: label.clone(),
                count: *count,
            })
            .collect();

        Ok(PieChart {
            title: format!("{} Distribution", category),
            categories,
        })
    }

    /// フィルタ（任意）つき円グラフDSL生成（タグインデックスではなくタスク走査で集計）
    fn generate_pie_dsl_filtered(
        workspace: &Workspace,
        category: &str,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<PieChart, String> {
        let tasks = Self::iter_tasks_filtered(workspace, filter_date_field, start_date, end_date)?;
        let mut counts: HashMap<String, usize> = HashMap::new();

        for task in tasks {
            if let Some(val) = task.front_matter.tags.get(category) {
                match val {
                    crate::models::TagValue::String(s) => {
                        *counts.entry(s.clone()).or_insert(0) += 1;
                    }
                    crate::models::TagValue::Array(arr) => {
                        for s in arr {
                            *counts.entry(s.clone()).or_insert(0) += 1;
                        }
                    }
                    _ => {}
                }
            }
        }

        if counts.is_empty() {
            // 既存動作に合わせて空配列でもOKとする
            return Ok(PieChart { title: format!("{} Distribution", category), categories: vec![] });
        }

        let categories: Vec<CategoryCount> = counts
            .into_iter()
            .map(|(label, count)| CategoryCount { label, count })
            .collect();

        Ok(PieChart { title: format!("{} Distribution", category), categories })
    }

    fn generate_line_dsl(
        workspace: &Workspace, 
        date_field: &str, 
        y_axis_label: Option<&str>,
        metric: Option<&Metric>,
    ) -> Result<LineChart, String> {
        let mut date_values: HashMap<NaiveDate, Vec<&Task>> = HashMap::new();

        // 日付でグループ化
        for task in workspace.tasks.values() {
            if let Some(date_str) = Self::extract_date_string(task, date_field) {
                if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                    date_values.entry(date).or_insert_with(Vec::new).push(task);
                }
            }
        }

        // メトリックに基づいて値を計算
        let mut series: Vec<TimeSeriesPoint> = date_values
            .into_iter()
            .map(|(date, tasks)| {
                let value = if let Some(metric) = metric {
                    metric.evaluate(&tasks)
                } else {
                    // デフォルト: タスク数
                    tasks.len() as f64
                };
                TimeSeriesPoint {
                    date: date.format("%Y-%m-%d").to_string(),
                    value,
                }
            })
            .collect();

        series.sort_by_key(|p| p.date.clone());

        // タイトルを生成（メトリック名に基づく）
        let title = if let Some(metric) = metric {
            format!("{} by {}", metric.name, date_field)
        } else {
            format!("Tasks by {}", date_field)
        };

        Ok(LineChart {
            title,
            y_axis_label: y_axis_label.unwrap_or("Count").to_string(),
            series,
        })
    }

    /// フィルタ（任意）つき折線グラフDSL生成
    fn generate_line_dsl_filtered(
        workspace: &Workspace,
        date_field: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
        y_axis_label: Option<&str>,
        metric: Option<&Metric>,
    ) -> Result<LineChart, String> {
        let mut date_values: HashMap<NaiveDate, Vec<&Task>> = HashMap::new();

        let start = match start_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };
        let end = match end_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };

        // 日付でグループ化（フィルタ適用）
        for task in workspace.tasks.values() {
            if let Some(date_str) = Self::extract_date_string(task, date_field) {
                if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                    if (start.map(|s| date >= s).unwrap_or(true)) && (end.map(|e| date <= e).unwrap_or(true)) {
                        date_values.entry(date).or_insert_with(Vec::new).push(task);
                    }
                }
            }
        }

        // メトリックに基づいて値を計算
        let mut series: Vec<TimeSeriesPoint> = date_values
            .into_iter()
            .map(|(date, tasks)| {
                let value = if let Some(metric) = metric {
                    metric.evaluate(&tasks)
                } else {
                    // デフォルト: タスク数
                    tasks.len() as f64
                };
                TimeSeriesPoint { 
                    date: date.format("%Y-%m-%d").to_string(), 
                    value 
                }
            })
            .collect();

        series.sort_by_key(|p| p.date.clone());

        // タイトルを生成（メトリック名に基づく）
        let title = if let Some(metric) = metric {
            format!("{} by {}", metric.name, date_field)
        } else {
            format!("Tasks by {}", date_field)
        };

        Ok(LineChart { 
            title, 
            y_axis_label: y_axis_label.unwrap_or("Count").to_string(),
            series 
        })
    }

    fn generate_bar_dsl(workspace: &Workspace, category: &str) -> Result<BarChart, String> {
        let category_data = workspace.tag_index.categories
            .get(category)
            .ok_or_else(|| format!("カテゴリ '{}' が見つかりませんでした。", category))?;

        let x_axis: Vec<String> = category_data.values.keys().cloned().collect();
        let values: Vec<usize> = category_data.values.values().cloned().collect();
        let max_value = values.iter().max().cloned().unwrap_or(0);

        Ok(BarChart {
            title: category.to_string(),
            x_axis,
            y_axis_label: "Count".to_string(),
            values,
            max_value,
        })
    }

    /// フィルタ（任意）つき棒グラフDSL生成（タスク走査で集計）
    fn generate_bar_dsl_filtered(
        workspace: &Workspace,
        category: &str,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<BarChart, String> {
        let tasks = Self::iter_tasks_filtered(workspace, filter_date_field, start_date, end_date)?;
        let mut counts: HashMap<String, usize> = HashMap::new();

        for task in tasks {
            if let Some(val) = task.front_matter.tags.get(category) {
                match val {
                    crate::models::TagValue::String(s) => { *counts.entry(s.clone()).or_insert(0) += 1; }
                    crate::models::TagValue::Array(arr) => {
                        for s in arr { *counts.entry(s.clone()).or_insert(0) += 1; }
                    }
                    _ => {}
                }
            }
        }

        let mut x_axis: Vec<String> = counts.keys().cloned().collect();
        x_axis.sort();
        let values: Vec<usize> = x_axis.iter().map(|k| counts.get(k).cloned().unwrap_or(0)).collect();
        let max_value = values.iter().max().cloned().unwrap_or(0);

        Ok(BarChart { title: category.to_string(), x_axis, y_axis_label: "Count".to_string(), values, max_value })
    }

    /// 任意の日付フィールド + 範囲でタスクをフィルタ
    fn iter_tasks_filtered<'a>(
        workspace: &'a Workspace,
        filter_date_field: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Vec<&'a Task>, String> {
        if filter_date_field.is_none() && start_date.is_none() && end_date.is_none() {
            return Ok(workspace.tasks.values().collect());
        }

        let field = match filter_date_field { Some(f) => f, None => "" };
        let start = match start_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };
        let end = match end_date { Some(s) => NaiveDate::parse_from_str(s, "%Y-%m-%d").ok(), None => None };

        let mut out: Vec<&Task> = Vec::new();
        for task in workspace.tasks.values() {
            // フィールド未指定の場合はそのまま通す
            if field.is_empty() {
                out.push(task);
                continue;
            }
            if let Some(date_str) = Self::extract_date_string(task, field) {
                if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                    if (start.map(|s| date >= s).unwrap_or(true)) && (end.map(|e| date <= e).unwrap_or(true)) {
                        out.push(task);
                    }
                }
            }
        }
        Ok(out)
    }

    // ===== Mermaid変換（内部メソッド） =====

    fn dsl_to_mermaid_gantt(dsl: &GanttChart) -> String {
        let mut lines = vec![
            "gantt".to_string(),
            format!("    dateFormat  {}", dsl.date_format),
            format!("    title       {}", dsl.title),
            "".to_string(),
        ];

        for section in &dsl.sections {
            lines.push(format!("    section {}", section.name));
            
            for task in &section.tasks {
                let task_line = if let Some(dep) = &task.depends_on {
                    let dep_id = dep.replace("-", "_").replace(" ", "_");
                    format!("    {} :after {}, {}~{}", task.title, dep_id, task.start, task.end)
                } else {
                    format!("    {} :{}, {}", task.title, task.start, task.end)
                };
                lines.push(task_line);
            }
        }

        lines.join("\n")
    }

    fn dsl_to_mermaid_pie(dsl: &PieChart) -> String {
        let mut lines = vec![
            "pie".to_string(),
            format!("    title {}", dsl.title),
        ];

        for cat in &dsl.categories {
            lines.push(format!("    \"{}\" : {}", cat.label, cat.count));
        }

        lines.join("\n")
    }

    fn dsl_to_mermaid_line(dsl: &LineChart) -> String {
        let mut lines = vec![
            "xychart-beta".to_string(),
            format!("    title \"{}\"", dsl.title),
            "    x-axis [".to_string(),
        ];

        let date_labels: Vec<String> = dsl.series.iter()
            .map(|p| {
                NaiveDate::parse_from_str(&p.date, "%Y-%m-%d")
                    .map(|d| format!("\"{}\"", d.format("%m/%d")))
                    .unwrap_or_else(|_| format!("\"{}\"", p.date))
            })
            .collect();
        
        lines.push(format!("        {}", date_labels.join(", ")));
        lines.push("    ]".to_string());

        let max_value = dsl.series.iter().map(|p| p.value).fold(0.0f64, f64::max);
        let max_int = max_value.ceil() as usize;
        lines.push(format!("    y-axis \"{}\" 0 --> {}", dsl.y_axis_label, max_int + 5));
        
        let values: Vec<String> = dsl.series.iter().map(|p| {
            // 整数値の場合は整数として表示、小数の場合は小数点以下1桁まで表示
            if p.value.fract() == 0.0 {
                (p.value as usize).to_string()
            } else {
                format!("{:.1}", p.value)
            }
        }).collect();
        lines.push(format!("    line [{}]", values.join(", ")));

        lines.join("\n")
    }

    fn dsl_to_mermaid_bar(dsl: &BarChart) -> String {
        let mut lines = vec![
            "xychart-beta".to_string(),
            format!("    title \"{}\"", dsl.title),
            "    x-axis [".to_string(),
        ];

        let labels: Vec<String> = dsl.x_axis.iter()
            .map(|l| format!("\"{}\"", l))
            .collect();
        lines.push(format!("        {}", labels.join(", ")));
        lines.push("    ]".to_string());

        lines.push(format!("    y-axis \"{}\" 0 --> {}", dsl.y_axis_label, dsl.max_value + 5));
        
        let values: Vec<String> = dsl.values.iter().map(|v| v.to_string()).collect();
        lines.push(format!("    bar [{}]", values.join(", ")));

        lines.join("\n")
    }

    /// ガント用フィルタ判定
    /// filter_date_field 指定時: その日付が [start,end] に含まれる
    /// 未指定時: タスク期間 [start_date,end_date] がレンジと重なる
    fn matches_date_filter(
        task: &Task,
        filter_date_field: Option<&str>,
        start: Option<NaiveDate>,
        end: Option<NaiveDate>,
    ) -> bool {
        match filter_date_field {
            Some(field) if !field.is_empty() => {
                if let Some(date_str) = Self::extract_date_string(task, field) {
                    if let Ok(date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                        let ok_start = start.map(|s| date >= s).unwrap_or(true);
                        let ok_end = end.map(|e| date <= e).unwrap_or(true);
                        return ok_start && ok_end;
                    }
                }
                false
            }
            _ => {
                let s = Self::extract_validated_date_string(task, "start_date");
                let e = Self::extract_validated_date_string(task, "end_date");
                if let (Some(ss), Some(ee)) = (s, e) {
                    if let (Ok(ts), Ok(te)) = (
                        NaiveDate::parse_from_str(&ss, "%Y-%m-%d"),
                        NaiveDate::parse_from_str(&ee, "%Y-%m-%d"),
                    ) {
                        let overlap_start = end.map(|ed| ts <= ed).unwrap_or(true);
                        let overlap_end = start.map(|sd| te >= sd).unwrap_or(true);
                        return overlap_start && overlap_end;
                    }
                }
                false
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{FrontMatter, TagValue};
    use std::path::PathBuf;
    
    fn create_test_workspace() -> Workspace {
        let mut workspace = Workspace::new(PathBuf::from("/test"));
        
        // テストタスク1: 有効な日付を持つ
        let mut front_matter1 = FrontMatter::default();
        front_matter1.tags.insert("start_date".to_string(), TagValue::String("2025-01-01".to_string()));
        front_matter1.tags.insert("end_date".to_string(), TagValue::String("2025-01-31".to_string()));
        front_matter1.tags.insert("status".to_string(), TagValue::String("進行中".to_string()));
        
        let task1 = Task {
            id: "task-1".to_string(),
            file_path: PathBuf::from("/test/task-1.md"),
            front_matter: front_matter1,
            content: "Test task 1".to_string(),
            modified_at: Utc::now(),
            tag_order: None,
        };
        
        // テストタスク2: 無効な日付形式
        let mut front_matter2 = FrontMatter::default();
        front_matter2.tags.insert("start_date".to_string(), TagValue::String("2025/01/01".to_string())); // 無効な形式
        front_matter2.tags.insert("end_date".to_string(), TagValue::String("2025-01-31".to_string()));
        
        let task2 = Task {
            id: "task-2".to_string(),
            file_path: PathBuf::from("/test/task-2.md"),
            front_matter: front_matter2,
            content: "Test task 2".to_string(),
            modified_at: Utc::now(),
            tag_order: None,
        };
        
        workspace.tasks.insert("task-1".to_string(), task1);
        workspace.tasks.insert("task-2".to_string(), task2);
        
        workspace
    }
    
    fn create_test_workspace_with_cycle() -> Workspace {
        let mut workspace = create_test_workspace();
        
        // 循環依存を作成
        let mut front_matter3 = FrontMatter::default();
        front_matter3.tags.insert("start_date".to_string(), TagValue::String("2025-02-01".to_string()));
        front_matter3.tags.insert("end_date".to_string(), TagValue::String("2025-02-28".to_string()));
        front_matter3.tags.insert("depends_on".to_string(), TagValue::Array(vec!["task-4".to_string()]));
        
        let task3 = Task {
            id: "task-3".to_string(),
            file_path: PathBuf::from("/test/task-3.md"),
            front_matter: front_matter3,
            content: "Test task 3".to_string(),
            modified_at: Utc::now(),
            tag_order: None,
        };
        
        let mut front_matter4 = FrontMatter::default();
        front_matter4.tags.insert("start_date".to_string(), TagValue::String("2025-03-01".to_string()));
        front_matter4.tags.insert("end_date".to_string(), TagValue::String("2025-03-31".to_string()));
        front_matter4.tags.insert("depends_on".to_string(), TagValue::Array(vec!["task-3".to_string()])); // task-3に依存
        
        let task4 = Task {
            id: "task-4".to_string(),
            file_path: PathBuf::from("/test/task-4.md"),
            front_matter: front_matter4,
            content: "Test task 4".to_string(),
            modified_at: Utc::now(),
            tag_order: None,
        };
        
        workspace.tasks.insert("task-3".to_string(), task3);
        workspace.tasks.insert("task-4".to_string(), task4);
        
        workspace
    }
    
    #[test]
    fn test_extract_validated_date_string() {
        let mut front_matter = FrontMatter::default();
        front_matter.tags.insert("start_date".to_string(), TagValue::String("2025-01-01".to_string()));
        
        let task = Task {
            id: "test".to_string(),
            file_path: PathBuf::from("/test/test.md"),
            front_matter,
            content: "".to_string(),
            modified_at: Utc::now(),
            tag_order: None,
        };
        
        // 有効な日付
        assert_eq!(
            AnalysisService::extract_validated_date_string(&task, "start_date"),
            Some("2025-01-01".to_string())
        );
        
        // 無効な日付形式
        let mut front_matter_invalid = FrontMatter::default();
        front_matter_invalid.tags.insert("start_date".to_string(), TagValue::String("2025/01/01".to_string()));
        
        let task_invalid = Task {
            id: "test".to_string(),
            file_path: PathBuf::from("/test/test.md"),
            front_matter: front_matter_invalid,
            content: "".to_string(),
            modified_at: Utc::now(),
            tag_order: None,
        };
        
        assert_eq!(
            AnalysisService::extract_validated_date_string(&task_invalid, "start_date"),
            None
        );
    }
    
    #[test]
    fn test_has_valid_date_fields() {
        let workspace = create_test_workspace();
        
        let task1 = workspace.tasks.get("task-1").unwrap();
        assert!(AnalysisService::has_valid_date_fields(task1));
        
        let task2 = workspace.tasks.get("task-2").unwrap();
        assert!(!AnalysisService::has_valid_date_fields(task2)); // 無効な形式
    }
    
    #[test]
    fn test_gantt_chart_generation() {
        let workspace = create_test_workspace();
        let result = AnalysisService::generate_gantt_chart(&workspace);
        
        assert!(result.is_ok());
        let code = result.unwrap();
        
        // Mermaidコードが含まれているか確認
        assert!(code.contains("gantt"));
        // task ID "-" は " " に変換されるため、"task 1" を探す
        assert!(code.contains("task 1"));
        assert!(!code.contains("task 2")); // 無効な日付のタスクは含まれない
    }
    
    #[test]
    fn test_detect_cyclic_dependencies() {
        let workspace = create_test_workspace_with_cycle();
        let cycles = AnalysisService::detect_cyclic_dependencies(&workspace);
        
        // 循環依存が検出されることを確認
        assert!(!cycles.is_empty());
        assert!(cycles.iter().any(|c| c.contains("task-3")));
        assert!(cycles.iter().any(|c| c.contains("task-4")));
    }
    
    #[test]
    fn test_gantt_chart_with_cyclic_dependencies() {
        let workspace = create_test_workspace_with_cycle();
        let result = AnalysisService::generate_gantt_chart(&workspace);
        
        // 循環依存がある場合はエラーを返すべき
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("循環依存"));
    }
}

