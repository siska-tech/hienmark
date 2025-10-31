// Tauri IPC統合テスト

use std::path::PathBuf;
use tempfile::TempDir;

// 注意: 実際のTauriコマンドは`#[tauri::command]`マクロでマークされており、
// 直接関数として呼び出すことができます（IPC経由ではなく）
// 統合テストでは、実際のファイル操作とサービス層の動作を検証します

use hienmark_lib::commands::{
    create_task,
    get_task,
    save_task,
    list_tasks,
    generate_gantt_chart_with_dsl,
    generate_pie_chart_with_dsl,
};
use hienmark_lib::models::TagValue;

#[tokio::test]
async fn test_create_and_get_task() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path().to_str().unwrap().to_string();

    // タスクを作成
    let content = r#"---
status: todo
priority: 3
---

# Test Task
This is a test task.
"#;

    let result = create_task(
        workspace_path.clone(),
        "test-task".to_string(),
        content.to_string(),
    ).await;

    assert!(result.is_ok(), "Failed to create task: {:?}", result.err());

    // タスクを取得
    let task_result = get_task(
        workspace_path.clone(),
        "test-task".to_string(),
    ).await;

    assert!(task_result.is_ok(), "Failed to get task: {:?}", task_result.err());
    
    let task = task_result.unwrap();
    assert_eq!(task.id, "test-task");
    assert!(task.content.contains("Test Task"));
    assert!(task.front_matter.tags.contains_key("status"));
    
    if let Some(TagValue::String(status)) = task.front_matter.tags.get("status") {
        assert_eq!(status, "todo");
    } else {
        panic!("Expected status tag to be a string");
    }
}

#[tokio::test]
async fn test_save_task_with_updated_frontmatter() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path().to_str().unwrap().to_string();

    // 初期タスクを作成
    let initial_content = r#"---
status: todo
---

# Initial Task
"#;

    create_task(
        workspace_path.clone(),
        "test-task".to_string(),
        initial_content.to_string(),
    ).await.unwrap();

    // タスクを取得して更新
    let mut task = get_task(
        workspace_path.clone(),
        "test-task".to_string(),
    ).await.unwrap();

    // FrontMatterを更新
    task.front_matter.tags.insert("status".to_string(), TagValue::String("doing".to_string()));
    task.front_matter.tags.insert("priority".to_string(), TagValue::Number(5));

    // 保存
    let save_result = save_task(
        workspace_path.clone(),
        task,
    ).await;

    assert!(save_result.is_ok(), "Failed to save task: {:?}", save_result.err());

    // 再度取得して検証
    let updated_task = get_task(
        workspace_path.clone(),
        "test-task".to_string(),
    ).await.unwrap();

    assert_eq!(
        updated_task.front_matter.tags.get("status"),
        Some(&TagValue::String("doing".to_string()))
    );
    assert_eq!(
        updated_task.front_matter.tags.get("priority"),
        Some(&TagValue::Number(5))
    );
}

#[tokio::test]
async fn test_list_tasks() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path().to_str().unwrap().to_string();

    // 複数のタスクを作成
    let tasks = vec![
        ("task-1", "status: todo\n---\n\n# Task 1"),
        ("task-2", "status: doing\n---\n\n# Task 2"),
        ("task-3", "status: done\n---\n\n# Task 3"),
    ];

    for (id, content) in tasks {
        create_task(
            workspace_path.clone(),
            id.to_string(),
            format!("---\n{}\n---\n\n{}", content, ""),
        ).await.unwrap();
    }

    // タスク一覧を取得
    let task_list = list_tasks(workspace_path.clone()).await.unwrap();

    assert_eq!(task_list.len(), 3, "Expected 3 tasks, got {}", task_list.len());
    
    let task_ids: Vec<String> = task_list.iter().map(|t| t.id.clone()).collect();
    assert!(task_ids.contains(&"task-1".to_string()));
    assert!(task_ids.contains(&"task-2".to_string()));
    assert!(task_ids.contains(&"task-3".to_string()));
}

#[tokio::test]
async fn test_generate_gantt_chart() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path().to_str().unwrap().to_string();

    // ガントチャート用のタスクを作成
    let tasks = vec![
        (
            "task-1",
            "start_date: 2025-01-01\nend_date: 2025-01-31\nstatus: todo\n---\n\n# Task 1",
        ),
        (
            "task-2",
            "start_date: 2025-02-01\nend_date: 2025-02-28\nstatus: doing\n---\n\n# Task 2",
        ),
    ];

    for (id, content) in tasks {
        create_task(
            workspace_path.clone(),
            id.to_string(),
            format!("---\n{}\n---\n\n{}", content, ""),
        ).await.unwrap();
    }

    // ガントチャートを生成
    let chart_result = generate_gantt_chart_with_dsl(workspace_path.clone()).await;

    assert!(chart_result.is_ok(), "Failed to generate gantt chart: {:?}", chart_result.err());
    
    let chart_output = chart_result.unwrap();
    assert!(!chart_output.mermaid.is_empty(), "Mermaid code should not be empty");
    assert!(chart_output.mermaid.contains("gantt"), "Mermaid code should contain 'gantt'");
}

#[tokio::test]
async fn test_generate_pie_chart() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path().to_str().unwrap().to_string();

    // 異なるstatusを持つタスクを作成
    let tasks = vec![
        ("task-1", "status: todo"),
        ("task-2", "status: todo"),
        ("task-3", "status: doing"),
        ("task-4", "status: done"),
    ];

    for (id, status) in tasks {
        create_task(
            workspace_path.clone(),
            id.to_string(),
            format!("---\n{}\n---\n\n# {}", status, id),
        ).await.unwrap();
    }

    // 円グラフを生成
    let chart_result = generate_pie_chart_with_dsl(
        workspace_path.clone(),
        "status".to_string(),
    ).await;

    assert!(chart_result.is_ok(), "Failed to generate pie chart: {:?}", chart_result.err());
    
    let chart_output = chart_result.unwrap();
    assert!(!chart_output.mermaid.is_empty(), "Mermaid code should not be empty");
    assert!(chart_output.mermaid.contains("pie"), "Mermaid code should contain 'pie'");
}

use hienmark::models::TagValue;

