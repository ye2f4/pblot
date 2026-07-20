import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const metadata = {
  ssr: false,
  title: '硬件监控 · ESP32 设备电量/信号/温度实时监测 | Monoの小窝',
  description: '查看基于 ESP32 的硬件设备实时监控数据：电量、信号、温度趋势曲线，支持多城市时间与天气联动。',
};

const MOCK_DEVICES = [
  {
    id: 'mock-001',
    device_name: '室内环境监测终端',
    owner_id: 'mock-user',
    is_online: true,
    battery_percent: 78,
    signal_strength: -52,
    temperature: 24.6,
    voltage: 3.28,
    last_heartbeat: new Date().toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-002',
    device_name: '户外网关节点',
    owner_id: 'mock-user',
    is_online: false,
    battery_percent: 12,
    signal_strength: -98,
    temperature: 18.2,
    voltage: 2.91,
    last_heartbeat: new Date(Date.now()-3600000).toISOString(),
    created_at: new Date().toISOString()
  }
];

const generateMockMetrics = () => {
  const baseTime = Date.now();
  const mockData = [];
  for (let i = 0; i < 30; i++) {
    const time = new Date(baseTime - (29 - i)*60000);
    mockData.push({
      time: time.toLocaleTimeString().slice(0, 5),
      battery: 70 + Math.floor(Math.random()*15),
      signal: -45 - Math.floor(Math.random()*15),
      temperature: 22 + Math.random()*4
    });
  }
  return mockData;
};
const MOCK_METRICS = generateMockMetrics();

