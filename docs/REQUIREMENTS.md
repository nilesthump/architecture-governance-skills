使用当前环境中已经安装的 **Matt Pocock 制作 Skill 的 Skill** 作为本项目的 Skill 设计、拆分、编写和验证方法。先完整读取并按照该 Skill 的方法开展工作，再实现下面描述的项目。

目标是构建、测试并发布一套可通过 **npm / pnpm 一键安装**的 **Architecture Governance Skill Suite**。它由多个可组合 Skill、配套隐藏执行脚本、模板、contracts、schemas 和安装器组成，用于 Greenfield 空项目以及 Existing Repository 现有项目的架构设计、架构冻结、独立审查、项目治理、Agent 自动化治理和可靠性验证。

完成本地实现、测试、独立 review、release package 和 GitHub CI 验证后，将完整项目上传到 GitHub。GitHub 操作需要额外认证或权限时，向用户申请完成相应授权，然后继续原工作流。

# 1. 产品总体定位

本项目不是一个巨型 `SKILL.md`。

实现一套相互组合的 Skill Suite。

每个主要功能边界拥有独立 Skill 和独立 `SKILL.md`，通过一个入口 / orchestration Skill 完成自然语言路由、显式调用和自动触发。

整体逻辑分为：

```text
Reasoning Plane
└─ fresh-context independent agents

Control Plane
└─ Skill Suite workflow / orchestration

Execution Plane
└─ bundled hidden deterministic scripts
```

Skill Suite 负责：

- 判断用户意图；
- 判断 Greenfield 或 Existing Repository；
- 管理 workflow state；
- 调用适当的子 Skill；
- 构造 independent Review Package；
- 调用 fresh-context independent agents；
- 决定什么时候调用隐藏脚本；
- 消化脚本返回的机器可读结果；
- 识别什么时候需要用户做明确架构决策；
- 管理 architecture freeze；
- 管理版本；
- 管理 repository governance；
- 管理 progress state；
- 管理 GitHub / CI / worktree 等工程工作流。

隐藏脚本的调用由 Skill workflow 决定。

独立 Agent 承担推理、审查和建议任务；Skill workflow 决定是否执行确定性脚本操作。

# 2. Skill Suite 拆分

根据功能边界实现一套可组合 Skills。

推荐至少覆盖以下职责，具体 Skill 名称和进一步拆分可以由 build agent 根据 Matt Pocock Skill 方法优化，但应保持功能边界清晰：

```text
skills/
├── architecture/
│   └── SKILL.md
│
├── greenfield-architecture/
│   └── SKILL.md
│
├── existing-repo-architecture/
│   └── SKILL.md
│
├── architecture-review/
│   └── SKILL.md
│
├── architecture-freeze/
│   └── SKILL.md
│
├── architecture-artifacts/
│   └── SKILL.md
│
├── repository-bootstrap/
│   └── SKILL.md
│
├── governance-design/
│   └── SKILL.md
│
├── governance-verify/
│   └── SKILL.md
│
├── devops-baseline/
│   └── SKILL.md
│
└── progress-versioning/
    └── SKILL.md
```

`architecture` 作为主要 orchestration / routing Skill。

其职责主要是：

```text
用户意图
   ↓
architecture router
   ├─ Greenfield workflow
   ├─ Existing Repository workflow
   ├─ Review workflow
   ├─ Freeze workflow
   ├─ Governance workflow
   └─ Status / Version workflow
```

其它 Skill 保持功能聚焦和可组合。

共享逻辑通过 versioned shared resources、contracts、schemas 和 hidden scripts 实现。

# 3. 用户调用方式

支持三种入口：

## 自然语言

例如：

```text
帮我设计这个项目架构

整理一下我们刚才确定的架构

检查一下这个仓库的架构有没有冲突

把现在的方案正式冻结

给这个现有仓库补一套可靠的 Agent 自动化治理

分析这个项目现有 DevOps 再给治理方案
```

## 显式调用

提供简洁、稳定的显式 Skill 调用方式。

例如可支持类似：

```text
/architecture
/architecture review
/architecture freeze
/architecture status
```

具体显式接口按照 Matt Pocock Skill 的推荐实践设计。

## 自动调用

用户明显表现出以下意图时能够自动进入该 Skill Suite：

- 项目架构设计；
- 项目架构整理；
- 正式架构冻结；
- architecture review；
- architecture conflict review；
- repository architecture reconstruction；
- Agent governance；
- repository governance；
- 现有 DevOps 基线上的 Agent 自动化；
- 项目规范体系设计或修订。

普通单点技术问答继续保持普通问答行为。

# 4. Greenfield 工作模式

Greenfield 模式用于尚未建立正式项目架构和可靠仓库治理体系的项目。

