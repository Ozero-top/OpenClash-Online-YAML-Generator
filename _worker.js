// Cloudflare Worker 部署入口
export default {
  async fetch(request, env, ctx) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title> Clash Yaml配置文件一键生成器 </title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif; padding: 20px; background-color: #f0f2f5; color: #333; }
        .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        
        .header-title-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e8eaed; padding-bottom: 10px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
        .header-title-container h2 { margin: 0; color: #1a73e8; font-size: 20px; border-bottom: none; padding-bottom: 0; }
        .header-right-tools { display: flex; align-items: center; gap: 12px; }
        .github-link { color: #333; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: color 0.2s; }
        .github-link:hover { color: #1a73e8; }
        
        .section-header-box { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
        .section-title { font-weight: bold; font-size: 15px; color: #1a73e8; border-left: 4px solid #1a73e8; padding-left: 8px; margin: 0; }
        .ext-link-download { font-size: 13px; color: #1a73e8; font-weight: 600; text-decoration: none; transition: color 0.2s; display: inline-flex; align-items: center; gap: 4px; }
        .ext-link-download:hover { color: #1557b0; text-decoration: underline; }

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
        .mode-desc-box a { color: #1a73e8; text-decoration: underline; font-weight: bold; }
        .mode-desc-box a:hover { color: #1557b0; }

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
        <h2>⚡ Clash Yaml配置文件一键生成工具</h2>
        <div class="header-right-tools">
            <a href="https://github.com/Ozero-top/OpenClash-Online-YAML-Generator" target="_blank" rel="noopener noreferrer" class="github-link" title="访问 GitHub 开源项目">
                <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </a>
        </div>
    </div>

    <div class="section-header-box">
        <div class="section-title">生成模式与实用工具选择</div>
        <a href="https://github.com/Ozero-top/OpenClash-Config/tree/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6" target="_blank" rel="noopener noreferrer" class="ext-link-download">
            📥 OpenClash插件配置文件下载
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
        <div class="section-header-box">
            <div class="section-title">1. 前置中转代理订阅配置</div>
        </div>
        <div class="row">
            <div style="flex: 1;">
                <label for="chainSubName">代理服务商自定义名称:</label>
                <input type="text" id="chainSubName" value="服务商名称" placeholder="自定义名称（默认：服务商名称）">
            </div>
            <div style="flex: 2;">
                <label for="subUrl">主力中转代理订阅地址 (url):</label>
                <input type="text" id="subUrl" value="https://your-sub-domain.com/link/token">
            </div>
        </div>

        <div class="section-header-box">
            <div class="section-title">2. 前置中转与规则匹配方式</div>
        </div>
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

        <div class="section-header-box">
            <div class="section-title">3. 节点配置</div>
        </div>
        
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
        <div class="section-header-box">
            <div class="section-title">🌐 自动分流代理订阅配置 </div>
        </div>
        <div class="row">
            <div style="flex: 1;">
                <label for="stdSubName1">代理服务商自定义名称:</label>
                <input type="text" id="stdSubName1" value="服务商名称" placeholder="自定义名称（默认：服务商名称）">
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
                <label for="stdSubName2">备用服务商自定义名称:</label>
                <input type="text" id="stdSubName2" value="备用服务商" placeholder="自定义名称（默认：备用服务商）">
            </div>
            <div style="flex: 2;">
                <label for="stdSubUrl2">备用代理订阅地址 (url):</label>
                <input type="text" id="stdSubUrl2" value="https://your-backup-sub-domain.com/link/token">
            </div>
        </div>
    </div>

    <div id="skConvertSection" class="mode-section">
        <div class="section-header-box">
            <div class="section-title">🛠️ IP|端口|账号|密码 批量转 Socks5 链接</div>
        </div>
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
        <div class="section-header-box">
            <div class="section-title">📄 完整 YAML 预览区</div>
        </div>
        <div id="out-full" class="output-box">点击生成按钮后查看...</div>
    </div>
</div>

<script>
let lastGeneratedYaml = "";
let nodeCount = 0;
let currentMode = "chain-single";

const guideLink = '<a href="https://github.com/Ozero-top/OpenClash-Config/blob/main/README.md" target="_blank" rel="noopener noreferrer">使用指南</a>';

const modeDescriptions = {
    'chain-single': '🔲 链式代理 - 独立节点输入模式：允许用户通过独立的表单卡片逐个输入或粘贴前置中转代理节点，支持为每个节点单独指定或自动识别国家/地区标签，并结合网段或指定单 IP 进行精准分流。<br>⚠️ clash运行该yaml文件后，无需任何设置即可按照前面 【网段匹配】 或 【指定设备单 IP】配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的【所有 - 手动】选择延时最低节点作为前置中转；其他策略组对 【网段匹配】 或 【指定设备单 IP】 无任何影响；仅作用于 OpenWRT软路由 非 【网段匹配】 或 【指定设备单 IP】 的设备；可自动分流，WebRTC/DNS防泄漏（分流/防泄漏前提要自行配置clash插件 或 本页面右上角下载clash插件配置文件替换，具体操作可参考：[' + guideLink + '] 的操作说明 - 【替换OpenClash插件配置文件】 )',
    'chain-bulk': '📑 链式代理 - 批量混合粘贴模式：支持在多行文本框中批量粘贴多种协议的节点链接（如 vless、vmess、trojan、hysteria2、socks5），系统会自动解析并批量匹配国家/地区，快速生成链式代理配置文件。<br>⚠️ clash运行该yaml文件后，无需任何设置即可按照前面 【网段匹配】 或 【指定设备单 IP】配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的【所有 - 手动】选择延时最低节点作为前置中转；其他策略组对 【网段匹配】 或 【指定设备单 IP】 无任何影响；仅作用于 OpenWRT软路由 非 【网段匹配】 或 【指定设备单 IP】 的设备；可自动分流，WebRTC/DNS防泄漏（分流/防泄漏前提要自行配置clash插件 或 本页面右上角下载clash插件配置文件替换，具体操作可参考：[' + guideLink + '] 的操作说明 - 【替换OpenClash插件配置文件】 )',
    'standard': '🌐 自动分流 - 单/双代理订阅家用模式 (V0.2.5)：面向日常或家用场景，支持配置单机场或双机场（主力+备用）订阅地址，自动聚合节点并提供全自动区域流控、延迟优化与丰富的主流分流规则。同时兼顾DNS防泄漏和WebRTC防泄漏。<br>⚠️ clash运行该yaml文件后，可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组，根据使用需求自行设置；除 直连、拒绝 策略组，其他策略组均是自动切换最低延时节点；可手动选择，但会在3-6小时后自动切换到延时最低节点；分流/防泄漏前提要自行配置clash插件 或 本页面右上角下载clash插件配置文件替换，具体操作可参考：[' + guideLink + ']的操作说明 - 【替换OpenClash插件配置文件】',
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
    switchMode('chain-single');
    addNodeCard("vless://c3008ec6-3ce2-4bc9-9f1b-6c3ac961b9d3@8.8.8.8:443?type=tcp&security=reality&pbk=1Xm9plKrtXaz78298LKoWDFZBxC2zkY5mn23CFR4pLp5&sid=aa1bba77&fp=chrome&sni=www.apple.com#美国01");
    addNodeCard("socks5://user:pass@8.8.8.8:1080#美国02");
};

function isIPv4(str) {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str);
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
    if (/香港|广港|HK|Hong\\s*Kong|🇭🇰/i.test(textToSearch)) return "香港";
    if (/台湾|台灣|广台|TW|Taiwan|Tai\\s*Wan|🇹🇼/i.test(textToSearch)) return "台湾";
    if (/日本|广日|川日|泉日|沪日|深日|JP|Japan|Tokyo|Osaka|东京|大阪|埼玉|🇯🇵/i.test(textToSearch)) return "日本";
    if (/新加坡|广新|坡|狮城|SG|Singapore|🇸🇬/i.test(textToSearch)) return "新加坡";
    if (/韩国|韓國|广韩|KR|Korea|Seoul|首尔|春川|🇰🇷/i.test(textToSearch)) return "韩国";
    if (/美国|美|广美|US|United\\s*States|America|洛杉矶|纽约|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|圣何塞|圣克拉拉|西雅图|芝加哥|阿什本|圣迭戈|硅谷|🇺🇸/i.test(textToSearch)) return "美国";
    if (/英国|英|UK|United\\s*Kingdom|London|伦敦|🇬🇧/i.test(textToSearch)) return "英国";
    if (/德国|德|DE|Germany|🇩🇪/i.test(textToSearch)) return "德国";
    return null;
}

async function fetchCountryByHost(host) {
    if (!host) return "通用";
    let ip = host;
    if (!isIPv4(host)) {
        try {
            const dnsRes = await fetch('https://1.1.1.1/dns-query?name=' + encodeURIComponent(host) + '&type=A', {
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
        const geoRes = await fetch('https://ip-api.com/json/' + ip + '?fields=countryCode,country');
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

            const formatted = 'socks5://' + user + ':' + pass + '@' + host + ':' + port;
            results.push(formatted);
        } else {
            results.push('// 格式错误或不完整: ' + line);
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
    card.id = 'node-card-' + nodeCount;

    let optionsHtml = '';
    commonCountries.forEach(c => {
        optionsHtml += '<option value="' + c + '">' + c + '</option>';
    });

    card.innerHTML = '<div class="btn-card-actions">' +
            '<button class="btn-action btn-lookup" onclick="manualLookupCard(' + nodeCount + ')">🔍 联网查询</button>' +
            '<button class="btn-action btn-clear" onclick="clearNodeText(\\'node-link-' + nodeCount + '\\', \\'node-country-' + nodeCount + '\\', ' + nodeCount + ')">🧹 清空</button>' +
            '<button class="btn-action btn-remove" onclick="removeNodeCard(\\'node-card-' + nodeCount + '\\')">✕ 删除</button>' +
        '</div>' +
        '<div class="row" style="margin-bottom: 8px;">' +
            '<div style="flex: 1;">' +
                '<label>国家 / 地区标签 <span class="tag" id="node-tag-' + nodeCount + '">🤖 自动识别</span><span class="tip-tag">⚠️ 显示“通用”可直接下拉选择，或直接输入自定义名称</span>:</label>' +
                '<div style="display: flex; gap: 8px;">' +
                    '<select id="node-country-' + nodeCount + '" class="node-country" onchange="markUserEdited(' + nodeCount + ')" style="flex: 1;">' +
                        optionsHtml +
                    '</select>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div>' +
            '<label>节点协议链接 (支持 vless / vmess / trojan / hysteria2 / socks5):</label>' +
            '<textarea id="node-link-' + nodeCount + '" class="node-link" rows="2" placeholder="粘贴单个节点的协议链接..." oninput="updateCardCountry(this, ' + nodeCount + ')">' + defaultLink + '</textarea>' +
        '</div>';
    container.appendChild(card);
    if (defaultLink) {
        updateCardCountry(card.querySelector('.node-link'), nodeCount);
    } else {
        document.getElementById('node-country-' + nodeCount).value = "通用";
    }
}

function markUserEdited(id) {
    const countrySelect = document.getElementById('node-country-' + id);
    const tag = document.getElementById('node-tag-' + id);
    if (countrySelect) countrySelect.dataset.userEdited = "true";
    if (tag) tag.innerText = "✍️ 手动指定";
}

async function updateCardCountry(textarea, id) {
    const countrySelect = document.getElementById('node-country-' + id);
    const tag = document.getElementById('node-tag-' + id);
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
    const textarea = document.getElementById('node-link-' + id);
    const countrySelect = document.getElementById('node-country-' + id);
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
    const tag = document.getElementById('node-tag-' + id);
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
            parts.push(key + ': ' + formatInlineYaml(val));
        } else if (typeof val === 'boolean' || typeof val === 'number') {
            parts.push(key + ': ' + val);
        } else {
            parts.push(key + ': "' + val + '"');
        }
    }
    return '{' + parts.join(', ') + '}';
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
        const subName1 = document.getElementById('stdSubName1').value.trim() || '服务商名称';
        const subUrl1 = document.getElementById('stdSubUrl1').value.trim() || 'https://your-main-sub-domain.com/link/token';
        const enableBackup = document.getElementById('enableBackupSub').checked;
        const subName2 = document.getElementById('stdSubName2').value.trim() || '备用服务商';
        const subUrl2 = document.getElementById('stdSubUrl2').value.trim() || 'https://your-backup-sub-domain.com/link/token';

        let proxyProvidersBlock = '  ' + subName1 + ':\\n' +
            '    url: "' + subUrl1 + '"\\n' +
            '    type: http\\n' +
            '    interval: 86400\\n' +
            '    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离     \\n' +
            '    health-check:\\n' +
            '      enable: true\\n' +
            '      url: https://www.gstatic.com/generate_204\\n' +
            '      interval: 600\\n' +
            '      timeout: 3000\\n' +
            '      expected-status: 204\\n' +
            '      lazy: true';

        let useProvidersForGroups = '      - ' + subName1;

        if (enableBackup) {
            proxyProvidersBlock += '\\n\\n  ' + subName2 + ':\\n' +
                '    url: "' + subUrl2 + '"\\n' +
                '    type: http\\n' +
                '    interval: 86400\\n' +
                '    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离     \\n' +
                '    health-check:\\n' +
                '      enable: true\\n' +
                '      url: https://www.gstatic.com/generate_204\\n' +
                '      interval: 600\\n' +
                '      timeout: 3000\\n' +
                '      expected-status: 204\\n' +
                '      lazy: true';
            useProvidersForGroups += '\\n      - ' + subName2;
        }

        lastGeneratedYaml = 
'# ====================================================================\\n' +
'# 配置名称：OpenClash 区域全自动流控与延迟优化 (' + (enableBackup ? '双机场融合版' : '单机场标准版') + ')\\n' +
'# 版本号：V0.2.5 (生产环境推荐版)\\n' +
'# 内核要求：Mihomo (Meta) Kernel 专属\\n' +
'# ====================================================================\\n' +
'\\n' +
'port: 7890\\n' +
'socks-port: 7891\\n' +
'redir-port: 7892\\n' +
'mixed-port: 7893\\n' +
'tproxy-port: 7895\\n' +
'\\n' +
'allow-lan: true\\n' +
'mode: rule\\n' +
'log-level: info\\n' +
'external-controller: 0.0.0.0:9090\\n' +
'secret: "123456"\\n' +
'ipv6: true\\n' +
'unified-delay: true\\n' +
'tcp-concurrent: true\\n' +
'\\n' +
'proxy-providers:\\n' +
proxyProvidersBlock + '\\n' +
'      \\n' +
'proxies:\\n' +
'  - {name: 直连, type: direct}\\n' +
'  - {name: 拒绝, type: reject}\\n' +
'\\n' +
'dns:\\n' +
'  enable: true\\n' +
'  listen: 0.0.0.0:7874\\n' +
'  ipv6: true\\n' +
'  enhanced-mode: fake-ip\\n' +
'  fake-ip-range: 198.18.0.1/16\\n' +
'  respect-rules: true \\n' +
'  fake-ip-filter-mode: blacklist\\n' +
'  fake-ip-filter:\\n' +
'    - +.lan\\n' +
'    - +.local\\n' +
'    - localhost\\n' +
'    - \\'*.localdomain\\'\\n' +
'    - \\'peer.tampermonkey.net\\'\\n' +
'    - \\'workgroup\\'\\n' +
'    - geosite:cn\\n' +
'    - +.msftconnecttest.com\\n' +
'    - +.msftncsi.com\\n' +
'    - +.gov.cn\\n' +
'    - +.12306.cn\\n' +
'    - +.chsi.com.cn\\n' +
'    - +.apple.com\\n' +
'    - +.icloud.com\\n' +
'    - +.baidu.com\\n' +
'    - +.amap.com\\n' +
'    - +.alipay.com\\n' +
'    - +.alipayobjects.com\\n' +
'    - +.wechat.com\\n' +
'    - +.wechatpay.cn\\n' +
'    - +.unionpay.com\\n' +
'    - +.95516.com\\n' +
'    - +.tenpay.com\\n' +
'    - +.95559.com.cn\\n' +
'    - +.95599.cn\\n' +
'    - +.abchina.com\\n' +
'    - +.icbc.com.cn\\n' +
'    - +.ccb.com\\n' +
'    - +.boc.cn\\n' +
'    - +.cmbchina.com\\n' +
'\\n' +
'  default-nameserver:\\n' +
'    - 223.5.5.5\\n' +
'    - 119.29.29.29\\n' +
'  \\n' +
'  proxy-server-nameserver:\\n' +
'    - 223.5.5.5\\n' +
'    - 119.29.29.29\\n' +
'    \\n' +
'  nameserver-policy:\\n' +
'    "geosite:cn,private":\\n' +
'      - 223.5.5.5\\n' +
'      - 119.29.29.29\\n' +
'      - https://dns.alidns.com/dns-query\\n' +
'      - https://doh.pub/dns-query\\n' +
'    "geosite:geolocation-!cn":\\n' +
'      - https://dns.google/dns-query\\n' +
'      - https://1.1.1.1/dns-query\\n' +
'\\n' +
'  nameserver:\\n' +
'    - 223.5.5.5\\n' +
'    - 119.29.29.29\\n' +
'\\n' +
'tun:\\n' +
'  enable: true\\n' +
'  stack: mixed\\n' +
'  device: utun\\n' +
'  auto-route: true\\n' +
'  auto-detect-interface: true\\n' +
'  auto-redirect: true\\n' +
'  strict-route: true\\n' +
'\\n' +
'profile:\\n' +
'  store-selected: true\\n' +
'  store-fake-ip: true\\n' +
'\\n' +
'default: &default\\n' +
'  type: select\\n' +
'  proxies:\\n' +
'    - 直连\\n' +
'    - 所有-自动          \\n' +
'    - 所有-手动\\n' +
'    - 香港-故转\\n' +
'    - 台湾-故转\\n' +
'    - 日本-故转\\n' +
'    - 新加坡-故转\\n' +
'    - 韩国-故转\\n' +
'    - 美国-故转\\n' +
'    - 英国-故转\\n' +
'    - 其他-故转\\n' +
'    - 拒绝\\n' +
'\\n' +
'proxy-groups:\\n' +
'  - {name: ChatGPT, <<: *default}\\n' +
'  - {name: Gemini, <<: *default}\\n' +
'  - {name: Copilot, <<: *default}\\n' +
'  - {name: Perplexity, <<: *default}\\n' +
'  - {name: Claude, <<: *default}\\n' +
'  - {name: Meta AI, <<: *default}\\n' +
'  - {name: Grok, <<: *default}\\n' +
'  - {name: Groq, <<: *default}\\n' +
'  - {name: GitHub, <<: *default}\\n' +
'  - {name: Reddit, <<: *default}\\n' +
'  - {name: Telegram, <<: *default}\\n' +
'  - {name: WhatsApp, <<: *default}\\n' +
'  - {name: Facebook, <<: *default}\\n' +
'  - {name: BiliBili, <<: *default}\\n' +
'  - {name: YouTube, <<: *default}\\n' +
'  - {name: TikTok, <<: *default}\\n' +
'  - {name: Netflix, <<: *default}\\n' +
'  - {name: HBO, <<: *default}\\n' +
'  - {name: Disney, <<: *default}\\n' +
'  - {name: Amazon, <<: *default}\\n' +
'  - {name: Crunchyroll, <<: *default}\\n' +
'  - {name: Popcorn, <<: *default}\\n' +
'  - {name: Spotify, <<: *default}\\n' +
'  - {name: Nvidia, <<: *default}\\n' +
'  - {name: Steam, <<: *default}\\n' +
'  - {name: Games, <<: *default}\\n' +
'  - {name: Crypto, <<: *default}\\n' +
'  - {name: Apple, <<: *default}\\n' +
'  - {name: Google, <<: *default}\\n' +
'  - {name: Microsoft, <<: *default}\\n' +
'  - {name: Test, <<: *default}\\n' +
'  - {name: Block, <<: *default}\\n' +
'  - {name: 国外, <<: *default}\\n' +
'  - {name: 国内, <<: *default}\\n' +
'  - {name: 其他, <<: *default}\\n' +
'  \\n' +
'  - name: 所有-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    exclude-filter: "直连|拒绝"\\n' +
'\\n' +
'  - name: 所有-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000          \\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    exclude-filter: "直连|拒绝" \\n' +
'    use-provider-health: true\\n' +
'    \\n' +
'  - name: 香港-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000          \\n' +
'    proxies:\\n' +
'      - 香港-自动          \\n' +
'      - 香港-手动\\n' +
'  - name: 香港-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"\\n' +
'  - name: 香港-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000          \\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true                \\n' +
'    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"\\n' +
'    use-provider-health: true\\n' +
' \\n' +
'  - name: 台湾-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 台湾-自动          \\n' +
'      - 台湾-手动\\n' +
'  - name: 台湾-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"\\n' +
'  - name: 台湾-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'  - name: 日本-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 日本-自动          \\n' +
'      - 日本-手动\\n' +
'  - name: 日本-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"\\n' +
'  - name: 日本-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'  - name: 新加坡-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 新加坡-自动        \\n' +
'      - 新加坡-手动\\n' +
'  - name: 新加坡-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"\\n' +
'  - name: 新加坡-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'  - name: 韩国-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 韩国-自动          \\n' +
'      - 韩国-手动\\n' +
'  - name: 韩国-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"\\n' +
'  - name: 韩国-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'  - name: 美国-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 美国-自动          \\n' +
'      - 美国-手动\\n' +
'  - name: 美国-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"\\n' +
'  - name: 美国-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'  - name: 英国-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 英国-自动          \\n' +
'      - 英国-手动\\n' +
'  - name: 英国-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"\\n' +
'  - name: 英国-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'  - name: 其他-故转\\n' +
'    type: fallback\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    proxies:\\n' +
'      - 其他-自动          \\n' +
'      - 其他-手动\\n' +
'  - name: 其他-手动\\n' +
'    type: select\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"\\n' +
'  - name: 其他-自动\\n' +
'    type: url-test\\n' +
'    url: https://www.gstatic.com/generate_204\\n' +
'    interval: 300\\n' +
'    timeout: 3000\\n' +
'    use:\\n' +
useProvidersForGroups + '\\n' +
'    tolerance: 30\\n' +
'    lazy: true\\n' +
'    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"\\n' +
'    use-provider-health: true\\n' +
'\\n' +
'rules:\\n' +
'  - AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT \\n' +
'  - DOMAIN-KEYWORD,webrtc,REJECT\\n' +
'  - DOMAIN-KEYWORD,stun,REJECT\\n' +
'  - DOMAIN-SUFFIX,stun.l.google.com,REJECT\\n' +
'  - DOMAIN-SUFFIX,stun1.l.google.com,REJECT\\n' +
'  - DOMAIN-SUFFIX,stun2.l.google.com,REJECT\\n' +
'  - DOMAIN-SUFFIX,stun3.l.google.com,REJECT\\n' +
'  - DOMAIN-SUFFIX,stun4.l.google.com,REJECT  \\n' +
'\\n' +
'  - DOMAIN-SUFFIX,tongdun.net,DIRECT\\n' +
'  - DOMAIN-SUFFIX,ishumei.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,geetest.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,dingxiangyun.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,unionpay.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,95516.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,alipay.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,wechat.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,wechatpay.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,tenpay.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,gov.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,12306.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,chsi.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,chinatax.gov.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,mohrss.gov.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,gwy.gov.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,95559.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,95599.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,abchina.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,icbc.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,ccb.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,boc.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,cmbchina.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,citicbank.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,cib.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,spdb.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,cmbc.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,cebbank.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,hxb.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,psbc.com,DIRECT\\n' +
'  - DOMAIN-KEYWORD,bank,DIRECT\\n' +
'\\n' +
'  - DOMAIN-SUFFIX,10086.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,10010.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,189.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,taobao.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,jd.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,douyin.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,bilibili.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,mi.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,midea.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,baidu.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,qq.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,meituan.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,dianping.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,amap.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,163.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,sohu.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,sina.com.cn,DIRECT\\n' +
'  - DOMAIN-SUFFIX,mi-img.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,aqara.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,tplinkcloud.com,DIRECT\\n' +
'  - DOMAIN-SUFFIX,heislands.com,DIRECT\\n' +
'  \\n' +
'  - RULE-SET,Test / Domain,Test\\n' +
'  - RULE-SET,Block / Domain,Block\\n' +
'  - RULE-SET,ChatGPT / Domain,ChatGPT\\n' +
'  - RULE-SET,Claude / Domain,Claude\\n' +
'  - RULE-SET,Meta AI / Domain,Meta AI\\n' +
'  - RULE-SET,Perplexity / Domain,Perplexity\\n' +
'  - RULE-SET,Copilot / Domain,Copilot\\n' +
'  - RULE-SET,Gemini / Domain,Gemini\\n' +
'  - RULE-SET,Groq / Domain,Groq\\n' +
'  - RULE-SET,Grok / Domain,Grok\\n' +
'  - RULE-SET,Reddit / Domain,Reddit\\n' +
'  - RULE-SET,GitHub / Domain,GitHub\\n' +
'  - RULE-SET,Telegram / Domain,Telegram\\n' +
'  - RULE-SET,Telegram / IP,Telegram,no-resolve\\n' +
'  - RULE-SET,WhatsApp / Domain,WhatsApp\\n' +
'  - RULE-SET,Facebook / Domain,Facebook\\n' +
'  - RULE-SET,Apple / Domain,Apple\\n' +
'  - RULE-SET,Apple-CN / Domain,Apple\\n' +
'  - RULE-SET,Microsoft / Domain,Microsoft\\n' +
'  - RULE-SET,OKX / Domain,Crypto\\n' +
'  - RULE-SET,Bybit / Domain,Crypto\\n' +
'  - RULE-SET,Binance / Domain,Crypto\\n' +
'  - RULE-SET,BiliBili / Domain,BiliBili\\n' +
'  - RULE-SET,YouTube / Domain,YouTube\\n' +
'  - RULE-SET,TikTok / Domain,TikTok\\n' +
'  - RULE-SET,Netflix / Domain,Netflix\\n' +
'  - RULE-SET,Netflix / IP,Netflix,no-resolve\\n' +
'  - DOMAIN-KEYWORD,netflix,Netflix\\n' +
'  - RULE-SET,Disney / Domain,Disney\\n' +
'  - RULE-SET,Amazon / Domain,Amazon\\n' +
'  - RULE-SET,Crunchyroll / Domain,Crunchyroll\\n' +
'  - RULE-SET,Popcorn / Domain,Popcorn\\n' +
'  - RULE-SET,HBO / Domain,HBO\\n' +
'  - RULE-SET,Spotify / Domain,Spotify\\n' +
'  - RULE-SET,Steam / Domain,Steam\\n' +
'  - RULE-SET,Epic / Domain,Games\\n' +
'  - RULE-SET,EA / Domain,Games\\n' +
'  - RULE-SET,Blizzard / Domain,Games\\n' +
'  - RULE-SET,UBI / Domain,Games\\n' +
'  - RULE-SET,PlayStation / Domain,Games\\n' +
'  - RULE-SET,Nintendo / Domain,Games\\n' +
'  - RULE-SET,Google / Domain,Google\\n' +
'  - RULE-SET,Google / IP,Google,no-resolve\\n' +
'  - RULE-SET,Nvidia / Domain,Nvidia\\n' +
'  - RULE-SET,Proxy / Domain,国外\\n' +
'  - RULE-SET,Globe / Domain,国外\\n' +
'  - RULE-SET,Direct / Domain,国内\\n' +
'  - RULE-SET,China / Domain,国内\\n' +
'  - RULE-SET,China / IP,国内,no-resolve\\n' +
'  - RULE-SET,Private / Domain,国内\\n' +
'  - MATCH,其他\\n' +
'\\n' +
'rule-anchor:\\n' +
'  ip: &ip {type: http, interval: 86400, behavior: ipcidr, format: mrs}\\n' +
'  domain: &domain {type: http, interval: 86400, behavior: domain, format: mrs}\\n' +
'  class: &class {type: http, interval: 86400, behavior: classical, format: text}\\n' +
'\\n' +
'rule-providers:\\n' +
'  Test / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Check.list"}\\n' +
'  ChatGPT / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/openai.mrs"}\\n' +
'  Claude / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Claude/Claude.list"}\\n' +
'  Meta AI / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/MetaAi.list"}\\n' +
'  Perplexity / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/perplexity.mrs"}\\n' +
'  Copilot / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Copilot.list"}\\n' +
'  Gemini / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/gemini.mrs"}\\n' +
'  GitHub / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/github.mrs"}\\n' +
'  Telegram / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/telegram.mrs"}\\n' +
'  Telegram / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/telegram.mrs"}\\n' +
'  WhatsApp / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Whatsapp/Whatsapp.list"}\\n' +
'  Facebook / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/facebook.mrs"}\\n' +
'  Amazon / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/amazon.mrs"}\\n' +
'  Apple-CN / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple-cn.mrs"}\\n' +
'  Apple / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple.mrs"}\\n' +
'  Microsoft / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/microsoft.mrs"}\\n' +
'  OKX / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/okx.mrs"}\\n' +
'  Bybit / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bybit.mrs"}\\n' +
'  Binance / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/binance.mrs"}\\n' +
'  TikTok / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/tiktok.mrs"}\\n' +
'  Netflix / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/netflix.mrs"}\\n' +
'  Netflix / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/netflix.mrs"}\\n' +
'  Disney / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/disney.mrs"}\\n' +
'  HBO / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/hbo.mrs"}\\n' +
'  Spotify / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/spotify.mrs"}\\n' +
'  Steam / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/steam.mrs"}\\n' +
'  Epic / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Epic/Epic.list"}\\n' +
'  EA / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/EA/EA.list"}\\n' +
'  Blizzard / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Blizzard/Blizzard.list"}\\n' +
'  UBI / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/UBI/UBI.list"}\\n' +
'  PlayStation / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/PlayStation/PlayStation.list"}\\n' +
'  Nintendo / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nintendo/Nintendo.list"}\\n' +
'  Proxy / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Proxy.list"}\\n' +
'  Globe / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Global/Global.list"}\\n' +
'  Block / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Block.list"}\\n' +
'  Nvidia / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nvidia/Nvidia.list"}\\n' +
'  Crunchyroll / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Crunchyroll.list"}\\n' +
'  Reddit / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/reddit.mrs"}\\n' +
'  Groq / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/groq.mrs"}\\n' +
'  Grok / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Grok.list"}\\n' +
'  Popcorn / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Popcorn.list"}\\n' +
'  Direct / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Direct.list"}\\n' +
'  Private / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/private.mrs"}\\n' +
'  China / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/cn.mrs"}\\n' +
'  China / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/cn.mrs"}\\n' +
'  YouTube / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/youtube.mrs"}\\n' +
'  Google / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/google.mrs"}\\n' +
'  Google / IP: {<<: *ip, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/google.mrs"}\\n' +
'  BiliBili / Domain: {<<: *domain, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bilibili.mrs"}';

        document.getElementById('out-full').innerText = lastGeneratedYaml;
        statusMsg.innerText = "✅ 配置文件生成成功！";

        if (autoDownload) {
            await downloadYaml();
        }
    }
}
</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  },
};
