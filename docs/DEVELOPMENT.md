# 开发文档

## 项目设置

### 环境要求

- Node.js >= 22.21.1 或 >= 24.0.1
- pnpm (推荐) 或 npm/yarn

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

这会启动监听模式，自动重新编译代码。

### 构建

```bash
pnpm build
```

构建产物会输出到 `dist/` 目录。

## 代码结构

### 目录结构

```
src/
├── alias/              # 别名管理模块
│   ├── generator.ts   # 别名脚本生成器
│   ├── manager.ts     # 别名管理核心逻辑
│   ├── ui.ts          # UI 显示函数
│   ├── validator.ts   # 验证工具函数
│   └── index.ts       # 模块导出
├── utils/             # 工具函数
│   ├── package-manager.ts  # 包管理器检测
│   └── index.ts
├── cli.ts             # CLI 入口和路由
├── commands.ts        # 命令执行逻辑
├── config.ts          # 配置管理
├── constants.ts       # 常量定义
├── shell.ts           # Shell 相关功能
├── types.ts           # TypeScript 类型定义
└── index.ts           # 主入口文件
```

### 模块说明

#### CLI (`cli.ts`)

- 解析命令行参数
- 路由到相应的处理函数
- 处理帮助信息
- 首次运行提示

#### Commands (`commands.ts`)

- 交互式命令选择
- 命令执行
- PATH 环境变量管理

#### Config (`config.ts`)

- 读取 package.json
- 别名配置的读写
- 配置文件路径管理

#### Shell (`shell.ts`)

- Shell 检测和配置
- 别名读取和解析
- Shell 配置文件管理

#### Alias Manager (`alias/manager.ts`)

- 别名设置、删除、列表
- 别名冲突处理
- 孤立别名检测

#### Alias Generator (`alias/generator.ts`)

- 生成 shell 别名脚本
- 处理别名更新和删除

#### Alias Validator (`alias/validator.ts`)

- 别名名称验证
- 别名值验证
- 模糊匹配

#### Package Manager Utils (`utils/package-manager.ts`)

- 包管理器检测
- 命令格式化

## 代码规范

### TypeScript

- 使用严格模式
- 所有函数都需要类型注解
- 使用接口定义数据结构

### 代码风格

- 使用 Biome 进行代码格式化
- 单引号
- 尽可能省略分号
- 使用箭头函数

### 提交规范

使用 Conventional Commits 格式：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：

```
feat: add package manager detection
fix: handle Windows path separator correctly
docs: update README with new features
```

## 测试

### 运行测试

```bash
pnpm test
```

### 测试策略

- 单元测试：测试各个模块的功能
- 集成测试：测试完整的命令流程
- E2E 测试：测试实际的 CLI 使用场景

## 调试

### 使用 VS Code

1. 在 `.vscode/launch.json` 中配置调试任务
2. 设置断点
3. 按 F5 开始调试

### 日志

使用 `@clack/prompts` 的日志功能：

```typescript
import * as prompts from '@clack/prompts'

prompts.log.info('Info message')
prompts.log.success('Success message')
prompts.log.warn('Warning message')
prompts.log.error('Error message')
```

## 发布流程

1. 更新版本号（遵循语义化版本）
2. 更新 CHANGELOG.md
3. 提交更改
4. 创建 git tag
5. 运行 `pnpm publish`（会自动构建）

## 常见问题

### 如何添加新的命令？

1. 在 `cli.ts` 中添加路由
2. 在 `commands.ts` 或相应模块中实现处理函数
3. 更新帮助信息

### 如何添加新的包管理器支持？

1. 在 `constants.ts` 中添加 lock 文件名
2. 在 `utils/package-manager.ts` 中更新检测逻辑
3. 更新文档

### 如何处理跨平台兼容性？

- 使用 `cross-spawn` 执行命令
- 使用 `isWindows()` 检查平台
- 使用平台特定的路径分隔符

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT

