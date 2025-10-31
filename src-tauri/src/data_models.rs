use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub name: String,
    pub start_time: i64,
    pub end_time: i64,
    pub progress: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DependencyType {
    FinishToStart,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dependency {
    pub from_task_id: String,
    pub to_task_id: String,
    pub dep_type: DependencyType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectData {
    pub tasks: Vec<Task>,
    pub dependencies: Vec<Dependency>,
}

impl Default for ProjectData {
    fn default() -> Self {
        Self { tasks: Vec::new(), dependencies: Vec::new() }
    }
}





