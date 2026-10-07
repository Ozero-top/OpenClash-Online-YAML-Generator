let __d1CounterSchemaReady = false;

async function d1EnsureSchema(db) {
  if (__d1CounterSchemaReady) return;
  await db.exec(
    "CREATE TABLE IF NOT EXISTS visitors (ip TEXT PRIMARY KEY, first_seen INTEGER NOT NULL);" +
    "CREATE TABLE IF NOT EXISTS online (ip TEXT PRIMARY KEY, last_seen INTEGER NOT NULL);" +
    "CREATE INDEX IF NOT EXISTS idx_online_last_seen ON online(last_seen);" +
    "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);"
  );
  __d1CounterSchemaReady = true;
}

async function d1Heartbeat(db, ip) {
  await d1EnsureSchema(db);
  const nowSec = Math.floor(Date.now() / 1000);
  await db.prepare(
    "INSERT INTO online (ip, last_seen) VALUES (?1, ?2) " +
    "ON CONFLICT(ip) DO UPDATE SET last_seen = excluded.last_seen " +
    "WHERE online.last_seen < excluded.last_seen - 60"
  ).bind(ip, nowSec).run();
}

async function d1TrackAndGetStats(db, ip) {
  await d1EnsureSchema(db);
  const nowSec = Math.floor(Date.now() / 1000);
  await db.prepare(
    "INSERT INTO online (ip, last_seen) VALUES (?1, ?2) " +
    "ON CONFLICT(ip) DO UPDATE SET last_seen = excluded.last_seen " +
    "WHERE online.last_seen < excluded.last_seen - 60"
  ).bind(ip, nowSec).run();
  const insRes = await db.prepare(
    "INSERT OR IGNORE INTO visitors (ip, first_seen) VALUES (?1, ?2)"
  ).bind(ip, nowSec).run();
  if (insRes && insRes.meta && insRes.meta.rows_written > 0) {
    await db.prepare(
      "INSERT INTO meta (key, value) VALUES ('uv', 1) " +
      "ON CONFLICT(key) DO UPDATE SET value = value + 1"
    ).run();
  }
  const uvRow = await db.prepare("SELECT value FROM meta WHERE key = 'uv'").first();
  const onlineRow = await db.prepare(
    "SELECT COUNT(*) AS c FROM online WHERE last_seen > ?1"
  ).bind(nowSec - 120).first();
  return {
    visitCount: (uvRow && typeof uvRow.value === "number") ? uvRow.value : 0,
    onlineCount: (onlineRow && typeof onlineRow.c === "number") ? onlineRow.c : 0
  };
}

async function d1GetTotalVisitors(db) {
  await d1EnsureSchema(db);
  const row = await db.prepare("SELECT value FROM meta WHERE key = 'uv'").first();
  return (row && typeof row.value === "number") ? row.value : 0;
}

const XDB_URLS = [
  "https://raw.githubusercontent.com/lionsoul2014/ip2region/refs/heads/master/data/ip2region_v4.xdb",
  "https://fastly.jsdelivr.net/gh/lionsoul2014/ip2region@master/data/ip2region_v4.xdb",
  "https://cdn.jsdelivr.net/gh/lionsoul2014/ip2region@master/data/ip2region_v4.xdb"
];
const XDB_HEADER_LEN = 256;
const XDB_SEG_LEN = 14;
let __xdbBytes = null;
let __xdbDv = null;
let __xdbLoading = null;
let __xdbFailAt = 0;

async function loadXdb() {
  if (__xdbBytes) return __xdbBytes;
  if (__xdbLoading) return __xdbLoading;
  if (__xdbFailAt && Date.now() - __xdbFailAt < 60000) {
    throw new Error("ip2region 数据源暂不可用");
  }
  __xdbLoading = (async () => {
    for (const u of XDB_URLS) {
      try {
        const res = await fetch(u, { cf: { cacheTtl: 604800, cacheEverything: true } });
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        if (ab.byteLength < 2000000) continue;
        __xdbBytes = new Uint8Array(ab);
        __xdbDv = new DataView(ab);
        return __xdbBytes;
      } catch (e) {
        console.warn("[XDB] 拉取失败:", u, e && e.message);
      }
    }
    __xdbFailAt = Date.now();
    throw new Error("所有 ip2region 数据源均不可用");
  })();
  try {
    return await __xdbLoading;
  } finally {
    __xdbLoading = null;
  }
}

function ipv4ToUint32(ip) {
  const parts = String(ip).split(".");
  if (parts.length !== 4) return -1;
  let n = 0;
  for (let i = 0; i < 4; i++) {
    if (parts[i] === "") return -1;
    const p = Number(parts[i]);
    if (!Number.isInteger(p) || p < 0 || p > 255) return -1;
    n = (n << 8) + p;
  }
  return n >>> 0;
}

function xdbSearch(ip) {
  const ipInt = ipv4ToUint32(ip);
  if (ipInt < 0) return "";
  const il0 = (ipInt >>> 24) & 0xFF;
  const il1 = (ipInt >>> 16) & 0xFF;
  const vi = XDB_HEADER_LEN + il0 * 2048 + il1 * 8;
  const sPtr = __xdbDv.getUint32(vi, true);
  const ePtr = __xdbDv.getUint32(vi + 4, true);
  if (!sPtr || !ePtr) return "";
  let l = 0, h = (ePtr - sPtr) / XDB_SEG_LEN;
  while (l <= h) {
    const m = (l + h) >> 1;
    const off = sPtr + m * XDB_SEG_LEN;
    const sip = __xdbDv.getUint32(off, true);
    if (ipInt < sip) { h = m - 1; continue; }
    const eip = __xdbDv.getUint32(off + 4, true);
    if (ipInt > eip) { l = m + 1; continue; }
    const dLen = __xdbDv.getUint16(off + 8, true);
    const dPtr = __xdbDv.getUint32(off + 10, true);
    return new TextDecoder("utf-8").decode(__xdbBytes.subarray(dPtr, dPtr + dLen));
  }
  return "";
}

function xdbRegionToLabel(region, countryMap) {
  if (!region) return "通用";
  const f = region.split("|");
  const iso = (f[4] || "").toUpperCase();
  if (!iso || iso === "0") return "通用";
  if (iso === "CN") {
    const prov = f[1] || "";
    if (prov.indexOf("香港") >= 0) return "香港";
    if (prov.indexOf("澳门") >= 0) return "澳门";
    if (prov.indexOf("台湾") >= 0) return "台湾";
    return "中国";
  }
  return countryMap[iso] || "通用";
}

const XDB_PRIVATE_CIDRS = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16",
  "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4"
];
const XDB_PRIVATE_NETS = XDB_PRIVATE_CIDRS.map(function (cidr) {
  const slash = cidr.indexOf("/");
  const netIp = ipv4ToUint32(cidr.slice(0, slash));
  const prefix = parseInt(cidr.slice(slash + 1), 10);
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  return { net: netIp & mask, mask: mask };
});
function isPrivateIPv4(ip) {
  const ipInt = ipv4ToUint32(ip);
  if (ipInt < 0) return false;
  for (const n of XDB_PRIVATE_NETS) {
    if ((ipInt & n.mask) === n.net) return true;
  }
  return false;
}

const __dohCache = new Map();
async function dohResolve(domain) {
  if (__dohCache.has(domain)) return __dohCache.get(domain);
  const endpoints = [
    "https://1.1.1.1/dns-query?name=" + encodeURIComponent(domain) + "&type=A",
    "https://dns.google/resolve?name=" + encodeURIComponent(domain) + "&type=A"
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: { accept: "application/dns-json" },
        cf: { cacheTtl: 300 }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const answers = data.Answer || data.answer || [];
      const a = answers.find(x => x.type === 1 && ipv4ToUint32(x.data) >= 0);
      if (a) {
        __dohCache.set(domain, a.data);
        return a.data;
      }
    } catch (e) {}
  }
  __dohCache.set(domain, "");
  return "";
}

