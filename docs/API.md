# API 文档

## 核心模块

### CLI (`src/cli.ts`)

#### `init(cwd: string): Promise<void>`

初始化 CLI 并处理用户输入。

**参数**:
- `cwd`: 当前工作目录

**功能**:
- 解析命令行参数
- 处理帮助信息
- 路由到相应的命令处理函数
- 首次运行时提示初始化

### Commands (`src/commands.ts`)

#### `interactiveSelect(cwd: string): Promise<void>`

交互式选择并执行命令。

**参数**:
- `cwd`: 当前工作目录

**功能**:
- 读取 `package.json` 中的 scripts
- 显示交互式选择界面
- 执行选中的命令

#### `run(command: string, cwd: string): void`

执行命令。

**参数**:
- `command`: 要执行的命令
- `cwd`: 当前工作目录

**功能**:
- 设置环境变量（包括 `node_modules/.bin`）
- 使用 shell 执行命令
- 处理执行错误

#### `validatePackageScripts(cwd: string): Record<string, string>`

验证并读取 package.json 中的 scripts。

**参数**:
- `cwd`: 当前工作目录

**返回**: scripts 对象

**抛出**: 如果没有找到 scripts，会退出进程

### Config (`src/config.ts`)

#### `readPackageJson(cwd: string): PackageJson | null`

读取 package.json 文件。

**参数**:
- `cwd`: 当前工作目录

**返回**: PackageJson 对象或 null

#### `readAliasConfig(): AliasConfig`

读取别名配置。

**返回**: AliasConfig 对象

#### `saveAliasConfig(config: AliasConfig): void`

保存别名配置。

**参数**:
- `config`: 别名配置对象

### Shell (`src/shell.ts`)

#### `isWindows(): boolean`

检查是否在 Windows 系统上。

**返回**: boolean

#### `getDefaultShell(): string`

获取用户默认 shell。

**返回**: shell 路径

#### `getShellArgs(): string[]`

获取 shell 执行参数。

**返回**: 参数数组

#### `getShellConfigFile(): string | null`

获取 shell 配置文件路径。

**返回**: 配置文件路径或 null

#### `isElyInitialized(): boolean`

检查 ely 是否已初始化。

**返回**: boolean

#### `readShellAliases(): Record<string, string>`

读取当前 shell 中的所有别名。

**返回**: 别名对象

### Alias Manager (`src/alias/manager.ts`)

#### `setAlias(cwd: string): Promise<void>`

设置别名。

**参数**:
- `cwd`: 当前工作目录

**功能**:
- 从 package.json 选择命令或设置自定义别名
- 处理别名冲突
- 保存配置并生成脚本

#### `removeAlias(): Promise<void>`

删除别名。

**功能**:
- 模糊搜索别名
- 多选删除
- 更新配置和脚本

#### `listShellAliases(): void`

列出所有 shell 别名。

#### `initAliasScript(): Promise<void>`

初始化别名脚本。

**功能**:
- 生成别名脚本文件
- 配置 shell 配置文件
- 处理孤立别名

### Alias Generator (`src/alias/generator.ts`)

#### `generateAliasScriptFile(): void`

生成别名脚本文件。

**功能**:
- 读取配置
- 生成 shell 脚本
- 保存到 `~/.ely/aliases.sh`

### Alias Validator (`src/alias/validator.ts`)

#### `validateAliasName(name: string): string | undefined`

验证别名名称。

**参数**:
- `name`: 别名名称

**返回**: 错误信息或 undefined

#### `validateAliasValue(value: string): string | undefined`

验证别名值。

**参数**:
- `value`: 别名值

**返回**: 错误信息或 undefined

#### `fuzzyMatch(pattern: string, text: string): boolean`

模糊匹配。

**参数**:
- `pattern`: 匹配模式
- `text`: 要匹配的文本

**返回**: 是否匹配

### Package Manager Utils (`src/utils/package-manager.ts`)

#### `detectPackageManager(cwd: string): PackageManagerInfo`

检测包管理器。

**参数**:
- `cwd`: 当前工作目录

**返回**: PackageManagerInfo 对象

#### `getPackageManagerRunCommand(manager: PackageManager | null): string`

获取包管理器运行命令。

**参数**:
- `manager`: 包管理器类型

**返回**: 命令字符串（如 "pnpm run"）

#### `formatCommandWithPackageManager(scriptName: string, manager: PackageManager | null): string`

格式化命令（包含包管理器）。

**参数**:
- `scriptName`: 脚本名称
- `manager`: 包管理器类型

**返回**: 格式化后的命令

## 类型定义

### `PackageJson`

```typescript
interface PackageJson {
  scripts?: Record<string, string>
}
```

### `AliasConfig`

```typescript
interface AliasConfig {
  aliases: Record<string, string>
  removedAliases?: string[]
}
```

### `CliArgs`

```typescript
interface CliArgs {
  help?: boolean
  alias?: boolean
  'alias:set'?: boolean
  'alias:list'?: boolean
  'alias:remove'?: boolean
  'alias:init'?: boolean
  _?: string[]
}
```

### `PackageManagerInfo`

```typescript
interface PackageManagerInfo {
  manager: PackageManager | null
  lockFile: string | null
}
```

### `PackageManager`

```typescript
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
```

