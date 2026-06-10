import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { supabase } from '@/supabase/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const metadata = { ssr: false };

// ===================== 内置模拟演示数据（固定实例，无数据库也能运行） =====================
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

// 模拟时序图表数据
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
  const [isMockMode, setIsMockMode] = useState(false); // 模拟演示模式标记
  
  // 新增：添加设备相关状态
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_name: '',
    device_id: '', // 设备唯一标识符（如MAC/UUID）
    initial_battery: 100,
    initial_signal: -60,
    initial_temp: 25.0
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // 全局样式 - 空状态组件（全站统一）
  const EmptyTip = ({ text }) => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      color: '#94a3b8',
      fontSize: '15px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px dashed #e2e8f0'
    }}>
      📭 {text}
    </div>
  );

  // 加载设备列表 + 初始化
  useEffect(() => {
    let fetchTimer = null;
    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError('');
        // 获取登录用户
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // 未登录：直接启用模拟演示模式
        if (!currentUser) {
          setIsMockMode(true);
          setDevices(MOCK_DEVICES);
          setSelectedDevice(MOCK_DEVICES[0]);
          setMetrics(MOCK_METRICS);
          setLoading(false);
          return;
        }

        // 已登录：请求真实设备数据
        const { data, err } = await supabase
          .from('devices')
          .select('*')
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (err) throw err;

        // 真实数据为空：切换到模拟模式
        if (!data || data.length === 0) {
          setIsMockMode(true);
          setDevices(MOCK_DEVICES);
          setSelectedDevice(MOCK_DEVICES[0]);
          setMetrics(MOCK_METRICS);
        } else {
          setIsMockMode(false);
          setDevices(data);
          // 默认选中第一个设备
          setSelectedDevice(data[0]);
        }
      } catch (err) {
        console.error('加载设备失败：', err);
        setError('数据加载异常，已切换为演示模式');
        // 异常兜底：启用模拟数据
        setIsMockMode(true);
        setDevices(MOCK_DEVICES);
        setSelectedDevice(MOCK_DEVICES[0]);
        setMetrics(MOCK_METRICS);
      } finally {
        setLoading(false);
      }
    };

    // 首次加载
    fetchDevices();
    // 30秒轮询刷新
    fetchTimer = setInterval(fetchDevices, 30000);

    // 组件销毁时清除定时器
    return () => clearInterval(fetchTimer);
  }, []);

  // 加载设备时序指标数据（重构：按时间聚合多类型指标）
  useEffect(() => {
    if (!selectedDevice) return;

    // 模拟模式：直接使用内置图表数据
    if (isMockMode) {
      setMetrics(MOCK_METRICS);
      return;
    }

    // 真实数据库模式
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

        // 重构：按时间戳聚合 电量/信号/温度
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

        // 转为数组并按时间正序
        setMetrics(Array.from(timeMap.values()));
      } catch (err) {
        console.error('加载指标数据失败：', err);
      }
    };

    fetchMetrics();
  }, [selectedDevice, isMockMode]);

  // 发送设备指令（兼容真实/模拟模式）
  const sendCommand = async (command) => {
    if (!selectedDevice || sending || !selectedDevice.is_online) return;
    setSending(true);

    try {
      // 真实模式：提交指令到数据库
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

  // ====================================== 新增：添加设备核心逻辑 ======================================
  // 打开添加设备模态框
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

  // 验证设备ID唯一性（真实数据库模式）
  const validateDeviceId = async (deviceId) => {
    if (isMockMode) return true; // 模拟模式跳过验证
    try {
      const { data, err } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceId)
        .limit(1);
      
      if (err) throw err;
      return data.length === 0; // 不存在返回true，存在返回false
    } catch (err) {
      console.error('验证设备ID失败：', err);
      return false;
    }
  };

  // 提交新设备
  const submitNewDevice = async () => {
    // 表单基础验证
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
      // 验证设备ID唯一性
      const isUnique = await validateDeviceId(newDevice.device_id.trim());
      if (!isUnique) {
        setFormError('该设备ID已存在，请更换');
        return;
      }

      // 构造新设备数据
      const deviceData = {
        device_name: newDevice.device_name.trim(),
        device_id: newDevice.device_id.trim(),
        owner_id: user.id,
        is_online: false, // 初始状态为离线
        battery_percent: parseInt(newDevice.initial_battery, 10) || 100,
        signal_strength: parseInt(newDevice.initial_signal, 10) || -60,
        temperature: parseFloat(newDevice.initial_temp) || 25.0,
        voltage: 3.3, // 默认初始电压
        last_heartbeat: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // 模拟模式：仅前端添加
      if (isMockMode) {
        const newMockDevice = {
          ...deviceData,
          id: `mock-${Date.now().toString().slice(-6)}` // 生成临时ID
        };
        setDevices([newMockDevice, ...devices]);
        setSelectedDevice(newMockDevice);
      } else {
        // 真实模式：写入数据库
        const { data, err } = await supabase
          .from('devices')
          .insert([deviceData])
          .select(); // 插入后返回新数据
        if (err) throw err;
        
        // 刷新设备列表并选中新设备
        if (data && data.length > 0) {
          setDevices([data[0], ...devices]);
          setSelectedDevice(data[0]);
        }
      }

      // 关闭模态框
      setShowAddDeviceModal(false);
      alert('设备添加成功！等待设备上线...');
    } catch (err) {
      console.error('添加设备失败：', err);
      setFormError(`添加失败：${err.message || '未知错误'}`);
    } finally {
      setFormLoading(false);
    }
  };

  // 全局加载页面
  if (loading) {
    return (
      <Layout title="硬件设备监控">
        <div style={{
          maxWidth: '1200px',
          margin: '60px auto',
          padding: '0 20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '16px'
        }}>
          正在加载设备数据...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="硬件设备监控">
      {/* 页面外层容器 - 全站统一底色 */}
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        background: '#f8fafc',
        padding: '32px 20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* 页面头部 */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '32px',
              color: '#1e293b',
              margin: '0 0 8px 0',
              fontWeight: 600
            }}>
              📡 硬件设备监控
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
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

          {/* 主体布局：左右分栏（移动端自动上下） */}
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            {/* 左侧：设备列表 */}
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
                  color: '#1e293b',
                  margin: 0,
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  我的设备
                </h3>
                {/* 新增：添加设备按钮（仅登录用户可见） */}
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
                        background: selectedDevice?.id === device.id ? '#e3f2fd' : '#ffffff',
                        border: '1px solid #e2e8f0',
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
                      {/* 设备名称 + 在线状态 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <strong style={{ fontSize: '16px', color: '#1e293b' }}>
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

                      {/* 基础状态 */}
                      <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                        <div>🔋 电量: {device.battery_percent}%</div>
                        <div>📶 信号: {device.signal_strength} dBm</div>
                        {device.temperature && (
                          <>
                            <div>🌡️ 温度: {device.temperature.toFixed(1)} °C</div>
                            <div>⚡ 电压: {device.voltage.toFixed(2)} V</div>
                          </>
                        )}
                      </div>

                      {/* 最后心跳 */}
                      <div style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px dashed #f1f5f9'
                      }}>
                        最后心跳: {new Date(device.last_heartbeat).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 右侧：设备详情 + 图表 */}
            <div style={{ flex: 1, minWidth: '320px' }}>
              {selectedDevice ? (
                <>
                  {/* 设备标题 */}
                  <h3 style={{
                    fontSize: '20px',
                    color: '#1e293b',
                    margin: '0 0 20px 0',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    {selectedDevice.device_name} 运行详情
                  </h3>

                  {/* 远程控制按钮组 */}
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

                  {/* 电量趋势图表 */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    marginBottom: '24px',
                    height: '300px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>🔋 电量趋势曲线</h4>
                    {metrics.length === 0 ? (
                      <div style={{ textAlign: 'center', lineHeight: '260px', color: '#94a3b8' }}>
                        暂无时序数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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

                  {/* 信号 + 温度 组合图表 */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    height: '300px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>📶 信号 & 温度趋势曲线</h4>
                    {metrics.length === 0 ? (
                      <div style={{ textAlign: 'center', lineHeight: '260px', color: '#94a3b8' }}>
                        暂无时序数据
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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

          {/* ====================================== 新增：添加设备模态框 ====================================== */}
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
                // 点击遮罩关闭弹窗
                if (e.target === e.currentTarget) setShowAddDeviceModal(false);
              }}
            >
              <div style={{
                width: '100%',
                maxWidth: '500px',
                background: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
              }}>
                <h3 style={{
                  margin: '0 0 24px 0',
                  fontSize: '20px',
                  color: '#1e293b'
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
                      color: '#475569'
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
                        border: '1px solid #e2e8f0',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      color: '#475569'
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
                        border: '1px solid #e2e8f0',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <p style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#94a3b8',
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
                        color: '#475569'
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
                          border: '1px solid #e2e8f0',
                          fontSize: '15px',
                          outline: 'none',
                          transition: 'border 0.25s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '14px',
                        color: '#475569'
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
                          border: '1px solid #e2e8f0',
                          fontSize: '15px',
                          outline: 'none',
                          transition: 'border 0.25s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      color: '#475569'
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
                        border: '1px solid #e2e8f0',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border 0.25s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2196f3'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'background 0.25s ease'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                      onMouseOut={(e) => e.target.style.background = '#ffffff'}
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