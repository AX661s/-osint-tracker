# -*- coding: utf-8 -*-
"""
数据去重和清理工具模块
用于处理简历内容的去重、大小写标准化、变体识别
"""

import re
from typing import List, Dict, Set, Tuple, Any
from difflib import SequenceMatcher
import unicodedata

class DataDeduplicator:
    """数据去重处理类"""
    
    def __init__(self, similarity_threshold: float = 0.85):
        """
        初始化去重器
        
        Args:
            similarity_threshold: 相似度阈值 (0-1)，越高越严格
        """
        self.similarity_threshold = similarity_threshold
        self.seen = set()
        
    @staticmethod
    def normalize_case(text: str) -> str:
        """
        智能大小写标准化
        - 全大写 -> 首字母大写
        - 全小写 -> 保持
        - 混合大小写 -> 保持
        - 特殊处理: Email, URL 等保持原样
        
        Args:
            text: 输入文本
            
        Returns:
            标准化后的文本
        """
        if not text:
            return text
            
        # 如果是 Email
        if '@' in text:
            return text.lower()  # Email 统一小写
            
        # 如果是 URL
        if text.startswith('http://') or text.startswith('https://'):
            return text.lower()  # URL 统一小写
            
        # 如果是全大写（且长度 > 1）
        if text.isupper() and len(text) > 1:
            return text.capitalize()  # 转为首字母大写
            
        # 其他情况保持原样
        return text
    
    @staticmethod
    def remove_accents(text: str) -> str:
        """
        移除重音符号 (e.g., é -> e, ñ -> n)
        
        Args:
            text: 输入文本
            
        Returns:
            移除重音后的文本
        """
        return ''.join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )
    
    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """
        标准化空白字符
        - 多个空格 -> 单个空格
        - 制表符 -> 空格
        - 换行符 -> 空格
        
        Args:
            text: 输入文本
            
        Returns:
            标准化后的文本
        """
        # 替换所有空白符为空格
        text = re.sub(r'\s+', ' ', text)
        # 移除首尾空格
        return text.strip()
    
    @staticmethod
    def normalize_punctuation(text: str) -> str:
        """
        标准化标点符号
        - 中文标点 -> 英文标点
        - 多个标点 -> 单个标点
        
        Args:
            text: 输入文本
            
        Returns:
            标准化后的文本
        """
        # 中文标点转英文
        replacements = {
            '，': ',',
            '。': '.',
            '！': '!',
            '？': '?',
            '；': ';',
            '：': ':',
            '"': '"',
            '"': '"',
            ''': "'",
            ''': "'",
            '（': '(',
            '）': ')',
            '【': '[',
            '】': ']',
            '《': '<',
            '》': '>',
            '、': ',',
        }
        
        for cn, en in replacements.items():
            text = text.replace(cn, en)
            
        return text
    
    def normalize_text(self, text: str) -> str:
        """
        全面文本标准化
        
        Args:
            text: 输入文本
            
        Returns:
            标准化后的文本
        """
        if not text:
            return text
            
        # 1. 标准化标点
        text = self.normalize_punctuation(text)
        
        # 2. 移除重音
        text = self.remove_accents(text)
        
        # 3. 标准化大小写
        parts = text.split()
        parts = [self.normalize_case(part) if not self._is_special(part) else part 
                 for part in parts]
        text = ' '.join(parts)
        
        # 4. 标准化空白
        text = self.normalize_whitespace(text)
        
        return text
    
    @staticmethod
    def _is_special(text: str) -> bool:
        """检查是否是特殊格式（Email、URL 等）"""
        return '@' in text or text.startswith('http')
    
    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        """
        计算两个文本的相似度 (0-1)
        
        Args:
            text1: 文本 1
            text2: 文本 2
            
        Returns:
            相似度分数
        """
        # 标准化文本用于比较
        t1 = text1.lower().strip()
        t2 = text2.lower().strip()
        
        # 如果相同返回 1.0
        if t1 == t2:
            return 1.0
            
        # 使用 SequenceMatcher 计算相似度
        matcher = SequenceMatcher(None, t1, t2)
        return matcher.ratio()
    
    def is_duplicate(self, text: str, existing_texts: List[str]) -> Tuple[bool, str]:
        """
        检查文本是否是已存在文本的重复
        
        Args:
            text: 要检查的文本
            existing_texts: 已存在的文本列表
            
        Returns:
            (是否重复, 匹配的原始文本)
        """
        normalized = self.normalize_text(text)
        
        for existing in existing_texts:
            normalized_existing = self.normalize_text(existing)
            
            # 完全相同
            if normalized == normalized_existing:
                return True, existing
                
            # 相似度超过阈值
            if self.calculate_similarity(normalized, normalized_existing) >= self.similarity_threshold:
                return True, existing
                
        return False, ""
    
    def deduplicate_list(self, items: List[str]) -> List[str]:
        """
        对列表进行去重
        
        Args:
            items: 字符串列表
            
        Returns:
            去重后的列表
        """
        result = []
        
        for item in items:
            if not item:
                continue
                
            is_dup, _ = self.is_duplicate(item, result)
            
            if not is_dup:
                result.append(item)
                
        return result
    
    def deduplicate_dict_list(self, items: List[Dict[str, Any]], 
                             key_field: str = 'name') -> List[Dict[str, Any]]:
        """
        对字典列表进行去重 (基于特定字段)
        
        Args:
            items: 字典列表
            key_field: 用于去重的字段名
            
        Returns:
            去重后的字典列表
        """
        result = []
        seen_keys = []
        
        for item in items:
            if key_field not in item:
                result.append(item)
                continue
                
            value = item[key_field]
            if not value:
                result.append(item)
                continue
                
            is_dup, _ = self.is_duplicate(value, seen_keys)
            
            if not is_dup:
                result.append(item)
                seen_keys.append(value)
                
        return result


