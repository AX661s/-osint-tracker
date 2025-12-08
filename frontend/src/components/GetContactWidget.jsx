import React, { useState, useEffect } from 'react';
import { 
  Phone, MapPin, Briefcase, Users, Tag, TrendingUp, 
  Building2, Award, Star, ChevronDown, ChevronUp 
} from 'lucide-react';
import './ProfileResultStyles.css';
import './CrystalEnhancements.css';

const GetContactWidget = ({ phoneNumber }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    roles: true,
    locations: true,
    businesses: true,
    contacts: true,
    tags: false
  });

  useEffect(() => {
    if (phoneNumber) {
      fetchGetContactData();
    }
  }, [phoneNumber]);

  const fetchGetContactData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/indonesia-phone-lookup?phone=${phoneNumber}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="glass-card p-6 fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-container icon-container-blue">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-cyan-300">GetContact 数据</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="crystal-loader"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-container icon-container-red">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-red-400">GetContact 数据</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { parsed, summary, gc_pic, primary, whatsapp_business, total_tags } = data;

  return (
    <div className="space-y-6 fade-in-up" style={{ animationDelay: '0.2s' }}>
      {/* Header Card */}
      <div className="glass-card p-6 hover-lift">
        <div className="flex items-start gap-4">
          {gc_pic && (
            <div className="premium-avatar" style={{ width: '80px', height: '80px' }}>
              <img src={gc_pic} alt="Profile" className="w-full h-full object-cover" />
              <div className="status-badge status-online"></div>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold gradient-text">
                {parsed?.primary_identity || primary || 'Unknown'}
              </h3>
              {whatsapp_business && (
                <span className="premium-badge badge-success text-xs">
                  <Award className="w-3 h-3" /> Business
                </span>
              )}
            </div>
            
            {parsed?.alternative_names && parsed.alternative_names.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {parsed.alternative_names.slice(0, 3).map((name, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-lg" style={{
                    background: 'rgba(0, 213, 213, 0.1)',
                    border: '1px solid rgba(0, 213, 213, 0.2)',
                    color: '#67e8f9'
                  }}>
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Tag className="w-4 h-4" />
              <span>{total_tags || 0} 个标签</span>
              {parsed && (
                <span className="text-cyan-400">• {parsed.total_mentions} 次提及</span>
              )}
            </div>
          </div>
        </div>

        {summary && (
          <div className="mt-4 p-3 rounded-lg" style={{
            background: 'rgba(0, 213, 213, 0.05)',
            border: '1px solid rgba(0, 213, 213, 0.15)'
          }}>
            <p className="text-sm text-gray-300 leading-relaxed">
              {summary}
            </p>
          </div>
        )}
      </div>

      {/* Roles */}
      {parsed?.roles && parsed.roles.length > 0 && (
        <div className="glass-card p-6 hover-lift">
          <button
            onClick={() => toggleSection('roles')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-purple">
                <Briefcase className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-cyan-300">角色分析</h4>
            </div>
            {expandedSections.roles ? 
              <ChevronUp className="w-5 h-5 text-cyan-400" /> : 
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            }
          </button>

          {expandedSections.roles && (
            <div className="space-y-3">
              {parsed.roles.map((role, idx) => (
                <div key={idx} className="info-card-premium p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-cyan-300">{role.role}</span>
                    <span className="text-sm px-3 py-1 rounded-full" style={{
                      background: `rgba(0, 230, 115, ${role.confidence / 200})`,
                      color: '#6ee7b7'
                    }}>
                      {role.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>{role.mentions} 次提及</span>
                  </div>
                  <div className="progress-bar mt-2">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${role.confidence}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Locations */}
      {parsed?.locations && parsed.locations.length > 0 && (
        <div className="glass-card p-6 hover-lift">
          <button
            onClick={() => toggleSection('locations')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-green">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-cyan-300">位置信息</h4>
            </div>
            {expandedSections.locations ? 
              <ChevronUp className="w-5 h-5 text-cyan-400" /> : 
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            }
          </button>

          {expandedSections.locations && (
            <div className="space-y-2">
              {parsed.locations.map((location, idx) => (
                <div key={idx} className="info-card-premium p-3 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{location}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Businesses */}
      {parsed?.businesses && parsed.businesses.length > 0 && (
        <div className="glass-card p-6 hover-lift">
          <button
            onClick={() => toggleSection('businesses')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-blue">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-cyan-300">业务信息</h4>
            </div>
            {expandedSections.businesses ? 
              <ChevronUp className="w-5 h-5 text-cyan-400" /> : 
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            }
          </button>

          {expandedSections.businesses && (
            <div className="space-y-3">
              {parsed.businesses.map((business, idx) => (
                <div key={idx} className="info-card-premium p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-bold text-cyan-300 mb-1">{business.name}</h5>
                      <span className="text-xs px-2 py-1 rounded-lg" style={{
                        background: 'rgba(0, 230, 115, 0.15)',
                        border: '1px solid rgba(0, 230, 115, 0.3)',
                        color: '#6ee7b7'
                      }}>
                        {business.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold gradient-text">{business.mentions}</div>
                      <div className="text-xs text-gray-400">提及次数</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Contacts */}
      {parsed?.key_contacts && parsed.key_contacts.length > 0 && (
        <div className="glass-card p-6 hover-lift">
          <button
            onClick={() => toggleSection('contacts')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-purple">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-cyan-300">关键联系人</h4>
            </div>
            {expandedSections.contacts ? 
              <ChevronUp className="w-5 h-5 text-cyan-400" /> : 
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            }
          </button>

          {expandedSections.contacts && (
            <div className="space-y-2">
              {parsed.key_contacts.slice(0, 5).map((contact, idx) => (
                <div key={idx} className="social-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-cyan-300 text-sm mb-1">
                        {contact.name}
                      </div>
                      <div className="text-xs text-gray-400">{contact.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-cyan-400">{contact.mentions}</div>
                      <div className="text-xs text-gray-500">次</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grouped Tags */}
      {parsed?.grouped_tags && (
        <div className="glass-card p-6 hover-lift">
          <button
            onClick={() => toggleSection('tags')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-blue">
                <Tag className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-cyan-300">标签分组</h4>
              <span className="text-xs text-gray-400">
                ({parsed.total_unique_tags} 个)
              </span>
            </div>
            {expandedSections.tags ? 
              <ChevronUp className="w-5 h-5 text-cyan-400" /> : 
              <ChevronDown className="w-5 h-5 text-cyan-400" />
            }
          </button>

          {expandedSections.tags && (
            <div className="space-y-4">
              {Object.entries(parsed.grouped_tags).map(([category, tags]) => (
                <div key={category}>
                  <div className="text-sm font-semibold text-cyan-400 mb-2 capitalize">
                    {category.replace('_', ' ')} ({tags.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 10).map((tag, idx) => (
                      <span 
                        key={idx}
                        className="premium-badge badge-info text-xs"
                      >
                        {tag.value} <span className="opacity-60">({tag.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GetContactWidget;
