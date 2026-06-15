import { useChatStore } from '../../stores/chatStore';
import { useSessionStore } from '../../stores/sessionStore';

/** 上下文窗口大小（1M tokens） */
const CONTEXT_WINDOW = 1_000_000;
/** 警告阈值（80%） */
const WARNING_THRESHOLD = 0.8;
/** 轮数估算阈值 */
const TURN_COUNT_THRESHOLD = 45;

/**
 * 上下文消耗警告横幅
 * 当 token 使用量超过 80%（800K/1M）时，在输入框上方显示黄色警示条。
 * 如果 stream 中没有 token_usage 数据，回退到轮数估算（超过 45 轮）。
 */
export function ContextWarningBanner() {
  const selectedId = useSessionStore((s) => s.selectedSessionId);

  // 只在有活跃会话时才计算
  if (!selectedId) return null;

  // 用 getState 直接读（这个组件不频繁重渲染，用 subscribe 太重）
  const getTab = () => useChatStore.getState().getTab(selectedId);
  const tab = getTab();

  const meta = tab?.sessionMeta;
  const totalInput = meta?.totalInputTokens || 0;
  const turns = meta?.turns || 0;

  // 计算百分比
  const tokenPercent = totalInput > 0
    ? Math.round((totalInput / CONTEXT_WINDOW) * 100)
    : 0;

  // 判断是否触发警告
  const tokenWarn = totalInput > CONTEXT_WINDOW * WARNING_THRESHOLD;
  const turnWarn = totalInput === 0 && turns > TURN_COUNT_THRESHOLD;
  const shouldWarn = tokenWarn || turnWarn;

  if (!shouldWarn) return null;

  const displayPercent = tokenWarn ? tokenPercent : Math.round((turns / 60) * 100);
  const warnReason = tokenWarn
    ? `上下文已用 ${displayPercent}%（${Math.round(totalInput / 1000)}K / 1M tokens）`
    : `对话已进行 ${turns} 轮，上下文已用约 ${displayPercent}%`;

  return (
    <div className="px-4 py-2 mx-4 mb-1 rounded-xl
      bg-yellow-500/10 border border-yellow-500/30
      flex items-center gap-2.5 animate-fade-in">
      {/* 警告图标 */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="1.5"
        className="text-yellow-500 flex-shrink-0">
        <path d="M8 1.5L1.5 13h13L8 1.5z" />
        <path d="M8 6v3M8 11.5v.5" />
      </svg>

      {/* 警告文本 */}
      <span className="text-xs text-yellow-600 dark:text-yellow-400 flex-1">
        {warnReason}，建议保存进度后重启会话
      </span>

      {/* 快捷操作：新会话 */}
      <button
        onClick={() => {
          const currentTabId = useSessionStore.getState().selectedSessionId;
          if (currentTabId) {
            useChatStore.getState().saveToCache(currentTabId);
          }
          useSessionStore.getState().setSelectedSession(null);
        }}
        className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium
          bg-yellow-500/15 text-yellow-600 dark:text-yellow-400
          hover:bg-yellow-500/25 transition-smooth"
      >
        新会话
      </button>
    </div>
  );
}
