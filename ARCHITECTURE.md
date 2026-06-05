# 万能导入 V2 - 智能多格式批量下单系统

## 项目概述

基于 Next.js App Router + TypeScript 的智能批量下单系统，通过 AI 大模型实现任意格式文件的智能解析与导入。

## 技术栈

- **前端**: Next.js 15 App Router + TypeScript + Tailwind CSS
- **数据库**: Neon (PostgreSQL) via Vercel Marketplace
- **大模型**: DeepSeek API
- **文件解析**: xlsx (Excel), mammoth (Word), pdf-parse (PDF)
- **部署**: Vercel

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── rules/         # 规则管理 API
│   │   ├── parse/         # 文件解析 API
│   │   ├── orders/        # 订单管理 API
│   │   └── ai/            # AI 辅助 API
│   ├── page.tsx           # 主页面
│   └── layout.tsx         # 布局
├── components/            # React 组件
│   ├── FileUpload.tsx     # 文件上传组件
│   ├── RuleEditor.tsx     # 规则编辑器
│   ├── DataPreview.tsx    # 数据预览表格
│   ├── OrderList.tsx      # 订单列表
│   └── ui/               # 基础 UI 组件
├── lib/                   # 核心库
│   ├── parser/            # 解析器引擎
│   │   ├── engine.ts      # 规则引擎核心
│   │   ├── excel.ts       # Excel 解析器
│   │   ├── word.ts        # Word 解析器
│   │   └── pdf.ts         # PDF 解析器
│   ├── ai/                # AI 辅助
│   │   └── rule-generator.ts  # AI 规则生成器
│   ├── db/                # 数据库
│   │   └── prisma.ts      # Prisma 客户端
│   └── utils/             # 工具函数
├── types/                 # TypeScript 类型定义
│   └── index.ts           # 核心类型
└── styles/                # 样式文件
```

## 核心设计

### 1. 规则引擎架构

```typescript
// 规则描述结构
interface ParseRule {
  id: string;
  name: string;
  description: string;
  fileType: 'excel' | 'word' | 'pdf';
  
  // 文件结构描述
  structure: {
    headerRows: number;        // 头部行数（跳过）
    dataStartRow: number;      // 数据起始行
    footerRows?: number;       // 尾部行数
    sheetIndex?: number;       // Sheet 索引（Excel）
    allSheets?: boolean;       // 是否遍历所有 Sheet
  };
  
  // 字段映射
  fieldMappings: FieldMapping[];
  
  // 特殊处理规则
  transformations?: Transformation[];
  
  // 尾部信息提取
  footerExtraction?: FooterExtraction;
  
  // 跨行聚合配置
  aggregation?: AggregationConfig;
  
  // 矩阵转置配置
  matrixTranspose?: MatrixTransposeConfig;
  
  // 卡片式拆分配置
  cardSplit?: CardSplitConfig;
}

// 字段映射
interface FieldMapping {
  source: string;           // 来源列名或正则
  target: string;           // 目标字段名
  type: 'column' | 'regex' | 'static' | 'computed';
  value?: string;           // 静态值或计算表达式
  columnIndex?: number;     // 列索引（从0开始）
  regex?: string;           // 正则表达式
  defaultValue?: string;    // 默认值
}