在架构讨论过程中持续维护有价值的 working state，包括：

- 用户需求；
- accepted requirements；
- accepted decisions；
- candidate decisions；
- rejected alternatives；
- constraints；
- non-goals；
- open questions；
- risks；
- external dependencies；
- architecture assumptions；
- 当前架构候选状态。

讨论态与正式冻结态分离。

用户明确表达：

- 正式生成；
- Freeze；
- 冻结；
- 发布当前架构；
- 生成正式方案；
- 更新正式架构版本；

等意图后，进入 architecture freeze workflow。

Freeze 前通过独立上下文审查保证当前候选方案具有足够完整性和一致性。

# 5. Greenfield 默认 Repository 基线

用户没有另外指定时，Greenfield 项目默认采用：

- Git；
- GitHub repository；
- GitHub CI/CD；
- Local Validation / Local CI；
- 本地和 GitHub CI 基于统一 Validation Contract；
- `main` 主分支；
- Pull Request workflow；
- GitHub Ruleset 或适合当前 repository 的 branch protection；
- required CI status checks；
- 至少 1 个 reviewer approval；
- main branch force-push protection；
- main branch deletion protection；
- repository owner/admin 保留平台支持的 PR bypass / merge 能力。

GitHub 不允许 PR 作者 approve 自己创建的 PR，因此单人 owner/admin 项目采用 GitHub 平台支持的 admin/owner PR bypass 语义。

单人项目的默认流程可为：

```text
task branch / worktree
↓
local validation
↓
independent Agent review
↓
PR
↓
GitHub CI
↓
owner/admin PR-only bypass where supported
↓
merge
```

多人项目继续使用正常的 reviewer approval。

GitHub capability 不足时区分：

```text
AVAILABLE
AUTHORIZATION_REQUIRED
UNAVAILABLE
```

需要登录、token scope、repo administration、Ruleset 或 push 授权时向用户申请对应授权。

# 6. Greenfield 默认规范目录

Greenfield 正式初始化后，以 `spec/` 作为 Agent 读取项目规范和状态的主要入口。

默认项目治理结构建议类似：

```text
project/
├── AGENTS.md
├── CLAUDE.md
│
├── spec/
│   ├── architecture/
│   │   ├── CURRENT
│   │   │
│   │   ├── v1.0.0/
│   │   │   ├── ARCHITECTURE.md
│   │   │   ├── ARCHITECTURE.pdf
│   │   │   ├── manifest.yaml
│   │   │   └── diagrams/
│   │   │       └── *.puml
│   │   │
│   │   ├── v1.1.0/
│   │   │   └── ...
│   │   │
│   │   └── ...
│   │
│   ├── governance/
│   │   ├── WORKFLOW.md
│   │   └── WRITE_SCOPE.md
│   │
│   ├── progress/
│   │   └── CURRENT.md
│   │
│   └── 根据具体项目需要产生的 contracts /
│       protocols / testing / domain 等规范
│
├── .github/
└── project source
```

具体目录细节由 Skill Suite 根据项目性质调整，但保留：

- versioned frozen architecture；
- current architecture pointer；
- governance；
- write scope；
- current progress；
- task-specific authoritative specs。

# 7. Greenfield 根 `CLAUDE.md`

生成项目根：

```text
CLAUDE.md
```

它只承担路由职责。

语义保持为：

```text
Read and follow ./AGENTS.md.
```

项目 Agent 行为规范统一维护于根 `AGENTS.md`。

# 8. Greenfield 根 `AGENTS.md`

Greenfield 初始化时建立项目根：

```text
AGENTS.md
```

它负责定义 Agent 自动化的稳定入口和项目治理工作流。

至少实现以下语义。

## 8.1 顺序读取 `spec/`

Agent 开始任务时按照明确顺序读取 authoritative project state。

默认顺序：

```text
1. spec/progress/CURRENT.md
2. spec/architecture/CURRENT
3. CURRENT 指向版本的 ARCHITECTURE.md
4. spec/governance/WRITE_SCOPE.md
5. spec/governance/WORKFLOW.md
6. 当前任务直接关联的 contracts / protocols / domain specs
```

项目具有更多 authoritative spec 时，由 Skill 根据任务类型补充阅读集合。

普通实现 Agent 主要读取：

```text
ARCHITECTURE.md
```

`ARCHITECTURE.pdf` 主要服务于人类阅读、正式审阅和 parity review。

## 8.2 Minimum Implementation Principle

AGENTS governance 明确建立最小实现原则。

Agent 根据：

- 当前任务；
- accepted requirements；
- frozen architecture；
- contracts；
- acceptance criteria；
- 当前技术约束；

实现满足当前任务的最小可靠方案。

