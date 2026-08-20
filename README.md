# 147数据局

**SnookerStats｜中文斯诺克数据平台**

面向中文用户的世界斯诺克数据服务平台，提供赛事、球员、排名、历史纪录和专业数据分析。

## 平台功能

- WST 赛事数据
- 实时比分与比赛状态
- 球员数据库与职业生涯资料
- 世界排名与历史排名
- 147 满分杆、破百等技术统计
- 冠军、荣誉、奖金等数据榜单
- 数据同步中心（Sync Center）
- 数据运营与监控工具

## 技术架构

- Framework：Next.js 16
- Database：Supabase PostgreSQL
- ORM：Drizzle ORM
- Deployment：EdgeOne Pages

## 本地开发

需要 Node.js 22.17 或更高版本。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

配置 `.env.local`：

```env
DATABASE_URL=postgresql://...
```

## 数据库初始化

```bash
npm run db:generate
npm run db:migrate
```

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run db:migrate
```

## 品牌

中文品牌：**147数据局**

英文项目：**SnookerStats**
