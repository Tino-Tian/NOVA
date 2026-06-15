import { useEffect, useMemo, useCallback, useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useChatStore, generateMessageId } from '../../stores/chatStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFileStore } from '../../stores/fileStore';
import { useAgentStore } from '../../stores/agentStore';
import { bridge, SessionListItem } from '../../lib/tauri-bridge';
import { listen } from '@tauri-apps/api/event';
import { useT } from '../../lib/i18n';
import { parseSessionMessages } from '../../lib/session-loader';
import { SessionItem } from './SessionItem';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { teardownSession, waitForStdinCleared } from '../../lib/sessionLifecycle';

// --- 路径工具 ---

let _cachedHomeDir: string | null = null;
bridge.getHomeDir().then((h) => { _cachedHomeDir = h; }).catch(() => {});

function isWindowsAbsolutePath(p: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(p);
}

const _decodedCache = new Map<string, string>();
function resolveProjectPath(raw: string): string {
  if (raw.startsWith('/') || isWindowsAbsolutePath(raw)) return raw;
  if (raw.startsWith('~/') || raw === '~') {
    if (_cachedHomeDir) return raw.replace('~', _cachedHomeDir);
    return raw;
  }
  const cached = _decodedCache.get(raw);
  if (cached) return cached;
  bridge.decodeProjectDir(raw)
    .then((decoded) => { _decodedCache.set(raw, decoded); })
    .catch(() => {});
  if (/^[A-Za-z]-/.test(raw)) {
    const drive = raw[0];
    const rest = raw.slice(2);
    return `${drive}:\\${rest.replace(/-/g, '\\')}`;
  }
  return raw.replace(/-/g, '/');
}

// --- 主组件 ---

