import { useCallback, useRef } from 'react';
import { useSettingsStore, type BackgroundType } from '../../stores/settingsStore';

/** 背景类型选项 */
const BG_TYPE_OPTIONS: { id: BackgroundType; label: string }[] = [
  { id: 'color', label: '纯色' },
  { id: 'image', label: '静态图片' },
  { id: 'video', label: '动态视频' },
];

/** 预设颜色 */
const PRESET_COLORS = [
  '#0a0a0a', '#1a1a2e', '#16213e', '#0f3460',
  '#1b1b2f', '#2d2d44', '#1e1e2e', '#111111',
  '#000000', '#1c1c1c', '#2c2c2c', '#0d0d0d',
];

export function BackgroundPanel() {
  const bgType = useSettingsStore((s) => s.bgType);
  const bgColor = useSettingsStore((s) => s.bgColor);
  const bgImagePath = useSettingsStore((s) => s.bgImagePath);
  const bgVideoPath = useSettingsStore((s) => s.bgVideoPath);
  const bgBlur = useSettingsStore((s) => s.bgBlur);
  const bgOpacity = useSettingsStore((s) => s.bgOpacity);

  const setBgType = useSettingsStore((s) => s.setBgType);
  const setBgColor = useSettingsStore((s) => s.setBgColor);
  const setBgImagePath = useSettingsStore((s) => s.setBgImagePath);
  const setBgVideoPath = useSettingsStore((s) => s.setBgVideoPath);
  const setBgBlur = useSettingsStore((s) => s.setBgBlur);
  const setBgOpacity = useSettingsStore((s) => s.setBgOpacity);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 处理图片选择
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImagePath(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [setBgImagePath]);

  // 处理视频选择
  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBgVideoPath(url);
  }, [setBgVideoPath]);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-text-primary">窗口背景</h3>
      <p className="text-xs text-text-muted -mt-4">设置主窗口的背景样式，支持纯色、图片和视频。</p>

      {/* 背景类型选择 */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">背景类型</label>
        <div className="flex gap-2">
          {BG_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setBgType(opt.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-smooth
                ${bgType === opt.id
                  ? 'bg-accent text-text-inverse'
                  : 'bg-bg-secondary text-text-muted hover:text-text-primary border border-border-subtle'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 纯色选择 */}
      {bgType === 'color' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">背景颜色</label>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-10 h-10 rounded-lg border-2 border-border-subtle cursor-pointer
                bg-transparent p-0.5"
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-subtle
                text-xs text-text-primary font-mono outline-none
                focus:border-border-focus transition-smooth"
              placeholder="#000000"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className="w-7 h-7 rounded-lg border-2 transition-smooth hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: bgColor === color ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* 图片上传 */}
      {bgType === 'image' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">背景图片</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            {bgImagePath ? (
              <div className="flex-1 flex items-center gap-2">
                <img
                  src={bgImagePath}
                  alt="背景预览"
                  className="w-12 h-8 rounded object-cover border border-border-subtle"
                />
                <span className="text-xs text-text-muted truncate">已选择图片</span>
              </div>
            ) : (
              <span className="text-xs text-text-tertiary flex-1">未选择图片</span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                bg-bg-secondary text-text-primary border border-border-subtle
                hover:bg-bg-tertiary transition-smooth"
            >
              选择图片
            </button>
            {bgImagePath && (
              <button
                onClick={() => setBgImagePath('')}
                className="px-2 py-1.5 rounded-lg text-xs
                  text-text-muted hover:text-error transition-smooth"
              >
                清除
              </button>
            )}
          </div>
          <p className="text-[10px] text-text-tertiary mt-1">
            或直接输入图片路径/URL：
          </p>
          <input
            type="text"
            value={bgImagePath}
            onChange={(e) => setBgImagePath(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-subtle
              text-xs text-text-primary outline-none
              focus:border-border-focus transition-smooth"
            placeholder="/path/to/image.png 或 https://..."
          />
        </div>
      )}

      {/* 视频上传 */}
      {bgType === 'video' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">背景视频</label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            {bgVideoPath ? (
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-accent">视频已加载</span>
              </div>
            ) : (
              <span className="text-xs text-text-tertiary flex-1">未选择视频</span>
            )}
            <button
              onClick={() => videoInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                bg-bg-secondary text-text-primary border border-border-subtle
                hover:bg-bg-tertiary transition-smooth"
            >
              选择视频
            </button>
            {bgVideoPath && (
              <button
                onClick={() => {
                  if (bgVideoPath.startsWith('blob:')) URL.revokeObjectURL(bgVideoPath);
                  setBgVideoPath('');
                }}
                className="px-2 py-1.5 rounded-lg text-xs
                  text-text-muted hover:text-error transition-smooth"
              >
                清除
              </button>
            )}
          </div>
          <p className="text-[10px] text-text-tertiary mt-1">
            或直接输入视频路径：
          </p>
          <input
            type="text"
            value={bgVideoPath}
            onChange={(e) => setBgVideoPath(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border-subtle
              text-xs text-text-primary outline-none
              focus:border-border-focus transition-smooth"
            placeholder="/path/to/video.mp4"
          />
        </div>
      )}

      {/* 模糊程度 */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          模糊程度：{bgBlur}px
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={bgBlur}
          onChange={(e) => setBgBlur(Number(e.target.value))}
          className="w-full h-1.5 rounded-full bg-bg-tertiary appearance-none cursor-pointer
            accent-accent"
        />
        <div className="flex justify-between text-[10px] text-text-tertiary mt-0.5">
          <span>清晰</span>
          <span>模糊</span>
        </div>
      </div>

      {/* 不透明度 */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          不透明度：{bgOpacity}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={bgOpacity}
          onChange={(e) => setBgOpacity(Number(e.target.value))}
          className="w-full h-1.5 rounded-full bg-bg-tertiary appearance-none cursor-pointer
            accent-accent"
        />
        <div className="flex justify-between text-[10px] text-text-tertiary mt-0.5">
          <span>透明</span>
          <span>不透明</span>
        </div>
      </div>

      {/* 实时预览 */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">实时预览</label>
        <div
          className="relative w-full h-32 rounded-xl border border-border-subtle overflow-hidden"
          style={{ backgroundColor: bgType === 'color' ? bgColor : 'var(--color-bg-secondary)' }}
        >
          {/* 背景层 */}
          {bgType === 'image' && bgImagePath && (
            <img
              src={bgImagePath}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: `blur(${bgBlur}px)`,
                opacity: bgOpacity / 100,
              }}
            />
          )}
          {bgType === 'video' && bgVideoPath && (
            <video
              src={bgVideoPath}
              autoPlay
              loop
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: `blur(${bgBlur}px)`,
                opacity: bgOpacity / 100,
              }}
            />
          )}
          {bgType === 'color' && (
            <div
              className="absolute inset-0"
              style={{
                filter: `blur(${bgBlur}px)`,
                opacity: bgOpacity / 100,
              }}
            />
          )}
          {/* 模拟前景内容 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 rounded-lg bg-bg-card/60 backdrop-blur-sm border border-border-subtle/50">
              <span className="text-xs text-text-primary">预览效果</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
