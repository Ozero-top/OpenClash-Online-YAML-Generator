# OpenClash YAML 规则文件一键生成工具

## [在线演示地址](https://clash.ovitor.asia/)

### 支持客户端 ：
* [OpenClash](https://github.com/vernesong/OpenClash) -> `OpenWRT插件`  /  [ClashMI](https://clashmi.app/) `多设备客户端`

基于 Cloudflare Workers 的 OpenClash YAML 配置文件在线生成工具，单文件部署，开箱即用。支持链式代理、节点批量导入、自动分流配置生成，并内置访客 IP 显示与累计访客数统计功能。。

---

## ✨ 功能特性

- 🚀 **一键生成 YAML**：在线填写订阅地址、节点信息后，自动生成可直接导入 OpenClash 的完整 YAML 配置文件并下载。
- 🔗 **链式代理模式**：支持「前置中转 + 独立节点」的链式代理配置，可指定起始主机 IP 自动匹配 CIDR。
- 🌐 **自动分流代理**：支持主力 + 备用双订阅聚合，灵活配置分流策略。
- 📥 **批量节点导入**：粘贴多行 `vless / vmess / trojan / hysteria2 / socks5` 链接即可批量解析为节点卡片。
- 🌍 **节点归属地识别**：内置 `/api/geo-lookup` 后端代理查询节点所在国家 / 城市（解决前端直接调用 ip-api 被跨域拦截的问题），结果自动转中文。
- 👁️ **累计访客数统计**：基于 Cloudflare KV，30 天窗口内同 IP 仅计数一次。
- 🌐 **当前访问 IP 显示**：直接读取 Cloudflare `CF-Connecting-IP` 头，国家 / 城市信息同样转中文展示。
- 🎨 **明暗双主题切换**：跟随系统或手动切换，配置本地缓存。
- 🔒 **安全响应头**：所有响应统一附加安全 HTTP 头。

---

## 📁 项目结构

```
OpenClash-Online-YAML-Generator/
└── workers.js          # 单文件 Cloudflare Worker（含前端 HTML + 后端逻辑）
> 整个工具仅一个 `workers.js` 文件，无外部依赖、无构建步骤。

```

---

## 🛠️ 技术栈

| 项目 | 说明 |
| --- | --- |
| 运行时 | Cloudflare Workers |
| 存储 | Cloudflare KV（可选，用于访客计数） |
| 地理信息 | Cloudflare `request.cf` 内置字段（`country` / `city`） |
| 前端 | 原生 HTML + CSS + JavaScript（内嵌于 Worker 返回的 HTML 中） |
| 后端 API | `/api/visit`、`/api/geo-lookup` |
| Cloudflare Worker（可选）| 边缘计算，单文件 `_worker.js`，无构建无依赖 |
| Cloudflare KV（可选）| 仅 Worker 模式，用于 30 天窗口独立访客计数（PAGE_VISITS 命名空间） |
| 地理信息 | Worker 模式使用 Cloudflare 内置 `request.cf` 字段 + 后端代理 `/api/geo-lookup`； |

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
| `/api/geo-lookup?host=<域名>&ctx=<上下文>` | GET | 节点归属地查询代理接口，解决前端跨域，返回中文化的国家 / 城市标签 |

---

## 🚀 使用说明

1. 打开部署后的站点首页。
2. 按需填写：
   - **前置中转代理订阅地址**（链式代理模式可选）。
   - **起始主机 IP**：用于自动匹配 CIDR（如填 `101`，则第一个节点匹配 `.101/32`）。
   - **节点配置**：可逐个添加节点卡片，或在批量输入框粘贴多行节点链接。
   - **自动分流代理订阅地址**：可启用备用订阅做双订阅聚合。
3. 点击 **🚀 生成并自动下载完整YAML文件** 即可下载配置。
4. 将下载的 YAML 导入 OpenClash 即可使用。

> 更详细的使用教程可参考：[OpenClash 系统配置文件使用说明](https://github.com/Ozero-top/OpenClash-Config/blob/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md)

---

## ⚠️ 注意事项 & 常见问题

1. **Docker 静态模式 vs Worker 模式**
   - Docker 模式 = 纯静态页面（**更轻、部署更广，但没有后端接口**）。
   - Worker 模式 = 边缘服务器后端（**免费全球边缘 + 支持 KV 计数 + 支持节点归属地跨域查询**）。
   - 两种模式的 **核心 YAML 生成功能完全一致**（链式代理、批量导入、下载 YAML、明暗主题）。

2. **Docker 容器端口冲突**
   若宿主机 `7777` 端口被占用，改 `docker-compose.yml` 的 `ports` 或 `docker run -p` 的第一个端口号即可（例如 `-p "8888:80"`，浏览器访问 `:8888`）；容器内 `80` 固定不动。

3. **Cloudflare Worker 节点归属地查询**
   由 Worker 后端代理 ip-api / ipinfo 等在线服务，**请勿**在前端直接调用这些接口（会被 CORS 拦截）。

4. **Cloudflare Worker 地理信息准确性**
   使用 Cloudflare 内置 `request.cf.country / city`，准确性取决于 Cloudflare 的 IP 库；少数 IP 可能显示「未知国家/地区」。

5. **Docker 自托管模式下"节点归属地查询"按钮返回 404**
   这是**预期行为**：Docker 静态版未部署后端 `/api/geo-lookup`。你仍可在 Worker 版中使用此功能。不影响核心 YAML 文件的生成与下载。

6. **Cloudflare Worker 单文件修改 UI**
   Worker 模式前端 HTML、CSS、JS 全部内嵌于 `_worker.js` 的字符串中，修改 UI 需直接编辑该文件并重新 `wrangler deploy` / Dashboard 粘贴。
   Docker 静态版则直接改同级目录的 `index.html` 即可（若启用了 volume 挂载则立刻生效）。

---

## 📄 许可协议

本仓库可自由部署、修改、自用。如引用或二次分发，请保留原作者出处信息。

# 致谢
* ### [【liandu2024】](https://github.com/liandu2024/clash) 提供Yaml源码文件
* ### Clash / Mihomo / sing-box 生态项目与规则集作者

#### ----------------------------------------------------------------------------------------------------------------------------------------------------------

![image](https://raw.githubusercontent.com/Ozero-top/OpenClash-Online-YAML-Generator/refs/heads/main/OpenClash-Online-YAML-Generator.png)