export function ConversationList() {
  const t = useT();

  // Store subscriptions
  const sessions = useSessionStore((s) => s.sessions);
  const isLoading = useSessionStore((s) => s.isLoading);
  const searchQuery = useSessionStore((s) => s.searchQuery);
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const setSearchQuery = useSessionStore((s) => s.setSearchQuery);
  const selectedId = useSessionStore((s) => s.selectedSessionId);
  const setSelected = useSessionStore((s) => s.setSelectedSession);
  const customPreviews = useSessionStore((s) => s.customPreviews);
  const runningSessions = useSessionStore((s) => s.runningSessions);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<SessionListItem | null>(null);

  // 初始加载 + 定时刷新
  useEffect(() => {
    fetchSessions().then(() => {
      const currentSelected = useSessionStore.getState().selectedSessionId;
      if (!currentSelected) {
        const lastId = useSessionStore.getState().getLastSessionId();
        if (lastId) {
          const sessions = useSessionStore.getState().sessions;
          const match = sessions.find((s) => s.id === lastId);
          if (match) {
            handleLoadSession(match);
          }
        }
      }
    });
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // 监听 sessions:changed 事件即时刷新
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen('sessions:changed', () => {
      fetchSessions();
    }).then((fn) => { unlisten = fn; }).catch(() => {});
    return () => { unlisten?.(); };
  }, [fetchSessions]);

  // 显示名称
  const displayName = useCallback((session: SessionListItem) => {
    return customPreviews[session.id] || session.preview || '';
  }, [customPreviews]);

  // 过滤 + 排序：按时间倒序平铺
  const filtered = useMemo(() => {
    let result = sessions;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          displayName(s).toLowerCase().includes(q) ||
          s.preview.toLowerCase().includes(q) ||
          s.project.toLowerCase().includes(q)
      );
    }

    // 按修改时间倒序（最新在上）
    return [...result].sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [sessions, searchQuery, displayName]);

  // --- 会话加载 ---
  const handleLoadSession = useCallback(async (session: SessionListItem) => {
    const { path: sessionPath, id: sessionId, project: projectOrDir } = session;
    const currentTabId = selectedId;
    if (currentTabId === sessionId) return;

    // 保存当前到缓存
    if (currentTabId) {
      useChatStore.getState().saveToCache(currentTabId);
      useAgentStore.getState().saveToCache(currentTabId);
    }

    // 关闭文件预览
    useFileStore.getState().closePreview();

    // 切换选中
    setSelected(sessionId);

    // 先尝试缓存
    const restored = useChatStore.getState().restoreFromCache(sessionId);
    if (restored) {
      useAgentStore.getState().restoreFromCache(sessionId);
      if (projectOrDir) {
        useSettingsStore.getState().setWorkingDirectory(resolveProjectPath(projectOrDir));
      }
      return;
    }

    // 草稿会话
    if (!sessionPath) {
      useChatStore.getState().ensureTab(sessionId);
      useChatStore.getState().resetTab(sessionId);
      useAgentStore.getState().clearAgents();
      return;
    }

    // 从磁盘加载
    useChatStore.getState().ensureTab(sessionId);
    useSettingsStore.getState().setWorkingDirectory(resolveProjectPath(projectOrDir));
    const { clearMessages, addMessage, setSessionStatus, setSessionMeta } = useChatStore.getState();
    const agentActions = useAgentStore.getState();
    clearMessages(sessionId);
    agentActions.clearAgents();
    setSessionStatus(sessionId, 'running');
    setSessionMeta(sessionId, { sessionId, stdinId: undefined });
    useSessionStore.getState().setCliResumeId(sessionId, sessionId);

    try {
      const rawMessages = await bridge.loadSession(sessionPath);
      if (useSessionStore.getState().selectedSessionId !== sessionId) {
        return;
      }
      const { messages, agents } = parseSessionMessages(rawMessages);

      for (const agent of agents) {
        agentActions.upsertAgent(agent);
      }

      for (const msg of messages) {
        if (msg.toolResultContent) {
          const { toolResultContent, ...baseMsg } = msg;
          addMessage(sessionId, baseMsg);
          useChatStore.getState().updateMessage(sessionId, msg.id, { toolResultContent });
        } else {
          addMessage(sessionId, msg);
        }
      }

      setSessionStatus(sessionId, 'completed');
    } catch (err) {
      if (useSessionStore.getState().selectedSessionId !== sessionId) return;
      setSessionStatus(sessionId, 'error');
      addMessage(sessionId, {
        id: generateMessageId(),
        role: 'system',
        type: 'text',
        content: `${t('conv.loadFailed')}: ${err}`,
        timestamp: Date.now(),
      });
    }
  }, [selectedId, setSelected, t]);

  // --- 删除处理 ---
  const executeDelete = useCallback(async (sessionId: string, sessionPath: string) => {
    try {
      const tab = useChatStore.getState().getTab(sessionId);
      const routedStdinIds = Object.entries(useSessionStore.getState().stdinToTab)
        .filter(([, tabId]) => tabId === sessionId)
        .map(([stdinId]) => stdinId);
      const stdinIds = Array.from(new Set([
        ...(tab?.sessionMeta.stdinId ? [tab.sessionMeta.stdinId] : []),
        ...routedStdinIds,
      ]));
      for (const stdinId of stdinIds) {
        await teardownSession(stdinId, sessionId, 'delete');
        if (tab?.sessionMeta.stdinId === stdinId) {
          await waitForStdinCleared(sessionId, stdinId).catch(() => {});
        }
      }

      if (sessionPath) {
        await bridge.deleteSession(sessionId, sessionPath);
      } else {
        useSessionStore.getState().removeDraft(sessionId);
      }
      if (selectedId === sessionId) {
        setSelected('');
        useChatStore.getState().resetTab(sessionId);
        useSettingsStore.getState().setWorkingDirectory('');
      }
      useChatStore.getState().removeFromCache(sessionId);
      useAgentStore.getState().clearCacheForTab(sessionId);
      bridge.clearPathGrants(sessionId).catch(() => {});
      fetchSessions();
    } catch (err) {
      console.error('删除会话失败:', err);
    }
  }, [selectedId, setSelected, fetchSessions]);

  const handleDeleteSingle = useCallback((session: SessionListItem) => {
    setDeleteTarget(session);
  }, []);

  return (
    <div className="flex flex-col gap-1 px-3">
      {/* 搜索框 */}
      <div className="px-1 mb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl
          bg-bg-secondary border border-border-subtle
          focus-within:border-border-focus transition-smooth">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5"
            className="text-text-tertiary flex-shrink-0">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('conv.search')}
            className="flex-1 bg-transparent text-xs text-text-primary
              placeholder:text-text-tertiary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="flex-shrink-0 p-0.5 rounded text-text-tertiary
                hover:text-text-primary transition-smooth">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 加载中 */}
      {isLoading && sessions.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent/30
            border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {/* 平铺会话列表（按时间倒序） */}
      {filtered.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isSelected={selectedId === session.id}
          isRunning={runningSessions.has(session.id)}
          displayName={displayName(session)}
          onSelect={handleLoadSession}
          onDelete={handleDeleteSingle}
        />
      ))}

      {/* 空状态 */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-8 px-4">
          <div className="text-text-tertiary text-xs">
            {searchQuery ? t('conv.noMatch') : t('conv.noConv')}
          </div>
        </div>
      )}

      {/* 刷新按钮 */}
      <button
        onClick={fetchSessions}
        className="mx-2 mt-2 py-1.5 rounded-lg text-[12px]
          text-text-muted hover:text-text-primary
          hover:bg-bg-secondary transition-smooth"
      >
        {t('conv.refresh')}
      </button>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title={t('conv.delete')}
          message={t('conv.deleteConfirm')}
          detail={displayName(deleteTarget) || deleteTarget.preview}
          variant="danger"
          confirmLabel={t('conv.delete')}
          onConfirm={() => {
            executeDelete(deleteTarget.id, deleteTarget.path);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