class ResumeDataCleaner:
    """简历数据清理器"""
    
    def __init__(self):
        self.deduplicator = DataDeduplicator(similarity_threshold=0.85)
    
    def clean_name(self, name: str) -> str:
        """清理名字"""
        if not name:
            return ""
        
        # 移除前后空格
        name = name.strip()
        
        # 移除重复空格
        name = re.sub(r'\s+', ' ', name)
        
        # 标准化大小写
        name = self.deduplicator.normalize_case(name)
        
        # 移除特殊字符
        name = re.sub(r'[^a-zA-Z0-9\s\-\.]', '', name)
        
        return name
    
    def clean_email(self, email: str) -> str:
        """清理邮箱"""
        if not email:
            return ""
        
        email = email.strip().lower()
        
        # 验证邮箱格式
        if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return email
        
        return ""
    
    def clean_phone(self, phone: str) -> str:
        """清理电话"""
        if not phone:
            return ""
        
        phone = phone.strip()
        
        # 移除所有非数字和 + 字符
        phone = re.sub(r'[^\d+]', '', phone)
        
        # 验证长度
        if len(re.sub(r'\D', '', phone)) < 7:
            return ""
        
        return phone
    
    def clean_company(self, company: str) -> str:
        """清理公司名称"""
        if not company:
            return ""
        
        company = company.strip()
        
        # 标准化空格
        company = re.sub(r'\s+', ' ', company)
        
        # 标准化标点
        company = self.deduplicator.normalize_punctuation(company)
        
        # 标准化大小写
        parts = company.split()
        parts = [self.deduplicator.normalize_case(part) for part in parts]
        company = ' '.join(parts)
        
        return company
    
    def clean_title(self, title: str) -> str:
        """清理职位"""
        if not title:
            return ""
        
        title = title.strip()
        
        # 标准化空格
        title = re.sub(r'\s+', ' ', title)
        
        # 标准化标点
        title = self.deduplicator.normalize_punctuation(title)
        
        # Title case (每个单词首字母大写)
        title = title.title()
        
        return title
    
    def clean_resume(self, resume: Dict[str, Any]) -> Dict[str, Any]:
        """
        清理整个简历对象
        
        Args:
            resume: 简历字典
            
        Returns:
            清理后的简历
        """
        cleaned = {}
        
        # 清理名字
        if 'name' in resume:
            cleaned['name'] = self.clean_name(resume['name'])
        
        # 清理邮箱
        if 'email' in resume:
            cleaned['email'] = self.clean_email(resume['email'])
        
        # 清理电话
        if 'phone' in resume:
            cleaned['phone'] = self.clean_phone(resume['phone'])
        
        # 清理公司
        if 'company' in resume:
            cleaned['company'] = self.clean_company(resume['company'])
        
        # 清理职位
        if 'title' in resume:
            cleaned['title'] = self.clean_title(resume['title'])
        
        # 清理描述
        if 'description' in resume:
            desc = resume['description']
            if desc:
                desc = self.deduplicator.normalize_whitespace(desc)
                desc = self.deduplicator.normalize_punctuation(desc)
                cleaned['description'] = desc
        
        # 其他字段直接复制
        for key in resume:
            if key not in cleaned:
                cleaned[key] = resume[key]
        
        return cleaned
    
    def clean_resumes_list(self, resumes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        清理简历列表（包括去重）
        
        Args:
            resumes: 简历列表
            
        Returns:
            清理并去重后的简历列表
        """
        # 先清理每个简历
        cleaned = [self.clean_resume(r) for r in resumes]
        
        # 再去重
        deduped = self.deduplicator.deduplicate_dict_list(cleaned, key_field='email')
        
        return deduped


# 使用示例和测试
if __name__ == '__main__':
    # 测试数据去重
    dedup = DataDeduplicator(similarity_threshold=0.85)
    
    print("=" * 60)
    print("大小写标准化测试")
    print("=" * 60)
    test_cases = [
        'JOHN DOE',
        'john doe',
        'John Doe',
        'test@example.com',
        'https://example.com',
        'APPLE INC.',
    ]
    
    for case in test_cases:
        print(f"{case:20} -> {dedup.normalize_case(case)}")
    
    print("\n" + "=" * 60)
    print("文本相似度测试")
    print("=" * 60)
    
    similarities = [
        ('John Doe', 'john doe'),
        ('JOHN DOE', 'John Doe'),
        ('Software Engineer', 'Software engineer'),
        ('Senior Developer', 'Senior Software Developer'),
        ('Apple Inc.', 'Apple Inc'),
    ]
    
    for t1, t2 in similarities:
        sim = dedup.calculate_similarity(t1, t2)
        print(f'"{t1}" vs "{t2}": {sim:.2%}')
    
    print("\n" + "=" * 60)
    print("简历清理测试")
    print("=" * 60)
    
    cleaner = ResumeDataCleaner()
    
    test_resume = {
        'name': '  JOHN   DOE  ',
        'email': '  JOHN.DOE@EXAMPLE.COM  ',
        'phone': '+1 (415) 555-2671',
        'company': '  APPLE   INC.  ',
        'title': 'SENIOR software ENGINEER',
        'description': 'Worked at  Apple  as  a  software  engineer  with  multiple  spaces.',
    }
    
    print("原始数据:")
    for key, value in test_resume.items():
        print(f"  {key:15}: {repr(value)}")
    
    cleaned = cleaner.clean_resume(test_resume)
    
    print("\n清理后数据:")
    for key, value in cleaned.items():
        print(f"  {key:15}: {repr(value)}")
    
    print("\n" + "=" * 60)
    print("简历列表去重测试")
    print("=" * 60)
    
    resumes = [
        {'name': 'John Doe', 'email': 'john.doe@example.com', 'company': 'Apple Inc'},
        {'name': 'JOHN DOE', 'email': 'JOHN.DOE@EXAMPLE.COM', 'company': 'APPLE INC.'},
        {'name': 'Jane Smith', 'email': 'jane.smith@example.com', 'company': 'Google'},
        {'name': 'jane smith', 'email': 'JANE.SMITH@EXAMPLE.COM', 'company': 'google'},
    ]
    
    print(f"原始数量: {len(resumes)}")
    for i, r in enumerate(resumes, 1):
        print(f"  {i}. {r['name']} ({r['email']})")
    
    deduped = cleaner.clean_resumes_list(resumes)
    
    print(f"\n去重后数量: {len(deduped)}")
    for i, r in enumerate(deduped, 1):
        print(f"  {i}. {r['name']} ({r['email']})")
