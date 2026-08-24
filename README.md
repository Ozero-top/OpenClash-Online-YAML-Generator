# OpenClash YAML 配置文件一键生成工具

## 在线演示地址
- Cloudflare Worker 版（原版）：<https://clash.ovitor.asia/>
- Docker 静态自托管版公共镜像：`ovitor/openclash-yaml-generator:latest`

### 支持客户端 ：
* [OpenClash](https://github.com/vernesong/OpenClash) -> `OpenWRT插件`  /  [ClashMI](https://clashmi.app/) `多设备客户端`

OpenClash YAML 配置文件在线生成工具，提供 **两种独立部署模式**，开箱即用：

- 🐳 **Docker 自托管模式**：纯静态单文件 `index.html` + Nginx Alpine 容器，无需 Cloudflare 账号，一行命令启动。
- 🌥️ **Cloudflare Worker 模式**：单文件 `_worker.js`，可选绑定 KV 做访客统计，支持节点归属地后端代理查询。

支持链式代理、节点批量导入、自动分流配置生成、明暗双主题切换。

---

## ✨ 功能特性

- 🚀 **一键生成 YAML**：在线填写订阅地址、节点信息后，自动生成可直接导入 OpenClash 的完整 YAML 配置文件并下载。
- 🔗 **链式代理模式**：支持「前置中转 + 独立节点」的链式代理配置，可指定起始主机 IP 自动匹配 CIDR。
- 🌐 **自动分流代理**：支持主力 + 备用双订阅聚合，灵活配置分流策略。
- 📥 **批量节点导入**：粘贴多行 `vless / vmess / trojan / hysteria2 / socks5` 链接即可批量解析为节点卡片。
- � **明暗双主题切换**：跟随系统或手动切换，配置本地缓存。
- 🐳 **Docker 一键部署**（本仓库新增）：提供 `Dockerfile` / `nginx.conf` / `docker-compose.yml`，Nginx 内置 Gzip 压缩 + UTF-8 + 安全响应头 + SPA 兜底，无需依赖 Cloudflare。
- ☁️ **Cloudflare Worker 边缘部署**：`_worker.js` 单文件，可免费部署到 Cloudflare 边缘网络，支持节点归属地后端代理跨域查询。

> 🔔 **关于 🗺️ IP 显示 / 🧑‍💼 累计访客 / KV**：出于隐私保护与部署轻量化考虑，**Docker 自托管模式** 的静态 `index.html` **已全部移除** IP 显示、累计访客统计、Cloudflare KV 相关代码；这些功能仅在 Cloudflare Worker 模式中可选启用。

---

## 📁 项目结构

```
clash - docker/
├── index.html              # 单文件静态站（前端 UI：HTML/CSS/JS 全部内嵌，Docker 部署使用）
├── nginx.conf              # Nginx 配置：charset utf-8 + gzip + 安全头 + 静态缓存策略 + SPA try_files
└──  docker-compose.yml      # Compose 一键部署：端口 7777:80 + healthcheck + 可选 volume 热更新挂载

```

---

## 🛠️ 技术栈

| 模块 | 说明 |
| --- | --- |
| 前端 UI | 原生 HTML + CSS + JavaScript（**全内嵌于单文件**，Docker 用 `index.html`，Worker 用 `_worker.js` 字符串） |
| Docker 运行时 | `nginx:1.27-alpine`（约 73.9MB 镜像，提供 Gzip / 安全头 / 缓存 / SPA 兜底） |
| Docker Compose | 顶层显式 `name: openclash-yaml-generator`，规避中文目录名推断问题 |
| Cloudflare Worker（可选）| 边缘计算，单文件 `_worker.js`，无构建无依赖 |
| Cloudflare KV（可选）| 仅 Worker 模式，用于 30 天窗口独立访客计数（PAGE_VISITS 命名空间） |
| 地理信息 | Worker 模式使用 Cloudflare 内置 `request.cf` 字段 + 后端代理 `/api/geo-lookup`；Docker 静态版此按钮可用但后端 404 |
| 构建/发布脚本 | PowerShell (`build-push.ps1`) + Bash (`build-push.sh`)，前置检查 docker CLI + 用户名非占位 + 自动 tag/push |

---

## 📦 部署方式

本项目支持以下 **三种** 部署方式，任选其一即可。
如果你 **没有 Cloudflare 账号** 或者想 **部署到自己的服务器/家用 NAS**，首选 **方式一 Docker 部署**（最简单、最通用）。

---

### 方式一：Docker 自托管部署 ✨ 推荐新手 / 自托管用户

Docker 部署方式分三条子路径：**A 一行 docker run 拉公共镜像**（最快，推荐）、**B Docker Compose**（便于管理、带健康检查）、**C 自行构建并推送到自己的 Docker Hub**（想定制代码时用）。

> ⚠️ Docker 静态部署版本不包含 Cloudflare 后端接口（无 `/api/visit` 与 `/api/geo-lookup`），页面所有 **核心 YAML 生成功能**（链式代理、节点批量导入、下载 YAML、主题切换）均完整可用；仅"节点归属地查询"按钮因无后端代理会返回 404（不影响 YAML 生成）。

---

#### 🅰️ 最快：Docker Run 一行命令启动（使用公共镜像 ovitor/openclash-yaml-generator:latest）

无需下载本仓库任何文件，**任何安装了 Docker 的机器直接复制粘贴**即可：

```bash
docker run -d \
  -p 7777:80 \
  --name openclash-yaml \
  --restart unless-stopped \
  ovitor/openclash-yaml-generator:latest
```

启动完成后浏览器访问：<http://localhost:7777/> 或 <http://127.0.0.1:7777/>

常用运维命令：
```bash
docker logs -f openclash-yaml      # 查看 nginx 实时日志
docker stop openclash-yaml         # 停止
docker start openclash-yaml        # 再次启动
docker rm -f openclash-yaml        # 删除容器（不删镜像，下次 run 秒启动）
docker pull ovitor/openclash-yaml-generator:latest   # 更新到最新镜像
```

---

#### 🅱️ 推荐：Docker Compose（健康检查 + 自动重启 + 可选热更新挂载）

> 🔧 Compose 命令入口：新版 Docker 统一使用 **`docker compose`**（Compose v2，空格，随 Docker Desktop / Engine 自带）。
> 若你仍在用极旧版 v1，请替换为 **`docker-compose`**（中划线）。

1. **新建空目录**（例如 `openclash-yaml`），在里面创建 `docker-compose.yml`：
   ```yaml
   services:
     openclash-yaml:
       image: ovitor/openclash-yaml-generator:latest
       container_name: openclash-yaml-generator
       restart: unless-stopped
       ports:
         - "7777:80"

       # 🔁 可选：若你希望在宿主机改完 index.html 立即生效（无需重建 / 重新 pull 镜像），
       #          把下面两行取消注释，并把自定义的 index.html 放在 compose 文件同级目录：
       # volumes:
       #   - ./index.html:/usr/share/nginx/html/index.html:ro

       # 🩺 健康检查：容器内 wget 请求首页并校验关键字，失败累计 3 次标记为 unhealthy
       healthcheck:
         test: ["CMD-SHELL", "wget -qO- http://127.0.0.1/ | grep -q 'OpenClash YAML' || exit 1"]
         interval: 60s
         timeout: 5s
         retries: 3
         start_period: 3s
   ```

2. **启动**：在该目录执行
   ```bash
   docker compose up -d       # 启动（推荐 Compose v2）
   # docker-compose up -d     # 兼容极旧版 v1（中划线）
   ```

3. **验证**
   ```bash
   docker compose ps          # 查看状态：应显示 STATUS 列含 (healthy)
   curl -I http://127.0.0.1:7777/   # 应返回 HTTP/1.1 200、Content-Type: text/html; charset=utf-8
   ```

4. **浏览器打开**：<http://localhost:7777/>

**常用 Compose 运维命令：**
```bash
cd <你的 compose.yml 所在目录>
docker compose logs -f     # 实时 nginx 日志
docker compose down        # 停止 + 删除容器与自定义网络（不删镜像）
docker compose pull        # 拉取最新公共镜像
docker compose up -d       # 再次启动（拉完新镜像后执行即可滚动更新）
```

---

#### 🅲️ 进阶：自行构建镜像并推送到自己的 Docker Hub

如果你修改了 `index.html` 或 `nginx.conf`，想打包成自己的私有 / 公共镜像：

1. 首先在 <https://hub.docker.com/> 上创建你的 Docker Hub 账号，并在本机登录：
   ```bash
   docker login
   ```
   输入你自己的 Docker Hub 用户名与密码 / Access Token。

2. **方式 C-1：使用本仓库内置一键脚本（推荐，跨平台）**

   - **Windows PowerShell**：
     打开 `build-push.ps1`，确认默认参数 `$YourDockerhubUser` 是否是你自己的用户名（本仓库默认值 = `ovitor`），如不是可改脚本或运行时传参：
     ```powershell
     # 用脚本默认值
     .\build-push.ps1

     # 或显式指定用户名和 tag（不修改脚本）
     .\build-push.ps1 -YourDockerhubUser <你的DockerHub用户名> -ImageName openclash-yaml-generator -Tag latest
     ```

   - **Linux / macOS Bash**：
     ```bash
     chmod +x build-push.sh
     ./build-push.sh <你的DockerHub用户名>   # 或直接 ./build-push.sh（默认 ovitor）
     ```

3. **方式 C-2：手写 docker build / tag / push 三命令（完全可控）**
   ```bash
   # 进入项目目录
   cd "clash - docker"

   # 1. 构建本地镜像
   docker build --pull --no-cache -t openclash-yaml-generator:latest .

   # 2. 打远程标签（替换为你自己的 Docker Hub 用户名）
   docker tag openclash-yaml-generator:latest <你的DockerHub用户名>/openclash-yaml-generator:latest

   # 3. 推送
   docker push <你的DockerHub用户名>/openclash-yaml-generator:latest
   ```

推送完成后，其他人即可使用：
```bash
docker run -d -p 7777:80 <你的DockerHub用户名>/openclash-yaml-generator:latest
```

---

### 方式二：Cloudflare Dashboard 在线部署（免费边缘计算，推荐新手）

> 此模式为项目原始形态，部署在 Cloudflare 全球边缘网络，**额外支持**：`/api/geo-lookup` 节点归属地跨域代理查询、可选绑定 KV 做累计访客统计。

1. **注册 / 登录 Cloudflare**
   访问 <https://dash.cloudflare.com> 并登录账号（无需绑定域名也可使用 `*.workers.dev` 子域）。

2. **创建 Worker**
   - 左侧菜单进入 **Workers & Pages** → 点击 **Create application** → **Create Worker**。
   - 给 Worker 起个名字（例如 `openclash-yaml`），点击 **Deploy** 创建占位 Worker。
   - 创建完成后点击 **Edit code** 进入在线编辑器。

3. **粘贴代码**
   - 打开本仓库的 [_worker.js](./_worker.js)，全选复制其全部内容。
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

### 方式三：Wrangler CLI 本地部署（推荐进阶）

1. **安装 Node.js**（18.x 或更高版本）：<https://nodejs.org/>

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
   将本仓库的 `_worker.js` 放到一个空目录中，并在同级目录新建 `wrangler.toml`：

   ```toml
   name = "openclash-yaml"
   main = "_worker.js"
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

## 🔧 环境变量与绑定（仅 Cloudflare Worker 模式）

| 名称 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `PAGE_VISITS` | KV Namespace | 否 | 用于存储 30 天独立访客计数。**未绑定时功能不报错**，仅在前台显示「未绑定KV」提示，其余功能正常。 |

> ✅ **Docker 自托管模式**：**不需要任何环境变量、Secrets、KV、数据库、R2 存储**。纯静态页面 + Nginx，所有配置写死在 `nginx.conf` 中。

---

## 📡 API 接口说明（仅 Cloudflare Worker 模式）

> ⚠️ 以下三个接口**仅在 Cloudflare Worker 部署模式下存在**。
> **Docker 自托管部署为纯静态页面，无后端 API**（`/` 仍然正常返回 HTML，`/api/*` 返回标准 Nginx 404，不会影响 YAML 生成功能）。

| 路径 | 方法 | 适用模式 | 说明 |
| --- | --- | --- | --- |
| `/` | GET | Worker + Docker | 返回主页面（OpenClash YAML 生成工具 UI）|
| `/api/visit` | GET | 仅 Worker | 返回当前访客 IP、国家、城市及累计独立访客数；首次访问会写入 KV 计数 |
| `/api/geo-lookup?host=<域名>&ctx=<上下文>` | GET | 仅 Worker | 节点归属地查询代理接口，解决前端直接调用 ip-api / ipinfo 会被 CORS 拦截的问题，返回中文化的国家 / 城市标签 |

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