新增 architecture、dependency、abstraction、service、middleware、framework、compatibility layer、infrastructure、protocol 或 configuration 时，能够由当前需求或工程必要性解释其存在理由。

未来可能需要但当前任务尚未要求的能力保留为后续演进内容。

## 8.3 Worktree Workflow

Greenfield Agent 自动实现默认使用 Git worktree。

明确区分：

```text
Canonical Project Directory
```

和：

```text
Task Worktree
```

任务生命周期：

```text
canonical repository
↓
create / checkout task worktree
↓
implement
↓
local validation
↓
independent review
↓
accepted result
↓
integrate / write back to canonical project
↓
verify canonical state
↓
update progress
```

AGENTS / governance 应能够表达和维护：

- canonical project directory；
- worktree strategy；
- task worktree；
- branch；
- task identifier；
- validation state；
- review state；
- integration / write-back state。

任务完成后的正式 accepted result 最终写回或集成到 canonical project directory。

后续新 Agent 应能够仅从 canonical project repository 和 `spec/` state 继续项目。

## 8.4 Write Scope

Greenfield 项目维护：

```text
spec/governance/WRITE_SCOPE.md
```

记录 Agent 当前允许写入的路径和作用域。

例如根据实际项目生成：

```text
backend/**
frontend/**
tests/**
spec/progress/**
task-specific files
```

未授权路径按照只读范围处理。

需要扩大写入范围时，进入 scope expansion / governance decision workflow。

Write Scope 支持：

- long-lived project scope；
- task-specific scope；
- architecture freeze scope；
- governance update scope；
- progress update scope；
- CI / repository setup scope。

Agent 从 `WRITE_SCOPE.md` 获取当前写权限范围。

# 9. 当前项目进度

Greenfield 项目维护：

```text
spec/progress/CURRENT.md
```

它作为跨 Agent、跨会话继续工作的当前状态入口。

至少记录：

- 当前项目阶段；
- 当前 architecture version；
- 当前 milestone；
- 当前 Gate；
- 已完成事项；
- 当前进行事项；
- 未完成事项；
- blocker；
- 当前 task；
- 当前 branch；
- 当前 worktree；
- latest accepted checkpoint；
- 当前需要用户决定的事项；
- 下一步；
- validation state；
- review state；
- canonical write-back state；
- 可复现执行入口。

`CURRENT.md` 保持简洁、事实化和可继续执行。

状态发生实质变化时，由相应 Skill workflow 更新。

# 10. Greenfield Agent Governance Reliability

生成以下内容后：

```text
AGENTS.md
CLAUDE.md
spec/governance/*
spec/progress/*
```

使用 fresh-context independent review 对治理行为进行真实测试。

测试至少验证：

- Agent 是否按规定顺序读取 spec；
- Agent 是否找到正确 current architecture；
- Agent 是否遵循 minimum implementation；
- Agent 是否遵循 write scope；
- Agent 是否将未授权目录保持为只读；
- Agent 是否正确使用 task worktree；
- Agent 是否完成 local validation；
- Agent 是否进行要求的 independent review；
- Agent 是否将 accepted result 写回 canonical project；
- Agent 是否更新 CURRENT progress；
- 新上下文 Agent 是否能继续项目；
- Agent 是否正确遵循 PR / GitHub CI / review workflow。

可设计模拟任务，例如：

```text
新增一个 API
修复数据库 bug
修改 backend
修改 frontend
增加 dependency
修改公共 contract
修改 CI
执行 architecture update
完成 task 并写回 canonical repository
```

# 11. Local / Remote Validation Contract

Greenfield 的 Local Validation 和 GitHub CI 共享一套 Validation Contract。

Validation Contract 根据具体项目技术栈确定，例如：

```text
format
lint
unit
integration
build
contract checks
architecture checks
```

本地流程和 GitHub CI 使用相同核心验证逻辑。

避免本地与 remote CI 形成两个相互漂移的工程流程。

# 12. Existing Repository 工作模式

对于已有 repository，首先建立可靠的 repository evidence model。

分析至少覆盖：

- repository tree；
- existing `AGENTS.md`；
- existing `CLAUDE.md`；
- architecture docs；
- spec；
- ADR；
- contracts；
- protocols；
- package/dependency manifests；
- build；
- tests；
- lint；
- format；
- CI；
- release；
- deployment；
- Git workflow；
- worktree workflow；
- branch policies；
- PR policies；
- GitHub governance；
- progress / checkpoint system；
- actual source implementation；
- current DevOps baseline。

区分：

```text
AS-IS
当前真实实现

NORMATIVE
项目现有规范声明的应有状态

TARGET
用户明确确认的目标状态

KNOWN DEVIATION
AS-IS 与正式目标之间已知的差异
```

现有项目 Agent 自动化始终以当前 DevOps 为 baseline。

