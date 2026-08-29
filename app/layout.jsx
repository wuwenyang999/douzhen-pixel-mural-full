import './globals.css';
import Link from 'next/link';
import Header from '../components/Header.jsx';

export const metadata = {
  title: '豆阵｜原创拼豆工程图纸',
  description: '原创超大型拼豆壁画与立体拼豆潮玩图纸。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main>{children}</main>
        <footer>
          <span>豆阵 · 原创拼豆工程图纸 · 仅售作品图纸，不含材料</span>
          <Link href="/privacy">隐私政策</Link>
        </footer>
      </body>
    </html>
  );
}
