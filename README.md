# ely

一个可以快速读取和执行项目命令的 CLI 工具。

## 功能特性

- 📦 **交互式选择命令**: 自动读取当前目录下的 `package.json` 中的 `scripts`，提供交互式界面选择并执行
- 🔖 **别名管理**: 为常用命令设置简短别名，提高开发效率
  - 支持模糊匹配搜索别名
  - 支持多选删除，一次删除多个别名
  - 自动生成 Shell 别名脚本
- 🚀 **自动检测包管理器**: 自动识别项目使用的包管理器（npm、pnpm、yarn）
- 💾 **别名持久化**: 别名配置保存在 `~/.ely/aliases.json`，跨项目可用

## 安装

```bash
pnpm add -g @yiyi/ely
# 或
npm install -g @yiyi/ely
# 或
yarn global add @yiyi/ely
```

## 使用方法

### 交互式执行命令

在项目目录下直接运行 `ely`，会列出所有可用的 scripts 命令供选择：

```bash
ely
```

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
dev      # 等同于 npm run dev
build    # 等同于 npm run build
```

### 查看帮助

```bash
ely --help
# 或
ely -h
```

## 示例

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
📦 选择要执行的命令
请选择一个命令:
  dev → vite
  build → vite build
  preview → vite preview
  test → vitest
```

选择后会自动执行对应的命令。

## 配置文件

别名配置保存在 `~/.ely/aliases.json`，格式如下：

```json
{
  "aliases": {
    "dev": "dev",
    "b": "build"
  },
  "removedAliases": []
}
```

**配置说明**：
- `aliases`: 自定义别名映射，键为别名名称，值为对应的脚本名称
- `removedAliases`: 被删除的系统默认别名列表（用于防止重新加载）

别名脚本文件保存在 `~/.ely/aliases.sh`，由工具自动生成和管理，无需手动编辑。

## License

MIT
