// モジュール宣言
mod models;
mod parser;
mod commands;
mod data_models;
mod service;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .manage(commands::watcher_commands::WatcherState::new())
    .invoke_handler(tauri::generate_handler![
      commands::open_workspace,
      commands::list_tasks,
      commands::get_task,
      commands::create_task,
      commands::save_task,
      commands::delete_task,
      commands::rename_task,
      commands::get_tag_index,
      commands::rename_tag,
      commands::delete_tag,
      commands::get_workspace_config,
      commands::update_workspace_config,
      commands::start_file_watcher,
      commands::stop_file_watcher,
      commands::list_templates,
      commands::get_template,
      commands::get_default_template,
      commands::create_template,
      commands::update_template,
      commands::delete_template,
      commands::rename_template,
      commands::set_default_template,
      commands::apply_template_to_new_task,
      commands::apply_template_to_existing_task,
      commands::create_template_from_task,
      commands::preview_template,
      commands::get_filters_and_sorts,
      commands::save_filters_and_sorts,
      commands::get_app_settings,
      commands::save_app_settings,
      commands::load_tag_schema,
      commands::save_tag_schema,
      commands::get_dynamic_default_value,
      commands::generate_gantt_chart,
      commands::generate_pie_chart,
      commands::generate_bar_chart,
      commands::generate_line_chart,
      // R-6.6.2: Dual output API with DSL
      commands::generate_gantt_chart_with_dsl,
      commands::generate_gantt_chart_with_dsl_mapped,
      commands::generate_gantt_chart_with_dsl_filtered,
      commands::generate_pie_chart_with_dsl,
      commands::generate_bar_chart_with_dsl,
      commands::generate_line_chart_with_dsl,
      // R-6.8.x: Filtered + Export APIs
      commands::generate_pie_chart_with_dsl_filtered,
      commands::generate_bar_chart_with_dsl_filtered,
      commands::generate_line_chart_with_dsl_filtered,
      commands::generate_gantt_chart_with_dsl_mapped_filtered,
      commands::export_chart_json,
      commands::generate_analysis_report,
      // Analysis settings
      commands::load_analysis_settings,
      commands::save_analysis_settings,
      // Gantt persistence
      commands::load_project,
      commands::save_project,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
