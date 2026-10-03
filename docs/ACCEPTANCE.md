# 1.0.0 验收记录

本记录保存受控 fixture 与实际独立 Agent 的验收结果。原始需求见 REQUIREMENTS.md；证据位于 test/1.0.0/evidence/。正式分发状态以 GitHub Release 和 npm registry 为准。

| 项目 | 实际结果 |
| --- | --- |
| Windows CI | 32 passed、0 failed；1 项 POSIX 专用测试跳过 |
| macOS CI | 33 passed、0 failed |
| Linux CI | 33 passed、0 failed |
| 本地 canonical | 同一验证入口，33 项测试、32 passed、1 POSIX skip |
| 安装 | npm/pnpm 真实包传输、project/global、替换冲突与独立运行时通过 |
| Greenfield | 讨论态、选择版本、独立审查、真实冻结、历史/revision 与治理基线通过 |
| Existing Repository | Node/Python 原始 build/test/lint/format/release/deploy 入口 before/after 结果一致；原文件完整比较 |
| 独立源码审查 | 阻塞性发现已修复；最终只读复核未发现剩余确定性 blocker |
| 治理行为 | 原始顺序读取、当前架构解析、最小实现、越界拒绝、worktree、测试、独立 review、PR/CI、主目录集成与进度更新均有实际记录 |
| 新上下文续接 | 仅从 canonical 读取；原始调用片段保留；canonical/task 各 2/2 测试；只修改进度说明；独立复核接受 |
| MD/PDF/PUML | 身份/版本、文本语义、章节 ID、目录、书签、图文与 manifest 通过；独立视觉审查英文 6 页、中文 7 页 |
| 源/展开包 | 脚本、安装器、package 元数据及中英文 README 一致性通过 |

真实实现 PR：[PR #1](https://github.com/nilesthump/architecture-governance-skills/pull/1)，merge commit 74e611980a24af48c88afa5f90eca8031c1303fc。实际三系统 CI：[37096877657](https://github.com/nilesthump/architecture-governance-skills/actions/runs/37096877657)。当前验收/双语文档 PR 的最后一次检查见仓库 Actions。

GitHub 实际规则：24407282 完整性/必需检查规则无 bypass；24407283 要求至少一个 approval，仅 admin 的 PR-only bypass。PR #1 已使用该单人语义成功合并，作者未自审批准。

## 行为证据来源

- health accepted task：96346f1d74ddbc01f622c5084ef41103234862fb；初始 canonical：41d0f3c47f650c3c9cb87bd867e1ae58572807fe。
- 主目录实际原始验证通过后，进度 checkpoint：606402c976a580f1582bcf46eba09b4f79f0b586。
- 不同 fresh-context continuation Agent：dbeb72d78b88cdb5d5e7408337e794c7cde9c326，仅进度文件改变。其 accepted 进度变更按同样 PR/CI 流程集成。
- governance.test 在真实 canonical 上返回 structuralChecks=success、behavioralChecks=trace_validated。

## 验收范围与限制

原始命令/chunk 片段与事后 state recapture 分开保存。宿主支持 Agent 独立性与原始轨迹留存；机器 JSON、模拟 reviewer 输入本身不能证明独立身份或真实行为。

Existing fixture 的 release/deploy 入口验证为受控命令执行与文件保持，不代表真实生产环境部署。1.0.0 是首个正式版本，历史安装通过显式 1.0.0/缺失版本 Gate 验证；没有虚构更早发布。

冻结 fixture 的 AS-IS 是冻结时快照；health 实现完成状态由 canonical progress 与 Git 记录说明。续接 Agent 识别了其中“source/tests pending”字样，并按只读 scope 保留正式文档。

真实 PlantUML 图以 PNG 嵌入 PDF，放大时存在栅格软化；独立视觉审查判定可读。长中文候选仅用于渲染测试，不被标为真实项目架构批准。

## 正式发布与最终续接

[GitHub Release v1.0.0](https://github.com/nilesthump/architecture-governance-skills/releases/tag/v1.0.0) 已公开发布；tag 指向 f1cc52ef9010848bd28ffac17345d74d175decaa。双语/验收 [PR #2](https://github.com/nilesthump/architecture-governance-skills/pull/2) 的三系统 CI 37097609420 全部通过。

公开 GitHub Release 下载地址已实际完成 npm/pnpm × project/global 四种安装，每次 11 个 Skill、私有运行时 1.0.0、无项目初始化副作用。原始安装结果见 evidence/github/github-package-install.json。

续接进度 commit dbeb72d 已按宿主 PR/CI 集成到真实 canonical；原始合约 2/2 通过，writeback.verify 成功，最终进度 commit 89875ec。对应原始结果和最终 progress 快照分别保存。

npm registry 发布当前受平台二次验证要求阻塞。用户完成账户验证与发布后，单独记录 registry 元数据、包 integrity 与真实 registry 安装结果；GitHub 包已可安装。
