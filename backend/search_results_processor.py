# -*- coding: utf-8 -*-
"""
搜索结果集成去重模块
将去重功能集成到 OSINT 搜索结果处理中
"""

from typing import List, Dict, Any, Optional
from data_deduplicator import ResumeDataCleaner, DataDeduplicator


class SearchResultsProcessor:
    """搜索结果后处理器 - 进行去重和清理"""
    
    def __init__(self):
        self.cleaner = ResumeDataCleaner()
        self.deduplicator = DataDeduplicator(similarity_threshold=0.85)
    
    def process_email_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理邮箱搜索结果
        
        Args:
            results: 搜索结果
            
        Returns:
            处理后的结果
        """
        if 'resumes' in results and isinstance(results['resumes'], list):
            original_count = len(results['resumes'])
            
            # 清理和去重简历
            cleaned = self.cleaner.clean_resumes_list(results['resumes'])
            
            results['resumes'] = cleaned
            results['deduplication_info'] = {
                'original_count': original_count,
                'after_dedup_count': len(cleaned),
                'duplicates_removed': original_count - len(cleaned),
            }
        
        return results
    
    def process_phone_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理电话搜索结果
        
        Args:
            results: 搜索结果
            
        Returns:
            处理后的结果
        """
        if 'contacts' in results and isinstance(results['contacts'], list):
            original_count = len(results['contacts'])
            
            # 清理每个联系人
            cleaned = []
            seen = []
            
            for contact in results['contacts']:
                cleaned_contact = self.cleaner.clean_resume(contact)
                
                # 检查是否重复
                email = cleaned_contact.get('email', '')
                phone = cleaned_contact.get('phone', '')
                
                is_dup = False
                for existing in cleaned:
                    if (email and existing.get('email') == email) or \
                       (phone and existing.get('phone') == phone):
                        is_dup = True
                        break
                
                if not is_dup:
                    cleaned.append(cleaned_contact)
            
            results['contacts'] = cleaned
            results['deduplication_info'] = {
                'original_count': original_count,
                'after_dedup_count': len(cleaned),
                'duplicates_removed': original_count - len(cleaned),
            }
        
        return results
    
    def deduplicate_social_media(self, profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        去重社交媒体账户
        
        Args:
            profiles: 社交媒体账户列表
            
        Returns:
            去重后的列表
        """
        if not profiles:
            return []
        
        result = []
        seen_usernames = []
        
        for profile in profiles:
            username = profile.get('username', '').lower().strip()
            platform = profile.get('platform', '').lower()
            
            # 检查是否已存在相同的用户名和平台组合
            is_dup = False
            for existing in seen_usernames:
                if (existing['username'] == username and 
                    existing['platform'] == platform):
                    is_dup = True
                    break
            
            if not is_dup:
                result.append(profile)
                seen_usernames.append({
                    'username': username,
                    'platform': platform,
                })
        
        return result
    
    def merge_duplicate_profiles(self, profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        合并重复的个人资料（保留完整信息）
        
        Args:
            profiles: 个人资料列表
            
        Returns:
            合并后的列表
        """
        if not profiles:
            return []
        
        # 按邮箱或电话分组
        groups = {}
        
        for profile in profiles:
            email = profile.get('email', '').lower() if profile.get('email') else None
            phone = profile.get('phone', '') if profile.get('phone') else None
            name = profile.get('name', '').lower() if profile.get('name') else None
            
            # 选择分组键
            key = None
            if email:
                key = f"email_{email}"
            elif phone:
                key = f"phone_{phone}"
            elif name:
                key = f"name_{name}"
            else:
                key = f"unique_{id(profile)}"
            
            # 添加到组
            if key not in groups:
                groups[key] = []
            groups[key].append(profile)
        
        # 合并每组
        merged = []
        for group_key, group_profiles in groups.items():
            if len(group_profiles) == 1:
                merged.append(group_profiles[0])
            else:
                # 合并多个资料
                merged_profile = self._merge_profiles(group_profiles)
                merged.append(merged_profile)
        
        return merged
    
    @staticmethod
    def _merge_profiles(profiles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        合并多个资料为一个
        
        Args:
            profiles: 要合并的资料列表
            
        Returns:
            合并后的资料
        """
        result = {}
        
        # 简单合并策略：使用第一个非空值
        # 这里可以根据数据质量或完整性进行更复杂的合并
        
        all_keys = set()
        for profile in profiles:
            all_keys.update(profile.keys())
        
        for key in all_keys:
            # 对于列表字段，合并所有值
            if key in ['social_media', 'companies', 'positions', 'skills']:
                values = []
                for profile in profiles:
                    if key in profile and profile[key]:
                        if isinstance(profile[key], list):
                            values.extend(profile[key])
                        else:
                            values.append(profile[key])
                if values:
                    # 去重列表
                    if isinstance(values[0], dict):
                        result[key] = [dict(t) for t in {
                            tuple(sorted(v.items())) for v in values
                        }]
                    else:
                        result[key] = list(set(values))
            else:
                # 对于字符串字段，使用第一个非空值
                for profile in profiles:
                    if key in profile and profile[key]:
                        result[key] = profile[key]
                        break
        
        return result
    
    def process_comprehensive_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理综合搜索结果
        
        Args:
            results: 搜索结果
            
        Returns:
            处理后的结果
        """
        dedup_summary = {
            'email_resumes_deduped': 0,
            'phone_contacts_deduped': 0,
            'social_media_deduped': 0,
            'duplicate_profiles_merged': 0,
        }
        
        # 处理邮箱简历
        if 'email_results' in results and results['email_results']:
            email_res = self.process_email_results(results['email_results'])
            results['email_results'] = email_res
            if 'deduplication_info' in email_res:
                dedup_summary['email_resumes_deduped'] = email_res['deduplication_info']['duplicates_removed']
        
        # 处理电话联系人
        if 'phone_results' in results and results['phone_results']:
            phone_res = self.process_phone_results(results['phone_results'])
            results['phone_results'] = phone_res
            if 'deduplication_info' in phone_res:
                dedup_summary['phone_contacts_deduped'] = phone_res['deduplication_info']['duplicates_removed']
        
        # 处理社交媒体
        if 'social_media' in results and results['social_media']:
            original = len(results['social_media'])
            results['social_media'] = self.deduplicate_social_media(results['social_media'])
            dedup_summary['social_media_deduped'] = original - len(results['social_media'])
        
        # 处理所有个人资料
        all_profiles = []
        for key in ['email_results', 'phone_results']:
            if key in results and results[key] and 'resumes' in results[key]:
                all_profiles.extend(results[key]['resumes'])
            elif key in results and results[key] and 'contacts' in results[key]:
                all_profiles.extend(results[key]['contacts'])
        
        if all_profiles:
            original = len(all_profiles)
            merged = self.merge_duplicate_profiles(all_profiles)
            dedup_summary['duplicate_profiles_merged'] = original - len(merged)
            results['merged_profiles'] = merged
        
        # 添加去重总结
        results['deduplication_summary'] = dedup_summary
        
        return results


# 使用示例
if __name__ == '__main__':
    processor = SearchResultsProcessor()
    
    # 示例：邮箱搜索结果
    sample_email_results = {
        'resumes': [
            {
                'name': 'JOHN DOE',
                'email': 'john.doe@example.com',
                'company': 'APPLE INC.',
                'title': 'SOFTWARE ENGINEER',
            },
            {
                'name': 'john doe',
                'email': 'JOHN.DOE@EXAMPLE.COM',
                'company': 'Apple Inc',
                'title': 'Software engineer',
            },
            {
                'name': 'Jane Smith',
                'email': 'jane.smith@example.com',
                'company': 'Google',
                'title': 'Product Manager',
            },
        ]
    }
    
    print("=" * 60)
    print("邮箱搜索结果去重示例")
    print("=" * 60)
    
    print(f"\n原始数量: {len(sample_email_results['resumes'])} 条")
    processed = processor.process_email_results(sample_email_results)
    
    print(f"处理后数量: {len(processed['resumes'])} 条")
    print(f"去重信息: {processed.get('deduplication_info', {})}")
    
    print("\n处理后的数据:")
    for i, resume in enumerate(processed['resumes'], 1):
        print(f"  {i}. {resume['name']} - {resume['company']} ({resume['email']})")
    
    # 示例：综合搜索结果
    print("\n" + "=" * 60)
    print("综合搜索结果处理示例")
    print("=" * 60)
    
    sample_comprehensive = {
        'email_results': sample_email_results,
        'phone_results': {
            'contacts': [
                {'name': 'John Doe', 'phone': '+1-415-555-2671', 'email': 'john.doe@example.com'},
                {'name': 'JOHN DOE', 'phone': '(415) 555-2671', 'email': 'JOHN.DOE@EXAMPLE.COM'},
            ]
        },
        'social_media': [
            {'platform': 'Twitter', 'username': 'johndoe'},
            {'platform': 'TWITTER', 'username': 'johndoe'},
            {'platform': 'LinkedIn', 'username': 'johndoe'},
        ]
    }
    
    processed_comp = processor.process_comprehensive_results(sample_comprehensive)
    
    print("\n去重总结:")
    for key, value in processed_comp['deduplication_summary'].items():
        print(f"  {key}: {value}")
