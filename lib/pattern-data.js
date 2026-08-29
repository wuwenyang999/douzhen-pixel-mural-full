// 正式图纸数据（发布即固化）。
// 每张图纸绑定品牌色卡版本与版本号；分区网格逐格记录品牌色号，
// 全图总颗数、每色全图数量、每色在当前分区的数量全部由网格真实汇总，
// 保证“全图数量 = 各分区数量之和”，不再使用演示色块。
// 真实上架时，这里的网格由设计稿导出；首版用确定性算法生成结构样图。

import { BRAND_PALETTE, colorOf } from './palette.js';

// 标准拼豆板为 29×29；壁画分区按单板尺寸固化，立体包组件按实际尺寸。
const BOARD = 29;

function buildGrid(rows, cols, paint) {
  const cells = new Array(rows * cols);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells[r * cols + c] = paint(r, c);
    }
  }
  return cells;
}

function countByColor(cells) {
  const tally = new Map();
  for (const code of cells) tally.set(code, (tally.get(code) || 0) + 1);
  return [...tally.entries()]
    .map(([code, count]) => ({ ...colorOf(code), count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- 苍龙镇海 ----------
function dragonHead(r, c) {
  const depth = r / BOARD;
  const bg = depth < 0.5 ? 'MARD H7' : 'MARD H9';
  const dx = c - 14;
  const dy = r - 15;
  const ellipse = (dx * dx) / 81 + (dy * dy) / 64;
  if ((dx === -3 && dy === -2) || (dx === 3 && dy === -2)) return 'MARD A10'; // 双目
  if (ellipse <= 1) return (r + c) % 3 === 0 ? 'MARD E5' : 'MARD B15';
  if (ellipse <= 1.35) return 'MARD E5';
  if (Math.sin(c * 0.9) > 0.86 && r > 20) return 'MARD A1'; // 云须
  return bg;
}
function cloudLayer(r, c) {
  const wave = Math.sin((c + r) * 0.55);
  if (r < 8) return 'MARD H7';
  if (r < 15) return wave > 0.4 ? 'MARD B15' : 'MARD H9';
  if (r < 22) return wave > 0.2 ? 'MARD B10' : 'MARD M3';
  return wave > 0.6 ? 'MARD A1' : 'MARD B15';
}
function dragonBody(r, c) {
  const scale = (r + c) % 4;
  const band = (r - c + BOARD) % 10;
  if (band < 2) return 'MARD E5';
  if (scale === 0) return 'MARD B15';
  if (scale === 1) return 'MARD H9';
  return 'MARD H7';
}

// ---------- 雨后青嶂 ----------
function pineForest(r, c) {
  if (r < 6) return 'MARD A1';
  const ridge = 10 + Math.round(4 * Math.sin(c * 0.5));
  if (r < ridge) return 'MARD B10';
  if (r < ridge + 7) return (c % 5 < 2) ? 'MARD B12' : 'MARD G6';
  return 'MARD B12';
}
function farMountain(r, c) {
  if (r < 12) return 'MARD A1';
  const wave = Math.sin(c * 0.4);
  if (r < 18) return wave > 0 ? 'MARD M8' : 'MARD M3';
  return wave > 0.3 ? 'MARD K8' : 'MARD M3';
}
function vermilionSun(r, c) {
  const dx = c - 14;
  const dy = r - 11;
  if (dx * dx + dy * dy <= 20) return 'MARD A10';
  if (r > 20) return 'MARD B12';
  return 'MARD A1';
}

// ---------- 霓虹白虎手机包 ----------
function bagFront(r, c) {
  if (r === 0 || r === 18 || c === 0 || c === 28) return 'MARD N2'; // 包边
  const stripe = (c % 7);
  if (stripe >= 3 && stripe <= 4 && r % 4 !== 0) return 'MARD N2'; // 虎纹
  const face = Math.abs(c - 14) < 6 && r > 9 && r < 16;
  if (face) return (r + c) % 5 === 0 ? 'MARD E5' : 'MARD A1';
  return (r + c) % 6 === 0 ? 'MARD P3' : 'MARD P1';
}
function bagBack(r, c) {
  if (r === 0 || r === 18 || c === 0 || c === 28) return 'MARD N2';
  return (r * 2 + c) % 5 === 0 ? 'MARD N2' : 'MARD P3';
}
function bagSide(r, c) {
  if (r === 0 || r === 9 || c === 0 || c === 28) return 'MARD N2';
  return c % 3 === 0 ? 'MARD V2' : 'MARD P1';
}
function bagStrap(r, c) {
  if (r === 0 || r === 7) return 'MARD N2';
  return c % 4 === 0 ? 'MARD N2' : 'MARD P3';
}

function section(id, name, rows, cols, paint, instruction) {
  const cells = buildGrid(rows, cols, paint);
  return { id, name, rows, cols, instruction, cells, colours: countByColor(cells) };
}

const RAW_CATALOG = [
  {
    id: 'azure-dragon-v1',
    slug: 'azure-dragon',
    version: 1,
    title: '苍龙镇海',
    type: 'mural',
    copyright: '© 豆阵原创 · 编号 DZ-M-001 · 仅限个人制作使用',
    price: 5990,
    difficulty: '进阶',
    finishedSize: '90 × 135 cm',
    boardCount: '8 × 12 块板',
    heroImage: '/patterns/azure-dragon.png',
    description: '一条穿云破浪的东方巨龙，专为整面墙设计。',
    sections: [
      section('A01', '龙首', BOARD, BOARD, dragonHead, '从鎏金轮廓与朱红双目开始，由中心向外完成。'),
      section('A02', '云层', BOARD, BOARD, cloudLayer, '先铺藏青与靛蓝底色，再叠加薄荷绿与米白云层。'),
      section('A03', '龙身', BOARD, BOARD, dragonBody, '沿对角线方向铺鳞片，保持金色脊线连贯，完成后再熨烫。'),
    ],
  },
  {
    id: 'verdant-peaks-v1',
    slug: 'verdant-peaks',
    version: 1,
    title: '雨后青嶂',
    type: 'mural',
    copyright: '© 豆阵原创 · 编号 DZ-M-002 · 仅限个人制作使用',
    price: 4990,
    difficulty: '中阶',
    finishedSize: '68 × 90 cm',
    boardCount: '6 × 8 块板',
    heroImage: '/patterns/verdant-peaks.png',
    description: '层层青山与一轮朱日，适合客厅主墙的静景壁画。',
    sections: [
      section('B01', '前景松林', BOARD, BOARD, pineForest, '先做深绿底色，再补草绿树梢与米白天际。'),
      section('B02', '远山云雾', BOARD, BOARD, farMountain, '由浅到深铺蓝灰远山，交界处对照总览过渡。'),
      section('B03', '朱日', BOARD, BOARD, vermilionSun, '单独完成橙红圆形太阳，最后与深绿地面拼接。'),
    ],
  },
  {
    id: 'tiger-phone-bag-v1',
    slug: 'tiger-phone-bag',
    version: 1,
    title: '霓虹白虎手机包',
    type: 'bag',
    copyright: '© 豆阵原创 · 编号 DZ-B-001 · 仅限个人制作使用',
    price: 2990,
    difficulty: '进阶',
    finishedSize: '12 × 19 × 4 cm',
    boardCount: '6 个组件',
    heroImage: '/patterns/tiger-phone-bag.png',
    description: '可背出门的立体拼豆手机包，配色来自原创霓虹白虎纹样。',
    sections: [
      section('C01', '正面虎纹', 19, 29, bagFront, '完成后双面轻熨，保留四周穿线孔位。'),
      section('C02', '背面面板', 19, 29, bagBack, '先铺霓粉底，再补玄黑条纹，保持与正面对称。'),
      section('C03', '侧片与底片', 10, 29, bagSide, '四片组件完成后按顺序用透明线连接。'),
      section('C04', '背带连接', 8, 29, bagStrap, '透明线穿过四角孔位，打双结固定受力点。'),
    ],
  },
];

// 汇总每张图纸的全图颗数与全图色号清单。
function finalize(raw) {
  const globalTally = new Map();
  for (const sec of raw.sections) {
    for (const colour of sec.colours) globalTally.set(colour.code, (globalTally.get(colour.code) || 0) + colour.count);
  }
  const colours = [...globalTally.entries()]
    .map(([code, count]) => ({ ...colorOf(code), count }))
    .sort((a, b) => b.count - a.count);
  const totalBeads = raw.sections.reduce((sum, sec) => sum + sec.cells.length, 0);
  return {
    ...raw,
    brandPalette: BRAND_PALETTE,
    totalBeads,
    totalBoards: raw.sections.length,
    totalColors: colours.length,
    colours,
  };
}

export function buildCatalog() {
  return RAW_CATALOG.map(finalize);
}
