/**
 * 公共历法工具库
 * 统一提供：公历转农历、节气、星座、干支、时辰、宜忌等全套算法
 * 供 黄历页 / 时光胶囊页 共用
 */
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095a0, 0x049b0, 0x0a974, 0x0a4b0, 0x0aa50, 0x1b252, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
  0x049f8, 0x04970, 0x064b0, 0x074a4, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x04ae0, 0x0a7a7, 0x0a4d0, 0x0d160, 0x0f256
];

const sTermInfo = [0, 21208, 42467, 63830, 85300, 106863, 128530, 150242, 171980, 193792, 215662, 237567,
  259483, 281329, 303151, 324984, 346798, 368634, 390447, 412280, 434093, 455936, 477758, 499610];

/**
 * 公历转农历（核心函数）
 * @param {Date} solarDate 公历日期对象
 * @returns {Object} 完整农历信息
 */
export function solarToLunar(solarDate) {
  const sy = solarDate.getFullYear();
  const sm = solarDate.getMonth() + 1;
  const sd = solarDate.getDate();
  const baseDate = new Date(1900, 0, 31);
  let offset = Math.floor((solarDate - baseDate) / 86400000);

  let ly = 1900, lm = 1, ld = 1;
  let lunarYearDays, leap = 0, leapDays = 0;
  while (ly < 2100 && offset > 0) {
    lunarYearDays = getLunarYearDays(ly);
    if (offset < lunarYearDays) break;
    offset -= lunarYearDays;
    ly++;
  }

  leap = getLeapMonth(ly);
  let isLeap = false;
  for (lm = 1; lm < 13 && offset > 0; lm++) {
    if (leap > 0 && lm === leap + 1 && !isLeap) {
      lm--;
      isLeap = true;
      leapDays = getLeapDays(ly);
      if (offset < leapDays) break;
      offset -= leapDays;
    } else {
      lunarYearDays = getLunarMonthDays(ly, lm);
      if (offset < lunarYearDays) break;
      offset -= lunarYearDays;
    }
  }
  ld = offset + 1;

  return {
    lunarYear: ly,
    lunarMonth: lm,
    lunarDay: ld,
    isLeapMonth: isLeap,
    isBigMonth: getLunarMonthDays(ly, lm) === 30
  };
}

/** 农历年总天数 */
export function getLunarYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
  return sum + getLeapDays(y);
}

/** 获取闰月月份 */
export function getLeapMonth(y) {
  return lunarInfo[y - 1900] & 0xf;
}

/** 闰月天数 */
export function getLeapDays(y) {
  return getLeapMonth(y) ? (lunarInfo[y - 1900] & 0x10000 ? 30 : 29) : 0;
}

/** 农历单月天数 */
export function getLunarMonthDays(y, m) {
  return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}

/** 获取年干支、生肖 */
export function getGanZhi(y, dict) {
  const g = (y - 4) % 10;
  const z = (y - 4) % 12;
  return { gan: dict.baseDict.gan[g], zhi: dict.baseDict.zhi[z], animal: dict.baseDict.animal[z] };
}

/** 获取当日节气 */
export function getCurrentJieQi(date, dict) {
  const year = date.getFullYear();
  const base = new Date(year, 0, 1);
  const offSet = Math.floor((date - base) / 86400000);
  for (let i = 0; i < 24; i++) {
    const temp = sTermInfo[i] + (year - 1900) * 365.2422;
    if (Math.floor(temp) === offSet) return dict.baseDict.jieQiName[i];
  }
  return "";
}

/** 获取星座 */
export function getXingZuo(month, day) {
  const arr = [
    { m: 1, d: 20, x: '水瓶座' }, { m: 2, d: 19, x: '双鱼座' }, { m: 3, d: 21, x: '白羊座' },
    { m: 4, d: 20, x: '金牛座' }, { m: 5, d: 21, x: '双子座' }, { m: 6, d: 22, x: '巨蟹座' },
    { m: 7, d: 23, x: '狮子座' }, { m: 8, d: 23, x: '处女座' }, { m: 9, d: 23, x: '天秤座' },
    { m: 10, d: 24, x: '天蝎座' }, { m: 11, d: 23, x: '射手座' }, { m: 12, d: 22, x: '摩羯座' }
  ];
  let xing = "摩羯座";
  for (let i = 0; i < arr.length; i++) {
    if (month === arr[i].m && day >= arr[i].d) xing = arr[i].x;
    if (month === arr[i].m + 1 && day < arr[i].d) xing = arr[i].x;
  }
  return xing;
}

/** 获取当日干支 */
export function getDayGanZhi(date, dict) {
  const baseDay = new Date(2000, 0, 1);
  const dayDiff = Math.floor((date - baseDay) / 86400000);
  const gIdx = (54 + dayDiff) % 10;
  const zIdx = (11 + dayDiff) % 12;
  return { gIdx, zIdx, gan: dict.baseDict.gan[gIdx], zhi: dict.baseDict.zhi[zIdx] };
}

/** 月令物候 */
export function getYueLingWuHou(lunarMonth, dict) {
  const idx = (lunarMonth - 1) % 12;
  return dict.yueLingWuHou[idx];
}

/** 六耀 */
export function getLiuYao(date, dict) {
  const totalDays = Math.floor((date - new Date(1900, 0, 1)) / 86400000);
  const idx = totalDays % 7;
  return dict.liuYaoList[idx];
}

