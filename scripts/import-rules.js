// 导入本地规则到生产数据库
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// 读取本地规则数据
const rules = JSON.parse(fs.readFileSync('./rules.json', 'utf8'));

// 创建Prisma客户端（使用环境变量中的DATABASE_URL）
const prisma = new PrismaClient();

async function importRules() {
  console.log(`准备导入 ${rules.length} 条规则...`);
  
  for (const rule of rules) {
    try {
      // 检查规则是否已存在
      const existing = await prisma.parseRule.findUnique({
        where: { id: rule.id }
      });
      
      if (existing) {
        console.log(`规则已存在，跳过: ${rule.name}`);
        continue;
      }
      
      // 创建规则
      await prisma.parseRule.create({
        data: {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          fileType: rule.fileType,
          ruleJson: rule.ruleJson,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        }
      });
      
      console.log(`成功导入规则: ${rule.name}`);
    } catch (error) {
      console.error(`导入规则失败: ${rule.name}`, error.message);
    }
  }
  
  console.log('导入完成！');
  await prisma.$disconnect();
}

importRules().catch(console.error);
