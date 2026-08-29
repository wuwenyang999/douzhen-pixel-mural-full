// 品牌色卡。BRAND 记录色卡体系与版本；正式图纸发布时固化 brandPalette，
// 后续即使色卡扩充，已购用户仍读取其图纸版本绑定的色号与颜色。
// 这里内置 MARD 291 体系中本批作品实际用到的颜色，code 为品牌色号。

export const BRAND_PALETTE = 'MARD 291';

// code -> { name, hex }
export const MARD_COLORS = {
  'MARD A1': { name: '米白', hex: '#FAF4C8' },
  'MARD A6': { name: '暖黄', hex: '#F6D869' },
  'MARD A10': { name: '橙红', hex: '#F77C31' },
  'MARD E5': { name: '鎏金', hex: '#F2C14E' },
  'MARD P1': { name: '樱粉', hex: '#FF9EC7' },
  'MARD P3': { name: '霓粉', hex: '#FF5B78' },
  'MARD B10': { name: '薄荷绿', hex: '#95D3C2' },
  'MARD G6': { name: '草绿', hex: '#6FBF4B' },
  'MARD B12': { name: '深绿', hex: '#166F41' },
  'MARD B15': { name: '深青', hex: '#1F7A8C' },
  'MARD H7': { name: '藏青', hex: '#16305A' },
  'MARD H9': { name: '靛蓝', hex: '#2756A6' },
  'MARD K8': { name: '黛蓝', hex: '#3A4A63' },
  'MARD V2': { name: '电紫', hex: '#8A63FF' },
  'MARD M3': { name: '蓝灰', hex: '#697D80' },
  'MARD M8': { name: '石灰', hex: '#B7BCC0' },
  'MARD M12': { name: '深褐', hex: '#644749' },
  'MARD N2': { name: '玄黑', hex: '#1A1A22' },
};

export function colorOf(code) {
  const found = MARD_COLORS[code];
  if (!found) throw new Error(`unknown colour code: ${code}`);
  return { code, name: found.name, hex: found.hex };
}

export function paletteMeta(codes) {
  const used = [...new Set(codes)];
  return used.map(colorOf);
}
