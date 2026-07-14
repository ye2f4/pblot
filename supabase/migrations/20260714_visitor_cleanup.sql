-- ============================================
-- 访客位置表：新增设备型号字段 + 清理无意义记录
-- ============================================

-- 1. 新增 device_model 字段（采集真实设备型号，替换「未知」）
ALTER TABLE visitor_locations ADD COLUMN IF NOT EXISTS device_model TEXT;
CREATE INDEX IF NOT EXISTS idx_visitor_locations_device ON visitor_locations(device_model);

-- 2. 清理无意义访问记录：缺少经纬度坐标的记录无法在地图上定位，属于无效数据
--    同时清理既无国家也无 IP 的记录（无法用于国家/城市统计）
DELETE FROM visitor_locations
WHERE latitude IS NULL OR longitude IS NULL;

DELETE FROM visitor_locations
WHERE country IS NULL AND ip_address IS NULL AND city IS NULL;

-- 3. 对历史遗留、country/city 为空但坐标存在的记录，
--    尝试用已保存的 IP 反查是个可选操作；此处仅保证统计口径一致：
--    统计时仍以 country/city 非空为准（页面层已做过滤）。
