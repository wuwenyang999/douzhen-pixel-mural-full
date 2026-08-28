# 豆阵｜原创拼豆工程图纸网站

网页端 MVP：展示原创巨幅拼豆壁画和立体拼豆包图纸；用户在外部虚拟商品渠道付款取得兑换码，再在本网站兑换和使用图纸。

## 本地运行

```bash
cp .env.example .env.local
npm install
npm run dev -- --port 3100
```

打开 `http://127.0.0.1:3100`。

首次用 `ADMIN_EMAIL` 对应邮箱注册后，该账户会获得 `/admin` 权限。请在上线前把 `SESSION_SECRET` 改为长随机字符串。

## 发码交付流程

1. 管理员登录 `/admin`，选择图纸并生成一批兑换码。
2. 立即复制本次显示的明文兑换码，导入外部虚拟商品自动发货渠道。
3. 买家付款后获得一个图纸专属兑换码。
4. 买家在本站注册并前往 `/redeem` 兑换，图纸即绑定到其账户。
5. 管理员可在 `/admin` 查看最近兑换码状态，并作废未使用的码。

兑换码只在生成时显示明文；数据库只保存哈希值。不要把本地 `data/pixel-mural.sqlite` 交给他人。

## 上线部署

这是带账号和兑换码的 Node 网站，不能部署为纯静态网站。选择支持 Node.js 和持久化磁盘的服务器或托管服务，并设置：

```text
ADMIN_EMAIL=你的管理员邮箱
SESSION_SECRET=长随机字符串
DATABASE_PATH=/持久化磁盘/pixel-mural.sqlite
PURCHASE_BASE_URL=你的外部虚拟商品购买页
```

部署命令：

```bash
npm install
npm run build
npm start
```

外部购买页由你配置的虚拟商品渠道承担收款和自动发码；本网站不保存任何支付信息。

## 验证

```bash
npm test
npm run build
```