// 转换规则
interface Transformation {
  type: 'split' | 'merge' | 'replace' | 'extract';
  sourceField: string;
  targetField: string;
  config: Record<string, any>;
}
```

### 2. AI 辅助生成规则

```typescript
// AI 分析文件结构并生成规则
async function generateRuleWithAI(fileContent: string, fileType: string): Promise<ParseRule> {
  const prompt = `
分析以下文件内容，生成解析规则：
文件类型：${ fileType}
文件内容：${ fileContent}

请分析：
1. 文件结构（头部、数据区、尾部）
2. 表头位置和列名
3. 数据起始行
4. 收货人信息位置
5. 是否需要特殊处理（跨行聚合、矩阵转置等）

返回 JSON 格式的规则描述。
`;
  
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 3. 数据库设计 (Prisma)

```prisma
// prisma/schema.prisma
model ParseRule {
  id          String   @id @default(cuid())
  name        String
  description String?
  fileType    String   // excel, word, pdf
  ruleJson    Json     // 规则 JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  orders      Order[]
}

model Order {
  id              String   @id @default(cuid())
  externalCode    String?  // 外部编码
  storeName       String?  // 收货门店
  recipientName   String?  // 收件人姓名
  recipientPhone  String?  // 收件人电话
  recipientAddress String? // 收件人地址
  skuCode         String   // SKU 物品编码
  skuName         String   // SKU 物品名称
  skuQuantity     Int      // SKU 发货数量
  skuSpec         String?  // SKU 规格型号
  remark          String?  // 备注
  ruleId          String?
  rule            ParseRule? @relation(fields: [ruleId], references: [id])
  createdAt       DateTime @default(now())
  
  @@index([externalCode])
  @@index([recipientName])
  @@index([createdAt])
}
```

## 开发步骤

### 阶段一：项目搭建与基础架构

1. **初始化项目**
   - 创建 Next.js 项目 ✓
   - 安装依赖 ✓
   - 配置 Tailwind CSS
   - 设置 TypeScript 类型

2. **配置数据库**
   - 设置 Prisma
   - 创建数据库表
   - 配置 Neon 连接

3. **创建基础 UI 组件**
   - 布局组件
   - 按钮、输入框、卡片等
   - 鲸天系统风格主题

### 阶段二：核心功能开发

4. **文件上传组件**
   - 支持拖拽上传
   - 支持 Excel/Word/PDF
   - 文件类型验证
   - 上传进度显示

5. **规则引擎核心**
   - 规则解析器
   - Excel 解析器
   - Word 解析器
   - PDF 解析器
   - 字段映射执行器

6. **AI 辅助生成规则**
   - DeepSeek API 集成
   - 文件结构分析
   - 规则生成与优化
   - 规则预览与确认

7. **规则编辑器**
   - 可视化规则配置
   - 字段映射编辑
   - 规则预览测试
   - 规则保存与管理

8. **数据预览表格**
   - 虚拟列表（1000+ 条数据）
   - 行内编辑
   - 实时校验
   - 错误高亮
   - 导出 Excel

9. **提交下单功能**
   - 数据校验
   - 批量插入数据库
   - 进度显示
   - 结果汇总

10. **运单列表功能**
    - 分页查询
    - 筛选搜索
    - 数据展示

### 阶段三：UI 美化与部署

11. **鲸天系统风格 UI**
    - 主色 #0fc6c2
    - 圆角卡片
    - 清爽蓝绿色调
    - 响应式布局

12. **Vercel 部署**
    - 配置环境变量
    - 部署到 Vercel
    - 测试访问

## 关键技术点

### 1. 大列表渲染优化

使用虚拟列表（react-window 或 react-virtualized）处理 1000+ 条数据：

```typescript
import { FixedSizeList as List } from 'react-window';

function VirtualTable({ data }: { data: Order[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="flex border-b">
      {Object.values(data[index]).map((value, i) => (
        <div key={i} className="flex-1 p-2">{value}</div>
      ))}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={data.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### 2. 文件解析性能优化

- 使用 Web Worker 处理大文件
- 流式读取 PDF
- 分批处理 Excel 数据

### 3. AI Prompt 设计

```typescript
const SYSTEM_PROMPT = `你是一个文件结构分析专家。分析用户上传的文件，生成解析规则。

规则必须包含：
1. 文件结构（头部行数、数据起始行、尾部行数）
2. 字段映射（列名到目标字段的映射）
3. 特殊处理（跨行聚合、矩阵转置等）

返回 JSON 格式，结构如下：
{
  "structure": { "headerRows": N, "dataStartRow": N, ... },
  "fieldMappings": [...],
  "transformations": [...]
}`;
```

## 环境变量

```env
# .env.local
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com
```

## 部署配置

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

## 性能要求

- 1000 单 10 秒内完成解析
- 前端渲染 1000 条数据 3 秒内
- 文件解析不阻塞 UI
- 内存占用合理

## 下一步

1. 配置数据库连接
2. 创建 API 路由
3. 实现文件上传组件
4. 实现规则引擎
5. 实现 AI 辅助生成
6. 实现数据预览表格
7. 实现提交下单
8. 实现运单列表
9. UI 美化
10. 部署到 Vercel
