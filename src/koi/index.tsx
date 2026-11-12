import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('[koi] #root 容器不存在，index.html 被改坏了');
}

const root = createRoot(container);
root.render(<App />);

// iframe 生命周期守卫：楼层被销毁时卸载 React，避免事件监听/计时器泄漏。
window.addEventListener('pagehide', () => {
  try {
    root.unmount();
  } catch {
    // 已卸载则忽略
  }
});
