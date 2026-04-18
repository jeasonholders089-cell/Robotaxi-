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
            self.use_anthropic = False
        else:
            self.api_key = settings.MINIMAX_API_KEY
            self.base_url = settings.MINIMAX_BASE_URL
            self.model = "MiniMax-M2.7"
            self.use_anthropic = True

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

        if self.use_anthropic:
            return await self._chat_anthropic(messages, max_tokens)
        else:
            return await self._chat_openai(messages, temperature, max_tokens)

    async def _chat_openai(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Use OpenAI-compatible API (Kimi)."""
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

    async def _chat_anthropic(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int,
    ) -> str:
        """Use Anthropic-compatible API (MiniMax)."""
        import sys
        print(f"DEBUG _chat_anthropic: base_url={self.base_url}, api_key set={bool(self.api_key)}, max_tokens={max_tokens}", file=sys.stderr)
        # Extract system message if present
        system_content = None
        anthropic_messages = []
        for msg in messages:
            role = msg["role"]
            if role == "system":
                system_content = msg["content"]
            else:
                anthropic_messages.append({
                    "role": role,
                    "content": msg["content"]
                })

        request_body = {
            "model": self.model,
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
        }
        if system_content:
            request_body["system"] = system_content
            print(f"DEBUG _chat_anthropic: system message present, length={len(system_content)}", file=sys.stderr)

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT) as client:
            print(f"DEBUG _chat_anthropic: making request to {self.base_url}/messages", file=sys.stderr)
            response = await client.post(
                f"{self.base_url}/messages",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01"
                },
                json=request_body,
            )
            print(f"DEBUG _chat_anthropic: response status={response.status_code}", file=sys.stderr)
            response.raise_for_status()
            result = response.json()

            # Extract text from content blocks
            content = result.get("content", [])
            print(f"DEBUG _chat_anthropic: content blocks={len(content)}", file=sys.stderr)
            for item in content:
                if item.get("type") == "text":
                    text = item.get("text", "")
                    print(f"DEBUG _chat_anthropic: found text, length={len(text)}", file=sys.stderr)
                    sys.stderr.flush()
                    return text

            # If no text found, return empty
            print(f"DEBUG _chat_anthropic: no text found in response", file=sys.stderr)
            sys.stderr.flush()
            return ""

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
            # Remove markdown code fences if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                # Remove ```json or ``` at the start
                lines = cleaned.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return []

    # ===== v1.5 Analysis Pipeline Prompts =====

    async def summarize_v2(
        self,
        feedback_texts: List[str],
        stats: Dict[str, Any],
    ) -> str:
        """
        Generate summary from feedback data (v1.5 pipeline).

        Args:
            feedback_texts: List of complete feedback texts
            stats: Statistics dictionary with total_count, avg_rating, positive_rate, negative_rate

        Returns:
            Generated summary text (within 150 characters)
        """
        # Prepare feedback text content
        texts_str = "\n".join([f"- {text}" for text in feedback_texts[:50]])

        prompt = f"""你是一个专业的Robotaxi乘客反馈分析师。请分析以下反馈数据，生成详尽的摘要报告。

## 数据统计
- 总反馈数：{stats.get('total_count', 0)} 条
- 平均评分：{stats.get('avg_rating', 0)} 分（满分5分）
- 好评率：{stats.get('positive_rate', 0) * 100}%（评分4-5分）
- 差评率：{stats.get('negative_rate', 0) * 100}%（评分1-2分）

## 反馈内容
{texts_str}

## 输出格式（严格按以下结构输出，不要使用markdown符号，不要使用#号或---分隔符）

整体满意度：【一句话总结整体满意度情况，包含评分和差评率数据】

正面体验：
- 【正面体验点1】
- 【正面体验点2】（如有）

突出不满：
- 【不满点1】（需包含具体问题描述和涉及条数）
- 【不满点2】（如有）

核心建议：【一句话优先级最高的改进建议】"""

        try:
            result = await self.chat(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000,
            )
            # If result is empty, generate a fallback summary
            if not result or not result.strip():
                pos_rate = stats.get('positive_rate', 0) * 100
                neg_rate = stats.get('negative_rate', 0) * 100
                avg_rating = stats.get('avg_rating', 0)
                return (
                    f"整体满意度：【基于{stats.get('total_count', 0)}条数据分析】平均评分{avg_rating}分，"
                    f"好评率{pos_rate:.0f}%，差评率{neg_rate:.0f}%。"
                )
            return result
        except Exception as e:
            import sys
            print(f"summarize_v2 error: {e}", file=sys.stderr)
            # Fallback summary
            pos_rate = stats.get('positive_rate', 0) * 100
            neg_rate = stats.get('negative_rate', 0) * 100
            avg_rating = stats.get('avg_rating', 0)
            return (
                f"整体满意度：【基于{stats.get('total_count', 0)}条数据分析】平均评分{avg_rating}分，"
                f"好评率{pos_rate:.0f}%，差评率{neg_rate:.0f}%。"
            )

    async def analyze_problems(
        self,
        feedback_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analyze product problems from feedback data (v1.5 pipeline).

        Args:
            feedback_data: List of feedback dicts sorted by rating ascending (low ratings first)

        Returns:
            Dict with categories and top_problems
        """
        # Format feedback data for the prompt
        feedback_lines = []
        for fb in feedback_data[:100]:  # Limit to 100 for prompt size
            rating = fb.get("rating", 0)
            text = fb.get("feedback_text", "")
            feedback_lines.append(f"[{rating}分] {text}")

        feedback_str = "\n".join(feedback_lines)

        prompt = f"""你是一个专业的自动驾驶产品分析师。请从以下乘客反馈中识别和分类产品问题。

## 已有分类参考
- 行驶体验：与车辆行驶、加速、刹车、变道等相关
- 车内环境：车内温度、噪音、清洁度、座椅舒适度等
- 接驾体验：等待时间、司机响应、上下车便捷性等
- 路线规划：导航准确性、路线选择、拥堵情况等
- 安全感受：安全带提醒、紧急情况处理、风险预警等
- 服务态度：客服响应、问题解决效率、沟通体验等
- 其他：不属于以上分类的问题

## 反馈数据（按评分排序，低分优先）
{feedback_str}

## 分析要求
1. 将每条反馈归类到上述已有分类（可多选）
2. 识别是否有新的问题模式未覆盖已有分类，如有请命名新分类
3. 统计每个分类的：反馈数量、占比、差评率
4. 按严重程度排序（严重程度 = 差评数量 × 差评率）

## 输出格式（JSON）
{{
  "categories": [
    {{
      "name": "行驶体验",
      "is_existing": true,
      "count": 45,
      "percentage": 0.15,
      "negative_rate": 0.42,
      "common_issues": ["变道过于频繁", "刹车过于急躁"],
      "user_quotes": ["变道太频繁了，坐着不舒服", "刹车太急"]
    }},
    {{
      "name": "新发现问题：导航播报",
      "is_existing": false,
      "count": 12,
      "percentage": 0.04,
      "negative_rate": 0.67,
      "description": "导航语音播报过早或过晚，导致错过路口",
      "user_quotes": ["导航说左转但已经过了", "播报太晚来不及变道"]
    }}
  ],
  "top_problems": [
    {{"category": "行驶体验", "severity_score": 18.9, "problem": "变道过于频繁"}}
  ]
}}"""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=8000,
        )

        try:
            # Remove markdown code fences if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
            # Unescape escaped newlines and quotes (MiniMax API returns escaped versions)
            cleaned = cleaned.replace("\\n", "\n").replace("\\\"", "\"")
            import sys
            print(f"DEBUG analyze_problems raw response length: {len(response)}", file=sys.stderr)
            print(f"DEBUG analyze_problems cleaned length: {len(cleaned)}", file=sys.stderr)
            print(f"DEBUG analyze_problems cleaned first 200: {cleaned[:200]}", file=sys.stderr)
            sys.stderr.flush()
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            import sys
            print(f"DEBUG analyze_problems JSON parse error: {e}, response: {response[:500]}", file=sys.stderr)
            sys.stderr.flush()
            return {"categories": [], "top_problems": []}

    async def generate_suggestions_v2(
        self,
        problem_categories: List[Dict[str, Any]],
        negative_feedbacks: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Generate optimization suggestions (v1.5 pipeline).

        Args:
            problem_categories: List of problem category dicts from analyze_problems
            negative_feedbacks: List of negative feedback texts

        Returns:
            List of suggestion dictionaries
        """
        # Format problem categories
        categories_str = json.dumps(problem_categories, ensure_ascii=False, indent=2)

        # Format negative feedbacks
        negatives_str = "\n".join([f"- {fb}" for fb in negative_feedbacks[:30]])

        prompt = f"""你是一个自动驾驶产品专家。请基于以下问题分析，生成可落地的产品优化建议。

## 问题分类详情
{categories_str}

## 差评原声摘录
{negatives_str}

## 要求
1. 针对严重程度最高的前5个问题分类
2. 每个问题给出1-2条具体可落地的优化建议
3. 建议需结合技术实现可能性和用户体验提升
4. 每条建议必须引用1条用户原声作为依据
5. 按严重程度从高到低排序

## 输出格式（JSON数组）
[
  {{
    "problem_category": "行驶体验",
    "specific_problem": "变道过于频繁",
    "severity": "high",
    "evidence": {{
      "count": 38,
      "negative_rate": 0.71,
      "user_voice": "每次坐车都频繁变道，坐得头晕"
    }},
    "suggestions": [
      "优化变道策略，在判断需要变道时优先考虑车道保持而非立即变道",
      "增加变道前的提醒和缓冲时间，让乘客有心理准备"
    ],
    "expected_impact": "降低变道频率X%，提升乘客舒适度评分"
  }}
]"""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=8000,
        )

        try:
            # Remove markdown code fences if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
            # Unescape escaped newlines and quotes (MiniMax API returns escaped versions)
            cleaned = cleaned.replace("\\n", "\n").replace("\\\"", "\"")
            import sys
            print(f"DEBUG generate_suggestions_v2 raw length: {len(response)}", file=sys.stderr)
            sys.stderr.flush()
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            import sys
            print(f"DEBUG generate_suggestions_v2 JSON error: {e}", file=sys.stderr)
            sys.stderr.flush()
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
