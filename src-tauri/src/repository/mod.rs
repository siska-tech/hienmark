// Repository layer for SQLite index management
pub mod database;
pub mod task_index_repository;
pub mod folder_index_repository;
pub mod asset_index_repository;
pub mod index_builder;

pub use database::IndexDatabase;
pub use task_index_repository::{TaskIndexRepository, SqliteTaskIndexRepository};
pub use folder_index_repository::{FolderIndexRepository, SqliteFolderIndexRepository};
pub use asset_index_repository::{AssetIndexRepository, SqliteAssetIndexRepository};
pub use index_builder::IndexBuilder;

