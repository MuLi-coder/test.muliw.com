import './globals.css';

export const metadata = {
  title: '待办事项 Todo',
  description: '一个简单的全栈待办事项应用（Next.js + 原生 JS）',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}