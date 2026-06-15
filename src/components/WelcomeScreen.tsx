import { APP_NAME, APP_SUBTITLE } from '../lib/edition';
import { useT } from '../lib/i18n';

interface Props {
  onNewSession: () => void;
}

/** 开篇 Logo 展示 — 无会话时显示的欢迎页 */
export function WelcomeScreen({ onNewSession }: Props) {
  const t = useT();

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        {/* Diamond-N Logo */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <rect
            x="4" y="4" width="72" height="72"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            transform="rotate(45 40 40)"
            className="text-accent"
          />
          <text
            x="40" y="49"
            textAnchor="middle"
            fontFamily="Menlo, Consolas, Monaco, monospace"
            fontSize="32"
            fontWeight="700"
            className="fill-accent"
          >
            N
          </text>
        </svg>

        {/* 品牌名 */}
        <h1
          className="text-2xl font-bold text-text-primary tracking-[0.15em]"
          style={{ fontFamily: "'Menlo', 'Consolas', 'Monaco', 'Courier New', monospace" }}
        >
          {APP_NAME}
        </h1>

        {/* 副标题 */}
        <p className="text-sm text-text-secondary -mt-4">
          {APP_SUBTITLE}
        </p>

        {/* 新建会话按钮 */}
        <button
          onClick={onNewSession}
          className="mt-2 px-6 py-2.5 text-sm font-medium
            bg-accent text-text-inverse
            hover:bg-accent-hover
            transition-smooth cursor-pointer
            border border-transparent
            shadow-sm"
        >
          {t('sidebar.newChat')}
        </button>
      </div>
    </div>
  );
}
