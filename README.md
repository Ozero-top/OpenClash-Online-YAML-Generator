# OpenClash YAML 规则文件一键生成工具(测试版)

## [Test-在线演示地址](https://clash.ovitor.asia/)

### 支持客户端 ：
* [OpenClash](https://github.com/vernesong/OpenClash) -> `OpenWRT插件`  /  [ClashMI](https://clashmi.app/) `多设备客户端`

基于 Cloudflare Workers 的 OpenClash YAML 规则文件在线生成工具，单文件部署，开箱即用。内置 5 种生成模式、批量节点导入、节点归属地识别、WebRTC/DNS 防泄漏规则、emoji 风格策略组与完整分流规则集，并保留访客 IP 显示与累计访客数统计功能。

---

## ✨ 功能特性

### 生成模式（5 种）

- � **链式代理 - 独立节点**：逐个添加节点卡片，支持自定义国家/地区标签，前置中转 + 独享住宅 IP 落地 + 网段/单 IP 精准分流。
- � **链式代理 - 批量粘贴**：多行文本框批量粘贴 `vless / vmess / trojan / hysteria2 / socks5` 链接，自动解析并匹配归属地。
- 🌐 **自动分流 - 家用模式**：单/双代理订阅聚合，全自动区域流控与延迟优化，生成带 emoji 策略组与丰富分流规则的完整配置。
- 🎯 **直连模式 - 电商/游戏**：无中转/无链式，节点直接作为出口 + `SRC-IP-CIDR` 精准分流，适合电商/游戏/直播场景。
- 🛠️ **Socks5 / SK 格式转换**：将 `IP|端口|账号|密码` 批量转换为标准 `socks5://` 链接。

### 通用能力

- 🚀 **一键生成 YAML**：在线填写订阅地址、节点信息后，自动生成可直接导入 OpenClash 的完整 YAML 并下载。
- 🌍 **节点归属地识别**：内置 `/api/geo-lookup` 后端代理查询节点所在国家/城市（解决前端跨域），结果自动转中文。
- 🛡️ **WebRTC/DNS 防泄漏**：所有生成的配置内置 WebRTC 物理防泄漏规则（UDP 3478 / stun / webrtc 拒绝）+ DNS 防泄漏。
- 🎯 **emoji 策略组分流**：采用 Clash_Sub.yaml 风格的 emoji 命名策略组（🚀 故障转移、♻️ 自动选择、💬 即时通讯、🌐 社交媒体、🤖 AI 服务、📹 YouTube、🎥 Netflix 等）+ 远程规则集（blackmatrix7 / meta-rules-dat / liandu2024）+ GEOSITE/GEOIP 互补。
- 🌐 **区域 url-test 自动选优**：🇭🇰 香港 / 🇺🇸 美国 / 🇯🇵 日本 / 🇸🇬 新加坡 / 🇼🇸 台湾 / 🇰🇷 韩国 按节点名地理标签自动筛选并延迟选优。
- 🔗 **链式中转策略组可选**：链式模式的 `dialer-proxy` 可选 ♻️ 自动选择（默认）/🇭🇰 香港/🇺🇸 美国/🇯🇵 日本/🇸🇬 新加坡/🇼🇸 台湾/🇰🇷 韩国节点。
- 👁️ **累计访客数统计**：基于 Cloudflare KV，30 天窗口内同 IP 仅计数一次。
- 🌐 **当前访问 IP 显示**：直接读取 Cloudflare `CF-Connecting-IP` 头，国家/城市信息转中文展示，IP 默认打码。
- 🎨 **明暗双主题切换**：跟随系统或手动切换，配置本地缓存。

---

## 📁 项目结构

```
clash无后台版本/
├── workers.js          # 单文件 Cloudflare Worker（含前端 HTML + 后端逻辑 + YAML 模板）
└── Clash_Sub.yaml      # 配置范本（proxy-providers / proxy-groups / rule-providers / rules 四段）
```

> 整个工具仅一个 `workers.js` 文件，无外部依赖、无构建步骤。`Clash_Sub.yaml` 为配置范本参考，订阅模式生成的 YAML 结构与之保持一致。

---

## 🛠️ 技术栈

| 项目 | 说明 |
| --- | --- |
| 运行时 | Cloudflare Workers |
| 存储 | Cloudflare KV（可选，用于访客计数） |
| 地理信息 | Cloudflare `request.cf` 内置字段（`country` / `city`） |
| 前端 | 原生 HTML + CSS + JavaScript（内嵌于 Worker 返回的 HTML 中） |
| 后端 API | `/api/visit`、`/api/geo-lookup` |
| 内核要求 | Mihomo (Meta) Kernel |

---

## 📦 部署方式

本项目支持以下两种部署方式，任选其一即可。

### 方式一：Cloudflare Dashboard 在线部署（推荐新手）

1. **注册 / 登录 Cloudflare**
   访问 https://dash.cloudflare.com 并登录账号（无需绑定域名也可使用 `*.workers.dev` 子域）。

2. **创建 Worker**
   - 左侧菜单进入 **Workers & Pages** → 点击 **Create application** → **Create Worker**。
   - 给 Worker 起个名字（例如 `openclash-yaml`），点击 **Deploy** 创建占位 Worker。
   - 创建完成后点击 **Edit code** 进入在线编辑器。

3. **粘贴代码**
   - 打开本仓库的 [workers.js](./workers.js)，全选复制其全部内容。
   - 在 Cloudflare 在线编辑器中清空默认代码，粘贴刚才复制的内容。
   - 点击右上角 **Deploy** 保存部署。

4. **（可选）绑定 KV 命名空间以启用访客计数**
   - 在 **Workers & Pages** 中选 KV → **Create a namespace**，命名例如 `PAGE_VISITS`，创建。
   - 回到刚才的 Worker → **Settings** → **Bindings** → **Add binding** → 选择 **KV Namespace**：
     - **Variable name** 填：`PAGE_VISITS`
     - **KV namespace** 选择刚创建的命名空间。
   - 保存后重新 Deploy 一次代码使绑定生效。

5. **访问站点**
   部署成功后会得到一个 `https://<worker-name>.<your-subdomain>.workers.dev` 地址，浏览器打开即可使用。

---

### 方式二：Wrangler CLI 本地部署（推荐进阶）

1. **安装 Node.js**
   安装 18.x 或更高版本：https://nodejs.org/

2. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

3. **登录 Cloudflare**
   ```bash
   wrangler login
   ```
   浏览器会弹出授权页面，点击允许。

4. **准备项目目录**
   将本仓库的 `workers.js` 放到一个空目录中，并在同级目录新建 `wrangler.toml`：

   ```toml
   name = "openclash-yaml"
   main = "workers.js"
   compatibility_date = "2024-09-01"

   # 可选：绑定 KV 命名空间以启用访客计数功能
   [[kv_namespaces]]
   binding = "PAGE_VISITS"
   id = "<你的 KV namespace ID>"
   ```

   > KV namespace ID 可通过 `wrangler kv namespace create PAGE_VISITS` 创建后从输出中获取。

5. **本地预览（可选）**
   ```bash
   wrangler dev
   ```
   默认在 `http://localhost:8787` 启动本地实例，调试无误后再发布。

6. **发布到 Cloudflare**
   ```bash
   wrangler deploy
   ```
   命令执行完成后会输出线上访问地址。

---

## 🔧 环境变量与绑定

| 名称 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `PAGE_VISITS` | KV Namespace | 否 | 用于存储 30 天独立访客计数。**未绑定时功能不报错**，仅在前台显示「未绑定KV」提示，其余功能正常。 |

> 本工具**不需要**任何环境变量（Secret），也**不依赖** D1 数据库、R2 存储等其他资源。

---

## 📡 API 接口说明

| 路径 | 方法 | 说明 |
| --- | --- | --- |
| `/` | GET | 返回主页面（OpenClash YAML 生成工具 UI） |
| `/api/visit` | GET | 返回当前访客 IP、国家、城市及累计独立访客数；首次访问会写入 KV 计数 |
| `/api/geo-lookup?host=<域名>&ctx=<上下文>` | GET | 节点归属地查询代理接口，解决前端跨域，返回中文化的国家/城市标签 |

---

## 🚀 使用说明

1. 打开部署后的站点首页，在顶部选择生成模式。
2. 按模式填写配置：
   - **链式代理模式**：填写前置中转代理订阅地址 → 选择 `dialer-proxy` 策略组（默认 ♻️ 自动选择）→ 输入节点链接 → 选择网段匹配或单 IP 分流。
   - **自动分流模式**：填写主力订阅地址（可启用备用订阅做双代理聚合）。
   - **直连模式**：仅输入节点链接 + 选择网段/单 IP 分流，无订阅无中转。
3. 点击 **🚀 生成并自动下载完整YAML规则文件** 即可下载配置。
4. 将下载的 YAML 导入 OpenClash 即可使用。

> 更详细的使用教程可参考：[OpenClash 系统配置文件使用说明](https://github.com/Ozero-top/OpenClash-Config/blob/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md)

---

## 🎯 生成的 YAML 配置特性

订阅模式（链式/自动分流）生成的配置文件与 [Clash_Sub.yaml](./Clash_Sub.yaml) 结构一致，包含：

- **proxy-providers**：订阅源加载，统一过滤非节点条目（公告/流量/到期等），健康检查 + UDP override。
- **proxy-groups**：emoji 命名策略组（🚀 故障转移 fallback 主入口 + 27 个分类策略组 + 6 个区域 url-test 自动选优组 + 🎯 全球直连 + 🐟 漏网之鱼 + 🔀 非标端口）。
- **rule-providers**：远程规则集（blackmatrix7 / meta-rules-dat / liandu2024）+ 本地 Custom 规则，Domain/IP 优先 MRS 格式，复合规则用 Classical YAML。
- **rules**：WebRTC 防泄漏 → 银行/支付/政务/风控强制直连 → 国内核心服务直连 → Custom 直连/代理 → GEOSITE 分类分流 → GEOIP 国别分流 → 远程规则集 → CN 兜底直连 → 非标端口分流 → MATCH 兜底。

---

## ⚠️ 注意事项

- 访客计数功能依赖 Cloudflare KV，**未绑定时**前台显示「未绑定KV」，但生成工具、节点查询等核心功能完全不受影响。
- 节点归属地查询由 Worker 后端代理 ip-api / ipinfo 等在线服务，**请勿**在前端直接调用这些接口（会被 CORS 拦截）。
- 地理信息使用 Cloudflare 内置 `request.cf.country / city`，准确性取决于 Cloudflare 的 IP 库；少数 IP 可能显示「未知国家/地区」。
- 单文件部署意味着前端 HTML、CSS、JS 全部内嵌于 `workers.js` 的字符串中，修改 UI 需直接编辑该文件。
- 生成的配置要求 Mihomo (Meta) Kernel，端口/DNS/TUN/profile 等参数由 OpenClash LuCI 管理，YAML 仅定义 proxy-providers / proxy-groups / rule-providers / rules 四段。

---

## 📄 许可协议

本仓库仅包含单文件 `workers.js`，可自由部署、修改、自用。如引用或二次分发，请保留原作者出处信息。


# 致谢
* ### [【liandu2024】](https://github.com/liandu2024/clash) 提供Yaml源码文件
* ### Clash / Mihomo / sing-box 生态项目与规则集作者

#### ----------------------------------------------------------------------------------------------------------------------------------------------------------

![image](https://raw.githubusercontent.com/Ozero-top/OpenClash-Online-YAML-Generator/refs/heads/main/OpenClash-Online-YAML-Generator.png)
