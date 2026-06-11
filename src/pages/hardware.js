import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const metadata = { ssr: false };

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
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (!currentUser) {
          setIsMockMode(true);
          setDevices(MOCK_DEVICES);
          setSelectedDevice(MOCK_DEVICES[0]);
          setMetrics(MOCK_METRICS);
          setLoading(false);
          return;
        }

        const { data, err } = await supabase
          .from('devices')
          .select('*')
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (err) throw err;

        if (!data || data.length === 0) {
          setIsMockMode(true);
          setDevices(MOCK_DEVICES);
          setSelectedDevice(MOCK_DEVICES[0]);
          setMetrics(MOCK_METRICS);
        } else {
          setIsMockMode(false);
          setDevices(data);
          setSelectedDevice(data[0]);
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
        const { data, err } = await supabase
          .from('device_metrics')
          .select('*')
          .eq('device_id', selectedDevice.id)
          .order('timestamp', { ascending: false })
          .limit(80);

        if (err) throw err;
        if (!data || data.length === 0) {
          setMetrics([]);
          return;
        }

        const timeMap = new Map();
        data.forEach(item => {
          const timeStr = new Date(item.timestamp).toLocaleTimeString().slice(0, 5);
          if (!timeMap.has(timeStr)) {
            timeMap.set(timeStr, { time: timeStr, battery: null, signal: null, temperature: null });
          }
          const row = timeMap.get(timeStr);
          if (item.metric_type === 'battery') row.battery = item.value;
          if (item.metric_type === 'signal') row.signal = item.value;
          if (item.metric_type === 'temperature') row.temperature = item.value;
        });
        setMetrics(Array.from(timeMap.values()));
      } catch (err) {
        console.error('加载指标数据失败：', err);
      }
    };
    fetchMetrics();
  }, [selectedDevice, isMockMode]);

  const sendCommand = async (command) => {
    if (!selectedDevice || sending || !selectedDevice.is_online) return;
    setSending(true);
    try {
      if (!isMockMode) {
        await supabase.from('device_commands').insert([{
          device_id: selectedDevice.id,
          command
        }]);
      }
      alert(`指令【${command}】发送成功，设备正在执行`);
    } catch (err) {
      alert(`指令发送失败：${err.message}`);
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
    if (isMockMode) return true;
    try {
      const { data, err } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceId)
        .limit(1);
      if (err) throw err;
      return data.length === 0;
    } catch (err) {
      console.error('验证设备ID失败：', err);
      return false;
    }
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
    if (!user) {
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
        const { data, err } = await supabase
          .from('devices')
          .insert([deviceData])
          .select();
        if (err) throw err;
        if (data && data.length > 0) {
          setDevices([data[0], ...devices]);
          setSelectedDevice(data[0]);
        }
      }
      setShowAddDeviceModal(false);
      alert('设备添加成功！等待设备上线...');
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
          正在加载设备数据...
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
                {user && (
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
                      disabled={sending || !selectedDevice.is_online}
                      style={{
                        padding: '10px 20px',
                        background: '#2196f3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        cursor: sending || !selectedDevice.is_online ? 'not-allowed' : 'pointer',
                        opacity: sending || !selectedDevice.is_online ? 0.6 : 1,
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!sending && selectedDevice.is_online) e.target.style.background = '#1976d2';
                      }}
                      onMouseOut={(e) => e.target.style.background = '#2196f3'}
                    >
                      💡 开启背光
                    </button>
                    <button
                      onClick={() => sendCommand('backlight_off')}
                      disabled={sending || !selectedDevice.is_online}
                      style={{
                        padding: '10px 20px',
                        background: '#757575',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        cursor: sending || !selectedDevice.is_online ? 'not-allowed' : 'pointer',
                        opacity: sending || !selectedDevice.is_online ? 0.6 : 1,
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!sending && selectedDevice.is_online) e.target.style.background = '#616161';
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
    </Layout>
  );
}