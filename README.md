# 🐾 ely 🐾

一个可以快速读取和执行项目命令的 CLI 工具。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.21.1-brightgreen.svg)](https://nodejs.org/)

## ✨ 功能特性

- 🍣 **交互式选择命令**: 自动读取当前目录下的 `package.json` 中的 `scripts`，提供交互式界面选择并执行
- 🔖 **别名管理**: 为常用命令设置简短别名，提高开发效率
  - 支持模糊匹配搜索别名
  - 支持多选删除，一次删除多个别名
  - 自动生成 Shell 别名脚本
- 🚀 **自动检测包管理器**: 自动识别项目使用的包管理器（npm、pnpm、yarn、bun）
- 💾 **别名持久化**: 别名配置保存在 `~/.ely/aliases.json`，跨项目可用
- 🎯 **智能命令执行**: 自动将 `node_modules/.bin` 添加到 PATH，确保本地安装的命令可以正常执行

## 📦 安装

```bash
# 使用 pnpm
pnpm add -g @yiyi/ely

# 使用 npm
npm install -g @yiyi/ely

# 使用 yarn
yarn global add @yiyi/ely

# 使用 bun
bun add -g @yiyi/ely
```

## 🚀 快速开始

### 交互式执行命令

在项目目录下直接运行 `ely`，会列出所有可用的 scripts 命令供选择：

```bash
ely
```

工具会自动检测项目使用的包管理器（通过 lock 文件），并使用相应的命令格式执行。

### 别名管理

#### 设置别名

```bash
ely alias:set
# 或使用简写
ely st
```

这会打开交互式界面，让你：

1. 从 `package.json` 的 scripts 中选择一个要设置别名的命令
2. 输入一个简短的别名（只能包含字母、数字、下划线、连字符和冒号）
3. 如果别名已存在，会提示是否覆盖

如果没有 `package.json` 或想设置自定义别名，可以选择设置自定义别名。

**示例**：

```bash
$ ely alias:set
🔖 Set command alias
Select command to set alias for: dev
Enter alias: d
✓ Alias set successfully: d → pnpm run dev
```

#### 列出所有别名

```bash
ely alias:list
# 或使用简写
ely ls
```

这会显示所有已配置的别名，包括自定义别名和系统默认别名。

#### 删除别名

```bash
ely alias:remove
# 或使用简写
ely rm
```

这会打开交互式界面，让你：

1. 输入别名名称进行搜索（支持模糊匹配，留空显示所有别名）
2. 从匹配的别名列表中选择一个或多个要删除的别名（使用 Space 键多选）
3. 按 Enter 确认删除

**功能特性**：

- 🔍 **模糊匹配搜索**：支持部分匹配和模糊搜索，快速找到目标别名
- ✅ **多选删除**：可以一次选择并删除多个别名，提高效率
- 🏷️ **标识自定义别名**：列表中会标记哪些是自定义别名

#### 初始化别名脚本

```bash
ely alias:init
# 或使用简写
ely it
```

这会自动：

1. 生成 Shell 别名脚本文件（保存在 `~/.ely/aliases.sh`）
2. 自动检测并配置 shell 配置文件（`.zshrc`、`.bashrc` 等）
3. 添加必要的 source 命令到 shell 配置中

**首次使用**：

- 首次运行 `ely` 时会提示是否初始化别名
- 也可以手动运行 `ely alias:init` 进行初始化或修复配置

**使用别名**：

初始化后，别名会自动在每次打开终端时加载，你可以直接在终端中使用：

```bash
dev      # 等同于 pnpm run dev (根据检测到的包管理器)
build    # 等同于 pnpm run build
```

### 查看帮助

```bash
ely --help
# 或使用简写
ely -h
```

## 📖 使用示例

假设你的 `package.json` 中有以下 scripts：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

运行 `ely` 后会显示：

```
🍣 Select a command to run
请选择一个命令:
  dev → vite
  build → vite build
  preview → vite preview
  test → vitest
```

选择后会自动执行对应的命令。

## ⚙️ 配置

### 配置文件位置

别名配置保存在 `~/.ely/aliases.json`，格式如下：

```json
{
  "aliases": {
    "dev": "pnpm run dev",
    "b": "pnpm run build"
  },
  "removedAliases": []
}
```

**配置说明**：

- `aliases`: 自定义别名映射，键为别名名称，值为对应的命令（包含包管理器）
- `removedAliases`: 被删除的系统默认别名列表（用于防止重新加载）

别名脚本文件保存在 `~/.ely/aliases.sh`，由工具自动生成和管理，无需手动编辑。

### 环境变量

- `ELY_SKIP_INIT_PROMPT`: 设置为任意值可跳过首次运行时的初始化提示
- `ELY_EVAL_MODE`: 设置为 `1` 时启用 eval 模式（用于自动 source）

## 🔧 包管理器检测

工具会自动检测项目使用的包管理器，检测顺序如下：

1. 检查 `pnpm-lock.yaml` → 使用 `pnpm`
2. 检查 `yarn.lock` → 使用 `yarn`
3. 检查 `package-lock.json` → 使用 `npm`
4. 检查 `bun.lockb` → 使用 `bun`
5. 如果都没有，默认使用 `npm`

检测到的包管理器会用于：
- 执行命令时的命令格式（如 `pnpm run dev`）
- 设置别名时保存的命令格式

## 🛠️ 开发

### 项目结构

```
ely/
├── src/
│   ├── alias/          # 别名管理模块
│   │   ├── generator.ts    # 别名脚本生成
│   │   ├── manager.ts      # 别名管理逻辑
│   │   ├── ui.ts           # UI 显示
│   │   ├── validator.ts    # 验证工具
│   │   └── index.ts        # 导出
│   ├── utils/          # 工具函数
│   │   ├── package-manager.ts  # 包管理器检测
│   │   └── index.ts
│   ├── cli.ts          # CLI 入口
│   ├── commands.ts     # 命令执行
│   ├── config.ts       # 配置管理
│   ├── constants.ts    # 常量定义
│   ├── shell.ts        # Shell 相关
│   ├── types.ts        # 类型定义
│   └── index.ts        # 主入口
├── scripts/            # 构建脚本
├── dist/               # 编译输出
└── package.json
```

### 开发命令

```bash
# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm check

# 格式化代码
pnpm format
```

### 技术栈

- **TypeScript**: 类型安全
- **@clack/prompts**: 交互式 CLI 界面
- **cross-spawn**: 跨平台命令执行
- **mri**: 命令行参数解析
- **picocolors**: 终端颜色输出

## 📝 许可证

MIT

## 👤 作者

Alex Li

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 更新日志

### v0.0.1

- ✨ 初始版本
- 🍣 交互式命令选择
- 🔖 别名管理功能
- 🚀 包管理器自动检测
- 💾 别名持久化
