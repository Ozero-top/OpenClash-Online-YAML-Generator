# OpenClash YAML运行配置文件 在线生成工具
![image](https://raw.githubusercontent.com/Ozero-top/OpenClash-Online-YAML-Generator/refs/heads/main/OpenClash-Online-YAML-Generator.png)

## [在线演示地址](https://clash.ovitor.asia/)

### 支持客户端 ：
### [OpenClash](https://github.com/vernesong/OpenClash) OpenWRT插件  /  [ClashMI](https://clashmi.app/) 多设备客户端

##
这是一个面向 OpenClash 与 OpenWrt 用户的综合配置、节点解析与网络分流工具，支持自动分流、链式代理、单 IP/网段精准分流、节点批量导入及国家/地区智能识别，兼容 VLESS、VMess、Trojan、Hysteria2、Socks5 等协议；支持订阅配置、YAML 自动生成、在线预览与下载，并集成 DNS/TUN 防泄漏、策略组、IPv4/IPv6、DoH 解析、节点地理查询、访问统计、Worker API 等功能，适用于家庭网络、软路由、游戏加速及多节点代理场景。同时提供多种配置模式、节点地区判断与代理链路组合能力，方便用户快速生成可直接用于 OpenClash 的完整配置文件。

#### ----------------------------------------------------------------------------------------------------------------------------------------------------------

### 1. 核心功能模块

| 功能模块 | 说明 |
| --- | --- |
| **🔲 链式代理 - 独立节点** | 以卡片形式逐个添加前置/落地节点，支持单独指定或联网识别国家/地区，绑定指定网段或单设备 IP。 |
| **📑 链式代理 - 批量粘贴** | 支持多行批量粘贴不同协议链接（VLESS, VMess, Trojan, Hysteria2, Socks5），自动批量识别地区并生成链式配置。 |
| **🌐 自动分流 - 家用模式** | 针对家用路由器场景，支持单机场或双机场（主力+备用）订阅聚合，内置丰富的自动流控策略组与区域故障转移（Fallback）。 |
| **🛠️ SK 格式转换工具** | 独立工具，将（IP/端口/账号/密码）或 （域名/端口/账号/密码） 批量转换为标准 （socks5://user:pass@host:port） 格式。 |

### 2. 业务逻辑细节

* **网段与设备 IP 自动递增机制**：
* **网段匹配 (subnet)**：基于起始网段（如 `.11`）与起始 WiFi 编号（如 `1`），每添加一个节点，规则自动生成 `192.168.11.0/24 -> Trojan-香港-WiFi001`，并递增网段与 WiFi 编号。
* **单设备匹配 (singleIp)**：基于 IP 前缀（如 `192.168.11`）与起始主机 IP（如 `101`），自动生成 `192.168.11.101/32` 的精细化分流规则。

* **防泄漏与安全增强**：
* 默认注入针对 WebRTC、STUN 协议（如 `3478` 端口 UDP）的 `REJECT` 规则，防止真实 IP 泄漏。
* 配置了完备的 Fake-IP 黑名单（如国内域名、银行、政府机构、微信/支付宝域名直连，走真实 DNS）。

### 3. 边缘情况处理

* **非法 Base64 链接容错**：在 `decodeBase64Utf8` 中自动将 URL-Safe 字符 `-` 和 `_` 替换回 `+` 和 `/`，并自动补充缺少的数据对齐等号 `=`。
* **单节点解析失败**：在批量解析循环中使用 `try-catch` 包裹，单个节点解析异常会记录错误日志并跳过，不中断其余节点的处理。
* **网络请求异常降级**：DoH 解析或 Geo-IP 接口异常时，捕获异常并降级回退至“通用”地区标签，确保配置生成流程不受阻。
* **浏览器兼容性回退**：若浏览器不支持 `window.showSaveFilePicker`，自动切回传统 Blob + 临时 `<a>` 标签触发下载。
#### ----------------------------------------------------------------------------------------------------------------------------------------------------------
## Cloudflare部署方式
### 1. 环境准备与部署指南
#### 部署至 Cloudflare Workers /登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
### 第一步：创建 KV 命名空间
#### 登录 Cloudflare 控制台。
#### 在左侧菜单栏找到 存储和数据库 (Storage & Databases) -> 选择 KV。
#### 点击 创建命名空间 (Create a Namespace)。
#### 在命名空间名称框输入：VISIT_COUNTER_KV（或任意你喜欢的名称），点击 添加 (Add)。
### 第二步：部署代码到 Worker/Pages
#### 1. 部署到 Worker：
#### 进入 Worker 和 Pages (Workers & Pages) -> 点击 Create application->选择你的 Worker 应用（或新建一个 Worker）。
#### 点击 编辑代码 (Edit code)，将完整代码粘贴进去，点击 保存并部署 (Save and deploy)。
#### 2. 部署到 Pages：
#### 下载 supei-clash-main.zip 
#### 进入 Worker 和 Pages (Workers & Pages) -> 点击 Create application-> 选择Looking to deploy Pages? [Get started](https://dash.cloudflare.com/8fbfa22e3b1442a7436f3f8f2542d512/workers-and-pages/create/pages)。
#### 选择 Drag and drop your files -> 点击 Get started ，给项目改个名称；将supei-clash-main.zip 拖放进去，点击 保存并部署 (Deploy site)。
### 第三步：绑定 KV 命名空间到 Worker
#### 返回该 Worker 的管理页面，进入 设置 (Settings) 选项卡。
#### 在侧边栏选择 变量 (Variables)（或“环境变量/绑定”）。
#### 找到 KV 命名空间绑定 (KV Namespace Bindings) 区域，点击 添加绑定 (Add binding)。
### 填写配置项：
#### 变量名称 (Variable name)：必须填 PAGE_VISITS （代码中使用该名称调用）。
#### KV 命名空间 (KV namespace)：选择第一步创建的 VISIT_COUNTER_KV。
#### 点击 保存并部署 (Save and deploy)。
#### ----------------------------------------------------------------------------------------------------------------------------------------------------------
### 2. 用户操作指引

#### 场景 A：配置链式代理（中转 + 静态住宅 IP 落地）
1. 打开网页，选择 **🔲 链式代理 - 独立节点** 或 **📑 链式代理 - 批量粘贴** 模式。
2. 输入**输入订阅服务商名称** 和 **中转代理订阅地址 (url)**。
3. 选择分流匹配模式：
* **网段匹配**：适用于AP或无线软路由器多 SSID / VLAN 隔离场景。
* **指定设备单 IP**：适用于单局域网下为指定局域网IP设备分配专属落地 IP。
4. 设置 **前置中转策略组 (dialer-proxy)**（通常保持默认 `所有-手动` 或 `所有-自动`、已做好前置中转的选择直连）。
5. 输入或粘贴落地节点链接，系统会自动识别国家地区（识别出 通用 的，会出现两个情况：1.协议地址网络不通；2.识别错误，手动修改相应地区标识）。
6. 点击 **🚀 生成并自动下载完整 YAML 文件**。
7. clash运行该yaml文件后，无需任何设置即可按照前面 **网段匹配** 或 **指定设备单 IP** 配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的 **所有 - 手动** 选择延时最低节点作为前置中转
8. 其他策略组对 **网段匹配** 或 **指定设备单 IP** 无任何影响；仅作用于 OpenWRT软路由 非 **网段匹配** 或 **指定设备单 IP** 的设备；可自动分流，WebRTC/DNS防泄漏
  （分流/防泄漏前提要自行配置clash插件 或 替换clash插件配置文件，具体操作可参考：[使用指南](https://github.com/Ozero-top/OpenClash-Config/blob/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md) - 【替换OpenClash插件配置文件】 操作说明 )


#### 场景 B：配置家用自动分流模式（单/双订阅）
1. 选择 **🌐 自动分流 - 家用模式**。
2. 输入主力机场订阅地址；若有备用机场，勾选 **启用备用代理聚合** 并填入备用订阅地址。
3. 点击 **🚀 生成并自动下载完整 YAML 文件**。
4. clash运行该yaml文件后，可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组，根据使用需求自行设置；除 直连、拒绝 策略组，其他策略组均是自动切换最低延时节点；可手动选择，但会在3-6小时后自动切换到延时最低节点
5. 分流/防泄漏前提要自行配置clash插件 或 替换clash插件配置文件，具体操作可参考：[使用指南](https://github.com/Ozero-top/OpenClash-Config/blob/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md) - 【替换OpenClash插件配置文件】 操作说明 

#### 场景 C：Socks5 / SK 格式转换
1. 选择 **🛠️ Socks5 / SK 格式转换** 模式。
2. 在输入框粘贴 `IP|端口|账号|密码` 格式的文本（每行一条）。
3. 点击 **⚡ 开始批量转换**，转换完成后点击 **📋 复制转换结果**，可直接用于链式代理模式中。
   
#### ----------------------------------------------------------------------------------------------------------------------------------------------------------

### 3. 配置参数说明 (Clash / Mihomo 兼容性)

* **内核要求**：生成的配置文件专为 **Mihomo (Clash Meta) 内核** 优化，包含 `proxy-providers`、`rule-providers` (`.mrs` 格式)、`dialer-proxy` 及 `tun` 混合栈模式。
* **网络端口配置**：
* HTTP 端口：`7890`
* SOCKS5 端口：`7891`
* 混合端口（Mixed）：`7893`
* Transparent Proxy 端口：`7895`
* External Controller（控制面板）：`0.0.0.0:9090`，密钥为 `123456`

#### ----------------------------------------------------------------------------------------------------------------------------------------------------------

### 4. 常见问题排查（Troubleshooting）
#### Q1：生成文件后在 OpenClash / Clash 中导入报错或无法启动？
* **原因**：使用了原版 Clash Kernel（已停更），不支持 Mihomo 特有语法（如 `dialer-proxy`、`.mrs` 规则集格式）。
* **解决办法**：请将 Clash 客户端（如 OpenClash、Clash Verge Rev、Mihomo Party）的内核切换为 **Mihomo (Meta)** 内核。
#### Q2：为什么部分节点的地区识别显示为“通用”？
* **原因**：节点链接中无显式国家关键字，且该节点的域名/IP 无法被 Cloudflare DoH 或 IP-API 正常查询（可能因 API 限流或节点服务器阻断查询）。
* **解决办法**：在“独立节点”模式下，可以通过卡片上的下拉菜单手动指定国家/地区标签。
#### Q3：链式代理下，设备连上后无法联网？
* **原因**：`dialer-proxy` 指向的前置节点组无可用节点，或前置节点与落地 SOCKS5/节点之间的链路不通。
* **解决办法**：在 Clash Web 控制面板（如 ZashBoard / Yacd）中，检查并确保前置策略组（如 `所有-手动`）中已选中延迟正常的有效节点。

#### ----------------------------------------------------------------------------------------------------------------------------------------------------------

## 详细技术说明
### 1. 系统与代码架构
该 JS 文件采用了 **Cloudflare Worker 无服务器架构（Serverless）+ 嵌入式单页 Web 界面（Single-File SPA）** 的轻量化全栈设计：
* **服务端（Server-Side）**：基于 ES Module 规范导出 `default.fetch` 入口。当接收到 HTTP 请求时，构造并返回一个包含完整 HTML、CSS 与 JavaScript Client 代码的响应体，实现无状态的纯前端页面交付。
* **客户端（Client-Side）**：纯原生 JavaScript（Vanilla JS），不依赖任何前端框架。通过 DOM 操作响应交互、管理状态，并在客户端本地完成协议解析、地区识别、YAML 模板渲染与文件导出。
### 2. 核心依赖与外部服务
* **Cloudflare Worker Runtime**：提供 Edge 节点上的无服务器托管与 HTTP 响应处理。
* **Cloudflare DoH (`[https://1.1.1.1/dns-query](https://1.1.1.1/dns-query)`)**：通过 DNS-over-HTTPS（JSON 格式）将输入的域名节点解析为 IPv4 地址，规避客户端本地 DNS 污染或解析限制。
* **IP-API (`[https://ip-api.com/json/](https://ip-api.com/json/)...`)**：用于查询 IPv4 地址的国家/地区代码（Country Code），实现自动节点地理位置识别。
* **Fastly / jsDelivr CDN**：在生成的 Clash 配置文件中，引用了部署在 GitHub/CDN 上的 Mihomo 规则集文件（`.mrs` / `.list` 格式）。
* **File System Access API (`showSaveFilePicker`)**：现代浏览器文件保存 API，在不支持的浏览器中自动降级为 Blob URL 创建与 HTML5 `a[download]` 隐式触发下载。

### 3. 关键算法与逻辑实现
#### (1) 多协议解析引擎（Protocol Parsers）
代码实现了对主流代理协议链接的正则拆解与参数解析：
* **VLESS / Trojan / Hysteria2 / Socks5**：利用标准 `URL` 及 `URLSearchParams` 对象提取 `hostname`、`port`、`username`、`password` 以及 URL Query 参数（如 `security`, `sni`, `pbk`, `sid`, `fp`, `type`, `obfs` 等），构造符合 Clash Meta (Mihomo) 规范的 Proxy JSON 对象。
* **VMess**：提取 `vmess://` 后续的 Base64 字符串，通过自定义算法解码（兼容 URL-Safe Base64 并做补位处理，再通过 `decodeURIComponent` 转换 UTF-8 字节流），将其转化为 JSON 对象后映射为 Clash VMess 配置。

#### (2) 多阶节点地区识别算法（Geo Detection）
节点国家/地区识别采用**三层递进回退机制**：
1. **文本特征匹配**：使用正则 `detectCountryFromText` 在链接原文/备注中匹配中英文国家名、城市名或国旗 Emoji（如 `🇭🇰`, `US`, `东京`）。
2. **DoH 域名解析 + IP 地理查询**：若正则匹配失败，提取节点的主机名 `extractHostFromLink`；若为域名，调用 Cloudflare DoH 异步解析出 IPv4，再请求 `IP-API` 获取 `countryCode` 并映射为中文名称。
3. **兜底策略**：若网络请求超时或无匹配项，归类为“通用”。
#### (3) 动态 YAML 配置组装与内联转换
* **`formatInlineYaml` 算法**：将 JS 节点对象转换为 Clash 要求的内联 YAML 格式字符串（例如 `{name: "节点", type: "socks5", server: "1.1.1.1", ...}`）。
* **链式代理逻辑（Chain Proxy / Dialer-Proxy）**：为住宅 IP 落地节点注入 `dialer-proxy` 属性，将其前置中转流量指定给机场订阅策略组（如 `所有-自动` 或 `所有-手动`），并动态生成 `SRC-IP-CIDR` 分流规则与独立的策略组。

### 4. 数据流向与模块调用
[用户输入节点/订阅] ──> [DOM 事件响应 (oninput / onclick)]
                               │
                               ▼
                    [协议解析 / 字符串切分]
                               │
                               ▼
               [地区识别 (正则匹配 ──> DoH ──> IP-API)]
                               │
                               ▼
                   [构造 Proxy / Group 对象]
                               │
                               ▼
            [生成 YAML 文本 (模板拼接 + 内联转换)]
                               │
     ┌─────────────────────────┴─────────────────────────┐
     ▼                                                   ▼
[DOM 预览区渲染 (#out-full)]                 [浏览器下载 (SavePicker/Blob)]
 