async function lookupGeoTarget(target, countryMap) {
  let ip = (ipv4ToUint32(target) >= 0) ? target : await dohResolve(target);
  if (!ip) return { ip: "", label: "通用" };
  if (isPrivateIPv4(ip)) return { ip, label: "通用" };
  await loadXdb();
  return { ip, label: xdbRegionToLabel(xdbSearch(ip), countryMap) };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

    const COUNTRY_CN = {
      CN:"中国", US:"美国", JP:"日本", KR:"韩国", SG:"新加坡", HK:"中国香港", TW:"中国台湾", MO:"中国澳门",
      GB:"英国", DE:"德国", FR:"法国", RU:"俄罗斯", AU:"澳大利亚", CA:"加拿大", IN:"印度", BR:"巴西",
      IT:"意大利", ES:"西班牙", MX:"墨西哥", ID:"印度尼西亚", TH:"泰国", VN:"越南", MY:"马来西亚", PH:"菲律宾",
      TR:"土耳其", SA:"沙特阿拉伯", AE:"阿联酋", IL:"以色列", ZA:"南非", EG:"埃及", AR:"阿根廷", NL:"荷兰",
      SE:"瑞典", CH:"瑞士", BE:"比利时", AT:"奥地利", NO:"挪威", DK:"丹麦", FI:"芬兰", PL:"波兰",
      IE:"爱尔兰", PT:"葡萄牙", GR:"希腊", NZ:"新西兰", PK:"巴基斯坦", BD:"孟加拉国", NG:"尼日利亚", UA:"乌克兰",
      CO:"哥伦比亚", CL:"智利", PE:"秘鲁", IR:"伊朗", IQ:"伊拉克", QA:"卡塔尔", KW:"科威特", OM:"阿曼",
      JO:"约旦", LB:"黎巴嫩", SY:"叙利亚", YE:"也门", AF:"阿富汗", NP:"尼泊尔", LK:"斯里兰卡", MM:"缅甸",
      KH:"柬埔寨", LA:"老挝", BN:"文莱", MN:"蒙古", KZ:"哈萨克斯坦", UZ:"乌兹别克斯坦", TM:"土库曼斯坦", KG:"吉尔吉斯斯坦",
      TJ:"塔吉克斯坦", AZ:"阿塞拜疆", AM:"亚美尼亚", GE:"格鲁吉亚", BY:"白俄罗斯", MD:"摩尔多瓦", RO:"罗马尼亚", BG:"保加利亚",
      HR:"克罗地亚", SI:"斯洛文尼亚", RS:"塞尔维亚", ME:"黑山", MK:"北马其顿", AL:"阿尔巴尼亚", BA:"波黑", XK:"科索沃",
      EE:"爱沙尼亚", LV:"拉脱维亚", LT:"立陶宛", CZ:"捷克共和国", SK:"斯洛伐克", HU:"匈牙利", LU:"卢森堡", MC:"摩纳哥",
      LI:"列支敦士登", AD:"安道尔", SM:"圣马力诺", VA:"梵蒂冈", MT:"马耳他", IS:"冰岛", CY:"塞浦路斯",
      MA:"摩洛哥", DZ:"阿尔及利亚", TN:"突尼斯", LY:"利比亚", SD:"苏丹", SS:"南苏丹", ET:"埃塞俄比亚", SO:"索马里",
      KE:"肯尼亚", TZ:"坦桑尼亚", UG:"乌干达", RW:"卢旺达", BI:"布隆迪", MZ:"莫桑比克", ZW:"津巴布韦", ZM:"赞比亚",
      MW:"马拉维", AO:"安哥拉", NA:"纳米比亚", BW:"博茨瓦纳", LS:"莱索托", SZ:"斯威士兰", GM:"冈比亚", SN:"塞内加尔",
      MR:"毛里塔尼亚", ML:"马里", BF:"布基纳法索", NE:"尼日尔", TD:"乍得", CF:"中非", CM:"喀麦隆", GQ:"赤道几内亚",
      GA:"加蓬", CG:"刚果共和国", CD:"刚果民主共和国", ST:"圣多美和普林西比", GIN:"几内亚", SL:"塞拉利昂", LR:"利比里亚", CI:"科特迪瓦",
      GH:"加纳", TG:"多哥", BJ:"贝宁", ER:"厄立特里亚", DJ:"吉布提", KM:"科摩罗", MU:"毛里求斯", SC:"塞舌尔",
      CV:"佛得角", RE:"留尼汪", YT:"马约特", EH:"西撒哈拉",
      VE:"委内瑞拉", EC:"厄瓜多尔", BO:"玻利维亚", PY:"巴拉圭", UY:"乌拉圭", GY:"圭亚那", SR:"苏里南", GF:"法属圭亚那",
      CU:"古巴", JM:"牙买加", HT:"海地", DO:"多米尼加", PR:"波多黎各", TT:"特立尼达和多巴哥", PA:"巴拿马", CR:"哥斯达黎加",
      NI:"尼加拉瓜", HN:"洪都拉斯", SV:"萨尔瓦多", GT:"危地马拉", BZ:"伯利兹", BS:"巴哈马", BB:"巴巴多斯", DM:"多米尼克",
      LC:"圣卢西亚", VC:"圣文森特和格林纳丁斯", GD:"格林纳达", AG:"安提瓜和巴布达", KN:"圣基茨和尼维斯",
      FJ:"斐济", PG:"巴布亚新几内亚", SB:"所罗门群岛", VU:"瓦努阿图", NC:"新喀里多尼亚", PF:"法属波利尼西亚", WS:"萨摩亚", TO:"汤加",
      TV:"图瓦卢", KI:"基里巴斯", MH:"马绍尔群岛", FM:"密克罗尼西亚", PW:"帕劳", NR:"瑙鲁", GU:"关岛", AS:"美属萨摩亚",
      VI:"美属维尔京群岛", PRI:"波多黎各(美)", AW:"阿鲁巴", CW:"库拉索", SX:"荷属圣马丁", BQ:"荷兰加勒比区",
      BL:"圣巴泰勒米", MF:"法属圣马丁", PM:"圣皮埃尔和密克隆", GL:"格陵兰", FO:"法罗群岛", GI:"直布罗陀",
      AX:"奥兰群岛", SH:"圣赫勒拿", FK:"马尔维纳斯群岛", GS:"南乔治亚", TF:"法属南部领地", HM:"赫德岛和麦克唐纳群岛",
      UM:"美国本土外小岛屿", IO:"英属印度洋领地", BV:"布韦岛", CX:"圣诞岛", CC:"科科斯群岛", NF:"诺福克岛",
      PN:"皮特凯恩群岛", CK:"库克群岛", NU:"纽埃", TK:"托克劳", WF:"瓦利斯和富图纳",
      A1:"匿名代理", A2:"卫星提供商", O1:"其他国家/地区", XX:"未知国家/地区", T1:"中转区域"
    };

    const CITY_CN = {
      "Beijing":"北京市","Shanghai":"上海市","Guangzhou":"广州市","Shenzhen":"深圳市","Tianjin":"天津市","Chongqing":"重庆市",
      "Hong Kong":"香港","Hongkong":"香港","HongKong":"香港","Kowloon":"九龙","Macau":"澳门","Macao":"澳门","Taipei":"台北市",
      "New Taipei":"新北市","Taichung":"台中市","Kaohsiung":"高雄市","Tainan":"台南市","Hsinchu":"新竹市","Keelung":"基隆市",
      "Dongguan":"东莞市","Foshan":"佛山市","Zhongshan":"中山市","Zhuhai":"珠海市","Huizhou":"惠州市","Jiangmen":"江门市",
      "Shantou":"汕头市","Zhaoqing":"肇庆市","Zhanjiang":"湛江市","Maoming":"茂名市","Meizhou":"梅州市","Shaoguan":"韶关市",
      "Qingyuan":"清远市","Yangjiang":"阳江市","Jieyang":"揭阳市","Chaozhou":"潮州市","Heyuan":"河源市","Shanwei":"汕尾市",
      "Yunfu":"云浮市",
      "Hangzhou":"杭州市","Nanjing":"南京市","Suzhou":"苏州市","Ningbo":"宁波市","Wuxi":"无锡市","Wenzhou":"温州市",
      "Changzhou":"常州市","Shaoxing":"绍兴市","Jiaxing":"嘉兴市","Xuzhou":"徐州市","Huzhou":"湖州市","Jinhua":"金华市",
      "Taizhou":"台州市","Zhenjiang":"镇江市","Lishui":"丽水市","Yancheng":"盐城市","Yangzhou":"扬州市","Huaian":"淮安市",
      "Lianyungang":"连云港市","Suqian":"宿迁市","Zhoushan":"舟山市","Quzhou":"衢州市","Nantong":"南通市",
      "Chengdu":"成都市","Mianyang":"绵阳市","Yibin":"宜宾市","Nanchong":"南充市","Deyang":"德阳市","Leshan":"乐山市",
      "Luzhou":"泸州市","Dazhou":"达州市","Meishan":"眉山市","Suining":"遂宁市","Guang'an":"广安市","Panzhihua":"攀枝花市",
      "Ziyang":"资阳市","Neijiang":"内江市","Wanzhou":"万州区","Fuling":"涪陵区",
      "Wuhan":"武汉市","Yichang":"宜昌市","Xiangyang":"襄阳市","Huangshi":"黄石市","Jingzhou":"荆州市","Shiyan":"十堰市",
      "Xiaogan":"孝感市","Huanggang":"黄冈市","Jingmen":"荆门市","Ezhou":"鄂州市","Xianning":"咸宁市","Suizhou":"随州市",
      "Enshi":"恩施土家族苗族自治州","Enshi City":"恩施市",
      "Changsha":"长沙市","Zhuzhou":"株洲市","Xiangtan":"湘潭市","Hengyang":"衡阳市","Yueyang":"岳阳市","Changde":"常德市",
      "Shaoyang":"邵阳市","Zhangjiajie":"张家界市","Yiyang":"益阳市","Chenzhou":"郴州市","Yongzhou":"永州市","Huaihua":"怀化市",
      "Loudi":"娄底市","Xiangxi":"湘西土家族苗族自治州",
      "Jinan":"济南市","Qingdao":"青岛市","Yantai":"烟台市","Weifang":"潍坊市","Linyi":"临沂市","Jining":"济宁市",
      "Zibo":"淄博市","Weihai":"威海市","Rizhao":"日照市","Dongying":"东营市","Taian":"泰安市","Binzhou":"滨州市",
      "Dezhou":"德州市","Liaocheng":"聊城市","Heze":"菏泽市","Zaozhuang":"枣庄市",
      "Zhengzhou":"郑州市","Luoyang":"洛阳市","Nanyang":"南阳市","Xuchang":"许昌市","Xinxiang":"新乡市","Kaifeng":"开封市",
      "Anyang":"安阳市","Pingdingshan":"平顶山市","Shangqiu":"商丘市","Jiaozuo":"焦作市","Zhoukou":"周口市","Xinyang":"信阳市",
      "Luohe":"漯河市","Puyang":"濮阳市","Hebi":"鹤壁市","Sanmenxia":"三门峡市","Zhumadian":"驻马店市",
      "Shijiazhuang":"石家庄市","Tangshan":"唐山市","Qinhuangdao":"秦皇岛市","Handan":"邯郸市","Baoding":"保定市","Langfang":"廊坊市",
      "Cangzhou":"沧州市","Hengshui":"衡水市","Xingtai":"邢台市","Chengde":"承德市","Zhangjiakou":"张家口市",
      "Xiamen":"厦门市","Fuzhou":"福州市","Quanzhou":"泉州市","Putian":"莆田市","Zhangzhou":"漳州市","Longyan":"龙岩市",
      "Sanming":"三明市","Nanping":"南平市","Ningde":"宁德市",
      "Hefei":"合肥市","Wuhu":"芜湖市","Huangshan":"黄山市","Ma'anshan":"马鞍山市","Maanshan":"马鞍山市",
      "Bengbu":"蚌埠市","Anhui Bozhou":"亳州市","Suzhou (Anhui)":"宿州市","Anqing":"安庆市","Xuancheng":"宣城市",
      "Huainan":"淮南市","Huaibei":"淮北市","Chuzhou":"滁州市","Liuan":"六安市","Chizhou":"池州市","Tongling":"铜陵市",
      "Fuyang":"阜阳市","Bozhou":"亳州市","Lu'an":"六安市",
      "Nanchang":"南昌市","Jiujiang":"九江市","Ganzhou":"赣州市","Shangrao":"上饶市","Pingxiang":"萍乡市","Xinyu":"新余市",
      "Jian":"吉安市","Ji'an":"吉安市","Yichun":"宜春市","Fuzhou":"抚州市","Jingdezhen":"景德镇市","Yingtan":"鹰潭市",
      "Xi'an":"西安市","Xian":"西安市","Baoji":"宝鸡市","Xianyang":"咸阳市","Weinan":"渭南市","Yan'an":"延安市",
      "Yulin":"榆林市","Hanzhong":"汉中市","Ankang":"安康市","Shangluo":"商洛市","Tongchuan":"铜川市",
      "Taiyuan":"太原市","Datong":"大同市","Yuncheng":"运城市","Changzhi":"长治市","Jincheng":"晋城市","Jinzhong":"晋中市",
      "Linfen":"临汾市","Lvliang":"吕梁市","Luliang":"吕梁市","Shuozhou":"朔州市","Xinzhou":"忻州市","Yangquan":"阳泉市",
      "Shenyang":"沈阳市","Dalian":"大连市","Harbin":"哈尔滨市","Changchun":"长春市","Anshan":"鞍山市","Fushun":"抚顺市",
      "Jilin":"吉林市","Yanji":"延吉市","Daqing":"大庆市","Qiqihar":"齐齐哈尔市","Jinzhou":"锦州市","Mudanjiang":"牡丹江市",
      "Yingkou":"营口市","Benxi":"本溪市","Dandong":"丹东市","Fuxin":"阜新市","Liaoyang":"辽阳市","Panjin":"盘锦市",
      "Tieling":"铁岭市","Chaoyang":"朝阳市","Huludao":"葫芦岛市","Tonghua":"通化市","Baicheng":"白城市","Siping":"四平市",
      "Baishan":"白山市","Songyuan":"松原市","Jiamusi":"佳木斯市","Hegang":"鹤岗市","Shuangyashan":"双鸭山市","Jixi":"鸡西市",
      "Qitaihe":"七台河市","Suihua":"绥化市","Heihe":"黑河市","Daxing'anling":"大兴安岭地区",
      "Kunming":"昆明市","Dali":"大理白族自治州","Lijiang":"丽江市","Qujing":"曲靖市","Yuxi":"玉溪市","Baoshan":"保山市",
      "Zhaotong":"昭通市","Puer":"普洱市","Lincang":"临沧市","Chuxiong":"楚雄彝族自治州","Honghe":"红河哈尼族彝族自治州",
      "Wenshan":"文山壮族苗族自治州","Xishuangbanna":"西双版纳傣族自治州","Dehong":"德宏傣族景颇族自治州",
      "Nujiang":"怒江傈僳族自治州","Diqing":"迪庆藏族自治州",
      "Guiyang":"贵阳市","Zunyi":"遵义市","Liupanshui":"六盘水市","Anshun":"安顺市","Bijie":"毕节市",
      "Tongren":"铜仁市","Qiannan":"黔南布依族苗族自治州","Qiandongnan":"黔东南苗族侗族自治州",
      "Qianxinan":"黔西南布依族苗族自治州",
      "Nanning":"南宁市","Guilin":"桂林市","Liuzhou":"柳州市","Beihai":"北海市","Yulin":"玉林市","Wuzhou":"梧州市",
      "Qinzhou":"钦州市","Guigang":"贵港市","Fangchenggang":"防城港市","Baise":"百色市","Hezhou":"贺州市",
      "Hechi":"河池市","Laibin":"来宾市","Chongzuo":"崇左市",
      "Haikou":"海口市","Sanya":"三亚市","Sansha":"三沙市","Danzhou":"儋州市",
      "Lanzhou":"兰州市","Tianshui":"天水市","Jiuquan":"酒泉市","Jiayuguan":"嘉峪关市","Zhangye":"张掖市","Jinchang":"金昌市",
      "Baiyin":"白银市","Qingyang":"庆阳市","Pingliang":"平凉市","Dingxi":"定西市","Longnan":"陇南市","Linxia":"临夏回族自治州",
      "Gannan":"甘南藏族自治州","Wuwei":"武威市",
      "Xining":"西宁市","Haidong":"海东市","Haibei":"海北藏族自治州","Huangnan":"黄南藏族自治州",
      "Hainan":"海南藏族自治州","Guoluo":"果洛藏族自治州","Yushu":"玉树藏族自治州","Haixi":"海西蒙古族藏族自治州",
      "Yinchuan":"银川市","Shizuishan":"石嘴山市","Wuzhong":"吴忠市","Guyuan":"固原市","Zhongwei":"中卫市",
      "Hohhot":"呼和浩特市","Baotou":"包头市","Ordos":"鄂尔多斯市","Chifeng":"赤峰市","Tongliao":"通辽市",
      "Hulunbuir":"呼伦贝尔市","Ulanqab":"乌兰察布市","Bayannur":"巴彦淖尔市","Xing'an":"兴安盟",
      "Xilingol":"锡林郭勒盟","Alxa":"阿拉善盟","Wuhai":"乌海市",
      "Urumqi":"乌鲁木齐市","Kashgar":"喀什地区","Karamay":"克拉玛依市","Turpan":"吐鲁番市","Hami":"哈密市",
      "Changji":"昌吉回族自治州","Bortala":"博尔塔拉蒙古自治州","Bayingol":"巴音郭楞蒙古自治州",
      "Aksu":"阿克苏地区","Kizilsu":"克孜勒苏柯尔克孜自治州","Hotan":"和田地区",
      "Yili":"伊犁哈萨克自治州","Tacheng":"塔城地区","Altay":"阿勒泰地区","Shihezi":"石河子市",
      "Lhasa":"拉萨市","Shigatse":"日喀则市","Chamdo":"昌都市","Nyingchi":"林芝市","Shannan":"山南市",
      "Nagqu":"那曲市","Ngari":"阿里地区",
      "Aba":"阿坝藏族羌族自治州","Ngawa":"阿坝藏族羌族自治州","Garzê":"甘孜藏族自治州","Garze":"甘孜藏族自治州",
      "Liangshan":"凉山彝族自治州",

      "Tokyo":"东京","Osaka":"大阪","Kyoto":"京都","Yokohama":"横滨","Nagoya":"名古屋","Sapporo":"札幌","Fukuoka":"福冈",
      "Kobe":"神户","Hiroshima":"广岛","Sendai":"仙台","Kitakyushu":"北九州","Chiba":"千叶","Saitama":"埼玉",
      "Seoul":"首尔","Busan":"釜山","Incheon":"仁川","Daegu":"大邱","Gwangju":"光州","Daejeon":"大田","Ulsan":"蔚山",
      "Singapore":"新加坡市",
      "Kuala Lumpur":"吉隆坡","Johor Bahru":"新山","Ipoh":"怡保","Penang":"槟城","George Town":"乔治市","Malacca":"马六甲",
      "Jakarta":"雅加达","Surabaya":"泗水","Bandung":"万隆","Medan":"棉兰","Bali":"巴厘岛","Denpasar":"登巴萨",
      "Bangkok":"曼谷","Chiang Mai":"清迈","Pattaya":"芭堤雅","Phuket":"普吉岛","Hat Yai":"合艾",
      "Hanoi":"河内","Ho Chi Minh City":"胡志明市","Da Nang":"岘港","Hai Phong":"海防","Can Tho":"芹苴",
      "Manila":"马尼拉","Cebu":"宿务","Davao":"达沃",
      "Mumbai":"孟买","Delhi":"新德里","Bangalore":"班加罗尔","Hyderabad":"海得拉巴","Chennai":"金奈","Kolkata":"加尔各答",
      "Pune":"浦那","Ahmedabad":"艾哈迈达巴德",
      "Karachi":"卡拉奇","Lahore":"拉合尔","Islamabad":"伊斯兰堡",
      "Dhaka":"达卡","Kathmandu":"加德满都","Colombo":"科伦坡","Yangon":"仰光","Vientiane":"万象","Phnom Penh":"金边",
      "Bandar Seri Begawan":"斯里巴加湾市","Ulaanbaatar":"乌兰巴托",
      "Dubai":"迪拜","Abu Dhabi":"阿布扎比","Riyadh":"利雅得","Jeddah":"吉达","Doha":"多哈","Kuwait City":"科威特城",
      "Muscat":"马斯喀特","Amman":"安曼","Beirut":"贝鲁特","Damascus":"大马士革","Sana'a":"萨那","Jerusalem":"耶路撒冷",
      "Tel Aviv":"特拉维夫","Istanbul":"伊斯坦布尔","Ankara":"安卡拉","Baku":"巴库","Tbilisi":"第比利斯","Yerevan":"埃里温",
      "Astana":"阿斯塔纳","Almaty":"阿拉木图","Tashkent":"塔什干","Bishkek":"比什凯克","Dushanbe":"杜尚别","Ashgabat":"阿什哈巴德",
      "London":"伦敦","Manchester":"曼彻斯特","Birmingham":"伯明翰","Liverpool":"利物浦","Glasgow":"格拉斯哥","Edinburgh":"爱丁堡",
      "Leeds":"利兹","Bristol":"布里斯托尔","Sheffield":"谢菲尔德","Newcastle":"纽卡斯尔","Belfast":"贝尔法斯特","Dublin":"都柏林",
      "Paris":"巴黎","Marseille":"马赛","Lyon":"里昂","Toulouse":"图卢兹","Nice":"尼斯","Bordeaux":"波尔多","Lille":"里尔",
      "Berlin":"柏林","Munich":"慕尼黑","Hamburg":"汉堡","Frankfurt":"法兰克福","Cologne":"科隆","Stuttgart":"斯图加特",
      "Dusseldorf":"杜塞尔多夫","Leipzig":"莱比锡","Dresden":"德累斯顿","Bonn":"波恩",
      "Rome":"罗马","Milan":"米兰","Naples":"那不勒斯","Turin":"都灵","Florence":"佛罗伦萨","Venice":"威尼斯","Palermo":"巴勒莫",
      "Madrid":"马德里","Barcelona":"巴塞罗那","Valencia":"瓦伦西亚","Seville":"塞维利亚","Bilbao":"毕尔巴鄂","Malaga":"马拉加",
      "Amsterdam":"阿姆斯特丹","Rotterdam":"鹿特丹","The Hague":"海牙","Utrecht":"乌得勒支","Eindhoven":"埃因霍温",
      "Brussels":"布鲁塞尔","Antwerp":"安特卫普","Ghent":"根特","Luxembourg":"卢森堡市",
      "Vienna":"维也纳","Salzburg":"萨尔茨堡","Graz":"格拉茨","Zurich":"苏黎世","Geneva":"日内瓦","Basel":"巴塞尔",
      "Stockholm":"斯德哥尔摩","Gothenburg":"哥德堡","Oslo":"奥斯陆","Bergen":"卑尔根","Copenhagen":"哥本哈根","Aarhus":"奥胡斯",
      "Helsinki":"赫尔辛基","Tampere":"坦佩雷","Reykjavik":"雷克雅未克","Warsaw":"华沙","Krakow":"克拉科夫",
      "Prague":"布拉格","Bratislava":"布拉迪斯拉发","Budapest":"布达佩斯","Ljubljana":"卢布尔雅那","Zagreb":"萨格勒布",
      "Belgrade":"贝尔格莱德","Bucharest":"布加勒斯特","Sofia":"索非亚","Athens":"雅典","Thessaloniki":"塞萨洛尼基",
      "Lisbon":"里斯本","Porto":"波尔图","Nicosia":"尼科西亚","Valletta":"瓦莱塔","Moscow":"莫斯科","Saint Petersburg":"圣彼得堡",
      "Novosibirsk":"新西伯利亚","Yekaterinburg":"叶卡捷琳堡","Kazan":"喀山","Sochi":"索契","Vladivostok":"符拉迪沃斯托克(海参崴)",
      "Kiev":"基辅","Kyiv":"基辅","Kharkiv":"哈尔科夫","Odessa":"敖德萨","Minsk":"明斯克","Chisinau":"基希讷乌",
      "Tiraspol":"蒂拉斯波尔","Sukhumi":"苏呼米","Tskhinvali":"茨欣瓦利","Pristina":"普里什蒂纳","Skopje":"斯科普里",
      "Tirana":"地拉那","Podgorica":"波德戈里察","Sarajevo":"萨拉热窝","Banja Luka":"巴尼亚卢卡","Mostar":"莫斯塔尔",
      "Riga":"里加","Tallinn":"塔林","Vilnius":"维尔纽斯",
      "Cairo":"开罗","Alexandria":"亚历山大","Luxor":"卢克索","Cape Town":"开普敦","Johannesburg":"约翰内斯堡","Pretoria":"比勒陀利亚",
      "Durban":"德班","Port Elizabeth":"伊丽莎白港","Nairobi":"内罗毕","Mombasa":"蒙巴萨","Lagos":"拉各斯","Abuja":"阿布贾",
      "Casablanca":"卡萨布兰卡","Rabat":"拉巴特","Marrakech":"马拉喀什","Algiers":"阿尔及尔","Tunis":"突尼斯市",
      "Tripoli":"的黎波里","Khartoum":"喀土穆","Addis Ababa":"亚的斯亚贝巴","Dar es Salaam":"达累斯萨拉姆","Kampala":"坎帕拉",
      "Kigali":"基加利","Luanda":"罗安达","Maputo":"马普托","Harare":"哈拉雷","Lusaka":"卢萨卡","Abidjan":"阿比让",
      "Accra":"阿克拉","Dakar":"达喀尔","Douala":"杜阿拉","Bamako":"巴马科","Lomé":"洛美","Brazzaville":"布拉柴维尔",
      "Kinshasa":"金沙萨","Libreville":"利伯维尔","Yaounde":"雅温得","Yaoundé":"雅温得",
      "New York":"纽约","Los Angeles":"洛杉矶","Chicago":"芝加哥","Houston":"休斯顿","Phoenix":"菲尼克斯","Philadelphia":"费城",
      "San Antonio":"圣安东尼奥","San Diego":"圣迭戈","Dallas":"达拉斯","San Jose":"圣何塞","Austin":"奥斯汀",
      "Jacksonville":"杰克逊维尔","Fort Worth":"沃斯堡","Columbus":"哥伦布","Charlotte":"夏洛特","Indianapolis":"印第安纳波利斯",
      "San Francisco":"旧金山","Seattle":"西雅图","Denver":"丹佛","Washington":"华盛顿","Washington D.C.":"华盛顿特区",
      "Boston":"波士顿","El Paso":"埃尔帕索","Nashville":"纳什维尔","Detroit":"底特律","Oklahoma City":"俄克拉荷马城",
      "Portland":"波特兰","Las Vegas":"拉斯维加斯","Memphis":"孟菲斯","Louisville":"路易斯维尔","Baltimore":"巴尔的摩",
      "Milwaukee":"密尔沃基","Albuquerque":"阿尔伯克基","Tucson":"图森","Fresno":"弗雷斯诺","Sacramento":"萨克拉门托",
      "Miami":"迈阿密","Atlanta":"亚特兰大","Minneapolis":"明尼阿波利斯","Tampa":"坦帕","New Orleans":"新奥尔良",
      "Honolulu":"火奴鲁鲁(檀香山)","Anchorage":"安克雷奇",
      "Toronto":"多伦多","Vancouver":"温哥华","Montreal":"蒙特利尔","Calgary":"卡尔加里","Edmonton":"埃德蒙顿","Ottawa":"渥太华",
      "Winnipeg":"温尼伯","Quebec City":"魁北克市","Hamilton":"汉密尔顿",
      "Sydney":"悉尼","Melbourne":"墨尔本","Brisbane":"布里斯班","Perth":"珀斯","Adelaide":"阿德莱德","Gold Coast":"黄金海岸",
      "Canberra":"堪培拉","Newcastle":"纽卡斯尔","Wollongong":"伍伦贡","Auckland":"奥克兰","Wellington":"惠灵顿",
      "Christchurch":"基督城","Hamilton (NZ)":"哈密尔顿(NZ)","Dunedin":"达尼丁",
      "Sao Paulo":"圣保罗","São Paulo":"圣保罗","Rio de Janeiro":"里约热内卢","Brasilia":"巴西利亚","Salvador":"萨尔瓦多",
      "Fortaleza":"福塔莱萨","Belo Horizonte":"贝洛奥里藏特","Manaus":"马瑙斯","Curitiba":"库里蒂巴","Recife":"累西腓",
      "Buenos Aires":"布宜诺斯艾利斯","Cordoba":"科尔多瓦","Rosario":"罗萨里奥","Mendoza":"门多萨","Santiago":"圣地亚哥",
      "Lima":"利马","Cusco":"库斯科","Bogota":"波哥大","Bogotá":"波哥大","Medellin":"麦德林","Cali":"卡利","Barranquilla":"巴兰基亚",
      "Caracas":"加拉加斯","Quito":"基多","Guayaquil":"瓜亚基尔","Asuncion":"亚松森","Asunción":"亚松森",
      "Montevideo":"蒙得维的亚","La Paz":"拉巴斯","Sucre":"苏克雷","Santa Cruz":"圣克鲁斯","Panama City":"巴拿马城",
      "San Jose":"圣何塞(哥斯达黎加)","San José":"圣何塞(哥斯达黎加)","Managua":"马那瓜","Tegucigalpa":"特古西加尔巴",
      "San Salvador":"圣萨尔瓦多","Guatemala City":"危地马拉城","Belmopan":"贝尔莫潘","Havana":"哈瓦那",
      "Santo Domingo":"圣多明各","Mexico City":"墨西哥城","Guadalajara":"瓜达拉哈拉","Monterrey":"蒙特雷","Puebla":"普埃布拉",
      "Tijuana":"蒂华纳","Cancun":"坎昆","Cancún":"坎昆","Acapulco":"阿卡普尔科","Merida":"梅里达","León":"莱昂",
      "Kingston":"金斯顿","Port-au-Prince":"太子港","San Juan":"圣胡安","Port of Spain":"西班牙港","Paramaribo":"帕拉马里博",
      "Cayenne":"卡宴","Santiago de Cuba":"圣地亚哥-德古巴","Havana Province":"哈瓦那省","Nassau":"拿骚",
      "Bridgetown":"布里奇敦","Roseau":"罗索","Castries":"卡斯特里","Kingstown":"金斯敦","St. George's":"圣乔治",
      "St. John's":"圣约翰","Basseterre":"巴斯特尔",
      "Suva":"苏瓦","Port Moresby":"莫尔兹比港","Nadi":"楠迪","Apia":"阿皮亚","Nuku'alofa":"努库阿洛法","Funafuti":"富纳富提",
      "Tarawa":"塔拉瓦","Majuro":"马朱罗","Palikir":"帕利基尔","Ngerulmud":"恩吉鲁穆德","Yaren":"亚伦区","Hagatna":"阿加尼亚",
      "Pago Pago":"帕果帕果","Charlotte Amalie":"夏洛特阿马利亚","Oranjestad":"奥拉涅斯塔德","Willemstad":"威廉斯塔德",
      "Philipsburg":"菲利普斯堡","Kralendijk":"克拉伦代克","Gustavia":"古斯塔维亚","Marigot":"马里戈",
      "Saint-Pierre":"圣皮埃尔","Nuuk":"努克","Torshavn":"托尔斯港","Thorshavn":"托尔斯港","Gibraltar":"直布罗陀",
      "Mariehamn":"玛丽港","Jamestown":"詹姆斯敦","Stanley":"斯坦利",
      "Adamstown":"亚当斯敦","Avarua":"阿瓦鲁阿","Alofi":"阿洛菲","Fakaofo":"法考福","Mata-Utu":"马塔乌图",
      "Papeete":"帕皮提","Noumea":"努美阿","Port Vila":"维拉港","Honiara":"霍尼亚拉"
    };

    const PATH_FUNCTION = {
      "/":"访问主页（Clash 配置生成器）",
      "/index.html":"访问主页（Clash 配置生成器）",
      "/api/visit":"API: 查询访问者信息",
      "/favicon.ico":"请求站点图标",
      "/robots.txt":"请求 robots.txt"
    };

    function toCnCountry(raw) {
      if (!raw) return "未知国家";
      const s = raw.toString().trim();
      if (!s) return "未知国家";
      if (s.length === 2 && COUNTRY_CN[s]) return COUNTRY_CN[s];
      if (s.length === 2) {
        const up = s.toUpperCase();
        if (COUNTRY_CN[up]) return COUNTRY_CN[up];
      }
      const EN_COUNTRY = {
        "China":"中国","United States":"美国","Japan":"日本","South Korea":"韩国","Korea, Republic of":"韩国",
        "Singapore":"新加坡","Hong Kong":"中国香港","Taiwan":"中国台湾","Macau":"中国澳门",
        "United Kingdom":"英国","Great Britain":"英国","England":"英格兰","Scotland":"苏格兰","Wales":"威尔士",
        "Germany":"德国","France":"法国","Russia":"俄罗斯","Russian Federation":"俄罗斯",
        "Australia":"澳大利亚","Canada":"加拿大","India":"印度","Brazil":"巴西","Italy":"意大利","Spain":"西班牙",
        "Mexico":"墨西哥","Indonesia":"印度尼西亚","Thailand":"泰国","Vietnam":"越南","Malaysia":"马来西亚",
        "Philippines":"菲律宾","Turkey":"土耳其","Saudi Arabia":"沙特阿拉伯","United Arab Emirates":"阿联酋",
        "Israel":"以色列","South Africa":"南非","Egypt":"埃及","Argentina":"阿根廷","Netherlands":"荷兰",
        "Sweden":"瑞典","Switzerland":"瑞士","Belgium":"比利时","Austria":"奥地利","Norway":"挪威","Denmark":"丹麦",
        "Finland":"芬兰","Poland":"波兰","Ireland":"爱尔兰","Portugal":"葡萄牙","Greece":"希腊","New Zealand":"新西兰",
        "Pakistan":"巴基斯坦","Bangladesh":"孟加拉国","Nigeria":"尼日利亚","Ukraine":"乌克兰","Colombia":"哥伦比亚",
        "Chile":"智利","Peru":"秘鲁","Iran":"伊朗","Iraq":"伊拉克","Qatar":"卡塔尔","Kuwait":"科威特",
        "Oman":"阿曼","Jordan":"约旦","Lebanon":"黎巴嫩","Syria":"叙利亚","Yemen":"也门","Afghanistan":"阿富汗",
        "Nepal":"尼泊尔","Sri Lanka":"斯里兰卡","Myanmar":"缅甸","Burma":"缅甸","Cambodia":"柬埔寨","Laos":"老挝",
        "Brunei":"文莱","Mongolia":"蒙古","Kazakhstan":"哈萨克斯坦","Uzbekistan":"乌兹别克斯坦",
        "Turkmenistan":"土库曼斯坦","Kyrgyzstan":"吉尔吉斯斯坦","Tajikistan":"塔吉克斯坦",
        "Azerbaijan":"阿塞拜疆","Armenia":"亚美尼亚","Georgia":"格鲁吉亚","Belarus":"白俄罗斯",
        "Moldova":"摩尔多瓦","Romania":"罗马尼亚","Bulgaria":"保加利亚","Croatia":"克罗地亚",
        "Slovenia":"斯洛文尼亚","Serbia":"塞尔维亚","Montenegro":"黑山","North Macedonia":"北马其顿",
        "Albania":"阿尔巴尼亚","Bosnia and Herzegovina":"波黑","Kosovo":"科索沃",
        "Estonia":"爱沙尼亚","Latvia":"拉脱维亚","Lithuania":"立陶宛","Czech Republic":"捷克共和国","Czechia":"捷克共和国",
        "Slovakia":"斯洛伐克","Hungary":"匈牙利","Luxembourg":"卢森堡","Monaco":"摩纳哥",
        "Liechtenstein":"列支敦士登","Andorra":"安道尔","San Marino":"圣马力诺","Vatican":"梵蒂冈",
        "Vatican City":"梵蒂冈","Malta":"马耳他","Iceland":"冰岛","Cyprus":"塞浦路斯",
        "Morocco":"摩洛哥","Algeria":"阿尔及利亚","Tunisia":"突尼斯","Libya":"利比亚","Sudan":"苏丹",
        "South Sudan":"南苏丹","Ethiopia":"埃塞俄比亚","Somalia":"索马里","Kenya":"肯尼亚","Tanzania":"坦桑尼亚",
        "Uganda":"乌干达","Rwanda":"卢旺达","Burundi":"布隆迪","Mozambique":"莫桑比克",
        "Zimbabwe":"津巴布韦","Zambia":"赞比亚","Malawi":"马拉维","Angola":"安哥拉","Namibia":"纳米比亚",
        "Botswana":"博茨瓦纳","Lesotho":"莱索托","Eswatini":"斯威士兰","Gambia":"冈比亚","Senegal":"塞内加尔",
        "Mauritania":"毛里塔尼亚","Mali":"马里","Burkina Faso":"布基纳法索","Niger":"尼日尔","Chad":"乍得",
        "Central African Republic":"中非","Cameroon":"喀麦隆","Equatorial Guinea":"赤道几内亚",
        "Gabon":"加蓬","Republic of the Congo":"刚果共和国","DR Congo":"刚果民主共和国",
        "Democratic Republic of the Congo":"刚果民主共和国","Guinea":"几内亚","Sierra Leone":"塞拉利昂",
        "Liberia":"利比里亚","Cote d'Ivoire":"科特迪瓦","Ivory Coast":"科特迪瓦","Ghana":"加纳","Togo":"多哥",
        "Benin":"贝宁","Eritrea":"厄立特里亚","Djibouti":"吉布提","Comoros":"科摩罗","Mauritius":"毛里求斯",
        "Seychelles":"塞舌尔","Cape Verde":"佛得角","Reunion":"留尼汪","Mayotte":"马约特",
        "Western Sahara":"西撒哈拉","Venezuela":"委内瑞拉","Ecuador":"厄瓜多尔","Bolivia":"玻利维亚",
        "Paraguay":"巴拉圭","Uruguay":"乌拉圭","Guyana":"圭亚那","Suriname":"苏里南","French Guiana":"法属圭亚那",
        "Cuba":"古巴","Jamaica":"牙买加","Haiti":"海地","Dominican Republic":"多米尼加","Puerto Rico":"波多黎各",
        "Trinidad and Tobago":"特立尼达和多巴哥","Panama":"巴拿马","Costa Rica":"哥斯达黎加",
        "Nicaragua":"尼加拉瓜","Honduras":"洪都拉斯","El Salvador":"萨尔瓦多","Guatemala":"危地马拉",
        "Belize":"伯利兹","Bahamas":"巴哈马","Barbados":"巴巴多斯","Fiji":"斐济",
        "Papua New Guinea":"巴布亚新几内亚","Solomon Islands":"所罗门群岛","Vanuatu":"瓦努阿图",
        "New Caledonia":"新喀里多尼亚","French Polynesia":"法属波利尼西亚","Samoa":"萨摩亚","Tonga":"汤加",
        "Tuvalu":"图瓦卢","Kiribati":"基里巴斯","Marshall Islands":"马绍尔群岛",
        "Micronesia":"密克罗尼西亚","Palau":"帕劳","Nauru":"瑙鲁","Guam":"关岛",
        "American Samoa":"美属萨摩亚","Greenland":"格陵兰","Faroe Islands":"法罗群岛","Gibraltar":"直布罗陀"
      };
      if (EN_COUNTRY[s]) return EN_COUNTRY[s];
      const lower = s.toLowerCase();
      if (lower.includes("china") && !lower.includes("taiwan") && !lower.includes("hong") && !lower.includes("macau")) return "中国";
      if (lower.includes("chinese")) return "中国";
      return s;
    }

    function toCnCity(raw) {
      if (!raw) return "未知地区";
      const s = raw.toString().trim();
      if (!s) return "未知地区";
      if (CITY_CN[s]) return CITY_CN[s];
      const normalized = s.split(" ").map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");
      if (CITY_CN[normalized]) return CITY_CN[normalized];
      const noApos = s.replace(/['\u2019]/g, "");
      if (CITY_CN[noApos]) return CITY_CN[noApos];
      if (CITY_CN[noApos.replace(/\s*\(.*\)\s*$/,"")]) return CITY_CN[noApos.replace(/\s*\(.*\)\s*$/,"")];
      return s;
    }

    function toFunctionName(path) {
      if (!path) return "未知功能";
      const p = path.toString();
      if (PATH_FUNCTION[p]) return PATH_FUNCTION[p];
      const qIdx = p.indexOf("?");
      if (qIdx > 0) {
        const noQuery = p.slice(0, qIdx);
        if (PATH_FUNCTION[noQuery]) return PATH_FUNCTION[noQuery];
      }
      const clean = (qIdx > 0 ? p.slice(0, qIdx) : p);
      if (clean.startsWith("/api/")) return "API 接口: " + clean;
      if (clean.startsWith("/static/") || clean.includes(".")) return "资源请求: " + clean;
      return "访问: " + clean;
    }

    const country = toCnCountry(request.cf?.country || "未知国家");
    const city = toCnCity(request.cf?.city || request.cf?.region || "未知地区");
    const nowIso = new Date().toISOString();

    const SECURITY_HEADERS = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    };
    function withSecurityHeaders(headersObj) {
      return Object.assign({}, SECURITY_HEADERS, headersObj || {});
    }

    function methodNotAllowedResponse(allowMethods) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: withSecurityHeaders({
          "Allow": allowMethods,
          "Content-Type": "text/plain;charset=UTF-8"
        })
      });
    }

    const SHARED_HEAD_META = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#f8fafc">
