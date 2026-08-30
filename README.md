# OpenClash 在线（.yaml）生成工具（测试版）

## [Test-在线演示地址](https://test.ovitor.asia/)

### 支持客户端 ：
* [OpenClash](https://github.com/vernesong/OpenClash) -> `OpenWRT插件`  /  [ClashMI](https://clashmi.app/) `多设备客户端`



> 版本：**V0.2.6.1 Test**（未重度测试） · 部署目标：**Cloudflare Workers** · 单文件、零依赖、免构建

一个部署在 Cloudflare Worker 上的网页工具，填写表单即可一键生成适配 OpenClash / Mihomo (Meta) 内核的 `.yaml` 规则配置文件，并自动下载。

## 功能模式（5 种）

| 模式 | 说明 |
|------|------|
| 🔲 链式代理 - 独立节点 | 逐个输入/粘贴前置中转节点，配合 dialer-proxy 与网段/单 IP 精准分流 |
| 📑 链式代理 - 批量粘贴 | 多行批量粘贴 vless / vmess / trojan / hysteria2 / socks5 链接，自动识别国家地区 |
| 🌐 自动分流 - 家用模式 | 单/双机场订阅，34 组策略组 + 111 条规则 + 49 个远程规则集，开箱即用 |
| 🎯 直连模式 - 电商/游戏 | 无中转无链式，仅按 SRC-IP-CIDR 网段/单设备 IP 精准分流 |
| 🛠️ Socks5 / SK 格式转换 | `IP|端口|账号|密码` 批量转 socks5:// 链接 |

## 内置特性

- 生成的 YAML 已内联全部规则集属性（无锚点引用），兼容 OpenClash go-yaml 解析器
- 每次生成随机 28 位 Clash secret，替代硬编码弱密码
- 节点名自动本地化：ISO 3166 全量国家码 + 全国地级市中英文映射
- 节点国家自动识别：TLD 猜测 + 后端 `/api/geo-lookup` 代理查询（规避 CORS）+ DoH 解析
- 独立访客统计（可选）：绑定 KV 命名空间 `PAGE_VISITS` 即启用，30 天窗口同 IP 去重；未绑定不影响使用
- 深色/浅色主题切换、安全响应头、File System Access API 下载（自动回退 Blob 下载）

## 部署

1. Cloudflare Dashboard → Workers & Pages → Create Worker，把 `workers.js` 全文粘贴进编辑器并部署
2. （可选）绑定 KV 命名空间，变量名填 `PAGE_VISITS`，启用访客统计
3. 访问 Worker 地址即可使用；也可用 `wrangler deploy` 命令行部署

## 注意

- 测试版本，生成结果建议导入前先用面板校验；欢迎提 Issue 反馈问题
- 生成的配置仅支持 Mihomo (Meta) 内核，官方 Clash Premium / Rust 不兼容