# 13. Existing Repository Proposal-Before-Apply

现有项目治理修改采用：

```text
Inspect
↓
Analyze
↓
Proposal
↓
User Approval
↓
Apply
↓
Independent Verification
```

Proposal 默认只在对话中展示。

至少包含：

- 当前项目结构总结；
- 当前 architecture 总结；
- 当前 governance 总结；
- 当前 DevOps baseline；
- architecture conflicts；
- spec conflicts；
- missing technical decisions；
- gaps；
- redundant rules；
- 可修正内容；
- 可补充内容；
- 可精简内容；
- recommended changes；
- 每项理由；
- expected impact；
- 明确保持不变的行为；
- DevOps preservation 分析。

用户可以批准：

- 整个 proposal；
- proposal 的指定子集；
- 修改后的方案。

获得批准后进入 repository mutation workflow。

未采用的 proposal 保留于对话，不进入仓库。

正式落地后独立验证：

```text
Governance Correctness
+
DevOps Behavioral Preservation
```

# 14. 现有规范优先继承

现有仓库已经存在可靠的：

- architecture layout；
- spec hierarchy；
- ADR；
- version rules；
- worktree workflow；
- progress system；
- Agent governance；
- CI/CD；
- release；
- branch / PR policies；

时，以其为基线。

Skill 可以提出：

- 修正；
- 补充；
- 精简；
- 合并；
- 路由优化；
- 冲突清理；

并说明理由。

配置后的 Agent 自动化继续使用项目本身已有 DevOps 工作方式。

# 15. Independent Review Trust Model

所有关键 independent review 默认不信任主代理。

Skill Suite 自己直接构造：

```text
Review Package
```

Review Package 从原始 authoritative/evidence sources 建立，而不是使用主代理的总结作为可信基础。

至少区分：

```text
AUTHORITATIVE
EVIDENCE
CANDIDATE
ADVISORY
```

典型来源：

## AUTHORITATIVE

- 用户明确决定；
- accepted requirements；
- frozen architecture；
- existing authoritative project specs；
- approved governance decisions。

## EVIDENCE

- repository original files；
- dependency manifests；
- source files；
- Git state；
- CI definitions；
- GitHub actual configuration；
- hidden scripts deterministic collection results。

## CANDIDATE

- 当前待 review 的 architecture；
- governance candidate；
- Agent 生成的方案；
- candidate artifact；
- candidate migration。

## ADVISORY

- earlier reviewer recommendations；
- non-authoritative analysis；
- suggestions。

主代理的：

- summary；
- conclusion；
- rationale；
- inference；
- recommendation；

默认作为 candidate/advisory information。

Reviewer 接收：

```text
authoritative facts
+
evidence
+
candidate under review
+
review task
```

多个 reviewer 可以基于相同 baseline 独立执行。

具体 reviewer taxonomy、数量和 Gate 组合由 Skill Build Agent根据可靠性决定。

Review Package 应可复现。

相同：

- repository revision；
- user decisions；
- frozen baseline；
- candidate artifact；

能够重建等价的 review context。

# 16. 架构冲突与缺失技术决策检查

Architecture review 使用 architecture concern coverage，而不是简单技术名词检查。

根据项目类型覆盖适用关注点，例如：

- transport；
- API；
- contracts；
- authentication；
- authorization；
- persistence；
- transactions；
- schema migration；
- cache；
- asynchronous messaging；
- ordering；
- consistency；
- idempotency；
- configuration；
- secret management；
- logging；
- metrics；
- tracing；
- observability；
- timeout；
- retry；
- failure handling；
- circuit breaking；
- deployment；
- rollback；
- compatibility；
- versioning；
- security；
- testing；
- CI/CD；
- release；
- operations。

Findings 可以分类为：

```text
OBSERVATION
RISK
CONFLICT
MISSING_DECISION
RECOMMENDATION
DECISION_REQUIRED
```

Recommendation 给出：

- 推荐方案；
- 适用理由；
- trade-off；
- applicable assumptions。

涉及正式架构选择时由用户明确决定。

# 17. Architecture Version Policy

正式架构的版本规则采用以下解析顺序：

```text
用户明确指定
↓
项目已有且适用于 architecture/spec 的规则
↓
项目没有适用规则时使用 SemVer
```

项目中的软件 version、package version 或 Git tag 不自动等同于 Architecture Version。

只有项目规则已经明确两者绑定时沿用。

本次具体升到哪个版本由用户明确。

如果用户未明确本次 version：

1. Skill 分析变化；
2. 给出具体版本建议；
3. 给出理由；
4. 等待用户选择；
5. 再执行正式 Freeze。

除用户明确要求 version 不变外，正式架构更新产生新的 version number 和 version path。

