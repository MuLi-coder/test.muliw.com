import './globals.css';

export const metadata = {
  title: '北京景点候选',
  description: '挑选你想去的北京景点',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}