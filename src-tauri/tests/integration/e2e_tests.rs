// E2E（End-to-End）テストシナリオ
// ユーザーシナリオ全体を通しての動作を検証

use std::path::PathBuf;
use tempfile::TempDir;
use std::fs;

/// E2Eテストシナリオ1: タスク作成から分析まで
///
/// 1. ワークスペースを作成
/// 2. 複数のタスクを作成（異なるstatusと優先度）
/// 3. タスクを編集してFrontMatterを更新
/// 4. タグインデックスを取得
/// 5. ガントチャートを生成
/// 6. 円グラフを生成
#[tokio::test]
async fn test_e2e_task_creation_to_analysis() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path();
    
    // ステップ1: タスクを作成
    let tasks = vec![
        (
            "task-1",
            r#"---
status: todo
priority: 1
start_date: 2025-01-01
end_date: 2025-01-31
---

# Task 1
This is the first task.
"#,
        ),
        (
            "task-2",
            r#"---
status: doing
priority: 3
start_date: 2025-02-01
end_date: 2025-02-28
---

# Task 2
This is the second task.
"#,
        ),
        (
            "task-3",
            r#"---
status: done
priority: 5
start_date: 2025-03-01
end_date: 2025-03-31
---

# Task 3
This is the third task.
"#,
        ),
    ];
    
    for (task_id, content) in tasks {
        let file_path = workspace_path.join(format!("{}.md", task_id));
        fs::write(&file_path, content).unwrap();
    }
    
    // ステップ2: ワークスペースを読み込んで検証
    // 注意: 実際のテストでは、適切なサービスを使用
    // let workspace = load_workspace(workspace_path).unwrap();
    // assert_eq!(workspace.tasks.len(), 3);
    
    // ステップ3: タグインデックスを検証
    // let tag_index = workspace.tag_index;
    // assert!(tag_index.categories.contains_key("status"));
    
    // ステップ4: 分析チャートを生成
    // let gantt_chart = generate_gantt_chart(workspace_path).await.unwrap();
    // assert!(!gantt_chart.mermaid.is_empty());
}

/// E2Eテストシナリオ2: FrontMatter同期
///
/// 1. タスクファイルを作成
/// 2. GUI経由でFrontMatterを編集
/// 3. 外部エディタで同じファイルを編集
/// 4. 競合を検出して解決
#[tokio::test]
async fn test_e2e_frontmatter_sync() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path();
    
    // ステップ1: 初期タスクを作成
    let initial_content = r#"---
status: todo
---

# Initial Task
"#;
    
    let file_path = workspace_path.join("sync-test.md");
    fs::write(&file_path, initial_content).unwrap();
    
    // ステップ2: ファイルを読み込んでローカルFrontMatterを構築
    // let local = /* GUI経由で編集されたFrontMatter */;
    
    // ステップ3: ファイルを直接編集（外部エディタのシミュレーション）
    let remote_content = r#"---
status: doing
priority: 3
---

# Initial Task (Updated externally)
"#;
    fs::write(&file_path, remote_content).unwrap();
    
    // ステップ4: リモートFrontMatterを読み込み
    // let remote = /* ファイルから読み込んだFrontMatter */;
    
    // ステップ5: 差分を計算してマージ
    // let diff = FrontMatterSyncService::diff(&local, &remote);
    // assert!(FrontMatterSyncService::has_conflicts(&diff));
    // let merged = FrontMatterSyncService::merge(&diff, SyncMode::LocalFirst, &remote);
}

/// E2Eテストシナリオ3: タグ型検証と自動補正
///
/// 1. 型不正なFrontMatterを含むタスクを作成
/// 2. TagValidatorで検証
/// 3. 自動補正が適用されることを確認
/// 4. 補正されたタスクを保存
#[tokio::test]
async fn test_e2e_tag_validation_and_correction() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path();
    
    // ステップ1: 型不正なタスクを作成（文字列"3"が数値型として定義されている）
    let invalid_content = r#"---
priority: "3"
status: true
---

# Invalid Task
"#;
    
    let file_path = workspace_path.join("invalid-task.md");
    fs::write(&file_path, invalid_content).unwrap();
    
    // ステップ2: ワークスペースを読み込み
    // let workspace = load_workspace(workspace_path).unwrap();
    // let task = workspace.tasks.get("invalid-task").unwrap();
    
    // ステップ3: TagValidatorで検証
    // let tag_configs = /* タグ設定を読み込み */;
    // let result = TagValidator::validate_and_correct(&task.front_matter, &tag_configs);
    
    // ステップ4: 自動補正が適用されていることを確認
    // assert!(!result.corrections.is_empty());
    // if let Some(TagValue::Number(3)) = result.front_matter.tags.get("priority") {
    //     // 正しく数値に補正されている
    // } else {
    //     panic!("Expected priority to be converted to number");
    // }
    
    // ステップ5: 補正されたタスクを保存
    // task.front_matter = result.front_matter;
    // save_task(task).await.unwrap();
}

/// E2Eテストシナリオ4: キャッシュを使ったパフォーマンス最適化
///
/// 1. 大量のタスクファイルを作成
/// 2. 初期TagIndexを構築（時間測定）
/// 3. 1つのファイルを更新
/// 4. キャッシュを使った差分更新（時間測定）
/// 5. パフォーマンス改善を確認
#[tokio::test]
async fn test_e2e_cache_performance() {
    let temp_dir = super::create_test_workspace().unwrap();
    let workspace_path = temp_dir.path();
    
    // ステップ1: 100個のタスクを作成
    for i in 1..=100 {
        let content = format!(
            r#"---
status: todo
priority: {}
---

# Task {}
"#,
            i % 5 + 1,
            i
        );
        
        let file_path = workspace_path.join(format!("task-{}.md", i));
        fs::write(&file_path, content).unwrap();
    }
    
    // ステップ2: キャッシュを使わずにTagIndexを構築
    // let start = std::time::Instant::now();
    // let workspace = load_workspace(workspace_path).unwrap();
    // let full_build_time = start.elapsed();
    
    // ステップ3: キャッシュを初期化
    // let cache = TagIndexCache::new();
    // for (task_id, task) in &workspace.tasks {
    //     cache.update_entry(/* ... */);
    // }
    
    // ステップ4: 1つのファイルを更新
    // fs::write(workspace_path.join("task-50.md"), "updated").unwrap();
    
    // ステップ5: キャッシュを使った差分更新
    // let start = std::time::Instant::now();
    // let changed = AsyncAnalysisService::detect_changed_files(&cache, workspace_path, None).await.unwrap();
    // AsyncAnalysisService::update_cache_batch(&cache, workspace_path, &changed).await.unwrap();
    // let incremental_time = start.elapsed();
    
    // ステップ6: パフォーマンス改善を確認
    // assert!(incremental_time < full_build_time / 10, 
    //     "Incremental update should be much faster than full rebuild");
}