<script>(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#0f172a':'#f8fafc');}}catch(e){}})();</script>`;

    const SHARED_TRACK_SCRIPT = `<script>
function trackAction(actionName, extra) {
  try {
    const name = (actionName || "").toString().slice(0, 150);
    if (!name) return;
    const payload = { action: name };
    if (extra !== undefined && extra !== null) {
      const e = String(extra).slice(0, 200);
      if (e) payload.extra = e;
    }
    const jsonStr = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([jsonStr], { type: "application/json" });
        if (!navigator.sendBeacon("/api/track", blob)) {
          fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: jsonStr,
            keepalive: true,
            credentials: "same-origin"
          }).catch(function(){});
        }
      } catch (be) {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonStr,
          keepalive: true,
          credentials: "same-origin"
        }).catch(function(){});
      }
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
        keepalive: true,
        credentials: "same-origin"
      }).catch(function(){});
    }
  } catch (_) { }
}
</script>`;

    async function recordVisit(path, actionDirect) {
      if (env && env.DB) {
        d1Heartbeat(env.DB, clientIp).catch(function (e) { console.warn("D1 在线心跳失败:", e); });
      }
      if (!env || !env.PAGE_VISITS) return 0;
      try {
        const safePath = (path || "").toString().slice(0, 200);
        const functionName = (actionDirect && typeof actionDirect === "string" && actionDirect.trim())
          ? ("功能操作: " + actionDirect.trim()).slice(0, 200)
          : toFunctionName(safePath).slice(0, 200);
        const TTL_30_DAYS = 30 * 24 * 60 * 60;
        const TTL_DEDUPE_10_MIN = 10 * 60;

        const dedupeKey = `dedupe:${clientIp}:${functionName}`;
        if (await env.PAGE_VISITS.get(dedupeKey)) return 0;
        await env.PAGE_VISITS.put(dedupeKey, "1", { expirationTtl: TTL_DEDUPE_10_MIN })
          .catch(dedupeErr => console.warn("写操作去重标记失败:", dedupeErr));

        const newLog = { ip: clientIp, country, city, time: nowIso, path: functionName };
        let logs = [];
        const existingLogsStr = await env.PAGE_VISITS.get("visit_logs_list");
        if (existingLogsStr) {
          try { logs = JSON.parse(existingLogsStr) || []; } catch (_) { logs = []; }
        }
        logs.unshift(newLog);
        if (logs.length > 100) logs = logs.slice(0, 100);
        await env.PAGE_VISITS.put("visit_logs_list", JSON.stringify(logs), { expirationTtl: TTL_30_DAYS });
        return 0;
      } catch (e) {
        console.error("KV 写入异常:", e);
        return 0;
      }
    }

    if (url.pathname === "/api/track") {
      if (request.method !== "POST") return methodNotAllowedResponse("POST");
      const TRACK_RATE_LIMIT = 10;
      const TRACK_RATE_WINDOW = 60;
      if (env && env.PAGE_VISITS && clientIp) {
        try {
          const rlKey = "rl:track:" + clientIp;
          const rlRaw = await env.PAGE_VISITS.get(rlKey);
          const rlCount = rlRaw ? parseInt(rlRaw, 10) : 0;
          if (rlCount >= TRACK_RATE_LIMIT) {
            return new Response(JSON.stringify({ ok: false, error: "请求过于频繁，请稍后再试" }), {
              status: 429,
              headers: withSecurityHeaders({
                "Content-Type": "application/json;charset=UTF-8",
                "Retry-After": String(TRACK_RATE_WINDOW)
              })
            });
          }
          await env.PAGE_VISITS.put(rlKey, String(rlCount + 1), { expirationTtl: TRACK_RATE_WINDOW });
        } catch (_) { }
      }
      const ct = (request.headers.get("Content-Type") || "").toLowerCase();
      let action = "";
      let extra = "";
      if (ct.indexOf("application/json") >= 0) {
        try {
          const j = await request.json();
          action = (j?.action || "").toString();
          extra = (j?.extra || "").toString();
        } catch (_) { action = ""; }
      } else {
        try {
          const formData = await request.formData();
          action = (formData.get("action") || "").toString();
          extra = (formData.get("extra") || "").toString();
        } catch (_) {
          const text = await request.text().catch(() => "");
          if (text) {
            try {
              const sp = new URLSearchParams(text);
              action = sp.get("action") || "";
              extra = sp.get("extra") || "";
            } catch (_) {}
          }
        }
      }
      if (!action) {
        return new Response(JSON.stringify({ ok: false, error: "缺少 action 字段" }), {
          status: 400,
          headers: withSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8" })
        });
      }
      const fullAction = extra ? (action + " ｜ 详情: " + extra) : action;
      ctx.waitUntil(recordVisit("/api/track", fullAction));
      return new Response(JSON.stringify({ ok: true, received: fullAction }), {
        status: 200,
        headers: withSecurityHeaders({
          "Content-Type": "application/json;charset=UTF-8",
          "Cache-Control": "no-store"
        })
      });
    }

    if (url.pathname === "/api/visit") {
      if (request.method !== "GET") return methodNotAllowedResponse("GET");
      let visitCount = 0;
      let onlineCount = 0;
      let counterReady = false;

      ctx.waitUntil(recordVisit("/api/visit"));

      if (env && env.DB) {
        counterReady = true;
        try {
          const stats = await d1TrackAndGetStats(env.DB, clientIp);
          visitCount = stats.visitCount;
          onlineCount = stats.onlineCount;
        } catch (statsErr) {
          console.warn("D1 访客统计失败:", statsErr);
          counterReady = false;
        }
      }

      return new Response(JSON.stringify({
        ip: clientIp,
        country: country,
        city: city,
        visitCount: visitCount,
        onlineCount: onlineCount,
        counterReady: counterReady
      }), {
        headers: withSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8" })
      });
    }

    if (url.pathname === "/api/geo-lookup") {
      if (request.method !== "GET") return methodNotAllowedResponse("GET");

      const rawHosts = (url.searchParams.get("host") || "").split(",").map(s => s.trim()).filter(Boolean);
      const rawIps = (url.searchParams.get("ip") || "").split(",").map(s => s.trim()).filter(Boolean);
      const targets0 = rawHosts.length ? rawHosts : rawIps;

      ctx.waitUntil(recordVisit("/api/geo-lookup", "节点地理查询：" + targets0.length + " 个目标"));

      if (!targets0.length) {
        return new Response(JSON.stringify({ ok: false, error: "缺少 host 或 ip 参数", results: [] }), {
          status: 400,
          headers: withSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8" })
        });
      }

      const targets = Array.from(new Set(targets0)).slice(0, 20);
      const results = new Array(targets.length);
      let cursor = 0;
      async function geoWorker() {
        while (cursor < targets.length) {
          const i = cursor++;
          const t = targets[i];
          try {
            const r = await lookupGeoTarget(t, COUNTRY_CN);
            results[i] = { host: t, ip: r.ip, label: r.label };
          } catch (e) {
            console.warn("[GeoLookup] 查询失败:", t, e && e.message);
            results[i] = { host: t, ip: "", label: "通用" };
          }
        }
      }
      await Promise.all(Array.from({ length: 8 }, geoWorker));

      return new Response(JSON.stringify({ ok: true, results }), {
        headers: withSecurityHeaders({
          "Content-Type": "application/json;charset=UTF-8",
          "Cache-Control": "public, max-age=3600"
        })
      });
    }

    await recordVisit("/");

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    ${SHARED_HEAD_META}
    <title> OpenClash(.yaml)规则文件一键生成工具 </title>
    <style>
        :root {
            --bg-base: #f3f2f1;
            --body-bg: linear-gradient(180deg, #faf9f8 0%, #f3f2f1 45%, #edebe9 100%);
            --surface: #ffffff;
            --container-bg: rgba(255, 255, 255, 0.72);
            --primary: #0078d4;
            --primary-hover: #106ebe;
            --primary-pressed: #005a9e;
            --primary-soft: #deecf9;
            --primary-soft-border: rgba(0, 120, 212, 0.25);
            --secondary-deep: #323130;
            --card-border: #e1e1e1;
            --card-border-hover: #c8c6c4;
            --input-border: #8a8886;
            --text-strong: #323130;
            --text-main: #605e5c;
            --text-muted: #a19f9d;
            --input-bg: #ffffff;
            --input-ring: rgba(0, 120, 212, 0.3);
            --output-bg: #faf9f8;
            --output-color: #323130;
            --option-bg: #ffffff;
            --node-card-bg: #ffffff;
            --btn-add-node-bg: #ffffff;
            --mode-btn-bg: #ffffff;
            --btn-sub-color: #323130;
            --quick-link-color: #0078d4;
            --mode-desc-color: #004578;
            --mode-desc-bg: #deecf9;
            --mode-desc-border: rgba(0, 120, 212, 0.25);
            --success: #107c10;
            --success-soft: #dff6dd;
            --warning: #9d5d00;
            --warning-soft: #fff4ce;
            --danger: #c50f1f;
            --danger-soft: #fde7e9;
            --ghost-pressed-bg: #f0f0f0;
            --shadow-1: 0 1.6px 3.6px rgba(0, 0, 0, 0.13), 0 0.3px 0.9px rgba(0, 0, 0, 0.1);
            --shadow-2: 0 3.2px 7.2px rgba(0, 0, 0, 0.13), 0 0.6px 1.8px rgba(0, 0, 0, 0.1);
            --shadow-3: 0 6.4px 14.4px rgba(0, 0, 0, 0.13), 0 1.2px 3.6px rgba(0, 0, 0, 0.1);
            --shadow-hover: 0 6.4px 14.4px rgba(0, 0, 0, 0.18), 0 1.2px 3.6px rgba(0, 0, 0, 0.14);
        }

        body {
            font-family: 'Segoe UI Variable Display', 'Segoe UI', 'Segoe UI Web', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            padding: 24px;
            background: var(--body-bg);
            background-attachment: fixed;
            color: var(--text-main);
            margin: 0;
            min-height: 100vh;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: var(--container-bg);
            -webkit-backdrop-filter: blur(32px) saturate(150%);
            backdrop-filter: blur(32px) saturate(150%);
            padding: 28px;
            border-radius: 8px;
            border: 1px solid var(--card-border);
            box-shadow: var(--shadow-2);
            transition: box-shadow 200ms ease-out, border-color 200ms ease-out;
        }
        .container:hover {
            box-shadow: var(--shadow-hover);
            border-color: var(--card-border-hover);
        }

        @media (max-width: 1024px) {
            body { padding: 18px; }
            .container { padding: 22px; border-radius: 8px; }
            .hero h2 { font-size: 21px; }
        }
        @media (max-width: 640px) {
            body { padding: 12px; }
            .container { padding: 16px; border-radius: 8px; box-shadow: var(--shadow-2); }
            .hero { padding-top: 6px; }
            .hero h2 { font-size: 18px; margin-bottom: 14px; }
            .hero-logo { height: 22px; width: 22px; vertical-align: -4px; }
            .hero-sub { font-size: 12px; }
            .ip-stats-badge { font-size: 11px; padding: 5px 10px; flex-wrap: wrap; justify-content: center; row-gap: 2px; }
            .download-btn-link.home-link { width: 100%; justify-content: center; }
            .download-btn-link { padding: 10px 12px; font-size: 12px; }
            .mode-btn-group { flex-direction: column; }
            .mode-btn { width: 100%; min-height: 48px; }
            .row { flex-direction: column !important; gap: 8px !important; }
            .row > div { width: 100% !important; flex: none !important; }
            .section-title { font-size: 14px; }
            label { font-size: 12px; }
            table { font-size: 12px; }
            th, td { padding: 8px 6px; }
        }
        @media (max-width: 380px) {
            body { padding: 8px; }
            .container { padding: 12px; }
            .hero h2 { font-size: 16px; }
            .step-card { padding: 14px 12px 14px; border-radius: 8px; }
            .step-title { font-size: 14px; }
            .ip-stats-badge { font-size: 10px; padding: 4px 8px; }
        }
        @media (pointer: coarse) {
            .download-btn-link { min-height: 40px; }
            .btn-main, .btn-clear, .btn-lookup { min-height: 48px; }
        }
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }

        .hero { text-align: center; padding: 10px 8px 4px; }
        .hero h2 {
            margin: 0 0 20px;
            color: var(--text-strong);
            font-size: 26px;
            font-weight: 600;
            letter-spacing: -0.01em;
        }
        .hero-sub { color: var(--text-muted); font-size: 13px; white-space: nowrap; }
        .hero-logo {
            height: 30px;
            width: 30px;
            vertical-align: -6px;
            border-radius: 50%;
            margin-right: 2px;
        }
        html[data-theme="dark"] .hero-logo {
            box-shadow:
                0 0 0 1.5px rgba(76, 194, 255, 0.6),
                0 0 12px rgba(0, 120, 212, 0.5),
                0 0 28px rgba(0, 120, 212, 0.22);
        }
        @media (prefers-color-scheme: dark) {
            html:not([data-theme="light"]) .hero-logo {
                box-shadow:
                    0 0 0 1.5px rgba(76, 194, 255, 0.6),
                    0 0 12px rgba(0, 120, 212, 0.5),
                    0 0 28px rgba(0, 120, 212, 0.22);
            }
        }
        .hero-tools { display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; }

        .step-card {
            background: var(--surface);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 18px 20px 20px;
            margin-top: 22px;
            box-shadow: var(--shadow-1);
            transition: box-shadow 200ms ease-out, transform 200ms ease-out, border-color 200ms ease-out;
        }
        .step-card:hover {
            box-shadow: var(--shadow-hover);
            border-color: var(--card-border-hover);
            transform: translateY(-4px);
        }
        .step-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            font-size: 15px;
            color: var(--text-strong);
            margin-bottom: 14px;
        }
        .step-badge {
            width: 26px;
            height: 26px;
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: var(--primary);
            color: #ffffff;
            font-size: 13px;
            box-shadow: var(--shadow-1);
        }

        .ip-stats-badge {
            background: var(--primary-soft);
            border: 1px solid var(--primary-soft-border);
            color: var(--mode-desc-color);
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            box-shadow: none;
        }
        .ip-stats-badge strong { color: var(--text-strong); }
        #userIp {
            cursor: pointer;
            -webkit-user-select: all;
            user-select: all;
            border-bottom: 1px dashed currentColor;
            padding-bottom: 1px;
            transition: color 150ms ease-out;
        }
        #userIp:hover { color: var(--primary); }
        #userIp.ip-masked::after {
            content: " 👁️‍🗨️";
            font-size: 11px;
            opacity: 0.8;
            vertical-align: middle;
        }
        #userIp.ip-revealed::after {
            content: " 🙈";
            font-size: 11px;
            opacity: 0.8;
            vertical-align: middle;
        }

        .github-link { color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: color 150ms ease-out; }
        .github-link:hover { color: var(--primary); }

        .quick-links-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; margin-bottom: 14px; justify-content: center; align-items: center; }
        .quick-links-right { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 8px; flex: 1 1 auto; min-width: 0; justify-content: center; }
        .download-btn-link.home-link { background: var(--primary); color: #ffffff; border-color: transparent; font-weight: 600; }
        .download-btn-link.home-link:hover { background: var(--primary-hover); color: #ffffff; border-color: transparent; box-shadow: var(--shadow-hover); }
        .download-btn-link.home-link:active { background: var(--primary-pressed); box-shadow: none; }

        .section-title {
            font-weight: 600;
            font-size: 15px;
            color: var(--text-strong);
            border-left: none;
            border-radius: 2px;
            padding-left: 0;
            margin: 0;
        }

        .download-btn-link {
            font-size: 12px;
            font-weight: 600;
            color: var(--quick-link-color);
            background: var(--surface);
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            border: 1px solid var(--card-border);
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 4px;
        }
        .download-btn-link:hover {
            box-shadow: var(--shadow-hover);
            border-color: var(--card-border-hover);
            transform: translateY(-2px);
        }
        .download-btn-link:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
            background: var(--ghost-pressed-bg);
        }

        label { font-weight: 600; display: block; margin-top: 12px; margin-bottom: 6px; font-size: 13px; color: var(--text-main); }

        textarea, input[type="text"], input[type="number"], select {
            width: 100%;
            box-sizing: border-box;
            padding: 8px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 6px;
            color: var(--text-strong);
            font-family: inherit;
            font-size: 13px;
            box-shadow: none;
            transition: border-color 150ms ease-out, box-shadow 150ms ease-out, background-color 150ms ease-out;
        }
        textarea:focus, input:focus, select:focus {
            color: var(--text-strong);
            background: var(--input-bg);
            box-shadow: 0 0 0 2px var(--input-ring);
            border-color: var(--primary);
            outline: none;
        }
        select option { background: var(--option-bg); color: var(--text-strong); }
        .node-link { min-height: 80px; resize: vertical; }

        .country-wrap { display: flex; gap: 0; align-items: stretch; }
        .country-wrap .node-country { flex: 1; }
        .country-custom { display: flex; gap: 4px; align-items: stretch; flex: 1; }
        .country-custom .country-in { flex: 1; }
        .country-custom .country-back {
            flex: 0 0 auto; width: 36px; cursor: pointer;
            background: var(--surface); color: var(--text-strong);
            border: 1px solid var(--card-border); border-radius: 6px;
            font-size: 13px;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out;
        }
        .country-custom .country-back:hover { color: var(--primary); box-shadow: var(--shadow-hover); transform: translateY(-2px); }
        .country-custom .country-back:active { box-shadow: none; transform: scale(0.97) translateY(0); }

        .row { display: flex; gap: 12px; }
        .row > div { flex: 1; }

        .mode-btn-group { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }

        .mode-btn {
            flex: 1;
            min-width: 180px;
            padding: 12px 15px;
            border: 1px solid var(--card-border);
            background: var(--mode-btn-bg);
            color: var(--text-muted);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out;
            text-align: center;
        }
        .mode-btn.active {
            background: var(--primary);
            border-color: transparent;
            color: #ffffff;
            box-shadow: var(--shadow-1);
        }
        .mode-btn:hover:not(.active) {
            color: var(--text-strong);
            background: var(--primary-soft);
            border-color: var(--primary-soft-border);
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }
        .mode-btn:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
        }
        .mode-btn.active:active { background: var(--primary-pressed); }

        .mode-desc-box {
            background: var(--mode-desc-bg);
            border: 1px solid var(--mode-desc-border);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 20px;
            color: var(--mode-desc-color);
            font-size: 13px;
            line-height: 1.6;
            box-shadow: none;
        }
        .mode-desc-box .highlight-badge {
            font-weight: 600;
            color: #ffffff;
            background: var(--primary);
            padding: 2px 9px;
            border-radius: 4px;
            font-size: 12px;
            display: inline-block;
            margin: 0 2px;
        }

        .btn-group { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }

        .btn-main {
            flex: 2;
            min-width: 180px;
            padding: 12px;
            background: var(--primary);
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out;
        }
        .btn-main:hover {
            background: var(--primary-hover);
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }
        .btn-main:active {
            background: var(--primary-pressed);
            box-shadow: none;
            transform: scale(0.97) translateY(0);
        }

        .btn-refresh {
            flex: 1;
            min-width: 130px;
            padding: 12px;
            background: var(--surface);
            color: var(--secondary-deep);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out;
        }
        .btn-refresh:hover {
            color: var(--text-strong);
            border-color: var(--card-border-hover);
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }
        .btn-refresh:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
            background: var(--ghost-pressed-bg);
        }

        .btn-sub {
            flex: 1;
            min-width: 130px;
            padding: 12px;
            background: var(--surface);
            color: var(--btn-sub-color);
            border: 1px solid var(--card-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out;
        }
        .btn-sub:hover {
            border-color: var(--card-border-hover);
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }
        .btn-sub:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
            background: var(--ghost-pressed-bg);
        }

        .output-box {
            background: var(--output-bg);
            color: var(--output-color);
            padding: 16px;
            border-radius: 8px;
            font-family: 'Cascadia Code', 'Cascadia Mono', ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
            word-break: break-all;
            margin-top: 15px;
            white-space: pre;
            font-size: 12px;
            max-height: 500px;
            overflow-y: auto;
            overflow-x: auto;
            border: 1px solid var(--card-border);
            box-shadow: none;
        }

        .tag {
            background: var(--primary-soft);
            color: var(--mode-desc-color);
            border: 1px solid var(--primary-soft-border);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: normal;
            margin-left: 6px;
        }

        .tip-tag {
            background: var(--warning-soft);
            color: var(--warning);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: normal;
            margin-left: 6px;
            border: 1px solid rgba(157, 93, 0, 0.25);
        }

        .status { margin-top: 12px; font-weight: 600; font-size: 13px; color: var(--success); text-align: center; }

        .node-card {
            background: var(--node-card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 14px;
            position: relative;
            box-shadow: var(--shadow-1);
            transition: box-shadow 200ms ease-out, transform 200ms ease-out, border-color 200ms ease-out;
        }
        .node-card:hover {
            box-shadow: var(--shadow-hover);
            border-color: var(--card-border-hover);
            transform: translateY(-4px);
        }
        .node-card .btn-card-actions { position: static; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 0 0 auto; }

        .node-card .btn-action {
            border: 1px solid var(--card-border);
            border-radius: 4px;
            padding: 4px 12px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            background: var(--surface);
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, background-color 150ms ease-out, transform 150ms ease-out;
        }
        .node-card .btn-action:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }
        .node-card .btn-action:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
        }
        .btn-clear { color: var(--warning) !important; }
        .btn-clear:hover { background: var(--warning); color: #FFFFFF !important; border-color: var(--warning); }
        .btn-remove { color: var(--danger) !important; }
        .btn-remove:hover { background: var(--danger); color: #FFFFFF !important; border-color: var(--danger); }
        .btn-lookup { color: var(--primary) !important; }
        .btn-lookup:hover { background: var(--primary); color: #FFFFFF !important; border-color: var(--primary); }

        .btn-add-node {
            background: var(--btn-add-node-bg);
            color: var(--text-muted);
            border: 1px solid var(--card-border);
            padding: 10px 18px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 12px;
            width: 100%;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out;
        }
        .btn-add-node:hover {
            color: var(--primary);
            border-color: var(--primary-soft-border);
            background: var(--primary-soft);
            box-shadow: var(--shadow-hover);
            transform: translateY(-2px);
        }
        .btn-add-node:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
        }

        .mode-section { display: none; }
        .mode-section.active-section { display: block; }
        .theme-toggle {
            display: inline-flex;
            align-items: center;
            border: 1px solid var(--card-border);
            background: var(--surface);
            color: var(--text-main);
            font-size: 12px;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            box-shadow: var(--shadow-1);
            transition: box-shadow 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out;
        }
        .theme-toggle:hover {
            box-shadow: var(--shadow-hover);
            color: var(--text-strong);
            border-color: var(--card-border-hover);
            transform: translateY(-2px);
        }
        .theme-toggle:active {
            box-shadow: none;
            transform: scale(0.97) translateY(0);
            background: var(--ghost-pressed-bg);
        }

        a:focus-visible, button:focus-visible, [tabindex]:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
        }

        html[data-theme="dark"] {
            --bg-base: #1f1f1f;
            --body-bg: linear-gradient(180deg, #2b2b2b 0%, #1f1f1f 60%, #191919 100%);
            --surface: #313131;
            --container-bg: rgba(43, 43, 43, 0.72);
            --primary-soft: rgba(0, 120, 212, 0.18);
            --primary-soft-border: rgba(0, 120, 212, 0.4);
            --secondary-deep: #f0f0f0;
            --card-border: rgba(255, 255, 255, 0.09);
            --card-border-hover: rgba(255, 255, 255, 0.16);
            --input-border: #5d5d5d;
            --text-strong: #ffffff;
            --text-main: #d1d1d1;
            --text-muted: #9a9a9a;
            --input-bg: #2b2b2b;
            --input-ring: rgba(76, 194, 255, 0.35);
            --output-bg: #2b2b2b;
            --output-color: #e3e2e1;
            --option-bg: #313131;
            --node-card-bg: #313131;
            --btn-add-node-bg: #313131;
            --mode-btn-bg: #313131;
            --btn-sub-color: #f0f0f0;
            --quick-link-color: #6fabe6;
            --mode-desc-color: #c7e0f4;
            --mode-desc-bg: rgba(0, 120, 212, 0.16);
            --mode-desc-border: rgba(0, 120, 212, 0.35);
            --success: #6bb700;
            --success-soft: rgba(107, 183, 0, 0.14);
            --warning: #ffc83d;
            --warning-soft: rgba(255, 185, 0, 0.13);
            --danger: #ff5263;
            --danger-soft: rgba(255, 82, 99, 0.15);
            --ghost-pressed-bg: #3b3b3b;
            --shadow-1: 0 1.6px 3.6px rgba(0, 0, 0, 0.5), 0 0.3px 0.9px rgba(0, 0, 0, 0.36);
            --shadow-2: 0 3.2px 7.2px rgba(0, 0, 0, 0.52), 0 0.6px 1.8px rgba(0, 0, 0, 0.4);
            --shadow-3: 0 6.4px 14.4px rgba(0, 0, 0, 0.56), 0 1.2px 3.6px rgba(0, 0, 0, 0.42);
            --shadow-hover: 0 6.4px 14.4px rgba(0, 0, 0, 0.62), 0 1.2px 3.6px rgba(0, 0, 0, 0.5);
        }
        @media (prefers-color-scheme: dark) {
            html:not([data-theme="light"]) {
                --bg-base: #1f1f1f;
                --body-bg: linear-gradient(180deg, #2b2b2b 0%, #1f1f1f 60%, #191919 100%);
                --surface: #313131;
                --container-bg: rgba(43, 43, 43, 0.72);
                --primary-soft: rgba(0, 120, 212, 0.18);
                --primary-soft-border: rgba(0, 120, 212, 0.4);
                --secondary-deep: #f0f0f0;
                --card-border: rgba(255, 255, 255, 0.09);
                --card-border-hover: rgba(255, 255, 255, 0.16);
                --input-border: #5d5d5d;
                --text-strong: #ffffff;
                --text-main: #d1d1d1;
                --text-muted: #9a9a9a;
                --input-bg: #2b2b2b;
                --input-ring: rgba(76, 194, 255, 0.35);
                --output-bg: #2b2b2b;
                --output-color: #e3e2e1;
                --option-bg: #313131;
                --node-card-bg: #313131;
                --btn-add-node-bg: #313131;
                --mode-btn-bg: #313131;
                --btn-sub-color: #f0f0f0;
                --quick-link-color: #6fabe6;
                --mode-desc-color: #c7e0f4;
                --mode-desc-bg: rgba(0, 120, 212, 0.16);
                --mode-desc-border: rgba(0, 120, 212, 0.35);
                --success: #6bb700;
                --success-soft: rgba(107, 183, 0, 0.14);
                --warning: #ffc83d;
                --warning-soft: rgba(255, 185, 0, 0.13);
                --danger: #ff5263;
                --danger-soft: rgba(255, 82, 99, 0.15);
                --ghost-pressed-bg: #3b3b3b;
                --shadow-1: 0 1.6px 3.6px rgba(0, 0, 0, 0.5), 0 0.3px 0.9px rgba(0, 0, 0, 0.36);
                --shadow-2: 0 3.2px 7.2px rgba(0, 0, 0, 0.52), 0 0.6px 1.8px rgba(0, 0, 0, 0.4);
                --shadow-3: 0 6.4px 14.4px rgba(0, 0, 0, 0.56), 0 1.2px 3.6px rgba(0, 0, 0, 0.42);
                --shadow-hover: 0 6.4px 14.4px rgba(0, 0, 0, 0.62), 0 1.2px 3.6px rgba(0, 0, 0, 0.5);
            }
        }
    </style>
</head>
<body>

<div class="container">
    <div class="hero">
        <h2><img src="https://raw.githubusercontent.com/vernesong/OpenClash/dev/img/logo.png" alt="OpenClash" class="hero-logo"> OpenClash(.yaml)规则文件一键生成工具</h2>
        <div class="hero-tools">
            <div class="ip-stats-badge" id="ipStatsBadge">
                🗺️ 当前访问IP: <strong id="userIp" class="ip-masked" title="点击显示完整 IP（默认打码隐藏后半部分）">加载中...</strong> | 🧑‍💼 累计访客数: <strong id="visitCount">...</strong> | 🟢 实时在线: <strong id="onlineCount">...</strong>
            </div>
            <a href="https://github.com/Ozero-top/OpenClash-Online-YAML-Generator" target="_blank" rel="noopener noreferrer" class="github-link" title="访问 GitHub 开源项目" onclick="trackAction('首页外链：访问 GitHub 开源项目主页（OpenClash 在线 YAML 生成器）'); return true;">
                <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </a>
            <span class="hero-sub">🌿 .yaml 规则版本 V.0.2.8</span>
            <button type="button" id="themeToggle" class="theme-toggle" aria-label="切换深浅风格">🌗 自动</button>
        </div>
    </div>

    <div class="quick-links-bar">
        <a href="/" class="download-btn-link home-link" onclick="trackAction('首页外链：返回首页（/）'); return true;">
            🏠 首页
        </a>
        <div class="quick-links-right">
            <a href="https://leak.ozero.asia/" target="_blank" rel="noopener noreferrer" class="download-btn-link" onclick="trackAction('首页外链：DNS/WebRTC 泄露检测工具（leak.ozero.asia）'); return true;">
                DNS/WebRTC 泄露检测
            </a>
            <a href="https://sub.ozero.asia/" target="_blank" rel="noopener noreferrer" class="download-btn-link" onclick="trackAction('首页外链：Subconverter 订阅转换工具（sub.ozero.asia）'); return true;">
                Subconverter订阅转换
            </a>
            <a href="https://acting.ovitor.asia/" target="_blank" rel="noopener noreferrer" class="download-btn-link" onclick="trackAction('首页外链：云机场与代理加速推荐（acting.ovitor.asia）'); return true;">
                云机场与代理加速推荐
            </a>
            <a href="https://github.com/Ozero-top/OpenClash-Config/tree/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6" target="_blank" rel="noopener noreferrer" class="download-btn-link" onclick="trackAction('首页外链：下载 OpenClash 插件配置文件（GitHub）'); return true;">
                📥 下载Clash插件配置文件
            </a>
        </div>
    </div>

    <div class="step-card">
        <div class="step-title"><span class="step-badge">1</span>选择生成模式</div>
        <div class="mode-btn-group">
        <button id="btn-mode-chain-single" class="mode-btn active" onclick="switchMode('chain-single')">⛓️ 链式代理 - 独立节点</button>
        <button id="btn-mode-chain-bulk" class="mode-btn" onclick="switchMode('chain-bulk')">🧮 链式代理 - 批量粘贴</button>
        <button id="btn-mode-standard" class="mode-btn" onclick="switchMode('standard')">🖥️ 自动分流 - 家用模式</button>
        <button id="btn-mode-direct" class="mode-btn" onclick="switchMode('direct')">🧲 直连模式 - 电商/游戏</button>
        <button id="btn-mode-sk-convert" class="mode-btn" onclick="switchMode('sk-convert')">⏭️ Socks5 格式转换</button>
    </div>

    <div id="modeDescBox" class="mode-desc-box"></div>
    </div>

    <div class="step-card">
        <div class="step-title"><span class="step-badge">2</span>填写订阅与节点配置</div>
    <div id="chainConfigSection">
        <div id="chainSubSection">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">1. 前置中转机场订阅配置</div>
        <div class="row">
            <div style="flex: 1;">
                <label for="chainSubName">自定义机场名称:</label>
                <input type="text" id="chainSubName" value="机场名称" placeholder="自定义名称（默认：中转代理）">
            </div>
            <div style="flex: 2;">
                <label for="subUrl">机场订阅地址(中转) (url):</label>
                <input type="text" id="subUrl" value="https://your-sub-domain.com/link/token">
            </div>
        </div>
        </div>

        <div id="chainRuleSection">
        <div class="section-title" id="ruleSectionTitle" style="margin-top:20px; margin-bottom:8px;">2. 前置中转与规则匹配方式</div>
        <div class="row" style="margin-bottom: 10px;">
            <div>
                <label for="ruleTargetType">匹配模式 / 分流对象范围:</label>
                <select id="ruleTargetType" onchange="toggleIpInputs()">
                    <option value="subnet" selected>🌐 网段匹配 (例如 192.168.11.0/24 - 适合多 WiFi 隔离)</option>
                    <option value="singleIp">📱 指定设备单 IP (例如 192.168.11.101/32 - 适合同 WiFi 下单设备分流)</option>
                </select>
            </div>
            <div id="dialerProxyBlock">
                <label for="dialerProxy">前置中转策略组 (dialer-proxy):</label>
                <select id="dialerProxy">
                    <option value="所有-手动" selected>所有-手动</option>
                    <option value="所有-自动">所有-自动</option>
                    <option value="直连">直连</option>
                </select>
            </div>
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

        <div class="section-title" id="nodeSectionTitle" style="margin-top:20px; margin-bottom:8px;">3. 节点配置</div>
        
        <div id="singleContainer" class="mode-section active-section">
            <div id="nodesContainer"></div>
            <button class="btn-add-node" onclick="addNodeCard()">➕ 增加一个节点输入框</button>
        </div>

        <div id="bulkContainer" class="mode-section">
            <div style="margin-bottom: 8px; overflow: hidden;">
                <span style="font-size: 13px; color: var(--text-muted); font-weight: bold;">💡 系统将根据备注/域名/IP 自动识别国家地区，若识别不出来会显示“通用”</span>
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
                <label for="stdSubName1">自定义机场名称:</label>
                <input type="text" id="stdSubName1" value="主力机场" placeholder="自定义名称（默认：主力机场）">
            </div>
            <div style="flex: 2;">
                <label for="stdSubUrl1">主力机场订阅地址 (url):</label>
                <input type="text" id="stdSubUrl1" value="https://your-main-sub-domain.com/link/token">
            </div>
        </div>
        <div class="row" style="margin-top: 10px;">
            <div>
                <label>
                    <input type="checkbox" id="enableBackupSub" onchange="toggleBackupSubInput()"> 启用备用机场 (双机场订阅链接聚合模式)
                </label>
            </div>
        </div>
        <div class="row" id="backupSubRow" style="display: none; margin-top: 8px;">
            <div style="flex: 1;">
                <label for="stdSubName2">备用机场自定义名称:</label>
                <input type="text" id="stdSubName2" value="备用机场" placeholder="自定义名称（默认：备用机场）">
            </div>
            <div style="flex: 2;">
                <label for="stdSubUrl2">备用机场订阅地址 (url):</label>
                <input type="text" id="stdSubUrl2" value="https://your-backup-sub-domain.com/link/token">
            </div>
        </div>
    </div>

    <div id="skConvertSection" class="mode-section">
        <div class="section-title" style="margin-top:20px; margin-bottom:4px;">🛠️ Socks5 格式转换 · 智能批量规范化</div>
        <div class="hint" style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            <b>用途：</b>把散落在不同地方的代理条目统一成标准格式。支持两种输入，混合粘贴自动识别：
            <br>① <b>原始凭证</b>（IP、端口、账号、密码散行或用 <code>|</code> <code>:</code> <code>,</code> <code>Tab</code> 分隔）→ 输出 <code>socks5://</code> 标准链接
            <br>② <b>完整协议链接</b>（VLESS / VMess / Trojan / Hysteria2）→ <span style="color: var(--accent);">原样保留</span>，TLS / SNI / ws / flow 等参数零丢失
        </div>
        <div style="margin-bottom: 12px;">
            <label for="skInputData">粘贴原始数据（<b>一行一条</b>，支持混排）：</label>
            <textarea id="skInputData" rows="7" placeholder="示例 A — 原始凭证（用分隔符）：&#10;103.45.67.89|1080|myuser|mypass&#10;sk.admin.com:10002:aaBBcc:123456&#10;proxy.net,7890,root,secret&#10;&#10;示例 B — 协议链接（自动原样保留）：&#10;vless://abcd-1234@proxy.io:443?type=tcp&security=tls&sni=proxy.io&#10;trojan://topsecret@relay.server.org:443?sni=relay.server.org&type=ws&#10;vmess://eyJ2IjoiMiIsInBzIjoi...&#10;hysteria2://password@hy2.node.io:443?sni=hy2.node.io"></textarea>
        </div>

        <div class="btn-group" style="margin-top: 10px; margin-bottom: 15px;">
            <button class="btn-main" onclick="convertSkFormat()">⚡ 智能批量转换</button>
            <button class="btn-sub" onclick="copySkOutput()">📋 复制转换结果</button>
            <button class="btn-refresh" onclick="clearSkText()">🧹 清空文本</button>
        </div>

        <div>
            <label for="skOutputData">转换结果：</label>
            <textarea id="skOutputData" rows="7" placeholder="转换结果将显示在这里...&#10;- 原始凭证 → socks5://账号:密码@IP:端口&#10;- 协议链接 → 原样保留（零参数丢失）"></textarea>
            <div class="hint" style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">
                ① 原始凭证自动拼接为 <code>socks5://账号:密码@IP:端口</code>，账号或密码为空时省略对应字段<br>
                ② VLESS / VMess / Trojan / Hysteria2 等链接含完整 TLS、SNI、ws、flow 参数，<b>原样透传不做降级</b>，可直接粘贴到链式代理批量粘贴中使用
        </div>
            </div>
    </div>

    </div>

    <div class="step-card" id="generateStepCard">
        <div class="step-title"><span class="step-badge">3</span>生成并下载规则文件</div>
    <div class="btn-group" id="clashBtnGroup">
        <button class="btn-main" onclick="generateYaml(true)">🚀 生成并下载.yaml文件</button>
        <button class="btn-refresh" onclick="reloadPage()">🔄 重置所有信息</button>
        <button class="btn-sub" onclick="downloadYaml()">💾 另存为.yaml规则文件</button>
    </div>

    <div id="statusMsg" class="status"></div>

    <div id="clashOutputSection">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">📄 完整 YAML 预览区</div>
        <div id="out-full" class="output-box">点击生成按钮后查看...</div>
    </div>
    </div>
</div>

${SHARED_TRACK_SCRIPT}
<script>
let lastGeneratedYaml = "";
let nodeCount = 0;
let currentMode = "chain-single";

const buildYamlBase = (secret) => \`port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
tproxy-port: 7895

allow-lan: true
mode: rule
log-level: info
external-controller: 127.0.0.1:9090
secret: "\${secret}"
ipv6: false
unified-delay: true
tcp-concurrent: true\`;

const YAML_DNS_BLOCK = \`dns:
  enable: true
  listen: 0.0.0.0:7874
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  respect-rules: false 
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

  nameserver:
    - 223.5.5.5
    - 119.29.29.29
    
  fallback:
    - https://dns.google/dns-query
    - https://1.1.1.1/dns-query\`;

const YAML_TUN_BLOCK = \`tun:
  enable: true
  stack: mixed
  device: utun
  auto-route: true
  auto-detect-interface: true
  auto-redirect: true
  strict-route: true\`;

const YAML_PROFILE_BLOCK = \`profile:
  store-selected: true
  store-fake-ip: true\`;

const guideUrl = "https://github.com/Ozero-top/OpenClash-Config/blob/main/OpenClash%E7%B3%BB%E7%BB%9F%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md";
const guideLinkHtml = \`<a href="\${guideUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;">使用指南</a>\`;

const modeDescriptions = {
    'chain-single': \`🔲 链式代理 - 独立节点输入模式：允许用户通过独立的表单卡片逐个输入或粘贴前置中转代理节点，支持为每个节点单独指定或自动识别国家/地区标签，并结合网段或指定单 IP 进行精准分流。&#10;⚠️ 注意：clash运行该yaml文件后，无需任何设置即可按照前面 网段匹配 或 指定设备单 IP 配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的 所有 - 手动 选择延时最低节点作为前置中转；其他策略组对 网段匹配 或 指定设备单 IP 无任何影响；仅作用于 OpenWRT软路由 非 网段匹配 或 指定设备单 IP 的设备；可自动分流，WebRTC/DNS防泄漏 （分流/防泄漏前提要自行配置clash插件 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明 )\`,
    'chain-bulk': \`📑 链式代理 - 批量混合粘贴模式：支持在多行文本框中批量粘贴多种协议的节点链接（如 vless、vmess、trojan、hysteria2、socks5），系统会自动解析并批量匹配国家/地区，快速生成链式代理配置文件。&#10;⚠️ 注意：clash运行该yaml文件后，无需任何设置即可按照前面 网段匹配 或 指定设备单 IP 配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的 所有 - 手动 选择延时最低节点作为前置中转；其他策略组对 网段匹配 或 指定设备单 IP 无任何影响；仅作用于 OpenWRT软路由 非 网段匹配 或 指定设备单 IP 的设备；可自动分流，WebRTC/DNS防泄漏 （分流/防泄漏前提要自行配置clash插件 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明 )\`,
    'standard': \`🌐 自动分流 - 单/双代理订阅家用模式 (V.0.2.8)：面向日常或家用场景，支持配置单代理或双代理（主力+备用）订阅地址，自动聚合节点并提供全自动区域流控、延迟优化与丰富的主流分流规则。同时兼顾DNS防泄漏和WebRTC防泄漏。&#10;⚠️ 注意：clash运行该yaml文件后，可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组，根据使用需求自行设置；除 直连、拒绝 策略组，其他策略组均是自动切换最低延时节点；可手动选择，但会在3-6小时后自动切换到延时最低节点。【分流/防泄漏前提要自行配置clash插件】 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明\`,
    'sk-convert': '🛠️ Socks5 格式转换 · 智能批量规范化：把散落在不同地方的代理条目统一成标准格式。支持两种输入混合粘贴自动识别 —— ① 原始凭证（IP|端口|账号|密码 或 : , Tab 分隔）→ 输出标准 socks5:// 链接；② 完整协议链接（VLESS / VMess / Trojan / Hysteria2）→ 原样保留，TLS/SNI/ws/flow 等参数零丢失。结果可直接复制粘贴到链式代理批量粘贴中使用。',
    'direct': \`🎯 直连模式 - 网段/单IP精准分流 (⚠️ 注意：无中转/无链式/无分流/无规则 ⚠️)：<span class="highlight-badge">此模式适合: 国内外电商/游戏/直播直连节点</span> 仅需要输入节点链接并选择网段匹配或指定设备单 IP，系统自动生成 YAML 配置文件。不需要前置中转代理订阅，也不使用链式代理 (dialer-proxy)，节点直接作为代理出口，配合 SRC-IP-CIDR 规则实现指定网段或设备的精准分流。&#10;⚠️ 注意：clash运行该yaml文件后，无需任何设置即可按照 网段匹配 或 指定设备单 IP 配置自动运行（默认全局）\`
};

const commonCountries = [
    "中国", "北京", "上海", "广州", "深圳", "杭州", "南京", "成都", "武汉", "西安", "重庆", "天津",
    "苏州", "宁波", "青岛", "大连", "厦门", "长沙", "郑州", "沈阳", "济南", "哈尔滨", "福州", "合肥",
    "昆明", "南宁", "贵阳", "太原", "南昌", "海口", "三亚", "乌鲁木齐", "呼和浩特", "银川", "西宁", "拉萨",
    "兰州", "石家庄", "长春",
    "香港", "澳门", "台湾", "台北", "高雄", "台中",
    "日本", "东京", "大阪", "京都", "横滨", "名古屋", "札幌", "福冈",
    "新加坡",
    "韩国", "首尔", "釜山", "仁川",
    "美国", "纽约", "洛杉矶", "旧金山", "西雅图", "芝加哥", "达拉斯", "迈阿密", "波士顿", "华盛顿", "圣何塞", "拉斯维加斯", "波特兰",
    "英国", "伦敦", "曼彻斯特", "爱丁堡", "伯明翰",
    "德国", "柏林", "慕尼黑", "法兰克福", "汉堡",
    "法国", "巴黎", "马赛", "里昂",
    "俄罗斯", "莫斯科", "圣彼得堡", "新西伯利亚", "叶卡捷琳堡", "喀山", "索契", "符拉迪沃斯托克(海参崴)",
    "澳大利亚", "悉尼", "墨尔本", "布里斯班", "珀斯", "阿德莱德",
    "加拿大", "多伦多", "温哥华", "蒙特利尔", "卡尔加里", "渥太华",
    "意大利", "罗马", "米兰", "威尼斯", "佛罗伦萨",
    "西班牙", "马德里", "巴塞罗那", "瓦伦西亚", "塞维利亚",
    "荷兰", "阿姆斯特丹", "鹿特丹", "海牙",
    "瑞士", "苏黎世", "日内瓦", "巴塞尔",
    "瑞典", "斯德哥尔摩", "哥德堡",
    "挪威", "奥斯陆", "卑尔根",
    "丹麦", "哥本哈根",
    "芬兰", "赫尔辛基",
    "波兰", "华沙", "克拉科夫",
    "比利时", "布鲁塞尔", "安特卫普",
    "奥地利", "维也纳", "萨尔茨堡",
    "爱尔兰", "都柏林",
    "葡萄牙", "里斯本", "波尔图",
    "希腊", "雅典",
    "新西兰", "奥克兰", "惠灵顿", "基督城",
    "印度", "孟买", "新德里", "班加罗尔", "金奈", "加尔各答", "海得拉巴",
    "巴西", "圣保罗", "里约热内卢", "巴西利亚",
    "阿根廷", "布宜诺斯艾利斯",
    "墨西哥", "墨西哥城", "瓜达拉哈拉", "坎昆",
    "南非", "开普敦", "约翰内斯堡", "德班",
    "埃及", "开罗", "亚历山大",
    "土耳其", "伊斯坦布尔", "安卡拉",
    "阿联酋", "迪拜", "阿布扎比",
    "沙特阿拉伯", "利雅得", "吉达", "麦加",
    "以色列", "特拉维夫", "耶路撒冷",
    "泰国", "曼谷", "清迈", "普吉岛", "芭堤雅",
    "越南", "河内", "胡志明市", "岘港",
    "马来西亚", "吉隆坡", "槟城", "新山", "怡保", "马六甲",
    "印度尼西亚", "雅加达", "泗水", "万隆", "巴厘岛",
    "菲律宾", "马尼拉", "宿务", "达沃",
    "柬埔寨", "金边", "暹粒",
    "缅甸", "仰光",
    "尼泊尔", "加德满都",
    "斯里兰卡", "科伦坡",
    "孟加拉国", "达卡",
    "巴基斯坦", "卡拉奇", "拉合尔", "伊斯兰堡",
    "哈萨克斯坦", "阿斯塔纳", "阿拉木图",
    "乌兹别克斯坦", "塔什干",
    "阿塞拜疆", "巴库",
    "格鲁吉亚", "第比利斯",
    "亚美尼亚", "埃里温",
    "伊朗", "德黑兰",
    "伊拉克", "巴格达",
    "卡塔尔", "多哈",
    "科威特", "科威特城",
    "约旦", "安曼",
    "黎巴嫩", "贝鲁特",
    "乌克兰", "基辅", "哈尔科夫", "敖德萨",
    "白俄罗斯", "明斯克",
    "捷克共和国", "布拉格",
    "斯洛伐克", "布拉迪斯拉发",
    "匈牙利", "布达佩斯",
    "罗马尼亚", "布加勒斯特",
    "保加利亚", "索非亚",
    "克罗地亚", "萨格勒布",
    "塞尔维亚", "贝尔格莱德",
    "斯洛文尼亚", "卢布尔雅那",
    "爱沙尼亚", "塔林",
    "拉脱维亚", "里加",
    "立陶宛", "维尔纽斯",
    "冰岛", "雷克雅未克",
    "卢森堡",
    "摩纳哥",
    "列支敦士登",
    "马耳他", "瓦莱塔",
    "塞浦路斯", "尼科西亚",
    "摩洛哥", "卡萨布兰卡", "拉巴特", "马拉喀什",
    "阿尔及利亚", "阿尔及尔",
    "突尼斯", "突尼斯市",
    "肯尼亚", "内罗毕",
    "尼日利亚", "拉各斯", "阿布贾",
    "坦桑尼亚", "达累斯萨拉姆",
    "加纳", "阿克拉",
    "智利", "圣地亚哥",
    "哥伦比亚", "波哥大", "麦德林", "卡利",
    "秘鲁", "利马", "库斯科",
    "委内瑞拉", "加拉加斯",
    "厄瓜多尔", "基多", "瓜亚基尔",
    "乌拉圭", "蒙得维的亚",
    "巴拉圭", "亚松森",
    "玻利维亚", "拉巴斯", "苏克雷",
    "巴拿马", "巴拿马城",
    "哥斯达黎加", "圣何塞",
    "古巴", "哈瓦那",
    "多米尼加", "圣多明各",
    "牙买加", "金斯顿",
    "斐济", "苏瓦", "楠迪",
    "通用"
];

(function () {
    var _fullIp = "";
    var _revealed = false;
    var _ipEl = null;

    function maskIp(ip) {
        if (!ip) return "未知";
        var s = String(ip).trim();
        if (!s || s === "未知" || s === "加载中...") return s;
        if (isIPv4(s)) {
            var parts = s.split('.');
            var n = parts.length;
            var keep = Math.max(1, Math.ceil(n / 2));
            var masked = parts.slice(0, keep).concat(new Array(n - keep).fill('*')).join('.');
            return masked;
        }
        // IPv6（含压缩形式，含端口 [::1]:443 这种）
        if (s.indexOf(':') !== -1) {
            var inner = s.replace(/^\\[|\\].*$/g, '');
            var segs = inner.split(':');
            var nonEmpty = segs.filter(function (x) { return x !== ''; });
            var hasCompress = segs.indexOf('') !== -1;
            if (nonEmpty.length <= 1) return inner.replace(/./g, '*');
            var keep2 = Math.max(1, Math.ceil(nonEmpty.length / 2));
            var kept = nonEmpty.slice(0, keep2);
            var maskedSegs = [];
            var compressIdx = segs.indexOf('');
            if (compressIdx === 0) {
                var tailStars = new Array(Math.max(0, nonEmpty.length - kept.length)).fill('*');
                maskedSegs = ['', ''].concat(kept).concat(tailStars);
            } else if (compressIdx > 0 && compressIdx < segs.length - 1) {
                var before = segs.slice(0, compressIdx);
                var after = segs.slice(compressIdx + 1);
                var beforeKeep = Math.min(before.length, keep2);
                var afterKeep = keep2 - beforeKeep;
                maskedSegs = before.slice(0, beforeKeep)
                    .concat([''])
                    .concat(after.slice(0, afterKeep))
                    .concat(new Array(Math.max(0, nonEmpty.length - keep2)).fill('*'));
            } else {
                maskedSegs = kept.concat(new Array(Math.max(0, nonEmpty.length - kept.length)).fill('*'));
            }
            var out = maskedSegs.join(':');
            if (s.charAt(0) === '[') {
                var portMatch = s.match(/\\](:\\d+)?$/);
                out = '[' + out + ']' + (portMatch ? (portMatch[1] || '') : '');
            }
            return out;
        }
        var half = Math.max(1, Math.floor(s.length / 2));
        return s.slice(0, half) + new Array(s.length - half + 1).join('*');
    }

    function _getEl() {
        if (!_ipEl) _ipEl = document.getElementById('userIp');
        return _ipEl;
    }

    window.setVisitorIp = function (fullIp) {
        _fullIp = fullIp ? String(fullIp).trim() : "";
        _applyDisplay();
    };

    window.toggleVisitorIp = function () {
        if (!_fullIp || _fullIp === "未知") return;
        _revealed = !_revealed;
        _applyDisplay();
        try {
            trackAction(_revealed ? "工具交互：显示完整访问 IP（取消打码）" : "工具交互：隐藏访问 IP（恢复打码）");
        } catch (_) {}
    };

    function _applyDisplay() {
        var el = _getEl();
        if (!el) return;
        if (!_fullIp || _fullIp === "未知") {
            el.innerText = "未知";
            el.classList.remove('ip-masked', 'ip-revealed');
            el.title = "";
            return;
        }
        if (_revealed) {
            el.innerText = _fullIp;
            el.classList.remove('ip-masked');
            el.classList.add('ip-revealed');
            el.title = "点击隐藏 IP 后半部分（打码）";
        } else {
            el.innerText = maskIp(_fullIp);
            el.classList.remove('ip-revealed');
            el.classList.add('ip-masked');
            el.title = "点击显示完整 IP（当前打码：隐藏后半部分）";
        }
    }

    function _bind() {
        var el = _getEl();
        if (!el) return;
        if (el.getAttribute('data-ip-bound') === '1') return;
        el.setAttribute('data-ip-bound', '1');
        el.addEventListener('click', function (e) {
            window.toggleVisitorIp();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bind);
    } else {
        _bind();
    }
})();

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
            window.setVisitorIp(data.ip || '未知');
            if (data.counterReady) {
                document.getElementById('visitCount').innerText = data.visitCount;
                const onlineEl = document.getElementById('onlineCount');
                if (onlineEl) onlineEl.innerText = (typeof data.onlineCount === 'number') ? data.onlineCount : '-';
            } else {
                document.getElementById('visitCount').innerText = '未配置';
                document.getElementById('visitCount').title = '请在 Worker 设置 → 绑定中添加 D1 数据库（变量名 DB），用于累计访客/在线人数统计';
                const onlineEl = document.getElementById('onlineCount');
                if (onlineEl) onlineEl.innerText = '-';
            }
        }
    } catch (e) {
        console.warn('获取访问统计失败:', e);
        window.setVisitorIp('未知');
        document.getElementById('visitCount').innerText = '未获取';
        const onlineEl = document.getElementById('onlineCount');
        if (onlineEl) onlineEl.innerText = '-';
    }
}
setInterval(function () { if (!document.hidden) loadVisitorStats(); }, 60000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) loadVisitorStats(); });

(function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    var mq = (typeof window.matchMedia === 'function') ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function stored() {
        try {
            var t = localStorage.getItem('theme');
            return (t === 'dark' || t === 'light') ? t : '';
        } catch (e) { return ''; }
    }
    function effTheme() {
        var t = stored();
        if (t) return t;
        return (mq && mq.matches) ? 'dark' : 'light';
    }
    function syncMeta(t) {
        var m = document.querySelector('meta[name="theme-color"]');
        if (!m) return;
        var eff = t || effTheme();
        m.setAttribute('content', eff === 'dark' ? '#0f172a' : '#f8fafc');
    }
    function applyTheme(t) {
        if (t) {
            document.documentElement.setAttribute('data-theme', t);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        syncMeta(t);
    }
    function renderBtn() {
        var t = stored();
        var label = t === 'dark' ? '🌙 深色' : (t === 'light' ? '☀️ 浅色' : '🌗 自动');
        btn.textContent = label;
        var cur = t === 'dark' ? '深色' : (t === 'light' ? '浅色' : '自动跟随系统（现为' + (effTheme() === 'dark' ? '深色' : '浅色') + '）');
        btn.title = '当前：' + cur + '，点击切换风格';
    }
    btn.addEventListener('click', function () {
        var t = stored();
        var next = t === 'dark' ? 'light' : (t === 'light' ? '' : 'dark');
        try {
            if (next) { localStorage.setItem('theme', next); } else { localStorage.removeItem('theme'); }
        } catch (e2) {}
        applyTheme(next);
        renderBtn();
        trackAction('风格切换', next || '自动');
    });
    var onSysChange = function () {
        if (!stored()) { applyTheme(''); }
        renderBtn();
    };
    if (mq) {
        if (mq.addEventListener) { mq.addEventListener('change', onSysChange); }
        else if (mq.addListener) { mq.addListener(onSysChange); }
    }
    renderBtn();
})();

function isIPv4(str) {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str);
}
function extractHostFromLink(link) {
    if (!link) return "";
    try {
        var raw = link.trim();
        if (!raw) return "";
        var proto = "";
        var afterProto = raw;
        var pSplit = raw.indexOf("://");
        if (pSplit > 0) {
            proto = raw.slice(0, pSplit).toLowerCase();
            afterProto = raw.slice(pSplit + 3);
        }

        if (proto === "vmess") {
            try {
                var b64 = afterProto.split("#")[0];
                var jsonStr = decodeBase64Utf8(b64);
                var vmess = JSON.parse(jsonStr);
                if (vmess && vmess.add) return (vmess.add || "").toString().trim();
            } catch (_) {}
        }
        if (proto === "ss" || proto === "ssr") {
            try {
                var payload = afterProto.split("#")[0].split("?")[0];
                if (payload.indexOf("@") === -1 && /[A-Za-z0-9+/=]{8,}/.test(payload)) {
                    try {
                        var decoded = decodeBase64Utf8(payload);
                        payload = decoded;
                    } catch (_) {}
                }
                var atIdx = payload.indexOf("@");
                var lastColon = payload.lastIndexOf(":");
                var hostStart = atIdx >= 0 ? atIdx + 1 : 0;
                var hostEnd = lastColon > hostStart ? lastColon : payload.length;
                var hostRaw = payload.slice(hostStart, hostEnd);
                if (hostRaw.charAt(0) === "[") {
                    var cb = hostRaw.indexOf("]");
                    if (cb > 0) hostRaw = hostRaw.slice(1, cb);
                }
                if (hostRaw) return hostRaw.trim();
            } catch (_) {}
        }

        if (proto === "tuic" || proto === "tuic-v5" || proto === "hysteria2" || proto === "hy2" ||
            proto === "hysteria" || proto === "trojan" || proto === "trojan-go" || proto === "vless" ||
            proto === "socks5" || proto === "socks4" || proto === "socks4a" || proto === "socks" ||
            proto === "http" || proto === "https" || proto === "ssh" || proto === "wireguard" || proto === "wg") {
            try {
                var dummy = raw;
                var u = new URL(dummy);
                if (u && u.hostname) return u.hostname.trim();
            } catch (_) {
                try {
                    var _after = afterProto;
                    var _hashIdx = _after.indexOf("#");
                    if (_hashIdx > 0) _after = _after.slice(0, _hashIdx);
                    var _at = _after.lastIndexOf("@");
                    var _seg = _at >= 0 ? _after.slice(_at + 1) : _after;
                    var _slashIdx = _seg.indexOf("/");
                    var _qIdx = _seg.indexOf("?");
                    var _ampIdx = _seg.indexOf("&");
                    var _cut = _seg.length;
                    [_slashIdx, _qIdx, _ampIdx].forEach(function (i) { if (i > 0 && i < _cut) _cut = i; });
                    var _hp = _seg.slice(0, _cut);
                    var _lc = _hp.lastIndexOf(":");
                    var _hostOnly;
                    if (_hp.charAt(0) === "[") {
                        var _cb = _hp.indexOf("]");
                        _hostOnly = _cb > 0 ? _hp.slice(1, _cb) : _hp.slice(1, -1);
                    } else if (_lc > 0) {
                        _hostOnly = _hp.slice(0, _lc);
                    } else {
                        _hostOnly = _hp;
                    }
                    if (_hostOnly) return _hostOnly.trim();
                } catch (_2) {}
            }
        }

        try {
            if (pSplit === -1) {
                var plain = raw.split(/\\s|#|&|;|\\|/)[0];
                var pl = plain.lastIndexOf(":");
                var hostPart = pl > 0 ? plain.slice(0, pl) : plain;
                if (/^\\[.*\\]$/.test(hostPart)) hostPart = hostPart.slice(1, -1);
                if (hostPart) return hostPart.trim();
            }
        } catch (_) {}
        return "";
    } catch (e) {
        return "";
    }
}

function detectCountryFromText(textToSearch) {
    if (!textToSearch) return null;
    var t = textToSearch;
    var r = function (p) { try { return new RegExp(p.source, 'i').test(t); } catch (e) { return false; } };

    if (r(/中国|内地|大陆|中华|🇨🇳/)) return "中国";
    if (r(/香港|广港|港深|深港|🇭🇰|Hong\\s*Kong|Kowloon|Tsim\\s*Sha\\s*Tsui|Mong\\s*Kok|Wan\\s*Chai|Causeway\\s*Bay|Tsuen\\s*Wan|Shatin/)) return "香港";
    if (r(/澳门|🇲🇴|Macau|Macao|Taipa|Coloane|氹仔|路环/)) return "澳门";
    if (r(/台湾|台灣|广台|🇹🇼|Taiwan|Tai\\s*pei|Taipei|高雄|Kaohsiung|台中|Taichung|台南|Tainan|新竹|Hsinchu|基隆|Keelung|嘉义|Chiayi|花莲|Hualien/)) return "台湾";

    if (r(/日本|广日|沪日|深日|川日|京日|泉日|🇯🇵|Japan|Tokyo|Osaka|Kyoto|Yokohama|Nagoya|Sapporo|Fukuoka|东京|大阪|京都|横滨|名古屋|札幌|福冈|埼玉|神户|广岛|仙台|千叶|琦玉/)) return "日本";
    if (r(/新加坡|广新|沪新|深新|京新|🇸🇬|Singapore|狮城|樟宜/)) return "新加坡";
    if (r(/韩国|韓國|广韩|沪韩|深韩|京韩|🇰🇷|Korea|Seoul|Busan|Incheon|首尔|釜山|仁川|大邱|光州|大田|蔚山|春川/)) return "韩国";
    if (r(/朝鲜|🇰🇵|DPRK|Pyongyang|平壤/)) return "朝鲜";
    if (r(/泰国|广泰|沪泰|🇹🇭|Thailand|Bangkok|清迈|Chiang\\s*Mai|普吉岛|Phuket|芭堤雅|Pattaya|合艾|Hat\\s*Yai|甲米/)) return "泰国";
    if (r(/越南|广越|🇻🇳|Vietnam|Hanoi|Ho\\s*Chi\\s*Minh|胡志明市|岘港|Da\\s*Nang|海防|芽庄|河内/)) return "越南";
    if (r(/马来西亚|广马|🇲🇾|Malaysia|Kuala\\s*Lumpur|吉隆坡|新山|Johor\\s*Bahru|槟城|Penang|怡保|马六甲/)) return "马来西亚";
    if (r(/菲律宾|🇵🇭|Philippines|Manila|马尼拉|宿务|Cebu|达沃|Davao/)) return "菲律宾";
    if (r(/印度尼西亚|印尼|🇮🇩|Indonesia|Jakarta|雅加达|泗水|Surabaya|万隆|Bandung|巴厘岛|Bali|棉兰/)) return "印度尼西亚";
    if (r(/印度|🇮🇳|India|Mumbai|孟买|Delhi|新德里|Bangalore|班加罗尔|Hyderabad|海得拉巴|Chennai|金奈|Kolkata|加尔各答/)) return "印度";
    if (r(/巴基斯坦|巴铁|🇵🇰|Pakistan|Karachi|卡拉奇|Lahore|拉合尔|Islamabad|伊斯兰堡/)) return "巴基斯坦";
    if (r(/孟加拉国|🇧🇩|Bangladesh|Dhaka|达卡/)) return "孟加拉国";
    if (r(/缅甸|🇲🇲|Myanmar|Yangon|仰光|内比都|Naypyidaw|曼德勒/)) return "缅甸";
    if (r(/柬埔寨|🇰🇭|Cambodia|Phnom\\s*Penh|金边|暹粒|Siem\\s*Reap|西哈努克/)) return "柬埔寨";
    if (r(/老挝|🇱🇦|Laos|Vientiane|万象|琅勃拉邦/)) return "老挝";
    if (r(/尼泊尔|🇳🇵|Nepal|Kathmandu|加德满都|博卡拉/)) return "尼泊尔";
    if (r(/斯里兰卡|🇱🇰|Sri\\s*Lanka|Colombo|科伦坡/)) return "斯里兰卡";
    if (r(/文莱|🇧🇳|Brunei|斯里巴加湾/)) return "文莱";
    if (r(/蒙古|🇲🇳|Mongolia|Ulaanbaatar|乌兰巴托/)) return "蒙古";
    if (r(/哈萨克斯坦|🇰🇿|Kazakhstan|Astana|阿斯塔纳|Almaty|阿拉木图/)) return "哈萨克斯坦";
    if (r(/乌兹别克斯坦|🇺🇿|Uzbekistan|Tashkent|塔什干|撒马尔罕/)) return "乌兹别克斯坦";
    if (r(/吉尔吉斯斯坦|🇰🇬|Kyrgyzstan|Bishkek|比什凯克/)) return "吉尔吉斯斯坦";
    if (r(/塔吉克斯坦|🇹🇯|Tajikistan|Dushanbe|杜尚别|苦盏/)) return "塔吉克斯坦";
    if (r(/土库曼斯坦|🇹🇲|Turkmenistan|Ashgabat|阿什哈巴德/)) return "土库曼斯坦";
    if (r(/阿塞拜疆|🇦🇿|Azerbaijan|Baku|巴库/)) return "阿塞拜疆";
    if (r(/格鲁吉亚|🇬🇪|Georgia|Tbilisi|第比利斯|巴统/)) return "格鲁吉亚";
    if (r(/亚美尼亚|🇦🇲|Armenia|Yerevan|埃里温/)) return "亚美尼亚";
    if (r(/美国|广美|沪美|深美|京美|🇺🇸|United\\s*States|America|NYC|New\\s*York|Los\\s*Angeles|San\\s*Francisco|Seattle|Chicago|Dallas|Miami|Boston|Washington|San\\s*Jose|Las\\s*Vegas|Portland|洛杉矶|纽约|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|圣何塞|圣克拉拉|西雅图|芝加哥|阿什本|圣迭戈|硅谷|旧金山|迈阿密|波士顿|华盛顿|亚特兰大|休斯顿|费城|丹佛|底特律|火奴鲁鲁|檀香山|硅谷|硅谷/)) return "美国";
    if (r(/加拿大|🇨🇦|Canada|Toronto|Vancouver|Montreal|Calgary|Edmonton|Ottawa|多伦多|温哥华|蒙特利尔|卡尔加里|埃德蒙顿|渥太华|魁北克/)) return "加拿大";
    if (r(/墨西哥|🇲🇽|Mexico|Mexico\\s*City|瓜达拉哈拉|Guadalajara|蒙特雷|Monterrey|坎昆|Cancun/)) return "墨西哥";
    if (r(/巴西|🇧🇷|Brazil|Sao\\s*Paulo|Rio\\s*de\\s*Janeiro|Brasilia|圣保罗|里约热内卢|巴西利亚/)) return "巴西";
    if (r(/阿根廷|🇦🇷|Argentina|Buenos\\s*Aires|布宜诺斯艾利斯/)) return "阿根廷";
    if (r(/智利|🇨🇱|Chile|Santiago|圣地亚哥/)) return "智利";
    if (r(/哥伦比亚|🇨🇴|Colombia|Bogota|波哥大|麦德林|Medellin/)) return "哥伦比亚";
    if (r(/秘鲁|🇵🇪|Peru|Lima|利马|库斯科|Cusco/)) return "秘鲁";
    if (r(/古巴|🇨🇺|Cuba|Havana|哈瓦那/)) return "古巴";
    if (r(/巴拿马|🇵🇦|Panama|Panama\\s*City|巴拿马城/)) return "巴拿马";
    if (r(/哥斯达黎加|🇨🇷|Costa\\s*Rica|圣何塞/)) return "哥斯达黎加";
    if (r(/多米尼加|🇩🇴|Dominican\\s*Republic|Santo\\s*Domingo|圣多明各/)) return "多米尼加";
    if (r(/牙买加|🇯🇲|Jamaica|Kingston|金斯顿/)) return "牙买加";
    if (r(/乌拉圭|🇺🇾|Uruguay|Montevideo|蒙得维的亚/)) return "乌拉圭";
    if (r(/巴拉圭|🇵🇾|Paraguay|Asuncion|亚松森|东方市/)) return "巴拉圭";
    if (r(/玻利维亚|🇧🇴|Bolivia|La\\s*Paz|拉巴斯|苏克雷/)) return "玻利维亚";
    if (r(/厄瓜多尔|🇪🇨|Ecuador|Quito|基多|瓜亚基尔|Guayaquil/)) return "厄瓜多尔";
    if (r(/委内瑞拉|🇻🇪|Venezuela|Caracas|加拉加斯/)) return "委内瑞拉";
    if (r(/英国|广英|沪英|深英|🇬🇧|United\\s*Kingdom|Great\\s*Britain|England|Scotland|Wales|London|Manchester|Edinburgh|Birmingham|Glasgow|利物浦|利兹|布里斯托尔|谢菲尔德|纽卡斯尔|贝尔法斯特|伦敦|曼彻斯特|爱丁堡|伯明翰/)) return "英国";
    if (r(/德国|广德|沪德|深德|🇩🇪|Germany|Berlin|Munich|Hamburg|Frankfurt|Cologne|Stuttgart|Leipzig|Dresden|柏林|慕尼黑|汉堡|法兰克福|科隆|斯图加特|莱比锡|德累斯顿|波恩|杜塞尔多夫/)) return "德国";
    if (r(/法国|广法|沪法|深法|🇫🇷|France|Paris|Marseille|Lyon|Toulouse|Nice|Bordeaux|巴黎|马赛|里昂|图卢兹|尼斯|波尔多/)) return "法国";
    if (r(/意大利|🇮🇹|Italy|Rome|Milan|Naples|Turin|Florence|Venice|Palermo|罗马|米兰|那不勒斯|都灵|佛罗伦萨|威尼斯|巴勒莫/)) return "意大利";
    if (r(/西班牙|🇪🇸|Spain|Madrid|Barcelona|Valencia|Seville|Bilbao|马德里|巴塞罗那|瓦伦西亚|塞维利亚/)) return "西班牙";
    if (r(/葡萄牙|🇵🇹|Portugal|Lisbon|Porto|里斯本|波尔图/)) return "葡萄牙";
    if (r(/荷兰|🇳🇱|Netherlands|Amsterdam|Rotterdam|The\\s*Hague|Utrecht|阿姆斯特丹|鹿特丹|海牙|乌得勒支|埃因霍温/)) return "荷兰";
    if (r(/比利时|🇧🇪|Belgium|Brussels|Antwerp|Ghent|布鲁塞尔|安特卫普|根特|布鲁日/)) return "比利时";
    if (r(/瑞士|🇨🇭|Switzerland|Zurich|Geneva|Basel|Lausanne|苏黎世|日内瓦|巴塞尔|洛桑/)) return "瑞士";
    if (r(/奥地利|🇦🇹|Austria|Vienna|Salzburg|Graz|维也纳|萨尔茨堡|格拉茨|因斯布鲁克/)) return "奥地利";
    if (r(/瑞典|🇸🇪|Sweden|Stockholm|Gothenburg|斯德哥尔摩|哥德堡/)) return "瑞典";
    if (r(/挪威|🇳🇴|Norway|Oslo|Bergen|斯塔万格|Stavanger|奥斯陆|卑尔根/)) return "挪威";
    if (r(/丹麦|🇩🇰|Denmark|Copenhagen|Aarhus|哥本哈根|奥胡斯/)) return "丹麦";
    if (r(/芬兰|🇫🇮|Finland|Helsinki|Tampere|赫尔辛基|坦佩雷/)) return "芬兰";
    if (r(/冰岛|🇮🇸|Iceland|Reykjavik|雷克雅未克/)) return "冰岛";
    if (r(/波兰|🇵🇱|Poland|Warsaw|Krakow|Wroclaw|华沙|克拉科夫|弗罗茨瓦夫/)) return "波兰";
    if (r(/俄罗斯|俄罗|🇷🇺|Russia|Moscow|Saint\\s*Petersburg|Novosibirsk|Yekaterinburg|Kazan|Sochi|Vladivostok|莫斯科|圣彼得堡|新西伯利亚|叶卡捷琳堡|喀山|索契|符拉迪沃斯托克|海参崴|伯力|哈巴罗夫斯克|新西伯利亚|西伯利亚/)) return "俄罗斯";
    if (r(/乌克兰|🇺🇦|Ukraine|Kyiv|Kiev|Kharkiv|Odessa|Dnipro|基辅|哈尔科夫|敖德萨|第聂伯罗/)) return "乌克兰";
    if (r(/白俄罗斯|🇧🇾|Belarus|Minsk|明斯克/)) return "白俄罗斯";
    if (r(/捷克|🇨🇿|Czechia|Czech\\s*Republic|Prague|Brno|布拉格|布尔诺/)) return "捷克共和国";
    if (r(/斯洛伐克|🇸🇰|Slovakia|Bratislava|布拉迪斯拉发/)) return "斯洛伐克";
    if (r(/匈牙利|🇭🇺|Hungary|Budapest|德布勒森|Debrecen|布达佩斯/)) return "匈牙利";
    if (r(/罗马尼亚|🇷🇴|Romania|Bucharest|布加勒斯特|克卢日|Cluj/)) return "罗马尼亚";
    if (r(/保加利亚|🇧🇬|Bulgaria|Sofia|Plovdiv|索非亚|普罗夫迪夫|瓦尔纳/)) return "保加利亚";
    if (r(/克罗地亚|🇭🇷|Croatia|Zagreb|Split|萨格勒布|斯普利特/)) return "克罗地亚";
    if (r(/塞尔维亚|🇷🇸|Serbia|Belgrade|贝尔格莱德|诺维萨德|Novi\\s*Sad/)) return "塞尔维亚";
    if (r(/斯洛文尼亚|🇸🇮|Slovenia|Ljubljana|卢布尔雅那/)) return "斯洛文尼亚";
    if (r(/爱沙尼亚|🇪🇪|Estonia|Tallinn|塔林/)) return "爱沙尼亚";
    if (r(/拉脱维亚|🇱🇻|Latvia|Riga|里加/)) return "拉脱维亚";
    if (r(/立陶宛|🇱🇹|Lithuania|Vilnius|维尔纽斯/)) return "立陶宛";
    if (r(/爱尔兰|🇮🇪|Ireland|Dublin|Cork|都柏林|科克/)) return "爱尔兰";
    if (r(/希腊|🇬🇷|Greece|Athens|Thessaloniki|雅典|塞萨洛尼基|圣托里尼/)) return "希腊";
    if (r(/卢森堡|🇱🇺|Luxembourg|卢森堡市/)) return "卢森堡";
    if (r(/摩纳哥|🇲🇨|Monaco|蒙特卡洛/)) return "摩纳哥";
    if (r(/列支敦士登|🇱🇮|Liechtenstein|Vaduz|瓦杜兹/)) return "列支敦士登";
    if (r(/马耳他|🇲🇹|Malta|Valletta|瓦莱塔/)) return "马耳他";
    if (r(/塞浦路斯|🇨🇾|Cyprus|Nicosia|Limassol|尼科西亚|利马索尔/)) return "塞浦路斯";
    if (r(/澳大利亚|澳洲|🇦🇺|Australia|Sydney|Melbourne|Brisbane|Perth|Adelaide|Gold\\s*Coast|Canberra|悉尼|墨尔本|布里斯班|珀斯|阿德莱德|黄金海岸|堪培拉/)) return "澳大利亚";
    if (r(/新西兰|纽西兰|🇳🇿|New\\s*Zealand|Auckland|Wellington|Christchurch|奥克兰|惠灵顿|基督城/)) return "新西兰";
    if (r(/斐济|🇫🇯|Fiji|Suva|Nadi|苏瓦|楠迪/)) return "斐济";
    if (r(/巴布亚新几内亚|🇵🇬|Papua\\s*New\\s*Guinea|Port\\s*Moresby|莫尔兹比港/)) return "巴布亚新几内亚";
    if (r(/土耳其|🇹🇷|Turkey|Istanbul|Ankara|Izmir|伊斯坦布尔|安卡拉|伊兹密尔/)) return "土耳其";
    if (r(/阿联酋|阿联|🇦🇪|United\\s*Arab\\s*Emirates|Dubai|Abu\\s*Dhabi|Sharjah|迪拜|阿布扎比|沙迦/)) return "阿联酋";
    if (r(/沙特阿拉伯|沙特|🇸🇦|Saudi\\s*Arabia|Riyadh|Jeddah|Mecca|Medina|利雅得|吉达|麦加|麦地那/)) return "沙特阿拉伯";
    if (r(/以色列|🇮🇱|Israel|Tel\\s*Aviv|Jerusalem|Haifa|特拉维夫|耶路撒冷|海法/)) return "以色列";
    if (r(/伊朗|🇮🇷|Iran|Tehran|Isfahan|Shiraz|Mashhad|德黑兰|伊斯法罕|设拉子|马什哈德/)) return "伊朗";
    if (r(/伊拉克|🇮🇶|Iraq|Baghdad|巴士拉|Basra|摩苏尔|Mosul|巴格达/)) return "伊拉克";
    if (r(/卡塔尔|🇶🇦|Qatar|Doha|多哈/)) return "卡塔尔";
    if (r(/科威特|🇰🇼|Kuwait|Kuwait\\s*City|科威特城/)) return "科威特";
    if (r(/阿曼|🇴🇲|Oman|Muscat|马斯喀特|塞拉莱/)) return "阿曼";
    if (r(/约旦|🇯🇴|Jordan|Amman|安曼|亚喀巴|Aqaba/)) return "约旦";
    if (r(/黎巴嫩|🇱🇧|Lebanon|Beirut|贝鲁特/)) return "黎巴嫩";
    if (r(/叙利亚|🇸🇾|Syria|Damascus|Aleppo|大马士革|阿勒颇/)) return "叙利亚";
    if (r(/也门|🇾🇪|Yemen|Sanaa|Aden|萨那|亚丁/)) return "也门";
    if (r(/阿富汗|🇦🇫|Afghanistan|Kabul|喀布尔|赫拉特|Herat/)) return "阿富汗";
    if (r(/巴林|🇧🇭|Bahrain|麦纳麦|Manama/)) return "巴林";
    if (r(/南非|🇿🇦|South\\s*Africa|Cape\\s*Town|Johannesburg|Durban|Pretoria|开普敦|约翰内斯堡|德班|比勒陀利亚/)) return "南非";
    if (r(/埃及|🇪🇬|Egypt|Cairo|Alexandria|Luxor|开罗|亚历山大|卢克索/)) return "埃及";
    if (r(/尼日利亚|🇳🇬|Nigeria|Lagos|Abuja|拉各斯|阿布贾/)) return "尼日利亚";
    if (r(/肯尼亚|🇰🇪|Kenya|Nairobi|Mombasa|内罗毕|蒙巴萨/)) return "肯尼亚";
    if (r(/摩洛哥|🇲🇦|Morocco|Casablanca|Rabat|Marrakech|卡萨布兰卡|拉巴特|马拉喀什/)) return "摩洛哥";
    if (r(/阿尔及利亚|🇩🇿|Algeria|Algiers|奥兰|阿尔及尔/)) return "阿尔及利亚";
    if (r(/突尼斯|🇹🇳|Tunisia|Tunis|Sfax|突尼斯市|斯法克斯/)) return "突尼斯";
    if (r(/坦桑尼亚|🇹🇿|Tanzania|Dar\\s*es\\s*Salaam|达累斯萨拉姆|多多马/)) return "坦桑尼亚";
    if (r(/加纳|🇬🇭|Ghana|Accra|Kumasi|阿克拉|库马西/)) return "加纳";
    if (r(/喀麦隆|🇨🇲|Cameroon|Douala|Yaounde|杜阿拉|雅温得/)) return "喀麦隆";
    if (r(/科特迪瓦|象牙海岸|🇨🇮|Cote\\s*dIvoire|Ivory\\s*Coast|Abidjan|阿比让|亚穆苏克罗/)) return "科特迪瓦";
    if (r(/塞内加尔|🇸🇳|Senegal|Dakar|达喀尔/)) return "塞内加尔";
    if (r(/埃塞俄比亚|🇪🇹|Ethiopia|Addis\\s*Ababa|亚的斯亚贝巴/)) return "埃塞俄比亚";
    if (r(/利比亚|🇱🇾|Libya|Tripoli|Benghazi|的黎波里|班加西/)) return "利比亚";
    if (r(/苏丹|🇸🇩|Sudan|Khartoum|喀土穆/)) return "苏丹";
    if (r(/乌干达|🇺🇬|Uganda|Kampala|坎帕拉/)) return "乌干达";
    if (r(/莫桑比克|🇲🇿|Mozambique|Maputo|马普托/)) return "莫桑比克";
    if (r(/津巴布韦|🇿🇼|Zimbabwe|Harare|哈拉雷|布拉瓦约/)) return "津巴布韦";
    if (r(/赞比亚|🇿🇲|Zambia|Lusaka|卢萨卡/)) return "赞比亚";
    if (r(/安哥拉|🇦🇴|Angola|Luanda|罗安达/)) return "安哥拉";
    if (r(/索马里|🇸🇴|Somalia|Mogadishu|摩加迪沙/)) return "索马里";
    if (r(/格陵兰|🇬🇱|Greenland|Nuuk|努克/)) return "格陵兰";
    if (r(/关岛|🇬🇺|Guam|Hagatna|阿加尼亚/)) return "关岛";
    if (r(/波多黎各|🇵🇷|Puerto\\s*Rico|San\\s*Juan|圣胡安/)) return "波多黎各";
    if (r(/留尼汪|🇷🇪|Reunion|留尼汪岛|圣但尼/)) return "留尼汪";
    if (r(/特立尼达和多巴哥|🇹🇹|Trinidad\\s*and\\s*Tobago|西班牙港/)) return "特立尼达和多巴哥";

    var isoMap = {
        "CN":"中国","HK":"香港","MO":"澳门","TW":"台湾","JP":"日本","SG":"新加坡","KR":"韩国","KP":"朝鲜",
        "US":"美国","CA":"加拿大","MX":"墨西哥","BR":"巴西","AR":"阿根廷","CL":"智利","CO":"哥伦比亚","PE":"秘鲁","CU":"古巴","PA":"巴拿马",
        "UK":"英国","GB":"英国","DE":"德国","FR":"法国","IT":"意大利","ES":"西班牙","PT":"葡萄牙","NL":"荷兰","BE":"比利时","CH":"瑞士","AT":"奥地利",
        "SE":"瑞典","NO":"挪威","DK":"丹麦","FI":"芬兰","IS":"冰岛","PL":"波兰","RU":"俄罗斯","UA":"乌克兰","BY":"白俄罗斯",
        "CZ":"捷克共和国","SK":"斯洛伐克","HU":"匈牙利","RO":"罗马尼亚","BG":"保加利亚","HR":"克罗地亚","RS":"塞尔维亚","SI":"斯洛文尼亚",
        "EE":"爱沙尼亚","LV":"拉脱维亚","LT":"立陶宛","IE":"爱尔兰","GR":"希腊","LU":"卢森堡","MC":"摩纳哥","LI":"列支敦士登","MT":"马耳他","CY":"塞浦路斯",
        "AU":"澳大利亚","NZ":"新西兰","FJ":"斐济",
        "TR":"土耳其","AE":"阿联酋","SA":"沙特阿拉伯","IL":"以色列","IR":"伊朗","IQ":"伊拉克","QA":"卡塔尔","KW":"科威特","OM":"阿曼","JO":"约旦","LB":"黎巴嫩","SY":"叙利亚","YE":"也门","AF":"阿富汗","BH":"巴林",
        "TH":"泰国","VN":"越南","MY":"马来西亚","PH":"菲律宾","ID":"印度尼西亚","IN":"印度","PK":"巴基斯坦","BD":"孟加拉国","MM":"缅甸","KH":"柬埔寨","LA":"老挝","NP":"尼泊尔","LK":"斯里兰卡","BN":"文莱","MN":"蒙古",
        "KZ":"哈萨克斯坦","UZ":"乌兹别克斯坦","KG":"吉尔吉斯斯坦","TJ":"塔吉克斯坦","TM":"土库曼斯坦","AZ":"阿塞拜疆","GE":"格鲁吉亚","AM":"亚美尼亚",
        "ZA":"南非","EG":"埃及","NG":"尼日利亚","KE":"肯尼亚","MA":"摩洛哥","DZ":"阿尔及利亚","TN":"突尼斯","TZ":"坦桑尼亚","GH":"加纳","CM":"喀麦隆","CI":"科特迪瓦","SN":"塞内加尔","ET":"埃塞俄比亚","LY":"利比亚","SD":"苏丹","UG":"乌干达","MZ":"莫桑比克","ZW":"津巴布韦","ZM":"赞比亚","AO":"安哥拉","SO":"索马里",
        "GL":"格陵兰","GU":"关岛","PR":"波多黎各","RE":"留尼汪","TT":"特立尼达和多巴哥"
    };
    try {
        var codes = Object.keys(isoMap);
        for (var i = 0; i < codes.length; i++) {
            var cc = codes[i];
            var pat = new RegExp("(^|[^A-Za-z])" + cc + "([^A-Za-z]|$)");
            if (pat.test(t)) return isoMap[cc];
        }
    } catch (e) {}

    if (r(/北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|苏州|天津|青岛|大连|厦门|长沙|郑州|济南|福州|合肥|南昌|南宁|昆明|贵阳|拉萨|乌鲁木齐|呼和浩特|银川|西宁|兰州|太原|沈阳|长春|哈尔滨/)) return "中国";
    if (r(/河北|河南|湖北|湖南|广东|广西|山东|山西|陕西|甘肃|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|四川|贵州|云南|海南|青海|内蒙古|新疆|西藏|宁夏/)) return "中国";
    if (r(/\\b(PEK|PKX|SHA|PVG|SZX|CAN|CKG|TAO|TSN|DLC|HGH|NKG|CTU|WUH|XIY|KMG|CSX|HFE|FOC|NNG|KWE|LXA|URC|HET|INC|XNN|LHW|TYN|SHE|CGQ|HRB)\\b/)) return "中国";

    return null;
}

function guessByTldLocal(domain) {
    if (!domain || isIPv4(domain)) return "";
    var s = domain.toLowerCase();
    var parts = s.split(".");
    var n = parts.length;
    if (n < 1) return "";
    var suffix2 = n >= 2 ? parts.slice(-2).join(".") : "";
    var suffix3 = n >= 3 ? parts.slice(-3).join(".") : "";
    var suffix1 = parts[n - 1];
    var LOCAL_TLD = {
        "cn":"中国","com.cn":"中国","net.cn":"中国","org.cn":"中国","gov.cn":"中国","edu.cn":"中国",
        "hk":"香港","com.hk":"香港","tw":"台湾","com.tw":"台湾","mo":"澳门",
        "jp":"日本","co.jp":"日本","ne.jp":"日本","or.jp":"日本","ac.jp":"日本",
        "sg":"新加坡","com.sg":"新加坡","kr":"韩国","co.kr":"韩国","ne.kr":"韩国","or.kr":"韩国","go.kr":"韩国",
        "us":"美国","uk":"英国","co.uk":"英国","org.uk":"英国","net.uk":"英国","ac.uk":"英国","gov.uk":"英国",
        "de":"德国","at":"奥地利","ch":"瑞士","li":"列支敦士登","fr":"法国","nl":"荷兰","be":"比利时","lu":"卢森堡","mc":"摩纳哥",
        "es":"西班牙","pt":"葡萄牙","it":"意大利","va":"梵蒂冈","sm":"圣马力诺","ad":"安道尔","mt":"马耳他","cy":"塞浦路斯","gr":"希腊",
        "pl":"波兰","cz":"捷克共和国","sk":"斯洛伐克","hu":"匈牙利","ro":"罗马尼亚","bg":"保加利亚","hr":"克罗地亚","si":"斯洛文尼亚","rs":"塞尔维亚",
        "ee":"爱沙尼亚","lv":"拉脱维亚","lt":"立陶宛","fi":"芬兰","se":"瑞典","no":"挪威","dk":"丹麦","is":"冰岛","fo":"法罗群岛","gl":"格陵兰",
        "ru":"俄罗斯","su":"俄罗斯","by":"白俄罗斯","ua":"乌克兰","md":"摩尔多瓦","ge":"格鲁吉亚","am":"亚美尼亚","az":"阿塞拜疆",
        "ca":"加拿大","mx":"墨西哥","cu":"古巴","pa":"巴拿马","cr":"哥斯达黎加","ni":"尼加拉瓜","hn":"洪都拉斯","sv":"萨尔瓦多","gt":"危地马拉","bz":"伯利兹",
        "ar":"阿根廷","cl":"智利","br":"巴西","co":"哥伦比亚","pe":"秘鲁","ve":"委内瑞拉","ec":"厄瓜多尔","bo":"玻利维亚","py":"巴拉圭","uy":"乌拉圭","gy":"圭亚那","sr":"苏里南",
        "au":"澳大利亚","com.au":"澳大利亚","net.au":"澳大利亚","org.au":"澳大利亚",
        "nz":"新西兰","co.nz":"新西兰","net.nz":"新西兰","org.nz":"新西兰",
        "in":"印度","co.in":"印度","net.in":"印度","pk":"巴基斯坦","bd":"孟加拉国","lk":"斯里兰卡","np":"尼泊尔","bt":"不丹","mv":"马尔代夫","my":"马来西亚","com.my":"马来西亚",
        "th":"泰国","co.th":"泰国","vn":"越南","ph":"菲律宾","id":"印度尼西亚","co.id":"印度尼西亚","or.id":"印度尼西亚","go.id":"印度尼西亚",
        "mm":"缅甸","kh":"柬埔寨","la":"老挝","bn":"文莱","mn":"蒙古",
        "ae":"阿联酋","sa":"沙特阿拉伯","tr":"土耳其","il":"以色列","qa":"卡塔尔","kw":"科威特","om":"阿曼","jo":"约旦","lb":"黎巴嫩","sy":"叙利亚","ye":"也门","iq":"伊拉克","ir":"伊朗","af":"阿富汗","ps":"巴勒斯坦","bh":"巴林",
        "eg":"埃及","za":"南非","ng":"尼日利亚","ke":"肯尼亚","tz":"坦桑尼亚","gh":"加纳","sn":"塞内加尔","dz":"阿尔及利亚","ma":"摩洛哥","tn":"突尼斯","ly":"利比亚","sd":"苏丹","et":"埃塞俄比亚","so":"索马里","ug":"乌干达","cm":"喀麦隆","ci":"科特迪瓦","mg":"马达加斯加","mu":"毛里求斯","sc":"塞舌尔","re":"留尼汪","yt":"马约特",
        "pr":"波多黎各","gu":"关岛","fj":"斐济","pg":"巴布亚新几内亚","ws":"萨摩亚","to":"汤加","vu":"瓦努阿图","ki":"基里巴斯","nr":"瑙鲁","fm":"密克罗尼西亚","mh":"马绍尔群岛","pw":"帕劳","tv":"图瓦卢",
        "kz":"哈萨克斯坦","uz":"乌兹别克斯坦","kg":"吉尔吉斯斯坦","tj":"塔吉克斯坦","tm":"土库曼斯坦"
    };
    if (suffix3 && LOCAL_TLD[suffix3]) return LOCAL_TLD[suffix3];
    if (suffix2 && LOCAL_TLD[suffix2]) return LOCAL_TLD[suffix2];
    if (suffix1 && LOCAL_TLD[suffix1]) return LOCAL_TLD[suffix1];
    return "";
}

var geoLabelCache = Object.create(null);

async function prefetchCountries(links) {
    var todo = [];
    for (var i = 0; i < links.length; i++) {
        var link = String(links[i] || "").trim();
        if (!link || geoLabelCache[link] !== undefined) continue;
        var decoded = link;
        try { decoded = decodeURIComponent(link); } catch (_) {}
        var hashIdx = decoded.indexOf("#");
        if (hashIdx >= 0 && hashIdx < decoded.length - 1) {
            var anchorGuess = detectCountryFromText(decoded.slice(hashIdx + 1));
            if (anchorGuess) { geoLabelCache[link] = anchorGuess; continue; }
        }
        todo.push(link);
    }
    if (!todo.length) return;

    var hostMap = Object.create(null);
    var hostOrder = [];
    for (var j = 0; j < todo.length; j++) {
        var link2 = todo[j];
        var host = "";
        try { host = extractHostFromLink(link2) || ""; } catch (_) {}
        if (!host) {
            geoLabelCache[link2] = guessByTldLocal(link2) || "通用";
            continue;
        }
        if (!hostMap[host]) { hostMap[host] = []; hostOrder.push(host); }
        hostMap[host].push(link2);
    }

    for (var k = 0; k < hostOrder.length; k += 20) {
        var chunk = hostOrder.slice(k, k + 20);
        var rows = null;
        try {
            var res = await fetch("/api/geo-lookup?host=" + encodeURIComponent(chunk.join(",")), {
                credentials: "same-origin"
            });
            if (res.ok) {
                var data = await res.json();
                rows = data.results || [];
            }
        } catch (e) {
            console.warn("批量地区查询失败，降级本地识别:", e);
        }
        var rowByHost = Object.create(null);
        if (rows) {
            for (var r = 0; r < rows.length; r++) rowByHost[rows[r].host] = rows[r].label;
        }
        for (var c = 0; c < chunk.length; c++) {
            var h = chunk[c];
            var label = rowByHost[h] || "";
            if (!label || label === "通用") {
                var tld = guessByTldLocal(h);
                if (tld) label = tld;
            }
            var linkList = hostMap[h];
            for (var q = 0; q < linkList.length; q++) geoLabelCache[linkList[q]] = label || "通用";
        }
    }
}

async function resolveCountryFromLink(link) {
    link = String(link || "").trim();
    if (!link) return "通用";
    if (geoLabelCache[link] !== undefined) return geoLabelCache[link];
    await prefetchCountries([link]);
    return geoLabelCache[link] || "通用";
}

function reloadPage() {
    trackAction("主页：刷新页面（重载）");
    window.location.reload();
}

function switchMode(mode) {
    const modeNames = {
        'chain-single': '链式代理 - 独立节点输入模式',
        'chain-bulk':  '链式代理 - 批量混合粘贴模式',
        'standard':    '自动分流 - 单/双代理订阅家用模式',
        'direct':      '直连模式 - 网段/单IP精准分流（无中转/无链式）',
        'sk-convert':  'Socks5 格式转换工具'
    };
    trackAction("主页：切换功能模式", modeNames[mode] || mode);
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
    const generateStepCard = document.getElementById('generateStepCard');

    const btnChainSingle = document.getElementById('btn-mode-chain-single');
    const btnChainBulk = document.getElementById('btn-mode-chain-bulk');
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnDirect = document.getElementById('btn-mode-direct');
    const btnSkConvert = document.getElementById('btn-mode-sk-convert');

    btnChainSingle.classList.remove('active');
    btnChainBulk.classList.remove('active');
    btnStandard.classList.remove('active');
    if (btnDirect) btnDirect.classList.remove('active');
    btnSkConvert.classList.remove('active');

    const chainSubSection = document.getElementById('chainSubSection');
    const dialerProxyBlock = document.getElementById('dialerProxyBlock');
    const ruleSectionTitle = document.getElementById('ruleSectionTitle');
    const nodeSectionTitle = document.getElementById('nodeSectionTitle');

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
        if (generateStepCard) generateStepCard.style.display = 'none';
        btnSkConvert.classList.add('active');
    } else {
        skConvertSection.style.display = 'none';
        clashBtnGroup.style.display = 'flex';
        clashOutputSection.style.display = 'block';
        if (generateStepCard) generateStepCard.style.display = '';

        if (chainSubSection) chainSubSection.style.display = '';
        if (dialerProxyBlock) dialerProxyBlock.style.display = '';
        if (ruleSectionTitle) ruleSectionTitle.innerText = '2. 前置中转与规则匹配方式';
        if (nodeSectionTitle) nodeSectionTitle.innerText = '3. 节点配置';

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
        } else if (mode === 'direct') {
            chainConfigSection.style.display = 'block';
            standardConfigSection.style.display = 'none';
            singleContainer.classList.add('active-section');
            bulkContainer.classList.remove('active-section');
            if (chainSubSection) chainSubSection.style.display = 'none';
            if (dialerProxyBlock) dialerProxyBlock.style.display = 'none';
            if (ruleSectionTitle) ruleSectionTitle.innerText = '1. 规则匹配方式';
            if (nodeSectionTitle) nodeSectionTitle.innerText = '2. 节点配置';
            if (btnDirect) btnDirect.classList.add('active');
        }
    }
}

function convertSkFormat() {
    trackAction("SK转换工具：智能多格式批量转换");
    const input = document.getElementById('skInputData').value.trim();
    if (!input) {
        alert('请输入需要转换的数据！');
        return;
    }

    const lines = input.split('\\n');
    const results = [];
    let okCount = 0, passthroughCount = 0, failCount = 0;

    for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const parsed = smartParseSkLine(line);
        if (parsed && parsed.passthrough) {
            results.push(line);
            passthroughCount++;
        } else if (parsed && parsed.host && parsed.port) {
            const formatted = buildSocks5Uri(parsed.host, parsed.port, parsed.user, parsed.pass);
            results.push(formatted);
            okCount++;
        } else {
            results.push(\`// 格式无法识别: \${line}\`);
            failCount++;
        }
    }

    document.getElementById('skOutputData').value = results.join('\\n');
    if (failCount > 0) {
        console.warn(\`SK转换完成: 成功 \${okCount} 条, 失败 \${failCount} 条\`);
    }
}

function smartParseSkLine(line) {
    const reMultiSpace = /\\s{2,}/;
    const rePort = /^\\d{1,5}$/;

    const lower = line.toLowerCase();

    const passthroughPrefixes = ['vless://', 'vmess://', 'trojan://', 'trojan-go://', 'hysteria2://', 'hy2://'];
    for (const p of passthroughPrefixes) {
        if (lower.startsWith(p)) {
            return { passthrough: true, source: p.replace('://', '') };
        }
    }

    const proxyDetectors = [
        { prefix: 'socks5://',  source: 'socks5',  defaultPort: '1080' },
        { prefix: 'socks://',   source: 'socks',   defaultPort: '1080' },
        { prefix: 'socks4://',  source: 'socks4',  defaultPort: '1080' },
        { prefix: 'socks4a://', source: 'socks4a', defaultPort: '1080' },
        { prefix: 'http://',    source: 'http',    defaultPort: '8080' },
        { prefix: 'https://',   source: 'https',   defaultPort: '8080' },
    ];
    for (const d of proxyDetectors) {
        if (lower.startsWith(d.prefix)) {
            try {
                const u = new URL(line);
                const host = u.hostname;
                const port = u.port || d.defaultPort;
                const user = u.username ? decodeURIComponent(u.username) : '';
                const pass = u.password ? decodeURIComponent(u.password) : '';
                if (host && port) {
                    return { host, port, user, pass, source: d.source };
                }
            } catch (e) {
            }
            return null;
        }
    }

    const separators = [
        { test: (l) => l.includes('|'),  split: '|' },
        { test: (l) => l.includes('\\t'), split: '\\t' },
        { test: (l) => l.includes(','),  split: ',' },
        { test: (l) => reMultiSpace.test(l), split: reMultiSpace },
    ];

    let parts = null;
    let sepUsed = null;
    for (const s of separators) {
        if (s.test(line)) {
            parts = line.split(s.split).map(p => p.trim()).filter(Boolean);
            sepUsed = s.split;
            if (parts.length >= 2) break;
            parts = null;
        }
    }

    if (!parts && line.includes(':')) {
        parts = splitOnColon(line);
        sepUsed = ':';
    }

    if (!parts && line.includes(' ')) {
        parts = line.split(' ').map(p => p.trim()).filter(Boolean);
    }

    if (!parts || parts.length < 2) return null;

    let portIdx = -1;
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (rePort.test(p) && parseInt(p, 10) > 0 && parseInt(p, 10) <= 65535) {
            portIdx = i;
            break;
        }
    }

    if (portIdx === -1) return null;

    const host = parts.slice(0, portIdx).join(sepUsed === ':' ? ':' : (sepUsed instanceof RegExp ? ' ' : sepUsed));
    const port = parts[portIdx];
    const rest = parts.slice(portIdx + 1);
    const user = rest[0] || '';
    const pass = rest[1] || '';

    if (!host) return null;

    return { host, port, user, pass, source: 'raw' };
}

function splitOnColon(line) {
    const rePort = /^\\d{1,5}$/;
    const reHex4 = /^[0-9a-fA-F]{1,4}$/;
    const reBracketIpv6 = new RegExp('^\\\\[([^\\\\]]+)\\\\](?::(.+))?$');

    const bracketMatch = line.trim().match(reBracketIpv6);
    if (bracketMatch) {
        const ipv6 = bracketMatch[1];
        const rest = bracketMatch[2] || '';
        const restParts = rest ? rest.split(':').map(p => p.trim()).filter(Boolean) : [];
        return [ipv6, ...restParts];
    }

    const rawParts = line.split(':').map(p => p.trim());
    const all = rawParts.filter(Boolean);

    const hasCompression = rawParts.includes('');
    const looksLikeIpv6 = (rawParts.length >= 6 || hasCompression) &&
        (reHex4.test(all[0]) || (all[0] === '' && reHex4.test(all[1])));

    if (looksLikeIpv6) {
        for (let i = rawParts.length - 1; i >= 1; i--) {
            const candidate = rawParts[i];
            if (rePort.test(candidate) && parseInt(candidate, 10) > 0 && parseInt(candidate, 10) <= 65535) {
                const hostPart = rawParts.slice(0, i).join(':');
                const afterPort = rawParts.slice(i + 1).filter(Boolean);
                return [hostPart, candidate, ...afterPort];
            }
        }
    }

    return all;
}

function buildSocks5Uri(host, port, user, pass) {
    const hostPart = host.includes(':') && !host.startsWith('[')
        ? '[' + host + ']'
        : host;

    if (user || pass) {
        const encUser = user ? encodeURIComponent(user) : '';
        const encPass = pass ? encodeURIComponent(pass) : '';
        const cred = encPass ? \`\${encUser}:\${encPass}@\` : \`\${encUser}@\`;
        return \`socks5://\${cred}\${hostPart}:\${port}\`;
    }

    return \`socks5://\${hostPart}:\${port}\`;
}

function clearSkText() {
    trackAction("SK转换工具：清空输入与转换结果");
    document.getElementById('skInputData').value = '';
    document.getElementById('skOutputData').value = '';
}

function copySkOutput() {
    trackAction("SK转换工具：复制转换结果到剪贴板");
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
    trackAction("自动分流模式：切换备用订阅显示", isChecked ? "展开备用订阅输入框" : "收起备用订阅输入框");
    document.getElementById('backupSubRow').style.display = isChecked ? 'flex' : 'none';
}

function toggleIpInputs() {
    const targetType = document.getElementById('ruleTargetType').value;
    trackAction("链式代理：分流目标切换", targetType === 'singleIp' ? "切换为按指定设备单 IP 分流" : "切换为按网段匹配分流");
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
    trackAction("链式代理-独立节点：新增节点输入卡片");
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
        <div class="row" style="margin-bottom: 8px; gap: 8px;">
            <div style="flex: 1;">
                <label>地区标签 <span class="tag" id="node-tag-\${nodeCount}">🤖 自动识别</span><span class="tip-tag">⌨️ 可手动输入地区名称，或下拉选择预设</span>:</label>
            </div>
            <div class="btn-card-actions">
                <button class="btn-action btn-lookup" onclick="manualLookupCard(\${nodeCount})">🔍 联网查询</button>
                <button class="btn-action btn-clear" onclick="clearNodeText('node-link-\${nodeCount}', 'node-country-\${nodeCount}', \${nodeCount})">🧹 清空</button>
                <button class="btn-action btn-remove" onclick="removeNodeCard('node-card-\${nodeCount}')">✕ 删除</button>
            </div>
        </div>
        <div class="row" style="margin-bottom: 8px;">
            <div style="flex: 1;">
                <div class="country-wrap" id="country-wrap-\${nodeCount}">
                    <select id="node-country-\${nodeCount}" class="node-country" onchange="countrySelChanged(\${nodeCount})" style="flex:1;">
                        <option value="__custom__">✎ 手动输入地区名称</option>
                        \${optionsHtml}
                    </select>
                    <span class="country-custom" id="country-custom-\${nodeCount}" style="display:none; flex:1;">
                        <input type="text" id="node-country-in-\${nodeCount}" class="country-in" oninput="countryInputChanged(\${nodeCount})" onblur="commitCustomCountry(\${nodeCount})" placeholder="输入自定义国家/地区名称..." style="flex:1;" autocomplete="off" />
                        <button type="button" class="country-back" onclick="countryBackToSel(\${nodeCount})" title="返回下拉选择">▼</button>
                    </span>
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

function countrySelChanged(id) {
    var sel = document.getElementById(\`node-country-\${id}\`);
    if (!sel) return;
    if (sel.value === '__custom__') {
        sel.style.display = 'none';
        var custom = document.getElementById(\`country-custom-\${id}\`);
        var inp = document.getElementById(\`node-country-in-\${id}\`);
        if (custom) custom.style.display = 'flex';
        if (inp) { inp.value = ''; inp.focus(); }
        return;
    }
    markUserEdited(id);
}

function countryInputChanged(id) {
    markUserEdited(id);
}

function commitCustomCountry(id) {
    var inp = document.getElementById(\`node-country-in-\${id}\`);
    var sel = document.getElementById(\`node-country-\${id}\`);
    if (!inp || !sel) return;
    var val = inp.value.trim();
    if (!val) {
        countryBackToSel(id, '通用');
        return;
    }
    var exists = false;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === val) { exists = true; break; }
    }
    if (!exists) {
        var opt = document.createElement('option');
        opt.value = val; opt.textContent = val;
        sel.appendChild(opt);
    }
    sel.value = val;
    countryBackToSel(id, val);
}

function countryBackToSel(id, selectValue) {
    var sel = document.getElementById(\`node-country-\${id}\`);
    var custom = document.getElementById(\`country-custom-\${id}\`);
    if (!sel || !custom) return;
    sel.style.display = '';
    custom.style.display = 'none';
    if (selectValue !== undefined) {
        sel.value = selectValue;
    }
}

async function updateCardCountry(textarea, id) {
    var countrySelect = document.getElementById(\`node-country-\${id}\`);
    var tag = document.getElementById(\`node-tag-\${id}\`);
    if (countrySelect && countrySelect.dataset.userEdited === "true") return;

    var val = (textarea && textarea.value) ? textarea.value.trim() : "";
    if (!val) {
        if (countrySelect) countrySelect.value = "通用";
        if (tag) tag.innerText = "🤖 自动识别";
        return;
    }

    if (tag) tag.innerText = "⏳ 查询中...";
    try {
        var res = await resolveCountryFromLink(val);
        if (countrySelect && countrySelect.dataset.userEdited !== "true") {
            var optionExists = false;
            try {
                optionExists = Array.from(countrySelect.options).some(function (opt) { return opt.value === res; });
            } catch (_) {}
            if (!optionExists && res && res !== '__custom__') {
                var newOpt = document.createElement('option');
                newOpt.value = res;
                newOpt.text = res;
                countrySelect.appendChild(newOpt);
            }
            countrySelect.value = res;
        }
        if (tag) tag.innerText = "🤖 自动识别";
    } catch (e) {
        console.warn("节点国家识别失败:", id, e);
        try {
            if (countrySelect && countrySelect.dataset.userEdited !== "true") {
                countrySelect.value = "通用";
            }
        } catch (_) {}
        if (tag) tag.innerText = "⚠️ 识别失败（已回退通用）";
    }
}

async function manualLookupCard(id) {
    trackAction("链式代理-独立节点：手动联网查询节点国家/地区");
    const textarea = document.getElementById(\`node-link-\${id}\`);
    const countrySelect = document.getElementById(\`node-country-\${id}\`);
    if (countrySelect) delete countrySelect.dataset.userEdited;
    if (textarea) await updateCardCountry(textarea, id);
}

function removeNodeCard(id) {
    trackAction("链式代理-独立节点：删除节点卡片");
    const card = document.getElementById(id);
    if (card) card.remove();
}

function clearNodeText(textareaId, countryInputId, id) {
    trackAction("链式代理-独立节点：清空单节点输入内容");
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
    trackAction("链式代理-批量粘贴：清空批量节点文本框");
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
            const safe = String(val).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
            parts.push(\`\${key}: "\${safe}"\`);
        }
    }
    return \`{\${parts.join(', ')}}\`;
}

// 清理用户输入：去除 YAML 禁止的控制字符（C0/C1 控制符、DEL、零宽字符、BOM）以及引号/反斜杠
// 防止粘贴订阅链接/名称时混入的不可见字符导致 go-yaml 报 "control characters are not allowed"
const sanitizeYamlInput = (s) => String(s)
    .replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\uFEFF\\u200B-\\u200D]/g, '')
    .replace(/["\\\\]/g, '');

async function downloadYaml() {
    trackAction("主页：下载已生成的 OpenClash YAML 配置文件（保存到本地）");
    if (!lastGeneratedYaml) {
        alert("请先点击生成配置文件！");
        return;
    }

    const yamlContent = lastGeneratedYaml.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\uFEFF]/g, '');

    const defaultFilename = 'OpenClash-Sub-Config.yaml';

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
            await writable.write(yamlContent);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }
            console.warn('File System Access API 不可用或失败，回退到传统下载:', err);
        }
    }

    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function generateYaml(autoDownload = false) {
    if (autoDownload) {
        trackAction("主页：生成并自动下载 OpenClash YAML 配置文件（完整文件）", "当前模式: " + currentMode);
    } else {
        trackAction("主页：生成并在页面内预览 OpenClash YAML 配置", "当前模式: " + currentMode);
    }
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.innerText = "⏳ 正在生成配置文件，请稍等...";

    function generateRandomSecret(len) {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        const arr = new Uint8Array(len);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(arr);
        } else {
            for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
        }
        for (let i = 0; i < len; i++) result += charset[arr[i] % charset.length];
        return result;
    }
    const clashSecret = generateRandomSecret(28);

    if (currentMode === 'standard') {
        const subName1 = sanitizeYamlInput(document.getElementById('stdSubName1').value.trim()) || '主力代理';
        const subUrl1 = sanitizeYamlInput(document.getElementById('stdSubUrl1').value.trim()) || 'https://your-main-sub-domain.com/link/token';
        const enableBackup = document.getElementById('enableBackupSub').checked;
        const subName2 = sanitizeYamlInput(document.getElementById('stdSubName2').value.trim()) || '备用代理';
        const subUrl2 = sanitizeYamlInput(document.getElementById('stdSubUrl2').value.trim()) || 'https://your-backup-sub-domain.com/link/token';

        let proxyProvidersBlock = \`  \${subName1}:
    url: "\${subUrl1}"
    type: http
    interval: 86400
    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离
    health-check:
      enable: true
      url: https://cp.cloudflare.com/generate_204
      interval: 600
      timeout: 3000
      expected-status: 204
      lazy: true\`;

        let useProvidersForGroups = \`      - \${subName1}\`;

        let priorityGroupsBlock = \`  - name: 主力-自动
    type: url-test
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    expected-status: 204
    use:
      - \${subName1}
    tolerance: 20
    lazy: true
    exclude-filter: "直连|拒绝"\`;

        if (enableBackup) {
            proxyProvidersBlock += \`\\n\\n  \${subName2}:
    url: "\${subUrl2}"
    type: http
    interval: 86400
    exclude-filter: 流量|账号|剩余|到期|过期|测试|试用|TG|群|官网|Expire|APP|官方|异常|邮箱|防|卸载|@|距离
    health-check:
      enable: true
      url: https://cp.cloudflare.com/generate_204
      interval: 600
      timeout: 3000
      expected-status: 204
      lazy: true\`;
            useProvidersForGroups += \`\\n      - \${subName2}\`;

            priorityGroupsBlock += \`\\n\\n  - name: 备用-自动
    type: url-test
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    expected-status: 204
    use:
      - \${subName2}
    tolerance: 20
    lazy: true
    exclude-filter: "直连|拒绝"\`;
        }

        lastGeneratedYaml = 
\`
port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
tproxy-port: 7895

allow-lan: true
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
secret: "\${clashSecret}"
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
  respect-rules: true # 强制 DNS 解析遵从分流规则
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
    - +.bilibili.com
    - +.hdslb.com
    - +.qq.com
    - +.taobao.com
    - +.jd.com

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
  strict-route: true

\${YAML_PROFILE_BLOCK}

default: &default
  type: select
  proxies:
    - 主力优先
    - 主力-自动
\${enableBackup ? '    - 备用-自动\\n' : ''}    - 所有-手动
    - 香港-故转
    - 台湾-故转
    - 日本-故转
    - 新加坡-故转
    - 韩国-故转
    - 美国-故转
    - 英国-故转
    - 其他-故转
    - 直连
    - 拒绝

proxy-groups:
\${priorityGroupsBlock}

  - name: 主力优先
    type: fallback
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    proxies:
      - 主力-自动\${enableBackup ? '\\n      - 备用-自动' : ''}

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
  - name: Nvidia
    type: select
    proxies:
      - 直连
      - 主力优先
      - 主力-自动\${enableBackup ? '\\n      - 备用-自动' : ''}
      - 所有-手动
  - name: Steam
    type: select
    proxies:
      - 直连
      - 主力优先
      - 主力-自动\${enableBackup ? '\\n      - 备用-自动' : ''}
      - 所有-手动
  - name: Games
    type: select
    proxies:
      - 直连
      - 主力优先
      - 主力-自动\${enableBackup ? '\\n      - 备用-自动' : ''}
      - 所有-手动
  - {name: Crypto, <<: *default}
  - name: Apple
    type: select
    proxies:
      - 直连
      - 主力优先
      - 主力-自动\${enableBackup ? '\\n      - 备用-自动' : ''}
      - 所有-手动
  - {name: Google, <<: *default}
  - name: Microsoft
    type: select
    proxies:
      - 直连
      - 主力优先
      - 主力-自动\${enableBackup ? '\\n      - 备用-自动' : ''}
      - 所有-手动
  - {name: Test, <<: *default}

  - name: Block
    type: select
    proxies:
      - 直连
      - 拒绝

  - name: 国外
    type: select
    proxies:
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
      - 直连

  - name: 国内
    type: select
    proxies:
      - 直连
      - 所有-自动

  - name: 其他
    type: select
    proxies:
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
      - 直连
  
  - name: 所有-手动
    type: select
    use:
\${useProvidersForGroups}
    exclude-filter: "直连|拒绝"

  - name: 所有-自动
    type: url-test
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000          
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    exclude-filter: "直连|拒绝" 
    expected-status: 204
    
  - name: 香港-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000          
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true                
    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"
    expected-status: 204
 
  - name: 台湾-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"
    expected-status: 204

  - name: 日本-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"
    expected-status: 204

  - name: 新加坡-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"
    expected-status: 204

  - name: 韩国-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"
    expected-status: 204

  - name: 美国-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"
    expected-status: 204

  - name: 英国-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"
    expected-status: 204

  - name: 其他-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
\${useProvidersForGroups}
    tolerance: 20
    lazy: true
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
    expected-status: 204

rules:
  - AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT 
  - DOMAIN-KEYWORD,webrtc,REJECT
  - DOMAIN-KEYWORD,stun,REJECT
  - DOMAIN-SUFFIX,stun.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun1.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun2.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun3.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun4.l.google.com,REJECT  

  - RULE-SET,Block / Domain,拒绝

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

  - RULE-SET,OKX / Domain,Crypto
  - RULE-SET,Bybit / Domain,Crypto
  - RULE-SET,Binance / Domain,Crypto

  - RULE-SET,Apple-CN / Domain,国内
  - RULE-SET,Apple / Domain,Apple
  - RULE-SET,Microsoft / Domain,Microsoft
  - RULE-SET,Google / Domain,Google
  - RULE-SET,Google / IP,Google,no-resolve
  - RULE-SET,Nvidia / Domain,Nvidia

  - RULE-SET,Proxy / Domain,国外
  - RULE-SET,Globe / Domain,国外
  - RULE-SET,Private / Domain,国内
  - RULE-SET,Direct / Domain,国内
  - RULE-SET,China / Domain,国内
  - RULE-SET,China / IP,国内,no-resolve
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
  Gemini / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Gemini.list"}
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
        statusMsg.innerText = '✅ V.0.2.8 标准分流配置文件已生成！';

        if (autoDownload) {
            await downloadYaml();
        }
    } else {
        const isDirectMode = (currentMode === 'direct');
        const subName = isDirectMode ? '' : (sanitizeYamlInput(document.getElementById('chainSubName').value.trim()) || '主力代理');
        const subUrl = isDirectMode ? '' : (sanitizeYamlInput(document.getElementById('subUrl').value.trim()) || 'https://your-sub-domain.com/link/token');
        const ruleTargetType = document.getElementById('ruleTargetType').value;
        const dialerProxy = isDirectMode ? '' : document.getElementById('dialerProxy').value;

        let currIpSubnet = parseInt(document.getElementById('startIp').value, 10) || 11;
        let currWifi = parseInt(document.getElementById('startWifi').value, 10) || 1;
        
        let ipPrefix = document.getElementById('targetIpPrefix').value.trim() || '192.168.11';
        let currIpHost = parseInt(document.getElementById('startIpHost').value, 10) || 101;

        let rawNodes = [];

        if (currentMode === 'chain-single' || currentMode === 'direct') {
            const cards = document.querySelectorAll('.node-card');
            for (const card of cards) {
                const link = card.querySelector('.node-link').value.trim();
                if (!link) continue;
                const countrySelect = card.querySelector('.node-country');
                let country = "通用";
                if (countrySelect) {
                    if (countrySelect.value === '__custom__') {
                        const inp = card.querySelector('.country-in');
                        country = (inp && inp.value.trim()) ? inp.value.trim() : "通用";
                    } else {
                        country = countrySelect.value.trim() || "通用";
                    }
                }
                rawNodes.push({ link, country });
            }
        } else {
            const bulkText = document.getElementById('bulkLinks').value.trim();
            if (bulkText) {
                const lines = bulkText.split('\\n').map(function (s) { return s.trim(); }).filter(Boolean);
                await prefetchCountries(lines);
                for (const l of lines) {
                    rawNodes.push({ link: l, country: await resolveCountryFromLink(l) });
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

                const normalizedLink = link.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*):\\/\\//, function (m) { return m.toLowerCase(); });

                if (normalizedLink.startsWith('vless://')) { proxyObj = parseVless(normalizedLink); protoTag = 'VLESS'; }
                else if (normalizedLink.startsWith('vmess://')) { proxyObj = parseVmess(normalizedLink); protoTag = 'VMess'; }
                else if (normalizedLink.startsWith('trojan://') || normalizedLink.startsWith('trojan-go://')) { proxyObj = parseTrojan(normalizedLink); protoTag = 'Trojan'; }
                else if (normalizedLink.startsWith('hysteria2://') || normalizedLink.startsWith('hy2://')) { proxyObj = parseHysteria2(normalizedLink); protoTag = 'Hy2'; }
                else if (normalizedLink.startsWith('socks5://') || normalizedLink.startsWith('socks://')) { proxyObj = parseSocks5(normalizedLink); protoTag = 'Socks5'; }

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

        if (isDirectMode) {
            lastGeneratedYaml = 
\`
\${buildYamlBase(clashSecret)}

proxies:
\${proxiesArr.join('\\n')}

\${YAML_DNS_BLOCK}
\${YAML_TUN_BLOCK}
\${YAML_PROFILE_BLOCK}

proxy-groups:
  - name: 纯静态住宅-落地组
    type: select
    proxies:
\${residentialGroupProxies.join('\\n')}

\${wifiSingleGroups.join('\\n\\n')}

  - name: 其他
    type: select
    proxies:
      - 直连
      - 纯静态住宅-落地组
      - 拒绝

rules:
  - AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT 
  - DOMAIN-KEYWORD,webrtc,REJECT
  - DOMAIN-KEYWORD,stun,REJECT
  - DOMAIN-SUFFIX,stun.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun1.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun2.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun3.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun4.l.google.com,REJECT  

\${rulesArr.join('\\n')}

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
  
  - GEOIP,CN,DIRECT
  - MATCH,其他
\`;

            document.getElementById('out-full').innerText = lastGeneratedYaml;
            statusMsg.innerText = '✅ 直连模式配置文件已生成（无中转/无链式）！';

            if (autoDownload) {
                await downloadYaml();
            }
        } else {
        lastGeneratedYaml = 
\`
port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
tproxy-port: 7895

allow-lan: true
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
secret: "\${clashSecret}"
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
      url: https://cp.cloudflare.com/generate_204
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
  respect-rules: true # 强制 DNS 解析遵从分流规则
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
    - +.bilibili.com
    - +.hdslb.com
    - +.qq.com
    - +.taobao.com
    - +.jd.com

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
  strict-route: true

\${YAML_PROFILE_BLOCK}

default: &default
  type: select
  proxies:
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
    - 直连
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
  - name: Nvidia
    type: select
    proxies:
      - 直连
      - 所有-自动
      - 所有-手动
      - 美国-故转
      - 其他-故转
  - name: Steam
    type: select
    proxies:
      - 直连
      - 所有-自动
      - 所有-手动
      - 日本-故转
      - 美国-故转
      - 其他-故转
  - name: Games
    type: select
    proxies:
      - 直连
      - 所有-自动
      - 所有-手动
      - 日本-故转
      - 香港-故转
      - 美国-故转
      - 其他-故转
  - {name: Crypto, <<: *default}
  - name: Apple
    type: select
    proxies:
      - 直连
      - 所有-自动
      - 所有-手动
      - 香港-故转
      - 台湾-故转
      - 日本-故转
      - 美国-故转
      - 其他-故转
  - {name: Google, <<: *default}
  - name: Microsoft
    type: select
    proxies:
      - 直连
      - 所有-自动
      - 所有-手动
      - 香港-故转
      - 日本-故转
      - 新加坡-故转
      - 美国-故转
      - 其他-故转
  - {name: Test, <<: *default}

  - name: Block
    type: select
    proxies:
      - 直连
      - 拒绝

  - name: 国外
    type: select
    proxies:
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
      - 直连

  - name: 国内
    type: select
    proxies:
      - 直连
      - 所有-自动

  - name: 其他
    type: select
    proxies:
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
      - 直连
  
  - name: 所有-手动
    type: select
    use:
      - \${subName}
    exclude-filter: "直连|拒绝"

  - name: 所有-自动
    type: url-test
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000          
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    exclude-filter: "直连|拒绝" 
    expected-status: 204

  - name: 香港-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000          
    use:
      - \${subName}
    tolerance: 20
    lazy: true                
    filter: "广港|香港|HK|Hong Kong|🇭🇰|HongKong"
    expected-status: 204
 
  - name: 台湾-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan"
    expected-status: 204

  - name: 日本-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan"
    expected-status: 204

  - name: 新加坡-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "广新|新加坡|SG|坡|狮城|🇸🇬|Singapore"
    expected-status: 204

  - name: 韩国-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea"
    expected-status: 204

  - name: 美国-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States"
    expected-status: 204

  - name: 英国-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "英国|英|伦敦|UK|United Kingdom|🇬🇧|London"
    expected-status: 204

  - name: 其他-故转
    type: fallback
    expected-status: 204
    url: https://cp.cloudflare.com/generate_204
    interval: 180
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
    url: https://cp.cloudflare.com/generate_204
    interval: 180
    timeout: 3000
    use:
      - \${subName}
    tolerance: 20
    lazy: true
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
    expected-status: 204

rules:
  - AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT 
  - DOMAIN-KEYWORD,webrtc,REJECT
  - DOMAIN-KEYWORD,stun,REJECT
  - DOMAIN-SUFFIX,stun.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun1.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun2.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun3.l.google.com,REJECT
  - DOMAIN-SUFFIX,stun4.l.google.com,REJECT  

\${rulesArr.join('\\n')}

  - RULE-SET,Block / Domain,拒绝

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

  - RULE-SET,OKX / Domain,Crypto
  - RULE-SET,Bybit / Domain,Crypto
  - RULE-SET,Binance / Domain,Crypto

  - RULE-SET,Apple-CN / Domain,国内
  - RULE-SET,Apple / Domain,Apple
  - RULE-SET,Microsoft / Domain,Microsoft
  - RULE-SET,Google / Domain,Google
  - RULE-SET,Google / IP,Google,no-resolve
  - RULE-SET,Nvidia / Domain,Nvidia

  - RULE-SET,Proxy / Domain,国外
  - RULE-SET,Globe / Domain,国外
  - RULE-SET,Private / Domain,国内
  - RULE-SET,Direct / Domain,国内
  - RULE-SET,China / Domain,国内
  - RULE-SET,China / IP,国内,no-resolve
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
  Gemini / Domain: {<<: *class, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Gemini.list"}
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
        statusMsg.innerText = '✅ 链式代理配置文件已生成！';

        if (autoDownload) {
            await downloadYaml();
        }
        }
    }
}
</script>
</body>
</html>`;

    return new Response(html, {
      headers: withSecurityHeaders({ "Content-Type": "text/html;charset=UTF-8" })
    });
  }
};
