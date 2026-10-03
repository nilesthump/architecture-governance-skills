> Suite 1.1.0: see [upgrade guide](docs/UPGRADE-1.1.0.md). Official publication status is recorded in [progress](https://github.com/nilesthump/architecture-governance-skills/blob/main/docs/PROGRESS.md).

# Architecture Governance Skill Suite

**简体中文（默认）** · [English](README.en.md)

用于新项目和现有仓库的架构设计、独立审查、正式冻结与 Agent 治理。首个版本：1.0.0；支持 Windows、macOS、Linux，要求 Node.js 22+。

这是一套可组合的 11 个 Skill，配合版本绑定的执行脚本、模板、contracts、schemas 和安装器。推理由支持独立上下文 Agent 的宿主完成，脚本执行确定性检查与操作。

## 安装

npm 正式发布版本的安装方式：

    npx architecture-governance-skills@latest --scope project
    pnpm dlx architecture-governance-skills@latest --scope project
    npx architecture-governance-skills@1.0.0 --scope global
    pnpm dlx architecture-governance-skills@1.0.0 --scope global

项目级默认目录为 .agents/skills/；全局默认目录为 CODEX_HOME/skills 或 ~/.codex/skills。省略 --scope 时，在交互终端选择项目级或全局安装。--project 指定项目目录，--directory 指定自定义 Skill 目录。

默认使用解析到的稳定包版本；历史版本使用 package@X.Y.Z，并可添加 --version X.Y.Z。历史 1.0.0 包与运行时继续保留；安装新版本不会迁移项目讨论状态。已有安装需要明确添加 --replace。项目级与全局安装各自保留自己的脚本和依赖版本。

从克隆仓库的展开发布包安装：

    npm ci
    npm run build
    npm exec --package ./release/1.1.0 -- architecture-skills --scope project --project /path/to/project
    pnpm --package ./release/1.1.0 dlx architecture-skills --scope project --project /path/to/project

安装器只安装 Skills 及其运行时；项目初始化由安装后的 Skill 工作流执行。npm registry 发布状态以正式 Release 和 npm 页面为准。

## 开始使用

安装后，在宿主 Agent 中说：

- 帮我设计这个项目架构。
- 检查这个仓库的架构冲突。
- 把现在的方案正式冻结。
- 基于现有 DevOps，为仓库补充 Agent 治理。

宿主支持显式 Skill 调用时，可使用 /architecture、/architecture review、/architecture freeze、/architecture status。这些是 Agent 工作流请求。独立审查 Gate 要求宿主支持 fresh-context independent agents。

| Skill | 职责 |
| --- | --- |
| architecture | 入口、意图路由与状态协调 |
| greenfield-architecture | 新项目讨论态与候选架构 |
| existing-repo-architecture | 现有仓库证据、冲突分析与改进建议 |
| architecture-review | 原始资料审查包与独立审查 |
| architecture-freeze | 人工版本确认与正式冻结 |
| architecture-artifacts | MD、PDF、PlantUML 与一致性检查 |
| repository-bootstrap | 新项目仓库基线 |
| governance-design | AGENTS、读取顺序、权限与工作流 |
| governance-verify | 结构验证与真实 Agent 行为验收 |
| devops-baseline | 现有 DevOps 基线与行为保持 |
| progress-versioning | 进度、版本与跨上下文续接 |

## 两种工作流

**Greenfield 新项目**：需求讨论 → 接受决定 → 独立审查 → 用户选择具体架构版本 → 冻结 MD/PDF/PUML/manifest → 治理初始化 → 真实行为验收 → 共用本地/CI 验证 → PR → 集成回主目录。

**Existing Repository 现有仓库**：收集原始证据 → 区分 AS-IS、NORMATIVE、TARGET、KNOWN DEVIATION → 建立 DevOps 基线 → 在对话中提出建议 → 用户批准全部或指定子集 → 按路径与哈希应用 → 独立验证。

现有项目继承其规范目录、版本规则、包管理器和 DevOps。未批准的建议保留在对话中；修改必须匹配批准的路径与原文件哈希。

## 架构产物与治理

默认正式架构目录为 spec/architecture/vX.Y.Z/，包含 ARCHITECTURE.md、ARCHITECTURE.pdf、manifest.yaml、diagrams/*.puml 及渲染图。普通 CURRENT 文件指向当前版本。MD 与 PDF 使用同一架构身份、版本和稳定章节 ID；提供目录、锚点或书签与页码导航。

正式更新须由用户选择具体版本；用户明确保留版本号时，归档旧 revision。历史版本继续保留。架构版本与 Skill Suite/npm 包版本独立。

图由同一 PlantUML 源生成。渲染要求 Java 与官方 PlantUML JAR，通过 ARCHITECTURE_PLANTUML_JAR 指定绝对路径。语义验证要求安装 pypdf 的 Python，通过 ARCHITECTURE_PYTHON 指定解释器；Unicode 文档要求通过 ARCHITECTURE_FONT 提供可嵌入字体。缺少必要渲染能力时返回明确失败。

根 AGENTS.md 规定 authoritative spec 的读取顺序、最小实现、写入范围、task worktree、验证、审查、PR/CI 与 canonical 主目录写回；CLAUDE.md 只路由至 AGENTS.md。spec/progress/CURRENT.md 支持新上下文继续工作，未授权路径保持只读。

Review Package 保存原始 AUTHORITATIVE、EVIDENCE、CANDIDATE、ADVISORY 文件与 revision/hash 绑定。审查独立性由宿主与保留的原始轨迹支持，JSON 声明本身不能证明实际 Agent 行为。

GitHub 规则集要求三系统检查与至少一项审批，禁止主分支强推与删除。单人 owner/admin 使用平台支持的 PR-only 审批 bypass；完整性与必需检查规则没有该 bypass。

## 开发与验收

先安装 Node.js、Java 和 Python，然后执行：

    npm ci
    python -m pip install pypdf==6.10.0
    node tools/fetch-renderer.mjs
    node tools/fetch-font.mjs
    node tools/ci.mjs

tools/ci.mjs 设置渲染依赖路径后调用 tools/validate.mjs；npm run validate 调用相同核心入口，也可自行设置上述环境变量。本地与 GitHub Actions 共用核心验证逻辑。CI 覆盖 windows-latest、macos-latest、ubuntu-latest。

测试包含安装传输、项目/全局安装、负向 Gate、路径、审查包、版本与回滚、真实 PDF/PUML、worktree/write-back，以及 Existing Node/Python 的 build/test/lint/format/release/deploy 入口行为保持。实际独立 Agent 验收与模拟单元输入分别记录。

## 仓库结构

    AGENTS.md / CLAUDE.md / README.md / README.en.md / LICENSE
    package.json / package-lock.json / bin/
    1.0.0/ (frozen historical source)
    1.1.0/
      skills/ scripts/ templates/ contracts/ schemas/ shared/
    test/1.0.0/ (frozen historical tests)
    test/1.1.0/
      integration/ fixtures/ regression/ fixes/ evidence/
    release/1.0.0/ (frozen historical package)
    release/1.1.0/
    tools/ docs/ .github/workflows/

1.1.0/ 为当前版本权威源，test/1.1.0/ 保存对应测试与证据；release/1.1.0/ 为确定性构建的展开安装包，并校验源文件、安装器与发布说明的一致性。正式发布后的修复创建新版本。

原始需求：[REQUIREMENTS](docs/REQUIREMENTS.md)；实现设计：[DESIGN](docs/DESIGN.md)；当前进度：[PROGRESS](docs/PROGRESS.md)；验收详情：[ACCEPTANCE](docs/ACCEPTANCE.md)。

许可证：[MIT](LICENSE)。

## 讨论状态与升级

WORKING.json 支持有来源的用户确认、优先级补问、组件分支、依赖失效传播和只读状态表。候选、审查和冻结绑定不可变讨论输入。旧状态须显式迁移，归档后保留恢复入口；项目架构版本与 Suite 版本分开。详见 [1.1.0 升级指南](docs/UPGRADE-1.1.0.md)。