export default function HardwareMonitor() {
  // 本地验证模式：访问 /hardware/?source=local 时直连本地模拟器(HTTP :8787)
  const LOCAL_API = 'http://localhost:8787';
  const useLocal =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('source') === 'local';

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isMockMode, setIsMockMode] = useState(false);
  
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_name: '',
    device_id: '',
    initial_battery: 100,
    initial_signal: -60,
    initial_temp: 25.0
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // ---------- 网页内提示（替代浏览器原生 alert） ----------
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message }
  const toastTimer = useRef(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // 指令成功后乐观更新本地背光状态，使按钮立即进入禁用态（重复操作检测）
  const applyBacklightLocal = (on) => {
    if (!selectedDevice) return;
    const id = selectedDevice.id;
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, backlight_on: on } : d)));
    setSelectedDevice((prev) => (prev && prev.id === id ? { ...prev, backlight_on: on } : prev));
  };

  // ---------- 数据源无关的数据访问层 ----------
  // 在线状态不只看存储的 is_online，还看心跳新鲜度：
  // 模拟器停止/崩溃后 last_heartbeat 不再更新，超过阈值即视为离线
  const ONLINE_STALE_MS = 15000;
  const normalizeDevices = (list) =>
    (list || []).map((d) => {
      const hb = d.last_heartbeat ? new Date(d.last_heartbeat).getTime() : 0;
      const fresh = Number.isFinite(hb) && Date.now() - hb < ONLINE_STALE_MS;
      return { ...d, is_online: Boolean(d.is_online) && fresh };
    });

  const loadDevices = async () => {
    if (useLocal) {
      const res = await fetch(`${LOCAL_API}/devices`);
      if (!res.ok) throw new Error('本地设备服务未启动（请先运行 node scripts/simulate-devices.mjs）');
      return await res.json();
    }
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    let query = supabase.from('devices').select('*');
    // 演示模式：公开设备（owner_id 为空的模拟器设备）对所有人可见；
    // 登录用户额外看到自己名下的设备
    if (currentUser) {
      query = query.or(`owner_id.eq.${currentUser.id},owner_id.is.null`);
    }
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const loadMetrics = async (deviceId) => {
    if (useLocal) {
      const res = await fetch(`${LOCAL_API}/devices/${encodeURIComponent(deviceId)}/metrics?limit=80`);
      if (!res.ok) throw new Error('metrics');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    const { data, error } = await supabase
      .from('device_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(80);
    if (error) throw error;
    if (!data || data.length === 0) return [];
    const timeMap = new Map();
    data.forEach((item) => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString().slice(0, 5);
      if (!timeMap.has(timeStr)) {
        timeMap.set(timeStr, { time: timeStr, battery: null, signal: null, temperature: null });
      }
      const row = timeMap.get(timeStr);
      if (item.metric_type === 'battery') row.battery = item.value;
      if (item.metric_type === 'signal') row.signal = item.value;
      if (item.metric_type === 'temperature') row.temperature = item.value;
    });
    // Supabase 查询按 timestamp 降序返回(最新在前)，反转成升序(最旧在前)，
    // 使图表 X 轴保持"左旧右新"的常规顺序，与 local 模式一致
    return Array.from(timeMap.values()).reverse();
  };

  const pushCommand = async (deviceId, command) => {
    if (useLocal) {
      const res = await fetch(`${LOCAL_API}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, command }),
      });
      if (!res.ok) throw new Error('指令下发失败');
      return;
    }
    const { error } = await supabase.from('device_commands').insert([{ device_id: deviceId, command }]);
    if (error) throw error;
  };

  const createDevice = async (payload) => {
    if (useLocal) {
      const res = await fetch(`${LOCAL_API}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('创建设备失败');
      return await res.json();
    }
    const { data, error } = await supabase.from('devices').insert([payload]).select();
    if (error) throw error;
    return data && data[0];
  };

  const checkDeviceIdUnique = async (deviceId) => {
    if (isMockMode) return true;
    if (useLocal) {
      const res = await fetch(`${LOCAL_API}/devices`);
      if (!res.ok) return false;
      const list = await res.json();
      return !list.some((d) => d.device_id === deviceId);
    }
    const { data, error } = await supabase.from('devices').select('id').eq('device_id', deviceId).limit(1);
    if (error) throw error;
    return data.length === 0;
  };

  const EmptyTip = ({ text }) => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: 'var(--ifm-color-emphasis-600)',
      fontSize: '15px',
      background: 'var(--ifm-card-background-color)',
      borderRadius: '12px',
      border: '1px dashed var(--ifm-color-emphasis-300)'
    }}>
      📭 {text}
    </div>
  );

  useEffect(() => {
    let fetchTimer = null;
    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await loadDevices();

        if (!data || data.length === 0) {
          // 无任何真实设备时，展示演示数据，方便体验
          setIsMockMode(true);
          const mockNorm = normalizeDevices(MOCK_DEVICES);
          setDevices(mockNorm);
          setSelectedDevice(mockNorm[0]);
          setMetrics(MOCK_METRICS);
        } else {
          setIsMockMode(false);
          const norm = normalizeDevices(data);
          setDevices(norm);
          setSelectedDevice(norm[0]);
        }
      } catch (err) {
        console.error('加载设备失败：', err);
        setError('数据加载异常，已切换为演示模式');
        setIsMockMode(true);
        setDevices(MOCK_DEVICES);
        setSelectedDevice(MOCK_DEVICES[0]);
        setMetrics(MOCK_METRICS);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    fetchTimer = setInterval(fetchDevices, 30000);

    return () => clearInterval(fetchTimer);
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;
    if (isMockMode) {
      setMetrics(MOCK_METRICS);
      return;
    }
    const fetchMetrics = async () => {
      try {
        const data = await loadMetrics(selectedDevice.id);
        setMetrics(data);
      } catch (err) {
        console.error('加载指标数据失败：', err);
      }
    };
    fetchMetrics();
  }, [selectedDevice, isMockMode]);

  const sendCommand = async (command) => {
    if (!selectedDevice || sending || !selectedDevice.is_online) return;
    // 重复操作检测：背光状态已与目标一致时忽略，避免无限执行
    if (command === 'backlight_on' && selectedDevice.backlight_on) {
      showToast('info', '背光已处于开启状态');
      return;
    }
    if (command === 'backlight_off' && !selectedDevice.backlight_on) {
      showToast('info', '背光已处于关闭状态');
      return;
    }
    setSending(true);
    try {
      // 演示模式：未连接真实设备，仅模拟下发成功
      if (isMockMode) {
        showToast('info', `指令【${command}】发送成功（演示模式，未连接真实设备）`);
        if (command === 'backlight_on') applyBacklightLocal(true);
        else if (command === 'backlight_off') applyBacklightLocal(false);
        return;
      }
      await pushCommand(selectedDevice.id, command);
      showToast('success', `指令【${command}】发送成功，设备正在执行`);
      if (command === 'backlight_on') applyBacklightLocal(true);
      else if (command === 'backlight_off') applyBacklightLocal(false);
    } catch (err) {
      showToast('error', `指令发送失败：${err.message}`);
    } finally {
      setTimeout(() => setSending(false), 1200);
    }
  };

  const openAddDeviceModal = () => {
    setNewDevice({
      device_name: '',
      device_id: '',
      initial_battery: 100,
      initial_signal: -60,
      initial_temp: 25.0
    });
    setFormError('');
    setShowAddDeviceModal(true);
  };

  const validateDeviceId = async (deviceId) => {
    return await checkDeviceIdUnique(deviceId);
  };

  const submitNewDevice = async () => {
    if (!newDevice.device_name.trim()) {
      setFormError('请输入设备名称');
      return;
    }
    if (!newDevice.device_id.trim()) {
      setFormError('请输入设备唯一ID（如MAC/UUID）');
      return;
    }
    if (!user && !useLocal) {
      setFormError('请先登录');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const isUnique = await validateDeviceId(newDevice.device_id.trim());
      if (!isUnique) {
        setFormError('该设备ID已存在，请更换');
        return;
      }

      const deviceData = {
        device_name: newDevice.device_name.trim(),
        device_id: newDevice.device_id.trim(),
        owner_id: user.id,
        is_online: false,
        battery_percent: parseInt(newDevice.initial_battery, 10) || 100,
        signal_strength: parseInt(newDevice.initial_signal, 10) || -60,
        temperature: parseFloat(newDevice.initial_temp) || 25.0,
        voltage: 3.3,
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      if (isMockMode) {
        const newMockDevice = {
          ...deviceData,
          id: `mock-${Date.now().toString().slice(-6)}`
        };
        setDevices([newMockDevice, ...devices]);
        setSelectedDevice(newMockDevice);
      } else {
        const created = await createDevice(deviceData);
        if (created) {
          setDevices([created, ...devices]);
          setSelectedDevice(created);
        }
      }
      setShowAddDeviceModal(false);
      showToast('success', '设备添加成功！等待设备上线...');
    } catch (err) {
      console.error('添加设备失败：', err);
      setFormError(`添加失败：${err.message || '未知错误'}`);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="硬件设备监控">
        <div style={{
          maxWidth: '1200px',
          margin: '60px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: 'var(--ifm-color-emphasis-600)',
          fontSize: '16px'
        }}>
          <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="硬件设备监控">
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        background: 'var(--ifm-color-emphasis-100)',
        padding: '32px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '32px',
              color: 'var(--ifm-text-color)',
              margin: '0 0 8px 0',
              fontWeight: 600
            }}>
              📡 硬件设备监控
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: '14px', margin: 0 }}>
                实时查看设备状态、运行指标 & 远程下发控制指令
              </p>
              {isMockMode && (
                <span style={{
                  padding: '4px 12px',
                  background: '#fff3e0',
                  color: '#f57c00',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  🧪 演示模式（模拟数据）
                </span>
              )}
              {useLocal && (
                <span style={{
                  padding: '4px 12px',
                  background: '#e8f5e9',
                  color: '#2e7d32',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  🖥️ 本地验证模式（localhost:8787）
                </span>
              )}
              {error && (
                <span style={{
                  padding: '4px 12px',
                  background: '#ffebee',
                  color: '#d32f2f',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  {error}
                </span>
              )}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '300px',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  color: 'var(--ifm-text-color)',
                  margin: 0,
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--ifm-color-emphasis-300)'
                }}>
                  我的设备
                </h3>
                {(user || useLocal) && (
                  <button
                    onClick={openAddDeviceModal}
                    style={{
                      padding: '8px 16px',
                      background: '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#388e3c'}
                    onMouseOut={(e) => e.target.style.background = '#4caf50'}
                  >
                    ➕ 添加设备
                  </button>
                )}
              </div>

              {devices.length === 0 ? (
                <EmptyTip text="暂无绑定设备" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {devices.map(device => (
                    <div
                      key={device.id}
                      onClick={() => setSelectedDevice(device)}
                      style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: selectedDevice?.id === device.id ? 'var(--ifm-color-emphasis-100)' : 'var(--ifm-card-background-color)',
                        border: '1px solid var(--ifm-color-emphasis-300)',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: selectedDevice?.id === device.id
                          ? '0 4px 12px rgba(33, 150, 243, 0.2)'
                          : '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                      onMouseOver={(e) => {
                        if (selectedDevice?.id !== device.id) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedDevice?.id !== device.id) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <strong style={{ fontSize: '16px', color: 'var(--ifm-text-color)' }}>
                          {device.device_name}
                        </strong>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: device.is_online ? '#e8f5e9' : '#ffebee',
                          color: device.is_online ? '#2e7d32' : '#c62828'
                        }}>
                          {device.is_online ? '● 在线' : '● 离线'}
                        </span>
                      </div>

                      <div style={{ fontSize: '14px', color: 'var(--ifm-color-emphasis-600)', lineHeight: '1.6' }}>
                        <div>🔋 电量: {device.battery_percent}%</div>
                        <div>📶 信号: {device.signal_strength} dBm</div>
                        {device.temperature && (
                          <>
                            <div>🌡️ 温度: {device.temperature.toFixed(1)} °C</div>
                            <div>⚡ 电压: {device.voltage.toFixed(2)} V</div>
                          </>
                        )}
                        {typeof device.backlight_on === 'boolean' && (
                          <div>💡 背光: {device.backlight_on ? '开启' : '关闭'}</div>
                        )}
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: 'var(--ifm-color-emphasis-600)',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px dashed var(--ifm-color-emphasis-300)'
                      }}>
                        最后心跳: {new Date(device.last_heartbeat).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '320px' }}>
              {selectedDevice ? (
                <>
                  <h3 style={{
                    fontSize: '20px',
                    color: 'var(--ifm-text-color)',
                    margin: '0 0 20px 0',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--ifm-color-emphasis-300)'
                  }}>
                    {selectedDevice.device_name} 运行详情
                  </h3>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '32px'
                  }}>
                    <button
                      onClick={() => sendCommand('reboot')}
                      disabled={sending || !selectedDevice.is_online}
                      style={{
                        padding: '10px 20px',
                        background: '#ff9800',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        cursor: sending || !selectedDevice.is_online ? 'not-allowed' : 'pointer',
                        opacity: sending || !selectedDevice.is_online ? 0.6 : 1,
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!sending && selectedDevice.is_online) e.target.style.background = '#f57c00';
                      }}
                      onMouseOut={(e) => e.target.style.background = '#ff9800'}
                    >
                      🔄 重启设备
                    </button>
                    <button
                      onClick={() => sendCommand('backlight_on')}
                      disabled={sending || !selectedDevice.is_online || selectedDevice.backlight_on}
                      style={{
                        padding: '10px 20px',
                        background: '#2196f3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        cursor: sending || !selectedDevice.is_online || selectedDevice.backlight_on ? 'not-allowed' : 'pointer',
                        opacity: sending || !selectedDevice.is_online || selectedDevice.backlight_on ? 0.6 : 1,
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!sending && selectedDevice.is_online && !selectedDevice.backlight_on) e.target.style.background = '#1976d2';
                      }}
                      onMouseOut={(e) => e.target.style.background = '#2196f3'}
                    >
                      💡 开启背光
                    </button>
                    <button
                      onClick={() => sendCommand('backlight_off')}
                      disabled={sending || !selectedDevice.is_online || !selectedDevice.backlight_on}
                      style={{
                        padding: '10px 20px',
                        background: '#757575',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        cursor: sending || !selectedDevice.is_online || !selectedDevice.backlight_on ? 'not-allowed' : 'pointer',
                        opacity: sending || !selectedDevice.is_online || !selectedDevice.backlight_on ? 0.6 : 1,
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!sending && selectedDevice.is_online && selectedDevice.backlight_on) e.target.style.background = '#616161';
                      }}
                      onMouseOut={(e) => e.target.style.background = '#757575'}
                    >
                      🌑 关闭背光
                    </button>
                    {sending && (
                      <span style={{
                        alignSelf: 'center',
                        color: '#2196f3',
                        fontSize: '14px'
                      }}>
                        指令发送中...
                      </span>
                    )}
                  </div>

                  <div style={{
                    background: 'var(--ifm-card-background-color)',
                    borderRadius: '16px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    padding: '20px',
                    marginBottom: '24px',
                    height: '300px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--ifm-text-color)' }}>🔋 电量趋势曲线</h4>
                    {metrics.length === 0 ? (
                      <div style={{ textAlign: 'center', lineHeight: '260px', color: 'var(--ifm-color-emphasis-600)' }}>
                        暂无时序数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--ifm-color-emphasis-100)" />
                          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="battery"
                            name="电量(%)"
                            stroke="#4caf50"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div style={{
                    background: 'var(--ifm-card-background-color)',
                    borderRadius: '16px',
                    border: '1px solid var(--ifm-color-emphasis-300)',
                    padding: '20px',
                    height: '300px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', color: 'var(--ifm-text-color)' }}>📶 信号 & 温度趋势曲线</h4>
                    {metrics.length === 0 ? (
                      <div style={{ textAlign: 'center', lineHeight: '260px', color: 'var(--ifm-color-emphasis-600)' }}>
                        暂无时序数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--ifm-color-emphasis-100)" />
                          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" domain={[-120, -30]} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 40]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="signal"
                            name="信号(dBm)"
                            stroke="#ff9800"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="temperature"
                            name="温度(°C)"
                            stroke="#2196f3"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </>
              ) : (
                <EmptyTip text="请在左侧选择一台设备查看运行详情" />
              )}
            </div>
          </div>

          {showAddDeviceModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
                boxSizing: 'border-box'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowAddDeviceModal(false);
              }}
            >
              <div style={{
                width: '100%',
                maxWidth: '500px',
                background: 'var(--ifm-card-background-color)',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
              }}>
                <h3 style={{
                  margin: '0 0 24px 0',
                  fontSize: '20px',
                  color: 'var(--ifm-text-color)'
                }}>
                  ➕ 添加新设备
                </h3>

                {formError && (
                  <div style={{
                    padding: '12px',
                    background: '#ffebee',
                    color: '#d32f2f',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      color: 'var(--ifm-color-emphasis-600)'
                    }}>
                      设备名称 *
                    </label>
                    <input
                      placeholder="如：卧室环境监测仪"
                      value={newDevice.device_name}
                      onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid var(--ifm-color-emphasis-300)',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease',
                        background: 'var(--ifm-card-background-color)',
                        color: 'var(--ifm-text-color)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      color: 'var(--ifm-color-emphasis-600)'
                    }}>
                      设备唯一ID * (如MAC/UUID)
                    </label>
                    <input
                      placeholder="如：A1:B2:C3:D4:E5:F6 或 550e8400-e29b-41d4-a716-446655440000"
                      value={newDevice.device_id}
                      onChange={(e) => setNewDevice({ ...newDevice, device_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid var(--ifm-color-emphasis-300)',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease',
                        background: 'var(--ifm-card-background-color)',
                        color: 'var(--ifm-text-color)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                    />
                    <p style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: 'var(--ifm-color-emphasis-600)',
                      margin: '8px 0 0 0'
                    }}>
                      请输入设备真实唯一标识，用于设备与平台通信认证
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '14px',
                        color: 'var(--ifm-color-emphasis-600)'
                      }}>
                        初始电量(%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newDevice.initial_battery}
                        onChange={(e) => setNewDevice({ ...newDevice, initial_battery: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '10px',
                          border: '1px solid var(--ifm-color-emphasis-300)',
                          fontSize: '15px',
                          outline: 'none',
                          transition: 'border 0.25s ease',
                          background: 'var(--ifm-card-background-color)',
                          color: 'var(--ifm-text-color)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '14px',
                        color: 'var(--ifm-color-emphasis-600)'
                      }}>
                        初始信号(dBm)
                      </label>
                      <input
                        type="number"
                        min="-120"
                        max="-30"
                        value={newDevice.initial_signal}
                        onChange={(e) => setNewDevice({ ...newDevice, initial_signal: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '14px',
                          borderRadius: '10px',
                          border: '1px solid var(--ifm-color-emphasis-300)',
                          fontSize: '15px',
                          outline: 'none',
                          transition: 'border 0.25s ease',
                          background: 'var(--ifm-card-background-color)',
                          color: 'var(--ifm-text-color)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      color: 'var(--ifm-color-emphasis-600)'
                    }}>
                      初始温度(°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="-20"
                      max="80"
                      value={newDevice.initial_temp}
                      onChange={(e) => setNewDevice({ ...newDevice, initial_temp: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid var(--ifm-color-emphasis-300)',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease',
                        background: 'var(--ifm-card-background-color)',
                        color: 'var(--ifm-text-color)'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--ifm-color-emphasis-300)'}
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    marginTop: '8px'
                  }}>
                    <button
                      onClick={() => setShowAddDeviceModal(false)}
                      style={{
                        padding: '12px 24px',
                        border: '1px solid var(--ifm-color-emphasis-300)',
                        borderRadius: '10px',
                        background: 'var(--ifm-card-background-color)',
                        color: 'var(--ifm-color-emphasis-600)',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'var(--ifm-color-emphasis-100)'}
                      onMouseOut={(e) => e.target.style.background = 'var(--ifm-card-background-color)'}
                    >
                      取消
                    </button>
                    <button
                      onClick={submitNewDevice}
                      disabled={formLoading}
                      style={{
                        padding: '12px 24px',
                        background: '#4caf50',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        cursor: formLoading ? 'not-allowed' : 'pointer',
                        opacity: formLoading ? 0.6 : 1,
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!formLoading) e.target.style.background = '#388e3c';
                      }}
                      onMouseOut={(e) => {
                        if (!formLoading) e.target.style.background = '#4caf50';
                      }}
                    >
                      {formLoading ? '添加中...' : '添加设备'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          top: 'calc(var(--ifm-navbar-height, 60px) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '12px 22px',
          borderRadius: '10px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          background: toast.type === 'error' ? '#c62828' : toast.type === 'success' ? '#2e7d32' : '#1565c0',
          maxWidth: '90vw'
        }}>
          {toast.message}
        </div>
      )}
    </Layout>
  );
}