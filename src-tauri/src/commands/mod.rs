// Tauri commands
pub mod workspace_commands;
pub mod watcher_commands;
pub mod tag_commands;
pub mod template_commands;
pub mod filter_sort_commands;
pub mod app_settings_commands;
pub mod tag_schema_commands;
pub mod analysis_commands;
pub mod gantt_commands;

// Re-export all commands for easy registration
pub use workspace_commands::*;
pub use watcher_commands::*;
pub use tag_commands::*;
pub use template_commands::*;
pub use filter_sort_commands::*;
pub use app_settings_commands::*;
pub use tag_schema_commands::*;
pub use analysis_commands::*;
pub use gantt_commands::*;