同一 version 下发生修订时通过 manifest / revision 保留审计信息。

所有正式历史版本继续保留。

# 18. Frozen Architecture 目录

Greenfield 默认：

```text
spec/architecture/
├── CURRENT
│
├── v1.0.0/
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE.pdf
│   ├── manifest.yaml
│   └── diagrams/
│       └── *.puml
│
├── v1.1.0/
│   └── ...
│
└── ...
```

`CURRENT` 记录当前 active frozen architecture version，例如：

```text
v1.1.0
```

使用普通跨平台文件作为 pointer。

# 19. `ARCHITECTURE.md`

Agent-facing architecture document。

重点包含：

- requirements；
- constraints；
- non-goals；
- system context；
- boundaries；
- components；
- responsibilities；
- dependencies；
- contracts；
- interfaces；
- persistence；
- consistency；
- messaging；
- security；
- deployment；
- DevOps；
- testing；
- compatibility；
- current implementation；
- target architecture；
- known deviations；
- risks；
- implementation-relevant architecture rules。

特征：

- 高信息密度；
- 精确；
- 易于 Agent 阅读；
- 易于引用；
- 易于 diff；
- 易于 independent review。

# 20. `ARCHITECTURE.pdf`

Human-facing architecture document。

重点包括：

- project context；
- goals；
- architecture explanation；
- rationale；
- trade-offs；
- rejected alternatives where useful；
- diagrams；
- deployment；
- operational model；
- risks；
- current / target / deviation；
- migration / evolution。

保持专业、清晰、适合长期阅读。

# 21. MD / PDF 一致性

`ARCHITECTURE.md` 和 `ARCHITECTURE.pdf`：

- 来源于同一次 Freeze；
- 使用同一个 architecture version；
- 使用同一个 architecture identity；
- 描述同一个正式架构；
- 以不同形式服务 Agent 和人类。

语义 divergence 进入 consistency failure workflow。

两者都提供文件内索引。

# 22. 稳定章节 ID

Architecture MD / PDF 使用稳定 section IDs。

例如：

```text
ARCH-001
ARCH-010
ARCH-020
ARCH-030
ARCH-040
ARCH-050
...
```

同一语义章节在 MD 和 PDF 中使用相同 section ID。

后续版本尽量保持已存在 ID 的语义稳定。

MD 提供：

- TOC；
- anchors；
- section IDs。

PDF 提供：

- TOC；
- PDF bookmarks；
- page navigation；
- section IDs。

Agent 和 reviewer 可以直接引用：

```text
ARCH-050
```

# 23. PlantUML

所有正式架构图统一使用：

```text
.puml
```

PlantUML source 是图的唯一架构源。

例如：

```text
diagrams/
├── system-context.puml
├── component.puml
├── deployment.puml
├── sequence-login.puml
└── sequence-message-send.puml
```

MD 和 PDF 中出现的正式架构图从同一个 `.puml` source 渲染。

Agent 可以直接读取 `.puml`。

Manifest 记录：

- diagram ID；
- puml path；
- related architecture section IDs。

Independent review 检查：

- diagram / text consistency；
- diagram / contract consistency；
- undefined components；
- sequence contradictions；
- deployment contradictions。

# 24. Architecture Manifest

每个 frozen version 建立 manifest。

至少能够表达：

- architecture identity；
- architecture version；
- revision；
- freeze timestamp / freeze metadata；
- architecture artifacts；
- diagram mappings；
- MD/PDF relationship；
- relevant project revision；
- verification state；
- generation metadata；
- semantic-change metadata when version is intentionally preserved。

具体 schema 由 build agent 设计并 version。

# 25. Hidden Execution Layer

每个 Skill Suite version 携带自己对应版本的隐藏执行脚本。

支持：

```text
Windows
macOS
Linux
```

采用：

```text
shared deterministic core
+
Windows adapter
+
macOS adapter
+
Linux adapter
```

共享业务行为尽量放入跨平台 core。

platform adapter 负责：

- shell differences；
- path handling；
- executable detection；
- permissions；
- process invocation；
- OS-specific worktree/runtime details。

隐藏脚本可实现：

```text
environment.probe
repo.inspect
repo.bootstrap
repo.status
repo.worktree.inspect
repo.worktree.create
repo.writeback.verify

architecture.snapshot.create
architecture.current.update
architecture.integrity.verify

validation.discover
validation.run-local
validation.compare-remote

github.auth.inspect
github.repo.create
github.ci.configure
github.ruleset.configure
github.ruleset.verify

governance.install
governance.update
governance.test

progress.read
progress.update

document.render-pdf
document.render-puml
document.parity-check

manifest.generate
manifest.verify
```

具体 action registry 可由 build agent 优化。

脚本返回 machine-readable structured result。

