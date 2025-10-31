// サービス層統合テスト
// コマンド層を経由せず、サービス層を直接テストすることで、
// ビジネスロジックの動作を検証します

use std::path::PathBuf;
use tempfile::TempDir;
use std::fs;
use std::collections::HashMap;

// 統合テストでは、ライブラリの内部モジュールにアクセスする必要がある
// そのため、lib.rsで適切なpub useが必要

#[cfg(test)]
mod service_tests {
    use super::*;
    
    // 注意: 実際のテストでは、hienmark_libクレートとして公開されている
    // モジュールを使用する必要があります
    // ここでは例として、サービス層の統合テストの構造を示します
}

// テスト用のワークスペース作成ヘルパー
fn create_test_workspace() -> TempDir {
    let temp_dir = TempDir::new().unwrap();
    let workspace_path = temp_dir.path();
    
    // .hienmark ディレクトリを作成
    let hienmark_dir = workspace_path.join(".hienmark");
    fs::create_dir_all(&hienmark_dir).unwrap();
    
    temp_dir
}

#[tokio::test]
async fn test_workspace_service_load_and_save() {
    let temp_dir = create_test_workspace();
    let workspace_path = temp_dir.path();
    
    // テスト用のタスクファイルを作成
    let task_content = r#"---
status: todo
priority: 3
---

# Test Task
This is a test task.
"#;
    
    let task_file = workspace_path.join("test-task.md");
    fs::write(&task_file, task_content).unwrap();
    
    // WorkspaceServiceを使用してワークスペースを読み込む
    // 注意: 実際のコードパスは適切に調整してください
    // let service = WorkspaceService::new();
    // let workspace = service.load_workspace(workspace_path.to_path_buf()).unwrap();
    // 
    // assert_eq!(workspace.tasks.len(), 1);
    // assert!(workspace.tasks.contains_key("test-task"));
}

#[tokio::test]
async fn test_tag_validator_integration() {
    // TagValidatorの統合テスト
    // FrontMatterの型検証と自動補正が実際に動作することを検証
    
    // let front_matter = /* ... */;
    // let tag_configs = /* ... */;
    // let result = TagValidator::validate_and_correct(&front_matter, &tag_configs);
    // 
    // assert!(!result.corrections.is_empty());
}

#[tokio::test]
async fn test_frontmatter_sync_integration() {
    // FrontMatter同期の統合テスト
    
    // let local = /* ... */;
    // let remote = /* ... */;
    // let diff = FrontMatterSyncService::diff(&local, &remote);
    // let merged = FrontMatterSyncService::merge(&diff, SyncMode::LocalFirst, &remote);
}

#[tokio::test]
async fn test_tag_index_cache_integration() {
    // TagIndexCacheの統合テスト
    // キャッシュの更新と差分検出が正しく動作することを検証
    
    // let cache = TagIndexCache::new();
    // cache.update_entry(/* ... */);
    // let tag_index = cache.build_tag_index();
}

#[tokio::test]
async fn test_async_analysis_service_integration() {
    // 非同期分析サービスの統合テスト
    
    // let cache = TagIndexCache::new();
    // let changed = AsyncAnalysisService::detect_changed_files(&cache, &path, None).await.unwrap();
}

