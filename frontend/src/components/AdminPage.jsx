import React, { useState, useEffect } from 'react';
import { Settings, Users, LogOut, Database, ArrowLeft, Trash2, Shield, X, RefreshCw, TrendingUp, Activity, User as UserIcon, Crown, PencilLine, CheckCircle2, XCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import './ProfileResultStyles.css';
import './CrystalEnhancements.css';

export const AdminPage = ({ onBack, onLogout, username, sessionToken, userId }) => {
  const API_BASE_URL = (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api'));
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_users: 0,
    total_email_queries: 0,
    total_phone_queries: 0,
    active_sessions: 0,
    database_size_mb: 0,
    total_searches: 0,
    total_api_calls: 0,
  });
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    points: 0,
    is_admin: false,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editValues, setEditValues] = useState({ is_admin: false, is_active: true });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const pageSize = 20;
  
  // 积分管理相关状态
  const [pointsStats, setPointsStats] = useState({
    total_recharge: 0,
    total_consumption: 0,
    today_consumption: 0,
    total_rewards: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  useEffect(() => {
    // 防止快速切换标签导致的DOM冲突
    const timer = setTimeout(() => {
      if (activeTab === 'dashboard') {
        loadStats();
      } else if (activeTab === 'users') {
        loadUsers();
      } else if (activeTab === 'points') {
        loadPointsStats();
        loadTransactions();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  // 搜索时重置到第一页
  useEffect(() => {
    if (searchFilter) {
      setCurrentPage(1);
    }
  }, [searchFilter]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats?session_token=${sessionToken}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        toast.error('加载统计数据失败');
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('加载统计数据失败');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadUsers = async (page = currentPage) => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users?session_token=${sessionToken}&page=${page}&page_size=${pageSize}`);
      const data = await response.json();
      if (data.success) {
        // 确保每个用户都有唯一的ID
        const usersWithUniqueIds = data.data.map((user, index) => ({
          ...user,
          _uniqueKey: `${user.id}-${user.username}-${index}`
        }));
        setUsers(usersWithUniqueIds);
        setTotalUsers(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setCurrentPage(data.page || 1);
      } else {
        toast.error('加载用户列表失败');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('加载用户列表失败');
    } finally {
      setIsLoadingUsers(false);
    }
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      toast.error('请填写用户名和密码');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          email: newUser.email,
          points: Number(newUser.points) || 0,
          is_admin: newUser.is_admin,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('用户创建成功');
        setNewUser({ username: '', password: '', email: '', points: 0, is_admin: false });
        // 重新加载用户列表
        loadUsers();
      } else {
        toast.error(data.message || '创建用户失败');
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast.error('创建用户请求失败');
    }
  };

  const handleUpdateUserPartial = async (targetUserId, payload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}?session_token=${sessionToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('用户信息已更新');
        setEditUser(null);
        loadUsers();
      } else {
        toast.error(data.message || '更新用户信息失败');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('更新用户信息失败');
    }
  };

  const handleRecharge = async (user) => {
    const amountStr = window.prompt(`为用户 ${user.username} 充值积分：输入增加的积分数`, '10');
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('请输入有效的正整数积分');
      return;
    }
    const newPoints = (Number(user.points) || 0) + amount;
    await handleUpdateUserPartial(user.id, { points: newPoints });
  };

  const handleDeductPoints = async (user) => {
    const amountStr = window.prompt(`从用户 ${user.username} 扣除积分：输入扣除的积分数`, '10');
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('请输入有效的正整数积分');
      return;
    }
    const currentPoints = Number(user.points) || 0;
    if (amount > currentPoints) {
      toast.error(`用户积分不足。当前积分：${currentPoints}，要扣除：${amount}`);
      return;
    }
    const newPoints = currentPoints - amount;
    await handleUpdateUserPartial(user.id, { points: newPoints });
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditValues({ is_admin: !!user.is_admin, is_active: !!user.is_active });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    const payload = { is_admin: editValues.is_admin, is_active: editValues.is_active };
    await handleUpdateUserPartial(editUser.id, payload);
  };

  const handleDeleteUser = async (targetUserId) => {
    // 防止删除自己
    if (targetUserId === userId) {
      toast.error('无法删除自己的账户');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}?session_token=${sessionToken}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        toast.success('用户已删除');
        setShowDeleteConfirm(null);
        loadUsers();
      } else {
        toast.error(data.message || '删除用户失败');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('删除用户请求失败');
    }
  };

  const handleToggleAdminStatus = async (targetUserId, currentStatus) => {
    // 防止修改自己的管理员状态
    if (targetUserId === userId) {
      toast.error('无法修改自己的管理员权限');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}?session_token=${sessionToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_admin: !currentStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('用户权限已更新');
        loadUsers();
      } else {
        toast.error(data.message || '更新用户权限失败');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('更新用户权限失败');
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('确定要登出吗？')) {
      onLogout();
    }
  };

  // 加载积分统计数据
  const loadPointsStats = async () => {
    setIsLoadingPoints(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/points/stats?session_token=${sessionToken}`);
      const data = await response.json();
      if (data.success) {
        setPointsStats(data.data);
      } else {
        toast.error('加载积分统计失败');
      }
    } catch (error) {
      console.error('Failed to load points stats:', error);
      toast.error('加载积分统计失败');
    } finally {
      setIsLoadingPoints(false);
    }
  };

  // 加载交易记录
  const loadTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/points/transactions?session_token=${sessionToken}&limit=10&offset=0`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data || []);
      } else {
        toast.error('加载交易记录失败');
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('加载交易记录失败');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // 数据可视化数据
  const chartData = [
    { name: '周一', queries: stats.total_email_queries * 0.15, users: 4 },
    { name: '周二', queries: stats.total_email_queries * 0.2, users: 3 },
    { name: '周三', queries: stats.total_email_queries * 0.25, users: 2 },
    { name: '周四', queries: stats.total_email_queries * 0.18, users: 2.78 },
    { name: '周五', queries: stats.total_email_queries * 0.22, users: 1.89 },
    { name: '周六', queries: stats.total_email_queries * 0.1, users: 2.39 },
    { name: '周日', queries: stats.total_email_queries * 0.05, users: 2.48 },
  ];

  const queryTypeData = [
    { name: '邮箱查询', value: stats.total_email_queries },
    { name: '电话查询', value: stats.total_phone_queries },
  ];

  const COLORS = ['#3b82f6', '#ef4444'];

  const filteredUsers = users.filter(user =>
    (user.username || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchFilter.toLowerCase())
  );
  
  // 本地筛选后的分页（搜索时使用）
  const localTotalUsers = filteredUsers.length;
  const localTotalPages = Math.max(1, Math.ceil(localTotalUsers / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, localTotalUsers);
  const paginatedUsers = searchFilter ? filteredUsers.slice(startIndex, endIndex) : filteredUsers;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* 水晶装饰球 */}
      <div className="crystal-orb crystal-orb-1"></div>
      <div className="crystal-orb crystal-orb-2"></div>
      <div className="crystal-orb crystal-orb-3"></div>
      
      {/* Header - 玻璃态 */}
      <div className="border-b border-cyan-500/20 sticky top-0 z-40 backdrop-blur-xl bg-slate-900/60" style={{
        background: 'linear-gradient(135deg, rgba(14, 20, 25, 0.9) 0%, rgba(10, 22, 40, 0.85) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0, 213, 213, 0.12), inset 0 1px 1px rgba(0, 213, 213, 0.2)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(0, 213, 213, 0.2) 0%, rgba(26, 155, 142, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 213, 213, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 213, 213, 0.2), inset 0 1px 2px rgba(0, 213, 213, 0.15)'
            }}>
              <Settings className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-lg">
              管理面板
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-cyan-300/80 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
              background: 'rgba(0, 213, 213, 0.1)',
              border: '1px solid rgba(0, 213, 213, 0.2)'
            }}>
              <Crown className="w-4 h-4 text-cyan-400" /> {username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBack()}
              className="gap-2 glass-card border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogoutClick}
              className="gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.2) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5'
              }}
            >
              <LogOut className="w-4 h-4" />
              登出
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - 玻璃态 */}
      <div className="border-b border-cyan-500/20 sticky top-[88px] z-30" style={{
        background: 'linear-gradient(135deg, rgba(14, 20, 25, 0.85) 0%, rgba(10, 22, 40, 0.75) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)'
      }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {[
              { id: 'dashboard', label: '仪表板', icon: Database },
              { id: 'users', label: '用户管理', icon: Users },
              { id: 'points', label: '积分管理', icon: Activity },
              { id: 'apikeys', label: 'API密钥', icon: Shield },
              { id: 'logs', label: '查询日志', icon: TrendingUp },
              { id: 'settings', label: '系统设置', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 border-b-2 font-semibold transition-all duration-300 relative group ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300'
                }`}
                style={activeTab === tab.id ? {
                  textShadow: '0 0 10px rgba(0, 213, 213, 0.5)'
                } : {}}
              >
                <span className="inline-flex items-center gap-2 relative z-10">
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-cyan-500/10 blur-xl"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header with Refresh */}
            <div className="flex justify-between items-center fade-in-up">
              <div>
                <h2 className="text-4xl font-bold text-cyan-300">系统统计仪表板</h2>
                <p className="text-sm text-gray-400 mt-2">实时系统数据和分析</p>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  显示 {totalUsers === 0 ? 0 : startIndex + 1} - {endIndex} / 共 {totalUsers} 条
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={loadStats}
                disabled={isLoadingStats}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                {isLoadingStats ? '刷新中...' : '刷新数据'}
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  title: '总用户数', 
                  value: stats.total_users, 
                  icon: Users,
                  color: 'from-blue-500 to-blue-600',
                  trend: '+2.5%'
                },
                { 
                  title: '邮箱查询', 
                  value: stats.total_email_queries, 
                  icon: Database,
                  color: 'from-green-500 to-green-600',
                  trend: '+12.3%'
                },
                { 
                  title: '电话查询', 
                  value: stats.total_phone_queries, 
                  icon: TrendingUp,
                  color: 'from-purple-500 to-purple-600',
                  trend: '+8.1%'
                },
                { 
                  title: '活跃会话', 
                  value: stats.active_sessions, 
                  icon: Activity,
                  color: 'from-orange-500 to-orange-600',
                  trend: '+4.2%'
                },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="p-6 border-0 bg-gradient-to-br shadow-lg hover:shadow-xl transition-shadow">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 rounded-lg`}></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                        <Icon className={`w-6 h-6 text-primary/60`} />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-4xl font-bold">{stat.value.toLocaleString()}</p>
                          <p className="text-xs text-green-500 mt-1">{stat.trend}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Query Trend Chart */}
              <Card className="col-span-1 lg:col-span-2 p-6 border-0 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">查询趋势 (最近7天)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="queries"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorQueries)"
                      name="查询次数"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Query Type Distribution */}
              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">查询类型分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={queryTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {queryTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">邮箱查询成功率</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {stats.total_email_queries > 0 
                      ? Math.round((stats.successful_email_queries / stats.total_email_queries) * 100)
                      : 0}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stats.successful_email_queries} / {stats.total_email_queries}
                  </span>
                </div>
              </Card>

              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">电话查询成功率</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {stats.total_phone_queries > 0 
                      ? Math.round((stats.successful_phone_queries / stats.total_phone_queries) * 100)
                      : 0}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stats.successful_phone_queries} / {stats.total_phone_queries}
                  </span>
                </div>
              </Card>

              <Card className="p-6 border-0 shadow-lg">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">数据库大小</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.database_size_mb}</span>
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">用户管理</h2>

            {/* Create New User */}
            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-6">➕ 添加用户</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">用户名</label>
                    <input
                      type="text"
                      placeholder="输入用户名"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">密码</label>
                    <input
                      type="text"
                      placeholder="输入密码"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">邮箱</label>
                    <input
                      type="email"
                      placeholder="输入邮箱"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">积分</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="初始积分"
                      value={newUser.points}
                      onChange={(e) => setNewUser({ ...newUser, points: e.target.value })}
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.is_admin}
                        onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">管理员权限</span>
                    </label>
                  </div>
                  <Button type="submit" className="h-10">
                    添加用户
                  </Button>
                </div>
              </form>
            </Card>

            {/* Users List */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold inline-flex items-center gap-2"><Users className="w-5 h-5" /> 用户列表</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchFilter ? `${localTotalUsers} 个搜索结果` : `共 ${totalUsers} 个用户`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="搜索用户名或邮箱..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadUsers}
                    disabled={isLoadingUsers}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/50 bg-background/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">ID</th>
                      <th className="text-left py-3 px-4 font-semibold">用户名</th>
                      <th className="text-left py-3 px-4 font-semibold">邮箱</th>
                      <th className="text-left py-3 px-4 font-semibold">角色</th>
                      <th className="text-left py-3 px-4 font-semibold">积分</th>
                      <th className="text-left py-3 px-4 font-semibold">状态</th>
                      <th className="text-left py-3 px-4 font-semibold">创建时间</th>
                      <th className="text-left py-3 px-4 font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 px-4 text-center text-muted-foreground">
                          {searchFilter ? '未找到匹配的用户' : '没有用户数据'}
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => (
                        <tr key={user._uniqueKey || `${user.id}-${user.username}`} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                          <td className="py-3 px-4 text-xs text-muted-foreground">{user.id}</td>
                          <td className="py-3 px-4 font-medium">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {user.username}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">{user.email || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.is_admin
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <span className="inline-flex items-center gap-1">
                                {user.is_admin ? (
                                  <>
                                    <Crown className="w-4 h-4" /> 管理员
                                  </>
                                ) : (
                                  <>
                                    <PencilLine className="w-4 h-4" /> 用户
                                  </>
                                )}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4">{Number(user.points || 0)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.is_active
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }`}>
                              <span className="inline-flex items-center gap-1">
                                {user.is_active ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" /> 活跃
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" /> 禁用
                                  </>
                                )}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => handleRecharge(user)}>充值</Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeductPoints(user)} title="直接扣除用户积分">扣费</Button>
                              <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>编辑</Button>
                              {user.id !== userId && (
                                <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(user.id)}>删除</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 分页控件 */}
              <div className="mt-6 flex items-center justify-between border-t border-border/30 pt-4">
                <div className="text-sm text-muted-foreground">
                  {searchFilter ? (
                    `显示 ${startIndex + 1}-${endIndex} 条，共 ${localTotalUsers} 条搜索结果`
                  ) : (
                    `显示第 ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalUsers)} 条，共 ${totalUsers} 条记录`
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1 || isLoadingUsers}
                    onClick={() => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      if (!searchFilter) loadUsers(newPage);
                    }}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(7, searchFilter ? localTotalPages : totalPages) }, (_, i) => {
                      const displayTotalPages = searchFilter ? localTotalPages : totalPages;
                      let pageNum;
                      
                      if (displayTotalPages <= 7) {
                        pageNum = i + 1;
                      } else {
                        if (i === 0) pageNum = 1;
                        else if (i === 6) pageNum = displayTotalPages;
                        else if (currentPage <= 4) pageNum = i + 1;
                        else if (currentPage >= displayTotalPages - 3) pageNum = displayTotalPages - 6 + i;
                        else pageNum = currentPage - 3 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            if (!searchFilter) loadUsers(pageNum);
                          }}
                          disabled={isLoadingUsers}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === (searchFilter ? localTotalPages : totalPages) || isLoadingUsers}
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      if (!searchFilter) loadUsers(newPage);
                    }}
                    className="gap-1"
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">系统设置</h2>

            {/* Database Info */}
            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-6 inline-flex items-center gap-2"><Database className="w-5 h-5" /> 数据库信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">数据库类型:</span>
                    <span className="font-medium">SQLite 3</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">文件位置:</span>
                    <span className="font-medium text-sm font-mono">./osint_tracker.db</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">数据库大小:</span>
                    <span className="font-medium">{stats.database_size_mb} MB</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">备份状态:</span>
                    <span className="font-medium text-green-500 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> 正常</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">活跃连接:</span>
                    <span className="font-medium">{stats.active_sessions}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">缓存条目:</span>
                    <span className="font-medium">{stats.cached_results}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">总查询数:</span>
                    <span className="font-medium">{stats.total_searches}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">API调用数:</span>
                    <span className="font-medium">{stats.total_api_calls}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* System Health */}
            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-6 inline-flex items-center gap-2"><Zap className="w-5 h-5" /> 系统健康状态</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div>
                    <p className="font-medium">系统运行</p>
                    <p className="text-xs text-muted-foreground">已连接并正常运行</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div>
                    <p className="font-medium">数据库连接</p>
                    <p className="text-xs text-muted-foreground">SQLite 数据库已连接</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div>
                    <p className="font-medium">API 服务</p>
                    <p className="text-xs text-muted-foreground">所有外部 API 可用</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Points Management Tab */}
        {activeTab === 'points' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold">积分管理</h2>
                <p className="text-sm text-muted-foreground mt-1">查询消耗、充值与积分统计</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  loadPointsStats();
                  loadTransactions();
                }}
                disabled={isLoadingPoints || isLoadingTransactions}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${(isLoadingPoints || isLoadingTransactions) ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 border-0 shadow-lg">
                <p className="text-sm text-muted-foreground">累计充值</p>
                <div className="mt-2 text-3xl font-bold text-green-500">
                  {isLoadingPoints ? '...' : pointsStats.total_recharge.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">管理员充值总额</p>
              </Card>
              <Card className="p-6 border-0 shadow-lg">
                <p className="text-sm text-muted-foreground">累计查询消耗</p>
                <div className="mt-2 text-3xl font-bold text-red-500">
                  {isLoadingPoints ? '...' : pointsStats.total_consumption.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">用户查询消耗总额</p>
              </Card>
              <Card className="p-6 border-0 shadow-lg">
                <p className="text-sm text-muted-foreground">今日查询消耗</p>
                <div className="mt-2 text-3xl font-bold text-orange-500">
                  {isLoadingPoints ? '...' : pointsStats.today_consumption.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">今日用户查询消耗</p>
              </Card>
              <Card className="p-6 border-0 shadow-lg">
                <p className="text-sm text-muted-foreground">累计奖励</p>
                <div className="mt-2 text-3xl font-bold text-blue-500">
                  {isLoadingPoints ? '...' : pointsStats.total_rewards.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">系统发放奖励总额</p>
              </Card>
            </div>

            {/* Points Transactions Table */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">积分交易记录</h3>
                <p className="text-sm text-muted-foreground">最近 10 条</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/50 bg-background/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">时间</th>
                      <th className="text-left py-3 px-4 font-semibold">用户</th>
                      <th className="text-left py-3 px-4 font-semibold">变动</th>
                      <th className="text-left py-3 px-4 font-semibold">类型</th>
                      <th className="text-left py-3 px-4 font-semibold">原因</th>
                      <th className="text-left py-3 px-4 font-semibold">余额</th>
                      <th className="text-left py-3 px-4 font-semibold">操作人</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingTransactions ? (
                      <tr>
                        <td colSpan="7" className="py-8 px-4 text-center text-muted-foreground">
                          <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                          加载中...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 px-4 text-center text-muted-foreground">
                          暂无交易记录
                        </td>
                      </tr>
                    ) : (
                      transactions.map((trans) => (
                        <tr key={trans.id} className="border-b border-border/30 hover:bg-background/50 transition-colors">
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(trans.time).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3 px-4 font-medium">{trans.user}</td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${trans.delta.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                              {trans.delta}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trans.type === 'recharge' ? 'bg-green-500/20 text-green-500' :
                              trans.type === 'consumption' ? 'bg-red-500/20 text-red-500' :
                              trans.type === 'reward' ? 'bg-blue-500/20 text-blue-500' :
                              'bg-orange-500/20 text-orange-500'
                            }`}>
                              {trans.type === 'recharge' ? '充值' :
                               trans.type === 'consumption' ? '消耗' :
                               trans.type === 'reward' ? '奖励' : '扣除'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs max-w-xs truncate" title={trans.reason}>
                            {trans.reason}
                          </td>
                          <td className="py-3 px-4 font-medium">{trans.balance}</td>
                          <td className="py-3 px-4 text-xs">{trans.operator}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'apikeys' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">API密钥</h2>
            <p className="text-sm text-muted-foreground">管理和查看系统使用的外部API密钥</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 border-0 shadow-lg">
                <p className="text-sm text-muted-foreground">活跃API密钥</p>
                <div className="mt-2 text-3xl font-bold">-</div>
              </Card>
            </div>

            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">密钥列表</h3>
              <div className="py-8 px-4 text-center text-muted-foreground">
                🔑 API 密钥列表将从后端加载（待实现）
              </div>
            </Card>
          </div>
        )}

        {/* Query Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">查询日志</h2>
            <p className="text-sm text-muted-foreground">系统最近活动</p>

            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">最近活动</h3>
              <div className="py-8 px-4 text-center text-muted-foreground">
                📜 系统日志将从后端加载（待实现）
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="p-6 max-w-sm w-full mx-4 border-0 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">⚠️ 确认删除用户</h3>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              确定要删除该用户吗？此操作无法撤销，用户的所有会话也将被终止。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  handleDeleteUser(showDeleteConfirm);
                }}
              >
                删除用户
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="p-6 max-w-sm w-full mx-4 border-0 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">✏️ 编辑用户</h3>
              <button
                onClick={() => setEditUser(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <span className="text-sm">管理员权限</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editValues.is_admin}
                    onChange={(e) => setEditValues({ ...editValues, is_admin: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <span className="text-sm">启用状态</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editValues.is_active}
                    onChange={(e) => setEditValues({ ...editValues, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>取消</Button>
              <Button className="flex-1" onClick={handleSaveEdit}>保存</Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdminPage;