至少能够明确表达：

```text
success
authorization_required
user_decision_required
validation_failed
execution_failed
```

Reasoning agents 负责判断与建议，hidden scripts 负责 deterministic operations。

# 26. Hidden Script Version Binding

Skill Suite version 与其 hidden scripts 一起冻结。

例如：

```text
Skill Suite 1.0.0
→ scripts 1.0.0

Skill Suite 1.1.0
→ scripts 1.1.0
```

Project scope 和 global scope 同时存在不同版本 Skill 时，各自调用自己版本携带的 scripts。

# 27. npm / pnpm Installer

实现 npm / pnpm 一键安装。

Installer 只负责：

- 安装 Skill Suite；
- 安装对应版本 bundled hidden scripts。

Installer 不承担项目初始化和架构治理。

安装完成后的 Skill Suite 负责：

- repo bootstrap；
- Git；
- GitHub；
- CI/CD；
- architecture；
- governance；
- AGENTS；
- CLAUDE；
- spec；
- progress；
- Ruleset；
- worktree。

交互安装让用户选择：

```text
Project Skill Directory
Global Skill Directory
```

默认安装：

```text
latest stable
```

支持参数指定具体历史 version。

例如最终提供合理的 npm / pnpm 使用形式，包括：

```text
latest
explicit version
project scope
global scope
```

具体 CLI syntax 由 build agent按照 npm/pnpm 生态良好实践设计。

# 28. Project Skill 与 Global Skill

安装器支持：

```text
Project Scope
Global Scope
```

Project scope 用于将 Skill Suite 安装到当前项目对应 Skill directory。

Global scope 用于安装到用户级 Skill directory。

当同名 Project Skill 与 Global Skill 并存时，项目中的 Skill 使用自身 version 和自身 scripts，实现可复现的 project-local behavior。

# 29. Skill Suite 项目 Repository Structure

项目自身采用 versioned source layout。

根目录：

```text
architecture-governance-skills/
├── .git/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── LICENSE
├── package.json
├── bin/
│   └── installer implementation
│
├── 1.0.0/
├── 1.1.0/
├── ...
│
├── test/
│
└── release/
```

每个 version 是完整 Skill Suite source。

例如：

```text
1.0.0/
├── skills/
│   ├── architecture/
│   │   └── SKILL.md
│   │
│   ├── greenfield-architecture/
│   │   └── SKILL.md
│   │
│   ├── existing-repo-architecture/
│   │   └── SKILL.md
│   │
│   ├── architecture-review/
│   │   └── SKILL.md
│   │
│   ├── architecture-freeze/
│   │   └── SKILL.md
│   │
│   ├── architecture-artifacts/
│   │   └── SKILL.md
│   │
│   ├── repository-bootstrap/
│   │   └── SKILL.md
│   │
│   ├── governance-design/
│   │   └── SKILL.md
│   │
│   ├── governance-verify/
│   │   └── SKILL.md
│   │
│   ├── devops-baseline/
│   │   └── SKILL.md
│   │
│   └── progress-versioning/
│       └── SKILL.md
│
├── scripts/
│   ├── core/
│   ├── windows/
│   ├── macos/
│   └── linux/
│
├── templates/
├── contracts/
├── schemas/
└── shared/
```

Build agent 可以基于 Matt Pocock Skill 方法进一步优化内部目录和 Skill 拆分。

保持每个功能 Skill 有自己的 `SKILL.md`。

# 30. Version Source of Truth

以下目录：

```text
1.0.0/
1.1.0/
1.2.0/
...
```

作为对应 Skill Suite version 的权威原文件。

Version source 包含该版本运行所需的：

- Skills；
- SKILL.md files；
- hidden scripts；
- templates；
- contracts；
- schemas；
- shared runtime resources。

旧 version source 保留。

# 31. Test Layout

测试放于根：

```text
test/
```

并按 Skill Suite version 分组：

```text
test/
├── 1.0.0/
│   ├── architecture/
│   ├── greenfield-architecture/
│   ├── existing-repo-architecture/
│   ├── architecture-review/
│   ├── architecture-freeze/
│   ├── architecture-artifacts/
│   ├── repository-bootstrap/
│   ├── governance-design/
│   ├── governance-verify/
│   ├── devops-baseline/
│   ├── progress-versioning/
│   ├── integration/
│   ├── fixtures/
│   ├── regression/
│   └── fixes/
│
├── 1.1.0/
│   └── ...
│
└── ...
```

测试结构与 version source 对应。

发现旧版本问题时，可以在：

```text
test/<version>/regression/
test/<version>/fixes/
```

保存复现和修复验证。

正式修复产生新的正式 Skill Suite version，例如：

