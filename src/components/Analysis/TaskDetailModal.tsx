/**
 * Task Detail Modal Component
 * 
 * Displays detailed information about a selected task from Gantt chart
 */

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './TaskDetailModal.css';

export interface TaskData {
  taskId: string;
  name: string;
  status?: string;
  section?: string;
  start: string;
  end: string;
  dependsOn?: string;
}

export interface TaskDetailModalProps {
  task: TaskData | null;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onOpenTask,
}) => {
  if (!task) return null;
  const { t, language } = useLanguage();

  const startDate = new Date(task.start);
  const endDate = new Date(task.end);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const statusColors: Record<string, string> = {
    'done': '#67C23A',
    'completed': '#67C23A',
    'progress': '#409EFF',
    'in-progress': '#409EFF',
    'todo': '#909399',
    'pending': '#909399',
    'blocked': '#F56C6C',
    'cancelled': '#909399',
    'unknown': '#C0C4CC',
  };

  const statusColor = statusColors[task.status?.toLowerCase() || 'unknown'] || '#C0C4CC';

  return (
    <div className="task-detail-modal-overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail-header">
          <h2>{t.analysis.taskDetail.title}</h2>
          <button className="close-button" onClick={onClose} aria-label={t.analysis.taskDetail.close} title={t.analysis.taskDetail.close}>
            ×
          </button>
        </div>

        <div className="task-detail-content">
          <div className="task-detail-section">
            <label>{t.analysis.taskDetail.taskId}</label>
            <div className="task-detail-value task-id">{task.taskId}</div>
          </div>

          <div className="task-detail-section">
            <label>{t.analysis.taskDetail.name}</label>
            <div className="task-detail-value">{task.name}</div>
          </div>

          <div className="task-detail-section">
            <label>{t.analysis.taskDetail.status}</label>
            <div className="task-detail-value">
              <span 
                className="status-badge" 
                style={{ backgroundColor: statusColor }}
              >
                {task.status || t.analysis.taskDetail.unset}
              </span>
            </div>
          </div>

          {task.section && (
            <div className="task-detail-section">
              <label>{t.analysis.taskDetail.section}</label>
              <div className="task-detail-value">{task.section}</div>
            </div>
          )}

          <div className="task-detail-section">
            <label>{t.analysis.taskDetail.startDate}</label>
            <div className="task-detail-value">
              {startDate.toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'vi' ? 'vi-VN' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div className="task-detail-section">
            <label>{t.analysis.taskDetail.endDate}</label>
            <div className="task-detail-value">
              {endDate.toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'vi' ? 'vi-VN' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div className="task-detail-section">
            <label>{t.analysis.taskDetail.duration}</label>
            <div className="task-detail-value">{duration} {t.analysis.taskDetail.days}</div>
          </div>

          {task.dependsOn && (
            <div className="task-detail-section">
              <label>{t.analysis.taskDetail.dependsOn}</label>
              <div className="task-detail-value">{task.dependsOn}</div>
            </div>
          )}
        </div>

        {onOpenTask && (
          <div className="task-detail-footer">
            <button 
              className="btn-open-task"
              onClick={() => {
                onOpenTask(task.taskId);
                onClose();
              }}
            >
              {t.analysis.taskDetail.openTask}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