/** 日禄 */
export function getRiLu(ganIdx, dict) {
  return dict.riLuList[ganIdx];
}

/** 胎神 */
export function getTaiShen(zhiIdx, dict) {
  return dict.taiShenList[zhiIdx];
}

/** 贵神 */
export function getGuiShen(ganIdx, dict) {
  return dict.guiShenList[ganIdx % dict.guiShenList.length];
}

/** 卦象 */
export function getGua(date, dict) {
  const days = Math.floor((date - new Date(1900, 0, 1)) / 86400000);
  const idx = days % dict.guaList.length;
  return dict.guaList[idx];
}

/** 宜忌 */
export function getYiJi(date, dict) {
  const days = Math.floor((date - new Date(1900, 0, 1)) / 86400000);
  const yiIdx = days % dict.yiJiBase.fullYi.length;
  const jiIdx = days % dict.yiJiBase.fullJi.length;
  return {
    yi: [dict.yiJiBase.fullYi[yiIdx], dict.yiJiBase.fullYi[(yiIdx + 2) % dict.yiJiBase.fullYi.length]],
    ji: ["余事勿取"]
  };
}

/** 十二时辰 */
export function buildShiChenList(dayGanIdx, dayZhiIdx, year, dict) {
  const list = [];
  const yIdx = Math.floor((year - 4) / 60) % 6;
  for (let i = 0; i < 12; i++) {
    const sc = dict.shiChenBase[i];
    const gIdx = dict.baseDict.gan.indexOf(sc.gan);
    const zIdx = i;
    const chongIdx = (zIdx + 6) % 12;
    list.push({
      name: sc.name,
      time: `${sc.start}:00-${sc.end === 1 ? "00" : sc.end}:00`,
      ganZhi: `${dict.baseDict.gan[gIdx]}${dict.baseDict.zhi[zIdx]}`,
      chong: `冲${dict.baseDict.animal[chongIdx]}煞${dict.baseDict.direction[chongIdx % 4]}`,
      naYin: dict.naYinTable[yIdx][gIdx % 5],
      wealthPos: dict.posMap.wealth[gIdx % 5],
      happyPos: dict.posMap.happy[gIdx % 5],
      blessPos: dict.posMap.blessing[gIdx % 5],
      ji: [0, 2, 4, 6, 9].includes(i),
      yi: dict.yiJiBase.fullYi[i % dict.yiJiBase.fullYi.length],
      jiTaboo: dict.yiJiBase.fullJi[i % dict.yiJiBase.fullJi.length]
    });
  }
  return list;
}

/**
 * 整合完整黄历数据（对外统一入口）
 * @param {Date} inputDate 公历日期
 * @param {Object} config 外部 calendar.json 配置
 * @returns {Object} 完整黄历对象
 */
export function buildHuangLiData(inputDate, config) {
  const y = inputDate.getFullYear();
  const m = inputDate.getMonth() + 1;
  const d = inputDate.getDate();
  const weekIdx = inputDate.getDay();
  const weekCn = config.baseDict.weekCn[weekIdx];

  const lunar = solarToLunar(inputDate);
  const jieQi = getCurrentJieQi(inputDate, config) || "无";
  const dayGZ = getDayGanZhi(inputDate, config);
  const xingZuo = getXingZuo(m, d);
  const pengZu = config.pengZuList[dayGZ.zIdx];
  const ylwh = getYueLingWuHou(lunar.lunarMonth, config);
  const liuYao = getLiuYao(inputDate, config);
  const riLu = getRiLu(dayGZ.gIdx, config);
  const taiShen = getTaiShen(dayGZ.zIdx, config);
  const guiShen = getGuiShen(dayGZ.gIdx, config);
  const gua = getGua(inputDate, config);
  const yiJi = getYiJi(inputDate, config);
  const shiChenList = buildShiChenList(dayGZ.gIdx, dayGZ.zIdx, y, config);
  const yearGZ = getGanZhi(y, config);

  return {
    year: y, month: m, day: d, week: weekCn,
    lunarStr: `${lunar.lunarYear}年${lunar.isLeapMonth ? '闰' : ''}${config.baseDict.monthCn[lunar.lunarMonth - 1]}${config.baseDict.dayCn[lunar.lunarDay]} ${lunar.isBigMonth ? '大月' : '小月'}`,
    yearGanZhi: `${yearGZ.gan}${yearGZ.zhi}`,
    dayGanZhi: `${dayGZ.gan}${dayGZ.zhi}`,
    animal: yearGZ.animal,
    jieQi, xingZuo,
    wealthPos: config.posMap.wealth[dayGZ.gIdx % 5],
    happyPos: config.posMap.happy[dayGZ.gIdx % 5],
    blessPos: config.posMap.blessing[dayGZ.gIdx % 5],
    noblePos: guiShen,
    taiShen,
    chongSha: `${yearGZ.animal}日冲(${dayGZ.gan}${dayGZ.zhi})${config.baseDict.animal[(dayGZ.zIdx + 6) % 12]}`,
    yi: yiJi.yi,
    ji: yiJi.ji,
    pengZu,
    gua,
    yueLing: ylwh.yueLing,
    wuHou: ylwh.wuHou,
    liuYao,
    riLu,
    taiSui: `${yearGZ.gan}${yearGZ.zhi}${yearGZ.animal}`,
    shiChenList
  };
}