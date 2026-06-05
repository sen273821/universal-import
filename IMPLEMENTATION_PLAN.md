# 万能导入 V2 - 完整实现计划

## 项目概述
Next.js App Router + TypeScript 项目，实现智能多格式批量下单系统。
需支持 Excel/Word/PDF 文件的智能解析，通过规则引擎 + AI 辅助生成规则。

## 当前状态
- 基本框架已有，但 package.json 缺少大量依赖
- 类型定义完整
- 规则引擎有骨架但功能不完善
- UI 组件有基础但样式未按鲸天系统风格
- 缺少数据库集成（当前用内存存储）
- 缺少 Excel 导出功能
- 缺少虚拟列表性能优化
- 3份 demo 文件缺失（Word、周配送计划、多单PDF）

## 实施步骤

### Phase 1: 依赖和基础设施
1. 安装缺失依赖: xlsx, mammoth, pdf-parse, @prisma/client, prisma, lucide-react, uuid
2. 配置 Prisma + Neon 数据库（或先用 SQLite 本地开发）
3. 确保 build 通过

### Phase 2: 规则引擎重构
1. 重新设计 ParseRule 类型，增加更多场景支持
2. 完善 Excel 解析器，支持:
   - 头部跳过 (headerRows)
   - 尾部信息提取 (footerExtraction)
   - 跨行聚合 (aggregation)
   - 矩阵转置 (matrixTranspose)
   - 多 Sheet 合并 (allSheets)
   - 卡片式拆分 (cardSplit)
   - 复合单元格拆分 (splitPattern)
3. 完善 Word 解析器（纯文本段落解析）
4. 完善 PDF 解析器（表格 + 底部文本）
5. 实现规则预览测试功能

### Phase 3: AI 规则生成
1. 设计 AI prompt，分析文件结构生成规则
2. 实现 /api/ai/generate-rule 接口
3. AI 生成规则后用户可编辑微调
4. 标注 AI 推测的字段映射置信度

### Phase 4: UI 鲸天系统风格
1. 主色 #0fc6c2，圆角卡片，清爽蓝绿色调
2. 侧边导航 + 顶栏布局
3. 文件上传组件（拖拽 + 点击 + 进度条）
4. 规则编辑器（可视化配置）
5. 数据预览表格（类 Excel 体验，可编辑）
6. 运单列表（筛选、搜索、分页）
7. Loading 状态、Toast 提示、空状态

### Phase 5: 数据预览与编辑
1. 表头固定、横向滚动
2. 单元格点击编辑
3. 行内错误实时校验（标红）
4. 全部错误一次性展示
5. 外部编码重复检测
6. 删除行、新增空行
7. 导出 Excel

### Phase 6: 性能优化
1. 虚拟列表（1000+ 条不卡顿）
2. Web Worker 解析大文件
3. 分批渲染

### Phase 7: 数据库和提交
1. Prisma schema → 运单表
2. 提交下单 API
3. 运单列表查询 API（筛选、分页）

### Phase 8: 部署
1. 配置 Vercel 环境变量
2. 部署到 Vercel
3. 验证可访问

## Demo 文件清单（需要兼容）
1. 黎明屯配送发货单 (Excel) - 尾部信息提取
2. 湖南仓发货明细 (Excel) - 跨行聚合
3. 欢乐牧场模板 (Excel) - 矩阵转置
4. 黔寨寨配送单 (PDF) - 表格+底部文本
5. 多门店分Sheet出库单 (Excel) - 多Sheet合并
6. 门店调拨单-卡片式 (Excel) - 卡片边界识别
7. 门店配送确认单 (Word) - 纯文本解析 [缺文件]
8. 周配送计划 (Excel) - 双重转置+复合单元格 [缺文件]
9. 配送签收单-多单PDF (PDF) - 多订单拆分 [缺文件]