```text
1.1.0/
test/1.1.0/

        ↓ fix

1.1.1/
test/1.1.1/
release/1.1.1/
```

# 32. Release Layout

根目录：

```text
release/
```

按版本保存 npm/pnpm 可安装 package：

```text
release/
├── 1.0.0/
├── 1.1.0/
└── ...
```

`release/<version>/` 是从对应 `<version>/` source 确定性构建出的 publish/install-ready package directory。

关系：

```text
1.0.0/
    ↓ build/package
release/1.0.0/
```

Version source 是 source of truth。

Release package 是 derived artifact。

Release build 应具有 source/release integrity 或 parity validation。

Repository 中使用可展开目录保存 release package 内容。

# 33. Repository Artifact Policy

项目 repository 中保存：

- source versions；
- tests；
- test evidence；
- release package directories；
- schemas；
- contracts；
- scripts；
- installer；
- docs。

发布 package 在 Git repository 内保持展开状态。

npm registry 自身 publish / transport 时产生的 archive 属于包管理器的发布机制。

# 34. 根 `AGENTS.md`

Skill Suite 项目自己的根：

```text
AGENTS.md
```

定义本项目自身的 Agent 开发和维护 workflow。

至少覆盖：

- repo structure；
- current source version；
- Skill Suite development；
- Matt Pocock Skill methodology；
- test version correspondence；
- release correspondence；
- minimum implementation；
- worktree strategy；
- canonical write-back；
- validation；
- regression；
- independent review；
- version creation；
- release build；
- Git；
- GitHub；
- CI；
- repository governance；
- publish preparation。

它只管理 Architecture Governance Skill Suite 项目本身。

# 35. 根 `CLAUDE.md`

根：

```text
CLAUDE.md
```

只作为路由文件。

语义为：

```text
Read and follow ./AGENTS.md.
```

# 36. 根 `README.md`

README 至少包含：

- project name；
- project description；
- project goals；
- Architecture Governance Skill Suite 定位；
- Skill Suite 组成；
- Greenfield workflow；
- Existing Repository workflow；
- independent review；
- architecture freeze；
- MD/PDF/PUML artifacts；
- Agent governance；
- worktree/write-back；
- DevOps preservation；
- Windows support；
- macOS support；
- Linux support；
- npm installation；
- pnpm installation；
- project-scope installation；
- global installation；
- latest default；
- explicit historical version；
- quick start；
- basic invocation examples；
- natural language invocation；
- explicit invocation。

README 优先保证用户能够快速理解和开始使用。

# 37. License

根目录加入标准：

```text
MIT License
```

Release package 中包含必要 License information。

# 38. First Version

首个正式 Skill Suite version：

```text
1.0.0
```

完成：

```text
1.0.0/
test/1.0.0/
release/1.0.0/
```

`1.0.0/` 包含完整多 Skill Suite，而不是单个 `SKILL.md`。

# 39. Installer Testing

至少验证：

- npm；
- pnpm；
- project scope；
- global scope；
- default latest；
- explicit historical version；
- clean installation；
- existing installation；
- project/global coexistence；
- Skill/scripts version matching；
- installation result layout。

# 40. Cross-Platform Testing

本 Skill Suite 项目自身配置 GitHub Actions matrix。

至少：

```text
windows-latest
macos-latest
ubuntu-latest
```

验证：

- installer；
- path handling；
- hidden scripts；
- project/global install；
- Git；
- worktree；
- validation；
- artifact generation；
- PUML；
- PDF；
- version handling；
- repo bootstrap；
- structured script outputs。

# 41. Greenfield Integration Testing

建立 Greenfield fixture / integration tests，至少覆盖：

```text
empty project
↓
architecture discussion
↓
accepted decisions
↓
review
↓
version proposal
↓
user version choice simulation
↓
freeze
↓
spec/architecture/vX.Y.Z
↓
ARCHITECTURE.md
↓
ARCHITECTURE.pdf
↓
PlantUML
↓
manifest
↓
repository bootstrap
↓
AGENTS
↓
CLAUDE
↓
WRITE_SCOPE
↓
CURRENT progress
↓
local validation
↓
GitHub CI configuration
↓
Ruleset configuration
↓
governance reliability test
```

# 42. Existing Repository Integration Testing

至少覆盖：

```text
existing repository discovery
↓
evidence collection
↓
AS-IS
↓
NORMATIVE
↓
TARGET
↓
KNOWN DEVIATION
↓
DevOps baseline
↓
proposal
↓
user approval simulation
↓
governance application
↓
architecture reconstruction
↓
independent verification
↓
DevOps behavioral preservation
```

使用多个不同类型 fixture，提高泛化可靠性。

# 43. Independent Review Testing

至少验证：

