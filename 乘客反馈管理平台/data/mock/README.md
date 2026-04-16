# 模拟数据说明

## 文件位置
`data/mock/feedback_data.json`

## 数据规格

| 属性 | 值 |
|------|------|
| 总数量 | 150 条 |
| 时间范围 | 2026-01-15 至 2026-04-16 |
| 城市 | 武汉、北京、上海、广州、深圳 |

## 评分分布

| 类型 | 评分 | 数量 |
|------|------|------|
| 正面评价 | 4-5星 | 52条 |
| 中性评价 | 3星 | 45条 |
| 负面评价 | 1-2星 | 53条 |

## 状态分布

| 状态 | 数量 |
|------|------|
| 待处理 | 56条 |
| 处理中 | 50条 |
| 已解决 | 32条 |
| 已关闭 | 12条 |

## 数据字段

| 字段 | 类型 | 说明 |
|------|------|------|
| feedback_no | string | 反馈编号，格式：FB+日期+序号 |
| passenger_id | string | 乘客ID，格式：P+日期+序号 |
| trip_id | string | 行程ID，格式：T+日期+序号 |
| vehicle_id | string | 车辆ID，格式：Robotaxi-{城市}-XXX |
| rating | int | 评分 1-5 |
| feedback_text | string | 反馈文本内容 |
| city | string | 城市 |
| route_start | string | 路线起点 |
| route_end | string | 路线终点 |
| trip_time | datetime | 行程时间 |
| trip_duration | int | 行程时长（分钟） |
| status | string | 处理状态：待处理/处理中/已解决/已关闭 |
| ai_category | array | AI分类标签 |
| ai_keywords | array | AI提取关键词 |
| feedback_channel | string | 反馈渠道：App/小程序/电话/Web |
| reply_text | string | 客服回复内容（仅处理中/已解决/已关闭有值） |
| reply_time | datetime | 客服回复时间（仅 reply_text 有值时存在） |

## 反馈渠道分布

| 渠道 | 占比 | 数量 |
|------|------|------|
| App | 40% | ~60条 |
| 小程序 | 30% | ~45条 |
| 电话 | 15% | ~22条 |
| Web | 15% | ~22条 |

## 使用说明

数据文件为标准 JSON 格式，可直接导入数据库或用于前端开发测试。

```json
{
  "data": [ /* 150条反馈记录 */ ],
  "metadata": { /* 数据统计信息 */ }
}
```
