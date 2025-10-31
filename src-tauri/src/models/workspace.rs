use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use super::{Task, TagIndex, TemplateCollection, TagConfigCollection};

/// アプリケーションのワークスペース状態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    /// ワークスペースのルートディレクトリ
    #[serde(rename = "rootPath")]
    pub root_path: PathBuf,

    /// 読み込まれた全タスク (ID → Task)
    pub tasks: HashMap<String, Task>,

    /// タグインデックス
    #[serde(rename = "tagIndex")]
    pub tag_index: TagIndex,

    /// 設定
    pub config: WorkspaceConfig,
}

impl Workspace {
    pub fn new(root_path: PathBuf) -> Self {
        Self {
            root_path,
            tasks: HashMap::new(),
            tag_index: TagIndex::new(),
            config: WorkspaceConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    /// タグ固定モード有効化
    #[serde(rename = "strictTagMode")]
    pub strict_tag_mode: bool,

    /// 許可されたタグカテゴリ (固定モード時のみ)
    #[serde(rename = "allowedCategories")]
    pub allowed_categories: Vec<String>,

    /// ファイル監視の有効化
    #[serde(rename = "watchEnabled")]
    pub watch_enabled: bool,

    /// タグテンプレートコレクション
    #[serde(default)]
    pub templates: TemplateCollection,

    /// タグ設定コレクション
    #[serde(default)]
    pub tag_configs: TagConfigCollection,

    /// 自動保存の有効化
    #[serde(rename = "autoSaveEnabled", default)]
    pub auto_save_enabled: bool,

    /// 自動保存までの時間（ミリ秒）
    #[serde(rename = "autoSaveInterval", default)]
    pub auto_save_interval: u64,

    /// カラーテーマ
    #[serde(rename = "theme", default)]
    pub theme: Option<String>,

    /// エディタフォントファミリ
    #[serde(rename = "editorFontFamily", default)]
    pub editor_font_family: Option<String>,

    /// エディタフォントサイズ
    #[serde(rename = "editorFontSize", default)]
    pub editor_font_size: Option<u32>,

    /// ワードラップ
    #[serde(rename = "wordWrap", default)]
    pub word_wrap: bool,

    /// スクロール同期
    #[serde(rename = "scrollSync", default)]
    pub scroll_sync: bool,

    /// デフォルトのタスクテンプレート名
    #[serde(rename = "defaultTaskTemplate", default)]
    pub default_task_template: Option<String>,

    /// デフォルトのソート順
    #[serde(rename = "defaultSortOrder", default)]
    pub default_sort_order: Option<String>,

    /// Git連携の有効化
    #[serde(rename = "gitIntegration", default)]
    pub git_integration: bool,
}

impl Default for WorkspaceConfig {
    fn default() -> Self {
        Self {
            strict_tag_mode: false,
            allowed_categories: vec![
                "status".to_string(),
                "priority".to_string(),
                "tags".to_string(),
            ],
            watch_enabled: true,
            templates: TemplateCollection::new(),
            tag_configs: TagConfigCollection::create_default_configs(),
            auto_save_enabled: true,
            auto_save_interval: 3000,
            theme: None,
            editor_font_family: None,
            editor_font_size: None,
            word_wrap: false,
            scroll_sync: true,
            default_task_template: None,
            default_sort_order: None,
            git_integration: false,
        }
    }
}
