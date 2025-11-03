/**
 * Folder Tree View Component
 * Displays the folder hierarchy based on file paths
 */

import { useState, useMemo } from 'react';
import type { Task } from '../../types/task';
import './FolderTree.css';

interface FolderNode {
  name: string;
  fullPath: string;
  children: FolderNode[];
  tasks: string[]; // Task IDs in this folder
  level: number;
}

interface FolderTreeProps {
  tasks: Record<string, Task>;
  workspacePath: string;
  onTaskSelect?: (taskId: string) => void;
  selectedTaskId?: string;
}

export function FolderTree({ tasks, workspacePath, onTaskSelect, selectedTaskId }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  // Build folder tree from tasks
  const folderTree = useMemo(() => {
    const root: FolderNode = {
      name: 'root',
      fullPath: '',
      children: [],
      tasks: [],
      level: 0,
    };

    const folderMap = new Map<string, FolderNode>();
    folderMap.set('', root);

    // Process all tasks
    Object.entries(tasks).forEach(([taskId, task]) => {
      const relativePath = task.filePath.replace(workspacePath, '').replace(/^[\/\\]+/, '');
      
      // Split path into segments
      const pathSegments = relativePath.split(/[\/\\]/).filter(s => s);
      
      // If task is in root, add to root
      if (pathSegments.length === 0 || pathSegments.length === 1) {
        root.tasks.push(taskId);
        return;
      }

      // Build folder hierarchy (excluding the filename)
      const folderPath = pathSegments.slice(0, -1);
      let currentPath = '';
      
      folderPath.forEach((segment, index) => {
        const previousPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        
        if (!folderMap.has(currentPath)) {
          const node: FolderNode = {
            name: segment,
            fullPath: currentPath,
            children: [],
            tasks: [],
            level: index + 1,
          };
          
          folderMap.set(currentPath, node);
          
          const parent = folderMap.get(previousPath);
          if (parent) {
            parent.children.push(node);
          }
        }
      });

      // Add task to the deepest folder
      const deepestFolder = folderMap.get(currentPath);
      if (deepestFolder) {
        deepestFolder.tasks.push(taskId);
      }
    });

    // Sort folders and tasks
    const sortNode = (node: FolderNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.tasks.sort((a, b) => a.localeCompare(b));
      node.children.forEach(sortNode);
    };
    
    sortNode(root);

    return root;
  }, [tasks, workspacePath]);

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Render folder node
  const renderFolderNode = (node: FolderNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const hasTasks = node.tasks.length > 0;
    const isExpanded = expandedFolders.has(node.fullPath);
    const isRoot = node.fullPath === '';

    // Don't render root if it has no tasks or children
    if (isRoot && !hasChildren && !hasTasks) {
      return null;
    }

    // Skip root in rendering, render its children directly
    if (isRoot) {
      return (
        <div className="folder-tree-content">
          {node.children.map(child => renderFolderNode(child))}
          {node.tasks.length > 0 && (
            <div className="folder-level-0">
              <div className="folder-indent" />
              {node.tasks.map(taskId => renderTaskItem(taskId, 0))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={node.fullPath} className="folder-node">
        <div
          className={`folder-item ${isExpanded ? 'expanded' : ''}`}
          onClick={() => toggleFolder(node.fullPath)}
          role="button"
          aria-expanded={hasChildren ? isExpanded : undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFolder(node.fullPath);
            }
          }}
        >
          <div className="folder-indent" style={{ width: `${node.level * 16}px` }} />
          {hasChildren && (
            <button className="folder-toggle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isExpanded ? (
                  <polyline points="18 15 12 9 6 15"></polyline>
                ) : (
                  <polyline points="6 9 12 15 18 9"></polyline>
                )}
              </svg>
            </button>
          )}
          {!hasChildren && <div className="folder-toggle-spacer" />}
          <svg
            className="folder-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isExpanded ? (
              <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h12a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2z" />
            ) : (
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            )}
          </svg>
          <span className="folder-name">{node.name}</span>
          <span className="folder-count">{node.children.length + node.tasks.length}</span>
        </div>

        {isExpanded && (
          <div className="folder-children">
            {node.children.map(child => renderFolderNode(child))}
            {node.tasks.map(taskId => renderTaskItem(taskId, node.level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render task item
  const renderTaskItem = (taskId: string, level: number): React.ReactNode => {
    const task = tasks[taskId];
    if (!task) return null;

    const isSelected = selectedTaskId === taskId;

    return (
      <div
        key={taskId}
        className={`folder-tree-task ${isSelected ? 'selected' : ''}`}
        onClick={() => onTaskSelect?.(taskId)}
        role="button"
        aria-selected={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTaskSelect?.(taskId);
          }
        }}
      >
        <div className="folder-indent" style={{ width: `${level * 16}px` }} />
        <svg
          className="folder-tree-task-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="folder-tree-task-name" title={taskId}>
          {taskId}
        </span>
      </div>
    );
  };

  return (
    <div className="folder-tree">
      <div className="folder-tree-header">
        <h3>Folders</h3>
      </div>
      <div className="folder-tree-body">
        {renderFolderNode(folderTree)}
      </div>
    </div>
  );
}
