"""AI API client for Kimi and MiniMax."""

import json
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings


class AIClient:
    """AI API client supporting Kimi and MiniMax providers."""

    def __init__(self, provider: str = "kimi"):
        """
        Initialize AI client.

        Args:
            provider: Either "kimi" or "minimax"
        """
        self.provider = provider
        if provider == "kimi":
            self.api_key = settings.KIMI_API_KEY
            self.base_url = settings.KIMI_BASE_URL
            self.model = settings.AI_MODEL or "moonshot-v1-8k"
        else:
            self.api_key = settings.MINIMAX_API_KEY
            self.base_url = settings.MINIMAX_BASE_URL
            self.model = "abab6-chat"

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """
        Send chat request to AI API.

        Args:
            messages: List of message dictionaries with role and content
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text response

        Raises:
            httpx.HTTPStatusError: If API returns error status
        """
        if not self.api_key:
            raise ValueError(f"{self.provider.upper()}_API_KEY is not set")

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]

    async def classify(
        self,
        feedback_text: str,
        categories: List[str],
    ) -> Dict[str, Any]:
        """
        Classify feedback text into categories.

        Args:
            feedback_text: The feedback content to classify
            categories: List of available categories

        Returns:
            Classification result with type, sentiment, and keywords
        """
        categories_str = "\n".join([f"- {cat}" for cat in categories])

        prompt = f"""你是一个专业的乘客反馈分类助手。请分析以下反馈内容，进行分类。

## 反馈内容
{feedback_text}

## 分类要求
1. 从以下一级分类中选择最匹配的（最多3个）：
{categories_str}

2. 判断情感倾向：正面/中性/负面

3. 提取3-5个关键词标签

## 输出格式（JSON）
{{
  "feedback_type": ["一级分类1", "一级分类2"],
  "sentiment": "正面/中性/负面",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}}"""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        # Parse JSON response
        try:
            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            # Fallback if response is not valid JSON
            return {
                "feedback_type": [],
                "sentiment": "neutral",
                "keywords": [],
            }

    async def summarize(
        self,
        feedback_samples: List[str],
        stats: Dict[str, Any],
        length: str = "medium",
    ) -> str:
        """
        Generate summary from feedback samples.

        Args:
            feedback_samples: List of feedback texts
            stats: Statistics dictionary with total_count, avg_rating, etc.
            length: Summary length - short, medium, or long

        Returns:
            Generated summary text
        """
        length_map = {"short": "50", "medium": "100", "long": "200"}

        feedback_text = "\n".join([f"- {fb}" for fb in feedback_samples[:20]])

        prompt = f"""你是一个专业的乘客反馈分析助手。请分析以下反馈数据，生成简洁的摘要。

## 反馈数据统计
- 总反馈数：{stats.get('total_count', 0)} 条
- 平均评分：{stats.get('avg_rating', 0)} 分
- 好评率：{stats.get('positive_rate', 0) * 100}%
- 差评率：{stats.get('negative_rate', 0) * 100}%

## 反馈内容示例
{feedback_text}

## 摘要要求
1. 总结整体满意度情况
2. 指出主要反馈类型分布
3. 提炼正面和负面反馈的主要特点
4. 控制在{length_map.get(length, '100')}字以内

## 输出格式
请直接输出摘要文本，不需要JSON格式。"""

        return await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

    async def generate_suggestions(
        self,
        type_distribution: List[Dict[str, Any]],
        negative_feedbacks: List[str],
        stats: Dict[str, Any],
        top_n: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Generate product improvement suggestions.

        Args:
            type_distribution: Distribution of feedback types
            negative_feedbacks: List of negative feedback texts
            stats: Statistics dictionary
            top_n: Number of top suggestions to generate

        Returns:
            List of suggestion dictionaries
        """
        type_text = "\n".join(
            [
                f"- {t['type']}: {t['count']}条 (占比{t['percentage'] * 100}%)"
                for t in type_distribution
            ]
        )
        negative_text = "\n".join([f"- {fb}" for fb in negative_feedbacks[:10]])

        prompt = f"""你是一个专业的自动驾驶产品分析师。请基于以下反馈数据，生成产品优化建议。

## 数据统计
总反馈数：{stats.get('total_count', 0)} 条

## 问题分类统计
{type_text}

## 差评详情（评分≤2）
{negative_text}

## 建议要求
1. 识别问题最严重的Top{top_n}个分类
2. 分析每个问题的严重程度（相关数量+差评率）
3. 引用真实的用户原声
4. 给出具体可落地的优化建议

## 输出格式（JSON数组）
[
  {{
    "priority": "high/medium/low",
    "category": "问题分类",
    "problem": "具体问题",
    "count": 数量,
    "percentage": 占比,
    "negative_rate": 差评率,
    "user_voices": ["用户原声1", "用户原声2"],
    "suggestions": ["建议1", "建议2"]
  }}
]"""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return []


# Singleton instances
_kimi_client: Optional[AIClient] = None
_minimax_client: Optional[AIClient] = None


def get_kimi_client() -> AIClient:
    """Get singleton Kimi client instance."""
    global _kimi_client
    if _kimi_client is None:
        _kimi_client = AIClient(provider="kimi")
    return _kimi_client


def get_minimax_client() -> AIClient:
    """Get singleton MiniMax client instance."""
    global _minimax_client
    if _minimax_client is None:
        _minimax_client = AIClient(provider="minimax")
    return _minimax_client
