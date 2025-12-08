"""
智能标签解析器 - Smart Tag Parser
用于解析和分类印尼电话号码查询返回的标签数据
"""
from typing import List, Dict, Any, Set
from collections import defaultdict
import re
from difflib import SequenceMatcher


class SmartTagParser:
    """智能标签解析器"""
    
    def __init__(self):
        # 职业/角色关键词
        self.role_keywords = {
            'developer': ['dev', 'developer', 'pengembang'],
            'marketing': ['marketing', 'pemasaran', 'agen', 'agent'],
            'owner': ['owner', 'pemilik', 'puang'],
            'customer': ['ctmr', 'customer', 'cust', 'pelanggan', 'nasabah'],
            'family': ['wali', 'ayah', 'bunda', 'suami', 'istri', 'pak', 'ibu'],
            'business': ['orchid', 'residence', 'perumahan', 'properti', 'property']
        }
        
        # 位置关键词
        self.location_keywords = ['parepare', 'pare', 'sulsel', 'makassar', 'makasar', 'sulawesi']
        
        # 公司/业务关键词
        self.business_keywords = ['orchid', 'residence', 'perumahan', 'syariah', 'muslim']
    
    def parse_tags(self, tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        解析标签列表，提取结构化信息
        
        Args:
            tags: 标签列表，每个标签包含 value 和 count
            
        Returns:
            结构化的解析结果
        """
        # 提取所有标签文本
        tag_texts = [tag['value'].lower() for tag in tags]
        
        # 1. 识别主要姓名
        primary_names = self._extract_names(tags)
        
        # 2. 识别职业/角色
        roles = self._extract_roles(tag_texts)
        
        # 3. 识别位置
        locations = self._extract_locations(tag_texts)
        
        # 4. 识别业务/公司
        businesses = self._extract_businesses(tag_texts)
        
        # 5. 去重和分组相似标签
        grouped_tags = self._group_similar_tags(tags)
        
        # 6. 提取关键联系人
        contacts = self._extract_contacts(tags)
        
        return {
            'primary_identity': primary_names[0] if primary_names else 'Unknown',
            'alternative_names': primary_names[1:5] if len(primary_names) > 1 else [],
            'roles': roles,
            'locations': locations,
            'businesses': businesses,
            'grouped_tags': grouped_tags,
            'key_contacts': contacts,
            'total_unique_tags': len(set(tag_texts)),
            'total_mentions': sum(tag['count'] for tag in tags)
        }
    
    def _extract_names(self, tags: List[Dict[str, Any]]) -> List[str]:
        """提取主要姓名（按出现频率排序）"""
        name_counts = defaultdict(int)
        
        for tag in tags:
            value = tag['value']
            count = tag['count']
            
            # 提取包含人名的标签
            if any(keyword in value.lower() for keyword in ['rahman', 'abdul', 'pak', 'bang', 'kak']):
                # 清理标签，移除业务词汇
                cleaned = re.sub(r'\b(orchid|residence|perumahan|dev|ctmr|wr|mr)\b', '', value, flags=re.IGNORECASE)
                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                
                if cleaned and len(cleaned) > 2:
                    name_counts[cleaned] += count
        
        # 按频率排序
        sorted_names = sorted(name_counts.items(), key=lambda x: x[1], reverse=True)
        return [name for name, _ in sorted_names[:10]]
    
    def _extract_roles(self, tag_texts: List[str]) -> List[Dict[str, Any]]:
        """识别职业/角色"""
        roles = []
        role_evidence = defaultdict(int)
        
        for text in tag_texts:
            for role_type, keywords in self.role_keywords.items():
                if any(keyword in text for keyword in keywords):
                    role_evidence[role_type] += 1
        
        # 转换为结果列表
        for role_type, count in sorted(role_evidence.items(), key=lambda x: x[1], reverse=True):
            roles.append({
                'role': role_type.title(),
                'confidence': min(100, count * 5),  # 转换为百分比置信度
                'mentions': count
            })
        
        return roles[:5]  # 返回前5个角色
    
    def _extract_locations(self, tag_texts: List[str]) -> List[str]:
        """识别位置信息"""
        locations = set()
        
        for text in tag_texts:
            for loc in self.location_keywords:
                if loc in text:
                    # 提取更完整的位置信息
                    if 'parepare' in text or 'pare' in text:
                        locations.add('Parepare, Sulawesi Selatan')
                    elif 'makassar' in text or 'makasar' in text:
                        locations.add('Makassar, Sulawesi Selatan')
                    elif 'sulsel' in text or 'sulawesi' in text:
                        locations.add('Sulawesi Selatan')
        
        return list(locations)
    
    def _extract_businesses(self, tag_texts: List[str]) -> List[Dict[str, str]]:
        """识别业务/公司信息"""
        businesses = []
        business_mentions = defaultdict(int)
        
        for text in tag_texts:
            if 'orchid' in text:
                business_mentions['Orchid Residence'] += 1
            if 'perumahan' in text and 'syariah' in text:
                business_mentions['Perumahan Syariah'] += 1
            if 'properti' in text or 'property' in text:
                business_mentions['Property Business'] += 1
        
        for business, count in sorted(business_mentions.items(), key=lambda x: x[1], reverse=True):
            businesses.append({
                'name': business,
                'mentions': count,
                'type': 'Real Estate' if 'residence' in business.lower() or 'perumahan' in business.lower() else 'Business'
            })
        
        return businesses
    
    def _group_similar_tags(self, tags: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """将相似的标签分组"""
        groups = {
            'names': [],
            'business_titles': [],
            'locations': [],
            'family_relations': [],
            'customer_relations': [],
            'other': []
        }
        
        for tag in tags[:50]:  # 只处理前50个标签
            value = tag['value'].lower()
            
            # 分类
            if any(word in value for word in ['pak', 'bang', 'kak', 'wali', 'ayah', 'ibu', 'bunda']):
                groups['family_relations'].append(tag)
            elif any(word in value for word in ['ctmr', 'customer', 'cust', 'nasabah']):
                groups['customer_relations'].append(tag)
            elif any(word in value for word in ['dev', 'developer', 'owner', 'marketing']):
                groups['business_titles'].append(tag)
            elif any(word in value for word in self.location_keywords):
                groups['locations'].append(tag)
            elif any(word in value for word in ['rahman', 'abdul', 'najamuddin']):
                groups['names'].append(tag)
            else:
                groups['other'].append(tag)
        
        # 移除空组
        return {k: v for k, v in groups.items() if v}
    
    def _extract_contacts(self, tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """提取关键联系人信息"""
        contacts = []
        seen = set()
        
        for tag in tags[:30]:  # 前30个标签
            value = tag['value']
            count = tag['count']
            
            # 查找包含职业信息的联系人
            if any(word in value.lower() for word in ['dev', 'marketing', 'owner', 'pak', 'bang']):
                # 简化名称
                simplified = re.sub(r'\(.*?\)', '', value)  # 移除括号内容
                simplified = re.sub(r'\b(ctmr|wr|mr|comr)\b', '', simplified, flags=re.IGNORECASE)
                simplified = re.sub(r'\s+', ' ', simplified).strip()
                
                if simplified not in seen and len(simplified) > 5:
                    seen.add(simplified)
                    
                    # 确定角色
                    role = 'Contact'
                    if 'dev' in value.lower():
                        role = 'Developer'
                    elif 'marketing' in value.lower():
                        role = 'Marketing'
                    elif 'owner' in value.lower():
                        role = 'Owner'
                    elif any(word in value.lower() for word in ['pak', 'bang', 'kak']):
                        role = 'Personal Contact'
                    
                    contacts.append({
                        'name': simplified,
                        'role': role,
                        'mentions': count
                    })
        
        return contacts[:10]  # 返回前10个关键联系人
    
    def similarity(self, a: str, b: str) -> float:
        """计算两个字符串的相似度"""
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()


# 创建全局解析器实例
parser = SmartTagParser()


def parse_indonesia_tags(tags: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    解析印尼标签的主函数
    
    Args:
        tags: 标签列表
        
    Returns:
        解析后的结构化数据
    """
    return parser.parse_tags(tags)