- fresh context；
- default distrust of main agent；
- direct Review Package construction；
- authoritative/evidence/candidate separation；
- repository evidence visibility；
- main-agent summary isolation；
- conflict detection；
- missing decision detection；
- governance review；
- reproducible review package；
- independent reviewer behavior。

# 44. Artifact Testing

至少验证：

- MD/PDF same architecture identity；
- MD/PDF same architecture version；
- semantic parity；
- TOC；
- stable section IDs；
- PDF bookmarks；
- PUML source consistency；
- diagrams referenced correctly；
- manifest integrity；
- CURRENT pointer；
- historical version retention；
- revision handling；
- version update flow。

# 45. Governance Reliability Testing

测试生成的 Greenfield Agent governance 是否真正约束 fresh-context Agent 行为。

覆盖：

- ordered spec reading；
- current architecture resolution；
- minimum implementation；
- write scope；
- readonly handling outside scope；
- task worktree；
- local validation；
- independent review；
- canonical integration；
- write-back verification；
- CURRENT progress update；
- next-agent continuation。

可靠性验证以行为测试为主要依据。

# 46. Existing DevOps Preservation Testing

针对 existing-repo mode 建立：

```text
before governance
vs
after governance
```

比较：

- build entry；
- test entry；
- lint/format entry；
- CI triggers；
- CI commands；
- release workflow；
- deployment assumptions；
- package manager；
- environment assumptions；
- branch workflow。

Agent governance 应以现有 DevOps 作为执行 baseline。

# 47. Build Agent 自主设计范围

以下内部实现细节由 Skill Build Agent 按照 Matt Pocock Skill 方法和可靠性需求自行确定：

- 最终 Skill naming；
- 是否进一步拆分某些 Skill；
- reviewer taxonomy；
- reviewer quantity；
- Freeze Gate composition；
- schema internal structure；
- contract internal structure；
- temporary runtime layout；
- Review Package physical representation；
- fixture design；
- internal orchestration details；
- test framework；
- package build implementation；
- exact CLI parameter naming；
- script implementation language composition；
- installer internal architecture。

这些实现决策应服务于本 Prompt 已确定的产品行为和信任模型。

# 48. Git Repository Development

项目实现期间建立真实 Git workflow。

保持：

- 清晰 commits；
- version source traceability；
- tests 对应版本；
- release 对应版本；
- regression traceability；
- final source/release consistency。

使用项目自身 AGENTS workflow 完成实现、review 和 release。

# 49. GitHub Finalization

完成本地 Skill Suite 实现、测试和独立验证后：

1. 完成 Git repository 整理；
2. 创建或连接 GitHub repository；
3. push 完整源码；
4. push version sources；
5. push versioned tests；
6. push expanded release package；
7. 配置项目自身 GitHub Actions；
8. 配置适合项目自身的 Ruleset / repository governance；
9. 运行 Windows/macOS/Linux CI matrix；
10. 验证 npm installation；
11. 验证 pnpm installation；
12. 验证 project-scope installation；
13. 验证 global installation；
14. 验证 Greenfield integration；
15. 验证 Existing Repository integration；
16. 验证 architecture artifacts；
17. 验证 governance reliability；
18. 验证 source/release parity；
19. 修复 GitHub 环境发现的实际问题；
20. 对受影响部分重新执行 regression 和 integration tests。

GitHub authentication、push、repository administration、Actions、Ruleset 或相关权限不足时，向用户申请完成后续步骤所需的授权，然后继续同一流程。

# 50. 完成态

本任务完成时，GitHub repository 应成为 `1.0.0` 的权威可复现项目仓库。

最终至少应存在：

```text
AGENTS.md
CLAUDE.md
README.md
LICENSE

1.0.0/
    skills/
        multiple independent SKILL.md files
    scripts/
    templates/
    contracts/
    schemas/
    shared/

test/
    1.0.0/

release/
    1.0.0/

package / installer files
GitHub Actions
repository governance
```

最终向用户汇报：

- GitHub repository 地址；
- Skill Suite 当前正式版本；
- Skill 列表；
- npm / pnpm 安装方式；
- project/global 安装方式；
- release 状态；
- Windows CI 状态；
- macOS CI 状态；
- Linux CI 状态；
- Greenfield integration 状态；
- Existing Repository integration 状态；
- independent review 状态；
- governance reliability 状态；
- MD/PDF/PUML artifact verification 状态；
- source/release parity 状态；
- 最终 repository tree；
- 已知剩余问题，如存在。

整个 `1.0.0` 应达到：可以安装、可以调用、可以在三个目标操作系统工作、可以在 Greenfield 项目建立完整 architecture + governance 基线、可以在 Existing Repository 中基于原项目规范和 DevOps 提出并落实经过用户批准的改进方案，并能够通过独立上下文 review 验证可靠性。