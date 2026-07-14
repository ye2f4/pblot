-- ============================================
-- 硬件设备监控系统 数据库迁移
-- 设备主表 / 时序指标表 / 指令下发表
-- ============================================
-- 说明：开发阶段先 DROP 再 CREATE，确保 schema 与我们定义的一致，
--       不受 Supabase 项目中已存在的旧实验表（如带 device_type 的 devices）影响。
--       注意：重跑会清空这三张表的数据（仅测试表，可放心执行）。

DROP TABLE IF EXISTS device_commands CASCADE;
DROP TABLE IF EXISTS device_metrics CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- 1. devices 设备主表
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,                 -- 设备硬件唯一标识（MAC / UUID）
  device_name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_online BOOLEAN DEFAULT false,
  battery_percent INTEGER DEFAULT 100 CHECK (battery_percent >= 0 AND battery_percent <= 100),
  signal_strength INTEGER DEFAULT -90,            -- dBm
  temperature NUMERIC(5,2) DEFAULT 25.0,          -- °C
  voltage NUMERIC(5,3) DEFAULT 3.3,               -- V
  backlight_on BOOLEAN DEFAULT false,             -- 背光开关状态
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_owner ON devices(owner_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);

-- 2. device_metrics 设备时序指标表（长表格式，按 metric_type 区分）
CREATE TABLE device_metrics (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('battery', 'signal', 'temperature', 'voltage')),
  value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_metrics_device_time ON device_metrics(device_id, timestamp DESC);

-- 3. device_commands 设备指令下发表
CREATE TABLE device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command TEXT NOT NULL,                          -- 例如 reboot / backlight_on / backlight_off
  executed BOOLEAN DEFAULT false,
  result TEXT,                                    -- 设备执行后的回写结果
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX idx_device_commands_device_pending ON device_commands(device_id, executed);

-- ============================================
-- RPC：设备一次性上报心跳 + 写入时序指标（减少往返）
-- ============================================
CREATE OR REPLACE FUNCTION report_device_telemetry(
  p_device_id TEXT,
  p_device_name TEXT,
  p_is_online BOOLEAN,
  p_battery INTEGER,
  p_signal INTEGER,
  p_temperature NUMERIC,
  p_voltage NUMERIC,
  p_backlight BOOLEAN DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- upsert 设备主表（按 device_id 唯一）
  INSERT INTO devices (device_id, device_name, is_online, battery_percent, signal_strength, temperature, voltage, last_heartbeat)
  VALUES (p_device_id, p_device_name, p_is_online, p_battery, p_signal, p_temperature, p_voltage, NOW())
  ON CONFLICT (device_id)
  DO UPDATE SET
    device_name   = COALESCE(p_device_name, devices.device_name),
    is_online     = p_is_online,
    battery_percent = p_battery,
    signal_strength  = p_signal,
    temperature   = p_temperature,
    voltage       = p_voltage,
    last_heartbeat = NOW(),
    backlight_on  = COALESCE(p_backlight, devices.backlight_on)
  RETURNING id INTO v_id;

  -- 写入三条时序指标
  INSERT INTO device_metrics (device_id, metric_type, value) VALUES
    (v_id, 'battery', p_battery),
    (v_id, 'signal', p_signal),
    (v_id, 'temperature', p_temperature);

  RETURN v_id;
END;
$$;

-- ============================================
-- RPC：清理过期的时序指标（建议配合 pg_cron 定时执行）
-- ============================================
CREATE OR REPLACE FUNCTION prune_device_metrics(retain_hours INTEGER DEFAULT 72)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM device_metrics
  WHERE timestamp < NOW() - (retain_hours || ' hours')::INTERVAL;
END;
$$;

-- ============================================
-- RLS 策略（演示用：公开读取，允许设备上报与指令下发）
-- 生产环境应改为按 owner_id 限制写入
-- ============================================
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取设备" ON devices FOR SELECT USING (true);
CREATE POLICY "允许注册设备(演示)" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "允许设备上报状态(演示)" ON devices FOR UPDATE USING (true);

ALTER TABLE device_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取指标" ON device_metrics FOR SELECT USING (true);
CREATE POLICY "允许写入指标(演示)" ON device_metrics FOR INSERT WITH CHECK (true);

ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取指令" ON device_commands FOR SELECT USING (true);
CREATE POLICY "允许下发指令(演示)" ON device_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "允许设备回写指令结果(演示)" ON device_commands FOR UPDATE USING (true);
