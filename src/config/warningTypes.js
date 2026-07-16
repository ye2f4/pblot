// 预警类型与等级的元数据（图标、标签、配色），供弹窗与后台共用。

export const WARNING_TYPES = {
  earthquake: { label: '地震预警', icon: '🌍', desc: '地震速报' },
  weather: { label: '恶劣天气', icon: '🌪️', desc: '气象灾害' },
  airdrill: {
    label: '防空警报',
    icon: '📢',
    desc: '人防警报',
    // 防空警报标准分类（预先 / 空袭 / 解除）
    subtypes: {
      pre: { label: '预先警报', icon: '🔔', desc: '鸣36秒、停24秒，反复3遍（敌空袭有预兆，准备疏散）' },
      air: { label: '空袭警报', icon: '💥', desc: '鸣6秒、停6秒，反复15遍（敌空袭即刻，立即掩蔽）' },
      allclear: { label: '解除警报', icon: '🕊️', desc: '连续长鸣3分钟（空袭危险解除）' },
    },
  },
  nuclear: {
    label: '核应急/人防',
    icon: '☢️',
    desc: '核与辐射应急（仅转发官方通报）',
    // 标记为最高级别：大图标、闪烁红字、倒计时、爆心距离、避险建议
    critical: true,
    shelterTips: [
      '立即进入最近的防空地下室、地下空间或坚固建筑内层/地下室，远离门窗与外墙。',
      '若在室外且无掩体：迅速背向爆心卧倒、双手抱头，避开玻璃与易燃物，待冲击波过后再进入掩体。',
      '用湿毛巾、衣物捂住口鼻，防止吸入放射性尘埃；不饮酒、不扬尘。',
      '听从官方统一指令与服碘指引，不要占用电话线路，关注权威广播/通报。',
    ],
  },
  other: { label: '其它应急', icon: '⚠️', desc: '其它突发事件' },
};

export const WARNING_LEVELS = {
  red: { label: '红色 · 特别重大', color: '#d32f2f' },
  orange: { label: '橙色 · 重大', color: '#ef6c00' },
  yellow: { label: '黄色 · 较大', color: '#f9a825' },
  blue: { label: '蓝色 · 一般', color: '#1976d2' },
};

// 等级排序权重（红 > 橙 > 黄 > 蓝），用于弹窗按严重度排列
export const LEVEL_ORDER = { red: 0, orange: 1, yellow: 2, blue: 3 };

export function levelColor(level) {
  return (WARNING_LEVELS[level] || WARNING_LEVELS.blue).color;
}

export function typeMeta(type) {
  return WARNING_TYPES[type] || WARNING_TYPES.other;
}
