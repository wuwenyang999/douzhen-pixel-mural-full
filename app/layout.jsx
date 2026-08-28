import './globals.css';
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
        <footer>豆阵 · 原创拼豆工程图纸 · 仅售作品图纸，不含材料</footer>
      </body>
    </html>
  );
}
