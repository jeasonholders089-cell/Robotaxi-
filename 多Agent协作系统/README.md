# 多 Agent 协作系统

滴滴 Robotaxi 乘客反馈管理平台研发团队的多 Agent 协作实现。

## 团队成员

| Agent | 角色 | 核心职责 |
|-------|------|----------|
| 项目经理 Agent | 统筹协调 | 任务分发、进度跟踪、风险预警 |
| 产品经理 Agent | 产品设计 | 需求分析、PRD 撰写、优先级排序 |
| 设计师 Agent | UI/UX | 用户研究、交互设计、视觉规范 |
| 全栈工程师 Agent | 技术实现 | 技术方案、代码开发、测试部署 |
| 测试工程师 Agent | 质量保障 | 测试计划、用例设计、缺陷跟踪 |

## 目录结构

```
多Agent协作系统/
├── team-config.json           # 团队配置
├── collaboration-protocol.md   # 协作协议
├── demo-task.md               # 演示任务
├── README.md                  # 说明文档
└── agents/
    ├── pm-agent.md           # 项目经理 Agent
    ├── product-manager-agent.md  # 产品经理 Agent
    ├── designer-agent.md      # 设计师 Agent
    ├── engineer-agent.md     # 全栈工程师 Agent
    └── qa-agent.md           # 测试工程师 Agent
```

## 快速开始

### 1. 启动多 Agent 协作

使用 `dispatching-parallel-agents` Skill 启动并行任务分发：

```markdown
Skill("dispatching-parallel-agents")
```

### 2. 分配角色任务

根据任务类型，使用 `Agent` 工具分配任务：

```markdown
# 产品经理任务
Agent({
  description: "产品经理 - 需求分析",
  prompt: "读取 agents/product-manager-agent.md 和 demo-task.md",
  subagent_type: "general-purpose"
})

# 设计师任务
Agent({
  description: "设计师 - UI/UX设计",
  prompt: "读取 agents/designer-agent.md 和 demo-task.md",
  subagent_type: "general-purpose"
})

# 全栈工程师任务
Agent({
  description: "全栈工程师 - 技术实现",
  prompt: "读取 agents/engineer-agent.md 和 demo-task.md",
  subagent_type: "general-purpose"
})

# 测试工程师任务
Agent({
  description: "测试工程师 - 测试验证",
  prompt: "读取 agents/qa-agent.md 和 demo-task.md",
  subagent_type: "general-purpose"
})
```

### 3. 并行执行

所有 Agent 独立工作，主控 Agent（项目经理角色）负责：
- 汇总各方产出
- 协调依赖关系
- 把控整体进度

## 协作流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     主控 Agent (我)                          │
│                   扮演：项目经理角色                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   产品经理 Agent  │ │   设计师 Agent   │ │  全栈工程师 Agent │
│   需求分析        │ │   UI/UX 设计     │ │   技术实现        │
│   PRD 撰写       │ │   视觉规范       │ │   代码开发        │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                  ┌─────────────────┐
                  │  测试工程师 Agent │
                  │   测试验证       │
                  └────────┬────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────┐               ┌─────────────────┐
│    项目交付      │               │    复盘总结       │
└─────────────────┘               └─────────────────┘
```

## 协作原则

1. **并行优先** - 独立任务并行执行
2. **清晰边界** - 各 Agent 职责明确
3. **有效通信** - 按协议格式通信
4. **及时升级** - 阻塞项快速升级

## 使用场景

- 复杂项目拆解与分工
- 多模块并行开发
- 跨职能评审与协调
- 快速原型验证