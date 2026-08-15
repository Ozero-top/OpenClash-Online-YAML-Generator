// Cloudflare Worker 部署入口
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 获取客户端真实 IP
    const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

    // 1. 提供异步获取 IP 与独立访问计数的 API
    if (url.pathname === "/api/visit") {
      let visitCount = 0;
      let kvBound = false;

      if (env && env.PAGE_VISITS) {
        kvBound = true;
        try {
          // 检查该 IP 是否已经访问过
          const hasVisited = await env.PAGE_VISITS.get(`ip:${clientIp}`);
          if (!hasVisited) {
            // 同一 IP 只记录一次：标记该 IP 已访问
            await env.PAGE_VISITS.put(`ip:${clientIp}`, "1");

            // 递增总独立访客数
            const currentCountStr = await env.PAGE_VISITS.get("total_unique_visitors");
            visitCount = (parseInt(currentCountStr || "0", 10)) + 1;
            await env.PAGE_VISITS.put("total_unique_visitors", visitCount.toString());
          } else {
            const currentCountStr = await env.PAGE_VISITS.get("total_unique_visitors");
            visitCount = parseInt(currentCountStr || "0", 10);
          }
        } catch (e) {
          console.error("KV 读写异常:", e);
        }
      }

      return new Response(JSON.stringify({
        ip: clientIp,
        visitCount: visitCount,
        kvBound: kvBound
      }), {
        headers: { "Content-Type": "application/json;charset=UTF-8" }
      });
    }

    // 2. 返回 HTML 页面
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title> Clash YAML配置文件一键生成工具 </title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif; padding: 20px; background-color: #f0f2f5; color: #333; }
        .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        
        .header-title-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e8eaed; padding-bottom: 10px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
        .header-title-container h2 { margin: 0; color: #1a73e8; font-size: 20px; border-bottom: none; padding-bottom: 0; }
        .header-right-tools { display: flex; align-items: center; gap: 12px; }
        
        .ip-stats-badge { background: #f0f4f9; border: 1px solid #d2e3fc; color: #1a73e8; padding: 4px 10px; border-radius: 6px; font-size: 12px; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; }
        .ip-stats-badge strong { color: #1557b0; }
        
        .github-link { color: #333; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: color 0.2s; }
        .github-link:hover { color: #1a73e8; }
        
        .section-header-box { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
        .section-title { font-weight: bold; font-size: 15px; color: #1a73e8; border-left: 4px solid #1a73e8; padding-left: 8px; margin: 0; }
        .download-btn-link { font-size: 12px; font-weight: bold; color: #1a73e8; background: #e8f0fe; padding: 4px 10px; border-radius: 6px; text-decoration: none; border: 1px solid #d2e3fc; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
        .download-btn-link:hover { background: #1a73e8; color: #ffffff; border-color: #1a73e8; }

        label { font-weight: 600; display: block; margin-top: 10px; margin-bottom: 4px; font-size: 13px; color: #444; }
        textarea, input[type="text"], input[type="number"], select { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #dadce0; border-radius: 6px; font-family: inherit; font-size: 13px; }
        textarea:focus, input:focus, select:focus { border-color: #1a73e8; outline: none; }
        .row { display: flex; gap: 12px; }
        .row > div { flex: 1; }
        
        .mode-btn-group { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
        .mode-btn { flex: 1; min-width: 180px; padding: 10px 15px; border: 2px solid #1a73e8; background: #fff; color: #1a73e8; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; transition: all 0.2s; text-align: center; }
        .mode-btn.active { background: #1a73e8; color: white; }
        .mode-btn:hover:not(.active) { background: #e8f0fe; }

        .mode-desc-box { background: #f8f9fa; border: 1px solid #d2e3fc; border-radius: 8px; padding: 12px 15px; margin-bottom: 20px; color: #174ea6; font-size: 13px; line-height: 1.6; }

        .btn-group { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
        .btn-main { flex: 2; min-width: 180px; padding: 12px; background-color: #1a73e8; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; font-weight: bold; transition: background 0.2s; }
        .btn-main:hover { background-color: #1557b0; }
        .btn-refresh { flex: 1; min-width: 130px; padding: 12px; background-color: #ff9800; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; font-weight: bold; transition: background 0.2s; }
        .btn-refresh:hover { background-color: #e68a00; }
        .btn-sub { flex: 1; min-width: 130px; padding: 12px; background-color: #34a853; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; font-weight: bold; transition: background 0.2s; }
        .btn-sub:hover { background-color: #2d8e47; }
        
        .output-box { background: #1e1e1e; color: #4af626; padding: 15px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; word-break: break-all; margin-top: 15px; white-space: pre; font-size: 12px; max-height: 500px; overflow-y: auto; border: 1px solid #333; }
        .tag { background: #e8f0fe; color: #1a73e8; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: normal; margin-left: 6px; }
        .tip-tag { background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: normal; margin-left: 6px; border: 1px solid #ffeeba; }
        .status { margin-top: 10px; font-weight: bold; font-size: 13px; color: #34a853; text-align: center; }

        .node-card { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 15px; margin-bottom: 12px; position: relative; }
        .node-card .btn-card-actions { position: absolute; right: 12px; top: 10px; display: flex; gap: 6px; }
        .node-card .btn-action { border: none; border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 12px; color: white; }
        .btn-clear { background: #ffc107; color: #000 !important; }
        .btn-remove { background: #dc3545; }
        .btn-lookup { background: #17a2b8; }
        .btn-add-node { background: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin-bottom: 10px; }
        .btn-add-node:hover { background: #5a6268; }
        
        .mode-section { display: none; }
        .mode-section.active-section { display: block; }
    </style>
</head>
<body>

<div class="container">
    <div class="header-title-container">
        <h2>⚡ Clash YAML配置文件一键生成工具</h2>
        <div class="header-right-tools">
            <div class="ip-stats-badge" id="ipStatsBadge">
                🌐 当前访问IP: <strong id="userIp">加载中...</strong> | 👁️ 累计访客数: <strong id="visitCount">...</strong>
            </div>
            <a href="https://github.com/Ozero-top/OpenClash-Online-YAML-Generator" target="_blank" rel="noopener noreferrer" class="github-link" title="访问 GitHub 开源项目">
                <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </a>
        </div>
    </div>

    <div class="section-header-box">
        <div class="section-title">生成模式与实用工具选择</div>
        <a href="https://github.com/Ozero-top/OpenClash-Config/tree/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6" target="_blank" rel="noopener noreferrer" class="download-btn-link">
            📥 下载OpenClash插件配置文件
        </a>
    </div>
    <div class="mode-btn-group">
        <button id="btn-mode-chain-single" class="mode-btn active" onclick="switchMode('chain-single')">🔲 链式代理 - 独立节点</button>
        <button id="btn-mode-chain-bulk" class="mode-btn" onclick="switchMode('chain-bulk')">📑 链式代理 - 批量粘贴</button>
        <button id="btn-mode-standard" class="mode-btn" onclick="switchMode('standard')">🌐 自动分流 - 家用模式</button>
        <button id="btn-mode-sk-convert" class="mode-btn" onclick="switchMode('sk-convert')">🛠️ Socks5 / SK 格式转换</button>
    </div>

    <div id="modeDescBox" class="mode-desc-box"></div>
    
    <div id="chainConfigSection">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">1. 前置中转代理订阅配置</div>
        <div class="row">
            <div style="flex: 1;">
                <label for="chainSubName">主力机场自定义名称:</label>
                <input type="text" id="chainSubName" value="主力机场" placeholder="自定义名称（默认：主力机场）">
            </div>
            <div style="flex: 2;">
                <label for="subUrl">主力中转代理订阅地址 (url):</label>
                <input type="text" id="subUrl" value="https://your-sub-domain.com/link/token">
            </div>
        </div>

        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">2. 前置中转与规则匹配方式</div>
        <div class="row" style="margin-bottom: 10px;">
            <div>
                <label for="ruleTargetType">匹配模式 / 分流对象范围:</label>
                <select id="ruleTargetType" onchange="toggleIpInputs()">
                    <option value="subnet" selected>🌐 网段匹配 (例如 192.168.11.0/24 - 适合多 WiFi 隔离)</option>
                    <option value="singleIp">📱 指定设备单 IP (例如 192.168.11.101/32 - 适合同 WiFi 下单设备分流)</option>
                </select>
            </div>
            <div>
                <label for="dialerProxy">前置中转策略组 (dialer-proxy):</label>
                <select id="dialerProxy">
                    <option value="所有-手动" selected>所有-手动</option>
                    <option value="所有-自动">所有-自动</option>
                    <option value="直连">直连</option>
                </select>
            </div>
        </div>

        <div class="row">
            <div id="subnetBlock1">
                <label for="startIp">起始网段 (192.168.X.0/24 中 X):<span class="tag">如 11 则从 .11 开始</span></label>
                <input type="number" id="startIp" value="11" min="1" max="254">
            </div>
            <div id="subnetBlock2">
                <label for="startWifi">起始 WiFi 编号:<span class="tag">如 1 则从 WiFi001 开始</span></label>
                <input type="number" id="startWifi" value="1" min="1" max="999">
            </div>
            
            <div id="singleIpBlock1" style="display: none;">
                <label for="targetIpPrefix">设备 IP 前缀/网段基础:<span class="tag">例如 192.168.11</span></label>
                <input type="text" id="targetIpPrefix" value="192.168.11">
            </div>
            <div id="singleIpBlock2" style="display: none;">
                <label for="startIpHost">起始主机 IP (末位数字):<span class="tag">如 101，则第1个节点匹配 .101/32</span></label>
                <input type="number" id="startIpHost" value="101" min="1" max="254">
            </div>
        </div>

        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">3. 节点配置</div>
        
        <div id="singleContainer" class="mode-section active-section">
            <div id="nodesContainer"></div>
            <button class="btn-add-node" onclick="addNodeCard()">➕ 增加一个节点输入框</button>
        </div>

        <div id="bulkContainer" class="mode-section">
            <div style="margin-bottom: 8px; overflow: hidden;">
                <span style="font-size: 13px; color: #666; font-weight: bold;">💡 系统将根据备注/域名/IP 自动识别国家地区，若识别不出来会显示“通用”</span>
                <button class="btn-action btn-clear" onclick="clearBulkText()" style="float: right; padding: 6px 12px;">🧹 清空批量输入框</button>
            </div>
            <label for="bulkLinks">批量节点协议链接 (每行一个，支持 vless / vmess / trojan / hysteria2 / socks5):</label>
            <textarea id="bulkLinks" rows="8" placeholder="在此处粘贴多行节点链接，一行一个链接..."></textarea>
        </div>
    </div>

    <div id="standardConfigSection" class="mode-section">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">🌐 自动分流代理订阅配置 </div>
        <div class="row">
            <div style="flex: 1;">
                <label for="stdSubName1">主力机场自定义名称:</label>
                <input type="text" id="stdSubName1" value="主力机场" placeholder="自定义名称（默认：主力机场）">
            </div>
            <div style="flex: 2;">
                <label for="stdSubUrl1">主力代理订阅地址 (url):</label>
                <input type="text" id="stdSubUrl1" value="https://your-main-sub-domain.com/link/token">
            </div>
        </div>
        <div class="row" style="margin-top: 10px;">
            <div>
                <label>
                    <input type="checkbox" id="enableBackupSub" onchange="toggleBackupSubInput()"> 启用备用代理聚合 (双订阅链接地址模式)
                </label>
            </div>
        </div>
        <div class="row" id="backupSubRow" style="display: none; margin-top: 8px;">
            <div style="flex: 1;">
                <label for="stdSubName2">备用机场自定义名称:</label>
                <input type="text" id="stdSubName2" value="备用机场" placeholder="自定义名称（默认：备用机场）">
            </div>
            <div style="flex: 2;">
                <label for="stdSubUrl2">备用代理订阅地址 (url):</label>
                <input type="text" id="stdSubUrl2" value="https://your-backup-sub-domain.com/link/token">
            </div>
        </div>
    </div>

    <div id="skConvertSection" class="mode-section">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">🛠️ IP|端口|账号|密码 批量转 Socks5 链接</div>
        <div style="margin-bottom: 12px;">
            <label for="skInputData">输入原始数据（格式：IP|端口|账号|密码 或 域名|端口|账号|密码）：</label>
            <textarea id="skInputData" rows="6" placeholder="示例格式：&#10;sk.admin.com|10002|aaBBcc|12345678abcdefg&#10;192.168.1.100|1080|user1|pass123"></textarea>
        </div>

        <div class="btn-group" style="margin-top: 10px; margin-bottom: 15px;">
            <button class="btn-main" onclick="convertSkFormat()">⚡ 开始批量转换</button>
            <button class="btn-sub" onclick="copySkOutput()">📋 复制转换结果</button>
            <button class="btn-refresh" onclick="clearSkText()">🧹 清空文本</button>
        </div>

        <div>
            <label for="skOutputData">转换后的标准 Socks5 格式：</label>
            <textarea id="skOutputData" rows="6" placeholder="转换结果将显示在这里..."></textarea>
            <div class="hint" style="font-size: 12px; color: #909399; margin-top: 5px;">
                支持标准格式：<code>socks5://账号:密码@IP:端口</code>，转换后可直接粘贴至上方“链式代理 - 批量粘贴”模式中使用。
            </div>
        </div>
    </div>

    <div class="btn-group" id="clashBtnGroup">
        <button class="btn-main" onclick="generateYaml(true)">🚀 生成并自动下载完整YAML文件</button>
        <button class="btn-refresh" onclick="reloadPage()">🔄 刷新网页重置</button>
        <button class="btn-sub" onclick="downloadYaml()">💾 直接另存为 config.yaml</button>
    </div>

    <div id="statusMsg" class="status"></div>

    <div id="clashOutputSection">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">📄 完整 YAML 预览区</div>
        <div id="out-full" class="output-box">点击生成按钮后查看...</div>
    </div>
</div>

<script>
let lastGeneratedYaml = "";
let nodeCount = 0;
let currentMode = "chain-single";

const guideUrl = "https://github.com/Ozero-top/OpenClash-Config/blob/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md";
const guideLinkHtml = \`<a href="\${guideUrl}" target="_blank" rel="noopener noreferrer" style="color: #1a73e8; text-decoration: underline;">使用指南</a>\`;

const modeDescriptions = {
    'chain-single': \`🔲 链式代理 - 独立节点输入模式：允许用户通过独立的表单卡片逐个输入或粘贴前置中转代理节点，支持为每个节点单独指定或自动识别国家/地区标签，并结合网段或指定单 IP 进行精准分流。&#10;⚠️ 注意：clash运行该yaml文件后，无需任何设置即可按照前面 网段匹配 或 指定设备单 IP 配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的 所有 - 手动 选择延时最低节点作为前置中转；其他策略组对 网段匹配 或 指定设备单 IP 无任何影响；仅作用于 OpenWRT软路由 非 网段匹配 或 指定设备单 IP 的设备；可自动分流，WebRTC/DNS防泄漏 （分流/防泄漏前提要自行配置clash插件 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明 )\`,
    'chain-bulk': \`📑 链式代理 - 批量混合粘贴模式：支持在多行文本框中批量粘贴多种协议的节点链接（如 vless、vmess、trojan、hysteria2、socks5），系统会自动解析并批量匹配国家/地区，快速生成链式代理配置文件。&#10;⚠️ 注意：clash运行该yaml文件后，无需任何设置即可按照前面 网段匹配 或 指定设备单 IP 配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的 所有 - 手动 选择延时最低节点作为前置中转；其他策略组对 网段匹配 或 指定设备单 IP 无任何影响；仅作用于 OpenWRT软路由 非 网段匹配 或 指定设备单 IP 的设备；可自动分流，WebRTC/DNS防泄漏 （分流/防泄漏前提要自行配置clash插件 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明 )\`,
    'standard': \`🌐 自动分流 - 单/双代理订阅家用模式 (V0.2.5)：面向日常或家用场景，支持配置单机场或双机场（主力+备用）订阅地址，自动聚合节点并提供全自动区域流控、延迟优化与丰富的主流分流规则。同时兼顾DNS防泄漏和WebRTC防泄漏。&#10;⚠️ 注意：clash运行该yaml文件后，可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组，根据使用需求自行设置；除 直连、拒绝 策略组，其他策略组均是自动切换最低延时节点；可手动选择，但会在3-6小时后自动切换到延时最低节点。【分流/防泄漏前提要自行配置clash插件】 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明\`,
    'sk-convert': '🛠️ Socks5 / SK 格式转换工具：提供独立的格式批量转换服务，将“IP|端口|账号|密码”格式转换为标准的 socks5:// 协议链接。转换结果可直接复制，用于链式代理或其他代理软件。'
};

const countryCodeToCn = {
    "US": "美国", "HK": "香港", "TW": "台湾", "JP": "日本", "SG": "新加坡",
    "KR": "韩国", "GB": "英国", "DE": "德国", "FR": "法国", "CA": "加拿大",
    "AU": "澳大利亚", "RU": "俄罗斯", "IN": "印度", "NL": "荷兰", "MY": "马来西亚",
    "TH": "泰国", "VN": "越南", "PH": "菲律宾", "ID": "印度尼西亚", "TR": "土耳其"
};

const commonCountries = ["香港", "台湾", "日本", "新加坡", "韩国", "美国", "英国", "德国", "通用"];

window.onload = function() {
    loadVisitorStats();
    switchMode('chain-single');
    addNodeCard("vless://c3008ec6-3ce2-4bc9-9f1b-6c3ac961b9d3@8.8.8.8:443?type=tcp&security=reality&pbk=1Xm9plKrtXaz78298LKoWDFZBxC2zkY5mn23CFR4pLp5&sid=aa1bba77&fp=chrome&sni=www.apple.com#美国01");
    addNodeCard("socks5://user:pass@8.8.8.8:1080#美国02");
};

async function loadVisitorStats() {
    try {
        const res = await fetch('/api/visit');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('userIp').innerText = data.ip || '未知';
            if (data.kvBound) {
                document.getElementById('visitCount').innerText = data.visitCount;
            } else {
                document.getElementById('visitCount').innerText = '未绑定KV';
                document.getElementById('visitCount').title = '在 Worker 设置中绑定 PAGE_VISITS KV 命名空间即可开启计数';
            }
        }
    } catch (e) {
        console.warn('获取访问统计失败:', e);
        document.getElementById('userIp').innerText = '未知';
        document.getElementById('visitCount').innerText = '未获取';
    }
}

function isIPv4(str) {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str);
}

function extractHostFromLink(link) {
    if (!link) return "";
    try {
        let raw = link.trim();
        if (raw.startsWith("vmess://")) {
            const b64 = raw.replace('vmess://', '');
            const jsonStr = decodeBase64Utf8(b64);
            const vmess = JSON.parse(jsonStr);
            return vmess.add || "";
        }
        raw = raw.replace('hy2://', 'hysteria2://').replace('trojan-go://', 'trojan://');
        const url = new URL(raw);
        return url.hostname || "";
    } catch (e) {
        return "";
    }
}

function detectCountryFromText(textToSearch) {
    if (!textToSearch) return null;
    if (/香港|广港|HK|Hong\s*Kong|🇭🇰/i.test(textToSearch)) return "香港";
    if (/台湾|台灣|广台|TW|Taiwan|Tai\s*Wan|🇹🇼/i.test(textToSearch)) return "台湾";
    if (/日本|广日|川日|泉日|沪日|深日|JP|Japan|Tokyo|Osaka|东京|大阪|埼玉|🇯🇵/i.test(textToSearch)) return "日本";
    if (/新加坡|广新|坡|狮城|SG|Singapore|🇸🇬/i.test(textToSearch)) return "新加坡";
    if (/韩国|韓國|广韩|KR|Korea|Seoul|首尔|春川|🇰🇷/i.test(textToSearch)) return "韩国";
    if (/美国|美|广美|US|United\s*States|America|洛杉矶|纽约|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|圣何塞|圣克拉拉|西雅图|芝加哥|阿什本|圣迭戈|硅谷|🇺🇸/i.test(textToSearch)) return "美国";
    if (/英国|英|UK|United\s*Kingdom|London|伦敦|🇬🇧/i.test(textToSearch)) return "英国";
    if (/德国|德|DE|Germany|🇩🇪/i.test(textToSearch)) return "德国";
    return null;
}

async function fetchCountryByHost(host) {
    if (!host) return "通用";
    let ip = host;
    if (!isIPv4(host)) {
        try {
            const dnsRes = await fetch(\`https://1.1.1.1/dns-query?name=\${encodeURIComponent(host)}&type=A\`, {
                headers: { 'accept': 'application/dns-json' }
            });
            const dnsData = await dnsRes.json();
            if (dnsData.Answer && dnsData.Answer.length > 0) {
                const aRecord = dnsData.Answer.find(ans => ans.type === 1);
                if (aRecord) ip = aRecord.data;
            }
        } catch (e) {
            console.warn("DNS 解析失败:", e);
        }
    }
    if (!isIPv4(ip)) return "通用";
    try {
        const geoRes = await fetch(\`https://ip-api.com/json/\${ip}?fields=countryCode,country\`);
        const geoData = await geoRes.json();
        if (geoData && geoData.countryCode) {
            const code = geoData.countryCode.toUpperCase();
            return countryCodeToCn[code] || geoData.country || "通用";
        }
    } catch (e) {
        console.warn("IP 地理查询失败:", e);
    }
    return "通用";
}

async function resolveCountryFromLink(link) {
    if (!link) return "通用";
    let textToSearch = link;
    try { textToSearch = decodeURIComponent(link); } catch(e) {}
    const localResult = detectCountryFromText(textToSearch);
    if (localResult) return localResult;
    const host = extractHostFromLink(link);
    if (host) {
        return await fetchCountryByHost(host);
    }
    return "通用";
}

function reloadPage() {
    window.location.reload();
}

function switchMode(mode) {
    currentMode = mode;
    const chainConfigSection = document.getElementById('chainConfigSection');
    const standardConfigSection = document.getElementById('standardConfigSection');
    const skConvertSection = document.getElementById('skConvertSection');
    const singleContainer = document.getElementById('singleContainer');
    const bulkContainer = document.getElementById('bulkContainer');
    const modeDescBox = document.getElementById('modeDescBox');

    const clashBtnGroup = document.getElementById('clashBtnGroup');
    const clashOutputSection = document.getElementById('clashOutputSection');
    const statusMsg = document.getElementById('statusMsg');

    const btnChainSingle = document.getElementById('btn-mode-chain-single');
    const btnChainBulk = document.getElementById('btn-mode-chain-bulk');
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnSkConvert = document.getElementById('btn-mode-sk-convert');

    btnChainSingle.classList.remove('active');
    btnChainBulk.classList.remove('active');
    btnStandard.classList.remove('active');
    btnSkConvert.classList.remove('active');

    if (modeDescriptions[mode]) {
        modeDescBox.innerHTML = modeDescriptions[mode];
    }

    if (mode === 'sk-convert') {
        chainConfigSection.style.display = 'none';
        standardConfigSection.style.display = 'none';
        skConvertSection.style.display = 'block';
        clashBtnGroup.style.display = 'none';
        clashOutputSection.style.display = 'none';
        statusMsg.innerText = '';
        btnSkConvert.classList.add('active');
    } else {
        skConvertSection.style.display = 'none';
        clashBtnGroup.style.display = 'flex';
        clashOutputSection.style.display = 'block';

        if (mode === 'chain-single') {
            chainConfigSection.style.display = 'block';
            standardConfigSection.style.display = 'none';
            singleContainer.classList.add('active-section');
            bulkContainer.classList.remove('active-section');
            btnChainSingle.classList.add('active');
        } else if (mode === 'chain-bulk') {
            chainConfigSection.style.display = 'block';
            standardConfigSection.style.display = 'none';
            singleContainer.classList.remove('active-section');
            bulkContainer.classList.add('active-section');
            btnChainBulk.classList.add('active');
        } else if (mode === 'standard') {
            chainConfigSection.style.display = 'none';
            standardConfigSection.style.display = 'block';
            btnStandard.classList.add('active');
        }
    }
}

function convertSkFormat() {
    const input = document.getElementById('skInputData').value.trim();
    if (!input) {
        alert('请输入需要转换的数据！');
        return;
    }

    const lines = input.split('\\n');
    const results = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const parts = line.split('|');
        if (parts.length >= 4) {
            const host = parts[0].trim();
            const port = parts[1].trim();
            const user = parts[2].trim();
            const pass = parts[3].trim();

            const formatted = \`socks5://\${user}:\${pass}@\${host}:\${port}\`;
            results.push(formatted);
        } else {
            results.push(\`// 格式错误或不完整: \${line}\`);
        }
    }

    document.getElementById('skOutputData').value = results.join('\\n');
}

function clearSkText() {
    document.getElementById('skInputData').value = '';
    document.getElementById('skOutputData').value = '';
}

function copySkOutput() {
    const outputText = document.getElementById('skOutputData').value.trim();
    if (!outputText) {
        alert('暂无可复制的转换结果！');
        return;
    }
    navigator.clipboard.writeText(outputText).then(() => {
        alert('转换结果已成功复制到剪贴板！');
    }).catch(err => {
        const textarea = document.getElementById('skOutputData');
        textarea.select();
        document.execCommand('copy');
        alert('已复制到剪贴板！');
    });
}

function toggleBackupSubInput() {
    const isChecked = document.getElementById('enableBackupSub').checked;
    document.getElementById('backupSubRow').style.display = isChecked ? 'flex' : 'none';
}

function toggleIpInputs() {
    const targetType = document.getElementById('ruleTargetType').value;
    const subnetBlock1 = document.getElementById('subnetBlock1');
    const subnetBlock2 = document.getElementById('subnetBlock2');
    const singleIpBlock1 = document.getElementById('singleIpBlock1');
    const singleIpBlock2 = document.getElementById('singleIpBlock2');

    if (targetType === 'singleIp') {
        subnetBlock1.style.display = 'none';
        subnetBlock2.style.display = 'none';
        singleIpBlock1.style.display = 'block';
        singleIpBlock2.style.display = 'block';
    } else {
        subnetBlock1.style.display = 'block';
        subnetBlock2.style.display = 'block';
        singleIpBlock1.style.display = 'none';
        singleIpBlock2.style.display = 'none';
    }
}

function addNodeCard(defaultLink = "") {
    nodeCount++;
    const container = document.getElementById('nodesContainer');
    const card = document.createElement('div');
    card.className = 'node-card';
    card.id = \`node-card-\${nodeCount}\`;

    let optionsHtml = '';
    commonCountries.forEach(c => {
        optionsHtml += \`<option value="\${c}">\${c}</option>\`;
    });

    card.innerHTML = \`
        <div class="btn-card-actions">
            <button class="btn-action btn-lookup" onclick="manualLookupCard(\${nodeCount})">🔍 联网查询</button>
            <button class="btn-action btn-clear" onclick="clearNodeText('node-link-\${nodeCount}', 'node-country-\${nodeCount}', \${nodeCount})">🧹 清空</button>
            <button class="btn-action btn-remove" onclick="removeNodeCard('node-card-\${nodeCount}')">✕ 删除</button>
        </div>
        <div class="row" style="margin-bottom: 8px;">
            <div style="flex: 1;">
                <label>国家 / 地区标签 <span class="tag" id="node-tag-\${nodeCount}">🤖 自动识别</span><span class="tip-tag">⚠️ 显示“通用”可直接下拉选择，或直接输入自定义名称</span>:</label>
                <div style="display: flex; gap: 8px;">
                    <select id="node-country-\${nodeCount}" class="node-country" onchange="markUserEdited(\${nodeCount})" style="flex: 1;">
                        \${optionsHtml}
                    </select>
                </div>
            </div>
        </div>
        <div>
            <label>节点协议链接 (支持 vless / vmess / trojan / hysteria2 / socks5):</label>
            <textarea id="node-link-\${nodeCount}" class="node-link" rows="2" placeholder="粘贴单个节点的协议链接..." oninput="updateCardCountry(this, \${nodeCount})">\${defaultLink}</textarea>
        </div>
    \`;
    container.appendChild(card);
    if (defaultLink) {
        updateCardCountry(card.querySelector('.node-link'), nodeCount);
    } else {
        document.getElementById(\`node-country-\${nodeCount}\`).value = "通用";
    }
}

function markUserEdited(id) {
    const countrySelect = document.getElementById(\`node-country-\${id}\`);
    const tag = document.getElementById(\`node-tag-\${id}\`);
    if (countrySelect) countrySelect.dataset.userEdited = "true";
    if (tag) tag.innerText = "✍️ 手动指定";
}

async function updateCardCountry(textarea, id) {
    const countrySelect = document.getElementById(\`node-country-\${id}\`);
    const tag = document.getElementById(\`node-tag-\${id}\`);
    if (countrySelect && countrySelect.dataset.userEdited === "true") return;

    const val = textarea.value.trim();
    if (!val) {
        if (countrySelect) countrySelect.value = "通用";
        if (tag) tag.innerText = "🤖 自动识别";
        return;
    }

    if (tag) tag.innerText = "⏳ 查询中...";
    const res = await resolveCountryFromLink(val);
    if (countrySelect && countrySelect.dataset.userEdited !== "true") {
        let optionExists = Array.from(countrySelect.options).some(opt => opt.value === res);
        if (!optionExists) {
            let newOpt = document.createElement('option');
            newOpt.value = res;
            newOpt.text = res;
            countrySelect.add(newOpt);
        }
        countrySelect.value = res;
        if (tag) tag.innerText = "🤖 自动识别";
    }
}

async function manualLookupCard(id) {
    const textarea = document.getElementById(\`node-link-\${id}\`);
    const countrySelect = document.getElementById(\`node-country-\${id}\`);
    if (countrySelect) delete countrySelect.dataset.userEdited;
    if (textarea) await updateCardCountry(textarea, id);
}

function removeNodeCard(id) {
    const card = document.getElementById(id);
    if (card) card.remove();
}

function clearNodeText(textareaId, countryInputId, id) {
    const el = document.getElementById(textareaId);
    if (el) el.value = "";
    const cel = document.getElementById(countryInputId);
    if (cel) {
        cel.value = "通用";
        delete cel.dataset.userEdited;
    }
    const tag = document.getElementById(\`node-tag-\${id}\`);
    if (tag) tag.innerText = "🤖 自动识别";
}

function clearBulkText() {
    document.getElementById('bulkLinks').value = "";
}

function parseVless(link) {
    const url = new URL(link);
    const params = new URLSearchParams(url.search);
    const proxy = { name: "", type: "vless", server: url.hostname, port: parseInt(url.port || "443", 10), uuid: url.username, udp: true };
    if (params.get('flow')) proxy.flow = params.get('flow');
    const security = params.get('security') || 'none';
    if (security === 'tls' || security === 'reality') {
        proxy.tls = true;
        const sni = params.get('sni') || params.get('host');
        if (sni) proxy.servername = sni;
        if (params.get('fp')) proxy['client-fingerprint'] = params.get('fp');
    }
    if (security === 'reality') {
        proxy['reality-opts'] = {};
        if (params.get('pbk')) proxy['reality-opts']['public-key'] = params.get('pbk');
        if (params.get('sid')) proxy['reality-opts']['short-id'] = params.get('sid');
    }
    const type = params.get('type') || 'tcp';
    if (type === 'ws') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {};
        if (params.get('path')) proxy['ws-opts'].path = params.get('path');
        if (params.get('host')) proxy['ws-opts'].headers = { Host: params.get('host') };
    } else if (type === 'grpc') {
        proxy.network = 'grpc';
        proxy['grpc-opts'] = {};
        const serviceName = params.get('serviceName') || params.get('servicename');
        if (serviceName) proxy['grpc-opts']['grpc-service-name'] = serviceName;
    }
    return proxy;
}

function parseVmess(link) {
    const b64 = link.replace('vmess://', '');
    const jsonStr = decodeBase64Utf8(b64);
    const vmess = JSON.parse(jsonStr);
    const proxy = { name: "", type: 'vmess', server: vmess.add, port: parseInt(vmess.port, 10), uuid: vmess.id, alterId: parseInt(vmess.aid || '0', 10), cipher: vmess.scy || 'auto', udp: true };
    if (vmess.tls === 'tls') { proxy.tls = true; if (vmess.sni) proxy.servername = vmess.sni; }
    const net = vmess.net || 'tcp';
    if (net === 'ws') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {};
        if (vmess.path) proxy['ws-opts'].path = vmess.path;
        if (vmess.host) proxy['ws-opts'].headers = { Host: vmess.host };
    } else if (net === 'grpc') {
        proxy.network = 'grpc';
        proxy['grpc-opts'] = {};
        if (vmess.path) proxy['grpc-opts']['grpc-service-name'] = vmess.path;
    }
    return proxy;
}

function parseTrojan(link) {
    const raw = link.replace('trojan-go://', 'trojan://');
    const url = new URL(raw);
    const params = new URLSearchParams(url.search);
    const proxy = { name: "", type: 'trojan', server: url.hostname, port: parseInt(url.port || '443', 10), password: url.username, udp: true };
    if (params.get('sni') || params.get('peer')) proxy.sni = params.get('sni') || params.get('peer');
    if (params.get('type') === 'ws') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {};
        if (params.get('path')) proxy['ws-opts'].path = params.get('path');
        if (params.get('host')) proxy['ws-opts'].headers = { Host: params.get('host') };
    }
    return proxy;
}

function parseHysteria2(link) {
    const raw = link.replace('hy2://', 'hysteria2://');
    const url = new URL(raw);
    const params = new URLSearchParams(url.search);
    const proxy = { name: "", type: 'hysteria2', server: url.hostname, port: parseInt(url.port || '443', 10), auth: url.username || url.password, up: "100 Mbps", down: "500 Mbps" };
    if (params.get('sni')) proxy.sni = params.get('sni');
    if (params.get('obfs')) {
        proxy.obfs = params.get('obfs');
        if (params.get('obfs-password')) proxy['obfs-password'] = params.get('obfs-password');
    }
    return proxy;
}

function parseSocks5(link) {
    const url = new URL(link);
    const proxy = { name: "", type: 'socks5', server: url.hostname, port: parseInt(url.port || '1080', 10), udp: true };
    if (url.username) proxy.username = url.username;
    if (url.password) proxy.password = url.password;
    return proxy;
}

function decodeBase64Utf8(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function formatInlineYaml(obj) {
    const parts = [];
    for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'object' && val !== null) {
            parts.push(\`\${key}: \${formatInlineYaml(val)}\`);
        } else if (typeof val === 'boolean' || typeof val === 'number') {
            parts.push(\`\${key}: \${val}\`);
        } else {
            parts.push(\`\${key}: "\${val}"\`);
        }
    }
    return \`{\${parts.join(', ')}}\`;
}

async function downloadYaml() {
    if (!lastGeneratedYaml) {
        alert("请先点击生成配置文件！");
        return;
    }

    const defaultFilename = 'config.yaml';

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: 'YAML Configuration File',
                    accept: { 'text/yaml': ['.yaml', '.yml'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(lastGeneratedYaml);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }
            console.warn('File System Access API 不可用或失败，回退到传统下载:', err);
        }
    }

    const blob = new Blob([lastGeneratedYaml], { type: 'text/yaml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function generateYaml(autoDownload = false) {
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.innerText = "⏳ 正在生成配置文件，请稍等...";

    if (currentMode === 'standard') {
        const subName1 = document.getElementById('stdSubName1').value.trim() || '主力机场';
        const subUrl1 = document.getElementById('stdSubUrl1').value.trim() || 'https://your-main-sub-domain.com/link/token';
        const enableBackup = document.getElementById('enableBackupSub').checked;
        const subName2 = document.getElementById('stdSubName2').value.trim() || '备用机场';
        const subUrl2 = document.getElementById('stdSubUrl2').value.trim() || 'https://your-backup-sub-domain.com/link/token';

        let proxyProvidersBlock = \`  \${subName1}:
    url: "\${subUrl1}"
    type: http
    interval: 86400
    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离     
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 600
      timeout: 3000
      expected-status: 204
      lazy: true\`;

        let useProvidersForGroups = \`      - \${subName1}\`;

        if (enableBackup) {
            proxyProvidersBlock += \`\\n\\n  \${subName2}:
    url: "\${subUrl2}"
    type: http
    interval: 86400
    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离     
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 600
      timeout: 3000
      expected-status: 204
      lazy: true\`;
            useProvidersForGroups += \`\\n      - \${subName2}\`;
        }

        lastGeneratedYaml = 
\`# ====================================================================
# 配置名称：OpenClash 区域全自动流控与延迟优化 (\${enableBackup ? '双机场融合版' : '单机场标准版'})
# 版本号：V0.2.5 (生产环境推荐版)
# 内核要求：Mihomo (Meta) Kernel 专属
# ====================================================================

port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
tproxy-port: 7895

allow-lan: true
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
secret: "123456"
ipv6: true
unified-delay: true
tcp-concurrent: true

proxy-providers:
\${proxyProvidersBlock}
      
proxies:
  - {name: 直连, type: direct}
  - {name: 拒绝, type: reject}

dns:
  enable: true
  listen: 0.0.0.0:7874
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  respect-rules: true 
  fake-ip-filter-mode: blacklist
  fake-ip-filter:
    - +.lan
    - +.local
    - localhost
    - '*.localdomain'
    - 'peer.tampermonkey.net'
    - 'workgroup'
    - geosite:cn
    - +.msftconnecttest.com
    - +.msftncsi.com
    - +.gov.cn
    - +.12306.cn
    - +.chsi.com.cn
    - +.apple.com
    - +.icloud.com
    - +.baidu.com
    - +.amap.com
    - +.alipay.com
    - +.alipayobjects.com
    - +.wechat.com
    - +.wechatpay.cn
    - +.unionpay.com
    - +.95516.com
    - +.tenpay.com
    - +.95559.com.cn
    - +.95599.cn
    - +.abchina.com
    - +.icbc.com.cn
    - +.ccb.com
    - +.boc.cn
    - +.cmbchina.com

  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  
  proxy-server-nameserver:
    - 223.5.5.5
    - 119.29.29.29
    
  nameserver-policy:
    "geosite:cn,private":
      - 223.5.5.5
      - 119.29.29.29
      - https://dns.alidns.com/dns-query
      - https://doh.pub/dns-query
    "geosite:geolocation-!cn":
      - https://dns.google/dns-query
      - https://1.1.1.1/dns-query

  nameserver:
    - 223.5.5.5
    - 119.29.29.29

tun:
  enable: true
  stack: mixed
  device: utun
  auto-route: true
  auto-detect-interface: true
  auto-redirect: true
  strict-route: true

profile:
  store-selected: true
  store-fake-ip: true

default: &default
  type: select
  proxies:
    - 直连
    - 所有-自动          
    - 所有-手动
    - 香港-故转
    - 台湾-故转
    - 日本-故转
    - 新加坡-故转
    - 韩国-故转
    - 美国-故转
    - 英国-故转
    - 其他-故转
    - 拒绝

proxy-groups:
  - {name: ChatGPT, <<: *default}
  - {name: Gemini, <<: *default}
  - {name: Copilot, <<: *default}
  - {name: Perplexity, <<: *default}
  - {name: Claude, <<: *default}
  - {name: Meta AI, <<: *default}
  - {name: Grok, <<: *default}
  - {name: Groq, <<: *default}
  - {name: GitHub, <<: *default}
  - {name: Reddit, <<: *default}
  - {name: Telegram, <<: *default}
  - {name: WhatsApp, <<: *default}
  - {name: Facebook, <<: *default}
  - {name: BiliBili, <<: *default}
  - {name: YouTube, <<: *default}
  - {name: TikTok, <<: *default}
  - {name: Netflix, <<: *default}
  - {name: HBO, <<: *default}
  - {name: Disney, <<: *default}
  - {name: Amazon, <<: *default}
  - {name: Crunchyroll, <<: *default}
  - {name: Popcorn, <<: *default}
  - {name: Spotify, <<: *default}
  - {name: Nvidia, <<: *default}
  - {name: Steam, <<: *default}
  - {name: Games, <<: *default}
  - {name: Crypto, <<: *default}
  - {name: Apple, <<: *default}
  - {name: Google, <<: *default}
  - {name: Microsoft, <<: *default}
  - {name: Test, <<: *default}
  - {name: Block, <<: *default}
  - {name: 国外, <<: *default}
  - {name: 国内, <<: *default}
  - {name: 其他, <<: *default}
  
  - name: 所有-手动
    type: select
    use:
\${useProvidersForGroups}
    exclude-filter: "直连|拒绝"

  - name: 所有-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000          
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    exclude-filter: "直连|拒绝" 
    use-provider-health: true
    
  - name: 香港-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000          
    proxies:
      - 香港-自动          
      - 香港-手动
  - name: 香港-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"
  - name: 香港-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000          
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true                
    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"
    use-provider-health: true
 
  - name: 台湾-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 台湾-自动          
      - 台湾-手动
  - name: 台湾-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"
  - name: 台湾-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"
    use-provider-health: true

  - name: 日本-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 日本-自动          
      - 日本-手动
  - name: 日本-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"
  - name: 日本-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"
    use-provider-health: true

  - name: 新加坡-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 新加坡-自动        
      - 新加坡-手动
  - name: 新加坡-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"
  - name: 新加坡-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"
    use-provider-health: true

  - name: 韩国-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 韩国-自动          
      - 韩国-手动
  - name: 韩国-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"
  - name: 韩国-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"
    use-provider-health: true

  - name: 美国-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 美国-自动          
      - 美国-手动
  - name: 美国-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"
  - name: 美国-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"
    use-provider-health: true

  - name: 英国-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 英国-自动          
      - 英国-手动
  - name: 英国-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"
  - name: 英国-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"
    use-provider-health: true

  - name: 其他-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 其他-自动          
      - 其他-手动
  - name: 其他-手动
    type: select
    use:
\${useProvidersForGroups}
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
  - name: 其他-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 30
    lazy: true
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
    use-provider-health: true

rules:
  - AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT 
  - DOMAIN-KEYWORD,webrtc,REJECT
  - DOMAIN-KEYWORD,stun,REJECT
  - DOMAIN-SUFFIX,stun.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun1.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun2.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun3.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun4.l.google.com,REJECT  

  - DOMAIN-SUFFIX,tongdun.net,DIRECT
  - DOMAIN-SUFFIX,ishumei.com,DIRECT
  - DOMAIN-SUFFIX,geetest.com,DIRECT
  - DOMAIN-SUFFIX,dingxiangyun.com,DIRECT
  - DOMAIN-SUFFIX,unionpay.com,DIRECT
  - DOMAIN-SUFFIX,95516.com,DIRECT
  - DOMAIN-SUFFIX,alipay.com,DIRECT
  - DOMAIN-SUFFIX,wechat.com,DIRECT
  - DOMAIN-SUFFIX,wechatpay.cn,DIRECT
  - DOMAIN-SUFFIX,tenpay.com,DIRECT
  - DOMAIN-SUFFIX,gov.cn,DIRECT
  - DOMAIN-SUFFIX,12306.cn,DIRECT
  - DOMAIN-SUFFIX,chsi.com.cn,DIRECT
  - DOMAIN-SUFFIX,chinatax.gov.cn,DIRECT
  - DOMAIN-SUFFIX,mohrss.gov.cn,DIRECT
  - DOMAIN-SUFFIX,gwy.gov.cn,DIRECT
  - DOMAIN-SUFFIX,95559.com.cn,DIRECT
  - DOMAIN-SUFFIX,95599.cn,DIRECT
  - DOMAIN-SUFFIX,abchina.com,DIRECT
  - DOMAIN-SUFFIX,icbc.com.cn,DIRECT
  - DOMAIN-SUFFIX,ccb.com,DIRECT
  - DOMAIN-SUFFIX,boc.cn,DIRECT
  - DOMAIN-SUFFIX,cmbchina.com,DIRECT
  - DOMAIN-SUFFIX,citicbank.com,DIRECT
  - DOMAIN-SUFFIX,cib.com.cn,DIRECT
  - DOMAIN-SUFFIX,spdb.com.cn,DIRECT
  - DOMAIN-SUFFIX,cmbc.com.cn,DIRECT
  - DOMAIN-SUFFIX,cebbank.com,DIRECT
  - DOMAIN-SUFFIX,hxb.com.cn,DIRECT
  - DOMAIN-SUFFIX,psbc.com,DIRECT
  - DOMAIN-KEYWORD,bank,DIRECT

  - DOMAIN-SUFFIX,10086.cn,DIRECT
  - DOMAIN-SUFFIX,10010.com,DIRECT
  - DOMAIN-SUFFIX,189.cn,DIRECT
  - DOMAIN-SUFFIX,taobao.com,DIRECT
  - DOMAIN-SUFFIX,jd.com,DIRECT
  - DOMAIN-SUFFIX,douyin.com,DIRECT
  - DOMAIN-SUFFIX,bilibili.com,DIRECT
  - DOMAIN-SUFFIX,mi.com,DIRECT
  - DOMAIN-SUFFIX,midea.com,DIRECT
  - DOMAIN-SUFFIX,baidu.com,DIRECT
  - DOMAIN-SUFFIX,qq.com,DIRECT
  - DOMAIN-SUFFIX,meituan.com,DIRECT
  - DOMAIN-SUFFIX,dianping.com,DIRECT
  - DOMAIN-SUFFIX,amap.com,DIRECT
  - DOMAIN-SUFFIX,163.com,DIRECT
  - DOMAIN-SUFFIX,sohu.com,DIRECT
  - DOMAIN-SUFFIX,sina.com.cn,DIRECT
  - DOMAIN-SUFFIX,mi-img.com,DIRECT
  - DOMAIN-SUFFIX,aqara.com,DIRECT
  - DOMAIN-SUFFIX,tplinkcloud.com,DIRECT
  - DOMAIN-SUFFIX,heislands.com,DIRECT
  
  - RULE-SET,Test / Domain,Test
  - RULE-SET,Block / Domain,Block
  - RULE-SET,ChatGPT / Domain,ChatGPT
  - RULE-SET,Claude / Domain,Claude
  - RULE-SET,Meta AI / Domain,Meta AI
  - RULE-SET,Perplexity / Domain,Perplexity
  - RULE-SET,Copilot / Domain,Copilot
  - RULE-SET,Gemini / Domain,Gemini
  - RULE-SET,Groq / Domain,Groq
  - RULE-SET,Grok / Domain,Grok
  - RULE-SET,Reddit / Domain,Reddit
  - RULE-SET,GitHub / Domain,GitHub
  - RULE-SET,Telegram / Domain,Telegram
  - RULE-SET,Telegram / IP,Telegram,no-resolve
  - RULE-SET,WhatsApp / Domain,WhatsApp
  - RULE-SET,Facebook / Domain,Facebook
  - RULE-SET,Apple / Domain,Apple
  - RULE-SET,Apple-CN / Domain,Apple
  - RULE-SET,Microsoft / Domain,Microsoft
  - RULE-SET,OKX / Domain,Crypto
  - RULE-SET,Bybit / Domain,Crypto
  - RULE-SET,Binance / Domain,Crypto
  - RULE-SET,BiliBili / Domain,BiliBili
  - RULE-SET,YouTube / Domain,YouTube
  - RULE-SET,TikTok / Domain,TikTok
  - RULE-SET,Netflix / Domain,Netflix
  - RULE-SET,Netflix / IP,Netflix,no-resolve
  - DOMAIN-KEYWORD,netflix,Netflix
  - RULE-SET,Disney / Domain,Disney
  - RULE-SET,Amazon / Domain,Amazon
  - RULE-SET,Crunchyroll / Domain,Crunchyroll
  - RULE-SET,Popcorn / Domain,Popcorn
  - RULE-SET,HBO / Domain,HBO
  - RULE-SET,Spotify / Domain,Spotify
  - RULE-SET,Steam / Domain,Steam
  - RULE-SET,Epic / Domain,Games
  - RULE-SET,EA / Domain,Games
  - RULE-SET,Blizzard / Domain,Games
  - RULE-SET,UBI / Domain,Games
  - RULE-SET,PlayStation / Domain,Games
  - RULE-SET,Nintendo / Domain,Games
  - RULE-SET,Google / Domain,Google
  - RULE-SET,Google / IP,Google,no-resolve
  - RULE-SET,Nvidia / Domain,Nvidia
  - RULE-SET,Proxy / Domain,国外
  - RULE-SET,Globe / Domain,国外
  - RULE-SET,Direct / Domain,国内
  - RULE-SET,China / Domain,国内
  - RULE-SET,China / IP,国内,no-resolve
  - RULE-SET,Private / Domain,国内
  - MATCH,其他

rule-anchor:
  ip: &ip {type: http, interval: 86400, behavior: ipcidr, format: mrs}
  domain: &domain {type: http, interval: 86400, behavior: domain, format: mrs}
  class: &class {type: http, interval: 86400, behavior: classical, format: text}

rule-providers:
  Test / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Check.list"}
  ChatGPT / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/openai.mrs"}
  Claude / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Claude/Claude.list"}
  Meta AI / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/MetaAi.list"}
  Perplexity / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/perplexity.mrs"}
  Copilot / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Copilot.list"}
  Gemini / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/gemini.mrs"}
  GitHub / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/github.mrs"}
  Telegram / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/telegram.mrs"}
  Telegram / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/telegram.mrs"}
  WhatsApp / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Whatsapp/Whatsapp.list"}
  Facebook / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/facebook.mrs"}
  Amazon / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/amazon.mrs"}
  Apple-CN / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple-cn.mrs"}
  Apple / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple.mrs"}
  Microsoft / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/microsoft.mrs"}
  OKX / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/okx.mrs"}
  Bybit / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bybit.mrs"}
  Binance / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/binance.mrs"}
  TikTok / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/tiktok.mrs"}
  Netflix / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/netflix.mrs"}
  Netflix / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/netflix.mrs"}
  Disney / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/disney.mrs"}
  HBO / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/hbo.mrs"}
  Spotify / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/spotify.mrs"}
  Steam / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/steam.mrs"}
  Epic / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Epic/Epic.list"}
  EA / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/EA/EA.list"}
  Blizzard / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Blizzard/Blizzard.list"}
  UBI / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/UBI/UBI.list"}
  PlayStation / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/PlayStation/PlayStation.list"}
  Nintendo / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nintendo/Nintendo.list"}
  Proxy / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Proxy.list"}
  Globe / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Global/Global.list"}
  Block / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Block.list"}
  Nvidia / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nvidia/Nvidia.list"}
  Crunchyroll / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Crunchyroll.list"}
  Reddit / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/reddit.mrs"}
  Groq / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/groq.mrs"}
  Grok / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Grok.list"}
  Popcorn / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Popcorn.list"}
  Direct / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Direct.list"}
  Private / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/private.mrs"}
  China / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/cn.mrs"}
  China / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/cn.mrs"}
  YouTube / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/youtube.mrs"}
  Google / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/google.mrs"}
  Google / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/google.mrs"}
  BiliBili / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bilibili.mrs"}\`;

        document.getElementById('out-full').innerText = lastGeneratedYaml;
        statusMsg.innerText = \`✅ V0.2.5 标准分流配置文件已生成！\`;

        if (autoDownload) {
            await downloadYaml();
        }
    } else {
        const subName = document.getElementById('chainSubName').value.trim() || '主力机场';
        const subUrl = document.getElementById('subUrl').value.trim() || 'https://your-sub-domain.com/link/token';
        const ruleTargetType = document.getElementById('ruleTargetType').value;
        const dialerProxy = document.getElementById('dialerProxy').value;

        let currIpSubnet = parseInt(document.getElementById('startIp').value, 10) || 11;
        let currWifi = parseInt(document.getElementById('startWifi').value, 10) || 1;
        
        let ipPrefix = document.getElementById('targetIpPrefix').value.trim() || '192.168.11';
        let currIpHost = parseInt(document.getElementById('startIpHost').value, 10) || 101;

        let rawNodes = [];

        if (currentMode === 'chain-single') {
            const cards = document.querySelectorAll('.node-card');
            for (const card of cards) {
                const link = card.querySelector('.node-link').value.trim();
                if (!link) continue;
                const countrySelect = card.querySelector('.node-country');
                let country = countrySelect ? countrySelect.value.trim() : "通用";
                rawNodes.push({ link, country });
            }
        } else {
            const bulkText = document.getElementById('bulkLinks').value.trim();
            if (bulkText) {
                const lines = bulkText.split('\\n');
                for (const line of lines) {
                    const l = line.trim();
                    if (l) {
                        const country = await resolveCountryFromLink(l);
                        rawNodes.push({ link: l, country });
                    }
                }
            }
        }

        if (rawNodes.length === 0) {
            alert('请至少输入或粘贴一个有效的节点链接！');
            statusMsg.innerText = "";
            return;
        }

        let proxiesArr = [
            '  - {name: 直连, type: direct}',
            '  - {name: 拒绝, type: reject}'
        ];
        let residentialGroupProxies = [];
        let wifiSingleGroups = [];
        let rulesArr = [];

        let hasValidNode = false;

        for (const item of rawNodes) {
            const link = item.link;
            const country = item.country;

            try {
                let protoTag = 'Socks5';
                let proxyObj = null;

                if (link.startsWith('vless://')) { proxyObj = parseVless(link); protoTag = 'VLESS'; }
                else if (link.startsWith('vmess://')) { proxyObj = parseVmess(link); protoTag = 'VMess'; }
                else if (link.startsWith('trojan://') || link.startsWith('trojan-go://')) { proxyObj = parseTrojan(link); protoTag = 'Trojan'; }
                else if (link.startsWith('hysteria2://') || link.startsWith('hy2://')) { proxyObj = parseHysteria2(link); protoTag = 'Hy2'; }
                else if (link.startsWith('socks5://') || link.startsWith('socks://')) { proxyObj = parseSocks5(link); protoTag = 'Socks5'; }

                if (proxyObj) {
                    hasValidNode = true;
                    let targetCidr = '';
                    let groupSingleName = '';
                    let nodeName = '';

                    if (ruleTargetType === 'singleIp') {
                        targetCidr = \`\${ipPrefix}.\${currIpHost}/32\`;
                        groupSingleName = \`\${protoTag}-\${country}\`;
                        nodeName = \`住宅IP-\${protoTag}-\${country}-\${currIpHost}\`;
                        currIpHost++;
                    } else {
                        const wifiCode = 'WiFi' + String(currWifi).padStart(3, '0');
                        targetCidr = \`192.168.\${currIpSubnet}.0/24\`;
                        groupSingleName = \`\${protoTag}-\${country}-\${wifiCode}\`;
                        nodeName = \`住宅IP-\${protoTag}-\${country}-\${wifiCode}\`;
                        currIpSubnet++;
                        currWifi++;
                    }
                    
                    proxyObj.name = nodeName;
                    if (dialerProxy) proxyObj['dialer-proxy'] = dialerProxy;

                    proxiesArr.push(\`  - \${formatInlineYaml(proxyObj)}\`);
                    residentialGroupProxies.push(\`      - \${groupSingleName}\`);
                    wifiSingleGroups.push(\`  - name: \${groupSingleName}\\n    type: select\\n    proxies:\\n      - \${nodeName}\`);
                    rulesArr.push(\`  - SRC-IP-CIDR,\${targetCidr},\${groupSingleName}\`);
                }
            } catch (e) {
                console.error('节点解析失败：', e);
            }
        }

        if (!hasValidNode) {
            alert('没有检测到有效的节点链接，请检查输入格式！');
            statusMsg.innerText = "";
            return;
        }

        lastGeneratedYaml = 
\`# ====================================================================
# 配置名称：OpenClash 多设备/网段精准分流版
# 内核要求：Mihomo (Meta) Kernel 专属
# 架构方案：机场中转 + 独享住宅IP落地 + 指定设备IP/网段精准分流 + 防泄漏
# ====================================================================

port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
tproxy-port: 7895

allow-lan: true
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
secret: "123456"
ipv6: true
unified-delay: true
tcp-concurrent: true

proxy-providers:
  \${subName}:    
    url: "\${subUrl}"
    type: http
    interval: 86400
    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离     
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 600
      timeout: 3000
      expected-status: 204
      lazy: true  

proxies:
\${proxiesArr.join('\\n')}

dns:
  enable: true
  listen: 0.0.0.0:7874
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  respect-rules: true 
  fake-ip-filter-mode: blacklist
  fake-ip-filter:
    - +.lan
    - +.local
    - localhost
    - '*.localdomain'
    - 'peer.tampermonkey.net'
    - 'workgroup'
    - geosite:cn
    - +.msftconnecttest.com
    - +.msftncsi.com
    - +.gov.cn
    - +.12306.cn
    - +.chsi.com.cn
    - +.apple.com
    - +.icloud.com
    - +.baidu.com
    - +.amap.com
    - +.alipay.com
    - +.alipayobjects.com
    - +.wechat.com
    - +.wechatpay.cn
    - +.unionpay.com
    - +.95516.com
    - +.tenpay.com
    - +.95559.com.cn
    - +.95599.cn
    - +.abchina.com
    - +.icbc.com.cn
    - +.ccb.com
    - +.boc.cn
    - +.cmbchina.com

  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  
  proxy-server-nameserver:
    - 223.5.5.5
    - 119.29.29.29
    
  nameserver-policy:
    "geosite:cn,private":
      - 223.5.5.5
      - 119.29.29.29
      - https://dns.alidns.com/dns-query
      - https://doh.pub/dns-query
    "geosite:geolocation-!cn":
      - https://dns.google/dns-query
      - https://1.1.1.1/dns-query

  nameserver:
    - 223.5.5.5
    - 119.29.29.29

tun:
  enable: true
  stack: mixed
  device: utun
  auto-route: true
  auto-detect-interface: true
  auto-redirect: true
  strict-route: true

profile:
  store-selected: true
  store-fake-ip: true

default: &default
  type: select
  proxies: 
    - 直连  
    - 纯静态住宅-落地组 
    - 所有-自动     
    - 所有-手动 		
    - 香港-故转
    - 台湾-故转
    - 日本-故转
    - 新加坡-故转
    - 韩国-故转
    - 美国-故转
    - 英国-故转
    - 其他-故转
    - 拒绝

proxy-groups:
  - name: 纯静态住宅-落地组
    type: select
    proxies:
\${residentialGroupProxies.join('\\n')}

\${wifiSingleGroups.join('\\n\\n')}

  - {name: ChatGPT, <<: *default}
  - {name: Gemini, <<: *default}
  - {name: Copilot, <<: *default}
  - {name: Perplexity, <<: *default}
  - {name: Claude, <<: *default}
  - {name: Meta AI, <<: *default}
  - {name: Grok, <<: *default}
  - {name: Groq, <<: *default}
  - {name: GitHub, <<: *default}
  - {name: Reddit, <<: *default}
  - {name: Telegram, <<: *default}
  - {name: WhatsApp, <<: *default}
  - {name: Facebook, <<: *default}
  - {name: BiliBili, <<: *default}
  - {name: YouTube, <<: *default}
  - {name: TikTok, <<: *default}
  - {name: Netflix, <<: *default}
  - {name: HBO, <<: *default}
  - {name: Disney, <<: *default}
  - {name: Amazon, <<: *default}
  - {name: Crunchyroll, <<: *default}
  - {name: Popcorn, <<: *default}
  - {name: Spotify, <<: *default}
  - {name: Nvidia, <<: *default}
  - {name: Steam, <<: *default}
  - {name: Games, <<: *default}
  - {name: Crypto, <<: *default}
  - {name: Apple, <<: *default}
  - {name: Google, <<: *default}
  - {name: Microsoft, <<: *default}
  - {name: Test, <<: *default}
  - {name: Block, <<: *default}
  - {name: 国外, <<: *default}
  - {name: 国内, <<: *default}
  - {name: 其他, <<: *default}
  
  - name: 所有-手动
    type: select
    use:
      - \${subName}
    exclude-filter: "直连|拒绝"

  - name: 所有-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000          
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    exclude-filter: "直连|拒绝" 
    use-provider-health: true
    
  - name: 香港-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 香港-自动          
      - 香港-手动
  - name: 香港-手动
    type: select
    use:
      - \${subName}
    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"
  - name: 香港-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true                
    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"
    use-provider-health: true
 
  - name: 台湾-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 台湾-自动          
      - 台湾-手动
  - name: 台湾-手动
    type: select
    use:
      - \${subName}
    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"
  - name: 台湾-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"
    use-provider-health: true

  - name: 日本-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 日本-自动          
      - 日本-手动
  - name: 日本-手动
    type: select
    use:
      - \${subName}
    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"
  - name: 日本-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"
    use-provider-health: true

  - name: 新加坡-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 新加坡-自动        
      - 新加坡-手动
  - name: 新加坡-手动
    type: select
    use:
      - \${subName}
    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"
  - name: 新加坡-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"
    use-provider-health: true

  - name: 韩国-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 韩国-自动          
      - 韩国-手动
  - name: 韩国-手动
    type: select
    use:
      - \${subName}
    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"
  - name: 韩国-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"
    use-provider-health: true

  - name: 美国-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 美国-自动          
      - 美国-手动
  - name: 美国-手动
    type: select
    use:
      - \${subName}
    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"
  - name: 美国-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"
    use-provider-health: true

  - name: 英国-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 英国-自动          
      - 英国-手动
  - name: 英国-手动
    type: select
    use:
      - \${subName}
    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"
  - name: 英国-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"
    use-provider-health: true

  - name: 其他-故转
    type: fallback
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    proxies:
      - 其他-自动          
      - 其他-手动
  - name: 其他-手动
    type: select
    use:
      - \${subName}
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
  - name: 其他-自动
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    timeout: 3000
    use:
      - \${subName}
    tolerance: 30
    lazy: true
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
    use-provider-health: true

rules:
  - AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT 
  - DOMAIN-KEYWORD,webrtc,REJECT
  - DOMAIN-KEYWORD,stun,REJECT
  - DOMAIN-SUFFIX,stun.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun1.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun2.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun3.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun4.l.google.com,REJECT  

  - DOMAIN-SUFFIX,tongdun.net,DIRECT
  - DOMAIN-SUFFIX,ishumei.com,DIRECT
  - DOMAIN-SUFFIX,geetest.com,DIRECT
  - DOMAIN-SUFFIX,dingxiangyun.com,DIRECT
  - DOMAIN-SUFFIX,unionpay.com,DIRECT
  - DOMAIN-SUFFIX,95516.com,DIRECT
  - DOMAIN-SUFFIX,alipay.com,DIRECT
  - DOMAIN-SUFFIX,wechat.com,DIRECT
  - DOMAIN-SUFFIX,wechatpay.cn,DIRECT
  - DOMAIN-SUFFIX,tenpay.com,DIRECT
  - DOMAIN-SUFFIX,gov.cn,DIRECT
  - DOMAIN-SUFFIX,12306.cn,DIRECT
  - DOMAIN-SUFFIX,chsi.com.cn,DIRECT
  - DOMAIN-SUFFIX,chinatax.gov.cn,DIRECT
  - DOMAIN-SUFFIX,mohrss.gov.cn,DIRECT
  - DOMAIN-SUFFIX,gwy.gov.cn,DIRECT
  - DOMAIN-SUFFIX,95559.com.cn,DIRECT
  - DOMAIN-SUFFIX,95599.cn,DIRECT
  - DOMAIN-SUFFIX,abchina.com,DIRECT
  - DOMAIN-SUFFIX,icbc.com.cn,DIRECT
  - DOMAIN-SUFFIX,ccb.com,DIRECT
  - DOMAIN-SUFFIX,boc.cn,DIRECT
  - DOMAIN-SUFFIX,cmbchina.com,DIRECT
  - DOMAIN-SUFFIX,citicbank.com,DIRECT
  - DOMAIN-SUFFIX,cib.com.cn,DIRECT
  - DOMAIN-SUFFIX,spdb.com.cn,DIRECT
  - DOMAIN-SUFFIX,cmbc.com.cn,DIRECT
  - DOMAIN-SUFFIX,cebbank.com,DIRECT
  - DOMAIN-SUFFIX,hxb.com.cn,DIRECT
  - DOMAIN-SUFFIX,psbc.com,DIRECT
  - DOMAIN-KEYWORD,bank,DIRECT

  - DOMAIN-SUFFIX,10086.cn,DIRECT
  - DOMAIN-SUFFIX,10010.com,DIRECT
  - DOMAIN-SUFFIX,189.cn,DIRECT
  - DOMAIN-SUFFIX,taobao.com,DIRECT
  - DOMAIN-SUFFIX,jd.com,DIRECT
  - DOMAIN-SUFFIX,douyin.com,DIRECT
  - DOMAIN-SUFFIX,bilibili.com,DIRECT
  - DOMAIN-SUFFIX,mi.com,DIRECT
  - DOMAIN-SUFFIX,midea.com,DIRECT
  - DOMAIN-SUFFIX,baidu.com,DIRECT
  - DOMAIN-SUFFIX,qq.com,DIRECT
  - DOMAIN-SUFFIX,meituan.com,DIRECT
  - DOMAIN-SUFFIX,dianping.com,DIRECT
  - DOMAIN-SUFFIX,amap.com,DIRECT
  - DOMAIN-SUFFIX,163.com,DIRECT
  - DOMAIN-SUFFIX,sohu.com,DIRECT
  - DOMAIN-SUFFIX,sina.com.cn,DIRECT
  - DOMAIN-SUFFIX,mi-img.com,DIRECT
  - DOMAIN-SUFFIX,aqara.com,DIRECT
  - DOMAIN-SUFFIX,tplinkcloud.com,DIRECT
  - DOMAIN-SUFFIX,heislands.com,DIRECT

\${rulesArr.join('\\n')}

  - RULE-SET,Test / Domain,Test
  - RULE-SET,Block / Domain,Block
  - RULE-SET,ChatGPT / Domain,ChatGPT
  - RULE-SET,Claude / Domain,Claude
  - RULE-SET,Meta AI / Domain,Meta AI
  - RULE-SET,Perplexity / Domain,Perplexity
  - RULE-SET,Copilot / Domain,Copilot
  - RULE-SET,Gemini / Domain,Gemini
  - RULE-SET,Groq / Domain,Groq
  - RULE-SET,Grok / Domain,Grok
  - RULE-SET,Reddit / Domain,Reddit
  - RULE-SET,GitHub / Domain,GitHub
  - RULE-SET,Telegram / Domain,Telegram
  - RULE-SET,Telegram / IP,Telegram,no-resolve
  - RULE-SET,WhatsApp / Domain,WhatsApp
  - RULE-SET,Facebook / Domain,Facebook
  - RULE-SET,Apple / Domain,Apple
  - RULE-SET,Apple-CN / Domain,Apple
  - RULE-SET,Microsoft / Domain,Microsoft
  - RULE-SET,OKX / Domain,Crypto
  - RULE-SET,Bybit / Domain,Crypto
  - RULE-SET,Binance / Domain,Crypto
  - RULE-SET,BiliBili / Domain,BiliBili
  - RULE-SET,YouTube / Domain,YouTube
  - RULE-SET,TikTok / Domain,TikTok
  - RULE-SET,Netflix / Domain,Netflix
  - RULE-SET,Netflix / IP,Netflix,no-resolve
  - DOMAIN-KEYWORD,netflix,Netflix
  - RULE-SET,Disney / Domain,Disney
  - RULE-SET,Amazon / Domain,Amazon
  - RULE-SET,Crunchyroll / Domain,Crunchyroll
  - RULE-SET,Popcorn / Domain,Popcorn
  - RULE-SET,HBO / Domain,HBO
  - RULE-SET,Spotify / Domain,Spotify
  - RULE-SET,Steam / Domain,Steam
  - RULE-SET,Epic / Domain,Games
  - RULE-SET,EA / Domain,Games
  - RULE-SET,Blizzard / Domain,Games
  - RULE-SET,UBI / Domain,Games
  - RULE-SET,PlayStation / Domain,Games
  - RULE-SET,Nintendo / Domain,Games
  - RULE-SET,Google / Domain,Google
  - RULE-SET,Google / IP,Google,no-resolve
  - RULE-SET,Nvidia / Domain,Nvidia
  - RULE-SET,Proxy / Domain,国外
  - RULE-SET,Globe / Domain,国外
  - RULE-SET,Direct / Domain,国内
  - RULE-SET,China / Domain,国内
  - RULE-SET,China / IP,国内,no-resolve
  - RULE-SET,Private / Domain,国内
  - MATCH,其他

rule-anchor:
  ip: &ip {type: http, interval: 86400, behavior: ipcidr, format: mrs}
  domain: &domain {type: http, interval: 86400, behavior: domain, format: mrs}
  class: &class {type: http, interval: 86400, behavior: classical, format: text}

rule-providers:
  Test / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Check.list"}
  ChatGPT / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/openai.mrs"}
  Claude / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Claude/Claude.list"}
  Meta AI / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/MetaAi.list"}
  Perplexity / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/perplexity.mrs"}
  Copilot / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Copilot.list"}
  Gemini / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/gemini.mrs"}
  GitHub / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/github.mrs"}
  Telegram / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/telegram.mrs"}
  Telegram / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/telegram.mrs"}
  WhatsApp / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Whatsapp/Whatsapp.list"}
  Facebook / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/facebook.mrs"}
  Amazon / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/amazon.mrs"}
  Apple-CN / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple-cn.mrs"}
  Apple / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple.mrs"}
  Microsoft / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/microsoft.mrs"}
  OKX / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/okx.mrs"}
  Bybit / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bybit.mrs"}
  Binance / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/binance.mrs"}
  TikTok / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/tiktok.mrs"}
  Netflix / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/netflix.mrs"}
  Netflix / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/netflix.mrs"}
  Disney / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/disney.mrs"}
  HBO / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/hbo.mrs"}
  Spotify / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/spotify.mrs"}
  Steam / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/steam.mrs"}
  Epic / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Epic/Epic.list"}
  EA / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/EA/EA.list"}
  Blizzard / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Blizzard/Blizzard.list"}
  UBI / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/UBI/UBI.list"}
  PlayStation / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/PlayStation/PlayStation.list"}
  Nintendo / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nintendo/Nintendo.list"}
  Proxy / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Proxy.list"}
  Globe / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Global/Global.list"}
  Block / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Block.list"}
  Nvidia / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nvidia/Nvidia.list"}
  Crunchyroll / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Crunchyroll.list"}
  Reddit / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/reddit.mrs"}
  Groq / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/groq.mrs"}
  Grok / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Grok.list"}
  Popcorn / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Popcorn.list"}
  Direct / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Direct.list"}
  Private / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/private.mrs"}
  China / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/cn.mrs"}
  China / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/cn.mrs"}
  YouTube / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/youtube.mrs"}
  Google / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/google.mrs"}
  Google / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/google.mrs"}
  BiliBili / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bilibili.mrs"}\`;

        document.getElementById('out-full').innerText = lastGeneratedYaml;
        statusMsg.innerText = \`✅ 多设备/网段精准分流配置文件已生成！\`;

        if (autoDownload) {
            await downloadYaml();
        }
    }
}
</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};
