import { SessionListItem } from '../../lib/tauri-bridge';
import { t as tStatic } from '../../lib/i18n';

/** 格式化相对时间 */
function formatRelativeTime(ms: number): string {
  if (!ms) return '';
  const now = Date.now();
  const diff = now - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return tStatic('conv.justNow');
  if (minutes < 60) return `${minutes}${tStatic('conv.mAgo')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}${tStatic('conv.dAgo')}`;
  return new Date(ms).toLocaleDateString();
}

interface SessionItemProps {
  session: SessionListItem;
  isSelected: boolean;
  isRunning: boolean;
  displayName: string;
  onSelect: (session: SessionListItem) => void;
  onDelete?: (session: SessionListItem) => void;
}

export function SessionItem({
  session,
  isSelected,
  isRunning,
  displayName: name,
  onSelect,
  onDelete,
}: SessionItemProps) {
  return (
    <button
      {...(import.meta.env.DEV && { 'data-testid': `session-item-${session.id}` })}
      onClick={() => onSelect(session)}
      onContextMenu={(e) => {
        e.preventDefault();
        onDelete?.(session);
      }}
      className={`w-full text-left pl-3 pr-3 py-2 rounded-xl
        transition-smooth group
        ${isSelected
          ? 'bg-accent/10 ring-1 ring-accent/20'
          : 'hover:bg-bg-secondary'
        }`}
    >
      <div className="flex items-center gap-2">
        {/* 会话图标 */}
        <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center
          text-[10px] text-text-tertiary
          ${isRunning ? 'bg-success/10 text-success' : 'bg-bg-tertiary'}">
          {isRunning ? (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 2l10 6-10 6V2z" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" />
              <path d="M5 7l2 2 4-4" />
            </svg>
          )}
        </span>

        {/* 标题 */}
        <div className={`text-xs truncate leading-snug font-normal flex-1 min-w-0
          ${name ? 'text-text-primary' : 'text-text-muted italic'}`}>
          {name || tStatic('conv.newChat')}
        </div>

        {/* 运行中指示 */}
        {isRunning && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-success
            shadow-[0_0_6px_var(--color-accent-glow)]
            animate-pulse-soft" />
        )}

        {/* 时间 */}
        <span className="text-[10px] text-text-tertiary flex-shrink-0">
          {formatRelativeTime(session.modifiedAt)}
        </span>

        {/* 删除按钮（悬停显示） */}
        {onDelete && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session);
            }}
            className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100
              hover:bg-bg-tertiary transition-smooth text-text-tertiary hover:text-error"
            title="删除"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5" />
              <path d="M3 4l1 10a1 1 0 001 1h6a1 1 0 001-1l1-10" />
            </svg>
          </span>
        )}
      </div>
    </button>
  );
}
