import { useState, useEffect } from 'react';
import { useWorkspace } from './hooks/useWorkspace';
import { useTags } from './hooks/useTags';
import { useTemplates } from './hooks/useTemplates';
import { useTheme } from './hooks/useTheme';
import { useInitialization } from './hooks/useInitialization';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { TaskBrowser } from './components/TaskBrowser';
import { TaskEditor } from './components/TaskEditor';
import { TagSettingsView } from './components/TagManagement/TagSettingsView';
import { Settings } from './components/TagManagement/Settings';
import { TemplateManager } from './components/TemplateManagement';
import { TemplateSelector } from './components/TemplateSelector';
import { AnalysisDashboard } from './components/Analysis';
import { FolderTree } from './components/FolderTree';
import { Resizer } from './components/Resizer';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { TaskTabBar } from './components/TaskTabBar';
import type { EditorState } from './types/task';
import { ask } from '@tauri-apps/plugin-dialog';
import './App.css';

function AppContent() {
  const { t, language } = useLanguage();
  
  // Set data-language attribute on html element for CSS font selection
  useEffect(() => {
    document.documentElement.setAttribute('data-language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);
  const { workspace, loading, error, openWorkspace, createTask, saveTask, deleteTask, renameTask, reloadWorkspace } = useWorkspace();
  const { isInitializing, progress, message } = useInitialization({
    initializing: t.app.initializing,
    loadingLanguage: t.app.loadingLanguage,
    initializingComponents: t.app.initializingComponents,
    preparingWorkspace: t.app.preparingWorkspace,
    finalizing: t.app.finalizing,
    ready: t.app.ready,
  });
  const { tagIndex, tagConfigs } = useTags(workspace?.rootPath || null);
  const { templates, defaultTemplate, applyToNewTask } = useTemplates(workspace?.rootPath || null);
  const { theme, updateTheme } = useTheme(workspace?.rootPath || null);
  
  // タブUI状態管理
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editorStates, setEditorStates] = useState<Map<string, EditorState>>(new Map());
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTagSettingsView, setShowTagSettingsView] = useState(false);
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showAnalysisDashboard, setShowAnalysisDashboard] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarView, setSidebarView] = useState<'tasks' | 'folders'>('tasks');

  const handleOpenWorkspace = async () => {
    await openWorkspace();
  };

  // タブ操作のアクション
  const handleOpenTab = (taskId: string) => {
    // タブが既に開いていない場合、追加
    if (!openTabs.includes(taskId)) {
      setOpenTabs(prev => [...prev, taskId]);
      
      // 初期状態をeditorStatesに追加
      const task = workspace?.tasks[taskId];
      if (task) {
        setEditorStates(prev => {
          const newMap = new Map(prev);
          newMap.set(taskId, {
            frontMatter: task.frontMatter,
            editorContent: task.content,
            isDirty: false,
            tagOrder: task.tagOrder,
          });
          return newMap;
        });
      }
    }
    
    // アクティブタブに設定
    setActiveTabId(taskId);
    setSelectedTaskId(taskId);
  };

  const handleTabClick = (taskId: string) => {
    setActiveTabId(taskId);
    setSelectedTaskId(taskId);
  };

  const handleCloseTab = async (taskId: string) => {
    const editorState = editorStates.get(taskId);
    
    // isDirtyの場合、確認ダイアログを表示
    if (editorState?.isDirty) {
      try {
        // Tauri 2.xのdialog APIを使用
        const result = await ask(`'${taskId}' への変更を保存しますか？`, {
          title: '未保存の変更',
          kind: 'warning',
        });
        
        // キャンセルがクリックされた場合は何もしない
        // result が true の場合は保存、false の場合は保存しない
        if (result) {
          // 保存
          const task = workspace?.tasks[taskId];
          if (task && editorState) {
            const updatedTask = {
              ...task,
              frontMatter: editorState.frontMatter,
              content: editorState.editorContent,
              tagOrder: editorState.tagOrder,
            };
            await saveTask(updatedTask);
          }
        }
      } catch (err) {
        console.error('Failed to show dialog:', err);
        return;
      }
    }
    
    // タブを閉じる
    setOpenTabs(prev => prev.filter(id => id !== taskId));
    setEditorStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    
    // 閉じたタブがアクティブだった場合、次のタブをアクティブに
    if (activeTabId === taskId) {
      const remainingTabs = openTabs.filter(id => id !== taskId);
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[remainingTabs.length - 1]);
        setSelectedTaskId(remainingTabs[remainingTabs.length - 1]);
      } else {
        setActiveTabId(null);
        setSelectedTaskId(null);
      }
    }
  };

  const handleUpdateEditorState = (taskId: string, updates: Partial<EditorState>) => {
    setEditorStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(taskId);
      if (currentState) {
        newMap.set(taskId, { ...currentState, ...updates });
      }
      return newMap;
    });
  };

  // 旧API互換性のため残す
  const handleTaskSelect = async (taskId: string) => {
    handleOpenTab(taskId);
  };


  const handleTaskCreate = async () => {
    const taskId = prompt('Enter task ID (filename):');
    if (!taskId) return;

    // テンプレートが利用可能な場合は選択ダイアログを表示
    if (templates.length > 0) {
      setPendingTaskId(taskId);
      setShowTemplateSelector(true);
    } else {
      // テンプレートがない場合は空のタスクで作成
      const initialContent = '# New Task\n\nStart writing...';
      const newTask = await createTask(taskId, initialContent);
      if (newTask) {
        setSelectedTaskId(taskId);
      }
    }
  };

  const handleTemplateSelect = async (templateName: string | null) => {
    if (!pendingTaskId) return;

    let initialContent = '# New Task\n\nStart writing...';
    
    if (templateName) {
      try {
        initialContent = await applyToNewTask(templateName, initialContent);
      } catch (err) {
        console.warn('Failed to apply template:', err);
        // テンプレート適用に失敗した場合は空のタスクで作成
      }
    }

    const newTask = await createTask(pendingTaskId, initialContent);
    if (newTask) {
      setSelectedTaskId(pendingTaskId);
    }

    setShowTemplateSelector(false);
    setPendingTaskId(null);
  };

  const handleTemplateSelectorCancel = () => {
    setShowTemplateSelector(false);
    setPendingTaskId(null);
  };

  const handleTaskSave = async (task: any) => {
    const success = await saveTask(task);
    if (success) {
      console.log('Task saved successfully');
      // editorStatesのisDirtyをfalseに更新
      setEditorStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(task.id);
        if (currentState) {
          newMap.set(task.id, { ...currentState, isDirty: false });
        }
        return newMap;
      });
    }
  };

  // TaskEditorからisDirty状態を受け取る
  const handleDirtyChange = (taskId: string, dirty: boolean) => {
    setEditorStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(taskId);
      if (currentState) {
        newMap.set(taskId, { ...currentState, isDirty: dirty });
      }
      return newMap;
    });
  };

  const handleEditorClose = () => {
    setSelectedTaskId(null);
  };

  const handleTaskDelete = async (taskId: string) => {
    const success = await deleteTask(taskId);
    if (success) {
      console.log('Task deleted successfully');
      // 削除されたタスクが選択されていた場合、選択を解除
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    }
  };

  const handleTaskRename = async (oldTaskId: string, newTaskId: string) => {
    const success = await renameTask(oldTaskId, newTaskId);
    if (success) {
      console.log('Task renamed successfully');
      // リネームされたタスクが選択されていた場合、新しいIDに更新
      if (selectedTaskId === oldTaskId) {
        setSelectedTaskId(newTaskId);
      }
    }
  };

  const handleSidebarResize = (delta: number) => {
    setSidebarWidth(prev => {
      const newWidth = prev + delta;
      // Min: 280px, Max: 600px
      return Math.min(Math.max(newWidth, 280), 600);
    });
  };

  // タイトルバーのテキストを生成
  const getTitleBarText = (): string => {
    if (showTagSettingsView) {
      return `${t.tags.management} - HienMark`;
    } else if (showTagSettings) {
      return `${t.settings.title} - HienMark`;
    } else if (showTemplateManager) {
      return `${t.templates.title} - HienMark`;
    } else if (showAnalysisDashboard) {
      return `タスク分析 - HienMark`;
    } else if (selectedTaskId && workspace?.tasks[selectedTaskId]) {
      return `${selectedTaskId} - HienMark`;
    } else if (workspace) {
      return `HienMark`;
    }
    return 'HienMark';
  };

  // Show splash screen during initialization
  if (isInitializing) {
    return <SplashScreen progress={progress} message={message} />;
  }

  return (
    <div className="app">
      <TitleBar title={getTitleBarText()} />
      <header className="app-header">
        <h1>
          <img src="/icon.png" alt="HienMark" className="app-icon" />
          {t.app.title} <span className="subtitle">- {t.app.subtitle}</span>
        </h1>
        {workspace && (
          <div className="workspace-info">
            <div className="workspace-actions-left">
              <button
                className="btn-workspace-change"
                onClick={handleOpenWorkspace}
                title={t.app.openWorkspace}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </button>
            </div>
            <span className="workspace-path">{workspace.rootPath}</span>
            <div className="workspace-actions-right">
              <button
                className={`btn-tag-manager ${showTagSettingsView ? 'active' : 'inactive'}`}
                onClick={() => {
                  setShowTagSettingsView(!showTagSettingsView);
                  setShowTagSettings(false);
                  setShowTemplateManager(false);
                  setShowAnalysisDashboard(false);
                }}
                title={showTagSettingsView ? t.app.showTasks : t.tags.management}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
              </button>
              <button
                className={`btn-template-manager ${showTemplateManager ? 'active' : 'inactive'}`}
                onClick={() => {
                  setShowTemplateManager(!showTemplateManager);
                  setShowTagSettingsView(false);
                  setShowTagSettings(false);
                  setShowAnalysisDashboard(false);
                }}
                title={showTemplateManager ? t.app.showTasks : t.templates.title}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              </button>
              <button
                className={`btn-analysis-dashboard ${showAnalysisDashboard ? 'active' : 'inactive'}`}
                onClick={() => {
                  setShowAnalysisDashboard(!showAnalysisDashboard);
                  setShowTagSettingsView(false);
                  setShowTagSettings(false);
                  setShowTemplateManager(false);
                }}
                title={showAnalysisDashboard ? t.app.showTasks : 'タスク分析'}
              >
                <svg
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
                  <path d="M3 3v18h18" />
                  <rect x="7" y="10" width="4" height="8" rx="1" />
                  <rect x="13" y="4" width="4" height="14" rx="1" />
                </svg>
              </button>
              <button
                className={`btn-tag-settings ${showTagSettings ? 'active' : 'inactive'}`}
                onClick={() => {
                  setShowTagSettings(!showTagSettings);
                  setShowTagSettingsView(false);
                  setShowTemplateManager(false);
                  setShowAnalysisDashboard(false);
                }}
                title={showTagSettings ? t.app.showTasks : t.app.tagSettings}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="app-main">
        {error && (
          <div className="error">
            <p>{t.common.error}: {error}</p>
          </div>
        )}

        {loading && (
          <div className="workspace-container">
            <div className="loading">
              <p>{t.app.loading}</p>
            </div>
          </div>
        )}

        {!loading && !workspace ? (
          <div className="welcome">
            <h2>{t.app.welcome}</h2>
            <p>{t.app.welcomeMessage}</p>
            <button className="btn-primary" onClick={handleOpenWorkspace}>
              {t.app.openWorkspace}
            </button>
          </div>
        ) : !loading && workspace ? (
          <div className={`workspace-container ${showAnalysisDashboard ? 'workspace-container-analysis' : ''}`}>
            {showAnalysisDashboard ? (
              <AnalysisDashboard
                workspacePath={workspace.rootPath}
                onOpenTask={(taskId) => {
                  setShowAnalysisDashboard(false);
                  handleTaskSelect(taskId);
                }}
              />
            ) : showTemplateManager ? (
              <TemplateManager
                workspacePath={workspace.rootPath}
                tagIndex={tagIndex}
                onClose={() => setShowTemplateManager(false)}
              />
            ) : showTagSettingsView ? (
              <TagSettingsView
                workspacePath={workspace.rootPath}
                workspace={workspace}
                onClose={() => setShowTagSettingsView(false)}
                onOpenTask={(taskId) => {
                  setShowTagSettingsView(false);
                  handleTaskSelect(taskId);
                }}
              />
            ) : showTagSettings ? (
              <Settings
                workspacePath={workspace.rootPath}
                tagIndex={tagIndex}
                onClose={() => setShowTagSettings(false)}
                currentTheme={theme}
                onThemeChange={updateTheme}
                onConfigUpdate={async (_newConfig) => {
                  // 即時にアプリ状態へ反映（保存はSettings側で済んでいる）
                  try {
                    // 追加の保存は避け、最新設定を素早くUIへ適用
                    // フルリロードでの整合も確保
                    await reloadWorkspace();
                  } catch (e) {
                    console.warn('Failed to reload workspace after config update:', e);
                  }
                }}
              />
            ) : (
              <>
                <aside className="workspace-sidebar" style={{ width: `${sidebarWidth}px` }}>
                  <div className="sidebar-tabs">
                    <button
                      className={`sidebar-tab ${sidebarView === 'tasks' ? 'active' : ''}`}
                      onClick={() => setSidebarView('tasks')}
                      title="Tasks"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>Tasks</span>
                    </button>
                    <button
                      className={`sidebar-tab ${sidebarView === 'folders' ? 'active' : ''}`}
                      onClick={() => setSidebarView('folders')}
                      title="Folders"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Folders</span>
                    </button>
                  </div>
                  <div className="sidebar-content">
                    {sidebarView === 'tasks' ? (
                      <TaskBrowser
                        tasks={workspace.tasks}
                        onTaskSelect={handleTaskSelect}
                        onTaskCreate={handleTaskCreate}
                        onTaskDelete={handleTaskDelete}
                        onTaskRename={handleTaskRename}
                        workspacePath={workspace.rootPath}
                        tagConfigs={tagConfigs}
                        selectedTaskId={selectedTaskId || undefined}
                      />
                    ) : (
                      <FolderTree
                        tasks={workspace.tasks}
                        workspacePath={workspace.rootPath}
                        onTaskSelect={handleTaskSelect}
                        selectedTaskId={selectedTaskId || undefined}
                      />
                    )}
                  </div>
                </aside>

                <Resizer onResize={handleSidebarResize} direction="horizontal" />

                <section className="workspace-content">
                  <div className="workspace-editor-container">
                    {/* タブバー */}
                    <TaskTabBar
                      openTabs={openTabs}
                      activeTabId={activeTabId}
                      tabStates={new Map(
                        Array.from(editorStates.entries()).map(([id, state]) => [
                          id,
                          { isDirty: state.isDirty },
                        ])
                      )}
                      onTabClick={handleTabClick}
                      onTabClose={handleCloseTab}
                    />
                    
                    {/* エディタ */}
                    {selectedTaskId && workspace.tasks[selectedTaskId] ? (
                      <TaskEditor
                        task={workspace.tasks[selectedTaskId]}
                        onSave={handleTaskSave}
                        onClose={handleEditorClose}
                        tagIndex={tagIndex}
                        workspacePath={workspace.rootPath}
                        workspace={workspace}
                        onDirtyChange={handleDirtyChange}
                        activeTabId={selectedTaskId}
                        editorState={editorStates.get(selectedTaskId) || undefined}
                        onUpdateEditorState={handleUpdateEditorState}
                        autoSaveEnabled={workspace.config.autoSaveEnabled ?? true}
                        autoSaveInterval={workspace.config.autoSaveInterval ?? 3000}
                        scrollSync={workspace.config.scrollSync ?? true}
                        wordWrap={workspace.config.wordWrap ?? false}
                        editorFontFamily={workspace.config.editorFontFamily}
                        editorFontSize={workspace.config.editorFontSize}
                        onOpenTask={handleOpenTab}
                      />
                    ) : (
                      <div className="no-task-selected">
                        <p>{t.app.noTaskSelected}</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        ) : null}
      </main>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          defaultTemplate={defaultTemplate}
          onSelect={handleTemplateSelect}
          onCancel={handleTemplateSelectorCancel}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
