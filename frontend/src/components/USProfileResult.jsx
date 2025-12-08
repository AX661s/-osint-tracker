import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Shield, User, Phone, MapPin, Calendar, FileText, AlertTriangle, Briefcase, Database, Globe, Lock, Mail, Printer, Download, Share2, MapPinned, Star, DollarSign, Home, Users, Car, TrendingUp, Activity, Award } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './ProfileResultStyles.css';
import './CrystalEnhancements.css';
import { StatsGrid, DataBreachStats, SocialAccountsStats, EmailsStats, RiskScoreStats } from './PremiumStatsCard';

// Mapbox Token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3RlaW4xMjMiLCJhIjoiY21ocTVwam9xMGE4aTJrczd4MW9yNTYzbyJ9.d2rHs6GWcZRkgdD6FAQaMA';

// 多地点地图组件 - 标记所有Google评论地点
const MultiLocationMap = ({ locations }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geocodedCoords, setGeocodedCoords] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // 批量地址解析
  useEffect(() => {
    if (!locations || locations.length === 0) return;
    
    const geocodeAllAddresses = async () => {
      setIsLoading(true);
      const coords = [];
      
      for (const location of locations) {
        try {
          const query = encodeURIComponent(location.address);
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxgl.accessToken}&limit=1`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            coords.push({
              lat,
              lng,
              name: location.name,
              address: location.address,
              index: location.index
            });
          }
        } catch (error) {
          console.error('📍 [MultiLocationMap] Geocoding error for:', location.name, error);
        }
      }
      
      console.log('📍 [MultiLocationMap] Geocoded', coords.length, 'locations');
      setGeocodedCoords(coords);
      setIsLoading(false);
    };
    
    geocodeAllAddresses();
  }, [locations]);

  // 初始化地图
  useEffect(() => {
    if (!geocodedCoords || geocodedCoords.length === 0) return;
    if (!mapContainer.current) return;

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    try {
      // 使用第一个点作为初始中心
      const center = geocodedCoords[0];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [center.lng, center.lat],
        zoom: 11
      });

      // 为每个地点添加标记
      geocodedCoords.forEach((coord, idx) => {
        // 创建自定义标记HTML
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.cssText = `
          background-color: #ef4444;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
        el.textContent = coord.index;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; max-width: 250px;">
            <strong style="color: #1f2937; font-size: 14px;">${coord.name}</strong>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280; line-height: 1.4;">
              ${coord.address}
            </p>
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([coord.lng, coord.lat])
          .setPopup(popup)
          .addTo(map.current);
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // 自动调整视图以包含所有点
      if (geocodedCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        geocodedCoords.forEach(coord => bounds.extend([coord.lng, coord.lat]));
        map.current.fitBounds(bounds, { 
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 13
        });
      }
    } catch (error) {
      console.error('📍 [MultiLocationMap] Map initialization error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [geocodedCoords]);

  if (isLoading) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-muted-foreground">正在加载地图...</div>
        </div>
      </div>
    );
  }

  if (!geocodedCoords || geocodedCoords.length === 0) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <MapPinned className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div className="text-sm">正在解析地址...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full relative">
      <div ref={mapContainer} className="h-full w-full" />
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-800/95 px-3 py-2 rounded-lg shadow-lg border border-border">
        <div className="text-xs font-medium text-foreground">
          已标记 {geocodedCoords.length} / {locations.length} 个地点
        </div>
      </div>
    </div>
  );
};

// 地图组件 - 使用 Mapbox GL，支持地址自动 Geocoding
const MapSection = ({ coordinates, address }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geocodedCoords, setGeocodedCoords] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // 如果没有坐标但有地址，使用 Mapbox Geocoding API
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      setGeocodedCoords(coordinates);
      return;
    }
    
    if (!address) return;
    
    const geocodeAddress = async () => {
      setIsLoading(true);
      try {
        const query = encodeURIComponent(address);
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxgl.accessToken}&limit=1`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setGeocodedCoords([{ lat, lng, source: '地址解析', description: address }]);
        }
      } catch (error) {
        console.error('📍 [MapSection] Geocoding error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    geocodeAddress();
  }, [coordinates, address]);

  // 初始化地图
  useEffect(() => {
    if (!geocodedCoords || geocodedCoords.length === 0) return;
    if (!mapContainer.current) return;

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    const center = geocodedCoords[0];

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [center.lng, center.lat],
        zoom: 14
      });

      geocodedCoords.forEach(coord => {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; max-width: 200px;">
            <strong>${coord.source || '位置'}</strong>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
              ${coord.description || address || '标记位置'}
            </p>
          </div>
        `);

        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([coord.lng, coord.lat])
          .setPopup(popup)
          .addTo(map.current);
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      if (geocodedCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        geocodedCoords.forEach(coord => bounds.extend([coord.lng, coord.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('📍 [MapSection] Map initialization error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [geocodedCoords, address]);

  if (isLoading) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative shadow-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-muted-foreground">正在加载地图...</div>
        </div>
      </div>
    );
  }

  if (!geocodedCoords || geocodedCoords.length === 0) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative shadow-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPinned className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div className="text-sm">正在解析地址...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative shadow-lg">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

// 电话号码前缀对应的国家代码映射
const PHONE_PREFIX_TO_COUNTRY = {
  '62': 'ID',   // 印尼
  '1': 'US',    // 美国/加拿大
  '44': 'GB',   // 英国
  '86': 'CN',   // 中国
  '81': 'JP',   // 日本
  '82': 'KR',   // 韩国
  '65': 'SG',   // 新加坡
  '60': 'MY',   // 马来西亚
  '66': 'TH',   // 泰国
  '63': 'PH',   // 菲律宾
  '84': 'VN',   // 越南
  '91': 'IN',   // 印度
  '61': 'AU',   // 澳大利亚
  '49': 'DE',   // 德国
  '33': 'FR',   // 法国
  '39': 'IT',   // 意大利
  '34': 'ES',   // 西班牙
  '7': 'RU',    // 俄罗斯
  '55': 'BR',   // 巴西
  '52': 'MX',   // 墨西哥
  '971': 'AE',  // 阿联酋
  '966': 'SA',  // 沙特
  '852': 'HK',  // 香港
  '853': 'MO',  // 澳门
  '886': 'TW',  // 台湾
};

// 根据电话号码获取国家代码
const getCountryCodeFromPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  
  // 检查3位前缀
  if (PHONE_PREFIX_TO_COUNTRY[digits.substring(0, 3)]) {
    return PHONE_PREFIX_TO_COUNTRY[digits.substring(0, 3)];
  }
  // 检查2位前缀
  if (PHONE_PREFIX_TO_COUNTRY[digits.substring(0, 2)]) {
    return PHONE_PREFIX_TO_COUNTRY[digits.substring(0, 2)];
  }
  // 检查1位前缀
  if (PHONE_PREFIX_TO_COUNTRY[digits.substring(0, 1)]) {
    return PHONE_PREFIX_TO_COUNTRY[digits.substring(0, 1)];
  }
  return null;
};

export default function IndonesiaProfileResult({ data, query, onBack }) {
  console.log('🇺🇸 [USProfileResult] v2025-11-27-FIXED-v2 loaded');
  console.log('🇺🇸 [USProfileResult] 接收到的原始数据:', data);
  console.log('🇺🇸 [USProfileResult] 数据类型:', typeof data);
  console.log('🇺🇸 [USProfileResult] 数据键:', data ? Object.keys(data) : 'null');
  
  // 🔥 详细调试：查看所有可能的数据位置
  console.log('🔍 [DEBUG] data.profile:', data?.profile);
  console.log('🔍 [DEBUG] data.data:', data?.data);
  console.log('🔍 [DEBUG] data.data.profile:', data?.data?.profile);
  console.log('🔍 [DEBUG] data.data.data:', data?.data?.data);
  if (data?.profile) {
    console.log('📦 [DEBUG] data.profile keys:', Object.keys(data.profile));
    console.log('📦 [DEBUG] data.profile.basic_info:', data.profile.basic_info);
    console.log('📦 [DEBUG] data.profile.contact_info:', data.profile.contact_info);
    console.log('📦 [DEBUG] data.profile.google_email_data:', data.profile.google_email_data);
  }
  if (data?.data?.profile) {
    console.log('📦 [DEBUG] data.data.profile keys:', Object.keys(data.data.profile));
    console.log('📦 [DEBUG] data.data.profile.basic_info:', data.data.profile.basic_info);
    console.log('📦 [DEBUG] data.data.profile.contact_info:', data.data.profile.contact_info);
    console.log('📦 [DEBUG] data.data.profile.google_email_data:', data.data.profile.google_email_data);
  }
  
  // 安全地解构数据 - 修复数据访问逻辑
  const profile = React.useMemo(() => {
    try {
      // 数据可能的结构:
      // 1. { success: true, data: { basic_info, contact_info, ... } }
      // 2. { success: true, data: { data: { basic_info, contact_info, ... } } } (嵌套)
      
      if (!data) {
        console.warn('🇺🇸 [USProfileResult] 数据为空');
        return {};
      }
      
      // 检查是否有 data.data (嵌套结构)
      if (data.data && typeof data.data === 'object') {
        // 如果 data.data 还有 data 属性，说明是双重嵌套
        if (data.data.data && typeof data.data.data === 'object') {
          console.log('🇺🇸 [USProfileResult] 检测到双重嵌套结构，使用 data.data.data');
          console.log('🇺🇸 [USProfileResult] Profile keys:', Object.keys(data.data.data));
          return data.data.data;
        }

        // 🔥 修复: 如果 data.data 还有 profile 属性 (QueryService 包装的旧后端响应)
        if (data.data.profile && typeof data.data.profile === 'object') {
           console.log('🇺🇸 [USProfileResult] 检测到 data.data.profile 结构，使用 data.data.profile');
           console.log('🇺🇸 [USProfileResult] Profile keys:', Object.keys(data.data.profile));
           
           const profile = data.data.profile;
           
           // 🔥 关键修复：检查 basic_info 是否为空或缺少关键字段
           const basicInfoEmpty = !profile.basic_info || 
                                  Object.keys(profile.basic_info).length === 0 ||
                                  (!profile.basic_info.name && !profile.basic_info.birthday);
           
           const contactInfoEmpty = !profile.contact_info || 
                                    Object.keys(profile.contact_info).length === 0 ||
                                    (!profile.contact_info.emails || profile.contact_info.emails.length === 0);
           
           const hasRawData = profile.raw_data && typeof profile.raw_data === 'object';
           
           console.log('🔍 [DEBUG] basicInfoEmpty:', basicInfoEmpty);
           console.log('🔍 [DEBUG] contactInfoEmpty:', contactInfoEmpty);
           console.log('🔍 [DEBUG] hasRawData:', hasRawData);
           
           // 如果主数据为空但有 raw_data，使用 raw_data
           if ((basicInfoEmpty || contactInfoEmpty) && hasRawData) {
             console.log('⚠️ [IndonesiaProfileResult] 检测到空的 basic_info/contact_info，使用 raw_data');
             console.log('🔍 [IndonesiaProfileResult] raw_data 键:', Object.keys(profile.raw_data));
             console.log('🔍 [IndonesiaProfileResult] raw_data.basic_info:', profile.raw_data.basic_info);
             console.log('🔍 [IndonesiaProfileResult] raw_data.contact_info:', profile.raw_data.contact_info);
             return profile.raw_data;
           }
           
           return profile;
        }
        
        // 否则使用 data.data
        console.log('🇺🇸 [USProfileResult] 使用 data.data 结构');
        console.log('🇺🇸 [USProfileResult] Profile keys:', Object.keys(data.data));
        return data.data;
      }
      
      // 🔥 修复: 检查是否有 data.profile (旧版后端结构，被前端 QueryService 包装后)
      if (data.profile && typeof data.profile === 'object') {
        console.log('🇺🇸 [USProfileResult] 检测到 data.profile 结构，使用 data.profile');
        console.log('🇺🇸 [USProfileResult] Profile keys:', Object.keys(data.profile));
        return data.profile;
      }

      // 如果没有 data.data，但有 basic_info 等字段，说明数据在顶层
      if (data.basic_info || data.contact_info || data.data_breaches) {
        console.log('🇺🇸 [USProfileResult] 数据在顶层，直接使用');
        console.log('🇺🇸 [USProfileResult] Profile keys:', Object.keys(data));
        return data;
      }
      
      console.warn('🇺🇸 [USProfileResult] 无法识别数据结构，返回空对象');
      return {};
    } catch (e) {
      console.error('🇺🇸 [USProfileResult] 访问数据时出错:', e);
      return {};
    }
  }, [data]);
  
  const success = data?.success;
  const error = data?.error;
  const profileData = profile; // 直接使用 profile，不再访问 data.data
  
  // Instagram 模态窗口状态
  const [instagramModal, setInstagramModal] = React.useState({
    isOpen: false,
    username: null,
    loading: false,
    data: null,
    error: null
  });
  
  // Instagram API 缓存
  const instagramCacheRef = React.useRef({});
  
  // 处理 Instagram 按钮点击
  const handleInstagramClick = async (username) => {
    console.log('📸 [Instagram] 点击查询用户:', username);
    
    // 检查缓存
    if (instagramCacheRef.current[username]) {
      console.log('📸 [Instagram] 使用缓存数据');
      setInstagramModal({
        isOpen: true,
        username: username,
        loading: false,
        data: instagramCacheRef.current[username],
        error: null
      });
      return;
    }
    
    // 打开模态窗口并显示加载状态
    setInstagramModal({
      isOpen: true,
      username: username,
      loading: true,
      data: null,
      error: null
    });
    
    try {
      const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
      const response = await fetch(`${API_BASE}/indonesia/social/instagram?username=${encodeURIComponent(username)}`);
      const result = await response.json();
      
      console.log('📸 [Instagram] API 响应:', result);
      
      if (result.success && result.data) {
        // 缓存数据
        instagramCacheRef.current[username] = result.data;
        
        setInstagramModal(prev => ({
          ...prev,
          loading: false,
          data: result.data
        }));
      } else {
        setInstagramModal(prev => ({
          ...prev,
          loading: false,
          error: result.error || '获取 Instagram 资料失败'
        }));
      }
    } catch (error) {
      console.error('📸 [Instagram] 请求错误:', error);
      setInstagramModal(prev => ({
        ...prev,
        loading: false,
        error: '网络请求失败'
      }));
    }
  };
  
  // 关闭模态窗口
  const closeInstagramModal = () => {
    setInstagramModal({
      isOpen: false,
      username: null,
      loading: false,
      data: null,
      error: null
    });
  };
  
  // Facebook 模态窗口状态
  const [facebookModal, setFacebookModal] = React.useState({
    isOpen: false,
    username: null,
    loading: false,
    data: null,
    error: null
  });
  
  // Facebook API 缓存
  const facebookCacheRef = React.useRef({});
  
  // 处理 Facebook 按钮点击
  const handleFacebookClick = async (username) => {
    console.log('📘 [Facebook] 点击查询用户:', username);
    
    // 检查缓存
    if (facebookCacheRef.current[username]) {
      console.log('📘 [Facebook] 使用缓存数据');
      setFacebookModal({
        isOpen: true,
        username: username,
        loading: false,
        data: facebookCacheRef.current[username],
        error: null
      });
      return;
    }
    
    // 打开模态窗口并显示加载状态
    setFacebookModal({
      isOpen: true,
      username: username,
      loading: true,
      data: null,
      error: null
    });
    
    try {
      const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
      const response = await fetch(`${API_BASE}/indonesia/social/facebook_profile?username=${encodeURIComponent(username)}`);
      const result = await response.json();
      
      console.log('📘 [Facebook] API 响应:', result);
      
      if (result.success && result.data) {
        // 缓存数据
        facebookCacheRef.current[username] = result.data;
        
        setFacebookModal(prev => ({
          ...prev,
          loading: false,
          data: result.data
        }));
      } else {
        setFacebookModal(prev => ({
          ...prev,
          loading: false,
          error: result.error || '获取 Facebook 资料失败'
        }));
      }
    } catch (error) {
      console.error('📘 [Facebook] 请求错误:', error);
      setFacebookModal(prev => ({
        ...prev,
        loading: false,
        error: '网络请求失败'
      }));
    }
  };
  
  // 关闭 Facebook 模态窗口
  const closeFacebookModal = () => {
    setFacebookModal({
      isOpen: false,
      username: null,
      loading: false,
      data: null,
      error: null
    });
  };
  
  // Twitter 模态窗口状态
  const [twitterModal, setTwitterModal] = React.useState({
    isOpen: false,
    username: null,
    loading: false,
    data: null,
    error: null
  });
  
  // Twitter API 缓存
  const twitterCacheRef = React.useRef({});
  
  // 处理 Twitter 按钮点击（支持自动重试备用用户名）
  const handleTwitterClick = async (username, alternativeUsername = null, displayName = null) => {
    console.log('🐦 [Twitter] 点击查询用户:', username, '| 备用:', alternativeUsername, '| 显示名:', displayName);
    
    // 检查缓存
    if (twitterCacheRef.current[username]) {
      console.log('🐦 [Twitter] 使用缓存数据');
      setTwitterModal({
        isOpen: true,
        username: username,
        displayName: displayName || alternativeUsername || username,
        loading: false,
        data: twitterCacheRef.current[username],
        error: null
      });
      return;
    }
    
    // 打开模态窗口并显示加载状态
    setTwitterModal({
      isOpen: true,
      username: username,
      displayName: displayName || alternativeUsername || username,
      loading: true,
      data: null,
      error: null
    });
    
    try {
      const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
      const response = await fetch(`${API_BASE}/indonesia/social/twitter?username=${encodeURIComponent(username)}`);
      const result = await response.json();
      
      console.log('🐦 [Twitter] API 响应 (主用户名):', result);
      
      if (result.success && result.data) {
        // 缓存数据
        twitterCacheRef.current[username] = result.data;
        
        setTwitterModal(prev => ({
          ...prev,
          loading: false,
          data: result.data
        }));
      } else {
        // 如果失败且有备用用户名，自动重试
        if (alternativeUsername && alternativeUsername !== username) {
          console.log('🐦 [Twitter] 主用户名失败，尝试备用用户名:', alternativeUsername);
          
          const altResponse = await fetch(`${API_BASE}/indonesia/social/twitter?username=${encodeURIComponent(alternativeUsername)}`);
          const altResult = await altResponse.json();
          
          console.log('🐦 [Twitter] API 响应 (备用用户名):', altResult);
          
          if (altResult.success && altResult.data) {
            // 缓存数据
            twitterCacheRef.current[alternativeUsername] = altResult.data;
            
            setTwitterModal(prev => ({
              ...prev,
              username: alternativeUsername,
              loading: false,
              data: altResult.data
            }));
            return;
          }
        }
        
        // 两个都失败了
        setTwitterModal(prev => ({
          ...prev,
          loading: false,
          error: result.error || '获取 Twitter 资料失败'
        }));
      }
    } catch (error) {
      console.error('🐦 [Twitter] 请求错误:', error);
      setTwitterModal(prev => ({
        ...prev,
        loading: false,
        error: '网络请求失败'
      }));
    }
  };
  
  // 关闭 Twitter 模态窗口
  const closeTwitterModal = () => {
    setTwitterModal({
      isOpen: false,
      username: null,
      loading: false,
      data: null,
      error: null
    });
  };
  
  // 调试输出
  console.log('🇺🇸 [USProfileResult] 最终 profile 数据:', {
    hasBasicInfo: !!profile.basic_info,
    hasContactInfo: !!profile.contact_info,
    hasDataBreaches: !!profile.data_breaches,
    profileKeys: Object.keys(profile).slice(0, 10)
  });

  // Show loading state if data is not yet available
  if (!data) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (!success) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-8 text-center border border-border">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">查询失败</h2>
          <p className="text-muted-foreground mb-6">{error || '发生未知错误'}</p>
          <button onClick={onBack} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            返回搜索
          </button>
        </div>
      </div>
    );
  }

  const { basic_info, contact_info, professional_info, accounts, summary, truecaller, caller_id, twitter, google_email_data } = profile;
  // Normalize data_breaches (handle singular/plural mismatch from API)
  const data_breaches = profile.data_breaches || profile.data_breach;
  
  // 🔥 修复: 从 raw_data 中提取生日和性别作为回退
  const finalBasicInfo = React.useMemo(() => {
    const info = { ...basic_info };
    
    // 如果没有生日或性别,从 raw_data 中提取
    if ((!info.birthday || !info.gender) && profile.raw_data?.step4_name_query?.data?.List) {
      const databases = profile.raw_data.step4_name_query.data.List;
      
      // 遍历所有数据库查找生日和性别
      for (const [dbName, dbInfo] of Object.entries(databases)) {
        if (!dbInfo.Data || !Array.isArray(dbInfo.Data)) continue;
        
        for (const record of dbInfo.Data) {
          // 提取生日
          if (!info.birthday && record.BDay) {
            info.birthday = record.BDay;
            console.log(`📅 [BasicInfo] 从 ${dbName} 提取生日:`, record.BDay);
          }
          
          // 提取性别
          if (!info.gender && record.Gender) {
            info.gender = record.Gender;
            console.log(`⚧️ [BasicInfo] 从 ${dbName} 提取性别:`, record.Gender);
          }
          
          // 如果两个都找到了,停止搜索
          if (info.birthday && info.gender) break;
        }
        
        if (info.birthday && info.gender) break;
      }
    }
    
    return info;
  }, [basic_info, profile.raw_data]);
  
  // 🔥 修复: 从 raw_data 中提取职业信息作为回退
  const finalProfessionalInfo = React.useMemo(() => {
    // 优先使用 professional_info
    if (professional_info?.jobs && Array.isArray(professional_info.jobs) && professional_info.jobs.length > 0) {
      console.log('💼 [Professional] 使用 professional_info.jobs');
      return professional_info;
    }
    
    // 回退: 从 raw_data.step4_name_query 中提取 LinkedIn 数据
    if (profile.raw_data?.step4_name_query?.data?.List?.['LinkedIn Scraped Data']?.Data) {
      console.log('💼 [Professional] 从 raw_data 中提取 LinkedIn 数据');
      const linkedinData = profile.raw_data.step4_name_query.data.List['LinkedIn Scraped Data'].Data;
      
      const jobs = linkedinData
        .filter(item => item.JobTitle && item.JobCompanyName) // 必须有职位和公司
        .map(item => ({
          title: item.JobTitle || item.Title,
          company: item.JobCompanyName || item.CompanyName,
          industry: item.Industry,
          location: item.Location || item.Region,
          summary: item.Summary,
          jobStartDate: item.JobStartDate, // 职位开始日期
          linkedinNickname: item.NickName, // LinkedIn 用户名
          companySize: item.CompanySize, // 公司规模
          linkedinId: item.LinkedinID, // LinkedIn ID
          source: 'LinkedIn',
          match_score: 6
        }))
        .sort((a, b) => {
          // 排序优先级:
          // 1. 有开始日期的优先 (更新的职位)
          if (a.jobStartDate && !b.jobStartDate) return -1;
          if (!a.jobStartDate && b.jobStartDate) return 1;
          
          // 2. 如果都有开始日期,较新的优先
          if (a.jobStartDate && b.jobStartDate) {
            return b.jobStartDate.localeCompare(a.jobStartDate);
          }
          
          // 3. 有 summary 的优先 (信息更完整)
          if (a.summary && !b.summary) return -1;
          if (!a.summary && b.summary) return 1;
          
          return 0;
        });
      
      console.log('💼 [Professional] 提取到的职业信息:', jobs);
      console.log('💼 [Professional] 职位数量:', jobs.length);
      if (jobs.length > 0) {
        console.log('💼 [Professional] 第一个职位:', jobs[0]);
      }
      
      return { jobs, companies: [], industries: [] };
    }
    
    console.log('💼 [Professional] 未找到职业信息');
    return { jobs: [] };
  }, [professional_info, profile.raw_data]);
  
  // 🔥 Debug: 职业信息调试
  console.log('💼 [Debug] professional_info:', professional_info);
  console.log('💼 [Debug] professional_info.jobs:', professional_info?.jobs);
  console.log('💼 [Debug] finalProfessionalInfo.jobs:', finalProfessionalInfo?.jobs);
  console.log('💼 [Debug] Is array:', Array.isArray(finalProfessionalInfo?.jobs));
  console.log('💼 [Debug] Length:', finalProfessionalInfo?.jobs?.length);
  console.log('💼 [Debug] First job:', finalProfessionalInfo?.jobs?.[0]);
  
  // Debug: Check contact_info addresses
  console.log('🏠 [Debug] contact_info:', contact_info);
  console.log('🏠 [Debug] contact_info.addresses:', contact_info?.addresses);
  console.log('🏠 [Debug] Is array:', Array.isArray(contact_info?.addresses));
  console.log('🏠 [Debug] Length:', contact_info?.addresses?.length);

  console.log('🔍 [IndonesiaProfileResult] Profile keys:', Object.keys(profile));
  console.log('🔍 [IndonesiaProfileResult] basic_info:', basic_info);
  console.log('🔍 [IndonesiaProfileResult] contact_info:', contact_info);
  console.log('🔍 [IndonesiaProfileResult] contact_info.emails:', contact_info?.emails);
  console.log('🔍 [IndonesiaProfileResult] data_breaches:', data_breaches ? 'Found' : 'Missing');
  console.log('🔍 [IndonesiaProfileResult] google_email_data:', google_email_data);

  // Calculate best NIK match (使用 finalBasicInfo)
  const bestNik = React.useMemo(() => {
    console.log('🆔 [bestNik] Calculating best NIK');
    console.log('🆔 [bestNik] all_niks:', finalBasicInfo?.all_niks);
    console.log('🆔 [bestNik] birthday:', finalBasicInfo?.birthday);
    console.log('🆔 [bestNik] gender:', finalBasicInfo?.gender);
    
    const result = getBestNik(finalBasicInfo?.all_niks, finalBasicInfo?.birthday, finalBasicInfo?.gender);
    console.log('🆔 [bestNik] Best NIK result:', result);
    return result;
  }, [finalBasicInfo?.all_niks, finalBasicInfo?.birthday, finalBasicInfo?.gender]);

  // Extract Truecaller data with safety checks
  const tcLinks = React.useMemo(() => {
    try {
      return Array.isArray(truecaller?.reply?.links) ? truecaller.reply.links : [];
    } catch (e) {
      console.error('Error accessing truecaller links:', e);
      return [];
    }
  }, [truecaller]);
  
  const tcProfile = truecaller?.profile || {};
  const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
  
  // Use avatar URLs directly (CSP allows lh3.googleusercontent.com)
  let avatarUrl = tcProfile.whatsapp_photo || tcProfile.profile_photo || null;

  // ==================== 社交媒体 API 状态 ====================
  const [facebookData, setFacebookData] = React.useState(null);
  const [telegramData, setTelegramData] = React.useState(null);
  const [truecallerData, setTruecallerData] = React.useState(null);
  const [truecallerAcelogicData, setTruecallerAcelogicData] = React.useState(null);
  const [socialLoading, setSocialLoading] = React.useState({ facebook: false, telegram: false, truecaller: false, truecallerAcelogic: false });

  // 获取电话号码用于社交媒体查询
  const phoneForSocial = React.useMemo(() => {
    return basic_info?.phone_primary || contact_info?.phones?.[0] || data?.phone || query;
  }, [basic_info?.phone_primary, contact_info?.phones, data?.phone, query]);

  // Snapchat 状态
  const [snapchatData, setSnapchatData] = React.useState(null);
  
  // 检测是否为印尼号码
  const isIndonesianPhone = React.useMemo(() => {
    const digits = phoneForSocial?.replace(/\D/g, '') || '';
    return digits.startsWith('62');
  }, [phoneForSocial]);
  
  // 自动调用社交媒体 API (智能检测国家)
  React.useEffect(() => {
    if (!phoneForSocial) return;
    
    const fetchSocialData = async () => {
      console.log('🔍 [Social APIs] 开始查询社交媒体数据，电话:', phoneForSocial, '印尼号码:', isIndonesianPhone);
      
      // 根据号码国家选择 API 端点
      const apiPrefix = isIndonesianPhone ? '/indonesia/social' : '/social';
      
      // Facebook API (仅印尼号码)
      if (isIndonesianPhone) {
        setSocialLoading(prev => ({ ...prev, facebook: true }));
        try {
          const fbRes = await fetch(`${API_BASE}/indonesia/social/facebook?phone=${encodeURIComponent(phoneForSocial)}`);
          const fbData = await fbRes.json();
          console.log('📘 [Facebook] 响应:', fbData);
          if (fbData.success) {
            setFacebookData(fbData);
          }
        } catch (e) {
          console.error('📘 [Facebook] 错误:', e);
        } finally {
          setSocialLoading(prev => ({ ...prev, facebook: false }));
        }
      }

      // Telegram API (通用)
      setSocialLoading(prev => ({ ...prev, telegram: true }));
      try {
        const tgRes = await fetch(`${API_BASE}${apiPrefix}/telegram?phone=${encodeURIComponent(phoneForSocial)}`);
        const tgData = await tgRes.json();
        console.log('📱 [Telegram] 响应:', tgData);
        if (tgData.success) {
          setTelegramData(tgData);
        }
      } catch (e) {
        console.error('📱 [Telegram] 错误:', e);
      } finally {
        setSocialLoading(prev => ({ ...prev, telegram: false }));
      }

      // Truecaller API (通用)
      setSocialLoading(prev => ({ ...prev, truecaller: true }));
      try {
        const tcRes = await fetch(`${API_BASE}${apiPrefix}/truecaller?phone=${encodeURIComponent(phoneForSocial)}`);
        const tcData = await tcRes.json();
        console.log('📞 [Truecaller] 响应:', tcData);
        if (tcData.success) {
          setTruecallerData(tcData);
        }
      } catch (e) {
        console.error('📞 [Truecaller] 错误:', e);
      } finally {
        setSocialLoading(prev => ({ ...prev, truecaller: false }));
      }
      
      // Truecaller Acelogic API (仅印尼号码)
      if (isIndonesianPhone) {
        setSocialLoading(prev => ({ ...prev, truecallerAcelogic: true }));
        try {
          const tcAceRes = await fetch(`${API_BASE}/indonesia/social/truecaller_acelogic?phone=${encodeURIComponent(phoneForSocial)}`);
          const tcAceData = await tcAceRes.json();
          console.log('📞 [Truecaller Acelogic] 响应:', tcAceData);
          if (tcAceData.success) {
            setTruecallerAcelogicData(tcAceData);
          }
        } catch (e) {
          console.error('📞 [Truecaller Acelogic] 错误:', e);
        } finally {
          setSocialLoading(prev => ({ ...prev, truecallerAcelogic: false }));
        }
      }
      
      // 🆕 Snapchat API (通用 - 所有号码)
      try {
        const snapRes = await fetch(`${API_BASE}/social/snapchat?phone=${encodeURIComponent(phoneForSocial)}`);
        const snapData = await snapRes.json();
        console.log('👻 [Snapchat] 响应:', snapData);
        if (snapData.success) {
          setSnapchatData(snapData);
        }
      } catch (e) {
        console.error('👻 [Snapchat] 错误:', e);
      }
    };

    fetchSocialData();
  }, [phoneForSocial, API_BASE, isIndonesianPhone]);

  // ==================== 智能主郵箱檢測 & 平台驗證 ====================
  
  // 基於郵箱的平台驗證狀態
  const [emailPlatformData, setEmailPlatformData] = React.useState({
    instagram: null,
    gravatar: null,
    discord: null,
    spotify: null,
    apple: null,
    microsoft: null,
  });
  const [emailPlatformLoading, setEmailPlatformLoading] = React.useState(false);

  // Fetch Google avatar and location data from email if we have emails
  const [googleAvatarUrl, setGoogleAvatarUrl] = React.useState(null);
  const [googleLocationData, setGoogleLocationData] = React.useState(null);
  const [googleProfileData, setGoogleProfileData] = React.useState(null);
  
  // 🔥 智能主郵箱檢測 - 優先級: Gmail > 工作郵箱 > 其他
  const primaryEmail = React.useMemo(() => {
    const allEmails = [];
    
    // 收集所有郵箱
    if (contact_info?.emails && Array.isArray(contact_info.emails)) {
      allEmails.push(...contact_info.emails);
    }
    
    // 從 data_breaches 提取
    if (data_breaches?.details && typeof data_breaches.details === 'object') {
      for (const dbInfo of Object.values(data_breaches.details)) {
        if (!dbInfo || !Array.isArray(dbInfo.Data)) continue;
        for (const record of dbInfo.Data) {
          if (record?.Email && typeof record.Email === 'string') {
            allEmails.push(record.Email.trim().toLowerCase());
          }
        }
      }
    }
    
    // 去重
    const uniqueEmails = [...new Set(allEmails.map(e => e?.toLowerCase?.()).filter(Boolean))];
    
    if (uniqueEmails.length === 0) return null;
    
    // 優先級排序
    // 1. Gmail (最常用，關聯最多平台)
    const gmail = uniqueEmails.find(e => e.includes('@gmail.com'));
    if (gmail) {
      console.log('📧 [PrimaryEmail] 選擇 Gmail:', gmail);
      return gmail;
    }
    
    // 2. Outlook/Hotmail (Microsoft 生態)
    const outlook = uniqueEmails.find(e => e.includes('@outlook.') || e.includes('@hotmail.') || e.includes('@live.'));
    if (outlook) {
      console.log('📧 [PrimaryEmail] 選擇 Outlook:', outlook);
      return outlook;
    }
    
    // 3. Yahoo
    const yahoo = uniqueEmails.find(e => e.includes('@yahoo.'));
    if (yahoo) {
      console.log('📧 [PrimaryEmail] 選擇 Yahoo:', yahoo);
      return yahoo;
    }
    
    // 4. 其他（第一個）
    console.log('📧 [PrimaryEmail] 選擇第一個:', uniqueEmails[0]);
    return uniqueEmails[0];
  }, [contact_info?.emails, data_breaches?.details]);

  // 🔥 監聽主郵箱變化，調用平台驗證 API
  React.useEffect(() => {
    if (!primaryEmail) return;
    
    // MD5 hash 函數 (用於 Gravatar) - 使用簡單的 hash
    const simpleHash = (str) => {
      let hash = 0;
      const s = str.trim().toLowerCase();
      for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(32, '0');
    };
    
    const verifyEmailPlatforms = async () => {
      console.log('🔍 [EmailVerify] 開始驗證郵箱平台:', primaryEmail);
      setEmailPlatformLoading(true);
      
      try {
        // Gravatar - 通過郵箱獲取頭像
        const emailHash = simpleHash(primaryEmail);
        const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404`;
        
        try {
          const gravatarRes = await fetch(gravatarUrl, { method: 'HEAD' });
          if (gravatarRes.ok) {
            setEmailPlatformData(prev => ({
              ...prev,
              gravatar: {
                success: true,
                email: primaryEmail,
                avatar_url: `https://www.gravatar.com/avatar/${emailHash}?s=200`
              }
            }));
            console.log('✅ [Gravatar] 找到頭像');
          }
        } catch (e) {
          console.log('❌ [Gravatar] 未找到');
        }
        
      } catch (e) {
        console.error('❌ [EmailVerify] 錯誤:', e);
      } finally {
        setEmailPlatformLoading(false);
      }
    };
    
    verifyEmailPlatforms();
  }, [primaryEmail]);

  // Google email data now comes from main API response (google_email_data array)
  React.useEffect(() => {
    if (google_email_data && Array.isArray(google_email_data) && google_email_data.length > 0) {
      const googleData = google_email_data[0]; // Use first result
      console.log('📧 [Google] email data from API:', googleData);
      console.log('📧 [Google] reviews array:', googleData.reviews);
      console.log('📧 [Google] reviews length:', googleData.reviews?.length);
      
      setGoogleProfileData(googleData);
      
      // Set Google avatar URL if available (always set it, even if it's default)
      if (googleData.avatar_url) {
        setGoogleAvatarUrl(googleData.avatar_url);
        console.log('🖼️ Google avatar URL set:', googleData.avatar_url);
      } else {
        console.log('⚠️ No avatar_url in Google data');
      }
      
      if (googleData.profile_url) {
        console.log('📍 Google profile URL:', googleData.profile_url);
      }
      
      // Extract location data - could be nested in location_data or directly in googleData
      const locationData = googleData.location_data || googleData;
      if (locationData && (locationData.map_view || locationData.coordinates)) {
        setGoogleLocationData(locationData);
        console.log('🗺️ Google location data set:', locationData);
        console.log('📍 Coordinates array:', locationData.coordinates);
        console.log('📍 Coordinates length:', locationData.coordinates?.length);
        if (locationData.coordinates && locationData.coordinates.length > 0) {
          const coord = locationData.coordinates[0];
          console.log('📍 First coordinate:', coord);
          console.log('📍 Coordinate details:', {
            latitude: coord.latitude,
            longitude: coord.longitude,
            address: coord.address,
            google_maps_url: coord.google_maps_url
          });
        }
      } else {
        console.log('⚠️ No valid location data found in:', googleData);
      }
    }
  }, [google_email_data]);

  // Extract social media from data breaches
  const extractedSocialMedia = React.useMemo(() => {
    const socialAccounts = [];
    
    console.log('🔍 [extractedSocialMedia] 開始提取社交媒體...');
    console.log('🔍 [extractedSocialMedia] data_breaches:', data_breaches);
    console.log('🔍 [extractedSocialMedia] data_breaches 類型:', typeof data_breaches);
    console.log('🔍 [extractedSocialMedia] data_breaches.details:', data_breaches?.details);
    console.log('🔍 [extractedSocialMedia] data_breaches.details 類型:', typeof data_breaches?.details);
    
    if (!data_breaches) {
      console.warn('⚠️ [extractedSocialMedia] data_breaches 為空！');
      return [];
    }
    
    if (!data_breaches.details) {
      console.warn('⚠️ [extractedSocialMedia] data_breaches.details 為空！可用的鍵:', Object.keys(data_breaches));
      return [];
    }
    
    if (data_breaches?.details && typeof data_breaches.details === 'object') {
      for (const [breachName, dbInfo] of Object.entries(data_breaches.details)) {
        console.log(`🔍 [extractedSocialMedia] Processing ${breachName}:`, dbInfo);
        if (!dbInfo.Data || !Array.isArray(dbInfo.Data)) {
          console.log(`⚠️ [extractedSocialMedia] Skipping ${breachName} - no Data array`);
          continue;
        }
        
        for (const record of dbInfo.Data) {
          // Extract Twitter from "Twitter 200M" database
          if (breachName.toLowerCase().includes('twitter')) {
            // Prioritize NickName for URL, FullName for display
            let twitterUsername = record.NickName;
            
            if (!twitterUsername && record.Email) {
              const username = record.Email.split('@')[0];
              twitterUsername = username.replace(/\./g, '_').replace(/\d+$/, '');
            }
            
            // Use FullName for display, NickName for URL
            const displayName = record.FullName || record.Name || twitterUsername;
            
            if (twitterUsername || displayName) {
              // 🔥 获取Twitter头像 - 优先级：数据库 > 后端API > unavatar
              let avatarUrl = null;
              if (record.Avatar || record.ProfileImage) {
                avatarUrl = record.Avatar || record.ProfileImage;
              } else if (twitterUsername) {
                const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
                // 使用后端代理API获取真实Twitter头像
                avatarUrl = `${API_BASE}/twitter/avatar?username=${twitterUsername}&size=400x400`;
                // 备选：unavatar (如果后端API失败)
                // avatarUrl = `https://unavatar.io/twitter/${twitterUsername}`;
              }
              
              socialAccounts.push({
                platform: 'Twitter',
                url: `https://x.com/${twitterUsername || displayName}`,
                username: displayName,  // Display FullName
                nickname: twitterUsername,  // Store NickName for reference
                fullName: record.FullName || record.Name,
                followers: record.Followers,
                email: record.Email,
                avatar: avatarUrl,  // 🔥 添加头像字段
                source: breachName,
                type: 'twitter_200m'
              });
            }
          }
          
          // Extract Facebook ID
          if (record.FacebookID) {
            socialAccounts.push({
              platform: 'Facebook',
              id: record.FacebookID,
              url: `https://facebook.com/${record.FacebookID}`,
              source: breachName,
              type: 'facebook_id'
            });
          }
          
          // Extract usernames/nicknames that might be social media
          if (record.NickName && record.NickName !== primaryEmail) {
            // Check if it's from Gravatar (usually indicates social media presence)
            if (breachName.toLowerCase().includes('gravatar')) {
              socialAccounts.push({
                platform: 'Gravatar',
                username: record.NickName,
                url: record.Link || `http://gravatar.com/${record.NickName}`,
                avatar: record.Avatar,
                source: breachName,
                type: 'gravatar'
              });
            }
          }
          
          // Extract Instagram/Twitter/Facebook from Application field (Android apps)
          if (record.Application) {
            const app = record.Application.toLowerCase();
            
            // Helper: Generate Twitter username from email (e.g., hendry.budy46@gmail.com -> hendry_budy)
            const getTwitterUsername = (email) => {
              if (!email) return null;
              const username = email.split('@')[0]; // Get part before @
              return username.replace(/\./g, '_').replace(/\d+$/, ''); // Replace dots with underscores, remove trailing numbers
            };
            
            if (app.includes('instagram')) {
              // Prioritize NickName, fallback to extracting from Email
              let instagramUsername = record.NickName;
              if (!instagramUsername && record.Email) {
                instagramUsername = record.Email.split('@')[0].replace(/\./g, '');
              }
              
              // 🔥 获取Instagram头像 - 优先级：数据库 > 多个备选服务
              let avatarUrl = null;
              if (record.Avatar || record.ProfileImage) {
                avatarUrl = record.Avatar || record.ProfileImage;
                console.log(`📸 [Instagram] 从数据库获取头像: ${avatarUrl}`);
              } else if (instagramUsername) {
                // 备选方案：使用多个头像服务
                // 1. unavatar.io (可能不稳定)
                // 2. 使用后端代理服务 (TODO)
                avatarUrl = `https://unavatar.io/instagram/${instagramUsername}`;
                console.log(`📸 [Instagram] 尝试使用unavatar获取头像: ${avatarUrl}`);
                console.log(`📸 [Instagram] 用户名: ${instagramUsername}, 邮箱: ${record.Email}`);
              }
              
              socialAccounts.push({
                platform: 'Instagram',
                url: instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : 'https://www.instagram.com/',
                username: instagramUsername || record.Email,
                email: record.Email,
                avatar: avatarUrl,  // 🔥 添加头像
                source: breachName,
                type: 'app',
                password: record.Password
              });
            } else if (app.includes('twitter')) {
              const twitterUsername = record.NickName || getTwitterUsername(record.Email);
              
              // 🔥 获取Twitter头像 - 使用后端API
              let avatarUrl = null;
              if (record.Avatar || record.ProfileImage) {
                avatarUrl = record.Avatar || record.ProfileImage;
              } else if (twitterUsername) {
                const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
                avatarUrl = `${API_BASE}/twitter/avatar?username=${twitterUsername}&size=400x400`;
              }
              
              socialAccounts.push({
                platform: 'Twitter',
                url: twitterUsername ? `https://x.com/${twitterUsername}` : 'https://twitter.com/',
                username: twitterUsername || record.Email,
                avatar: avatarUrl,  // 🔥 添加头像
                source: breachName,
                type: 'app',
                password: record.Password
              });
            } else if (app.includes('facebook')) {
              // 🔥 获取Facebook头像
              const avatarUrl = record.Avatar || record.ProfileImage;
              
              socialAccounts.push({
                platform: 'Facebook',
                url: 'https://www.facebook.com/',
                username: record.Email || record.NickName,
                avatar: avatarUrl,  // 🔥 添加头像
                source: breachName,
                type: 'app',
                password: record.Password
              });
            }
          }
          
          // Extract Instagram/Twitter from URLs
          if (record.Url) {
            const url = record.Url.toLowerCase();
            if (url.includes('instagram.com') || url.includes('twitter.com') || url.includes('facebook.com')) {
              const getTwitterUsername = (email) => {
                if (!email) return null;
                const username = email.split('@')[0];
                return username.replace(/\./g, '_').replace(/\d+$/, '');
              };
              
              let platform, finalUrl, username, avatarUrl;
              if (url.includes('instagram')) {
                platform = 'Instagram';
                finalUrl = record.Url;
                username = record.NickName || (record.Email ? record.Email.split('@')[0].replace(/\./g, '') : null);
                // 🔥 Instagram头像 - 优先使用数据库中的头像
                if (record.Avatar || record.ProfileImage) {
                  avatarUrl = record.Avatar || record.ProfileImage;
                } else if (username) {
                  avatarUrl = `https://unavatar.io/instagram/${username}`;
                } else {
                  avatarUrl = null;
                }
              } else if (url.includes('twitter')) {
                platform = 'Twitter';
                const twitterUsername = record.NickName || getTwitterUsername(record.Email);
                finalUrl = twitterUsername ? `https://x.com/${twitterUsername}` : record.Url;
                username = twitterUsername;
                // 🔥 使用后端API获取Twitter头像
                if (record.Avatar || record.ProfileImage) {
                  avatarUrl = record.Avatar || record.ProfileImage;
                } else if (username) {
                  const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
                  avatarUrl = `${API_BASE}/twitter/avatar?username=${username}&size=400x400`;
                } else {
                  avatarUrl = null;
                }
              } else {
                platform = 'Facebook';
                finalUrl = record.Url;
                username = record.NickName || record.Email;
                avatarUrl = record.Avatar || record.ProfileImage;
              }
              
              socialAccounts.push({
                platform: platform,
                url: finalUrl,
                username: username || record.Email,
                avatar: avatarUrl,  // 🔥 添加头像
                source: breachName,
                type: 'url',
                password: record.Password
              });
            }
          }
        }
      }
    }
    
    // Remove duplicates: use platform + username as key to allow multiple accounts per platform
    const uniqueAccountsMap = new Map();
    for (const account of socialAccounts) {
      // Create unique key from platform and username/id
      const identifier = account.username || account.nickname || account.id || account.email || '';
      const key = `${account.platform}:${identifier.toLowerCase()}`;
      const existing = uniqueAccountsMap.get(key);
      
      // Priority: twitter_200m > facebook_id > url > app
      if (!existing) {
        uniqueAccountsMap.set(key, account);
      } else {
        const priority = { 'twitter_200m': 4, 'facebook_id': 3, 'url': 2, 'gravatar': 2, 'app': 1 };
        if ((priority[account.type] || 0) > (priority[existing.type] || 0)) {
          uniqueAccountsMap.set(key, account);
        }
      }
    }
    
    const uniqueAccounts = Array.from(uniqueAccountsMap.values());
    console.log('🔗 Extracted social media accounts:', uniqueAccounts);
    return uniqueAccounts;
  }, [data_breaches?.details, primaryEmail]);

  // Use Google avatar if available, otherwise fallback to Truecaller (v2025-11-27 FIXED)
  // Proxy Google avatar through backend to avoid CORS issues
  const finalAvatarUrl = React.useMemo(() => {
    if (googleAvatarUrl) {
      // Use backend proxy for Google avatars
      return `${API_BASE}/avatar?url=${encodeURIComponent(googleAvatarUrl)}`;
    }
    return avatarUrl;
  }, [googleAvatarUrl, avatarUrl]);

  // Debug avatar URL
  console.log('🖼️ Avatar URL (original):', avatarUrl);
  console.log('🌐 Google avatar URL:', googleAvatarUrl);
  console.log('✨ Final avatar URL (USING THIS):', finalAvatarUrl);
  console.log('📧 Primary email:', primaryEmail);

  // 🔥 优化: 性别显示转换 (使用 finalBasicInfo)
  const displayGender = React.useMemo(() => {
    const gender = finalBasicInfo?.gender;
    if (!gender) return null;
    
    const genderMap = {
      '1': 'Male (男性)',
      '0': 'Female (女性)',
      'male': 'Male (男性)',
      'female': 'Female (女性)',
      'laki-laki': 'Male (男性)',
      'perempuan': 'Female (女性)'
    };
    
    return genderMap[String(gender).toLowerCase()] || gender;
  }, [finalBasicInfo?.gender]);

  // 🔥 优化: 日期格式化
  const formatDate = React.useCallback((dateStr) => {
    if (!dateStr) return null;
    
    try {
      // 支持 DD-MM-YYYY 和 YYYY-MM-DD 格式
      const parts = dateStr.split('-');
      let day, month, year;
      
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts;
      } else {
        // DD-MM-YYYY
        [day, month, year] = parts;
      }
      
      const date = new Date(year, month - 1, day);
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error('日期格式化错误:', e);
      return dateStr; // 失败时返回原始值
    }
  }, []);

  // Extract Caller ID (Facebook) data
  const fbData = caller_id || {};
  const hasFbData = !!fbData.name; // Show FB card if we have a name

  // Extract Twitter data (from API with avatar OR from data breaches)
  const twitterData = React.useMemo(() => {
    // 1. 优先使用 API 返回的 twitter 对象
    if (twitter && Object.keys(twitter).length > 0) {
      return twitter;
    }
    
    // 2. 从 data_breaches 中提取 Twitter 200M 数据
    if (data_breaches?.details?.['Twitter 200M']?.Data?.[0]) {
      const twitterBreach = data_breaches.details['Twitter 200M'].Data[0];
      return {
        screen_name: twitterBreach.NickName,
        name: twitterBreach.FullName,
        email: twitterBreach.Email,
        followers: twitterBreach.Followers,
        // Twitter 头像 URL 格式: https://twitter.com/{username}/photo
        // 或者使用默认的 Twitter logo
        avatar_url: twitterBreach.NickName 
          ? `https://unavatar.io/twitter/${twitterBreach.NickName}` 
          : null
      };
    }
    
    return {};
  }, [twitter, data_breaches?.details]);
  
  // 生成 Twitter 用户名的函数
  const generateTwitterUsername = React.useCallback((name, email) => {
    // 1. 优先使用 API 返回的 screen_name
    if (twitterData.screen_name) return twitterData.screen_name;
    
    // 2. 如果有名字，用名字生成（空格替换为下划线，去掉特殊字符）
    if (name) {
      return name.toLowerCase()
        .replace(/\s+/g, '_')           // 空格替换为下划线
        .replace(/[^a-z0-9_]/g, '')     // 只保留字母数字下划线
        .replace(/_+/g, '_')            // 多个下划线合并
        .replace(/^_|_$/g, '');         // 去掉首尾下划线
    }
    
    // 3. 如果有邮箱，用邮箱 @ 前面的部分，点替换为下划线
    if (email) {
      const emailPrefix = email.split('@')[0];
      return emailPrefix
        .replace(/\./g, '_')            // 点替换为下划线
        .replace(/[^a-z0-9_]/gi, '')    // 只保留字母数字下划线
        .toLowerCase();
    }
    
    return null;
  }, [twitterData.screen_name]);
  
  // 获取用于生成 Twitter 用户名的数据
  const twitterUsername = React.useMemo(() => {
    // 优先级: twitterData.screen_name > 根据名字生成 > 根据邮箱生成
    return twitterData.screen_name || 
           generateTwitterUsername(twitterData.name || basic_info?.name, primaryEmail);
  }, [twitterData.screen_name, twitterData.name, basic_info?.name, primaryEmail, generateTwitterUsername]);
  
  const twitterAvatar = twitterData.avatar_url;
  const twitterName = twitterData.name || basic_info?.name;
  const hasTwitter = !!twitterUsername;

  // Phone deduplication logic
  const uniquePhones = React.useMemo(() => {
    if (!contact_info?.phones || !Array.isArray(contact_info.phones)) return [];
    const seen = new Set();
    try {
      return contact_info.phones.filter(p => {
        if (!p) return false;
        let clean = String(p).replace(/\D/g, '');
        if (clean.startsWith('08')) clean = '62' + clean.substring(1);
        if (seen.has(clean)) return false;
        seen.add(clean);
        return true;
      });
    } catch (e) {
      console.error('Error processing phones:', e);
      return [];
    }
  }, [contact_info?.phones]);

  // Account deduplication logic - merge accounts from both sources
  const uniqueAccounts = React.useMemo(() => {
    let allAccounts = [];
    
    // Source 1: accounts.details (from external APIs)
    if (accounts?.details) {
      try {
        let detailsArray = [];
        const rawDetails = accounts.details;
        
        if (Array.isArray(rawDetails)) {
          detailsArray = rawDetails;
        } else if (typeof rawDetails === 'object' && rawDetails !== null) {
          // If it's an object, map entries to array, preserving the key as platform if needed
          detailsArray = Object.entries(rawDetails).map(([key, value]) => {
            if (!value) return null;
            // If value is an object, try to use it, otherwise wrap it
            const item = typeof value === 'object' ? { ...value } : { raw_value: value };
            // Ensure platform exists, default to key if not present in item
            if (!item.platform) item.platform = key;
            // Ensure username exists if possible
            if (!item.username && item.user_id) item.username = item.user_id;
            if (!item.username && typeof value === 'string') item.username = value;
            
            return item;
          }).filter(Boolean);
        }
        
        allAccounts = [...detailsArray];
      } catch (e) {
        console.error('Error processing accounts.details:', e);
      }
    }
    
    // Source 2: extractedSocialMedia (from data_breaches)
    if (Array.isArray(extractedSocialMedia) && extractedSocialMedia.length > 0) {
      allAccounts = [...allAccounts, ...extractedSocialMedia];
    }
    
    // Deduplicate based on platform+username (normalize to handle variations)
    const seen = new Set();
    return allAccounts.filter(acc => {
      if (!acc || !acc.platform) return false;
      
      // Use domain to normalize platform names (e.g. "Twitter 200M" -> "twitter.com")
      const domain = getPlatformDomain(acc.platform);
      
      // Normalize username: remove @, lowercase, trim
      const normalizeUsername = (str) => {
        if (!str) return '';
        return str.toString().toLowerCase().replace(/^@/, '').trim();
      };
      
      // Create key from domain and normalized username/id
      const identifier = normalizeUsername(acc.username || acc.nickname || acc.id || acc.email || '');
      const key = `${domain}:${identifier}`;
      
      // Filter out specific unwanted accounts
      // Remove Twitter account: hendri_budi_setyawan or Hendri Budi Setyawan
      if (domain === 'twitter.com') {
        const fullNameLower = (acc.fullName || '').toLowerCase();
        const usernameLower = (acc.username || '').toLowerCase();
        const nicknameLower = (acc.nickname || '').toLowerCase();
        
        console.log(`🐦 [Twitter Filter] Checking account:`, {
          username: acc.username,
          nickname: acc.nickname,
          fullName: acc.fullName,
          usernameLower,
          nicknameLower,
          fullNameLower
        });
        
        // Filter out: Hendri Budi Setyawan (@hendri_budi_setyawan)
        if (usernameLower.includes('hendri') && usernameLower.includes('budi') && usernameLower.includes('setyawan')) {
          console.log(`🚫 Filtering out unwanted Twitter account (by username): ${acc.username}`);
          return false;
        }
        if (nicknameLower.includes('hendri') && nicknameLower.includes('budi') && nicknameLower.includes('setyawan')) {
          console.log(`🚫 Filtering out unwanted Twitter account (by nickname): ${acc.nickname}`);
          return false;
        }
        if (fullNameLower.includes('hendri') && fullNameLower.includes('budi') && fullNameLower.includes('setyawan')) {
          console.log(`🚫 Filtering out unwanted Twitter account (by fullName): ${acc.fullName}`);
          return false;
        }
      }
      
      // Remove Facebook accounts without username (only email or empty)
      if (domain === 'facebook.com' && (!acc.username || acc.username.includes('@') || acc.username === '')) {
        console.log(`🚫 Filtering out Facebook account without username: ${acc.username || 'empty'}`);
        return false;
      }
      
      if (seen.has(key)) {
        console.log(`🔄 Skipping duplicate: ${key}`);
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [accounts?.details, extractedSocialMedia]);

  // Sort emails by frequency of usage in accounts and common providers
  const sortedEmails = React.useMemo(() => {
    console.log('📧 [sortedEmails] Processing emails from contact_info:', contact_info?.emails);
    
    if (!contact_info?.emails || !Array.isArray(contact_info.emails)) {
      console.warn('⚠️ [sortedEmails] No emails found in contact_info');
      return [];
    }
    
    // Deduplicate first
    const uniqueEmailList = [...new Set(contact_info.emails.filter(Boolean))];
    console.log('📧 [sortedEmails] Unique email list:', uniqueEmailList);
    
    const emailCounts = {};
    
    // Initialize counts
    uniqueEmailList.forEach(email => {
      emailCounts[email] = 0;
    });

    // Count occurrences in accounts
    if (Array.isArray(uniqueAccounts)) {
      uniqueAccounts.forEach(acc => {
        // Check exact email match
        if (acc.email && emailCounts.hasOwnProperty(acc.email)) {
          emailCounts[acc.email] += 5;
        }
        // Check if username is the email
        if (acc.username && emailCounts.hasOwnProperty(acc.username)) {
          emailCounts[acc.username] += 5;
        }
        // Partial match (username part of email)
        Object.keys(emailCounts).forEach(email => {
            if (acc.username && email.toLowerCase().includes(acc.username.toLowerCase()) && acc.username.length > 4) {
                emailCounts[email] += 1;
            }
        });
      });
    }

    // Sort: higher count first. If equal, prefer common providers.
    const sorted = uniqueEmailList.sort((a, b) => {
      const countA = emailCounts[a] || 0;
      const countB = emailCounts[b] || 0;
      
      if (countB !== countA) return countB - countA;
      
      // Secondary sort: Common providers
      const isCommonA = /gmail|yahoo|outlook|hotmail|icloud/i.test(a);
      const isCommonB = /gmail|yahoo|outlook|hotmail|icloud/i.test(b);
      
      if (isCommonA && !isCommonB) return -1;
      if (!isCommonA && isCommonB) return 1;
      
      return 0;
    });
    
    console.log('📧 [sortedEmails] Final sorted emails:', sorted);
    return sorted;
  }, [contact_info?.emails, uniqueAccounts]);

  // Data breach deduplication logic - 修复: 为每条记录创建单独的卡片
  const uniqueBreaches = React.useMemo(() => {
    if (!data_breaches?.details) return [];
    
    try {
      // details is an object where keys are database names
      // Convert to array format expected by the component
      const detailsObj = data_breaches.details;
      
      if (typeof detailsObj !== 'object') return [];
      
      const breachesArray = [];
      for (const [dbName, dbInfo] of Object.entries(detailsObj)) {
        if (!dbInfo) continue;
        
        // 🔥 修复: 为每条数据记录创建单独的breach条目
        const dataRecords = Array.isArray(dbInfo.Data) ? dbInfo.Data : [];
        
        if (dataRecords.length === 0) {
          // 没有数据记录，只显示泄露信息
          breachesArray.push({
            database: dbName,
            info_leak: dbInfo.InfoLeak || '',
            data: {},
            recordIndex: 0,
            totalRecords: 0
          });
        } else {
          // 🔥 关键修复: 为每条数据记录创建单独的卡片
          dataRecords.forEach((record, index) => {
            breachesArray.push({
              database: dbName,
              info_leak: dbInfo.InfoLeak || '',
              data: record,
              recordIndex: index + 1,
              totalRecords: dataRecords.length
            });
          });
        }
      }
      
      console.log('📊 [uniqueBreaches] 处理后的泄露数据:', breachesArray.length, '条记录');
      return breachesArray;
    } catch (e) {
      console.error('Error processing data breaches:', e);
      return [];
    }
  }, [data_breaches?.details]);

  // Generate social media strings for contact section
  const socialMediaStrings = React.useMemo(() => {
    if (!Array.isArray(uniqueAccounts)) return [];
    return [...new Set(uniqueAccounts.map(acc => {
      const name = getPlatformDisplayName(acc.platform);
      return acc.username ? `${name}: ${acc.username}` : name;
    }))];
  }, [uniqueAccounts]);

  // Fix mojibake for risk level if present
  // 当没有风险等级数据时，随机显示"良好"或"低风险"
  const getRiskLevel = (level) => {
    if (!level) {
      // 随机返回"良好"或"低风险"
      const randomOptions = ['良好', '低风险'];
      return randomOptions[Math.floor(Math.random() * randomOptions.length)];
    }
    if (level.includes('é«') || level.includes('High') || level === '高') return '高风险';
    if (level.includes('Medium') || level === '中') return '中等';
    if (level.includes('Low') || level === '低' || level === '良好' || level === '低风险') return '良好';
    return level;
  };

  // 使用 useMemo 确保风险等级在组件生命周期内保持稳定，添加随机种子
  const riskLevel = React.useMemo(() => {
    if (summary?.risk_level) {
      return getRiskLevel(summary.risk_level);
    }
    // 没有风险等级时，随机选择
    const randomOptions = ['良好', '低风险'];
    return randomOptions[Math.floor(Math.random() * randomOptions.length)];
  }, [summary?.risk_level]);
  const riskColorClass = riskLevel === '高风险' ? 'text-red-500 bg-red-500/10 border-red-500/20' : riskLevel === '中等' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20';

  return (
    <div className="min-h-screen premium-page-bg p-4 md:p-8 font-sans relative">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8 print:hidden fade-in">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all duration-300 hover:scale-105 font-medium shadow-lg">
            <ArrowLeft className="w-5 h-5" /> 返回搜索
          </button>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded shadow-sm hover:bg-accent text-sm font-medium text-foreground">
              <Printer className="w-4 h-4" /> 打印报告
            </button>
          </div>
        </div>

        {/* Report Container */}
        <div className="glass-card shadow-2xl rounded-2xl overflow-hidden print:shadow-none fade-in">
          
          {/* Report Header - Premium Style */}
          <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-10 overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 text-white drop-shadow-lg">{basic_info?.name || 'UNKNOWN SUBJECT'}</h1>
                <div className="flex items-center gap-4 text-purple-200 text-sm uppercase tracking-widest font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>机密档案报告</span>
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <div className="premium-badge badge-info px-8 py-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <Shield className="w-7 h-7" />
                  <div>
                    <div className="text-xs uppercase tracking-wider font-bold opacity-70">风险评估</div>
                    <div className="text-2xl font-black">{riskLevel.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
            <StatsGrid>
              <RiskScoreStats level={riskLevel} />
              <DataBreachStats count={uniqueBreaches?.length || 0} />
              <SocialAccountsStats count={uniqueAccounts?.length || 0} />
              <EmailsStats count={sortedEmails?.length || 0} />
            </StatsGrid>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3">
            
            {/* Left Column: Identity & Contact */}
            <div className="lg:col-span-1 glass-card p-8 space-y-8 slide-in-right">
              
              {/* Avatar - Premium Style */}
              <div className="flex justify-center fade-in">
                <div className="premium-avatar" style={{width: '180px', height: '180px'}}>
                  {finalAvatarUrl ? (
                    <img 
                      src={finalAvatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('❌ Avatar image failed to load:', finalAvatarUrl);
                        e.target.style.display = 'none';
                        const fallbackDiv = e.target.parentElement.querySelector('.fallback-avatar');
                        if (fallbackDiv) {
                          fallbackDiv.classList.remove('hidden');
                          fallbackDiv.style.display = 'flex';
                        }
                      }}
                      onLoad={() => {
                        console.log('✅ Avatar image loaded successfully:', finalAvatarUrl);
                      }}
                    />
                  ) : null}
                  <div className={`fallback-avatar w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 ${finalAvatarUrl ? 'hidden' : ''}`}>
                    <User className="w-24 h-24 text-purple-400/40" />
                  </div>
                  <div className="status-badge status-online"></div>
                </div>
              </div>

              {/* Identity Section */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> 身份详情
                </h3>
                <div className="space-y-4">
                  <InfoField label="全名" value={finalBasicInfo?.name} />
                  <InfoField label="出生日期" value={formatDate(finalBasicInfo?.birthday)} />
                  <InfoField label="年龄" value={finalBasicInfo?.age} />
                  <InfoField label="国籍" value={finalBasicInfo?.country || finalBasicInfo?.nationality} />
                  <InfoField label="性别" value={displayGender} />
                  
                  {/* 🇺🇸 美国特有: SSN */}
                  {finalBasicInfo?.ssn && (
                    <div className="pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">社会安全号 (SSN)</div>
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-md">
                        <div className="font-mono text-lg font-bold text-red-500 tracking-wide">
                          {finalBasicInfo.ssn}
                        </div>
                        <div className="text-[10px] text-red-400 mt-1">⚠️ 敏感信息</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Debug NIK display */}
                  {(() => {
                    console.log('🆔 [Render] Checking NIK display conditions:');
                    console.log('  - finalBasicInfo?.all_niks:', finalBasicInfo?.all_niks);
                    console.log('  - Is array:', Array.isArray(finalBasicInfo?.all_niks));
                    console.log('  - Length:', finalBasicInfo?.all_niks?.length);
                    console.log('  - bestNik:', bestNik);
                    return null;
                  })()}
                  
                  {Array.isArray(finalBasicInfo?.all_niks) && finalBasicInfo.all_niks.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">身份证号 (NIK)</div>
                      
                      {/* Best Match */}
                      {bestNik && (
                        <div className="mb-3 p-3 bg-green-500/5 border border-green-500/20 rounded-md">
                           <div className="text-[10px] text-green-600 font-bold mb-1 flex items-center gap-1 uppercase tracking-wider">
                             <Shield className="w-3 h-3" /> 系统推荐 (最佳匹配)
                           </div>
                           <div className="font-mono text-xl font-bold text-green-500 tracking-wide">
                             {bestNik}
                           </div>
                        </div>
                      )}
                    </div>
                  )}

                  {Array.isArray(finalBasicInfo?.all_names) && finalBasicInfo.all_names.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">已知别名</div>
                      <div className="flex flex-wrap gap-2">
                        {finalBasicInfo.all_names.map((name, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-border" />

              {/* Contact Section */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> 联系方式
                </h3>
                <div className="space-y-6">
                  <ContactGroup label="电话号码" items={uniquePhones} icon={<Phone className="w-3 h-3" />} />
                  <ContactGroup label="电子邮箱" items={sortedEmails} icon={<Mail className="w-3 h-3" />} />
                  <ContactGroup label="物理地址" items={contact_info?.addresses} icon={<MapPin className="w-3 h-3" />} />
                  
                  {/* 🇺🇸 美国特有: IP 地址 */}
                  {contact_info?.ip_addresses && contact_info.ip_addresses.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" /> IP 地址
                      </div>
                      <div className="space-y-1">
                        {contact_info.ip_addresses.map((ip, i) => (
                          <div key={i} className="font-mono text-sm text-foreground bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                            {ip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Social Media Section */}
                  {(Array.isArray(socialMediaStrings) && socialMediaStrings.length > 0 || Array.isArray(tcLinks) && tcLinks.length > 0 || hasFbData || hasTwitter || phoneForSocial || socialLoading.facebook || socialLoading.telegram || socialLoading.truecaller || facebookData || telegramData || truecallerData || snapchatData) && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <Share2 className="w-3 h-3" /> 社交媒体
                      </div>
                      <div className="space-y-3">
                        {/* Social media text list removed - cards below show this information */}
                        
                        {/* Twitter Card - Removed as requested */}
                        
                        {/* Facebook Card from Caller ID - Removed as requested */}
                        
                        {/* WhatsApp & Telegram Cards from Truecaller */}
                        {Array.isArray(tcLinks) && tcLinks.map((link, i) => {
                          // Determine which avatar to show
                          const isWhatsApp = link.label === 'WhatsApp';
                          const isTelegram = link.label === 'Telegram';
                          const avatarSrc = isWhatsApp ? tcProfile.whatsapp_photo : (isTelegram ? tcProfile.profile_photo : null);
                          
                          // Platform brand colors
                          const bgColor = isWhatsApp ? '#25D366' : '#0088CC'; // WhatsApp green or Telegram blue
                          const hoverColor = isWhatsApp ? '#20BD5A' : '#006BA3';
                          
                          return (
                            <a 
                              key={`tc-${i}`} 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium rounded-lg transition-all group border-2 bg-transparent hover:bg-white/5"
                              style={{ borderColor: bgColor, color: bgColor }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverColor; e.currentTarget.style.color = hoverColor; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = bgColor; e.currentTarget.style.color = bgColor; }}
                            >
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2" style={{ borderColor: bgColor }}>
                                {avatarSrc ? (
                                  <img 
                                    src={avatarSrc} 
                                    alt={link.label}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center ${avatarSrc ? 'hidden' : ''}`}>
                                  {isWhatsApp ? <Phone className="w-5 h-5" style={{ color: bgColor }} /> : <Share2 className="w-5 h-5" style={{ color: bgColor }} />}
                                </div>
                              </div>
                              
                              {/* Label */}
                              <span className="flex-1 flex items-center gap-2">
                                {link.label}
                              </span>
                              
                              {/* Arrow */}
                              <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                            </a>
                          );
                        })}
                        
                        {/* Extracted Social Media from Data Breaches */}
                        {Array.isArray(extractedSocialMedia) && extractedSocialMedia.map((social, i) => {
                          const getPlatformColor = (platform) => {
                            switch(platform.toLowerCase()) {
                              case 'facebook': return { border: '#1877F2', text: '#1877F2', hover: '#1465D6' };
                              case 'instagram': return { border: '#E4405F', text: '#E4405F', hover: '#D13049' };
                              case 'twitter': return { border: '#1DA1F2', text: '#1DA1F2', hover: '#1A91DA' };
                              case 'gravatar': return { border: '#1E8CBE', text: '#1E8CBE', hover: '#1874A5' };
                              default: return { border: '#6B7280', text: '#6B7280', hover: '#4B5563' };
                            }
                          };
                          
                          const colors = getPlatformColor(social.platform);
                          const domain = getPlatformDomain(social.platform);
                          const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
                          const logoUrl = `${API_BASE}/logo/${domain}`;
                          
                          // 🔥 调试：打印Instagram卡片信息
                          if (social.platform.toLowerCase() === 'instagram') {
                            console.log(`📸 [Instagram Card] 渲染卡片:`, {
                              username: social.username,
                              avatar: social.avatar,
                              logoUrl: logoUrl,
                              email: social.email
                            });
                          }
                          
                          return (
                            <div 
                              key={`extracted-${i}`}
                              className="w-full p-4 rounded-lg border-2 bg-card/50"
                              style={{ borderColor: colors.border }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Avatar with fallback to platform logo */}
                                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2 bg-white" style={{ borderColor: colors.border }}>
                                  {social.avatar ? (
                                    <img 
                                      src={social.avatar} 
                                      alt={social.platform}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <img 
                                    src={logoUrl}
                                    alt={social.platform}
                                    className={`w-full h-full object-cover ${social.avatar ? 'hidden' : ''}`}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextElementSibling.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="w-full h-full flex items-center justify-center hidden">
                                    <Share2 className="w-6 h-6" style={{ color: colors.border }} />
                                  </div>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  {/* Platform name */}
                                  <div className="font-bold text-base" style={{ color: colors.text }}>
                                    {social.platform}
                                  </div>
                                  
                                  {/* Full name */}
                                  {social.fullName && (
                                    <div className="text-sm font-medium text-foreground">
                                      {social.fullName}
                                    </div>
                                  )}
                                  
                                  {/* Username */}
                                  {social.username && (
                                    <div className="text-sm text-muted-foreground font-mono">
                                      @{social.username}
                                    </div>
                                  )}
                                  
                                  {/* Email */}
                                  {social.email && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      📧 {social.email}
                                    </div>
                                  )}
                                  
                                  {/* Additional info */}
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                                    {social.followers !== undefined && (
                                      <span>👥 {social.followers} 关注者</span>
                                    )}
                                    {social.registration_date && (
                                      <span>📅 {social.registration_date}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* ==================== 实时 API 社交媒体卡片 ==================== */}
                        
                        {/* Facebook API Card - Removed as requested */}
                        
                        {/* Telegram API Card - 只在有有效数据时显示 */}
                        {socialLoading.telegram ? (
                          <div className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border-2 border-sky-500/30 bg-sky-500/5">
                            <div className="w-10 h-10 rounded-full border-2 border-sky-500/30 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <span className="text-sky-400 text-sm">正在查询 Telegram...</span>
                          </div>
                        ) : telegramData?.success && telegramData?.data && telegramData.data.telegram_found && (telegramData.data.user_info?.first_name || telegramData.data.first_name || telegramData.data.name) && (
                          <div
                            className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium rounded-lg border-2 bg-transparent"
                            style={{ borderColor: '#0088CC', color: '#0088CC' }}
                          >
                            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2 bg-white" style={{ borderColor: '#0088CC' }}>
                              {(telegramData.data.user_info?.avatar_url || telegramData.data.avatar_url || telegramData.data.photo_url) ? (
                                <img src={`${API_BASE}/avatar?url=${encodeURIComponent(telegramData.data.user_info?.avatar_url || telegramData.data.avatar_url || telegramData.data.photo_url)}`} alt="Telegram" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }} />
                              ) : null}
                              <img 
                                src={`${API_BASE}/logo/telegram.org`}
                                alt="Telegram"
                                className={`w-full h-full object-cover ${(telegramData.data.user_info?.avatar_url || telegramData.data.avatar_url || telegramData.data.photo_url) ? 'hidden' : ''}`}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <Share2 className="w-5 h-5 hidden" style={{ color: '#0088CC' }} />
                            </div>
                            <span className="flex-1">
                              <div className="font-semibold flex items-center gap-2">
                                Telegram
                              </div>
                              <div className="text-sm opacity-75">
                                {telegramData.data.user_info?.first_name || 
                                 telegramData.data.first_name || 
                                 telegramData.data.user_info?.display_name ||
                                 telegramData.data.name || 
                                 '用户'}
                                {(telegramData.data.user_info?.last_name || telegramData.data.last_name) ? 
                                 ` ${telegramData.data.user_info?.last_name || telegramData.data.last_name}` : ''}
                              </div>
                            </span>
                          </div>
                        )}
                        
                        {/* WhatsApp Card (Truecaller) - 只在有有效数据时显示 */}
                        {socialLoading.truecaller ? (
                          <div className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                            <div className="w-10 h-10 rounded-full border-2 border-green-500/30 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <span className="text-green-400 text-sm">正在查询 WhatsApp...</span>
                          </div>
                        ) : truecallerData?.success && truecallerData?.data && (truecallerData.data.data?.[0]?.name || truecallerData.data.data?.name || truecallerData.data.name || truecallerData.data.profile?.name) && (
                          <div 
                            className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium rounded-lg border-2 bg-transparent"
                            style={{ borderColor: '#25D366', color: '#25D366' }}
                          >
                            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2 bg-white" style={{ borderColor: '#25D366' }}>
                              {(truecallerData.data.data?.image || truecallerData.data.image || truecallerData.data.profile?.image) ? (
                                <img src={truecallerData.data.data?.image || truecallerData.data.image || truecallerData.data.profile?.image} alt="WhatsApp" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden'); }} />
                              ) : null}
                              <img 
                                src={`${API_BASE}/logo/whatsapp.com`}
                                alt="WhatsApp"
                                className={`w-full h-full object-cover ${(truecallerData.data.data?.image || truecallerData.data.image) ? 'hidden' : ''}`}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <Phone className="w-5 h-5 hidden" style={{ color: '#25D366' }} />
                            </div>
                            <span className="flex-1">
                              <div className="font-semibold flex items-center gap-2">
                                WhatsApp
                              </div>
                              <div className="text-sm opacity-75">
                                {truecallerData.data.data?.name || 
                                 truecallerData.data.name || 
                                 truecallerData.data.profile?.name ||
                                 '未知姓名'}
                              </div>
                              {(truecallerData.data.data?.carrier || truecallerData.data.carrier || truecallerData.data.data?.phones?.[0]?.carrier) && (
                                <div className="text-xs opacity-50">
                                  运营商: {truecallerData.data.data?.carrier || truecallerData.data.carrier || truecallerData.data.data?.phones?.[0]?.carrier}
                                </div>
                              )}
                              {(truecallerData.data.data?.spamScore !== undefined || truecallerData.data.spamScore !== undefined) && (
                                <div className="text-xs opacity-50">
                                  垃圾评分: {truecallerData.data.data?.spamScore ?? truecallerData.data.spamScore}
                                </div>
                              )}
                            </span>
                          </div>
                        )}
                        
                        {/* 🆕 Snapchat Card */}
                        {snapchatData?.success && snapchatData?.data?.snapchat_found && (
                          <div 
                            className="flex items-center gap-3 w-full px-4 py-3 text-base font-medium rounded-lg border-2 bg-transparent"
                            style={{ borderColor: '#FFFC00', color: '#FFFC00' }}
                          >
                            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2 bg-black" style={{ borderColor: '#FFFC00' }}>
                              <img 
                                src={`${API_BASE}/logo/snapchat.com`}
                                alt="Snapchat"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <span className="hidden text-2xl">👻</span>
                            </div>
                            <span className="flex-1">
                              <div className="font-semibold flex items-center gap-2">
                                Snapchat
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">已验证</span>
                              </div>
                              <div className="text-sm opacity-75 text-foreground">
                                该号码已关联 Snapchat 账户
                              </div>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Professional, Digital, Breaches */}
            <div className="lg:col-span-2 p-8 space-y-10 bg-card">
              
              {/* Professional Section */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" /> 职业背景
                </h2>
                {Array.isArray(finalProfessionalInfo?.jobs) && finalProfessionalInfo.jobs.length > 0 ? (
                  <div className="grid gap-4">
                    {finalProfessionalInfo.jobs.map((job, i) => (
                      <div key={i} className="bg-muted/20 border border-border rounded-lg p-4 shadow-sm space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">职位:</span>
                          <span className="font-bold text-foreground">{translateToChineseIfNeeded(job.title) || '未知职位'}</span>
                        </div>
                        {job.company && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">公司:</span>
                            <span className="text-primary font-medium">{translateToChineseIfNeeded(job.company)}</span>
                          </div>
                        )}
                        {job.industry && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">行业:</span>
                            <span className="text-sm text-foreground">{translateToChineseIfNeeded(job.industry)}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">位置:</span>
                            <span className="text-sm text-foreground">{translateToChineseIfNeeded(job.location)}</span>
                          </div>
                        )}
                        {job.jobStartDate && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">开始:</span>
                            <span className="text-sm text-foreground">{job.jobStartDate}</span>
                          </div>
                        )}
                        {job.companySize && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">规模:</span>
                            <span className="text-sm text-foreground">{job.companySize} 员工</span>
                          </div>
                        )}
                        {job.summary && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">简介:</span>
                            <span className="text-sm text-muted-foreground italic">{translateToChineseIfNeeded(job.summary)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                          <span className="text-xs font-semibold text-muted-foreground">来源:</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">{job.source}</span>
                          {job.linkedinNickname && (
                            <a 
                              href={`https://www.linkedin.com/in/${job.linkedinNickname}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              查看 LinkedIn
                            </a>
                          )}
                          {job.match_score && (
                            <span className="text-xs text-muted-foreground ml-auto">匹配度: {(job.match_score * 10).toFixed(1)}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">未找到职业记录。</div>
                )}
              </section>

              {/* 🇺🇸 美国特有: 财务信息 */}
              {(profile.financial_info?.income || profile.financial_info?.net_worth || profile.financial_info?.credit_score) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" /> 财务信息
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {profile.financial_info?.income && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">收入等级</div>
                        <div className="text-xl font-bold text-green-500">{profile.financial_info.income}</div>
                      </div>
                    )}
                    {profile.financial_info?.net_worth && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">净资产</div>
                        <div className="text-xl font-bold text-blue-500">{profile.financial_info.net_worth}</div>
                      </div>
                    )}
                    {profile.financial_info?.credit_score && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">信用评分</div>
                        <div className="text-xl font-bold text-purple-500">{profile.financial_info.credit_score}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🇺🇸 美国特有: 房产信息 */}
              {profile.housing_info?.properties && profile.housing_info.properties.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Home className="w-5 h-5 text-amber-500" /> 房产信息
                  </h2>
                  <div className="space-y-2">
                    {profile.housing_info.properties.map((prop, i) => (
                      <div key={i} className="bg-muted/20 border border-border rounded-lg p-3 text-sm text-foreground">
                        {prop}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 🇺🇸 美国特有: 家庭信息 */}
              {(profile.family_info?.children_count || profile.family_info?.marital_status || profile.family_info?.household_size) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Users className="w-5 h-5 text-pink-500" /> 家庭信息
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {profile.family_info?.children_count && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">子女数量</div>
                        <div className="text-xl font-bold text-pink-500">{profile.family_info.children_count}</div>
                      </div>
                    )}
                    {profile.family_info?.marital_status && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">婚姻状态</div>
                        <div className="text-xl font-bold text-pink-500">{profile.family_info.marital_status}</div>
                      </div>
                    )}
                    {profile.family_info?.household_size && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">家庭规模</div>
                        <div className="text-xl font-bold text-pink-500">{profile.family_info.household_size} 人</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🇺🇸 美国特有: 车辆信息 */}
              {((profile.vehicle_info?.vehicles && profile.vehicle_info.vehicles.length > 0) || 
                (profile.vehicle_info?.vehicle_vins && profile.vehicle_info.vehicle_vins.length > 0) ||
                (profile.assets?.vehicles && profile.assets.vehicles.length > 0)) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-500" /> 车辆信息
                  </h2>
                  <div className="space-y-4">
                    {/* 车辆品牌和型号 */}
                    {(profile.vehicle_info?.vehicles || profile.assets?.vehicles)?.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(profile.vehicle_info?.vehicles || profile.assets?.vehicles).map((vehicle, i) => (
                          <div key={i} className="bg-muted/20 border border-border rounded-lg p-4">
                            <div className="font-bold text-foreground">🚗 {vehicle.brand}</div>
                            <div className="text-sm text-muted-foreground">{vehicle.model}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* VIN 号码 */}
                    {profile.vehicle_info?.vehicle_vins?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">车架号 (VIN)</div>
                        <div className="space-y-1">
                          {profile.vehicle_info.vehicle_vins.map((vin, i) => (
                            <div key={i} className="font-mono text-sm bg-muted/20 border border-border rounded px-3 py-2">{vin}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 车牌号 */}
                    {profile.vehicle_info?.vehicle_numbers?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">车牌号</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.vehicle_info.vehicle_numbers.map((num, i) => (
                            <span key={i} className="font-mono text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded px-3 py-1">{num}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🇺🇸 美国特有: 教育信息 */}
              {(profile.education_info?.schools?.length > 0 || profile.education_info?.degrees?.length > 0) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> 教育信息
                  </h2>
                  <div className="space-y-2">
                    {profile.education_info?.schools?.map((school, i) => (
                      <div key={i} className="bg-muted/20 border border-border rounded-lg p-3 text-sm text-foreground">
                        🎓 {school}
                      </div>
                    ))}
                    {profile.education_info?.degrees?.map((degree, i) => (
                      <div key={`deg-${i}`} className="bg-muted/20 border border-border rounded-lg p-3 text-sm text-foreground">
                        📜 {degree}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 🇺🇸 社交关系 */}
              {(profile.social_relations?.relatives?.length > 0 || profile.social_relations?.neighbors?.length > 0 || profile.social_relations?.associates?.length > 0) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-500" /> 社交关系
                  </h2>
                  <div className="space-y-4">
                    {profile.social_relations?.relatives?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">👨‍👩‍👧 亲属</div>
                        <div className="space-y-1">
                          {profile.social_relations.relatives.slice(0, 10).map((rel, i) => (
                            <div key={i} className="bg-muted/20 border border-border rounded px-3 py-2 text-sm">{rel}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.social_relations?.neighbors?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">🏘️ 邻居</div>
                        <div className="space-y-1">
                          {profile.social_relations.neighbors.slice(0, 5).map((n, i) => (
                            <div key={i} className="bg-muted/20 border border-border rounded px-3 py-2 text-sm">{n}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.social_relations?.associates?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">🤝 关联人</div>
                        <div className="space-y-1">
                          {profile.social_relations.associates.slice(0, 5).map((a, i) => (
                            <div key={i} className="bg-muted/20 border border-border rounded px-3 py-2 text-sm">{a}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🇺🇸 政治倾向 */}
              {(profile.political_info?.political_party?.length > 0 || profile.political_info?.voter_registration?.length > 0) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    🗳️ 政治信息
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.political_info?.political_party?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground uppercase mb-1">政党</div>
                        <div className="font-bold text-foreground">{profile.political_info.political_party[0]}</div>
                      </div>
                    )}
                    {profile.political_info?.voter_registration?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground uppercase mb-1">选民登记</div>
                        <div className="font-bold text-foreground">{profile.political_info.voter_registration[0]}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🇺🇸 物理特征 */}
              {(profile.physical_info?.height?.length > 0 || profile.physical_info?.weight?.length > 0 || profile.physical_info?.hair_color?.length > 0 || profile.physical_info?.eye_color?.length > 0) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    👤 物理特征
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {profile.physical_info?.height?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">身高</div>
                        <div className="font-bold text-foreground">{profile.physical_info.height[0]}</div>
                      </div>
                    )}
                    {profile.physical_info?.weight?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">体重</div>
                        <div className="font-bold text-foreground">{profile.physical_info.weight[0]}</div>
                      </div>
                    )}
                    {profile.physical_info?.hair_color?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">发色</div>
                        <div className="font-bold text-foreground">{profile.physical_info.hair_color[0]}</div>
                      </div>
                    )}
                    {profile.physical_info?.eye_color?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-3 text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">眼色</div>
                        <div className="font-bold text-foreground">{profile.physical_info.eye_color[0]}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🇺🇸 犯罪记录 */}
              {profile.criminal_info && (profile.criminal_info.arrest_dates?.length > 0 || profile.criminal_info.crime_descriptions?.length > 0) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> 犯罪记录
                  </h2>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                    {profile.criminal_info.crime_descriptions?.map((desc, i) => (
                      <div key={i} className="text-sm text-red-400">
                        <span className="font-bold">⚠️ </span>{desc}
                        {profile.criminal_info.arrest_dates?.[i] && (
                          <span className="text-xs text-red-300 ml-2">({profile.criminal_info.arrest_dates[i]})</span>
                        )}
                      </div>
                    ))}
                    {profile.criminal_info.courts?.length > 0 && (
                      <div className="text-xs text-red-300 pt-2 border-t border-red-500/20">
                        法院: {profile.criminal_info.courts.join(', ')}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Digital Footprint Section (Cards) */}
              <section>
                <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" /> 数字足迹
                </h2>
                {(googleProfileData || (Array.isArray(uniqueAccounts) && uniqueAccounts.length > 0)) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Google Account Card */}
                    {googleProfileData && (() => {
                      console.log('🎨 Rendering Google Account card');
                      console.log('   - Full googleProfileData:', googleProfileData);
                      console.log('   - avatar_url:', googleProfileData.avatar_url);
                      console.log('   - All keys:', Object.keys(googleProfileData));
                      return true;
                    })() && (
                      <div className="bg-card border-2 border-green-500/30 rounded-lg p-3 flex items-center gap-3 hover:border-green-500/60 transition-colors shadow-sm group">
                        <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 border-2 border-green-500 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                          <img 
                            src={googleProfileData.avatar_url || "https://www.google.com/favicon.ico"} 
                            alt="Google Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('❌ Avatar load failed, using fallback');
                              // Fallback to Google favicon if avatar fails to load
                              e.target.src = "https://www.google.com/favicon.ico";
                              e.target.className = "w-6 h-6 object-contain";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="font-bold text-foreground text-sm truncate flex items-center gap-1">
                            Google Account
                            {googleProfileData.profile_url && (
                              <a 
                                href={googleProfileData.profile_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-600"
                                title="查看 Google Maps 个人资料"
                              >
                                <ArrowLeft className="w-3 h-3 rotate-180" />
                              </a>
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground truncate" title={googleProfileData.email}>
                            {googleProfileData.email}
                          </div>
                          {googleProfileData.gaia_id && (
                            <div className="text-[10px] text-muted-foreground mt-0.5" title={`GAIA ID: ${googleProfileData.gaia_id}`}>
                              ID: {googleProfileData.gaia_id.substring(0, 12)}...
                            </div>
                          )}
                          {googleProfileData.user_name && googleProfileData.user_name !== 'Unknown' && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              {googleProfileData.user_name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {Array.isArray(uniqueAccounts) && uniqueAccounts.map((acc, i) => {
                      const domain = getPlatformDomain(acc.platform);
                      const displayName = getPlatformDisplayName(acc.platform);
                      const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
                      const logoUrl = `${API_BASE}/logo/${domain}`;
                      const isInstagram = displayName.toLowerCase() === 'instagram';
                      const isFacebook = displayName.toLowerCase() === 'facebook';
                      const isTwitter = displayName.toLowerCase() === 'twitter';
                      const isClickable = isInstagram || isFacebook || isTwitter;
                      
                      // Render as static card without click functionality
                      return (
                        <div
                          key={i}
                          className="w-full bg-card border border-border rounded-lg p-3 flex items-center gap-3 shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 border border-border overflow-hidden flex items-center justify-center">
                            <img 
                              src={logoUrl} 
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = `https://ui-avatars.com/api/?name=${displayName}&background=random&color=fff&size=64`;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-bold text-foreground text-sm truncate flex items-center gap-2" title={acc.platform}>
                              {displayName}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground truncate" title={acc.username}>
                              {acc.username || '未知用户名'}
                            </div>
                            {acc.email && (
                              <div className="text-xs text-muted-foreground truncate opacity-80" title={acc.email}>
                                {acc.email}
                              </div>
                            )}
                            {acc.registration_date && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {acc.registration_date}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">未找到数字足迹记录。</div>
                )}
              </section>

              {/* Google Maps Location Section - Map View Center */}
              {(() => {
                console.log('🗺️ Checking Google Maps display conditions:');
                console.log('  - googleLocationData:', googleLocationData);
                console.log('  - has map_view:', googleLocationData?.map_view);
                console.log('  - has center:', googleLocationData?.map_view?.center);
                return null;
              })()}
              {googleLocationData && googleLocationData.map_view && googleLocationData.map_view.center && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-500" /> 地理位置
                  </h2>
                  <div className="space-y-4">
                    {(() => {
                      const center = googleLocationData.map_view.center;
                      const lat = center.latitude;
                      const lng = center.longitude;
                      const zoom = googleLocationData.map_view.zoom || 13;
                      
                      // Generate Google Maps embed URL with center point and red marker (satellite view)
                      const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${lat},${lng}&zoom=${Math.round(zoom)}&maptype=satellite`;
                      
                      // Generate Google Maps link URL (satellite view)
                      const mapsLink = `https://www.google.com/maps?q=${lat},${lng}&z=${Math.round(zoom)}&t=k`;
                      
                      return (
                        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-md">
                          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 px-4 py-3 border-b border-border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-green-500" />
                                  Google Maps 活动区域
                                </div>
                                <div className="text-xs font-mono text-muted-foreground space-y-0.5">
                                  <div>中心坐标: {lat?.toFixed(6)}°N, {lng?.toFixed(6)}°E</div>
                                  <div>缩放级别: {Math.round(zoom)}</div>
                                </div>
                              </div>
                              <a 
                                href={mapsLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                              >
                                <Globe className="w-3 h-3" />
                                在 Google 地图中打开
                              </a>
                            </div>
                          </div>
                          <div className="relative" style={{ paddingBottom: '56.25%', minHeight: '400px' }}>
                            <iframe
                              src={mapUrl}
                              className="absolute inset-0 w-full h-full"
                              style={{ 
                                border: 0,
                                filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)'
                              }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title="Google Maps 活动区域"
                            />
                          </div>
                          <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground">
                            <span className="font-medium">📍 此地图显示用户在 Google Maps 上的主要活动区域</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

              {/* Google Maps Specific Coordinates (if available) */}
              {googleLocationData && googleLocationData.coordinates && googleLocationData.coordinates.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" /> 具体位置标记
                  </h2>
                  <div className="space-y-4">
                    {googleLocationData.coordinates.map((location, idx) => {
                      const lat = location.latitude;
                      const lng = location.longitude;
                      const address = location.address || `标记点 ${idx + 1}`;
                      
                      // Generate Google Maps embed URL (satellite view)
                      const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${lat},${lng}&zoom=15&maptype=satellite`;
                      
                      // Generate Google Maps link URL (satellite view)
                      const mapsLink = location.google_maps_url || `https://www.google.com/maps?q=${lat},${lng}&t=k`;
                      
                      return (
                        <div key={idx} className="border border-border rounded-lg overflow-hidden bg-card">
                          <div className="bg-muted/50 px-4 py-3 border-b border-border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-bold text-foreground mb-1">{address}</div>
                                <div className="text-xs font-mono text-muted-foreground">
                                  坐标: {lat?.toFixed(6)}, {lng?.toFixed(6)}
                                </div>
                              </div>
                              <a 
                                href={mapsLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Globe className="w-3 h-3" />
                                打开地图
                              </a>
                            </div>
                          </div>
                          <div className="relative" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                              src={mapUrl}
                              className="absolute inset-0 w-full h-full"
                              style={{ 
                                border: 0,
                                filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)'
                              }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title={`Google Map ${idx + 1}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 地址地图 Section */}
              {contact_info?.addresses?.[0] && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <MapPinned className="w-5 h-5 text-blue-500" /> 地址位置
                  </h2>
                  <div className="space-y-4">
                    <MapSection address={contact_info.addresses[0]} />
                    <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                      <span className="font-medium">📍 地址：</span>{contact_info.addresses[0]}
                    </div>
                  </div>
                </section>
              )}

              {/* Google 活动轨迹 Section */}
              {(() => {
                console.log('🗺️ [Render Check] Google 活动轨迹检查:');
                console.log('  - googleProfileData:', googleProfileData);
                console.log('  - googleProfileData?.reviews:', googleProfileData?.reviews);
                console.log('  - reviews.length:', googleProfileData?.reviews?.length);
                console.log('  - 条件判断:', googleProfileData?.reviews && googleProfileData.reviews.length > 0);
                return null;
              })()}
              {googleProfileData?.reviews && googleProfileData.reviews.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-500" /> Google 活动轨迹 ({googleProfileData.reviews.length} 个地点)
                  </h2>
                  
                  {/* 地图可视化 - 使用 Mapbox 显示真实地图 */}
                  <div className="mb-6 space-y-4">
                    {(() => {
                      // 提取所有地址信息
                      const locations = googleProfileData.reviews.map((r, idx) => ({
                        name: r.place_name,
                        address: r.address,
                        index: idx + 1
                      }));
                      
                      // 分析地理分布
                      const cities = locations.map(l => {
                        const match = l.address?.match(/,\s*([^,]+),\s*([^,\d]+)/);
                        return match ? match[1].trim() : null;
                      }).filter(Boolean);
                      
                      const uniqueCities = [...new Set(cities)];
                      const mainCity = cities.length > 0 ? cities.sort((a,b) => 
                        cities.filter(v => v === a).length - cities.filter(v => v === b).length
                      ).pop() : '未知';
                      
                      return (
                        <>
                          {/* 统计信息 */}
                          <div className="bg-muted/20 border border-border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <MapPin className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-bold text-foreground">活动分析</span>
                            </div>
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <div>📍 主要区域: <span className="font-medium text-foreground">{mainCity}</span></div>
                              <div>🌍 覆盖城市: <span className="font-medium text-foreground">{uniqueCities.length} 个</span></div>
                              <div>🎯 评论地点: <span className="font-medium text-foreground">{locations.length} 个</span></div>
                            </div>
                          </div>
                          
                          {/* 🔥 显示所有9个地点的地图 */}
                          <div className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-foreground">🛰️ 活动地点地图</span>
                              <span className="text-xs text-muted-foreground ml-auto">{locations.length} 个标记点</span>
                            </div>
                            <MultiLocationMap locations={locations} />
                          </div>
                          
                          {/* 地点预览网格 */}
                          <div className="grid grid-cols-2 gap-3">
                            {locations.slice(0, 4).map((loc, idx) => (
                              <div key={idx} className="bg-card border border-border rounded-lg p-3 hover:border-green-500/50 transition-colors">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                                    {loc.index}
                                  </span>
                                  <span className="text-xs font-medium text-foreground truncate">{loc.name}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate pl-7">
                                  {loc.address}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {locations.length > 4 && (
                            <div className="text-xs text-muted-foreground text-center">
                              + 还有 {locations.length - 4} 个地点（详见下方列表）
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* 地址列表 */}
                  <div className="space-y-3">
                    {googleProfileData.reviews.map((review, index) => (
                      <div 
                        key={index}
                        className="border border-border rounded-lg p-4 bg-card hover:border-green-500/50 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          {/* 序号标记 */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 font-bold text-sm">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* 地点名称 */}
                            <div className="font-bold text-foreground text-base mb-2 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="truncate">{review.place_name}</span>
                            </div>
                            
                            {/* 地址 - 突出显示 */}
                            <div className="bg-muted/30 border border-border rounded px-3 py-2 mb-2">
                              <div className="text-xs text-muted-foreground mb-1">📍 地址</div>
                              <div className="text-sm text-foreground leading-relaxed">
                                {review.address || '地址未知'}
                              </div>
                            </div>
                            
                            {/* 评分和时间 */}
                            <div className="flex items-center gap-4 text-xs">
                              <span className="flex items-center gap-1 text-yellow-500 font-medium">
                                <Star className="w-3 h-3 fill-yellow-500" />
                                {review.rating}
                              </span>
                              <span className="text-muted-foreground">
                                ⏰ {review.review_time}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 🔥 新增: 电信信息 Section */}
              {profile.telecom_info && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Phone className="w-5 h-5 text-purple-500" /> 电信信息
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {profile.telecom_info.primary_carrier && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-1">运营商</div>
                        <div className="font-bold text-lg text-foreground">{profile.telecom_info.primary_carrier}</div>
                      </div>
                    )}
                    {profile.telecom_info.phone_type && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-1">号码类型</div>
                        <div className="font-bold text-lg text-foreground">{profile.telecom_info.phone_type}</div>
                      </div>
                    )}
                    {profile.telecom_info.registration_date && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-1">注册日期</div>
                        <div className="font-medium text-foreground">{formatDate(profile.telecom_info.registration_date) || profile.telecom_info.registration_date}</div>
                      </div>
                    )}
                    {profile.telecom_info.international_format && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-1">国际格式</div>
                        <div className="font-mono text-foreground">{profile.telecom_info.international_format}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 🔥 新增: 账户活动时间线 Section */}
              {profile.timeline?.events && profile.timeline.events.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" /> 账户活动时间线
                  </h2>
                  <div className="space-y-3">
                    {profile.timeline.events.map((event, i) => (
                      <div key={i} className="flex gap-4 border-l-2 border-blue-500 pl-4 py-2 hover:bg-muted/20 transition-colors rounded-r">
                        <div className="text-sm text-muted-foreground min-w-[140px] font-mono">
                          {event.date}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{event.event}</div>
                          <div className="text-xs text-muted-foreground mt-1">{event.platform}</div>
                          {event.details?.email && (
                            <div className="text-xs text-muted-foreground mt-1">
                              📧 {event.details.email}
                            </div>
                          )}
                          {event.details?.phone && (
                            <div className="text-xs text-muted-foreground mt-1">
                              📞 {event.details.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 时间线统计 */}
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">首次活动:</span>
                        <span className="ml-2 font-medium text-foreground">{profile.timeline.first_online_activity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">最新活动:</span>
                        <span className="ml-2 font-medium text-foreground">{profile.timeline.latest_activity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">活动跨度:</span>
                        <span className="ml-2 font-medium text-foreground">{profile.timeline.activity_span_years} 年</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">总事件:</span>
                        <span className="ml-2 font-medium text-foreground">{profile.timeline.total_events} 个</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 🔥 新增: 职业推断 Section - 只在没有直接职业信息时显示 */}
              {profile.profession_inference && 
               (profile.profession_inference.inferred_industries?.length > 0 || profile.profession_inference.inferred_job_titles?.length > 0) &&
               !(Array.isArray(finalProfessionalInfo?.jobs) && finalProfessionalInfo.jobs.length > 0) && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b-2 border-border flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" /> 职业推断
                  </h2>
                  <div className="space-y-4">
                    {/* 推断的行业 */}
                    {profile.profession_inference.inferred_industries?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase">推断行业</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.profession_inference.inferred_industries.map((industry, i) => {
                            const confidence = profile.profession_inference.industry_confidence?.[industry] || 0;
                            return (
                              <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full text-sm font-medium border border-indigo-500/20">
                                {industry} ({confidence.toFixed(0)}%)
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* 推断的职位 */}
                    {profile.profession_inference.inferred_job_titles?.length > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase">推断职位</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.profession_inference.inferred_job_titles.map((title, i) => {
                            const confidence = profile.profession_inference.job_title_confidence?.[title] || 0;
                            return (
                              <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-sm font-medium border border-blue-500/20">
                                {title} ({confidence.toFixed(0)}%)
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* 推断依据 */}
                    {profile.profession_inference.evidence?.length > 0 && (
                      <details className="bg-muted/20 border border-border rounded-lg p-4">
                        <summary className="cursor-pointer font-medium text-sm text-foreground hover:text-primary transition-colors">
                          推断依据 ({profile.profession_inference.evidence.length} 条)
                        </summary>
                        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                          {profile.profession_inference.evidence.map((ev, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-indigo-500 mt-0.5">•</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </section>
              )}

              {/* Data Breaches Section (Detailed List) */}
              <section>
                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-border">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Database className="w-5 h-5 text-red-500" /> 数据泄露历史
                  </h2>
                  <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-full border border-red-500/20">
                    {uniqueBreaches.length} 条记录
                  </span>
                </div>
                
                <div className="space-y-4">
                  {Array.isArray(uniqueBreaches) && uniqueBreaches.map((breach, i) => {
                    // Extract domain from database name for logo
                    const getLogoUrl = (databaseName) => {
                      const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
                      
                      // Map database names to domains
                      const domainMap = {
                        'tokopedia': 'tokopedia.com',
                        'bukalapak': 'bukalapak.com',
                        'shopback': 'shopback.co.id',
                        'reddoorz': 'reddoorz.com',
                        'gravatar': 'gravatar.com',
                        'facebook': 'facebook.com',
                        'nitro': 'gonitro.com',
                        'emuparadise': 'emuparadise.me',
                        'kominfo': 'kominfo.go.id',
                        'dukcapil': 'dukcapil.kemendagri.go.id'
                      };
                      
                      const dbLower = databaseName.toLowerCase();
                      // Try exact match first
                      for (const [key, domain] of Object.entries(domainMap)) {
                        if (dbLower.includes(key)) {
                          return `${API_BASE}/logo/${domain}`;
                        }
                      }
                      
                      // Try to extract domain from URL in breach data
                      if (breach.data?.Url) {
                        try {
                          const url = new URL(breach.data.Url);
                          return `${API_BASE}/logo/${url.hostname}`;
                        } catch (e) {}
                      }
                      
                      // Default: use database name as-is
                      const cleanName = dbLower.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                      return `${API_BASE}/logo/${cleanName}.com`;
                    };
                    
                    const logoUrl = getLogoUrl(breach.database);
                    
                    return (
                    <div key={i} className="border border-border rounded-lg p-4 bg-card hover:border-red-500/50 transition-colors">
                      <div className="flex items-start gap-3 mb-2">
                        {/* Logo */}
                        <div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 border border-border overflow-hidden flex items-center justify-center p-1">
                          <img 
                            src={logoUrl} 
                            alt={breach.database}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(breach.database)}&background=dc2626&color=fff&size=64&bold=true`;
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground">
                            {breach.database}
                            {breach.totalRecords > 1 && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                (记录 {breach.recordIndex}/{breach.totalRecords})
                              </span>
                            )}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{breach.info_leak}</p>
                      
                      <div className="bg-muted/30 rounded p-3 border border-border">
                        <div className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> 泄露数据
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          {breach.data && Object.entries(breach.data).map(([k, v]) => (
                            <div key={k} className="text-xs flex flex-col sm:flex-row sm:items-baseline gap-1">
                              <span className="text-muted-foreground font-medium min-w-[80px]">{k}:</span>
                              <span className="font-mono text-foreground break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {uniqueBreaches.length === 0 && (
                    <div className="text-sm text-muted-foreground italic">未找到泄露记录。</div>
                  )}
                </div>
              </section>

            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted/30 p-6 border-t border-border text-center text-xs text-muted-foreground">
            <p>由 OSINT 情报系统生成。本报告包含机密信息。</p>
            <p className="mt-1 font-mono">ID: {profile.investigation_id || 'N/A'}</p>
          </div>
        </div>
        
        {/* Raw Data Toggle */}
        <div className="mt-8 text-center print:hidden">
          <details className="inline-block text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 justify-center">
              <FileText className="w-4 h-4" /> 查看原始 JSON 数据
            </summary>
            <div className="mt-4 bg-slate-950 rounded-lg p-6 text-left max-w-4xl mx-auto overflow-hidden shadow-2xl border border-border">
              <pre className="text-xs text-green-400 font-mono overflow-x-auto p-2">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          </details>
        </div>

      </div>
      
      {/* Instagram Modal */}
      <InstagramModal
        isOpen={instagramModal.isOpen}
        username={instagramModal.username}
        loading={instagramModal.loading}
        data={instagramModal.data}
        error={instagramModal.error}
        onClose={closeInstagramModal}
      />
      
      {/* Facebook Modal */}
      <FacebookModal
        isOpen={facebookModal.isOpen}
        username={facebookModal.username}
        loading={facebookModal.loading}
        data={facebookModal.data}
        error={facebookModal.error}
        onClose={closeFacebookModal}
      />
      
      {/* Twitter Modal */}
      <TwitterModal
        isOpen={twitterModal.isOpen}
        username={twitterModal.username}
        displayName={twitterModal.displayName}
        loading={twitterModal.loading}
        data={twitterModal.data}
        error={twitterModal.error}
        onClose={closeTwitterModal}
      />
    </div>
  );
}

// Helper Components
function InfoField({ label, value }) {
  if (!value) return null;
  return (
    <div className="border-b border-border pb-2 last:border-0">
      <div className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">{label}</div>
      <div className="text-base font-medium text-foreground">{value}</div>
    </div>
  );
}

function ContactGroup({ label, items, icon }) {
  console.log(`📍 [ContactGroup] Called with label: "${label}", items:`, items, 'length:', items?.length);
  
  if (!items || items.length === 0) {
    console.log(`⚠️ [ContactGroup] Returning null for "${label}" - items:`, items, 'length:', items?.length);
    return null;
  }
  
  // Check if this is the address field or phone field
  const isAddress = label === '物理地址';
  const isPhone = label === '电话号码';
  
  console.log(`✅ [ContactGroup] Rendering "${label}" with ${items.length} items, isAddress:`, isAddress);
  
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const countryCode = isPhone ? getCountryCodeFromPhone(item) : null;
          
          return (
            <div key={i} className="text-sm font-mono text-foreground bg-muted/50 px-2 py-1 rounded border border-border break-all flex items-center gap-2">
              {isPhone && countryCode && (
                <ReactCountryFlag
                  countryCode={countryCode}
                  svg
                  style={{
                    width: '1.2em',
                    height: '1.2em',
                    borderRadius: '2px',
                  }}
                  title={countryCode}
                />
              )}
              <span>{isAddress ? translateAddress(item) : item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function translateAddress(address) {
  if (!address) return address;
  
  const addressTerms = {
    // Street types
    'jl.': '街',
    'jl ': '街 ',
    'jalan': '街',
    'gang': '巷',
    'gg.': '巷',
    
    // Administrative units
    'rt': 'RT',
    'rw': 'RW',
    'blok': '街区',
    'no': '号',
    'no.': '号',
    
    // Housing types
    'perum': '住宅区',
    'perumahan': '住宅区',
    'komplek': '小区',
    'komplex': '小区',
    
    // Regions in Indonesian
    'kalimantan timur': '东加里曼丹省',
    'kalimantan barat': '西加里曼丹省',
    'kalimantan selatan': '南加里曼丹省',
    'kalimantan tengah': '中加里曼丹省',
    'kalimantan utara': '北加里曼丹省',
    'jawa timur': '东爪哇省',
    'jawa barat': '西爪哇省',
    'jawa tengah': '中爪哇省',
    'sulawesi selatan': '南苏拉威西省',
    'sulawesi utara': '北苏拉威西省',
    'sumatera utara': '北苏门答腊省',
    'sumatera barat': '西苏门答腊省',
    'sumatera selatan': '南苏门答腊省',
    
    // Cities/Regencies
    'berau': '伯劳县',
    'tanjung redeb': '丹绒勒德布',
    'gunung panjang': '古农班让',
    'jakarta': '雅加达',
    'surabaya': '泗水',
    'bandung': '万隆',
    'medan': '棉兰',
    'semarang': '三宝垄',
  };
  
  let result = address.toLowerCase();
  
  // Replace terms
  for (const [indonesian, chinese] of Object.entries(addressTerms)) {
    const regex = new RegExp(indonesian, 'gi');
    result = result.replace(regex, chinese);
  }
  
  // Capitalize first letter and clean up
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  return result;
}

function translateToChineseIfNeeded(text) {
  if (!text) return text;
  
  const translations = {
    // Job titles
    'teacher': '教师',
    'Teacher': '教师',
    'TEACHER': '教师',
    'education management': '教育管理',
    'Education Management': '教育管理',
    'EDUCATION MANAGEMENT': '教育管理',
    
    // Organizations
    'dikmenum dinas pendidikan jawa timur': '东爪哇省教育局',
    'Dikmenum Dinas Pendidikan Jawa Timur': '东爪哇省教育局',
    'DIKMENUM DINAS PENDIDIKAN JAWA TIMUR': '东爪哇省教育局',
    'dinas pendidikan': '教育局',
    'Dinas Pendidikan': '教育局',
    'DINAS PENDIDIKAN': '教育局',
    
    // Common phrases
    'at': '在',
    'At': '在',
    'teacher at dinas pendidikan': '教育局教师',
    'Teacher at Dinas Pendidikan': '教育局教师',
    'TEACHER AT DINAS PENDIDIKAN': '教育局教师',
  };
  
  // Check exact match first
  if (translations[text]) {
    return translations[text];
  }
  
  // Check case-insensitive match
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(translations)) {
    if (key.toLowerCase() === lowerText) {
      return value;
    }
  }
  
  // For longer texts, try partial replacement
  let result = text;
  for (const [key, value] of Object.entries(translations)) {
    const regex = new RegExp(key, 'gi');
    result = result.replace(regex, value);
  }
  
  return result;
}

function getPlatformDomain(platform) {
  if (!platform) return 'example.com';
  
  const lower = platform.toLowerCase();

  // Smart keyword matching for common platforms (handles variations like "Twitter 200M", "MyQuranEdu.c")
  if (lower.includes('twitter') || lower === 'x') return 'twitter.com';
  if (lower.includes('facebook')) return 'facebook.com';
  if (lower.includes('instagram')) return 'instagram.com';
  if (lower.includes('linkedin')) return 'linkedin.com';
  if (lower.includes('google') || lower.includes('gmail')) return 'google.com';
  if (lower.includes('youtube')) return 'youtube.com';
  if (lower.includes('whatsapp')) return 'whatsapp.com';
  if (lower.includes('telegram')) return 'telegram.org';
  if (lower.includes('tiktok')) return 'tiktok.com';
  
  // E-commerce & Services
  if (lower.includes('tokopedia')) return 'tokopedia.com';
  if (lower.includes('shopee')) return 'shopee.co.id';
  if (lower.includes('bukalapak')) return 'bukalapak.com';
  if (lower.includes('lazada')) return 'lazada.co.id';
  if (lower.includes('gojek')) return 'gojek.com';
  if (lower.includes('grab')) return 'grab.com';
  if (lower.includes('traveloka')) return 'traveloka.com';
  if (lower.includes('amazon')) return 'amazon.com';
  if (lower.includes('ebay')) return 'ebay.com';
  if (lower.includes('netflix')) return 'netflix.com';
  if (lower.includes('spotify')) return 'spotify.com';
  if (lower.includes('airbnb')) return 'airbnb.com';
  if (lower.includes('uber')) return 'uber.com';
  
  // Tech & Tools
  if (lower.includes('github')) return 'github.com';
  if (lower.includes('gitlab')) return 'gitlab.com';
  if (lower.includes('microsoft')) return 'microsoft.com';
  if (lower.includes('apple')) return 'apple.com';
  if (lower.includes('adobe')) return 'adobe.com';
  if (lower.includes('canva')) return 'canva.com';
  if (lower.includes('zoom')) return 'zoom.us';
  if (lower.includes('discord')) return 'discord.com';
  if (lower.includes('steam')) return 'steampowered.com';
  if (lower.includes('roblox')) return 'roblox.com';
  
  // Specific/Niche
  if (lower.includes('myquranedu')) return 'myquranedu.com';
  if (lower.includes('cit0day')) return 'cit0day.com';
  if (lower.includes('bankbsi') || lower.includes('bsi')) return 'bankbsi.co.id';
  if (lower.includes('ovo')) return 'ovo.id';
  if (lower.includes('dana')) return 'dana.id';
  if (lower.includes('linkaja')) return 'linkaja.id';
  if (lower.includes('yahoo')) return 'yahoo.com';
  if (lower.includes('paypal')) return 'paypal.com';
  if (lower.includes('pinterest')) return 'pinterest.com';
  if (lower.includes('skype')) return 'skype.com';

  // If platform already looks like a domain, use it directly
  if (platform.includes('.') && !platform.includes(' ')) {
    return platform;
  }

  // Fallback: remove spaces/special chars and add .com
  const p = lower.replace(/[^a-z0-9]/g, '');
  return `${p}.com`;
}

function getPlatformDisplayName(platform) {
  if (!platform) return 'Unknown';
  const lower = platform.toLowerCase();
  
  // Known platforms cleanup
  if (lower.includes('twitter') || lower === 'x') return 'Twitter';
  if (lower.includes('facebook')) return 'Facebook';
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('google') || lower.includes('gmail')) return 'Google';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('telegram')) return 'Telegram';
  if (lower.includes('tiktok')) return 'TikTok';
  
  if (lower.includes('tokopedia')) return 'Tokopedia';
  if (lower.includes('shopee')) return 'Shopee';
  if (lower.includes('bukalapak')) return 'Bukalapak';
  if (lower.includes('lazada')) return 'Lazada';
  if (lower.includes('gojek')) return 'Gojek';
  if (lower.includes('grab')) return 'Grab';
  if (lower.includes('traveloka')) return 'Traveloka';
  
  if (lower.includes('myquranedu')) return 'MyQuranEdu';
  if (lower.includes('cit0day')) return 'Cit0Day';
  if (lower.includes('bankbsi') || lower.includes('bsi')) return 'Bank BSI';
  if (lower.includes('canva')) return 'Canva';
  if (lower.includes('adobe')) return 'Adobe';
  if (lower.includes('microsoft')) return 'Microsoft';
  if (lower.includes('github')) return 'GitHub';
  if (lower.includes('gitlab')) return 'GitLab';
  
  return platform;
}

// Twitter Modal Component
function TwitterModal({ isOpen, username, displayName, loading, data, error, onClose }) {
  if (!isOpen) return null;
  
  // Extract user data - Twitter API returns data in data.data.user.result
  const userContainer = data?.data?.user || data?.data?.data || {};
  const userData = userContainer?.result?.legacy || userContainer?.result || userContainer?.user || {};
  
  console.log('🐦 [Twitter Modal] Full data:', data);
  console.log('🐦 [Twitter Modal] User container:', userContainer);
  console.log('🐦 [Twitter Modal] Extracted userData:', userData);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">𝕏</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Twitter / X Profile</h2>
              <p className="text-sm text-muted-foreground">{displayName || `@${username}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4"></div>
              <p className="text-muted-foreground">加载 Twitter 资料中...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}
          
          {userData && !loading && !error && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                {userData.profile_image_url_https && (
                  <img 
                    src={`http://localhost:8000/api/avatar?url=${encodeURIComponent(userData.profile_image_url_https.replace('_normal', '_400x400'))}`}
                    alt={userData.name}
                    className="w-20 h-20 rounded-full border-2 border-sky-500"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${userData.name}&background=1DA1F2&color=fff&size=128`;
                    }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{userData.name}</h3>
                  <p className="text-muted-foreground">@{userData.screen_name}</p>
                  {userData.verified && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-sky-500/10 text-sky-500 px-2 py-1 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      已验证
                    </span>
                  )}
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{userData.followers_count?.toLocaleString() || '0'}</div>
                  <div className="text-xs text-muted-foreground">粉丝</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{userData.friends_count?.toLocaleString() || '0'}</div>
                  <div className="text-xs text-muted-foreground">关注</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{userData.statuses_count?.toLocaleString() || '0'}</div>
                  <div className="text-xs text-muted-foreground">推文</div>
                </div>
              </div>
              
              {/* Bio */}
              {userData.description && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">个人简介</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{userData.description}</p>
                </div>
              )}
              
              {/* Location & URL */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {userData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{userData.location}</span>
                  </div>
                )}
                {userData.url && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={userData.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sky-500 hover:text-sky-600 underline truncate"
                    >
                      {userData.url}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Created Date */}
              {userData.created_at && (
                <div className="text-xs text-muted-foreground">
                  加入时间: {new Date(userData.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
              
              {/* View on Twitter Button */}
              <a
                href={`https://twitter.com/${userData.screen_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-sky-500 text-white font-semibold py-3 px-4 rounded-lg text-center hover:bg-sky-600 transition-colors"
              >
                在 Twitter 上查看
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Facebook Modal Component
function FacebookModal({ isOpen, username, loading, data, error, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">f</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Facebook Profile</h2>
              <p className="text-sm text-muted-foreground">{username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-muted-foreground">加载 Facebook 资料中...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}
          
          {data && !loading && !error && (
            <div className="space-y-6">
              {/* Profile Info */}
              {data.name && (
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground">{data.name}</h3>
                  {data.username && <p className="text-muted-foreground mt-1">@{data.username}</p>}
                </div>
              )}
              
              {/* Posts */}
              {data.posts && Array.isArray(data.posts) && data.posts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">最近帖子</h4>
                  <div className="space-y-3">
                    {data.posts.slice(0, 5).map((post, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-lg p-4">
                        {post.text && (
                          <p className="text-sm text-foreground mb-2">{post.text}</p>
                        )}
                        {post.timestamp && (
                          <p className="text-xs text-muted-foreground">{new Date(post.timestamp).toLocaleString('zh-CN')}</p>
                        )}
                        {post.likes && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>👍 {post.likes}</span>
                            {post.comments && <span>💬 {post.comments}</span>}
                            {post.shares && <span>🔄 {post.shares}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Additional Info */}
              {data.followers && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{data.followers?.toLocaleString() || '0'}</div>
                    <div className="text-xs text-muted-foreground">关注者</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{data.following?.toLocaleString() || '0'}</div>
                    <div className="text-xs text-muted-foreground">关注中</div>
                  </div>
                </div>
              )}
              
              {/* View on Facebook Button */}
              <a
                href={`https://www.facebook.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg text-center hover:bg-blue-700 transition-colors"
              >
                在 Facebook 上查看
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Instagram Modal Component
function InstagramModal({ isOpen, username, loading, data, error, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">📸</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Instagram Profile</h2>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
              <p className="text-muted-foreground">加载 Instagram 资料中...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          )}
          
          {data && !loading && !error && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                {data.profile_pic_url && (
                  <img 
                    src={`http://localhost:8000/api/avatar?url=${encodeURIComponent(data.profile_pic_url)}`}
                    alt={data.username}
                    className="w-20 h-20 rounded-full border-2 border-pink-500"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${data.username}&background=E4405F&color=fff&size=128`;
                    }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{data.full_name || data.username}</h3>
                  <p className="text-muted-foreground">@{data.username}</p>
                  {data.is_verified && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      已验证
                    </span>
                  )}
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{data.edge_followed_by?.count?.toLocaleString() || '0'}</div>
                  <div className="text-xs text-muted-foreground">粉丝</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{data.edge_follow?.count?.toLocaleString() || '0'}</div>
                  <div className="text-xs text-muted-foreground">关注</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{data.edge_owner_to_timeline_media?.count?.toLocaleString() || '0'}</div>
                  <div className="text-xs text-muted-foreground">帖子</div>
                </div>
              </div>
              
              {/* Bio */}
              {data.biography && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">个人简介</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.biography}</p>
                </div>
              )}
              
              {/* External URL */}
              {data.external_url && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">外部链接</h4>
                  <a 
                    href={data.external_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-pink-500 hover:text-pink-600 underline break-all"
                  >
                    {data.external_url}
                  </a>
                </div>
              )}
              
              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {data.is_business_account && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">商业账号</span>
                  </div>
                )}
                {data.is_private && (
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">私密账号</span>
                  </div>
                )}
              </div>
              
              {/* View on Instagram Button */}
              <a
                href={`https://www.instagram.com/${data.username}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg text-center hover:opacity-90 transition-opacity"
              >
                在 Instagram 上查看
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getBestNik(niks, birthday, gender) {
  if (!Array.isArray(niks) || niks.length === 0) return null;
  if (niks.length === 1) return niks[0];
  
  // If no birthday, return the first one (usually the most recent or primary from API)
  if (!birthday) return niks[0];

  try {
    // Try to parse birthday string (e.g. "1990-01-01" or "01-01-1990")
    const dateParts = birthday.match(/\d+/g);
    if (!dateParts || dateParts.length < 3) return niks[0];
    
    // Simple heuristic for date parsing
    let day, month, year;
    if (dateParts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
    } else {
      // DD-MM-YYYY (common in Indonesia)
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      year = parseInt(dateParts[2]);
    }
    
    // Get 2 digit year
    const year2 = year % 100;
    
    let bestNik = niks[0];
    let maxScore = -1;
    
    niks.forEach(nik => {
      if (!nik || typeof nik !== 'string' || nik.length < 12) return;
      
      // NIK format: PKKCC DDMMYY SSSS
      // Index:      012345 678901 2345
      
      // Extract date parts from NIK
      // Usually digits 6-12
      const nikDateStr = nik.substring(6, 12);
      if (!/^\d+$/.test(nikDateStr)) return;
      
      const nikDD = parseInt(nik.substring(6, 8));
      const nikMM = parseInt(nik.substring(8, 10));
      const nikYY = parseInt(nik.substring(10, 12));
      
      let score = 0;
      
      // Check Year
      if (nikYY === year2) score += 3;
      
      // Check Month
      if (nikMM === month) score += 3;
      
      // Check Day (handle gender offset 40)
      let realNikDD = nikDD;
      if (nikDD > 40) realNikDD -= 40;
      
      if (realNikDD === day) score += 4;
      
      // Gender check if available
      if (gender) {
        const isFemale = gender.toLowerCase().includes('female') || gender.includes('女') || gender.toLowerCase().includes('perempuan');
        const isMale = gender.toLowerCase().includes('male') || gender.includes('男') || gender.toLowerCase().includes('laki');
        
        if (isFemale && nikDD > 40) score += 2;
        else if (isMale && nikDD <= 40) score += 2;
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestNik = nik;
      }
    });
    
    return bestNik;
  } catch (e) {
    console.error('Error calculating best NIK:', e);
    return niks[0];
  }
}
