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
- Data access：Supabase REST + Edge Function
- Deployment：EdgeOne Makers（原 EdgeOne Pages）

## 本地开发

需要 Node.js 22.17 或更高版本。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

配置 `.env.local`：

```env
SNOOKER_SUPABASE_URL=https://rtlvncsmbueatdzqvhbn.supabase.co
SNOOKER_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

公开读取只使用 Publishable Key；管理操作和访问日志通过 `snooker-ops-api` Edge Function 完成，数据库 Service Role 不进入网站运行环境。

## 数据库与 Edge Function

- `supabase/migrations/`：独立数据库增量迁移
- `supabase/functions/snooker-ops-api/`：Snooker Admin、同步操作与访问监测接口
- `lib/snooker/schema.sql`：斯诺克数据基础结构参考

## 常用命令

```bash
npm run dev
npm run typecheck
npm run lint
npm run test:core
npm run build
```

CI 使用 `npm run build:offline`，以本地验证快照完成可重复构建；EdgeOne 正式构建使用 `npm run build` 并读取独立 Supabase。

## 品牌

中文品牌：**147数据局**

英文项目：**SnookerStats**
