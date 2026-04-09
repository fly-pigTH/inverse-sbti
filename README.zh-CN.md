# inverse-sbti

这是一个面向学习与研究的逆向分析仓库，用来致敬 `https://sbti.unun.dev/` 上公开可访问的 `SBTI 人格测试` 页面。

## 致敬与说明

本仓库致敬的上游页面：

- 上游站点：`https://sbti.unun.dev/`
- 页面名称：`SBTI 人格测试`
- 页面中标注的原作者：`B站 @蛆肉儿串儿`
- 仓库性质：非官方、独立整理、仅供学习研究

在复用本仓库前，请先阅读 [ATTRIBUTION.md](./ATTRIBUTION.md)。

## 仓库包含什么

- 按需抓取公开页面快照的本地脚本
- 提取题库、隐藏分支和人格模板的静态分析脚本
- 将本地复刻逻辑与原页面 `computeResult()` 做一致性校验的脚本
- 用于全量枚举结果空间并生成本地报告的脚本
- 一个可直接部署到 GitHub Pages 的静态致敬版站点，位于 `site/`

## 仓库默认不包含什么

- 上游页面抓取下来的 HTML 快照
- 上游图片资源
- `output/` 下的逆向分析生成文件

这些文件默认都被 `.gitignore` 忽略。需要时请自行在本地抓取。

需要说明的是：为了让开源重建版站点可以独立运行，`site/data.js` 中包含了基于公开页面提取的题目文案、人格名称和结果文案。这部分内容仍归上游项目所有，不随本仓库的 MIT 许可重新授权。

## 快速开始

环境要求：

- Node.js 20+

先抓取当前公开页面到本地：

```bash
npm run fetch
```

再验证本地复刻逻辑和上游运行时逻辑是否一致：

```bash
npm run verify
```

生成本地报告和样例输出：

```bash
npm run report
npm run summary
node scripts/reverse-sbti.mjs sample CTRL
```

重新生成部署站点使用的数据文件：

```bash
npm run export:site-data
```

## 仓库结构

- `scripts/fetch-site.mjs`：抓取 `https://sbti.unun.dev/` 并保存为本地 `site.html`
- `scripts/verify-parity.mjs`：校验本地评分逻辑与上游页面 `computeResult()`
- `scripts/reverse-sbti.mjs`：全量枚举结果空间并生成本地报告
- `scripts/lib/site-data.mjs`：从抓取到的页面中提取常量和运行时对象
- `scripts/lib/scoring.mjs`：本地评分模型
- `site/`：可部署到 GitHub Pages 的静态致敬重建版
- `ATTRIBUTION.md`：上游归属与使用边界说明

## 当前结论

基于当前分析到的公开页面快照：

- 常规题一共 30 道，映射到 15 个维度，每个维度 2 题
- 页面默认显示 31 题，因为运行时会随机插入 1 道特殊门题
- 选择 `饮酒` 后会额外出现 1 道题，因此该分支可见题数为 32
- 正常人格结果来自 25 个硬编码模板的最近邻匹配
- 页面里存在一个会覆盖正常结果的隐藏 `DRUNK` 分支
- 页面里也存在一个低相似度时触发的 `HHHH` 兜底结果

## 法律与边界

- 本仓库不是原项目，也不应被表述为原项目镜像
- 本仓库中的 MIT 许可仅适用于这里自行编写的代码和文档，不适用于上游页面内容，也不适用于 `site/data.js` 中的上游派生文案
- 原始页面内容的权利仍归上游作者或站点所有者
- 本仓库仅用于学习、研究和逆向分析方法演示

## 校验范围

仓库自带的一致性校验目前覆盖：

- 25 个正常人格模板的精确命中
- 1 个强制触发 `HHHH` 的兜底样例
- 1 个强制触发 `DRUNK` 的覆盖样例
- 200 组随机答案

如果 `npm run verify` 输出 `"status": "ok"`，说明对于这些校验样例，本地模型与当前抓取的上游页面逻辑一致。
