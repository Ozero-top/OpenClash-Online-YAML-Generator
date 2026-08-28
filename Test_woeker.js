// Cloudflare Worker 部署入口[cite: 1]
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 获取客户端真实 IP 及 Cloudflare 地理位置信息
    const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

    // ============ 国家代码 → 中文映射表（ISO 3166-1 alpha-2 全覆盖）============
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

    // ============ 城市英文名 → 中文映射表（中国地级市 + 全球主要城市）============
    const CITY_CN = {
      // 直辖市/特别行政区
      "Beijing":"北京市","Shanghai":"上海市","Guangzhou":"广州市","Shenzhen":"深圳市","Tianjin":"天津市","Chongqing":"重庆市",
      "Hong Kong":"香港","Hongkong":"香港","HongKong":"香港","Kowloon":"九龙","Macau":"澳门","Macao":"澳门","Taipei":"台北市",
      "New Taipei":"新北市","Taichung":"台中市","Kaohsiung":"高雄市","Tainan":"台南市","Hsinchu":"新竹市","Keelung":"基隆市",
      // 广东
      "Dongguan":"东莞市","Foshan":"佛山市","Zhongshan":"中山市","Zhuhai":"珠海市","Huizhou":"惠州市","Jiangmen":"江门市",
      "Shantou":"汕头市","Zhaoqing":"肇庆市","Zhanjiang":"湛江市","Maoming":"茂名市","Meizhou":"梅州市","Shaoguan":"韶关市",
      "Qingyuan":"清远市","Yangjiang":"阳江市","Jieyang":"揭阳市","Chaozhou":"潮州市","Heyuan":"河源市","Shanwei":"汕尾市",
      "Yunfu":"云浮市",
      // 江浙沪
      "Hangzhou":"杭州市","Nanjing":"南京市","Suzhou":"苏州市","Ningbo":"宁波市","Wuxi":"无锡市","Wenzhou":"温州市",
      "Changzhou":"常州市","Shaoxing":"绍兴市","Jiaxing":"嘉兴市","Xuzhou":"徐州市","Huzhou":"湖州市","Jinhua":"金华市",
      "Taizhou":"台州市","Zhenjiang":"镇江市","Lishui":"丽水市","Yancheng":"盐城市","Yangzhou":"扬州市","Huaian":"淮安市",
      "Lianyungang":"连云港市","Suqian":"宿迁市","Zhoushan":"舟山市","Quzhou":"衢州市","Nantong":"南通市",
      // 川渝
      "Chengdu":"成都市","Mianyang":"绵阳市","Yibin":"宜宾市","Nanchong":"南充市","Deyang":"德阳市","Leshan":"乐山市",
      "Luzhou":"泸州市","Dazhou":"达州市","Meishan":"眉山市","Suining":"遂宁市","Guang'an":"广安市","Panzhihua":"攀枝花市",
      "Ziyang":"资阳市","Neijiang":"内江市","Wanzhou":"万州区","Fuling":"涪陵区",
      // 湖北
      "Wuhan":"武汉市","Yichang":"宜昌市","Xiangyang":"襄阳市","Huangshi":"黄石市","Jingzhou":"荆州市","Shiyan":"十堰市",
      "Xiaogan":"孝感市","Huanggang":"黄冈市","Jingmen":"荆门市","Ezhou":"鄂州市","Xianning":"咸宁市","Suizhou":"随州市",
      "Enshi":"恩施土家族苗族自治州","Enshi City":"恩施市",
      // 湖南
      "Changsha":"长沙市","Zhuzhou":"株洲市","Xiangtan":"湘潭市","Hengyang":"衡阳市","Yueyang":"岳阳市","Changde":"常德市",
      "Shaoyang":"邵阳市","Zhangjiajie":"张家界市","Yiyang":"益阳市","Chenzhou":"郴州市","Yongzhou":"永州市","Huaihua":"怀化市",
      "Loudi":"娄底市","Xiangxi":"湘西土家族苗族自治州",
      // 山东
      "Jinan":"济南市","Qingdao":"青岛市","Yantai":"烟台市","Weifang":"潍坊市","Linyi":"临沂市","Jining":"济宁市",
      "Zibo":"淄博市","Weihai":"威海市","Rizhao":"日照市","Dongying":"东营市","Taian":"泰安市","Binzhou":"滨州市",
      "Dezhou":"德州市","Liaocheng":"聊城市","Heze":"菏泽市","Zaozhuang":"枣庄市",
      // 河南
      "Zhengzhou":"郑州市","Luoyang":"洛阳市","Nanyang":"南阳市","Xuchang":"许昌市","Xinxiang":"新乡市","Kaifeng":"开封市",
      "Anyang":"安阳市","Pingdingshan":"平顶山市","Shangqiu":"商丘市","Jiaozuo":"焦作市","Zhoukou":"周口市","Xinyang":"信阳市",
      "Luohe":"漯河市","Puyang":"濮阳市","Hebi":"鹤壁市","Sanmenxia":"三门峡市","Zhumadian":"驻马店市",
      // 河北
      "Shijiazhuang":"石家庄市","Tangshan":"唐山市","Qinhuangdao":"秦皇岛市","Handan":"邯郸市","Baoding":"保定市","Langfang":"廊坊市",
      "Cangzhou":"沧州市","Hengshui":"衡水市","Xingtai":"邢台市","Chengde":"承德市","Zhangjiakou":"张家口市",
      // 福建
      "Xiamen":"厦门市","Fuzhou":"福州市","Quanzhou":"泉州市","Putian":"莆田市","Zhangzhou":"漳州市","Longyan":"龙岩市",
      "Sanming":"三明市","Nanping":"南平市","Ningde":"宁德市",
      // 安徽
      "Hefei":"合肥市","Wuhu":"芜湖市","Huangshan":"黄山市","Ma'anshan":"马鞍山市","Maanshan":"马鞍山市",
      "Bengbu":"蚌埠市","Anhui Bozhou":"亳州市","Suzhou (Anhui)":"宿州市","Anqing":"安庆市","Xuancheng":"宣城市",
      "Huainan":"淮南市","Huaibei":"淮北市","Chuzhou":"滁州市","Liuan":"六安市","Chizhou":"池州市","Tongling":"铜陵市",
      "Fuyang":"阜阳市","Bozhou":"亳州市","Lu'an":"六安市",
      // 江西
      "Nanchang":"南昌市","Jiujiang":"九江市","Ganzhou":"赣州市","Shangrao":"上饶市","Pingxiang":"萍乡市","Xinyu":"新余市",
      "Jian":"吉安市","Ji'an":"吉安市","Yichun":"宜春市","Fuzhou":"抚州市","Jingdezhen":"景德镇市","Yingtan":"鹰潭市",
      // 陕西
      "Xi'an":"西安市","Xian":"西安市","Baoji":"宝鸡市","Xianyang":"咸阳市","Weinan":"渭南市","Yan'an":"延安市",
      "Yulin":"榆林市","Hanzhong":"汉中市","Ankang":"安康市","Shangluo":"商洛市","Tongchuan":"铜川市",
      // 山西
      "Taiyuan":"太原市","Datong":"大同市","Yuncheng":"运城市","Changzhi":"长治市","Jincheng":"晋城市","Jinzhong":"晋中市",
      "Linfen":"临汾市","Lvliang":"吕梁市","Luliang":"吕梁市","Shuozhou":"朔州市","Xinzhou":"忻州市","Yangquan":"阳泉市",
      // 东北
      "Shenyang":"沈阳市","Dalian":"大连市","Harbin":"哈尔滨市","Changchun":"长春市","Anshan":"鞍山市","Fushun":"抚顺市",
      "Jilin":"吉林市","Yanji":"延吉市","Daqing":"大庆市","Qiqihar":"齐齐哈尔市","Jinzhou":"锦州市","Mudanjiang":"牡丹江市",
      "Yingkou":"营口市","Benxi":"本溪市","Dandong":"丹东市","Fuxin":"阜新市","Liaoyang":"辽阳市","Panjin":"盘锦市",
      "Tieling":"铁岭市","Chaoyang":"朝阳市","Huludao":"葫芦岛市","Tonghua":"通化市","Baicheng":"白城市","Siping":"四平市",
      "Baishan":"白山市","Songyuan":"松原市","Jiamusi":"佳木斯市","Hegang":"鹤岗市","Shuangyashan":"双鸭山市","Jixi":"鸡西市",
      "Qitaihe":"七台河市","Suihua":"绥化市","Heihe":"黑河市","Daxing'anling":"大兴安岭地区",
      // 云南
      "Kunming":"昆明市","Dali":"大理白族自治州","Lijiang":"丽江市","Qujing":"曲靖市","Yuxi":"玉溪市","Baoshan":"保山市",
      "Zhaotong":"昭通市","Puer":"普洱市","Lincang":"临沧市","Chuxiong":"楚雄彝族自治州","Honghe":"红河哈尼族彝族自治州",
      "Wenshan":"文山壮族苗族自治州","Xishuangbanna":"西双版纳傣族自治州","Dehong":"德宏傣族景颇族自治州",
      "Nujiang":"怒江傈僳族自治州","Diqing":"迪庆藏族自治州",
      // 贵州
      "Guiyang":"贵阳市","Zunyi":"遵义市","Liupanshui":"六盘水市","Anshun":"安顺市","Bijie":"毕节市",
      "Tongren":"铜仁市","Qiannan":"黔南布依族苗族自治州","Qiandongnan":"黔东南苗族侗族自治州",
      "Qianxinan":"黔西南布依族苗族自治州",
      // 广西
      "Nanning":"南宁市","Guilin":"桂林市","Liuzhou":"柳州市","Beihai":"北海市","Yulin":"玉林市","Wuzhou":"梧州市",
      "Qinzhou":"钦州市","Guigang":"贵港市","Fangchenggang":"防城港市","Baise":"百色市","Hezhou":"贺州市",
      "Hechi":"河池市","Laibin":"来宾市","Chongzuo":"崇左市",
      // 海南
      "Haikou":"海口市","Sanya":"三亚市","Sansha":"三沙市","Danzhou":"儋州市",
      // 甘肃
      "Lanzhou":"兰州市","Tianshui":"天水市","Jiuquan":"酒泉市","Jiayuguan":"嘉峪关市","Zhangye":"张掖市","Jinchang":"金昌市",
      "Baiyin":"白银市","Qingyang":"庆阳市","Pingliang":"平凉市","Dingxi":"定西市","Longnan":"陇南市","Linxia":"临夏回族自治州",
      "Gannan":"甘南藏族自治州","Wuwei":"武威市",
      // 青海
      "Xining":"西宁市","Haidong":"海东市","Haibei":"海北藏族自治州","Huangnan":"黄南藏族自治州",
      "Hainan":"海南藏族自治州","Guoluo":"果洛藏族自治州","Yushu":"玉树藏族自治州","Haixi":"海西蒙古族藏族自治州",
      // 宁夏
      "Yinchuan":"银川市","Shizuishan":"石嘴山市","Wuzhong":"吴忠市","Guyuan":"固原市","Zhongwei":"中卫市",
      // 内蒙古
      "Hohhot":"呼和浩特市","Baotou":"包头市","Ordos":"鄂尔多斯市","Chifeng":"赤峰市","Tongliao":"通辽市",
      "Hulunbuir":"呼伦贝尔市","Ulanqab":"乌兰察布市","Bayannur":"巴彦淖尔市","Xing'an":"兴安盟",
      "Xilingol":"锡林郭勒盟","Alxa":"阿拉善盟","Wuhai":"乌海市",
      // 新疆
      "Urumqi":"乌鲁木齐市","Kashgar":"喀什地区","Karamay":"克拉玛依市","Turpan":"吐鲁番市","Hami":"哈密市",
      "Changji":"昌吉回族自治州","Bortala":"博尔塔拉蒙古自治州","Bayingol":"巴音郭楞蒙古自治州",
      "Aksu":"阿克苏地区","Kizilsu":"克孜勒苏柯尔克孜自治州","Hotan":"和田地区",
      "Yili":"伊犁哈萨克自治州","Tacheng":"塔城地区","Altay":"阿勒泰地区","Shihezi":"石河子市",
      // 西藏
      "Lhasa":"拉萨市","Shigatse":"日喀则市","Chamdo":"昌都市","Nyingchi":"林芝市","Shannan":"山南市",
      "Nagqu":"那曲市","Ngari":"阿里地区",
      // 四川其他
      "Aba":"阿坝藏族羌族自治州","Ngawa":"阿坝藏族羌族自治州","Garzê":"甘孜藏族自治州","Garze":"甘孜藏族自治州",
      "Liangshan":"凉山彝族自治州",

      // ===== 全球主要城市 =====
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

    // 辅助函数：把 Cloudflare 返回的国家信息（ISO 码或英文）转为中文
    function toCnCountry(raw) {
      if (!raw) return "未知国家";
      const s = raw.toString().trim();
      if (!s) return "未知国家";
      // 1) 先命中 ISO 国家码（两字母大写）
      if (s.length === 2 && COUNTRY_CN[s]) return COUNTRY_CN[s];
      // 2) 大小写不敏感的国家码
      if (s.length === 2) {
        const up = s.toUpperCase();
        if (COUNTRY_CN[up]) return COUNTRY_CN[up];
      }
      // 3) 常见英文国名 → 中文（兜底，防止 Cloudflare 偶尔返回完整英文名）
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
      // 4) 包含关键词的模糊匹配
      const lower = s.toLowerCase();
      if (lower.includes("china") && !lower.includes("taiwan") && !lower.includes("hong") && !lower.includes("macau")) return "中国";
      if (lower.includes("chinese")) return "中国";
      // 5) Fallback 原名称
      return s;
    }

    // 辅助函数：城市英文名 → 中文
    function toCnCity(raw) {
      if (!raw) return "未知地区";
      const s = raw.toString().trim();
      if (!s) return "未知地区";
      if (CITY_CN[s]) return CITY_CN[s];
      // 大小写修正（首字母大写其余小写）后再查
      const normalized = s.split(" ").map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");
      if (CITY_CN[normalized]) return CITY_CN[normalized];
      // 无撇号版本（Xi'an → Xian）
      const noApos = s.replace(/['\u2019]/g, "");
      if (CITY_CN[noApos]) return CITY_CN[noApos];
      if (CITY_CN[noApos.replace(/\s*\(.*\)\s*$/,"")]) return CITY_CN[noApos.replace(/\s*\(.*\)\s*$/,"")];
      return s;
    }

    // 读取 country/city，并立即转为中文（/api/visit 响应使用）
    const country = toCnCountry(request.cf?.country || "未知国家");
    const city = toCnCity(request.cf?.city || request.cf?.region || "未知地区");

    // ===== 安全配置（最小侵入版，不添加 CSP 以免破坏内联脚本/blob 下载）=====
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

    // ===== 三页共享 HTML/JS 片段（无 ${} 模板插值，可安全注入外层模板字符串） =====
    const SHARED_HEAD_META = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0f1419" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f7f9fc" media="(prefers-color-scheme: light)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;

    const SHARED_THEME_INIT_SCRIPT = `<script>
// 主题初始化 + 切换（优先 localStorage，否则跟随系统）
(function(){
  try {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch(_) {}
    var mqDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    function resolveDefaultTheme() {
      if (mqDark && mqDark.matches) return 'dark';
      return 'light';
    }
    function applyTheme(theme) {
      if (theme === 'light' || theme === 'dark') {
        root.setAttribute('data-theme', theme);
      } else {
        root.removeAttribute('data-theme');
      }
      var btn = document.getElementById('themeToggleBtn');
      if (btn) {
        var effective = theme || (resolveDefaultTheme());
        btn.textContent = (effective === 'dark') ? '🌞' : '🌙';
        btn.title = (effective === 'dark') ? '切换到浅色主题' : '切换到深色主题';
      }
    }
    var initialTheme = (saved === 'light' || saved === 'dark') ? saved : '';
    applyTheme(initialTheme);
    function bindBtn() {
      var btn = document.getElementById('themeToggleBtn');
      if (!btn) return;
      btn.addEventListener('click', function() {
        var current = root.getAttribute('data-theme') || (resolveDefaultTheme());
        var next = (current === 'dark') ? 'light' : 'dark';
        try { localStorage.setItem('theme', next); } catch(_) {}
        applyTheme(next);
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindBtn);
    } else {
      bindBtn();
    }
    if ((!saved || saved !== 'light' && saved !== 'dark') && mqDark && typeof mqDark.addEventListener === 'function') {
      mqDark.addEventListener('change', function() {
        root.removeAttribute('data-theme');
        applyTheme('');
      });
    }
  } catch (_) {}
})();
</script>`;

    const SHARED_TRACK_SCRIPT = `<script>
// 操作追踪已禁用（后端记录功能已移除），保留空函数避免前端 onclick 调用报错
function trackAction(actionName, extra) { /* no-op */ }
</script>`;

    // 内部帮助函数：统计独立访客数（仅计数，不再写访问日志/去重标记）
    // - path/actionDirect 参数保留以兼容现有调用点，但不再使用
    // - 30 天窗口内同 IP 只计数一次
    async function recordVisit(path, actionDirect) {
      if (!env || !env.PAGE_VISITS) return 0;
      try {
        const TTL_30_DAYS = 30 * 24 * 60 * 60;
        // IP 独立访客计数（30 天窗口）
        const hasVisited = await env.PAGE_VISITS.get(`ip:${clientIp}`);
        let currentCount = parseInt((await env.PAGE_VISITS.get("total_unique_visitors")) || "0", 10);
        if (!hasVisited) {
          await env.PAGE_VISITS.put(`ip:${clientIp}`, "1", { expirationTtl: TTL_30_DAYS });
          currentCount += 1;
          await env.PAGE_VISITS.put("total_unique_visitors", currentCount.toString());
        }
        return currentCount;
      } catch (e) {
        console.error("KV 写入异常:", e);
        return 0;
      }
    }

    // 1. 提供异步获取 IP 与独立访问计数的 API
    if (url.pathname === "/api/visit") {
      if (request.method !== "GET") return methodNotAllowedResponse("GET");
      let visitCount = 0;
      let kvBound = false;

      if (env && env.PAGE_VISITS) {
        kvBound = true;
        visitCount = await recordVisit("/api/visit");
      }

      return new Response(JSON.stringify({
        ip: clientIp,
        country: country,
        city: city,
        visitCount: visitCount,
        kvBound: kvBound
      }), {
        headers: withSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8" })
      });
    }

    // 节点国家/地区查询代理接口（修复前端 CORS 跨域问题 + 多维度识别增强）
    // 原前端直接调用 ip-api.com 被 CORS 拦截，改为通过 Worker 后端代理查询
    if (url.pathname === "/api/geo-lookup") {
      if (request.method !== "GET") return methodNotAllowedResponse("GET");

      const rawHost = (url.searchParams.get("host") || "").trim();
      const rawIp = (url.searchParams.get("ip") || "").trim();
      const extraCtx = (url.searchParams.get("ctx") || "").trim(); // 附加上下文：sni/host/锚点名等全部文本
      const target = rawHost || rawIp;

      if (!target) {
        return new Response(JSON.stringify({ ok: false, error: "缺少 host 或 ip 参数", label: "通用" }), {
          status: 400,
          headers: withSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8" })
        });
      }

      // ============== 维度 0：IP 段本地快速识别（最高优先级，不依赖外部查询）==============
      // IPv4 转整数
      function ipv4ToInt(ip) {
        var parts = ip.split(".");
        if (parts.length !== 4) return -1;
        var n = 0;
        for (var i = 0; i < 4; i++) {
          var p = parseInt(parts[i], 10);
          if (isNaN(p) || p < 0 || p > 255) return -1;
          n = (n << 8) + p;
        }
        return n >>> 0;
      }
      // 判断 IP 是否在 CIDR 范围内
      function ipInCidr(ipInt, cidr) {
        var slash = cidr.indexOf("/");
        if (slash < 0) return ipv4ToInt(cidr) === ipInt;
        var netIp = ipv4ToInt(cidr.slice(0, slash));
        var prefix = parseInt(cidr.slice(slash + 1), 10);
        if (netIp < 0 || isNaN(prefix) || prefix < 0 || prefix > 32) return false;
        if (prefix === 0) return true;
        var mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
        return (ipInt & mask) === (netIp & mask);
      }
      function ipInAnyCidr(ipStr, cidrList) {
        var ipInt = ipv4ToInt(ipStr);
        if (ipInt < 0) return false;
        for (var i = 0; i < cidrList.length; i++) {
          if (ipInCidr(ipInt, cidrList[i])) return true;
        }
        return false;
      }
      // 私有/保留 IP 段（直接返回"通用"，无需继续查询）
      const PRIVATE_IP_RANGES = [
        "0.0.0.0/8","10.0.0.0/8","100.64.0.0/10","127.0.0.0/8","169.254.0.0/16",
        "172.16.0.0/12","192.0.0.0/24","192.0.2.0/24","192.168.0.0/16",
        "198.18.0.0/15","198.51.100.0/24","203.0.113.0/24","224.0.0.0/4","240.0.0.0/4"
      ];
      // 中国大陆 IP 段（常用段节选，避免列表过大；仅作快速定性）
      const CN_IP_RANGES = [
        "1.0.0.0/24","1.0.1.0/24","1.0.8.0/21","1.0.32.0/19","1.1.0.0/24","1.1.2.0/23",
        "1.1.4.0/22","1.1.8.0/24","1.1.16.0/20","1.2.0.0/23","1.2.2.0/24","1.2.4.0/23",
        "1.2.8.0/24","1.2.16.0/20","1.3.0.0/24","1.3.2.0/23","1.3.4.0/22","1.3.8.0/21",
        "1.4.0.0/16","1.5.0.0/16","1.6.0.0/15","1.8.0.0/16","1.10.0.0/16","1.12.0.0/14",
        "1.18.0.0/16","1.24.0.0/13","1.32.0.0/14","1.44.0.0/14","1.48.0.0/15","1.50.0.0/16",
        "1.52.0.0/15","1.56.0.0/13","1.64.0.0/11","1.96.0.0/12","1.112.0.0/14","1.116.0.0/15",
        "1.119.0.0/16","1.120.0.0/13","1.128.0.0/11","1.160.0.0/12","1.176.0.0/13","1.184.0.0/14",
        "1.188.0.0/14","1.192.0.0/14","1.200.0.0/13","1.208.0.0/12","1.224.0.0/13",
        "14.0.0.0/11","14.32.0.0/11","14.64.0.0/11","14.96.0.0/11","14.128.0.0/11","14.160.0.0/12","14.176.0.0/12","14.192.0.0/12","14.208.0.0/12","14.224.0.0/12",
        "112.0.0.0/10","112.64.0.0/14","112.80.0.0/12","112.96.0.0/15","112.112.0.0/14","112.122.0.0/15","112.124.0.0/15","114.0.0.0/15","114.24.0.0/13","114.32.0.0/12","114.48.0.0/12","114.64.0.0/11","114.112.0.0/14","114.216.0.0/13","115.0.0.0/17","115.32.0.0/13","115.40.0.0/15","115.128.0.0/11","116.0.0.0/13","116.16.0.0/12","116.52.0.0/14","116.56.0.0/15","116.76.0.0/14","116.192.0.0/14","116.236.0.0/14","117.0.0.0/13","117.24.0.0/14","117.28.0.0/15","117.32.0.0/13","117.40.0.0/14","117.44.0.0/15","117.64.0.0/13","117.136.0.0/13","118.24.0.0/13","118.72.0.0/13","118.78.0.0/15","118.80.0.0/14","118.112.0.0/12","118.122.0.0/16","118.123.0.0/16","118.132.0.0/14","118.144.0.0/15","118.178.0.0/16","118.180.0.0/14","118.192.0.0/15","118.202.0.0/16","118.204.0.0/14","118.212.0.0/15","118.228.0.0/14","119.0.0.0/13","119.8.0.0/15","119.32.0.0/15","119.36.0.0/16","119.57.0.0/16","119.60.0.0/15","119.75.208.0/20","119.80.0.0/14","119.84.0.0/15","119.96.0.0/13","119.120.0.0/13","119.144.0.0/14","119.162.0.0/15","119.176.0.0/13","119.184.0.0/14","119.224.0.0/13","120.0.0.0/14","120.8.0.0/14","120.32.0.0/14","120.40.0.0/14","120.52.0.0/14","120.64.0.0/13","120.80.0.0/13","120.192.0.0/15","120.194.0.0/15","120.204.0.0/14","120.224.0.0/12","121.0.0.0/16","121.8.0.0/13","121.16.0.0/12","121.32.0.0/15","121.36.0.0/14","121.40.0.0/14","121.46.0.0/15","121.58.0.0/16","121.60.0.0/14","121.76.0.0/14","121.88.0.0/15","121.199.0.0/16","122.0.0.0/15","122.4.0.0/14","122.48.0.0/15","122.51.0.0/16","122.64.0.0/13","122.72.0.0/15","122.80.0.0/13","122.96.0.0/12","122.112.0.0/14","122.136.0.0/15","122.156.0.0/14","122.188.0.0/15","122.192.0.0/14","122.224.0.0/14","122.228.0.0/15","123.4.0.0/14","123.8.0.0/13","123.152.0.0/15","123.154.0.0/15","123.168.0.0/14","123.178.0.0/15","123.180.0.0/14","123.196.0.0/15","124.64.0.0/15","124.66.0.0/15","124.68.0.0/15","124.70.0.0/15","124.72.0.0/15","124.74.0.0/15","124.76.0.0/14","124.112.0.0/14","124.128.0.0/13","124.160.0.0/15","124.172.0.0/15","124.200.0.0/14","124.224.0.0/13","125.31.192.0/18","125.32.0.0/16","125.33.0.0/16","125.34.0.0/15","125.36.0.0/14","125.40.0.0/13","125.64.0.0/13","125.72.0.0/16","125.73.0.0/16","125.74.0.0/15","125.76.0.0/15","125.78.0.0/15","125.88.0.0/13","125.104.0.0/15","125.110.0.0/16","125.112.0.0/13","125.208.0.0/12",
        "180.76.0.0/16","180.96.0.0/12","180.128.0.0/12","180.148.0.0/15","180.152.0.0/13","180.168.0.0/14","180.184.0.0/15","180.196.0.0/15",
        "202.96.0.0/12","202.108.0.0/15","202.112.0.0/14","202.120.0.0/15","202.165.128.0/17",
        "210.0.0.0/13","210.51.0.0/16","210.52.0.0/15","210.72.0.0/14","210.76.0.0/15","210.78.0.0/15","210.82.0.0/15",
        "211.90.0.0/15","211.100.0.0/14","211.136.0.0/13","211.144.0.0/12","211.160.0.0/13","211.168.0.0/14",
        "218.0.0.0/13","218.104.0.0/14","218.108.0.0/15","218.192.0.0/13","219.128.0.0/12","219.141.0.0/16","219.142.0.0/15","219.150.0.0/15","220.101.0.0/16","220.112.0.0/13","220.152.0.0/15","220.160.0.0/11","220.200.0.0/13","220.240.0.0/14","220.244.0.0/15","220.248.0.0/15","220.250.0.0/15","221.0.0.0/14","221.122.0.0/15","221.128.0.0/13","221.176.0.0/13","221.194.0.0/15","221.196.0.0/14","221.204.0.0/15","221.206.0.0/15","221.208.0.0/12","221.224.0.0/13","222.0.0.0/14","222.16.0.0/14","222.32.0.0/12","222.48.0.0/16","222.49.0.0/16","222.50.0.0/15","222.52.0.0/14","222.64.0.0/12","222.85.0.0/15","222.88.0.0/13","222.125.0.0/16","222.126.0.0/15","222.128.0.0/13","222.168.0.0/14","222.172.0.0/15","222.176.0.0/12","222.192.0.0/15","222.216.0.0/14","222.220.0.0/15","222.222.0.0/15","222.240.0.0/12","223.0.0.0/14","223.64.0.0/12","223.80.0.0/12","223.96.0.0/12","223.104.0.0/13","223.192.0.0/13","223.240.0.0/13"
      ];
      // 中国香港 IP 段
      const HK_IP_RANGES = [
        "1.0.128.0/17","14.0.128.0/17","14.1.0.0/17","45.64.0.0/16","45.65.0.0/16","45.118.128.0/17","45.119.0.0/17",
        "49.128.0.0/14","58.64.0.0/16","59.148.0.0/16","60.244.0.0/16","61.90.0.0/16","61.91.0.0/16",
        "101.78.0.0/16","103.1.0.0/16","103.2.0.0/16","103.3.0.0/16","103.4.0.0/16","103.11.64.0/18",
        "103.25.208.0/22","103.26.128.0/22","103.28.128.0/22","103.37.144.0/22","103.39.128.0/22","103.52.112.0/22",
        "103.81.128.0/17","113.28.0.0/16","113.29.0.0/16","118.103.0.0/16","119.246.0.0/16",
        "122.129.0.0/16","122.130.0.0/16","122.152.0.0/16","122.200.64.0/18","123.242.0.0/15","124.156.0.0/16",
        "180.150.0.0/16","182.16.0.0/16","183.78.0.0/16","183.90.0.0/16","183.176.0.0/15",
        "202.3.128.0/20","202.17.208.0/20","202.46.32.0/19","202.55.0.0/16","202.68.80.0/20",
        "202.71.128.0/20","202.75.160.0/20","202.78.160.0/20","202.82.0.0/16","202.83.160.0/20",
        "202.92.192.0/18","202.130.0.0/16","202.131.0.0/16","202.133.64.0/18","202.152.0.0/16",
        "202.155.0.0/16","202.160.0.0/16","202.177.0.0/16","202.181.0.0/16","203.78.0.0/16",
        "203.86.0.0/16","203.119.128.0/18","203.131.0.0/16","203.132.0.0/16","203.158.0.0/16",
        "210.176.0.0/12","210.226.0.0/16","210.242.0.0/16","218.102.0.0/16","218.213.0.0/16","219.76.0.0/15","219.78.0.0/16",
        "220.241.0.0/16","222.138.0.0/16","223.16.0.0/16","223.17.0.0/16","223.197.128.0/18"
      ];
      // 中国台湾 IP 段
      const TW_IP_RANGES = [
        "1.12.0.0/14","1.34.0.0/16","1.160.0.0/12","14.0.96.0/16","14.0.97.0/16","14.0.98.0/15",
        "36.224.0.0/13","36.232.0.0/15","36.234.0.0/16","49.159.128.0/17","49.212.0.0/15",
        "52.156.0.0/16","59.120.0.0/13","59.128.0.0/13","60.199.0.0/16","60.248.0.0/15",
        "61.28.0.0/14","61.56.0.0/13","61.216.0.0/14","61.220.0.0/14","61.224.0.0/15","61.230.0.0/16",
        "61.231.0.0/16","61.232.0.0/15","61.236.0.0/15","61.238.0.0/16","61.239.0.0/16",
        "61.240.0.0/15","61.242.0.0/15","61.250.0.0/16","61.251.0.0/16","61.252.0.0/15","61.254.0.0/16",
        "61.255.0.0/16","101.10.0.0/15","101.12.0.0/15","111.248.0.0/13","112.104.0.0/14","114.24.0.0/15",
        "114.26.0.0/16","114.27.0.0/16","114.32.0.0/15","114.34.0.0/16","114.35.0.0/16","114.36.0.0/15",
        "114.38.0.0/16","114.39.0.0/16","114.40.0.0/16","114.41.0.0/16","114.42.0.0/15","114.44.0.0/16",
        "114.45.0.0/16","115.80.0.0/14","115.124.0.0/14","116.30.228.0/22","116.90.0.0/15",
        "117.20.0.0/16","117.56.0.0/15","117.58.0.0/16","118.160.0.0/12","122.116.0.0/16",
        "122.117.0.0/16","122.118.0.0/16","122.119.0.0/16","122.247.0.0/16","123.204.0.0/14",
        "123.208.0.0/14","123.240.0.0/16","124.8.0.0/14","124.12.0.0/15","124.14.0.0/16",
        "125.224.0.0/15","125.226.0.0/15","125.228.0.0/15","125.230.0.0/15","125.234.0.0/15",
        "134.19.0.0/16","134.20.0.0/16","134.21.0.0/16","138.199.0.0/16",
        "139.175.0.0/16","139.176.0.0/15","139.216.0.0/15","139.218.0.0/16","140.90.0.0/16",
        "140.92.0.0/16","140.96.0.0/15","140.110.0.0/16","140.111.0.0/16","140.112.0.0/16",
        "140.113.0.0/16","140.114.0.0/16","140.115.0.0/16","140.116.0.0/16","140.117.0.0/16",
        "140.118.0.0/16","140.119.0.0/16","140.120.0.0/14","140.124.0.0/15","140.126.0.0/15",
        "140.128.0.0/15","140.130.0.0/15","140.132.0.0/15","140.134.0.0/15","140.136.0.0/14",
        "163.13.0.0/16","163.14.0.0/16","163.15.0.0/16","163.16.0.0/16","163.17.0.0/16",
        "163.18.0.0/16","163.19.0.0/16","163.20.0.0/16","163.21.0.0/16","163.22.0.0/16",
        "163.23.0.0/16","163.24.0.0/16","163.25.0.0/16","163.26.0.0/16","163.27.0.0/16",
        "163.28.0.0/16","163.29.0.0/16","163.30.0.0/16","163.31.0.0/16",
        "168.95.0.0/16","175.96.0.0/15","175.111.240.0/22","180.72.0.0/16",
        "180.73.0.0/16","180.176.0.0/15","180.206.128.0/17","182.50.0.0/16",
        "182.51.0.0/16","182.234.0.0/16","183.178.0.0/16","183.179.0.0/16",
        "183.192.0.0/15","183.236.128.0/17","183.250.0.0/16","184.108.0.0/16",
        "192.72.0.0/16","192.83.0.0/16","192.187.0.0/16","192.192.0.0/16","192.193.0.0/16",
        "195.246.0.0/16","202.3.144.0/20","202.15.0.0/16","202.39.0.0/16",
        "202.57.0.0/16","202.60.0.0/16","202.64.0.0/16","202.65.0.0/16",
        "202.66.0.0/16","202.71.0.0/16","202.83.0.0/16","202.104.0.0/15",
        "202.106.0.0/16","202.126.0.0/16","202.135.0.0/16","202.139.0.0/16","202.145.0.0/16",
        "202.148.0.0/15","202.150.0.0/16","202.153.0.0/16","202.154.0.0/15",
        "202.162.0.0/16","202.166.0.0/16","202.172.0.0/16","202.173.0.0/16",
        "202.175.0.0/16","202.178.0.0/15","202.180.0.0/16","202.182.0.0/16",
        "202.183.0.0/16","202.186.0.0/16","202.188.0.0/15","202.190.0.0/15",
        "202.192.0.0/14","202.204.0.0/15","202.206.0.0/15","202.208.0.0/15",
        "202.210.0.0/15","202.212.0.0/15","202.214.0.0/15","202.216.0.0/15",
        "202.218.0.0/16","202.219.0.0/16","202.220.0.0/16","202.221.0.0/16",
        "202.222.0.0/16","202.223.0.0/16","202.232.0.0/15","202.234.0.0/16",
        "202.235.0.0/16","202.236.0.0/15","202.238.0.0/15","202.240.0.0/14",
        "203.66.0.0/16","203.67.0.0/16","203.68.0.0/16","203.69.0.0/16",
        "203.70.0.0/16","203.72.0.0/15","203.74.0.0/16","203.75.0.0/16",
        "203.76.0.0/16","203.79.0.0/16","210.59.0.0/16","210.60.0.0/15",
        "210.62.0.0/16","210.63.0.0/16","210.64.0.0/16","210.65.0.0/16",
        "210.66.0.0/16","210.67.0.0/16","210.68.0.0/14","210.72.0.0/15",
        "210.174.0.0/16","210.175.0.0/16","211.20.0.0/15","211.22.0.0/16",
        "211.23.0.0/16","211.72.0.0/15","211.74.0.0/16","211.75.0.0/16",
        "211.76.0.0/15","211.78.0.0/15","211.80.0.0/16","211.81.0.0/16",
        "218.32.0.0/15","218.34.0.0/15","218.64.0.0/15","218.66.0.0/16",
        "218.160.0.0/13","218.168.0.0/14","218.172.0.0/14","218.176.0.0/13",
        "218.184.0.0/14","218.188.0.0/15","218.190.0.0/16","218.191.0.0/16",
        "218.210.128.0/17","219.85.0.0/16","219.87.0.0/16","219.90.0.0/15",
        "220.128.0.0/13","220.228.0.0/15","220.230.0.0/16","220.231.0.0/16",
        "220.251.0.0/16","221.120.0.0/15","221.122.0.0/16","221.123.0.0/16",
        "221.124.0.0/15","221.126.0.0/15","221.130.0.0/15","221.132.0.0/16",
        "221.133.0.0/16","221.134.0.0/16","221.135.0.0/16","221.136.0.0/15",
        "221.138.0.0/16","221.139.0.0/16","221.140.0.0/15","221.142.0.0/15",
        "221.144.0.0/15","221.146.0.0/15","221.148.0.0/15","221.150.0.0/16",
        "221.151.0.0/16","222.128.0.0/14","222.132.0.0/14","222.136.0.0/13",
        "223.24.0.0/14","223.100.0.0/15","223.102.0.0/16","223.143.0.0/16",
        "223.144.0.0/15","223.146.0.0/16","223.147.0.0/16","223.200.0.0/15"
      ];
      // 中国澳门 IP 段
      const MO_IP_RANGES = [
        "1.32.0.0/16","113.28.96.0/19","113.29.0.0/16","122.103.0.0/16","182.232.0.0/15","202.17.160.0/20",
        "202.53.0.0/16","202.86.48.0/20","202.130.128.0/17","203.174.0.0/16","203.203.0.0/16",
        "210.16.128.0/18","218.63.64.0/18","218.188.64.0/18","219.151.128.0/17","222.168.128.0/17"
      ];
      function guessByLocalIpRange(ipStr) {
        if (!ipStr || !isIPv4Str(ipStr)) return "";
        if (ipInAnyCidr(ipStr, PRIVATE_IP_RANGES)) return "__PRIVATE__";
        if (ipInAnyCidr(ipStr, HK_IP_RANGES)) return "香港";
        if (ipInAnyCidr(ipStr, MO_IP_RANGES)) return "澳门";
        if (ipInAnyCidr(ipStr, TW_IP_RANGES)) return "台湾";
        if (ipInAnyCidr(ipStr, CN_IP_RANGES)) return "中国";
        return "";
      }

      // ============== 维度 A：顶级域（TLD）后缀识别（明确的国家/地区级 TLD 优先级很高）==============
      const TLD_MAP = {
        // ===== 国内/港澳台 TLD（优先级高于一般关键词匹配）=====
        "cn":"中国","com.cn":"中国","net.cn":"中国","org.cn":"中国","gov.cn":"中国","edu.cn":"中国","ac.cn":"中国",
        "bj.cn":"中国","sh.cn":"中国","tj.cn":"中国","cq.cn":"中国","he.cn":"中国","sx.cn":"中国","nm.cn":"中国","ln.cn":"中国",
        "jl.cn":"中国","hl.cn":"中国","js.cn":"中国","zj.cn":"中国","ah.cn":"中国","fj.cn":"中国","jx.cn":"中国","sd.cn":"中国",
        "ha.cn":"中国","hb.cn":"中国","hn.cn":"中国","gd.cn":"中国","gx.cn":"中国","hi.cn":"中国","sc.cn":"中国","gz.cn":"中国",
        "yn.cn":"中国","xz.cn":"中国","sn.cn":"中国","gs.cn":"中国","qh.cn":"中国","nx.cn":"中国","xj.cn":"中国","tw.cn":"中国",
        "hk.cn":"中国","mo.cn":"中国",
        "hk":"香港","com.hk":"香港","net.hk":"香港","org.hk":"香港","gov.hk":"香港","edu.hk":"香港","idv.hk":"香港",
        "tw":"台湾","com.tw":"台湾","net.tw":"台湾","org.tw":"台湾","gov.tw":"台湾","edu.tw":"台湾","idv.tw":"台湾",
        "mo":"澳门","com.mo":"澳门","net.mo":"澳门","org.mo":"澳门","gov.mo":"澳门","edu.mo":"澳门",
        // ===== 海外常用国家 TLD =====
        "jp":"日本","co.jp":"日本","ne.jp":"日本","or.jp":"日本","ac.jp":"日本","go.jp":"日本","ed.jp":"日本","ad.jp":"日本","gr.jp":"日本",
        "sg":"新加坡","com.sg":"新加坡","net.sg":"新加坡","org.sg":"新加坡","gov.sg":"新加坡","edu.sg":"新加坡","per.sg":"新加坡",
        "kr":"韩国","co.kr":"韩国","ne.kr":"韩国","or.kr":"韩国","go.kr":"韩国","pe.kr":"韩国","re.kr":"韩国","ac.kr":"韩国","hs.kr":"韩国","ms.kr":"韩国","es.kr":"韩国","sc.kr":"韩国","kg.kr":"韩国","seoul.kr":"韩国","busan.kr":"韩国","daegu.kr":"韩国","incheon.kr":"韩国","gwangju.kr":"韩国","daejeon.kr":"韩国","ulsan.kr":"韩国","gyeonggi.kr":"韩国","gangwon.kr":"韩国","chungbuk.kr":"韩国","chungnam.kr":"韩国","jeonbuk.kr":"韩国","jeonnam.kr":"韩国","gyeongbuk.kr":"韩国","gyeongnam.kr":"韩国","jeju.kr":"韩国",
        "us":"美国","uk":"英国","co.uk":"英国","org.uk":"英国","net.uk":"英国","ac.uk":"英国","gov.uk":"英国","nhs.uk":"英国","police.uk":"英国","mod.uk":"英国","parliament.uk":"英国","london.uk":"英国","scotland.uk":"英国","wales.uk":"英国","ie":"爱尔兰",
        "de":"德国","at":"奥地利","ch":"瑞士","li":"列支敦士登","fr":"法国","nl":"荷兰","be":"比利时","lu":"卢森堡","mc":"摩纳哥",
        "es":"西班牙","pt":"葡萄牙","it":"意大利","va":"梵蒂冈","sm":"圣马力诺","ad":"安道尔","mt":"马耳他","cy":"塞浦路斯","gr":"希腊",
        "pl":"波兰","cz":"捷克共和国","sk":"斯洛伐克","hu":"匈牙利","ro":"罗马尼亚","bg":"保加利亚","hr":"克罗地亚","si":"斯洛文尼亚","rs":"塞尔维亚","me":"黑山","mk":"北马其顿","al":"阿尔巴尼亚","ba":"波黑","xk":"科索沃",
        "ee":"爱沙尼亚","lv":"拉脱维亚","lt":"立陶宛","fi":"芬兰","se":"瑞典","no":"挪威","dk":"丹麦","is":"冰岛","fo":"法罗群岛","gl":"格陵兰","ax":"奥兰群岛",
        "ru":"俄罗斯","su":"俄罗斯","by":"白俄罗斯","ua":"乌克兰","md":"摩尔多瓦","ge":"格鲁吉亚","am":"亚美尼亚","az":"阿塞拜疆",
        "kz":"哈萨克斯坦","uz":"乌兹别克斯坦","kg":"吉尔吉斯斯坦","tj":"塔吉克斯坦","tm":"土库曼斯坦","mn":"蒙古",
        "ca":"加拿大","mx":"墨西哥","cu":"古巴","pa":"巴拿马","cr":"哥斯达黎加","ni":"尼加拉瓜","hn":"洪都拉斯","sv":"萨尔瓦多","gt":"危地马拉","bz":"伯利兹","jm":"牙买加","tt":"特立尼达和多巴哥","pr":"波多黎各","do":"多米尼加","ht":"海地","bs":"巴哈马","bb":"巴巴多斯","lc":"圣卢西亚","gd":"格林纳达","ag":"安提瓜和巴布达","kn":"圣基茨和尼维斯","vc":"圣文森特和格林纳丁斯","dm":"多米尼克",
        "ar":"阿根廷","cl":"智利","br":"巴西","co":"哥伦比亚","pe":"秘鲁","ve":"委内瑞拉","ec":"厄瓜多尔","bo":"玻利维亚","py":"巴拉圭","uy":"乌拉圭","gy":"圭亚那","sr":"苏里南","gf":"法属圭亚那",
        "au":"澳大利亚","com.au":"澳大利亚","net.au":"澳大利亚","org.au":"澳大利亚","edu.au":"澳大利亚","gov.au":"澳大利亚","asn.au":"澳大利亚","id.au":"澳大利亚","csiro.au":"澳大利亚","act.au":"澳大利亚","nsw.au":"澳大利亚","nt.au":"澳大利亚","qld.au":"澳大利亚","sa.au":"澳大利亚","tas.au":"澳大利亚","vic.au":"澳大利亚","wa.au":"澳大利亚",
        "nz":"新西兰","co.nz":"新西兰","net.nz":"新西兰","org.nz":"新西兰","govt.nz":"新西兰","ac.nz":"新西兰","school.nz":"新西兰","geek.nz":"新西兰","gen.nz":"新西兰","maori.nz":"新西兰","iwi.nz":"新西兰",
        "fj":"斐济","pg":"巴布亚新几内亚","sb":"所罗门群岛","vu":"瓦努阿图","nc":"新喀里多尼亚","pf":"法属波利尼西亚","ws":"萨摩亚","to":"汤加","tv":"图瓦卢","ki":"基里巴斯","nr":"瑙鲁","fm":"密克罗尼西亚","mh":"马绍尔群岛","pw":"帕劳","gu":"关岛","as":"美属萨摩亚","vi":"美属维尔京群岛","nu":"纽埃","ck":"库克群岛","tk":"托克劳","wf":"瓦利斯和富图纳","pn":"皮特凯恩群岛",
        "in":"印度","co.in":"印度","net.in":"印度","org.in":"印度","gov.in":"印度","ac.in":"印度","edu.in":"印度","res.in":"印度","gen.in":"印度","firm.in":"印度","ind.in":"印度",
        "pk":"巴基斯坦","com.pk":"巴基斯坦","net.pk":"巴基斯坦","org.pk":"巴基斯坦","edu.pk":"巴基斯坦","gov.pk":"巴基斯坦",
        "bd":"孟加拉国","lk":"斯里兰卡","np":"尼泊尔","bt":"不丹","mv":"马尔代夫","af":"阿富汗","ir":"伊朗","iq":"伊拉克","sy":"叙利亚","jo":"约旦","lb":"黎巴嫩","il":"以色列","ps":"巴勒斯坦","sa":"沙特阿拉伯","ae":"阿联酋","qa":"卡塔尔","kw":"科威特","om":"阿曼","ye":"也门","bh":"巴林",
        "my":"马来西亚","com.my":"马来西亚","net.my":"马来西亚","org.my":"马来西亚","gov.my":"马来西亚","edu.my":"马来西亚",
        "th":"泰国","co.th":"泰国","in.th":"泰国","go.th":"泰国","net.th":"泰国","or.th":"泰国","ac.th":"泰国",
        "vn":"越南","ph":"菲律宾","id":"印度尼西亚","co.id":"印度尼西亚","or.id":"印度尼西亚","go.id":"印度尼西亚","ac.id":"印度尼西亚","web.id":"印度尼西亚","sch.id":"印度尼西亚","desa.id":"印度尼西亚",
        "mm":"缅甸","kh":"柬埔寨","la":"老挝","bn":"文莱","tl":"东帝汶",
        "tr":"土耳其","eg":"埃及","za":"南非","ng":"尼日利亚","ke":"肯尼亚","tz":"坦桑尼亚","gh":"加纳","sn":"塞内加尔","dz":"阿尔及利亚","ma":"摩洛哥","tn":"突尼斯","ly":"利比亚","sd":"苏丹","ss":"南苏丹","et":"埃塞俄比亚","so":"索马里","ug":"乌干达","cm":"喀麦隆","ci":"科特迪瓦","mg":"马达加斯加","mu":"毛里求斯","sc":"塞舌尔","re":"留尼汪","yt":"马约特","mr":"毛里塔尼亚","ml":"马里","bf":"布基纳法索","ne":"尼日尔","td":"乍得","cf":"中非","gq":"赤道几内亚","ga":"加蓬","cg":"刚果共和国","cd":"刚果民主共和国","st":"圣多美和普林西比","gin":"几内亚","sl":"塞拉利昂","lr":"利比里亚","tg":"多哥","bj":"贝宁","er":"厄立特里亚","dj":"吉布提","km":"科摩罗","cv":"佛得角","eh":"西撒哈拉",
        // ===== 通用 TLD =====
        "com":"","net":"","org":"","info":"","biz":"","name":"","pro":"","tel":"","xxx":"","aero":"","coop":"","museum":"",
        "io":"","co":"","cc":"","tv":"图瓦卢","top":"","xyz":"","club":"","vip":"","app":"","dev":"","online":"","site":"","shop":"","store":"","tech":"","cloud":"","space":"","me":"","us":"美国","ai":"","io":"","ac":"","eu":"","int":"","gov":"","edu":"","mil":"","arpa":"","root":""
      };
      function guessByTLD(domainName) {
        if (!domainName) return "";
        var s = domainName.toLowerCase();
        var parts = s.split(".");
        // 先尝试 3 级 TLD，再 2 级，再 1 级
        for (var depth = 3; depth >= 1; depth--) {
          if (parts.length >= depth) {
            var suffix = parts.slice(-depth).join(".");
            if (TLD_MAP[suffix]) return TLD_MAP[suffix];
          }
        }
        return "";
      }

      // ============== 维度 B：附加文本上下文（sni/host/锚点名/URL全部参数）的关键词识别 ==============
      function quickCountryByText(txt) {
        if (!txt) return "";
        var t = txt.toString();
        try {
          // 正则直接写，避免封装 helper 的兼容问题
          if (/\p{Regional_Indicator}{2}/u.test(t)) {
            // 提取 emoji 国旗 → 转成 ISO 国家码再查 COUNTRY_CN
            var match = t.match(/\p{Regional_Indicator}{2}/u);
            if (match && match[0]) {
              var code = match[0].split('').map(function (ch) { return String.fromCharCode(0x41 + (ch.codePointAt(0) - 0x1F1E6)); }).join('');
              if (code && COUNTRY_CN[code]) return COUNTRY_CN[code];
            }
          }
        } catch (_) {}
        // 关键词匹配策略：
        // 1) 先匹配最明确的多词组合（国家全名、英文城市名）
        // 2) 再匹配缩写 / 2字以上中文简称
        // 3) 最后才匹配单字（且单字加边界判断，避免误匹配）
        // 注意：旧的 /港|新|韩|美|日|德|法|英|西|荷|瑞|加|印|意|土|泰|越|马|菲|以|巴|墨|埃|波|比|奥|芬|丹|挪|希|葡/ 等单字匹配极易误判
        // 单字只用于匹配 "广港"、"广新"、"沪日"、"广美" 这种明确的双字组合前缀
        var KW_STRONG = [
          [/中国|内地|大陆|🇨🇳|北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|Beijing|Shanghai|Guangzhou|Shenzhen|Hangzhou|Nanjing|Chengdu|Wuhan|Xian|Chongqing/i,"中国"],
          [/香港|🇭🇰|广港|Hong\s*Kong|HongKong/i,"香港"],
          [/澳门|🇲🇴|Macau|Macao/i,"澳门"],
          [/台湾|台灣|🇹🇼|广台|Taiwan|台北|Taipei|高雄|台中/i,"台湾"],
          [/日本|🇯🇵|广日|川日|泉日|沪日|深日|Japan|Tokyo|Osaka|Kyoto|Yokohama|Nagoya|Sapporo|Fukuoka|东京|大阪|京都|横滨|名古屋|札幌|福冈|埼玉|神户|广岛|仙台/i,"日本"],
          [/新加坡|🇸🇬|广新|狮城|Singapore/i,"新加坡"],
          [/韩国|韓國|🇰🇷|广韩|Korea|Seoul|Busan|Incheon|首尔|釜山|仁川|大邱|光州|大田|蔚山|春川/i,"韩国"],
          [/美国|🇺🇸|广美|USA|America|United\s*States|New\s*York|Los\s*Angeles|San\s*Francisco|Seattle|Chicago|Dallas|Miami|Boston|Washington|San\s*Jose|Las\s*Vegas|Portland|NYC|LA|硅谷|洛杉矶|纽约|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|圣何塞|圣克拉拉|西雅图|芝加哥|阿什本|圣迭戈|旧金山|迈阿密|波士顿|华盛顿|亚特兰大|休斯顿|费城|丹佛|底特律|火奴鲁鲁|檀香山/i,"美国"],
          [/英国|🇬🇧|UK|United\s*Kingdom|Great\s*Britain|England|Scotland|Wales|London|Manchester|Edinburgh|Birmingham|Glasgow|利物浦|利兹|布里斯托尔|谢菲尔德|纽卡斯尔|贝尔法斯特|伦敦|曼彻斯特|爱丁堡|伯明翰/i,"英国"],
          [/德国|🇩🇪|DE|Germany|Berlin|Munich|Hamburg|Frankfurt|Cologne|Stuttgart|Leipzig|Dresden|柏林|慕尼黑|汉堡|法兰克福|科隆|斯图加特|莱比锡|德累斯顿|波恩|杜塞尔多夫/i,"德国"],
          [/法国|🇫🇷|FR|France|Paris|Marseille|Lyon|Toulouse|Nice|Bordeaux|巴黎|马赛|里昂|图卢兹|尼斯|波尔多|里尔/i,"法国"],
          [/俄罗斯|🇷🇺|俄|毛子|RU|Russia|Moscow|Saint\s*Petersburg|Novosibirsk|Yekaterinburg|Kazan|Sochi|Vladivostok|莫斯科|圣彼得堡|新西伯利亚|叶卡捷琳堡|喀山|索契|符拉迪沃斯托克|海参崴/i,"俄罗斯"],
          [/澳大利亚|🇦🇺|澳洲|AU|Australia|Sydney|Melbourne|Brisbane|Perth|Adelaide|Gold\s*Coast|Canberra|悉尼|墨尔本|布里斯班|珀斯|阿德莱德|黄金海岸|堪培拉|纽卡斯尔/i,"澳大利亚"],
          [/加拿大|🇨🇦|CA|Canada|Toronto|Vancouver|Montreal|Calgary|Edmonton|Ottawa|多伦多|温哥华|蒙特利尔|卡尔加里|埃德蒙顿|渥太华|魁北克/i,"加拿大"],
          [/印度|🇮🇳|IN|India|Mumbai|Delhi|Bangalore|Hyderabad|Chennai|Kolkata|Pune|孟买|新德里|班加罗尔|海得拉巴|金奈|加尔各答|浦那|艾哈迈达巴德/i,"印度"],
          [/意大利|🇮🇹|IT|Italy|Rome|Milan|Naples|Turin|Florence|Venice|Palermo|罗马|米兰|那不勒斯|都灵|佛罗伦萨|威尼斯|巴勒莫/i,"意大利"],
          [/西班牙|🇪🇸|ES|Spain|Madrid|Barcelona|Valencia|Seville|Bilbao|Malaga|马德里|巴塞罗那|瓦伦西亚|塞维利亚|毕尔巴鄂|马拉加/i,"西班牙"],
          [/荷兰|🇳🇱|NL|Netherlands|Amsterdam|Rotterdam|The\s*Hague|Utrecht|Eindhoven|阿姆斯特丹|鹿特丹|海牙|乌得勒支|埃因霍温/i,"荷兰"],
          [/瑞士|🇨🇭|瑞|CH|Switzerland|Zurich|Geneva|Basel|Lausanne|苏黎世|日内瓦|巴塞尔|洛桑/i,"瑞士"],
          [/阿联酋|🇦🇪|阿联|AE|United\s*Arab\s*Emirates|Dubai|Abu\s*Dhabi|Sharjah|迪拜|阿布扎比|沙迦/i,"阿联酋"],
          [/沙特阿拉伯|🇸🇦|沙特|SA|Saudi\s*Arabia|Riyadh|Jeddah|Mecca|Medina|利雅得|吉达|麦加|麦地那/i,"沙特阿拉伯"],
          [/土耳其|🇹🇷|TR|Turkey|Istanbul|Ankara|Izmir|Bursa|伊斯坦布尔|安卡拉|伊兹密尔|布尔萨|安塔利亚/i,"土耳其"],
          [/泰国|🇹🇭|TH|Thailand|Bangkok|Chiang\s*Mai|Phuket|Pattaya|Hat\s*Yai|曼谷|清迈|普吉岛|芭堤雅|合艾|清莱|甲米/i,"泰国"],
          [/越南|🇻🇳|VN|Vietnam|Hanoi|Ho\s*Chi\s*Minh|Da\s*Nang|Hai\s*Phong|河内|胡志明市|岘港|海防|芹苴|芽庄/i,"越南"],
          [/马来西亚|🇲🇾|马国|MY|Malaysia|Kuala\s*Lumpur|Johor\s*Bahru|Ipoh|Penang|Malacca|George\s*Town|吉隆坡|新山|怡保|槟城|马六甲|乔治市|古晋/i,"马来西亚"],
          [/印度尼西亚|🇮🇩|印尼|ID|Indonesia|Jakarta|Surabaya|Bandung|Medan|Bali|Denpasar|雅加达|泗水|万隆|棉兰|巴厘岛|登巴萨/i,"印度尼西亚"],
          [/菲律宾|🇵🇭|PH|Philippines|Manila|Cebu|Davao|马尼拉|宿务|达沃|奎松市/i,"菲律宾"],
          [/以色列|🇮🇱|IL|Israel|Tel\s*Aviv|Jerusalem|Haifa|特拉维夫|耶路撒冷|海法/i,"以色列"],
          [/巴西|🇧🇷|BR|Brazil|Sao\s*Paulo|Rio\s*de\s*Janeiro|Brasilia|Salvador|圣保罗|里约热内卢|巴西利亚|萨尔瓦多|福塔莱萨/i,"巴西"],
          [/阿根廷|🇦🇷|AR|Argentina|Buenos\s*Aires|Cordoba|Rosario|布宜诺斯艾利斯|科尔多瓦|罗萨里奥|门多萨/i,"阿根廷"],
          [/墨西哥|🇲🇽|MX|Mexico|Mexico\s*City|Guadalajara|Monterrey|Cancun|Puebla|墨西哥城|瓜达拉哈拉|蒙特雷|坎昆|普埃布拉|蒂华纳/i,"墨西哥"],
          [/南非|🇿🇦|ZA|South\s*Africa|Cape\s*Town|Johannesburg|Durban|Pretoria|开普敦|约翰内斯堡|德班|比勒陀利亚|伊丽莎白港/i,"南非"],
          [/埃及|🇪🇬|EG|Egypt|Cairo|Alexandria|Luxor|Aswan|开罗|亚历山大|卢克索|阿斯旺/i,"埃及"],
          [/挪威|🇳🇴|NO|Norway|Oslo|Bergen|Stavanger|奥斯陆|卑尔根|斯塔万格|特隆赫姆/i,"挪威"],
          [/瑞典|🇸🇪|SE|Sweden|Stockholm|Gothenburg|Uppsala|斯德哥尔摩|哥德堡|乌普萨拉/i,"瑞典"],
          [/丹麦|🇩🇰|DK|Denmark|Copenhagen|Aarhus|哥本哈根|奥胡斯|欧登塞/i,"丹麦"],
          [/芬兰|🇫🇮|FI|Finland|Helsinki|Tampere|赫尔辛基|坦佩雷|埃斯波/i,"芬兰"],
          [/波兰|🇵🇱|PL|Poland|Warsaw|Krakow|Wroclaw|华沙|克拉科夫|弗罗茨瓦夫|格但斯克/i,"波兰"],
          [/比利时|🇧🇪|BE|Belgium|Brussels|Antwerp|Ghent|布鲁塞尔|安特卫普|根特|布鲁日/i,"比利时"],
          [/奥地利|🇦🇹|AT|Austria|Vienna|Salzburg|Graz|维也纳|萨尔茨堡|格拉茨|因斯布鲁克/i,"奥地利"],
          [/爱尔兰|🇮🇪|IE|Ireland|Dublin|Cork|都柏林|科克|戈尔韦/i,"爱尔兰"],
          [/葡萄牙|🇵🇹|PT|Portugal|Lisbon|Porto|里斯本|波尔图|科英布拉/i,"葡萄牙"],
          [/希腊|🇬🇷|GR|Greece|Athens|Thessaloniki|雅典|塞萨洛尼基|圣托里尼/i,"希腊"],
          [/新西兰|🇳🇿|纽西兰|NZ|New\s*Zealand|Auckland|Wellington|Christchurch|奥克兰|惠灵顿|基督城|哈密尔顿|达尼丁/i,"新西兰"],
          [/巴基斯坦|🇵🇰|巴铁|PK|Pakistan|Karachi|Lahore|Islamabad|卡拉奇|拉合尔|伊斯兰堡|拉瓦尔品第/i,"巴基斯坦"],
          [/孟加拉国|🇧🇩|BD|Bangladesh|Dhaka|Chittagong|达卡|吉大港/i,"孟加拉国"],
          [/尼日利亚|🇳🇬|NG|Nigeria|Lagos|Abuja|Kano|拉各斯|阿布贾|卡诺|伊巴丹/i,"尼日利亚"],
          [/乌克兰|🇺🇦|UA|Ukraine|Kyiv|Kiev|Kharkiv|Odessa|Dnipro|基辅|哈尔科夫|敖德萨|第聂伯罗/i,"乌克兰"],
          [/白俄罗斯|🇧🇾|BY|Belarus|Minsk|Gomel|明斯克|戈梅利/i,"白俄罗斯"],
          [/捷克|🇨🇿|CZ|Czechia|Czech\s*Republic|Prague|Brno|布拉格|布尔诺|俄斯特拉发/i,"捷克共和国"],
          [/斯洛伐克|🇸🇰|SK|Slovakia|Bratislava|Košice|布拉迪斯拉发|科希策/i,"斯洛伐克"],
          [/匈牙利|🇭🇺|HU|Hungary|Budapest|Debrecen|布达佩斯|德布勒森|塞格德/i,"匈牙利"],
          [/罗马尼亚|🇷🇴|RO|Romania|Bucharest|Cluj|布加勒斯特|克卢日|雅西/i,"罗马尼亚"],
          [/保加利亚|🇧🇬|BG|Bulgaria|Sofia|Plovdiv|索非亚|普罗夫迪夫|瓦尔纳/i,"保加利亚"],
          [/克罗地亚|🇭🇷|HR|Croatia|Zagreb|Split|萨格勒布|斯普利特|里耶卡/i,"克罗地亚"],
          [/塞尔维亚|🇷🇸|RS|Serbia|Belgrade|Novi\s*Sad|贝尔格莱德|诺维萨德|尼什/i,"塞尔维亚"],
          [/斯洛文尼亚|🇸🇮|SI|Slovenia|Ljubljana|Maribor|卢布尔雅那|马里博尔/i,"斯洛文尼亚"],
          [/爱沙尼亚|🇪🇪|EE|Estonia|Tallinn|Tartu|塔林|塔尔图/i,"爱沙尼亚"],
          [/拉脱维亚|🇱🇻|LV|Latvia|Riga|Daugavpils|里加|道加瓦皮尔斯/i,"拉脱维亚"],
          [/立陶宛|🇱🇹|LT|Lithuania|Vilnius|Kaunas|维尔纽斯|考纳斯|克莱佩达/i,"立陶宛"],
          [/冰岛|🇮🇸|IS|Iceland|Reykjavik|Akureyri|雷克雅未克|阿库雷里/i,"冰岛"],
          [/卢森堡|🇱🇺|LU|Luxembourg|卢森堡市/i,"卢森堡"],
          [/摩纳哥|🇲🇨|MC|Monaco|蒙特卡洛/i,"摩纳哥"],
          [/列支敦士登|🇱🇮|LI|Liechtenstein|Vaduz|瓦杜兹/i,"列支敦士登"],
          [/马耳他|🇲🇹|MT|Malta|Valletta|瓦莱塔|姆迪纳/i,"马耳他"],
          [/塞浦路斯|🇨🇾|CY|Cyprus|Nicosia|Limassol|尼科西亚|利马索尔|拉纳卡/i,"塞浦路斯"],
          [/摩洛哥|🇲🇦|MA|Morocco|Casablanca|Rabat|Marrakech|Tangier|卡萨布兰卡|拉巴特|马拉喀什|丹吉尔/i,"摩洛哥"],
          [/阿尔及利亚|🇩🇿|DZ|Algeria|Algiers|奥兰|阿尔及尔/i,"阿尔及利亚"],
          [/突尼斯|🇹🇳|TN|Tunisia|Tunis|Sfax|突尼斯市|斯法克斯/i,"突尼斯"],
          [/肯尼亚|🇰🇪|KE|Kenya|Nairobi|Mombasa|内罗毕|蒙巴萨|基苏木/i,"肯尼亚"],
          [/坦桑尼亚|🇹🇿|TZ|Tanzania|Dar\s*es\s*Salaam|Dodoma|达累斯萨拉姆|多多马|阿鲁沙/i,"坦桑尼亚"],
          [/加纳|🇬🇭|GH|Ghana|Accra|Kumasi|阿克拉|库马西|塔马利/i,"加纳"],
          [/智利|🇨🇱|CL|Chile|Santiago|Valparaiso|圣地亚哥|瓦尔帕莱索|康塞普西翁/i,"智利"],
          [/哥伦比亚|🇨🇴|CO|Colombia|Bogota|Medellin|Cali|Barranquilla|波哥大|麦德林|卡利|巴兰基亚/i,"哥伦比亚"],
          [/秘鲁|🇵🇪|PE|Peru|Lima|Cusco|Arequipa|利马|库斯科|阿雷基帕|特鲁希略/i,"秘鲁"],
          [/委内瑞拉|🇻🇪|VE|Venezuela|Caracas|Maracaibo|加拉加斯|马拉开波|瓦伦西亚/i,"委内瑞拉"],
          [/厄瓜多尔|🇪🇨|EC|Ecuador|Quito|Guayaquil|Cuenca|基多|瓜亚基尔|昆卡/i,"厄瓜多尔"],
          [/乌拉圭|🇺🇾|UY|Uruguay|Montevideo|蒙得维的亚|萨尔托/i,"乌拉圭"],
          [/巴拉圭|🇵🇾|PY|Paraguay|Asuncion|亚松森|东方市/i,"巴拉圭"],
          [/玻利维亚|🇧🇴|BO|Bolivia|La\s*Paz|Sucre|Santa\s*Cruz|拉巴斯|苏克雷|圣克鲁斯/i,"玻利维亚"],
          [/巴拿马|🇵🇦|PA|Panama|Panama\s*City|科隆|巴拿马城/i,"巴拿马"],
          [/哥斯达黎加|🇨🇷|CR|Costa\s*Rica|San\s*Jose|圣何塞|阿拉胡埃拉/i,"哥斯达黎加"],
          [/古巴|🇨🇺|CU|Cuba|Havana|圣地亚哥|哈瓦那/i,"古巴"],
          [/多米尼加|🇩🇴|DO|Dominican\s*Republic|Santo\s*Domingo|圣多明各|圣地亚哥/i,"多米尼加"],
          [/牙买加|🇯🇲|JM|Jamaica|Kingston|Montego\s*Bay|金斯顿|蒙特哥贝/i,"牙买加"],
          [/柬埔寨|🇰🇭|KH|Cambodia|Phnom\s*Penh|Siem\s*Reap|金边|暹粒|西哈努克/i,"柬埔寨"],
          [/老挝|🇱🇦|LA|Laos|Vientiane|Luang\s*Prabang|万象|琅勃拉邦/i,"老挝"],
          [/缅甸|🇲🇲|MM|Myanmar|Burma|Yangon|Naypyidaw|Mandalay|仰光|内比都|曼德勒/i,"缅甸"],
          [/尼泊尔|🇳🇵|NP|Nepal|Kathmandu|Pokhara|加德满都|博卡拉|帕坦/i,"尼泊尔"],
          [/斯里兰卡|🇱🇰|LK|Sri\s*Lanka|Colombo|Kandy|科伦坡|康提|加勒/i,"斯里兰卡"],
          [/文莱|🇧🇳|BN|Brunei|Bandar\s*Seri\s*Begawan|斯里巴加湾市/i,"文莱"],
          [/蒙古|🇲🇳|MN|Mongolia|Ulaanbaatar|乌兰巴托/i,"蒙古"],
          [/哈萨克斯坦|🇰🇿|KZ|Kazakhstan|Astana|Almaty|阿斯塔纳|阿拉木图|卡拉干达/i,"哈萨克斯坦"],
          [/乌兹别克斯坦|🇺🇿|UZ|Uzbekistan|Tashkent|Samarkand|塔什干|撒马尔罕|布哈拉/i,"乌兹别克斯坦"],
          [/吉尔吉斯斯坦|🇰🇬|KG|Kyrgyzstan|Bishkek|比什凯克|奥什/i,"吉尔吉斯斯坦"],
          [/塔吉克斯坦|🇹🇯|TJ|Tajikistan|Dushanbe|杜尚别|苦盏/i,"塔吉克斯坦"],
          [/土库曼斯坦|🇹🇲|TM|Turkmenistan|Ashgabat|阿什哈巴德|土库曼纳巴德/i,"土库曼斯坦"],
          [/阿塞拜疆|🇦🇿|AZ|Azerbaijan|Baku|Ganja|巴库|占贾|苏姆盖特/i,"阿塞拜疆"],
          [/格鲁吉亚|🇬🇪|GE|Georgia|Tbilisi|Kutaisi|第比利斯|库塔伊西|巴统/i,"格鲁吉亚"],
          [/亚美尼亚|🇦🇲|AM|Armenia|Yerevan|Gyumri|埃里温|久姆里|瓦纳佐尔/i,"亚美尼亚"],
          [/伊朗|🇮🇷|IR|Iran|Tehran|Isfahan|Shiraz|Mashhad|德黑兰|伊斯法罕|设拉子|马什哈德|大不里士/i,"伊朗"],
          [/伊拉克|🇮🇶|IQ|Iraq|Baghdad|Basra|Mosul|Erbil|巴格达|巴士拉|摩苏尔|埃尔比勒/i,"伊拉克"],
          [/卡塔尔|🇶🇦|QA|Qatar|Doha|多哈|赖扬/i,"卡塔尔"],
          [/科威特|🇰🇼|KW|Kuwait|Kuwait\s*City|科威特城|杰赫拉/i,"科威特"],
          [/阿曼|🇴🇲|OM|Oman|Muscat|马斯喀特|塞拉莱/i,"阿曼"],
          [/约旦|🇯🇴|JO|Jordan|Amman|Aqaba|Zarqa|安曼|亚喀巴|扎尔卡/i,"约旦"],
          [/黎巴嫩|🇱🇧|LB|Lebanon|Beirut|Tripoli|Sidon|贝鲁特|的黎波里|赛达/i,"黎巴嫩"],
          [/叙利亚|🇸🇾|SY|Syria|Damascus|Aleppo|Homs|大马士革|阿勒颇|霍姆斯/i,"叙利亚"],
          [/也门|🇾🇪|YE|Yemen|Sanaa|Aden|萨那|亚丁|荷台达/i,"也门"],
          [/阿富汗|🇦🇫|AF|Afghanistan|Kabul|Herat|喀布尔|赫拉特|坎大哈/i,"阿富汗"],
          [/斐济|🇫🇯|FJ|Fiji|Suva|Nadi|Lautoka|苏瓦|楠迪|劳托卡/i,"斐济"],
          [/利比亚|🇱🇾|LY|Libya|Tripoli|Benghazi|的黎波里|班加西|米苏拉塔/i,"利比亚"],
          [/苏丹|🇸🇩|SD|Sudan|Khartoum|喀土穆|恩图曼/i,"苏丹"],
          [/埃塞俄比亚|🇪🇹|ET|Ethiopia|Addis\s*Ababa|亚的斯亚贝巴|德雷达瓦/i,"埃塞俄比亚"],
          [/索马里|🇸🇴|SO|Somalia|Mogadishu|摩加迪沙|哈尔格萨/i,"索马里"],
          [/乌干达|🇺🇬|UG|Uganda|Kampala|坎帕拉|金贾/i,"乌干达"],
          [/莫桑比克|🇲🇿|MZ|Mozambique|Maputo|马普托|贝拉|纳卡拉/i,"莫桑比克"],
          [/津巴布韦|🇿🇼|ZW|Zimbabwe|Harare|Bulawayo|哈拉雷|布拉瓦约|穆塔雷/i,"津巴布韦"],
          [/赞比亚|🇿🇲|ZM|Zambia|Lusaka|卢萨卡|基特韦|恩多拉/i,"赞比亚"],
          [/安哥拉|🇦🇴|AO|Angola|Luanda|罗安达|本格拉|万博/i,"安哥拉"],
          [/喀麦隆|🇨🇲|CM|Cameroon|Douala|Yaounde|杜阿拉|雅温得|巴门达/i,"喀麦隆"],
          [/科特迪瓦|🇨🇮|象牙海岸|CI|Cote\s*dIvoire|Ivory\s*Coast|Abidjan|Yamoussoukro|阿比让|亚穆苏克罗|布瓦凯/i,"科特迪瓦"],
          [/塞内加尔|🇸🇳|SN|Senegal|Dakar|Thies|达喀尔|捷斯|圣路易/i,"塞内加尔"],
          [/关岛|🇬🇺|GU|Guam|Hagatna|阿加尼亚|塔穆宁/i,"关岛"],
          [/波多黎各|🇵🇷|PR|Puerto\s*Rico|San\s*Juan|圣胡安|卡瓜斯/i,"波多黎各"],
          [/格陵兰|🇬🇱|GL|Greenland|Nuuk|努克|西西缪特/i,"格陵兰"],
          [/留尼汪|🇷🇪|RE|Reunion|留尼汪岛|圣但尼/i,"留尼汪"]
        ];
        for (var si = 0; si < KW_STRONG.length; si++) {
          try { if (KW_STRONG[si][0].test(t)) return KW_STRONG[si][1]; } catch (_) {}
        }
        // 弱匹配：2字母 ISO 码 + 常见前缀组合（港/新/韩/美/日/英/德/法 的广X沪X写法）
        // 注意：这里故意不写单字 /港|新|韩|美|日|德|法|英/ 防止误匹配
        var KW_WEAK = [
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:HK|hk)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"香港"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:MO|mo)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"澳门"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:TW|tw)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"台湾"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:CN|cn)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"中国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:JP|jp)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"日本"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:SG|sg)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"新加坡"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:KR|kr)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"韩国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:US|us|USA|usa)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"美国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:UK|uk)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"英国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:DE|de)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"德国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:FR|fr)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"法国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:RU|ru)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"俄罗斯"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:AU|au)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"澳大利亚"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:CA|ca)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"加拿大"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:IN|in)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"印度"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:IT|it)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"意大利"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:ES|es)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"西班牙"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:NL|nl)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"荷兰"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:CH|ch)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"瑞士"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:AE|ae)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"阿联酋"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:SA|sa)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"沙特阿拉伯"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:TR|tr)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"土耳其"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:TH|th)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"泰国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:VN|vn)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"越南"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:MY|my)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"马来西亚"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:ID|id)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"印度尼西亚"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:PH|ph)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"菲律宾"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:IL|il)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"以色列"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:BR|br)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"巴西"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:MX|mx)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"墨西哥"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:ZA|za)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"南非"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:EG|eg)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"埃及"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:NO|no)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"挪威"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:SE|se)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"瑞典"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:DK|dk)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"丹麦"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:FI|fi)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"芬兰"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:PL|pl)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"波兰"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:BE|be)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"比利时"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:AT|at)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"奥地利"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:IE|ie)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"爱尔兰"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:PT|pt)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"葡萄牙"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:GR|gr)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"希腊"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:NZ|nz)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"新西兰"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:PK|pk)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"巴基斯坦"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:BD|bd)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"孟加拉国"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:NG|ng)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"尼日利亚"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:UA|ua)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"乌克兰"],
          [/(?:^|[\s\-_#\[\]【】\(\)|&,.:;])(?:BY|by)(?:$|[\s\-_#\[\]【】\(\)|&,.:;])/,"白俄罗斯"],
          [/(?:广沪京深川泉|广|沪|京|深|川|泉)(?:港|新|韩|美|日|英|德|法|俄|加|澳|意|西|荷|瑞|泰|越|马|菲|土|印|巴|阿|埃|挪|丹|芬|波|比|奥|葡|希)/, function(m){
            var city = {"广":"广州","沪":"上海","京":"北京","深":"深圳","川":"四川","泉":"泉州"}[m[1]] || "";
            var country = {"港":"香港","新":"新加坡","韩":"韩国","美":"美国","日":"日本","英":"英国","德":"德国","法":"法国","俄":"俄罗斯","加":"加拿大","澳":"澳大利亚","意":"意大利","西":"西班牙","荷":"荷兰","瑞":"瑞士","泰":"泰国","越":"越南","马":"马来西亚","菲":"菲律宾","土":"土耳其","印":"印度","巴":"巴西","阿":"阿根廷","埃":"埃及","挪":"挪威","丹":"丹麦","芬":"芬兰","波":"波兰","比":"比利时","奥":"奥地利","葡":"葡萄牙","希":"希腊"}[m[2]] || "";
            return country;
          }]
        ];
        for (var wi = 0; wi < KW_WEAK.length; wi++) {
          try {
            var pair = KW_WEAK[wi];
            var patt = pair[0];
            var repl = pair[1];
            var matched = false;
            var got = "";
            if (typeof repl === "function") {
              var mm = t.match(patt);
              if (mm) { got = repl(mm); matched = (got && got.length > 0); }
            } else {
              matched = patt.test(t);
              got = repl;
            }
            if (matched) return got;
          } catch (_) {}
        }
        return "";
      }

      function isIPv4Str(str) {
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str);
      }

      // ============ 新识别优先级（按从高到低）：
      // 1) 如果 target 是 IP → 本地 IP 段识别（中国/港澳台/私有IP）→ 成功直接返回
      // 2) 从 sni/host/peer/domain 的 TLD 猜国家（明确的 ccTLD 准确率最高）
      // 3) 从文本（锚点名/sni/host/用户备注）做关键词匹配（注意不能有单字误匹配）
      // 4) DNS 解析 → 解析到的 IP 再走本地 IP 段
      // 5) 解析到的 IP 走 ip-api 在线地理查询
      // 6) 全部失败则回退 2)/3) 的初步结果或"通用"
      // ============
      var allText = target + " " + extraCtx;

      // 1) target 如果是 IP：先做本地识别
      var strongLabel = "";
      if (isIPv4Str(target)) {
        var localIpGuess = guessByLocalIpRange(target);
        if (localIpGuess === "__PRIVATE__") {
          return new Response(JSON.stringify({
            ok: true, host: rawHost || "", ip: target,
            countryCode: "", country: "", city: "", label: "通用",
            _hint: { tld: "", text: "", privateIp: true }
          }), {
            headers: withSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8", "Cache-Control": "public, max-age=86400" })
          });
        }
        if (localIpGuess) strongLabel = localIpGuess;
      }

      // 2) TLD 识别（从 target，同时也尝试 extraCtx 中出现的所有 host/sni/peer）
      var tldHintAll = [];
      if (!isIPv4Str(target)) {
        var g = guessByTLD(target);
        if (g) tldHintAll.push(g);
      }
      if (extraCtx) {
        try {
          var hostMatches = extraCtx.match(/(?:sni|host|peer)[=:]\s*([a-z0-9\-._~]+)/ig) || [];
          for (var hmi = 0; hmi < hostMatches.length; hmi++) {
            var val = hostMatches[hmi].replace(/^[^=:]+[=:]\s*/, "");
            if (val && !isIPv4Str(val)) {
              var hg = guessByTLD(val);
              if (hg) tldHintAll.push(hg);
            }
          }
        } catch (_) {}
      }
      var tldHint = tldHintAll.length > 0 ? tldHintAll[0] : "";

      // 3) 文本关键词识别（优先级低于强 TLD，但高于外部查询）
      var textHint = quickCountryByText(allText);

      // 如果 TLD 识别出明确的国家/地区（非空字符串），且不是通用 gTLD，作为兜底信号
      // 注意：fallbackLabel 只在 IP 信号（CIDR + ip-api）都失败时才被采用
      // 不再让 TLD 覆盖 IP 信号（避免外国服务器用了 .cn 域名被误判成中国）
      var fallbackLabel = strongLabel || "";
      if (!fallbackLabel) {
        // TLD 与 textHint 同时存在时：选更具体的（含"-"的城市级 > 国家级）
        if (tldHint && textHint) {
          if (textHint.indexOf("-") > 0 && tldHint.indexOf("-") < 0) fallbackLabel = textHint;
          else fallbackLabel = tldHint;
        } else if (tldHint) fallbackLabel = tldHint;
        else if (textHint) fallbackLabel = textHint;
      }

      var queryIp = target;

      // 若是域名，先通过 Cloudflare 1.1.1.1 DoH → 失败再试 Google DoH 解析为 IPv4
      if (!isIPv4Str(target)) {
        var dnsCandidates = [target];
        if (extraCtx) {
          try {
            var sniMatch = extraCtx.match(/sni[=:]\s*([a-z0-9\-._~]+)/i);
            var hostMatch = extraCtx.match(/host[=:]\s*([a-z0-9\-._~]+)/i);
            var peerMatch = extraCtx.match(/peer[=:]\s*([a-z0-9\-._~]+)/i);
            if (sniMatch && sniMatch[1]) dnsCandidates.push(sniMatch[1]);
            if (hostMatch && hostMatch[1]) dnsCandidates.push(hostMatch[1]);
            if (peerMatch && peerMatch[1]) dnsCandidates.push(peerMatch[1]);
          } catch (_) {}
        }
        var dnsServers = [
          function (name) { return "https://1.1.1.1/dns-query?name=" + encodeURIComponent(name) + "&type=A"; },
          function (name) { return "https://dns.google/resolve?name=" + encodeURIComponent(name) + "&type=A"; }
        ];
        dnsLoop:
        for (var ci = 0; ci < dnsCandidates.length; ci++) {
          var cand = dnsCandidates[ci];
          if (isIPv4Str(cand)) { queryIp = cand; break dnsLoop; }
          for (var di = 0; di < dnsServers.length; di++) {
            try {
              var dnsRes = await fetch(dnsServers[di](cand), {
                headers: { "accept": "application/dns-json" },
                cf: { cacheTtl: 300 }
              });
              if (dnsRes.ok) {
                var dnsData = await dnsRes.json();
                var answers = dnsData.Answer || dnsData.answer || [];
                if (answers.length > 0) {
                  var aRecord = answers.find(function (ans) { return ans.type === 1; });
                  if (aRecord && aRecord.data) { queryIp = aRecord.data; break dnsLoop; }
                }
              }
            } catch (e) {
              console.warn("[GeoLookup] DNS 解析失败, server=" + di + ", candidate=" + cand, e && e.message);
            }
          }
        }
      }

      // ============ 4) DNS 解析后的 IP 再走本地 IP 段识别（优先级高于外部 ip-api）============
      var dnsLocalLabel = "";
      var dnsIsPrivate = false;
      if (isIPv4Str(queryIp)) {
        var dnsLocalGuess = guessByLocalIpRange(queryIp);
        if (dnsLocalGuess === "__PRIVATE__") {
          dnsIsPrivate = true;
        } else if (dnsLocalGuess) {
          dnsLocalLabel = dnsLocalGuess;
          if (!strongLabel) strongLabel = dnsLocalLabel;
        }
      }

      // 如果是私有 IP → 直接走 fallback，不发起外部查询（省配额+避免错误结果）
      var skipIpApi = dnsIsPrivate;

      // ============== 维度 C：IP 地理查询 ip-api.com + ipinfo.io 备选 ==============
      var label = fallbackLabel || "";
      var countryCode = "";
      var countryEn = "";
      var cityEn = "";
      var labelByIp = "";
      // ip-api.com 仅支持 IPv4；ipinfo.io 同时支持 IPv4/IPv6，作为备选
      var queryForGeo = queryIp;
      var isV6Query = (typeof queryIp === "string" && queryIp.indexOf(":") >= 0);
      if (isIPv4Str(queryForGeo) && !skipIpApi) {
        try {
          var geoRes = await fetch(
            "https://ip-api.com/json/" + queryForGeo + "?fields=status,countryCode,country,city,regionName",
            { cf: { cacheTtl: 3600 } }
          );
          if (geoRes.ok) {
            var geoData = await geoRes.json();
            if (geoData && geoData.status === "success") {
              countryCode = (geoData.countryCode || "").toUpperCase();
              countryEn = geoData.country || "";
              cityEn = geoData.city || geoData.regionName || "";
              if (countryCode && COUNTRY_CN[countryCode]) {
                labelByIp = COUNTRY_CN[countryCode];
              } else if (countryEn) {
                labelByIp = toCnCountry(countryEn);
              }
              var cityCn = toCnCity(cityEn);
              if (labelByIp === "中国" && cityCn && cityCn !== "未知地区" && cityCn !== cityEn) {
                labelByIp = "中国-" + cityCn;
              }
            }
          }
        } catch (e) {
          console.warn("[GeoLookup] IP 地理查询失败:", queryForGeo, e && e.message);
        }
      }
      // 备选：ip-api 失败/IPv6/无结果 → 用 ipinfo.io（支持 IPv6，匿名 5万/月）
      if (!labelByIp && (queryForGeo || isV6Query) && !skipIpApi) {
        try {
          var ipinfoRes = await fetch(
            "https://ipinfo.io/" + encodeURIComponent(queryForGeo || "") + "/json",
            { cf: { cacheTtl: 3600 } }
          );
          if (ipinfoRes.ok) {
            var ipinfoData = await ipinfoRes.json();
            if (ipinfoData && ipinfoData.country) {
              var cc2 = ipinfoData.country.toUpperCase();
              if (COUNTRY_CN[cc2]) {
                labelByIp = COUNTRY_CN[cc2];
                if (!countryCode) countryCode = cc2;
                if (!countryEn) countryEn = ipinfoData.country || "";
              }
              var cityCn2 = toCnCity(ipinfoData.city || ipinfoData.region || "");
              if (labelByIp === "中国" && cityCn2 && cityCn2 !== "未知地区") {
                labelByIp = "中国-" + cityCn2;
              }
            }
          }
        } catch (e) {
          console.warn("[GeoLookup] ipinfo.io 备选查询失败:", queryForGeo, e && e.message);
        }
      }

      // ============ 最终仲裁（按可靠性从高到低，单选不再混合覆盖）============
      // 1. dnsIsPrivate（私有 IP）→ 通用
      // 2. strongLabel（CIDR 命中 中国/港澳台）→ 最可靠
      //    若 strongLabel=中国 且 labelByIp=中国-<城市> → 升级到城市级
      // 3. labelByIp（ip-api/ipinfo 在线结果，非"通用"）→ 第二可靠
      //    （不再让 TLD 覆盖 IP，避免外国 .cn 域名被误判中国）
      // 4. tldHint（域名 ccTLD）→ 仅当 IP 信号都失败时
      // 5. textHint（关键词）→ 兜底
      // 6. fallbackLabel / "通用"
      // ============
      if (dnsIsPrivate) {
        label = fallbackLabel || "通用";
      } else if (strongLabel) {
        if (strongLabel === "中国" && labelByIp && labelByIp.indexOf("中国-") === 0) {
          label = labelByIp;  // 升级到城市级
        } else {
          label = strongLabel;
        }
      } else if (labelByIp && labelByIp !== "通用") {
        // IP 在线信号优先于 TLD（实际服务器位置比域名注册地更可信）
        label = labelByIp;
      } else if (tldHint) {
        label = tldHint;
      } else if (textHint) {
        label = textHint;
      } else {
        label = fallbackLabel || "通用";
      }

      if (!label || label === "通用" || label.trim() === "") {
        label = fallbackLabel || "通用";
      }
      label = label || "通用";

      return new Response(JSON.stringify({
        ok: true,
        host: rawHost || "",
        ip: isIPv4Str(queryIp) ? queryIp : "",
        countryCode: countryCode,
        country: countryEn,
        city: cityEn,
        label: label || "通用",
        _hint: { tld: tldHint, text: textHint }
      }), {
        headers: withSecurityHeaders({
          "Content-Type": "application/json;charset=UTF-8",
          "Cache-Control": "public, max-age=3600"
        })
      });
    }

    // 默认前端主页访客计数
    await recordVisit("/");

    // 2. 返回 HTML 页面
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    ${SHARED_HEAD_META}
    <title> OpenClash YAML规则文件一键生成工具 </title>
    <style>
        :root {
            --bg-color: #0f1419;
            --card-bg: rgba(22, 28, 38, 0.85);
            --card-border: rgba(82, 199, 235, 0.2);
            --primary: #4dd0e1;
            --primary-glow: rgba(77, 208, 225, 0.28);
            --secondary: #9575fd;
            --secondary-glow: rgba(149, 117, 253, 0.22);
            --text-main: #e8edf2;
            --text-muted: #8a95a8;
            --input-bg: rgba(13, 18, 25, 0.85);
            --input-border: rgba(82, 199, 235, 0.25);
            --success: #34d399;
            --success-glow: rgba(52, 211, 153, 0.28);
            --warning: #fbbf24;
            --warning-glow: rgba(251, 191, 36, 0.28);
            --danger: #f87171;
            --danger-glow: rgba(248, 113, 113, 0.28);
            --header-divider: rgba(255, 255, 255, 0.08);
            --card-shadow-color: rgba(0, 0, 0, 0.45);
            --gradient-1: rgba(149, 117, 253, 0.14);
            --gradient-2: rgba(77, 208, 225, 0.12);
            --text-strong: #f5f8fb;
            --btn-text-on-primary: #0f1419;
            --btn-text-dark-on-primary: #0f1419;
            --mode-desc-color: #b8a4ff;
            --mode-desc-bg: rgba(149, 117, 253, 0.06);
            --mode-desc-border: rgba(149, 117, 253, 0.25);
            --stats-bg: rgba(77, 208, 225, 0.06);
            --output-bg: #0a0f16;
            --output-color: #34d399;
            --output-shadow: rgba(0, 0, 0, 0.75);
            --option-bg: #0f1419;
            --node-card-bg: rgba(255, 255, 255, 0.03);
            --btn-add-node-bg: rgba(255, 255, 255, 0.05);
            --mode-btn-bg: rgba(255, 255, 255, 0.03);
            --download-btn-bg: rgba(77, 208, 225, 0.08);
        }
        /* 浅色主题（用户手动切换） */
        :root[data-theme="light"] {
            --bg-color: #f7f9fc;
            --card-bg: rgba(255, 255, 255, 0.92);
            --card-border: rgba(14, 116, 144, 0.18);
            --primary: #0e7490;
            --primary-glow: rgba(14, 116, 144, 0.22);
            --secondary: #7c3aed;
            --secondary-glow: rgba(124, 58, 237, 0.18);
            --text-main: #1f2937;
            --text-muted: #64748b;
            --input-bg: rgba(255, 255, 255, 0.95);
            --input-border: rgba(14, 116, 144, 0.24);
            --success: #059669;
            --success-glow: rgba(5, 150, 105, 0.22);
            --warning: #d97706;
            --warning-glow: rgba(217, 119, 6, 0.24);
            --danger: #dc2626;
            --danger-glow: rgba(220, 38, 38, 0.22);
            --header-divider: rgba(15, 23, 42, 0.08);
            --card-shadow-color: rgba(15, 23, 42, 0.1);
            --gradient-1: rgba(124, 58, 237, 0.06);
            --gradient-2: rgba(14, 116, 144, 0.06);
            --text-strong: #0f172a;
            --btn-text-on-primary: #ffffff;
            --btn-text-dark-on-primary: #f7f9fc;
            --mode-desc-color: #6d28d9;
            --mode-desc-bg: rgba(124, 58, 237, 0.05);
            --mode-desc-border: rgba(124, 58, 237, 0.22);
            --stats-bg: rgba(14, 116, 144, 0.05);
            --output-bg: #0a0f16;
            --output-color: #059669;
            --output-shadow: rgba(0, 0, 0, 0.3);
            --option-bg: #ffffff;
            --node-card-bg: rgba(15, 23, 42, 0.025);
            --btn-add-node-bg: rgba(15, 23, 42, 0.04);
            --mode-btn-bg: rgba(15, 23, 42, 0.025);
            --download-btn-bg: rgba(14, 116, 144, 0.06);
        }
        /* 用户未手动选择时，自动跟随系统浅色模式 */
        @media (prefers-color-scheme: light) {
            :root:not([data-theme]) {
                --bg-color: #f7f9fc;
                --card-bg: rgba(255, 255, 255, 0.92);
                --card-border: rgba(14, 116, 144, 0.18);
                --primary: #0e7490;
                --primary-glow: rgba(14, 116, 144, 0.22);
                --secondary: #7c3aed;
                --secondary-glow: rgba(124, 58, 237, 0.18);
                --text-main: #1f2937;
                --text-muted: #64748b;
                --input-bg: rgba(255, 255, 255, 0.95);
                --input-border: rgba(14, 116, 144, 0.24);
                --success: #059669;
                --success-glow: rgba(5, 150, 105, 0.22);
                --warning: #d97706;
                --warning-glow: rgba(217, 119, 6, 0.24);
                --danger: #dc2626;
                --danger-glow: rgba(220, 38, 38, 0.22);
                --header-divider: rgba(15, 23, 42, 0.08);
                --card-shadow-color: rgba(15, 23, 42, 0.1);
                --gradient-1: rgba(124, 58, 237, 0.06);
                --gradient-2: rgba(14, 116, 144, 0.06);
                --text-strong: #0f172a;
                --btn-text-on-primary: #ffffff;
                --btn-text-dark-on-primary: #f7f9fc;
                --mode-desc-color: #6d28d9;
                --mode-desc-bg: rgba(124, 58, 237, 0.05);
                --mode-desc-border: rgba(124, 58, 237, 0.22);
                --stats-bg: rgba(14, 116, 144, 0.05);
                --output-bg: #0a0f16;
                --output-color: #059669;
                --output-shadow: rgba(0, 0, 0, 0.3);
                --option-bg: #ffffff;
                --node-card-bg: rgba(15, 23, 42, 0.025);
                --btn-add-node-bg: rgba(15, 23, 42, 0.04);
                --mode-btn-bg: rgba(15, 23, 42, 0.025);
                --download-btn-bg: rgba(14, 116, 144, 0.06);
            }
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            padding: 24px;
            background-color: var(--bg-color);
            background-image:
                radial-gradient(circle at 15% 15%, var(--gradient-1) 0%, transparent 40%),
                radial-gradient(circle at 85% 85%, var(--gradient-2) 0%, transparent 40%);
            background-attachment: fixed;
            color: var(--text-main);
            margin: 0;
            min-height: 100vh;
            line-height: 1.55;
            letter-spacing: -0.005em;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 28px;
            border-radius: 16px;
            border: 1px solid var(--card-border);
            box-shadow: 0 10px 40px 0 var(--card-shadow-color);
            transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }

        /* 平板（含大屏竖屏 iPad）适配 */
        @media (max-width: 1024px) {
            body { padding: 18px; }
            .container { padding: 22px; border-radius: 14px; }
            .header-title-container h2 { font-size: 20px; }
        }
        /* 手机适配 */
        @media (max-width: 640px) {
            body { padding: 12px; }
            .container { padding: 16px; border-radius: 12px; box-shadow: 0 6px 24px 0 var(--card-shadow-color); }
            .header-title-container { flex-direction: column; align-items: stretch; gap: 12px; padding-bottom: 14px; }
            .header-title-container h2 { font-size: 18px; }
            .header-right-tools { justify-content: space-between; width: 100%; gap: 8px; }
            .ip-stats-badge { font-size: 11px; padding: 5px 10px; }
            .quick-links-bar { justify-content: center; }
            .quick-links-right { justify-content: center; width: 100%; }
            .home-link { width: 100%; justify-content: center; }
            .download-btn-link { padding: 8px 12px; font-size: 12px; }
            .mode-btn-group { flex-direction: column; }
            .mode-btn { width: 100%; min-height: 48px; }
            .row { flex-direction: column !important; gap: 8px !important; }
            .row > div { width: 100% !important; flex: none !important; }
            .section-title { font-size: 14px; }
            label { font-size: 12px; }
            table { font-size: 12px; }
            th, td { padding: 8px 6px; }
        }
        /* 超窄屏手机 */
        @media (max-width: 380px) {
            body { padding: 8px; }
            .container { padding: 12px; }
            .header-title-container h2 { font-size: 16px; }
            .ip-stats-badge { font-size: 10px; padding: 4px 8px; }
        }
        /* 触控设备：增大可点击区域 */
        @media (pointer: coarse) {
            .theme-toggle-btn { width: 40px; height: 40px; }
            .download-btn-link { min-height: 40px; }
            .btn-main, .btn-clear, .btn-lookup { min-height: 48px; }
        }
        /* 用户偏好减少动效 */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
        
        .header-title-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--header-divider);
            padding-bottom: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .header-title-container h2 {
            margin: 0;
            color: var(--primary);
            font-size: 22px;
            border-bottom: none;
            padding-bottom: 0;
            text-shadow: 0 0 12px var(--primary-glow);
            letter-spacing: 0.5px;
        }

        .header-right-tools { display: flex; align-items: center; gap: 12px; }
        
        .theme-toggle-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: 1px solid var(--card-border);
            background: var(--stats-bg);
            color: var(--primary);
            cursor: pointer;
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .theme-toggle-btn:hover {
            background: var(--primary);
            color: var(--btn-text-on-primary);
            box-shadow: 0 0 12px var(--primary-glow);
            transform: scale(1.05);
        }

        .ip-stats-badge {
            background: var(--stats-bg);
            border: 1px solid var(--card-border);
            color: var(--primary);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            box-shadow: inset 0 0 10px var(--stats-bg);
            transition: all 0.3s ease;
        }
        .ip-stats-badge strong { color: var(--text-strong); text-shadow: 0 0 8px var(--card-shadow-color); }
        /* 当前访问 IP：默认打码，可点击切换显隐 */
        #userIp {
            cursor: pointer;
            -webkit-user-select: all;
            user-select: all;
            border-bottom: 1px dashed currentColor;
            padding-bottom: 1px;
            transition: all 0.2s ease;
            letter-spacing: 0.3px;
        }
        #userIp:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
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
        
        .github-link { color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.3s; }
        .github-link:hover { color: var(--primary); filter: drop-shadow(0 0 8px var(--primary-glow)); transform: scale(1.05); }
        
        .section-header-box { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }

        .quick-links-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 0; margin-bottom: 14px; justify-content: space-between; align-items: center; }
        .quick-links-right { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .home-link { background: var(--primary); color: var(--btn-text-dark-on-primary); border-color: var(--primary); font-weight: bold; }
        .home-link:hover { background: var(--download-btn-bg); color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); border-color: var(--card-border); }
        
        .section-title {
            font-weight: bold;
            font-size: 15px;
            color: var(--primary);
            border-left: 4px solid var(--primary);
            padding-left: 10px;
            margin: 0;
            text-shadow: 0 0 8px var(--primary-glow);
            transition: color 0.3s ease, text-shadow 0.3s ease, border-color 0.3s ease;
        }

        .download-btn-link {
            font-size: 12px;
            font-weight: bold;
            color: var(--primary);
            background: var(--download-btn-bg);
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            border: 1px solid var(--card-border);
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .download-btn-link:hover {
            background: var(--primary);
            color: var(--btn-text-dark-on-primary);
            box-shadow: 0 0 15px var(--primary-glow);
            border-color: var(--primary);
        }

        label { font-weight: 600; display: block; margin-top: 12px; margin-bottom: 6px; font-size: 13px; color: var(--text-main); }
        
        textarea, input[type="text"], input[type="number"], select {
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 8px;
            color: var(--text-strong);
            font-family: inherit;
            font-size: 13px;
            transition: all 0.3s;
        }
        textarea:focus, input:focus, select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 12px var(--primary-glow);
            outline: none;
        }
        select option { background: var(--option-bg); color: var(--text-strong); }

        /* 国家选择 wrap：下拉模式 / 自定义输入模式 切换 */
        .country-wrap { display: flex; gap: 0; align-items: stretch; }
        .country-wrap .node-country { flex: 1; }
        .country-custom { display: flex; gap: 4px; align-items: stretch; flex: 1; }
        .country-custom .country-in { flex: 1; }
        .country-custom .country-back {
            flex: 0 0 auto; width: 36px; cursor: pointer;
            background: var(--card-bg); color: var(--text-strong);
            border: 1px solid var(--input-border); border-radius: 6px;
            font-size: 13px;
        }
        .country-custom .country-back:hover { border-color: var(--primary); color: var(--primary); }

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
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            transition: all 0.3s;
            text-align: center;
        }
        .mode-btn.active {
            background: linear-gradient(135deg, rgba(77, 208, 225, 0.18), rgba(149, 117, 253, 0.18));
            border-color: var(--primary);
            color: var(--primary);
            box-shadow: 0 0 15px var(--primary-glow);
            text-shadow: 0 0 8px var(--primary-glow);
        }
        :root[data-theme="light"] .mode-btn.active {
            background: linear-gradient(135deg, rgba(14, 116, 144, 0.14), rgba(124, 58, 237, 0.14));
            box-shadow: 0 0 14px var(--primary-glow);
        }
        .mode-btn:hover:not(.active) {
            border-color: var(--primary);
            color: var(--text-main);
            background: var(--stats-bg);
        }

        .mode-desc-box {
            background: var(--mode-desc-bg);
            border: 1px solid var(--mode-desc-border);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 20px;
            color: var(--mode-desc-color);
            font-size: 13px;
            line-height: 1.6;
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }
        .mode-desc-box .highlight-badge {
            font-weight: bold;
            color: var(--btn-text-dark-on-primary);
            background: var(--primary);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            box-shadow: 0 0 8px var(--primary-glow);
            display: inline-block;
            margin: 0 2px;
        }

        .btn-group { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
        
        .btn-main {
            flex: 2;
            min-width: 180px;
            padding: 12px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: var(--btn-text-on-primary);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: bold;
            transition: all 0.3s;
            box-shadow: 0 0 15px var(--primary-glow);
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .btn-main:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 0 25px var(--primary-glow);
        }

        .btn-refresh {
            flex: 1;
            min-width: 130px;
            padding: 12px;
            background: linear-gradient(135deg, var(--warning), #ff8800);
            color: var(--btn-text-dark-on-primary);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: bold;
            transition: all 0.3s;
            box-shadow: 0 0 15px var(--warning-glow);
        }
        .btn-refresh:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 0 20px var(--warning-glow);
        }

        .btn-sub {
            flex: 1;
            min-width: 130px;
            padding: 12px;
            background: linear-gradient(135deg, var(--success), #00b874);
            color: var(--btn-text-dark-on-primary);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: bold;
            transition: all 0.3s;
            box-shadow: 0 0 15px var(--success-glow);
        }
        .btn-sub:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 0 20px var(--success-glow);
        }
        
        .output-box {
            background: var(--output-bg);
            color: var(--output-color);
            padding: 16px;
            border-radius: 8px;
            font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
            word-break: break-all;
            margin-top: 15px;
            white-space: pre;
            font-size: 12px;
            max-height: 500px;
            overflow-y: auto;
            border: 1px solid var(--card-border);
            box-shadow: inset 0 0 15px var(--output-shadow);
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }

        .tag {
            background: rgba(77, 208, 225, 0.15);
            color: var(--primary);
            border: 1px solid rgba(77, 208, 225, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: normal;
            margin-left: 6px;
        }
        :root[data-theme="light"] .tag {
            background: rgba(14, 116, 144, 0.1);
            border-color: rgba(14, 116, 144, 0.25);
        }

        .tip-tag {
            background: rgba(251, 191, 36, 0.15);
            color: var(--warning);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: normal;
            margin-left: 6px;
            border: 1px solid rgba(251, 191, 36, 0.3);
        }
        :root[data-theme="light"] .tip-tag {
            background: rgba(217, 119, 6, 0.1);
            border-color: rgba(217, 119, 6, 0.25);
        }

        .status { margin-top: 12px; font-weight: bold; font-size: 13px; color: var(--success); text-align: center; text-shadow: 0 0 8px var(--success-glow); }

        .node-card {
            background: var(--node-card-bg);
            border: 1px solid var(--card-border);
            border-radius: 10px;
            padding: 14px 16px;
            margin-bottom: 14px;
            position: relative;
            transition: all 0.3s;
        }
        .node-card:hover {
            border-color: rgba(77, 208, 225, 0.4);
            box-shadow: 0 0 15px var(--stats-bg);
        }
        .node-card .btn-card-actions { position: absolute; right: 14px; top: 12px; display: flex; gap: 6px; }

        .node-card .btn-action {
            border: none;
            border-radius: 6px;
            padding: 4px 10px;
            cursor: pointer;
            font-size: 12px;
            color: var(--btn-text-on-primary);
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-clear { background: rgba(251, 191, 36, 0.18); color: var(--warning) !important; border: 1px solid rgba(251, 191, 36, 0.4) !important; }
        .btn-clear:hover { background: var(--warning); color: var(--btn-text-dark-on-primary) !important; }
        .btn-remove { background: rgba(248, 113, 113, 0.18); color: var(--danger) !important; border: 1px solid rgba(248, 113, 113, 0.4) !important; }
        .btn-remove:hover { background: var(--danger); color: var(--btn-text-on-primary) !important; }
        .btn-lookup { background: rgba(77, 208, 225, 0.15); color: var(--primary) !important; border: 1px solid rgba(77, 208, 225, 0.4) !important; }
        .btn-lookup:hover { background: var(--primary); color: var(--btn-text-dark-on-primary) !important; }

        .btn-add-node {
            background: var(--btn-add-node-bg);
            color: var(--text-main);
            border: 1px dashed var(--card-border);
            padding: 10px 18px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 12px;
            width: 100%;
            transition: all 0.3s;
        }
        .btn-add-node:hover {
            background: var(--stats-bg);
            border-color: var(--primary);
            color: var(--primary);
        }
        
        .mode-section { display: none; }
        .mode-section.active-section { display: block; }
    </style>
</head>
<body>

<div class="container">
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
                📥 下载OpenClash插件配置文件
            </a>
        </div>
    </div>

    <div class="header-title-container">
        <h2>⚡ OpenClash YAML规则文件一键生成工具</h2>
        <div class="header-right-tools">
            <button type="button" id="themeToggleBtn" class="theme-toggle-btn" title="切换浅色/深色主题">🌙</button>
            <div class="ip-stats-badge" id="ipStatsBadge">
                🌐 当前访问IP: <strong id="userIp" class="ip-masked" title="点击显示完整 IP（默认打码隐藏后半部分）">加载中...</strong> | 👁️ 累计访客数: <strong id="visitCount">...</strong>
            </div>
            <a href="https://github.com/Ozero-top/OpenClash-Online-YAML-Generator" target="_blank" rel="noopener noreferrer" class="github-link" title="访问 GitHub 开源项目" onclick="trackAction('首页外链：访问 GitHub 开源项目主页（OpenClash 在线 YAML 生成器）'); return true;">
                <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </a>
        </div>
    </div>

    <div class="section-header-box">
        <div class="section-title">生成模式与实用工具选择</div>
    </div>
    <div class="mode-btn-group">
        <button id="btn-mode-chain-single" class="mode-btn active" onclick="switchMode('chain-single')">🔲 链式代理 - 独立节点</button>
        <button id="btn-mode-chain-bulk" class="mode-btn" onclick="switchMode('chain-bulk')">📑 链式代理 - 批量粘贴</button>
        <button id="btn-mode-standard" class="mode-btn" onclick="switchMode('standard')">🌐 自动分流 - 家用模式</button>
        <button id="btn-mode-direct" class="mode-btn" onclick="switchMode('direct')">🎯 直连模式 - 电商/游戏</button>
        <button id="btn-mode-sk-convert" class="mode-btn" onclick="switchMode('sk-convert')">🛠️ Socks5 / SK 格式转换</button>
    </div>

    <div id="modeDescBox" class="mode-desc-box"></div>
    
    <div id="chainConfigSection">
        <div id="chainSubSection">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">1. 前置中转代理订阅配置</div>
        <div class="row">
            <div style="flex: 1;">
                <label for="chainSubName">代理商自定义名称:</label>
                <input type="text" id="chainSubName" value="代理服务商名称" placeholder="自定义名称（默认：中转代理）">
            </div>
            <div style="flex: 2;">
                <label for="subUrl">中转代理订阅地址 (url):</label>
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
                    <option value="♻️ 自动选择" selected>♻️ 自动选择</option>
                    <option value="🇭🇰 香港节点">🇭🇰 香港节点</option>
                    <option value="🇺🇸 美国节点">🇺🇸 美国节点</option>
                    <option value="🇯🇵 日本节点">🇯🇵 日本节点</option>
                    <option value="🇸🇬 新加坡节点">🇸🇬 新加坡节点</option>
                    <option value="🇼🇸 台湾节点">🇼🇸 台湾节点</option>
                    <option value="🇰🇷 韩国节点">🇰🇷 韩国节点</option>
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
                <label for="stdSubName1">代理商自定义名称:</label>
                <input type="text" id="stdSubName1" value="代理服务商名称" placeholder="自定义名称（默认：主力代理）">
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
                <label for="stdSubName2">备用代理自定义名称:</label>
                <input type="text" id="stdSubName2" value="备用代理" placeholder="自定义名称（默认：备用代理）">
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
            <div class="hint" style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">
                支持标准格式：<code>socks5://账号:密码@IP:端口</code>，转换后可直接粘贴至上方“链式代理 - 批量粘贴”模式中使用。
            </div>
        </div>
    </div>

    <div class="btn-group" id="clashBtnGroup">
        <button class="btn-main" onclick="generateYaml(true)">🚀 生成并自动下载完整YAML规则文件</button>
        <button class="btn-refresh" onclick="reloadPage()">🔄 刷新网页重置</button>
        <button class="btn-sub" onclick="downloadYaml()">💾 直接另存为 config.yaml</button>
    </div>

    <div id="statusMsg" class="status"></div>

    <div id="clashOutputSection">
        <div class="section-title" style="margin-top:20px; margin-bottom:8px;">📄 完整 YAML 规则预览区</div>
        <div id="out-full" class="output-box">点击生成按钮后查看...</div>
    </div>
</div>

${SHARED_THEME_INIT_SCRIPT}
${SHARED_TRACK_SCRIPT}
<script>
let lastGeneratedYaml = "";
let nodeCount = 0;
let currentMode = "chain-single";

// ===== 三模式共享 YAML 骨架（端口 / DNS / TUN / profile 完全一致，仅 secret 与各模式差异部分动态注入） =====
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
ipv6: true
unified-delay: true
tcp-concurrent: true\`;

const YAML_DNS_BLOCK = \`dns:
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
    - 119.29.29.29\`;

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
    'chain-bulk': \`📑 链式代理 - 批量混合粘贴模式：支持在多行文本框中批量粘贴多种协议的节点链接（如 vless、vmess、trojan、hysteria2、socks5），系统会自动解析并批量匹配国家/地区，快速生成链式代理配置文件。&#10;⚠️ 注意：clash运行该yaml规则文件后，无需任何设置即可按照前面 网段匹配 或 指定设备单 IP 配置自动运行（默认全局），可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组的 所有 - 手动 选择延时最低节点作为前置中转；其他策略组对 网段匹配 或 指定设备单 IP 无任何影响；仅作用于 OpenWRT软路由 非 网段匹配 或 指定设备单 IP 的设备；可自动分流，WebRTC/DNS防泄漏 （分流/防泄漏前提要自行配置clash插件 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明 )\`,
    'standard': \`🌐 自动分流 - 单/双代理订阅家用模式 (V0.2.5)：面向日常或家用场景，支持配置单代理或双代理（主力+备用）订阅地址，自动聚合节点并提供全自动区域流控、延迟优化与丰富的主流分流规则。同时兼顾DNS防泄漏和WebRTC防泄漏。&#10;⚠️ 注意：clash运行该yaml规则文件后，可在 Clash 的 [控制面板] 打开 [ZashBoard] 找到策略组，根据使用需求自行设置；除 直连、拒绝 策略组，其他策略组均是自动切换最低延时节点；可手动选择，但会在3-6小时后自动切换到延时最低节点。【分流/防泄漏前提要自行配置clash插件】 或 【页面右上方下载 clash插件配置文件 替换】，具体操作可参考：\${guideLinkHtml} - 【替换OpenClash插件配置文件】 操作说明\`,
    'sk-convert': '🛠️ Socks5 / SK 格式转换工具：提供独立的格式批量转换服务，将"IP|端口|账号|密码"格式转换为标准的 socks5:// 协议链接。转换结果可直接复制，用于链式代理或其他代理软件。',
    'direct': \`🎯 直连模式 - 网段/单IP精准分流 (无中转/无链式)：<span class="highlight-badge">此模式适合: 国内外电商/游戏/直播使用</span> 仅需要输入节点链接并选择网段匹配或指定设备单 IP，系统自动生成 YAML 配置文件。不需要前置中转代理订阅，也不使用链式代理 (dialer-proxy)，节点直接作为代理出口，配合 SRC-IP-CIDR 规则实现指定网段或设备的精准分流。&#10;⚠️ 注意：clash运行该yaml规则文件后，无需任何设置即可按照 网段匹配 或 指定设备单 IP 配置自动运行（默认全局）\`
};

const countryCodeToCn = {
    "CN":"中国","US":"美国","JP":"日本","KR":"韩国","SG":"新加坡","HK":"香港","TW":"台湾","MO":"澳门",
    "GB":"英国","DE":"德国","FR":"法国","RU":"俄罗斯","AU":"澳大利亚","CA":"加拿大","IN":"印度","BR":"巴西",
    "IT":"意大利","ES":"西班牙","MX":"墨西哥","ID":"印度尼西亚","TH":"泰国","VN":"越南","MY":"马来西亚","PH":"菲律宾",
    "TR":"土耳其","SA":"沙特阿拉伯","AE":"阿联酋","IL":"以色列","ZA":"南非","EG":"埃及","AR":"阿根廷","NL":"荷兰",
    "SE":"瑞典","CH":"瑞士","BE":"比利时","AT":"奥地利","NO":"挪威","DK":"丹麦","FI":"芬兰","PL":"波兰",
    "IE":"爱尔兰","PT":"葡萄牙","GR":"希腊","NZ":"新西兰","PK":"巴基斯坦","BD":"孟加拉国","NG":"尼日利亚","UA":"乌克兰",
    "CO":"哥伦比亚","CL":"智利","PE":"秘鲁","IR":"伊朗","IQ":"伊拉克","QA":"卡塔尔","KW":"科威特","OM":"阿曼",
    "JO":"约旦","LB":"黎巴嫩","SY":"叙利亚","YE":"也门","AF":"阿富汗","NP":"尼泊尔","LK":"斯里兰卡","MM":"缅甸",
    "KH":"柬埔寨","LA":"老挝","BN":"文莱","MN":"蒙古","KZ":"哈萨克斯坦","UZ":"乌兹别克斯坦","TM":"土库曼斯坦","KG":"吉尔吉斯斯坦",
    "TJ":"塔吉克斯坦","AZ":"阿塞拜疆","AM":"亚美尼亚","GE":"格鲁吉亚","BY":"白俄罗斯","MD":"摩尔多瓦","RO":"罗马尼亚","BG":"保加利亚",
    "HR":"克罗地亚","SI":"斯洛文尼亚","RS":"塞尔维亚","ME":"黑山","MK":"北马其顿","AL":"阿尔巴尼亚","BA":"波黑","XK":"科索沃",
    "EE":"爱沙尼亚","LV":"拉脱维亚","LT":"立陶宛","CZ":"捷克共和国","SK":"斯洛伐克","HU":"匈牙利","LU":"卢森堡","MC":"摩纳哥",
    "LI":"列支敦士登","AD":"安道尔","SM":"圣马力诺","VA":"梵蒂冈","MT":"马耳他","IS":"冰岛","CY":"塞浦路斯",
    "MA":"摩洛哥","DZ":"阿尔及利亚","TN":"突尼斯","LY":"利比亚","SD":"苏丹","SS":"南苏丹","ET":"埃塞俄比亚","SO":"索马里",
    "KE":"肯尼亚","TZ":"坦桑尼亚","UG":"乌干达","RW":"卢旺达","BI":"布隆迪","MZ":"莫桑比克","ZW":"津巴布韦","ZM":"赞比亚",
    "MW":"马拉维","AO":"安哥拉","NA":"纳米比亚","BW":"博茨瓦纳","LS":"莱索托","SZ":"斯威士兰","GM":"冈比亚","SN":"塞内加尔",
    "MR":"毛里塔尼亚","ML":"马里","BF":"布基纳法索","NE":"尼日尔","TD":"乍得","CF":"中非","CM":"喀麦隆","GQ":"赤道几内亚",
    "GA":"加蓬","CG":"刚果共和国","CD":"刚果民主共和国","ST":"圣多美和普林西比","GIN":"几内亚","SL":"塞拉利昂","LR":"利比里亚","CI":"科特迪瓦",
    "GH":"加纳","TG":"多哥","BJ":"贝宁","ER":"厄立特里亚","DJ":"吉布提","KM":"科摩罗","MU":"毛里求斯","SC":"塞舌尔",
    "CV":"佛得角","RE":"留尼汪","YT":"马约特","EH":"西撒哈拉",
    "VE":"委内瑞拉","EC":"厄瓜多尔","BO":"玻利维亚","PY":"巴拉圭","UY":"乌拉圭","GY":"圭亚那","SR":"苏里南","GF":"法属圭亚那",
    "CU":"古巴","JM":"牙买加","HT":"海地","DO":"多米尼加","PR":"波多黎各","TT":"特立尼达和多巴哥","PA":"巴拿马","CR":"哥斯达黎加",
    "NI":"尼加拉瓜","HN":"洪都拉斯","SV":"萨尔瓦多","GT":"危地马拉","BZ":"伯利兹","BS":"巴哈马","BB":"巴巴多斯","DM":"多米尼克",
    "LC":"圣卢西亚","VC":"圣文森特和格林纳丁斯","GD":"格林纳达","AG":"安提瓜和巴布达","KN":"圣基茨和尼维斯",
    "FJ":"斐济","PG":"巴布亚新几内亚","SB":"所罗门群岛","VU":"瓦努阿图","NC":"新喀里多尼亚","PF":"法属波利尼西亚","WS":"萨摩亚","TO":"汤加",
    "TV":"图瓦卢","KI":"基里巴斯","MH":"马绍尔群岛","FM":"密克罗尼西亚","PW":"帕劳","NR":"瑙鲁","GU":"关岛","AS":"美属萨摩亚",
    "VI":"美属维尔京群岛","AW":"阿鲁巴","CW":"库拉索","SX":"荷属圣马丁","BQ":"荷兰加勒比区",
    "BL":"圣巴泰勒米","MF":"法属圣马丁","PM":"圣皮埃尔和密克隆","GL":"格陵兰","FO":"法罗群岛","GI":"直布罗陀",
    "AX":"奥兰群岛","SH":"圣赫勒拿","FK":"马尔维纳斯群岛","GS":"南乔治亚","TF":"法属南部领地","HM":"赫德岛和麦克唐纳群岛",
    "UM":"美国本土外小岛屿","IO":"英属印度洋领地","BV":"布韦岛","CX":"圣诞岛","CC":"科科斯群岛","NF":"诺福克岛",
    "PN":"皮特凯恩群岛","CK":"库克群岛","NU":"纽埃","TK":"托克劳","WF":"瓦利斯和富图纳",
    "A1":"匿名代理","A2":"卫星提供商","O1":"其他国家/地区","XX":"未知国家/地区","T1":"中转区域"
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

// ================================
// 当前访问 IP：默认打码隐藏后半段，点击切换显隐
// ================================
(function () {
    // 全局状态（闭包私有，不污染全局命名空间）
    var _fullIp = "";          // 完整 IP（API 返回）
    var _revealed = false;     // 当前是否显示完整 IP：默认 false=打码
    var _ipEl = null;

    function maskIp(ip) {
        if (!ip) return "未知";
        var s = String(ip).trim();
        if (!s || s === "未知" || s === "加载中...") return s;
        // IPv4：保留前半段（4 段 → 前 2 段；3 段 → 前 2 段；2 段 → 前 1 段）
        if (isIPv4(s)) {
            var parts = s.split('.');
            var n = parts.length;
            var keep = Math.max(1, Math.ceil(n / 2));
            var masked = parts.slice(0, keep).concat(new Array(n - keep).fill('*')).join('.');
            return masked;
        }
        // IPv6（含压缩形式，含端口 [::1]:443 这种）
        if (s.indexOf(':') !== -1) {
            // 先去掉 [ ] 和端口
            var inner = s.replace(/^\[|\].*$/g, '');
            var segs = inner.split(':');
            // 统计非空段数量（压缩格式用 :: 会有空串）
            var nonEmpty = segs.filter(function (x) { return x !== ''; });
            var hasCompress = segs.indexOf('') !== -1;
            if (nonEmpty.length <= 1) return inner.replace(/./g, '*');
            // 保留前 ceil(n/2) 段，后面的变 *（最小保留 1 段）
            var keep2 = Math.max(1, Math.ceil(nonEmpty.length / 2));
            var kept = nonEmpty.slice(0, keep2);
            var maskedSegs = [];
            // 还原压缩 ::（仅在开头或中间出现一次空串）
            var compressIdx = segs.indexOf('');
            if (compressIdx === 0) {
                // 开头是压缩位：前面放 *，再加 kept
                var tailStars = new Array(Math.max(0, nonEmpty.length - kept.length)).fill('*');
                maskedSegs = [''].concat(kept).concat(tailStars);
            } else if (compressIdx > 0 && compressIdx < segs.length - 1) {
                // 中间压缩：保留前 kept 段（前半在压缩前，前半跨越压缩的话简化处理）
                var before = segs.slice(0, compressIdx);
                var after = segs.slice(compressIdx + 1);
                maskedSegs = before.slice(0, Math.max(1, Math.ceil(before.length / 2))).concat(['']).concat(new Array(Math.max(0, after.length + (before.length - Math.max(1, Math.ceil(before.length / 2))))).fill('*'));
            } else {
                maskedSegs = kept.concat(new Array(Math.max(0, nonEmpty.length - kept.length)).fill('*'));
            }
            var out = maskedSegs.join(':');
            // 如果是 [ip]:port 形式，保持原方括号
            if (s.charAt(0) === '[') {
                var portMatch = s.match(/\](:\d+)?$/);
                out = '[' + out + ']' + (portMatch ? (portMatch[1] || '') : '');
            }
            return out;
        }
        // 其他格式（如 hostname/localhost）：显示前半字符，后半 *
        var half = Math.max(1, Math.floor(s.length / 2));
        return s.slice(0, half) + new Array(s.length - half + 1).join('*');
    }

    function _getEl() {
        if (!_ipEl) _ipEl = document.getElementById('userIp');
        return _ipEl;
    }

    // 暴露给外部：设置完整 IP（内部保存 + 渲染打码状态）
    window.setVisitorIp = function (fullIp) {
        _fullIp = fullIp ? String(fullIp).trim() : "";
        _applyDisplay();
    };

    // 外部：切换显隐
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

    // 绑定点击事件：优先 DOMContentLoaded 后绑
    function _bind() {
        var el = _getEl();
        if (!el) return;
        // 只绑一次
        if (el.getAttribute('data-ip-bound') === '1') return;
        el.setAttribute('data-ip-bound', '1');
        el.addEventListener('click', function (e) {
            // 允许用户选中文本（不阻止默认选择行为，但单击仍触发切换）
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
            // 不再直接设置 innerText，改为调用闭包函数：保存完整 IP + 默认打码渲染
            window.setVisitorIp(data.ip || '未知');
            if (data.kvBound) {
                document.getElementById('visitCount').innerText = data.visitCount;
            } else {
                document.getElementById('visitCount').innerText = '未绑定KV';
                document.getElementById('visitCount').title = '在 Worker 设置中绑定 PAGE_VISITS KV 命名空间即可开启计数';
            }
        }
    } catch (e) {
        console.warn('获取访问统计失败:', e);
        window.setVisitorIp('未知');
        document.getElementById('visitCount').innerText = '未获取';
    }
}

function isIPv4(str) {
    return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str);
}
// IPv6 基础检测（支持压缩格式，用于打码函数分支判断）
function isIPv6(str) {
    if (!str || typeof str !== 'string') return false;
    return str.indexOf(':') !== -1;
}

// ================================
// 前端本地 IP 段识别（与后端 guessByLocalIpRange 逻辑镜像同步，精简 CIDR 列表保证体积可控）
// 返回："__PRIVATE__" / "中国" / "香港" / "澳门" / "台湾" / ""(未知)
// ================================
function FE_ipv4ToInt(ip) {
    try {
        var p = ip.split('.');
        if (p.length !== 4) return 0;
        return (((((+p[0] << 8) + +p[1]) << 8) + +p[2]) << 8) + +p[3] >>> 0;
    } catch (e) { return 0; }
}
function FE_ipInCidr(ipInt, cidr) {
    try {
        var s = cidr.split('/');
        var prefix = +s[1];
        if (isNaN(prefix) || prefix < 0 || prefix > 32) prefix = 32;
        var mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
        var netIp = FE_ipv4ToInt(s[0]);
        if (!netIp) return false;
        return (ipInt & mask) === (netIp & mask);
    } catch (e) { return false; }
}
function FE_ipInAnyCidr(ipStr, cidrList) {
    var ipInt = FE_ipv4ToInt(ipStr);
    if (!ipInt) return false;
    for (var i = 0; i < cidrList.length; i++) { if (FE_ipInCidr(ipInt, cidrList[i])) return true; }
    return false;
}
var FE_PRIVATE_IPS = ["0.0.0.0/8","10.0.0.0/8","100.64.0.0/10","127.0.0.0/8","169.254.0.0/16","172.16.0.0/12","192.168.0.0/16","198.18.0.0/15","224.0.0.0/4","240.0.0.0/4"];
var FE_CN_IPS = [
    "1.0.1.0/24","1.0.2.0/23","1.0.8.0/21","1.0.32.0/19","1.1.0.0/22","1.1.8.0/21","1.2.0.0/23","1.2.2.0/24","1.2.4.0/22",
    "1.4.0.0/16","1.5.0.0/16","1.8.0.0/16","1.10.0.0/16","1.12.0.0/14","1.24.0.0/13","1.48.0.0/15","1.56.0.0/13","1.68.0.0/15",
    "1.80.0.0/13","1.188.0.0/14","1.192.0.0/14","1.202.0.0/15","1.204.0.0/14","14.0.0.0/21","14.0.8.0/21","14.0.32.0/19",
    "14.1.0.0/22","14.1.8.0/21","14.1.16.0/20","14.1.32.0/19","14.1.64.0/18","14.1.128.0/17","14.2.0.0/16","14.4.0.0/14",
    "14.14.0.0/15","14.16.0.0/12","14.100.0.0/15","14.102.0.0/16","14.103.0.0/18","14.104.0.0/13","14.112.0.0/12",
    "14.128.0.0/10","14.204.0.0/15","14.208.0.0/12","27.0.0.0/16","27.8.0.0/13","27.16.0.0/12","27.32.0.0/14","27.36.0.0/14",
    "27.40.0.0/13","27.48.0.0/15","27.50.0.0/16","27.54.0.0/15","27.96.0.0/18","27.102.0.0/19","27.106.0.0/15","27.112.0.0/12",
    "27.128.0.0/15","27.148.0.0/14","27.152.0.0/13","27.184.0.0/13","27.192.0.0/12","27.216.0.0/13","27.224.0.0/11",
    "36.0.0.0/14","36.4.0.0/14","36.8.0.0/13","36.16.0.0/12","36.32.0.0/13","36.40.0.0/14","36.48.0.0/15","36.96.0.0/11",
    "36.128.0.0/10","36.192.0.0/11","36.224.0.0/11","39.0.0.0/15","39.64.0.0/11","39.96.0.0/13","39.128.0.0/10",
    "42.0.0.0/16","42.1.0.0/16","42.2.0.0/18","42.4.0.0/14","42.48.0.0/12","42.80.0.0/12","42.96.0.0/15","42.100.0.0/14",
    "42.120.0.0/15","42.122.0.0/15","42.128.0.0/12","42.144.0.0/12","42.160.0.0/12","42.176.0.0/12","42.192.0.0/12",
    "42.224.0.0/12","42.240.0.0/13","42.248.0.0/13","49.0.0.0/11","49.32.0.0/11","49.64.0.0/11","49.112.0.0/13","49.128.0.0/10",
    "49.192.0.0/10","58.16.0.0/12","58.32.0.0/13","58.40.0.0/14","58.44.0.0/14","58.48.0.0/13","58.56.0.0/15","58.58.0.0/16",
    "58.59.0.0/17","58.60.0.0/14","58.64.0.0/11","58.100.0.0/10","58.192.0.0/11","58.208.0.0/12","58.224.0.0/13","58.240.0.0/15",
    "59.32.0.0/12","59.48.0.0/14","59.52.0.0/13","59.60.0.0/15","59.64.0.0/11","59.108.0.0/15","59.172.0.0/14","59.176.0.0/13",
    "60.0.0.0/13","60.8.0.0/15","60.10.0.0/14","60.16.0.0/13","60.24.0.0/13","60.28.0.0/15","60.30.0.0/16","60.160.0.0/11",
    "60.192.0.0/14","60.196.0.0/15","60.198.0.0/16","60.200.0.0/13","60.208.0.0/13","60.216.0.0/15","60.220.0.0/14","60.232.0.0/13",
    "61.48.0.0/13","61.128.0.0/10","61.160.0.0/11","61.176.0.0/12","61.184.0.0/13","61.188.0.0/16","61.189.0.0/17",
    "61.232.0.0/14","61.236.0.0/15","61.240.0.0/14","100.64.0.0/10","101.0.0.0/16","101.1.0.0/16","101.2.0.0/15",
    "101.4.0.0/14","101.16.0.0/12","101.32.0.0/13","101.40.0.0/14","101.44.0.0/16","101.64.0.0/13","101.80.0.0/12",
    "101.224.0.0/13","101.232.0.0/15","101.234.0.0/15","101.236.0.0/14","101.240.0.0/13","101.248.0.0/15","101.254.0.0/15",
    "103.0.0.0/22","106.0.0.0/15","106.2.0.0/16","106.3.0.0/16","106.4.0.0/14","106.40.0.0/13","106.112.0.0/12",
    "106.120.0.0/14","106.124.0.0/15","110.0.0.0/10","110.64.0.0/13","110.72.0.0/14","110.80.0.0/13","110.88.0.0/14",
    "110.152.0.0/14","110.184.0.0/13","110.192.0.0/12","110.208.0.0/12","110.224.0.0/14","110.228.0.0/14","110.232.0.0/14",
    "111.0.0.0/10","111.72.0.0/13","111.112.0.0/14","111.116.0.0/15","111.120.0.0/13","111.128.0.0/11","111.160.0.0/13",
    "111.168.0.0/14","111.172.0.0/14","111.192.0.0/14","111.224.0.0/13","111.230.0.0/15","112.0.0.0/10","112.64.0.0/15",
    "112.66.0.0/16","112.67.0.0/16","112.72.0.0/13","112.80.0.0/12","112.96.0.0/11","112.128.0.0/12","112.144.0.0/14",
    "112.192.0.0/14","112.196.0.0/12","112.224.0.0/14","112.240.0.0/13","112.248.0.0/14","113.0.0.0/14","113.16.0.0/15",
    "113.44.0.0/14","113.50.0.0/15","113.52.0.0/14","113.56.0.0/15","113.58.0.0/16","113.62.0.0/15","113.64.0.0/11",
    "113.96.0.0/13","113.104.0.0/14","113.128.0.0/14","113.140.0.0/15","113.192.0.0/15","113.200.0.0/13","113.208.0.0/13",
    "113.216.0.0/15","113.224.0.0/12","114.16.0.0/12","114.32.0.0/12","114.48.0.0/15","114.54.0.0/16","114.55.0.0/16",
    "114.56.0.0/13","114.64.0.0/11","114.96.0.0/12","114.112.0.0/14","114.120.0.0/13","114.128.0.0/15","114.144.0.0/12",
    "114.208.0.0/12","114.220.0.0/14","115.28.0.0/15","115.48.0.0/12","115.60.0.0/14","115.100.0.0/14","115.148.0.0/14",
    "115.152.0.0/14","115.168.0.0/14","115.184.0.0/15","115.200.0.0/14","115.204.0.0/14","115.208.0.0/13","115.216.0.0/13",
    "115.224.0.0/12","115.236.0.0/14","116.0.0.0/12","116.16.0.0/14","116.204.0.0/15","116.206.0.0/16","116.208.0.0/14",
    "116.212.0.0/14","116.216.0.0/13","116.224.0.0/12","116.240.0.0/13","116.248.0.0/14","116.252.0.0/15","116.254.0.0/16",
    "117.12.0.0/16","117.13.0.0/16","117.14.0.0/15","117.21.0.0/16","117.22.0.0/15","117.24.0.0/13","117.32.0.0/13",
    "117.40.0.0/14","117.44.0.0/15","117.48.0.0/12","117.64.0.0/13","117.72.0.0/14","117.76.0.0/15","117.78.0.0/16",
    "117.80.0.0/12","117.100.0.0/14","117.120.0.0/13","117.128.0.0/12","117.136.0.0/13","117.144.0.0/14","117.148.0.0/15",
    "117.152.0.0/14","117.157.0.0/16","117.176.0.0/13","118.72.0.0/13","118.80.0.0/14","118.112.0.0/13","118.120.0.0/14",
    "118.132.0.0/16","118.144.0.0/14","118.160.0.0/14","118.178.0.0/15","118.180.0.0/14","118.186.0.0/15","118.192.0.0/14",
    "118.202.0.0/16","118.212.0.0/14","118.220.0.0/14","118.228.0.0/14","118.240.0.0/14","118.244.0.0/15","118.248.0.0/13",
    "119.0.0.0/13","119.8.0.0/14","119.10.0.0/15","119.12.0.0/16","119.18.0.0/16","119.36.0.0/16","119.48.0.0/15",
    "119.57.0.0/16","119.60.0.0/14","119.75.0.0/16","119.80.0.0/13","119.96.0.0/12","119.112.0.0/13","119.120.0.0/14",
    "119.128.0.0/12","119.144.0.0/14","119.152.0.0/15","119.160.0.0/13","119.176.0.0/12","119.224.0.0/14","120.0.0.0/12",
    "120.16.0.0/13","120.24.0.0/14","120.28.0.0/15","120.30.0.0/16","120.32.0.0/13","120.40.0.0/14","120.64.0.0/11",
    "120.96.0.0/12","120.192.0.0/15","120.200.0.0/13","120.208.0.0/13","120.216.0.0/15","120.220.0.0/14","120.224.0.0/11",
    "121.0.0.0/15","121.4.0.0/15","121.8.0.0/13","121.16.0.0/11","121.48.0.0/14","121.52.0.0/14","121.56.0.0/15",
    "121.58.0.0/17","121.60.0.0/14","121.204.0.0/14","121.208.0.0/13","121.224.0.0/12","121.240.0.0/13","122.0.0.0/11",
    "122.32.0.0/13","122.40.0.0/14","122.48.0.0/16","122.49.0.0/16","122.50.0.0/15","122.52.0.0/14","122.56.0.0/15",
    "122.64.0.0/11","122.96.0.0/15","122.102.0.0/16","122.112.0.0/13","122.120.0.0/14","122.136.0.0/13","122.144.0.0/11",
    "122.192.0.0/16","122.193.0.0/16","122.194.0.0/15","122.198.0.0/16","122.200.0.0/13","122.208.0.0/13","122.224.0.0/12",
    "122.240.0.0/13","123.4.0.0/14","123.8.0.0/13","123.16.0.0/13","123.24.0.0/14","123.48.0.0/13","123.56.0.0/15",
    "123.58.0.0/16","123.64.0.0/11","123.96.0.0/15","123.98.0.0/15","123.100.0.0/14","123.108.0.0/14","123.112.0.0/11",
    "123.144.0.0/13","123.152.0.0/15","123.154.0.0/15","123.160.0.0/11","123.184.0.0/14","123.188.0.0/14","123.192.0.0/14",
    "123.206.0.0/15","123.208.0.0/13","123.232.0.0/14","123.240.0.0/13","124.0.0.0/12","124.16.0.0/13","124.224.0.0/11",
    "125.40.0.0/13","125.48.0.0/16","125.64.0.0/11","125.96.0.0/14","125.104.0.0/15","125.106.0.0/16","125.108.0.0/14",
    "125.112.0.0/12","125.208.0.0/14","125.212.0.0/15","125.214.0.0/17","125.216.0.0/13","125.254.0.0/16","140.75.0.0/16",
    "140.206.0.0/15","140.237.0.0/16","140.240.0.0/16","140.242.0.0/15","140.246.0.0/15","140.248.0.0/13","140.255.0.0/16",
    "159.226.0.0/16","161.163.0.0/16","161.176.0.0/13","161.189.0.0/16","161.189.128.0/17","161.207.0.0/16",
    "162.105.0.0/16","163.0.0.0/16","163.177.0.0/16","163.179.0.0/16","163.228.0.0/16","167.139.0.0/16","171.0.0.0/12",
    "171.34.0.0/15","171.36.0.0/14","171.40.0.0/14","171.44.0.0/15","171.48.0.0/15","171.80.0.0/12","171.104.0.0/13",
    "171.112.0.0/13","171.120.0.0/14","171.136.0.0/14","171.208.0.0/13","171.216.0.0/14","175.0.0.0/12","175.16.0.0/14",
    "175.20.0.0/15","175.24.0.0/14","175.30.0.0/17","175.42.0.0/15","175.44.0.0/14","175.48.0.0/12","175.64.0.0/11",
    "175.102.0.0/15","175.128.0.0/11","175.146.0.0/15","175.148.0.0/14","175.160.0.0/11","175.184.0.0/13","175.192.0.0/12",
    "175.208.0.0/13","176.34.44.0/24","180.76.0.0/16","180.78.0.0/15","180.80.0.0/12","180.96.0.0/11",
    "180.128.0.0/13","180.136.0.0/14","180.152.0.0/13","180.160.0.0/11","180.208.0.0/13","180.212.0.0/14","180.228.0.0/14",
    "182.32.0.0/11","182.80.0.0/12","182.96.0.0/13","182.112.0.0/12","182.128.0.0/12","182.144.0.0/13","182.156.0.0/14",
    "182.168.0.0/14","182.200.0.0/13","182.232.0.0/14","182.240.0.0/13","182.248.0.0/14","183.0.0.0/10","183.64.0.0/14",
    "183.84.0.0/15","183.128.0.0/11","183.160.0.0/12","183.184.0.0/14","183.192.0.0/12","183.208.0.0/12","183.224.0.0/11",
    "202.0.0.0/16","202.3.0.0/16","202.4.0.0/14","202.14.0.0/15","202.38.64.0/18","202.43.0.0/16",
    "202.60.0.0/16","202.61.0.0/16","202.62.0.0/15","202.64.0.0/11","202.96.0.0/12","202.108.0.0/16","202.111.0.0/16",
    "202.112.0.0/14","202.117.0.0/16","202.118.0.0/15","202.120.0.0/14","202.127.0.0/16","202.130.0.0/16","202.136.0.0/13",
    "202.144.0.0/12","202.160.0.0/14","202.164.0.0/15","202.168.0.0/13","202.192.0.0/15","202.194.0.0/15","202.196.0.0/14",
    "202.200.0.0/14","202.204.0.0/14","202.208.0.0/13","202.224.0.0/12","203.0.0.0/16","203.2.0.0/15","203.8.0.0/15",
    "203.14.0.0/15","203.16.0.0/13","203.66.0.0/16","203.86.0.0/15","203.88.0.0/14","203.93.0.0/16","203.94.0.0/15",
    "203.96.0.0/13","203.112.0.0/13","203.128.0.0/13","203.174.0.0/15","203.176.0.0/12","203.192.0.0/14","203.208.0.0/12",
    "210.0.0.0/13","210.12.0.0/15","210.14.0.0/16","210.16.0.0/13","210.24.0.0/14","210.28.0.0/15","210.30.0.0/16",
    "210.32.0.0/12","210.48.0.0/14","210.51.0.0/16","210.52.0.0/14","210.72.0.0/14","210.77.0.0/16","210.78.0.0/15",
    "210.80.0.0/13","210.128.0.0/12","210.160.0.0/12","210.176.0.0/14","210.188.0.0/14","210.192.0.0/15","210.208.0.0/12",
    "210.224.0.0/11","211.64.0.0/14","211.68.0.0/15","211.70.0.0/16","211.72.0.0/15","211.80.0.0/12",
    "211.96.0.0/13","211.136.0.0/12","211.144.0.0/12","211.152.0.0/14","211.158.0.0/15","211.160.0.0/15","211.162.0.0/15",
    "211.165.0.0/16","216.165.128.0/17","218.0.0.0/11","218.56.0.0/13","218.64.0.0/11","218.88.0.0/13",
    "218.104.0.0/14","218.108.0.0/13","218.192.0.0/13","219.128.0.0/11","219.140.0.0/14","219.144.0.0/14","219.148.0.0/15",
    "219.150.0.0/16","219.216.0.0/13","220.101.0.0/16","220.112.0.0/13","220.128.0.0/12","220.160.0.0/11",
    "220.224.0.0/15","220.230.0.0/15","220.232.0.0/13","220.240.0.0/13","220.248.0.0/14","220.250.0.0/15","220.252.0.0/14",
    "221.0.0.0/12","221.176.0.0/13","221.192.0.0/14","221.200.0.0/13","221.204.0.0/14","221.208.0.0/13","221.212.0.0/16",
    "221.214.0.0/15","221.216.0.0/13","221.224.0.0/12","221.236.0.0/15","221.238.0.0/16","222.0.0.0/10","222.64.0.0/11",
    "222.128.0.0/13","222.136.0.0/13","222.160.0.0/11","222.184.0.0/13","222.192.0.0/14","222.208.0.0/13","222.216.0.0/14",
    "222.240.0.0/13","223.0.0.0/10","223.64.0.0/11","223.96.0.0/12","223.112.0.0/14","223.144.0.0/12","223.192.0.0/14"
];
// FE_HK_IPS：与后端 HK_IP_RANGES 完全一致（替换原先错误地把 202.96.0.0/16 等大量中国电信/联通/移动段当成香港的列表）
var FE_HK_IPS = [
    "1.0.128.0/17","14.0.128.0/17","14.1.0.0/17","45.64.0.0/16","45.65.0.0/16","45.118.128.0/17","45.119.0.0/17",
    "49.128.0.0/14","58.64.0.0/16","59.148.0.0/16","60.244.0.0/16","61.90.0.0/16","61.91.0.0/16",
    "101.78.0.0/16","103.1.0.0/16","103.2.0.0/16","103.3.0.0/16","103.4.0.0/16","103.11.64.0/18",
    "103.25.208.0/22","103.26.128.0/22","103.28.128.0/22","103.37.144.0/22","103.39.128.0/22","103.52.112.0/22",
    "103.81.128.0/17","113.28.0.0/16","113.29.0.0/16","118.103.0.0/16","119.246.0.0/16",
    "122.129.0.0/16","122.130.0.0/16","122.152.0.0/16","122.200.64.0/18","123.242.0.0/15","124.156.0.0/16",
    "180.150.0.0/16","182.16.0.0/16","183.78.0.0/16","183.90.0.0/16","183.176.0.0/15",
    "202.3.128.0/20","202.17.208.0/20","202.46.32.0/19","202.55.0.0/16","202.68.80.0/20",
    "202.71.128.0/20","202.75.160.0/20","202.78.160.0/20","202.82.0.0/16","202.83.160.0/20",
    "202.92.192.0/18","202.130.0.0/16","202.131.0.0/16","202.133.64.0/18","202.152.0.0/16",
    "202.155.0.0/16","202.160.0.0/16","202.177.0.0/16","202.181.0.0/16","203.78.0.0/16",
    "203.86.0.0/16","203.119.128.0/18","203.131.0.0/16","203.132.0.0/16","203.158.0.0/16",
    "210.176.0.0/12","210.226.0.0/16","210.242.0.0/16","218.102.0.0/16","218.213.0.0/16","219.76.0.0/15","219.78.0.0/16",
    "220.241.0.0/16","222.138.0.0/16","223.16.0.0/16","223.17.0.0/16","223.197.128.0/18"
];
var FE_TW_IPS = [
    "1.34.208.0/20","140.92.0.0/14","140.96.0.0/13","140.104.0.0/14","140.108.0.0/16","140.109.0.0/16",
    "140.110.0.0/16","140.111.0.0/16","140.112.0.0/16","140.113.0.0/16","140.114.0.0/16","140.115.0.0/16",
    "140.116.0.0/16","140.117.0.0/16","140.118.0.0/16","140.119.0.0/16","140.120.0.0/16","140.121.0.0/16",
    "140.122.0.0/16","140.123.0.0/16","140.124.0.0/16","140.125.0.0/16","140.126.0.0/16","140.127.0.0/16",
    "140.128.0.0/13","140.136.0.0/14","140.138.0.0/16","140.139.0.0/16","140.192.0.0/13","140.200.0.0/14",
    "140.224.0.0/13","142.163.0.0/16","150.116.0.0/15","150.118.0.0/16","150.119.0.0/16","150.242.0.0/16",
    "159.226.0.0/16","163.14.0.0/15","163.17.0.0/16","168.95.0.0/16","175.96.0.0/15","175.180.0.0/14",
    "175.200.0.0/13","175.208.0.0/15","175.224.0.0/13","180.64.0.0/11","202.2.0.0/16","202.3.0.0/16",
    "202.39.0.0/16","202.51.0.0/16","202.54.0.0/16","202.55.0.0/16","202.59.0.0/16","202.60.0.0/16",
    "202.61.0.0/16","202.62.0.0/16","202.63.0.0/16","202.64.0.0/16","202.65.0.0/16","202.66.0.0/16",
    "202.67.0.0/16","202.68.0.0/16","202.69.0.0/16","202.70.0.0/16","202.71.0.0/16","202.72.0.0/16",
    "202.73.0.0/16","202.74.0.0/16","202.75.0.0/16","202.76.0.0/16","202.77.0.0/16","202.78.0.0/16",
    "202.79.0.0/16","202.80.0.0/16","202.81.0.0/16","202.82.0.0/15","202.84.0.0/16","202.85.0.0/16",
    "202.86.0.0/16","202.87.0.0/16","202.88.0.0/16","202.89.0.0/16","202.90.0.0/15","202.92.0.0/16",
    "202.93.0.0/16","202.94.0.0/16","202.95.0.0/16","202.96.0.0/16","202.97.0.0/16","202.98.0.0/16",
    "202.99.0.0/16","202.100.0.0/16","202.101.0.0/16","202.102.0.0/16","202.103.0.0/16","202.104.0.0/16",
    "202.105.0.0/16","202.106.0.0/16","202.107.0.0/16","202.108.0.0/16","202.109.0.0/16","202.110.0.0/16",
    "202.111.0.0/16","202.112.0.0/16","202.113.0.0/16","202.114.0.0/16","202.115.0.0/16","202.116.0.0/16",
    "202.117.0.0/16","202.118.0.0/16","202.119.0.0/16","202.120.0.0/16","202.121.0.0/16","202.122.0.0/16",
    "202.123.0.0/16","202.124.0.0/16","202.125.0.0/16","202.126.0.0/16","202.127.0.0/16","202.128.0.0/16",
    "202.129.0.0/16","202.130.0.0/16","202.131.0.0/16","202.132.0.0/16","202.133.0.0/16","202.134.0.0/16",
    "202.135.0.0/16","202.136.0.0/16","202.137.0.0/16","202.138.0.0/16","202.139.0.0/16","202.140.0.0/16",
    "202.141.0.0/16","202.142.0.0/16","202.143.0.0/16","202.144.0.0/16","202.145.0.0/16","202.146.0.0/16",
    "202.147.0.0/16","202.148.0.0/16","202.149.0.0/16","202.150.0.0/16","202.151.0.0/16","202.152.0.0/16",
    "202.153.0.0/16","202.154.0.0/16","202.155.0.0/16","202.156.0.0/16","202.157.0.0/16","202.158.0.0/16",
    "202.159.0.0/16","202.160.0.0/16","202.161.0.0/16","202.162.0.0/16","202.163.0.0/16","202.164.0.0/16",
    "202.165.0.0/16","202.166.0.0/16","202.167.0.0/16","202.168.0.0/16","202.169.0.0/16","202.170.0.0/16",
    "202.171.0.0/16","202.172.0.0/16","202.173.0.0/16","202.174.0.0/16","202.175.0.0/16","202.176.0.0/16",
    "202.177.0.0/16","202.178.0.0/16","202.179.0.0/16","202.180.0.0/16","202.181.0.0/16","202.182.0.0/16",
    "202.183.0.0/16","202.184.0.0/16","202.185.0.0/16","202.186.0.0/16","202.187.0.0/16","202.188.0.0/16",
    "202.189.0.0/16","202.190.0.0/16","202.191.0.0/16","202.192.0.0/16","202.193.0.0/16","202.194.0.0/16",
    "202.195.0.0/16","202.196.0.0/16","202.197.0.0/16","202.198.0.0/16","202.199.0.0/16","202.200.0.0/16",
    "202.201.0.0/16","202.202.0.0/16","202.203.0.0/16","202.204.0.0/16","202.205.0.0/16","202.206.0.0/16",
    "202.207.0.0/16","202.208.0.0/16","202.209.0.0/16","202.210.0.0/16","202.211.0.0/16","202.212.0.0/16",
    "202.213.0.0/16","202.214.0.0/16","202.215.0.0/16","202.216.0.0/16","202.217.0.0/16","202.218.0.0/16",
    "202.219.0.0/16","202.220.0.0/16","202.221.0.0/16","202.222.0.0/16","202.223.0.0/16","202.224.0.0/16",
    "202.225.0.0/16","202.226.0.0/16","202.227.0.0/16","202.228.0.0/16","202.229.0.0/16","202.230.0.0/16",
    "202.231.0.0/16","202.232.0.0/16","202.233.0.0/16","202.234.0.0/16","202.235.0.0/16","202.236.0.0/16",
    "202.237.0.0/16","202.238.0.0/16","202.239.0.0/16","202.240.0.0/16","202.241.0.0/16","202.242.0.0/16",
    "202.243.0.0/16","202.244.0.0/16","202.245.0.0/16","202.246.0.0/16","202.247.0.0/16","202.248.0.0/16",
    "202.249.0.0/16","202.250.0.0/16","202.251.0.0/16","202.252.0.0/16","202.253.0.0/16","202.254.0.0/16",
    "202.255.0.0/16","210.59.0.0/16","210.60.0.0/16","210.61.0.0/16","210.62.0.0/16","210.63.0.0/16",
    "210.64.0.0/16","210.65.0.0/16","210.66.0.0/16","210.67.0.0/16","210.68.0.0/16","210.69.0.0/16",
    "210.70.0.0/16","210.71.0.0/16","210.180.0.0/14","210.240.0.0/13","211.20.0.0/16","211.21.0.0/16",
    "211.22.0.0/15","211.72.0.0/16","211.73.0.0/16","211.74.0.0/16","211.75.0.0/16","211.76.0.0/16",
    "211.77.0.0/16","211.78.0.0/16","211.79.0.0/16","218.160.0.0/12","218.161.0.0/16","218.162.0.0/15",
    "218.164.0.0/14","218.168.0.0/14","218.172.0.0/15","218.174.0.0/16","218.175.0.0/16","218.176.0.0/15",
    "218.178.0.0/16","218.179.0.0/16","218.180.0.0/14","218.184.0.0/13","218.200.0.0/13","218.212.0.0/15",
    "218.232.0.0/15","218.234.0.0/16","218.235.0.0/16","219.80.0.0/15","219.84.0.0/16","219.85.0.0/16",
    "219.86.0.0/16","219.87.0.0/16","219.88.0.0/15","219.90.0.0/15","219.92.0.0/14","219.102.0.0/15",
    "220.128.0.0/14","220.132.0.0/16","220.133.0.0/16","220.134.0.0/15","220.136.0.0/13","220.144.0.0/14",
    "220.148.0.0/15","220.150.0.0/16","220.151.0.0/16","220.152.0.0/15","220.154.0.0/16","220.155.0.0/16",
    "220.156.0.0/14","220.160.0.0/14","220.164.0.0/15","220.166.0.0/16","220.168.0.0/13","220.228.0.0/15",
    "220.230.0.0/16","220.231.0.0/16","221.120.0.0/14","221.124.0.0/15","221.126.0.0/16","221.127.0.0/16",
    "221.128.0.0/15","221.130.0.0/15","221.132.0.0/14","221.136.0.0/15","221.138.0.0/16","221.139.0.0/16",
    "221.140.0.0/14","221.144.0.0/13","221.152.0.0/14","221.156.0.0/15","221.158.0.0/16","221.159.0.0/16",
    "222.124.0.0/15","223.140.0.0/15","223.142.0.0/16","223.143.0.0/16","223.144.0.0/13","223.152.0.0/15",
    "223.154.0.0/15","223.160.0.0/12","223.176.0.0/14","223.180.0.0/14","223.184.0.0/13","223.198.0.0/16"
];
var FE_MO_IPS = ["27.98.128.0/17","43.231.0.0/16","103.14.224.0/20","103.22.224.0/20","103.29.64.0/19",
    "103.40.112.0/20","103.55.160.0/20","103.80.128.0/20","103.91.96.0/20","103.105.224.0/19",
    "103.119.192.0/20","103.135.80.0/20","103.148.128.0/20","103.175.64.0/20","103.186.80.0/20",
    "103.191.32.0/20","103.205.160.0/20","103.218.224.0/20","103.230.80.0/20","103.237.96.0/20",
    "103.243.112.0/20","103.246.192.0/20","103.253.176.0/20","103.255.0.0/20","114.142.0.0/16",
    "118.184.0.0/16","119.236.0.0/16","122.102.128.0/17","122.224.0.0/16","123.124.0.0/17",
    "124.150.0.0/18","124.244.0.0/16","162.247.0.0/16","163.181.0.0/16","168.138.128.0/17",
    "170.84.128.0/17","175.102.0.0/16","180.149.0.0/16","180.180.0.0/16","180.181.0.0/16",
    "183.179.0.0/16","202.4.128.0/17","202.66.0.0/16","202.81.224.0/19","202.85.0.0/16",
    "202.94.0.0/16","202.96.0.0/16","202.120.0.0/16","202.121.0.0/16","202.122.0.0/16",
    "202.123.0.0/16","202.124.0.0/16","202.125.0.0/16","202.126.0.0/15","202.130.0.0/16",
    "202.132.0.0/16","202.133.0.0/16","202.134.0.0/16","202.136.0.0/16","202.138.0.0/16",
    "202.140.0.0/16","202.142.0.0/16","202.144.0.0/16","202.146.0.0/16","202.148.0.0/16",
    "202.150.0.0/16","202.152.0.0/16","202.153.0.0/16","202.155.0.0/16","202.156.0.0/14",
    "202.160.0.0/14","202.164.0.0/15","202.166.0.0/16","202.168.0.0/16","202.169.0.0/16",
    "202.170.0.0/15","202.172.0.0/14","202.176.0.0/15","202.178.0.0/15","202.180.0.0/14",
    "202.184.0.0/14","202.188.0.0/14","202.192.0.0/13","202.200.0.0/14","202.204.0.0/14",
    "202.208.0.0/13","202.224.0.0/12","210.128.0.0/16","218.213.0.0/16","222.180.0.0/16"
];
function guessByLocalIpRangeFE(ipStr) {
    if (!isIPv4(ipStr)) return "";
    if (FE_ipInAnyCidr(ipStr, FE_PRIVATE_IPS)) return "__PRIVATE__";
    if (FE_ipInAnyCidr(ipStr, FE_HK_IPS)) return "香港";
    if (FE_ipInAnyCidr(ipStr, FE_MO_IPS)) return "澳门";
    if (FE_ipInAnyCidr(ipStr, FE_TW_IPS)) return "台湾";
    if (FE_ipInAnyCidr(ipStr, FE_CN_IPS)) return "中国";
    return "";
}

function extractHostFromLink(link) {
    if (!link) return "";
    try {
        var raw = link.trim();
        if (!raw) return "";
        // ========== A. 先对 URL 做规范化：补全缺失的协议前缀 ==========
        // 兼容 ss:// / ssr:// / tuic:// / tuic-v5:// / wireguard:// / wg:// / hysteria2:// / hy2:// / socks:// / socks4:// / socks4a:// / ssh:// / http:// / https:// / vless:// / vmess:// / trojan:// / trojan-go://
        // 注意：vmess:// / ss:// 很多是 base64（加了 padding 的），先单独处理协议 → base64
        var proto = "";
        var afterProto = raw;
        var pSplit = raw.indexOf("://");
        if (pSplit > 0) {
            proto = raw.slice(0, pSplit).toLowerCase();
            afterProto = raw.slice(pSplit + 3);
        }

        // ========== B. 处理 base64 协议（vmess / ss / ssr / 部分 vless/trojan 也有 base64 写法）==========
        // vmess:// 基本都是 base64 整段 JSON
        if (proto === "vmess") {
            try {
                var b64 = afterProto.split("#")[0];
                var jsonStr = decodeBase64Utf8(b64);
                var vmess = JSON.parse(jsonStr);
                if (vmess && vmess.add) return (vmess.add || "").toString().trim();
            } catch (_) {}
        }
        // ss:// (有两种写法：1) method:pass@host:port 直接拼接； 2) 整段 method:pass@host:port 先 base64 再包 ss://)
        if (proto === "ss" || proto === "ssr") {
            try {
                // 去掉锚点名（#xxx）和 ?query（/qr 之类）
                var payload = afterProto.split("#")[0].split("?")[0];
                // 先尝试是否为 base64（无 @ 有 = 或不含冒号）
                if (payload.indexOf("@") === -1 && /[A-Za-z0-9+/=]{8,}/.test(payload)) {
                    try {
                        var decoded = decodeBase64Utf8(payload);
                        payload = decoded;
                    } catch (_) {}
                }
                // payload 现在应该是 method:password@host:port/?param 或 method:pass@host:port 或 host:port（极少数）
                var atIdx = payload.indexOf("@");
                var lastColon = payload.lastIndexOf(":");
                var hostStart = atIdx >= 0 ? atIdx + 1 : 0;
                var hostEnd = lastColon > hostStart ? lastColon : payload.length;
                // 注意 host 可能是 [IPv6]:port 形式
                var hostRaw = payload.slice(hostStart, hostEnd);
                if (hostRaw.charAt(0) === "[") {
                    var cb = hostRaw.indexOf("]");
                    if (cb > 0) hostRaw = hostRaw.slice(1, cb);
                }
                if (hostRaw) return hostRaw.trim();
            } catch (_) {}
        }

        // ========== C. 处理 tuic:// / tuic-v5:// （标准 URL 但 UUID 可能含特殊字符）==========
        // tuic://uuid:password@host:port?sni=xxx&alpn=h3 等 → 直接用 URL 构造器即可
        // 但如果 port 后面有 /? 或 // 这种畸形拼接，先人工提取 host:port
        if (proto === "tuic" || proto === "tuic-v5" || proto === "hysteria2" || proto === "hy2" ||
            proto === "hysteria" || proto === "trojan" || proto === "trojan-go" || proto === "vless" ||
            proto === "socks5" || proto === "socks4" || proto === "socks4a" || proto === "socks" ||
            proto === "http" || proto === "https" || proto === "ssh" || proto === "wireguard" || proto === "wg") {
            try {
                var dummy = raw;
                // URL 构造器对带 @ 的都能解析；wireguard 有些写法是无协议就一串 host:port，下面兜底
                var u = new URL(dummy);
                if (u && u.hostname) return u.hostname.trim();
            } catch (_) {
                // 人工提取：找 @ → 再找 :port → 再找 / 或 ? 或 # 或空白作为结束
                try {
                    var _after = afterProto;
                    var _hashIdx = _after.indexOf("#");
                    if (_hashIdx > 0) _after = _after.slice(0, _hashIdx);
                    var _at = _after.lastIndexOf("@");
                    var _seg = _at >= 0 ? _after.slice(_at + 1) : _after;
                    // _seg 可能是 host:port/?sni=xxx   或   [IPv6]:port?...   或   host:port
                    var _slashIdx = _seg.indexOf("/");
                    var _qIdx = _seg.indexOf("?");
                    var _ampIdx = _seg.indexOf("&");
                    var _cut = _seg.length;
                    [_slashIdx, _qIdx, _ampIdx].forEach(function (i) { if (i > 0 && i < _cut) _cut = i; });
                    var _hp = _seg.slice(0, _cut);  // host:port 或 [IPv6]:port
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

        // ========== D. 最后兜底：纯 host:port 或 ip:port 文本（无任何协议前缀） ==========
        try {
            if (pSplit === -1) {
                var plain = raw.split(/\s|#|&|;|\|/)[0];  // 取第一段，避免注释等杂质
                var pl = plain.lastIndexOf(":");
                var hostPart = pl > 0 ? plain.slice(0, pl) : plain;
                if (/^\[.*\]$/.test(hostPart)) hostPart = hostPart.slice(1, -1);
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

    // ==== 第一层：强关键字（多字、组合词、城市名、明确 ISO 2-letter；无独立单字，避免误匹配）====
    // 国内 / 港澳台（先匹配，优先级高）
    if (r(/中国|内地|大陆|中华|🇨🇳/)) return "中国";
    if (r(/香港|广港|港深|深港|🇭🇰|Hong\s*Kong|Kowloon|Tsim\s*Sha\s*Tsui|Mong\s*Kok|Wan\s*Chai|Central|Causeway\s*Bay|Tsuen\s*Wan|Shatin/)) return "香港";
    if (r(/澳门|🇲🇴|Macau|Macao|Taipa|Coloane|氹仔|路环/)) return "澳门";
    if (r(/台湾|台灣|广台|🇹🇼|Taiwan|Tai\s*pei|Taipei|高雄|Kaohsiung|台中|Taichung|台南|Tainan|新竹|Hsinchu|基隆|Keelung|嘉义|Chiayi|花莲|Hualien/)) return "台湾";

    // 海外：组合词（广/沪/京/深/川/泉 + 国家地区后缀，这种是专线名字，例如"广港"、"沪日"）
    // —— 亚洲 ——
    if (r(/日本|广日|沪日|深日|川日|京日|泉日|🇯🇵|Japan|Tokyo|Osaka|Kyoto|Yokohama|Nagoya|Sapporo|Fukuoka|东京|大阪|京都|横滨|名古屋|札幌|福冈|埼玉|神户|广岛|仙台|千叶|琦玉/)) return "日本";
    if (r(/新加坡|广新|沪新|深新|京新|🇸🇬|Singapore|狮城|樟宜/)) return "新加坡";
    if (r(/韩国|韓國|广韩|沪韩|深韩|京韩|🇰🇷|Korea|Seoul|Busan|Incheon|首尔|釜山|仁川|大邱|光州|大田|蔚山|春川/)) return "韩国";
    if (r(/朝鲜|🇰🇵|DPRK|Pyongyang|平壤/)) return "朝鲜";
    if (r(/泰国|广泰|沪泰|🇹🇭|Thailand|Bangkok|清迈|Chiang\s*Mai|普吉岛|Phuket|芭堤雅|Pattaya|合艾|Hat\s*Yai|甲米/)) return "泰国";
    if (r(/越南|广越|🇻🇳|Vietnam|Hanoi|Ho\s*Chi\s*Minh|胡志明市|岘港|Da\s*Nang|海防|芽庄|河内/)) return "越南";
    if (r(/马来西亚|广马|🇲🇾|Malaysia|Kuala\s*Lumpur|吉隆坡|新山|Johor\s*Bahru|槟城|Penang|怡保|马六甲/)) return "马来西亚";
    if (r(/菲律宾|🇵🇭|Philippines|Manila|马尼拉|宿务|Cebu|达沃|Davao/)) return "菲律宾";
    if (r(/印度尼西亚|印尼|🇮🇩|Indonesia|Jakarta|雅加达|泗水|Surabaya|万隆|Bandung|巴厘岛|Bali|棉兰/)) return "印度尼西亚";
    if (r(/印度|🇮🇳|India|Mumbai|孟买|Delhi|新德里|Bangalore|班加罗尔|Hyderabad|海得拉巴|Chennai|金奈|Kolkata|加尔各答/)) return "印度";
    if (r(/巴基斯坦|巴铁|🇵🇰|Pakistan|Karachi|卡拉奇|Lahore|拉合尔|Islamabad|伊斯兰堡/)) return "巴基斯坦";
    if (r(/孟加拉国|🇧🇩|Bangladesh|Dhaka|达卡/)) return "孟加拉国";
    if (r(/缅甸|🇲🇲|Myanmar|Yangon|仰光|内比都|Naypyidaw|曼德勒/)) return "缅甸";
    if (r(/柬埔寨|🇰🇭|Cambodia|Phnom\s*Penh|金边|暹粒|Siem\s*Reap|西哈努克/)) return "柬埔寨";
    if (r(/老挝|🇱🇦|Laos|Vientiane|万象|琅勃拉邦/)) return "老挝";
    if (r(/尼泊尔|🇳🇵|Nepal|Kathmandu|加德满都|博卡拉/)) return "尼泊尔";
    if (r(/斯里兰卡|🇱🇰|Sri\s*Lanka|Colombo|科伦坡/)) return "斯里兰卡";
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
    // —— 美洲 ——
    if (r(/美国|广美|沪美|深美|京美|🇺🇸|United\s*States|America|NYC|New\s*York|Los\s*Angeles|San\s*Francisco|Seattle|Chicago|Dallas|Miami|Boston|Washington|San\s*Jose|Las\s*Vegas|Portland|洛杉矶|纽约|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|圣何塞|圣克拉拉|西雅图|芝加哥|阿什本|圣迭戈|硅谷|旧金山|迈阿密|波士顿|华盛顿|亚特兰大|休斯顿|费城|丹佛|底特律|火奴鲁鲁|檀香山|硅谷|硅谷/)) return "美国";
    if (r(/加拿大|🇨🇦|Canada|Toronto|Vancouver|Montreal|Calgary|Edmonton|Ottawa|多伦多|温哥华|蒙特利尔|卡尔加里|埃德蒙顿|渥太华|魁北克/)) return "加拿大";
    if (r(/墨西哥|🇲🇽|Mexico|Mexico\s*City|瓜达拉哈拉|Guadalajara|蒙特雷|Monterrey|坎昆|Cancun/)) return "墨西哥";
    if (r(/巴西|🇧🇷|Brazil|Sao\s*Paulo|Rio\s*de\s*Janeiro|Brasilia|圣保罗|里约热内卢|巴西利亚/)) return "巴西";
    if (r(/阿根廷|🇦🇷|Argentina|Buenos\s*Aires|布宜诺斯艾利斯/)) return "阿根廷";
    if (r(/智利|🇨🇱|Chile|Santiago|圣地亚哥/)) return "智利";
    if (r(/哥伦比亚|🇨🇴|Colombia|Bogota|波哥大|麦德林|Medellin/)) return "哥伦比亚";
    if (r(/秘鲁|🇵🇪|Peru|Lima|利马|库斯科|Cusco/)) return "秘鲁";
    if (r(/古巴|🇨🇺|Cuba|Havana|哈瓦那/)) return "古巴";
    if (r(/巴拿马|🇵🇦|Panama|Panama\s*City|巴拿马城/)) return "巴拿马";
    if (r(/哥斯达黎加|🇨🇷|Costa\s*Rica|圣何塞/)) return "哥斯达黎加";
    if (r(/多米尼加|🇩🇴|Dominican\s*Republic|Santo\s*Domingo|圣多明各/)) return "多米尼加";
    if (r(/牙买加|🇯🇲|Jamaica|Kingston|金斯顿/)) return "牙买加";
    if (r(/乌拉圭|🇺🇾|Uruguay|Montevideo|蒙得维的亚/)) return "乌拉圭";
    if (r(/巴拉圭|🇵🇾|Paraguay|Asuncion|亚松森|东方市/)) return "巴拉圭";
    if (r(/玻利维亚|🇧🇴|Bolivia|La\s*Paz|拉巴斯|苏克雷/)) return "玻利维亚";
    if (r(/厄瓜多尔|🇪🇨|Ecuador|Quito|基多|瓜亚基尔|Guayaquil/)) return "厄瓜多尔";
    if (r(/委内瑞拉|🇻🇪|Venezuela|Caracas|加拉加斯/)) return "委内瑞拉";
    // —— 欧洲 ——
    if (r(/英国|广英|沪英|深英|🇬🇧|UK|United\s*Kingdom|Great\s*Britain|England|Scotland|Wales|London|Manchester|Edinburgh|Birmingham|Glasgow|利物浦|利兹|布里斯托尔|谢菲尔德|纽卡斯尔|贝尔法斯特|伦敦|曼彻斯特|爱丁堡|伯明翰/)) return "英国";
    if (r(/德国|广德|沪德|深德|🇩🇪|DE|Germany|Berlin|Munich|Hamburg|Frankfurt|Cologne|Stuttgart|Leipzig|Dresden|柏林|慕尼黑|汉堡|法兰克福|科隆|斯图加特|莱比锡|德累斯顿|波恩|杜塞尔多夫/)) return "德国";
    if (r(/法国|广法|沪法|深法|🇫🇷|FR|France|Paris|Marseille|Lyon|Toulouse|Nice|Bordeaux|巴黎|马赛|里昂|图卢兹|尼斯|波尔多/)) return "法国";
    if (r(/意大利|🇮🇹|IT|Italy|Rome|Milan|Naples|Turin|Florence|Venice|Palermo|罗马|米兰|那不勒斯|都灵|佛罗伦萨|威尼斯|巴勒莫/)) return "意大利";
    if (r(/西班牙|🇪🇸|ES|Spain|Madrid|Barcelona|Valencia|Seville|Bilbao|马德里|巴塞罗那|瓦伦西亚|塞维利亚/)) return "西班牙";
    if (r(/葡萄牙|🇵🇹|PT|Portugal|Lisbon|Porto|里斯本|波尔图/)) return "葡萄牙";
    if (r(/荷兰|🇳🇱|NL|Netherlands|Amsterdam|Rotterdam|The\s*Hague|Utrecht|阿姆斯特丹|鹿特丹|海牙|乌得勒支|埃因霍温/)) return "荷兰";
    if (r(/比利时|🇧🇪|BE|Belgium|Brussels|Antwerp|Ghent|布鲁塞尔|安特卫普|根特|布鲁日/)) return "比利时";
    if (r(/瑞士|🇨🇭|CH|Switzerland|Zurich|Geneva|Basel|Lausanne|苏黎世|日内瓦|巴塞尔|洛桑/)) return "瑞士";
    if (r(/奥地利|🇦🇹|AT|Austria|Vienna|Salzburg|Graz|维也纳|萨尔茨堡|格拉茨|因斯布鲁克/)) return "奥地利";
    if (r(/瑞典|🇸🇪|SE|Sweden|Stockholm|Gothenburg|斯德哥尔摩|哥德堡/)) return "瑞典";
    if (r(/挪威|🇳🇴|NO|Norway|Oslo|Bergen|斯塔万格|Stavanger|奥斯陆|卑尔根/)) return "挪威";
    if (r(/丹麦|🇩🇰|DK|Denmark|Copenhagen|Aarhus|哥本哈根|奥胡斯/)) return "丹麦";
    if (r(/芬兰|🇫🇮|FI|Finland|Helsinki|Tampere|赫尔辛基|坦佩雷/)) return "芬兰";
    if (r(/冰岛|🇮🇸|IS|Iceland|Reykjavik|雷克雅未克/)) return "冰岛";
    if (r(/波兰|🇵🇱|PL|Poland|Warsaw|Krakow|Wroclaw|华沙|克拉科夫|弗罗茨瓦夫/)) return "波兰";
    if (r(/俄罗斯|俄罗|🇷🇺|RU|Russia|Moscow|Saint\s*Petersburg|Novosibirsk|Yekaterinburg|Kazan|Sochi|Vladivostok|莫斯科|圣彼得堡|新西伯利亚|叶卡捷琳堡|喀山|索契|符拉迪沃斯托克|海参崴|伯力|哈巴罗夫斯克|新西伯利亚|西伯利亚/)) return "俄罗斯";
    if (r(/乌克兰|🇺🇦|UA|Ukraine|Kyiv|Kiev|Kharkiv|Odessa|Dnipro|基辅|哈尔科夫|敖德萨|第聂伯罗/)) return "乌克兰";
    if (r(/白俄罗斯|🇧🇾|BY|Belarus|Minsk|明斯克/)) return "白俄罗斯";
    if (r(/捷克|🇨🇿|CZ|Czechia|Czech\s*Republic|Prague|Brno|布拉格|布尔诺/)) return "捷克共和国";
    if (r(/斯洛伐克|🇸🇰|SK|Slovakia|Bratislava|布拉迪斯拉发/)) return "斯洛伐克";
    if (r(/匈牙利|🇭🇺|HU|Hungary|Budapest|德布勒森|Debrecen|布达佩斯/)) return "匈牙利";
    if (r(/罗马尼亚|🇷🇴|RO|Romania|Bucharest|布加勒斯特|克卢日|Cluj/)) return "罗马尼亚";
    if (r(/保加利亚|🇧🇬|BG|Bulgaria|Sofia|Plovdiv|索非亚|普罗夫迪夫|瓦尔纳/)) return "保加利亚";
    if (r(/克罗地亚|🇭🇷|HR|Croatia|Zagreb|Split|萨格勒布|斯普利特/)) return "克罗地亚";
    if (r(/塞尔维亚|🇷🇸|RS|Serbia|Belgrade|贝尔格莱德|诺维萨德|Novi\s*Sad/)) return "塞尔维亚";
    if (r(/斯洛文尼亚|🇸🇮|SI|Slovenia|Ljubljana|卢布尔雅那/)) return "斯洛文尼亚";
    if (r(/爱沙尼亚|🇪🇪|EE|Estonia|Tallinn|塔林/)) return "爱沙尼亚";
    if (r(/拉脱维亚|🇱🇻|LV|Latvia|Riga|里加/)) return "拉脱维亚";
    if (r(/立陶宛|🇱🇹|LT|Lithuania|Vilnius|维尔纽斯/)) return "立陶宛";
    if (r(/爱尔兰|🇮🇪|IE|Ireland|Dublin|Cork|都柏林|科克/)) return "爱尔兰";
    if (r(/希腊|🇬🇷|GR|Greece|Athens|Thessaloniki|雅典|塞萨洛尼基|圣托里尼/)) return "希腊";
    if (r(/卢森堡|🇱🇺|LU|Luxembourg|卢森堡市/)) return "卢森堡";
    if (r(/摩纳哥|🇲🇨|MC|Monaco|蒙特卡洛/)) return "摩纳哥";
    if (r(/列支敦士登|🇱🇮|LI|Liechtenstein|Vaduz|瓦杜兹/)) return "列支敦士登";
    if (r(/马耳他|🇲🇹|MT|Malta|Valletta|瓦莱塔/)) return "马耳他";
    if (r(/塞浦路斯|🇨🇾|CY|Cyprus|Nicosia|Limassol|尼科西亚|利马索尔/)) return "塞浦路斯";
    // —— 大洋洲 ——
    if (r(/澳大利亚|澳洲|🇦🇺|AU|Australia|Sydney|Melbourne|Brisbane|Perth|Adelaide|Gold\s*Coast|Canberra|悉尼|墨尔本|布里斯班|珀斯|阿德莱德|黄金海岸|堪培拉/)) return "澳大利亚";
    if (r(/新西兰|纽西兰|🇳🇿|NZ|New\s*Zealand|Auckland|Wellington|Christchurch|奥克兰|惠灵顿|基督城/)) return "新西兰";
    if (r(/斐济|🇫🇯|FJ|Fiji|Suva|Nadi|苏瓦|楠迪/)) return "斐济";
    if (r(/巴布亚新几内亚|🇵🇬|PG|Papua\s*New\s*Guinea|Port\s*Moresby|莫尔兹比港/)) return "巴布亚新几内亚";
    // —— 中东 ——
    if (r(/土耳其|🇹🇷|TR|Turkey|Istanbul|Ankara|Izmir|伊斯坦布尔|安卡拉|伊兹密尔/)) return "土耳其";
    if (r(/阿联酋|阿联|🇦🇪|AE|United\s*Arab\s*Emirates|Dubai|Abu\s*Dhabi|Sharjah|迪拜|阿布扎比|沙迦/)) return "阿联酋";
    if (r(/沙特阿拉伯|沙特|🇸🇦|SA|Saudi\s*Arabia|Riyadh|Jeddah|Mecca|Medina|利雅得|吉达|麦加|麦地那/)) return "沙特阿拉伯";
    if (r(/以色列|🇮🇱|IL|Israel|Tel\s*Aviv|Jerusalem|Haifa|特拉维夫|耶路撒冷|海法/)) return "以色列";
    if (r(/伊朗|🇮🇷|IR|Iran|Tehran|Isfahan|Shiraz|Mashhad|德黑兰|伊斯法罕|设拉子|马什哈德/)) return "伊朗";
    if (r(/伊拉克|🇮🇶|IQ|Iraq|Baghdad|巴士拉|Basra|摩苏尔|Mosul|巴格达/)) return "伊拉克";
    if (r(/卡塔尔|🇶🇦|QA|Qatar|Doha|多哈/)) return "卡塔尔";
    if (r(/科威特|🇰🇼|KW|Kuwait|Kuwait\s*City|科威特城/)) return "科威特";
    if (r(/阿曼|🇴🇲|OM|Oman|Muscat|马斯喀特|塞拉莱/)) return "阿曼";
    if (r(/约旦|🇯🇴|JO|Jordan|Amman|安曼|亚喀巴|Aqaba/)) return "约旦";
    if (r(/黎巴嫩|🇱🇧|LB|Lebanon|Beirut|贝鲁特/)) return "黎巴嫩";
    if (r(/叙利亚|🇸🇾|SY|Syria|Damascus|Aleppo|大马士革|阿勒颇/)) return "叙利亚";
    if (r(/也门|🇾🇪|YE|Yemen|Sanaa|Aden|萨那|亚丁/)) return "也门";
    if (r(/阿富汗|🇦🇫|AF|Afghanistan|Kabul|喀布尔|赫拉特|Herat/)) return "阿富汗";
    if (r(/巴林|🇧🇭|BH|Bahrain|麦纳麦|Manama/)) return "巴林";
    // —— 非洲 ——
    if (r(/南非|🇿🇦|ZA|South\s*Africa|Cape\s*Town|Johannesburg|Durban|Pretoria|开普敦|约翰内斯堡|德班|比勒陀利亚/)) return "南非";
    if (r(/埃及|🇪🇬|EG|Egypt|Cairo|Alexandria|Luxor|开罗|亚历山大|卢克索/)) return "埃及";
    if (r(/尼日利亚|🇳🇬|NG|Nigeria|Lagos|Abuja|拉各斯|阿布贾/)) return "尼日利亚";
    if (r(/肯尼亚|🇰🇪|KE|Kenya|Nairobi|Mombasa|内罗毕|蒙巴萨/)) return "肯尼亚";
    if (r(/摩洛哥|🇲🇦|MA|Morocco|Casablanca|Rabat|Marrakech|卡萨布兰卡|拉巴特|马拉喀什/)) return "摩洛哥";
    if (r(/阿尔及利亚|🇩🇿|DZ|Algeria|Algiers|奥兰|阿尔及尔/)) return "阿尔及利亚";
    if (r(/突尼斯|🇹🇳|TN|Tunisia|Tunis|Sfax|突尼斯市|斯法克斯/)) return "突尼斯";
    if (r(/坦桑尼亚|🇹🇿|TZ|Tanzania|Dar\s*es\s*Salaam|达累斯萨拉姆|多多马/)) return "坦桑尼亚";
    if (r(/加纳|🇬🇭|GH|Ghana|Accra|Kumasi|阿克拉|库马西/)) return "加纳";
    if (r(/喀麦隆|🇨🇲|CM|Cameroon|Douala|Yaounde|杜阿拉|雅温得/)) return "喀麦隆";
    if (r(/科特迪瓦|象牙海岸|🇨🇮|CI|Cote\s*dIvoire|Ivory\s*Coast|Abidjan|阿比让|亚穆苏克罗/)) return "科特迪瓦";
    if (r(/塞内加尔|🇸🇳|SN|Senegal|Dakar|达喀尔/)) return "塞内加尔";
    if (r(/埃塞俄比亚|🇪🇹|ET|Ethiopia|Addis\s*Ababa|亚的斯亚贝巴/)) return "埃塞俄比亚";
    if (r(/利比亚|🇱🇾|LY|Libya|Tripoli|Benghazi|的黎波里|班加西/)) return "利比亚";
    if (r(/苏丹|🇸🇩|SD|Sudan|Khartoum|喀土穆/)) return "苏丹";
    if (r(/乌干达|🇺🇬|UG|Uganda|Kampala|坎帕拉/)) return "乌干达";
    if (r(/莫桑比克|🇲🇿|MZ|Mozambique|Maputo|马普托/)) return "莫桑比克";
    if (r(/津巴布韦|🇿🇼|ZW|Zimbabwe|Harare|哈拉雷|布拉瓦约/)) return "津巴布韦";
    if (r(/赞比亚|🇿🇲|ZM|Zambia|Lusaka|卢萨卡/)) return "赞比亚";
    if (r(/安哥拉|🇦🇴|AO|Angola|Luanda|罗安达/)) return "安哥拉";
    if (r(/索马里|🇸🇴|SO|Somalia|Mogadishu|摩加迪沙/)) return "索马里";
    // —— 其他 ——
    if (r(/格陵兰|🇬🇱|GL|Greenland|Nuuk|努克/)) return "格陵兰";
    if (r(/关岛|🇬🇺|GU|Guam|Hagatna|阿加尼亚/)) return "关岛";
    if (r(/波多黎各|🇵🇷|PR|Puerto\s*Rico|San\s*Juan|圣胡安/)) return "波多黎各";
    if (r(/留尼汪|🇷🇪|RE|Reunion|留尼汪岛|圣但尼/)) return "留尼汪";
    if (r(/特立尼达和多巴哥|🇹🇹|TT|Trinidad\s*and\s*Tobago|西班牙港/)) return "特立尼达和多巴哥";

    // ==== 第二层：ISO 2-letter（\b 词边界包裹；需要大写/小写完整出现，避免与中文单字同段混淆）====
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

    // ==== 最后一层：国内城市/省份/机场三字码（仅在所有显式国家名/ISO 码都不匹配时才作为兜底）
    //       这样可避免 #美国-上海中转01 被误判为"中国"（美国先匹配返回）
    //       城市名用边界判断，避免 sni/host 参数里出现 shanghai/beijing 等英文片段时被误判 ===
    if (r(/北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|苏州|天津|青岛|大连|厦门|长沙|郑州|济南|福州|合肥|南昌|南宁|昆明|贵阳|拉萨|乌鲁木齐|呼和浩特|银川|西宁|兰州|太原|沈阳|长春|哈尔滨/)) return "中国";
    if (r(/河北|河南|湖北|湖南|广东|广西|山东|山西|陕西|甘肃|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|四川|贵州|云南|海南|青海|内蒙古|新疆|西藏|宁夏/)) return "中国";
    if (r(/\b(PEK|PKX|SHA|PVG|SZX|CAN|CKG|TAO|TSN|DLC|HGH|NKG|CTU|WUH|XIY|KMG|CSX|HFE|FOC|NNG|KWE|LXA|URC|HET|INC|XNN|LHW|TYN|SHE|CGQ|HRB)\b/)) return "中国";

    return null;
}

async function fetchCountryByHost(host, fullLinkCtx) {
    if (!host) return "通用";
    try {
        // 通过 Worker 后端代理查询，避免浏览器 CORS 限制（原 ip-api.com 免费版不支持跨域）
        var ctxParam = fullLinkCtx ? ("&ctx=" + encodeURIComponent(fullLinkCtx)) : "";
        var apiUrl = "/api/geo-lookup?host=" + encodeURIComponent(host) + ctxParam;
        var res = await fetch(apiUrl, {
            method: "GET",
            credentials: "same-origin",
            cache: "force-cache"
        });
        if (res.ok) {
            var data = await res.json();
            if (data && data.label) return data.label;
        }
    } catch (e) {
        console.warn("后端地理查询失败，降级本地:", host, e);
    }
    // 兜底：本地文本再匹配一次（基于 fullLinkCtx 的锚点名/sni/host 等）
    try {
        var toSearch = (host || "") + " " + (fullLinkCtx || "");
        var localFallback = detectCountryFromText(toSearch);
        if (localFallback) return localFallback;
    } catch (_) {}
    // TLD兜底：从域名后缀猜（.cn→中国 .jp→日本 ...）即使联网失败也用
    try {
        var tldGuess = guessByTldLocal(host);
        if (tldGuess) return tldGuess;
    } catch (_) {}
    return "通用";
}

// 前端版 TLD 兜底（与后端 TLD_MAP 保持一致，仅做最常用识别，避免两端不同步的最小子集）
function guessByTldLocal(domain) {
    if (!domain || isIPv4(domain)) return "";
    var s = domain.toLowerCase();
    var parts = s.split(".");
    var n = parts.length;
    if (n < 1) return "";
    // 先试二级 TLD，再试一级
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

async function resolveCountryFromLink(link) {
    if (!link) return "通用";
    var textToSearch = link;
    try { textToSearch = decodeURIComponent(link); } catch(e) {}

    // 提取 host 一次（IP 或域名），供多个步骤复用
    var host = "";
    try { host = extractHostFromLink(link) || ""; } catch(_) {}

    // ============ 新识别优先级（按可靠性从高到低）============
    // 1) 锚点（#后面的备注）国家关键词匹配 —— 用户在锚点显式标注国家，可信度最高
    //    只匹配锚点（不匹配全文本），避免 sni/host 参数里的城市名干扰
    // 2) host 是 IPv4 → 前端本地 CIDR 识别（中国/港澳台），无网络依赖、最可靠
    // 3) host 是域名 → 前端本地 TLD 识别（.cn/.jp/.us...）
    // 4) 调后端做 DNS 解析 + ip-api 在线地理查询
    // 5) 全文本关键词匹配（兜底，由于易误判放在最后）
    // 6) 整段链接 TLD 兜底
    // ========================================================

    // 1) 锚点名识别（很多用户只在锚点写国家，例如 #美国01 / #🇯🇵东京）
    try {
        var hashIdx = textToSearch.indexOf("#");
        if (hashIdx >= 0 && hashIdx < textToSearch.length - 1) {
            var anchorName = textToSearch.slice(hashIdx + 1);
            var anchorGuess = detectCountryFromText(anchorName);
            if (anchorGuess) return anchorGuess;
            // 锚点名里的 TLD 兜底（如 example.com#东京JP）
            var tldAnchorGuess = guessByTldLocal(anchorName);
            if (tldAnchorGuess) return tldAnchorGuess;
        }
    } catch (_) {}

    // 2)+3) 本地 CIDR / TLD 识别（无网络依赖、可靠性最高）
    try {
        if (host) {
            if (isIPv4(host)) {
                // 私有/保留 IP 不直接返回，留给后续兜底（可能锚点空、只能返回通用）
                var localIpGuess = guessByLocalIpRangeFE(host);
                if (localIpGuess && localIpGuess !== "__PRIVATE__") {
                    return localIpGuess;  // 中国 / 香港 / 澳门 / 台湾
                }
            } else {
                // 域名走 TLD（明确的 ccTLD 如 .cn/.jp/.us 比备注可靠）
                var tldGuess = guessByTldLocal(host);
                if (tldGuess) return tldGuess;
            }
        }
    } catch (_) {}

    // 4) 调后端做 DNS+ip-api 在线查询（IPv4 优先；私有 IP 后端会直接返回通用）
    try {
        if (host) {
            var online = await fetchCountryByHost(host, textToSearch);
            if (online && online !== "通用") return online;
            // 后端给出通用，但 TLD 仍能给出更具体结果
            var tldHint = guessByTldLocal(host);
            if (tldHint) return tldHint;
            if (online) return online;
        } else {
            // 实在提不出 host，先用整段文本兜底 TLD
            var tldFallback = guessByTldLocal(link);
            if (tldFallback) return tldFallback;
        }
    } catch (e) {
        console.warn("联网国家识别异常:", e);
        try {
            var errTld = guessByTldLocal(host || link);
            if (errTld) return errTld;
        } catch (_) {}
    }

    // 5) 全文本关键词匹配（兜底，由于易误判放在最后；仅在前述步骤都失败时使用）
    try {
        var localResult = detectCountryFromText(textToSearch);
        if (localResult) return localResult;
    } catch (e) {
        console.warn("本地国家识别异常:", e);
    }

    // 6) 整段链接 TLD 最后兜底
    try {
        var lastTld = guessByTldLocal(link);
        if (lastTld) return lastTld;
    } catch (_) {}

    return "通用";
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
        'sk-convert':  'Socks5 / SK 格式转换工具'
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

    // direct 模式下隐藏的 DOM 元素
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
        btnSkConvert.classList.add('active');
    } else {
        skConvertSection.style.display = 'none';
        clashBtnGroup.style.display = 'flex';
        clashOutputSection.style.display = 'block';

        // 默认恢复所有 chain 子区块的显示（从 direct 切回 chain 时需要）
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
            // 直连模式：复用 chainConfigSection，隐藏订阅和中转策略组，重编号区块
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
    trackAction("SK转换工具：执行格式转换（IP|端口|账号|密码 → socks5://）");
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
        <div class="btn-card-actions">
            <button class="btn-action btn-lookup" onclick="manualLookupCard(\${nodeCount})">🔍 联网查询</button>
            <button class="btn-action btn-clear" onclick="clearNodeText('node-link-\${nodeCount}', 'node-country-\${nodeCount}', \${nodeCount})">🧹 清空</button>
            <button class="btn-action btn-remove" onclick="removeNodeCard('node-card-\${nodeCount}')">✕ 删除</button>
        </div>
        <div class="row" style="margin-bottom: 8px;">
            <div style="flex: 1;">
                <label>国家 / 地区标签 <span class="tag" id="node-tag-\${nodeCount}">🤖 自动识别</span><span class="tip-tag">⌨️ 下拉选择预设，或选"✎ 自定义"直接输入</span>:</label>
                <div class="country-wrap" id="country-wrap-\${nodeCount}">
                    <select id="node-country-\${nodeCount}" class="node-country" onchange="countrySelChanged(\${nodeCount})" style="flex:1;">
                        \${optionsHtml}
                        <option value="__custom__">✎ 自定义输入...</option>
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

// ========= 国家/地区：下拉选择 + 自定义输入 切换 =========
// 下拉选择变更：选预设 → 直接采用；选"✎ 自定义" → 切换到文本输入模式
function countrySelChanged(id) {
    var sel = document.getElementById(\`node-country-\${id}\`);
    if (!sel) return;
    if (sel.value === '__custom__') {
        // 切换到自定义输入
        sel.style.display = 'none';
        var custom = document.getElementById(\`country-custom-\${id}\`);
        var inp = document.getElementById(\`node-country-in-\${id}\`);
        if (custom) custom.style.display = 'flex';
        if (inp) { inp.value = ''; inp.focus(); }
        return;
    }
    markUserEdited(id);
}

// 自定义输入：每次输入都标记手动指定（YAML 生成时读 .country-in 的值）
function countryInputChanged(id) {
    markUserEdited(id);
}

// 自定义输入失焦：把输入值提交为 select 的一个新选项，并切回下拉模式
function commitCustomCountry(id) {
    var inp = document.getElementById(\`node-country-in-\${id}\`);
    var sel = document.getElementById(\`node-country-\${id}\`);
    if (!inp || !sel) return;
    var val = inp.value.trim();
    if (!val) {
        // 空值 → 直接切回下拉，选"通用"
        countryBackToSel(id, '通用');
        return;
    }
    // 检查该值是否已存在为 option
    var exists = false;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === val) { exists = true; break; }
    }
    if (!exists) {
        var opt = document.createElement('option');
        opt.value = val; opt.textContent = val;
        // 插入到"✎ 自定义..."之前（即倒数第 1 个位置之前）
        sel.insertBefore(opt, sel.options[sel.options.length - 1]);
    }
    sel.value = val;
    countryBackToSel(id, val);
}

// 从自定义输入切回下拉模式
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
        // 用户如果在查询过程中手动改了下拉/输入，就不再覆盖
        if (countrySelect && countrySelect.dataset.userEdited !== "true") {
            // 若返回值不在预设列表里，先添加为新 option 再选中
            var optionExists = false;
            try {
                optionExists = Array.from(countrySelect.options).some(function (opt) { return opt.value === res; });
            } catch (_) {}
            if (!optionExists && res && res !== '__custom__') {
                var newOpt = document.createElement('option');
                newOpt.value = res;
                newOpt.text = res;
                // 插入到"✎ 自定义..."之前（即最后一个 option 之前）
                countrySelect.insertBefore(newOpt, countrySelect.options[countrySelect.options.length - 1]);
            }
            countrySelect.value = res;
        }
        if (tag) tag.innerText = "🤖 自动识别";
    } catch (e) {
        console.warn("节点国家识别失败:", id, e);
        // 识别失败时至少恢复为通用兜底，不卡在"查询中..."
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
            // 转义反斜杠和双引号，防止 YAML 双引号字符串被突破导致字段注入
            const safe = String(val).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
            parts.push(\`\${key}: "\${safe}"\`);
        }
    }
    return \`{\${parts.join(', ')}}\`;
}

async function downloadYaml() {
    trackAction("主页：下载已生成的 OpenClash YAML 配置文件（保存到本地）");
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
    if (autoDownload) {
        trackAction("主页：生成并自动下载 OpenClash YAML 配置文件（完整文件）", "当前模式: " + currentMode);
    } else {
        trackAction("主页：生成并在页面内预览 OpenClash YAML 配置", "当前模式: " + currentMode);
    }
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.innerText = "⏳ 正在生成配置文件，请稍等...";

    // 生成随机 28 字符 Clash secret（替代硬编码弱密码）
    // 使用字符集 A-Z a-z 0-9，确保密码强度
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
        const subName1 = document.getElementById('stdSubName1').value.trim() || '主力代理';
        const subUrl1 = document.getElementById('stdSubUrl1').value.trim() || 'https://your-main-sub-domain.com/link/token';
        const enableBackup = document.getElementById('enableBackupSub').checked;
        const subName2 = document.getElementById('stdSubName2').value.trim() || '备用代理';
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
# 配置名称：OpenClash 标准故障转移分流配置
# 版本号：V0.2.5 (2026.08.28)
# 内核要求：Mihomo (Meta) Kernel
# ====================================================================

\${buildYamlBase(clashSecret)}

proxy-providers:
\${proxyProvidersBlock}

\${YAML_DNS_BLOCK}
\${YAML_TUN_BLOCK}
\${YAML_PROFILE_BLOCK}

proxy-groups:
  - name: "🚀 故障转移"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "♻️ 自动选择"
    type: url-test
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "💬 即时通讯"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🌐 社交媒体"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🚀 GitHub"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
      - "🎯 全球直连"
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🤖 ChatGPT"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🤖 AI服务"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎶 TikTok"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "📹 YouTube"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 Netflix"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 DisneyPlus"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 HBO"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 PrimeVideo"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 AppleTV+"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 Emby"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎻 Spotify"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "📺 Bahamut"
    type: fallback
    proxies:
      - "🇼🇸 台湾节点"
      - "🚀 故障转移"
      - "🎯 全球直连"
    exclude-filter: '(?i)(?:🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🌎 国外媒体"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🛒 国外电商"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "📢 谷歌FCM"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🇬 谷歌服务"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🍎 苹果服务"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
  - name: "Ⓜ️ 微软服务"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
  - name: "🎮 游戏平台"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
  - name: "🎮 Steam"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
  - name: "🚀 测速工具"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
  - name: "🐟 漏网之鱼"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🔀 非标端口"
    type: select
    proxies:
      - "🐟 漏网之鱼"
      - "🎯 全球直连"
  - name: "🇭🇰 香港节点"
    type: url-test
    filter: '(?i)(🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇺🇸 美国节点"
    type: url-test
    filter: '(?i)(🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇯🇵 日本节点"
    type: url-test
    filter: '(?i)(🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇸🇬 新加坡节点"
    type: url-test
    filter: '(?i)(🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇼🇸 台湾节点"
    type: url-test
    filter: '(?i)(🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇰🇷 韩国节点"
    type: url-test
    filter: '(?i)(🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
\${useProvidersForGroups}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🎯 全球直连"
    type: select
    url: http://wifi.vivo.com.cn/generate_204
    proxies:
      - DIRECT

rules:
  # ===== WebRTC 物理防泄漏 =====
  - "AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT"
  - "DOMAIN-KEYWORD,webrtc,REJECT"
  - "DOMAIN-KEYWORD,stun,REJECT"
  - "DOMAIN-SUFFIX,stun.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun1.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun2.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun3.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun4.l.google.com,REJECT"

  # ===== 银行/支付/政务/风控 强制直连 =====
  - "DOMAIN-SUFFIX,tongdun.net,🎯 全球直连"
  - "DOMAIN-SUFFIX,ishumei.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,geetest.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,dingxiangyun.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,unionpay.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,95516.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,alipay.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,wechat.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,wechatpay.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,tenpay.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,12306.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,chsi.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,chinatax.gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,mohrss.gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,gwy.gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,95559.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,95599.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,abchina.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,icbc.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,ccb.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,boc.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,cmbchina.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,citicbank.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,cib.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,spdb.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,cmbc.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,cebbank.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,hxb.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,psbc.com,🎯 全球直连"
  - "DOMAIN-KEYWORD,bank,🎯 全球直连"

  # ===== 国内核心基础服务直连 =====
  - "DOMAIN-SUFFIX,10086.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,10010.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,189.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,taobao.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,jd.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,douyin.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,bilibili.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,mi.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,midea.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,baidu.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,qq.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,meituan.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,dianping.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,amap.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,163.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,sohu.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,sina.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,mi-img.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,aqara.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,tplinkcloud.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,heislands.com,🎯 全球直连"

  - "GEOSITE,private,🎯 全球直连"
  - "GEOIP,private,🎯 全球直连,no-resolve"
  - "RULE-SET,Custom_Direct_Domain,🎯 全球直连"
  - "RULE-SET,Custom_Direct_IP,🎯 全球直连,no-resolve"
  - "RULE-SET,Custom_Direct_Port,🎯 全球直连"
  - "RULE-SET,Custom_Proxy_Domain,🚀 故障转移"
  - "RULE-SET,Custom_Proxy_IP,🚀 故障转移,no-resolve"
  - "GEOSITE,google-cn,🎯 全球直连"
  - "GEOSITE,category-games@cn,🎯 全球直连"
  - "RULE-SET,Steam_CDN_Domain,🎯 全球直连"
  - "RULE-SET,Steam_CDN_IP,🎯 全球直连,no-resolve"
  - "GEOSITE,category-game-platforms-download,🎯 全球直连"
  - "GEOSITE,category-public-tracker,🎯 全球直连"
  - "GEOSITE,category-communication,💬 即时通讯"
  - "GEOSITE,category-social-media-!cn,🌐 社交媒体"
  - "GEOSITE,openai,🤖 ChatGPT"
  - "GEOSITE,category-ai-!cn,🤖 AI服务"
  - "GEOSITE,github,🚀 GitHub"
  - "GEOSITE,category-speedtest,🚀 测速工具"
  - "GEOSITE,steam,🎮 Steam"
  - "GEOSITE,youtube,📹 YouTube"
  - "GEOSITE,apple-tvplus,🎥 AppleTV+"
  - "GEOSITE,apple,🍎 苹果服务"
  - "GEOSITE,microsoft,Ⓜ️ 微软服务"
  - "GEOSITE,googlefcm,📢 谷歌FCM"
  - "GEOSITE,google,🇬 谷歌服务"
  - "GEOSITE,tiktok,🎶 TikTok"
  - "GEOSITE,netflix,🎥 Netflix"
  - "GEOSITE,disney,🎥 DisneyPlus"
  - "GEOSITE,hbo,🎥 HBO"
  - "GEOSITE,primevideo,🎥 PrimeVideo"
  - "GEOSITE,category-emby,🎥 Emby"
  - "GEOSITE,spotify,🎻 Spotify"
  - "GEOSITE,bahamut,📺 Bahamut"
  - "GEOSITE,category-games,🎮 游戏平台"
  - "GEOSITE,category-entertainment,🌎 国外媒体"
  - "GEOSITE,category-ecommerce,🛒 国外电商"
  - "GEOSITE,gfw,🚀 故障转移"
  - "GEOIP,telegram,💬 即时通讯,no-resolve"
  - "GEOIP,twitter,🌐 社交媒体,no-resolve"
  - "GEOIP,facebook,🌐 社交媒体,no-resolve"
  - "GEOIP,google,🇬 谷歌服务,no-resolve"
  - "GEOIP,netflix,🎥 Netflix,no-resolve"
  # ===== 远程规则集（目标已映射到现有策略组）=====
  - "RULE-SET,Test / Domain,🚀 测速工具"
  - "RULE-SET,Block / Domain,REJECT"
  - "RULE-SET,ChatGPT / Domain,🤖 ChatGPT"
  - "RULE-SET,Claude / Domain,🤖 AI服务"
  - "RULE-SET,Meta AI / Domain,🤖 AI服务"
  - "RULE-SET,Perplexity / Domain,🤖 AI服务"
  - "RULE-SET,Copilot / Domain,🤖 AI服务"
  - "RULE-SET,Gemini / Domain,🤖 AI服务"
  - "RULE-SET,Groq / Domain,🤖 AI服务"
  - "RULE-SET,Grok / Domain,🤖 AI服务"
  - "RULE-SET,Reddit / Domain,🌐 社交媒体"
  - "RULE-SET,GitHub / Domain,🚀 GitHub"
  - "RULE-SET,Telegram / Domain,💬 即时通讯"
  - "RULE-SET,Telegram / IP,💬 即时通讯,no-resolve"
  - "RULE-SET,WhatsApp / Domain,💬 即时通讯"
  - "RULE-SET,Facebook / Domain,🌐 社交媒体"
  - "RULE-SET,Apple / Domain,🍎 苹果服务"
  - "RULE-SET,Apple-CN / Domain,🍎 苹果服务"
  - "RULE-SET,Microsoft / Domain,Ⓜ️ 微软服务"
  - "RULE-SET,OKX / Domain,🚀 故障转移"
  - "RULE-SET,Bybit / Domain,🚀 故障转移"
  - "RULE-SET,Binance / Domain,🚀 故障转移"
  - "RULE-SET,BiliBili / Domain,🎯 全球直连"
  - "RULE-SET,YouTube / Domain,📹 YouTube"
  - "RULE-SET,TikTok / Domain,🎶 TikTok"
  - "RULE-SET,Netflix / Domain,🎥 Netflix"
  - "RULE-SET,Netflix / IP,🎥 Netflix,no-resolve"
  - "DOMAIN-KEYWORD,netflix,🎥 Netflix"
  - "RULE-SET,Disney / Domain,🎥 DisneyPlus"
  - "RULE-SET,Amazon / Domain,🎥 PrimeVideo"
  - "RULE-SET,Crunchyroll / Domain,🌎 国外媒体"
  - "RULE-SET,Popcorn / Domain,🌎 国外媒体"
  - "RULE-SET,HBO / Domain,🎥 HBO"
  - "RULE-SET,Spotify / Domain,🎻 Spotify"
  - "RULE-SET,Steam / Domain,🎮 Steam"
  - "RULE-SET,Epic / Domain,🎮 游戏平台"
  - "RULE-SET,EA / Domain,🎮 游戏平台"
  - "RULE-SET,Blizzard / Domain,🎮 游戏平台"
  - "RULE-SET,UBI / Domain,🎮 游戏平台"
  - "RULE-SET,PlayStation / Domain,🎮 游戏平台"
  - "RULE-SET,Nintendo / Domain,🎮 游戏平台"
  - "RULE-SET,Google / Domain,🇬 谷歌服务"
  - "RULE-SET,Google / IP,🇬 谷歌服务,no-resolve"
  - "RULE-SET,Nvidia / Domain,🎮 游戏平台"
  - "RULE-SET,Proxy / Domain,🚀 故障转移"
  - "RULE-SET,Globe / Domain,🚀 故障转移"
  - "RULE-SET,Direct / Domain,🎯 全球直连"
  - "RULE-SET,China / Domain,🎯 全球直连"
  - "RULE-SET,China / IP,🎯 全球直连,no-resolve"
  - "RULE-SET,Private / Domain,🎯 全球直连"

  - "GEOSITE,cn,🎯 全球直连"
  - "GEOIP,cn,🎯 全球直连,no-resolve"
  - "RULE-SET,Nonstandard_Port_Direct,🔀 非标端口"
  - "MATCH,🐟 漏网之鱼"

rule-providers:
  Nonstandard_Port_Direct:
    behavior: classical
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Port_Direct.yaml"
    format: yaml
  Custom_Direct_Domain:
    behavior: domain
    interval: 1800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Direct_Domain.mrs"
    format: mrs
  Custom_Direct_IP:
    behavior: ipcidr
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Direct_IP.mrs"
    format: mrs
  Custom_Direct_Port:
    behavior: classical
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Direct_Classical_Port.yaml"
    format: yaml
  Custom_Proxy_Domain:
    behavior: domain
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Proxy_Domain.mrs"
    format: mrs
  Custom_Proxy_IP:
    behavior: ipcidr
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Proxy_IP.mrs"
    format: mrs
  Steam_CDN_Domain:
    behavior: domain
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Steam_CDN_Domain.mrs"
    format: mrs
  Steam_CDN_IP:
    behavior: ipcidr
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Steam_CDN_IP.mrs"
    format: mrs

  # ----- 远程规则集补充（自包含，无锚点依赖）-----
  Test / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Check.list"}
  Block / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Block.list"}
  ChatGPT / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/openai.mrs"}
  Claude / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Claude/Claude.list"}
  Meta AI / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/MetaAi.list"}
  Perplexity / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/perplexity.mrs"}
  Copilot / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Copilot.list"}
  Gemini / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Gemini.list"}
  Groq / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/groq.mrs"}
  Grok / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Grok.list"}
  Reddit / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/reddit.mrs"}
  GitHub / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/github.mrs"}
  Telegram / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/telegram.mrs"}
  Telegram / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/telegram.mrs"}
  WhatsApp / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Whatsapp/Whatsapp.list"}
  Facebook / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/facebook.mrs"}
  Apple / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple.mrs"}
  Apple-CN / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple-cn.mrs"}
  Microsoft / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/microsoft.mrs"}
  OKX / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/okx.mrs"}
  Bybit / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bybit.mrs"}
  Binance / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/binance.mrs"}
  BiliBili / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bilibili.mrs"}
  YouTube / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/youtube.mrs"}
  TikTok / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/tiktok.mrs"}
  Netflix / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/netflix.mrs"}
  Netflix / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/netflix.mrs"}
  Disney / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/disney.mrs"}
  Amazon / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/amazon.mrs"}
  Crunchyroll / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Crunchyroll.list"}
  Popcorn / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Popcorn.list"}
  HBO / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/hbo.mrs"}
  Spotify / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/spotify.mrs"}
  Steam / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/steam.mrs"}
  Epic / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Epic/Epic.list"}
  EA / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/EA/EA.list"}
  Blizzard / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Blizzard/Blizzard.list"}
  UBI / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/UBI/UBI.list"}
  PlayStation / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/PlayStation/PlayStation.list"}
  Nintendo / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nintendo/Nintendo.list"}
  Google / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/google.mrs"}
  Google / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/google.mrs"}
  Nvidia / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nvidia/Nvidia.list"}
  Proxy / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Proxy.list"}
  Globe / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Global/Global.list"}
  Direct / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Direct.list"}
  Private / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/private.mrs"}
  China / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/cn.mrs"}
  China / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/cn.mrs"}\`;

        document.getElementById('out-full').innerText = lastGeneratedYaml;
        statusMsg.innerText = '✅ V0.2.5 标准分流配置文件已生成！';

        if (autoDownload) {
            await downloadYaml();
        }
    } else {
        const isDirectMode = (currentMode === 'direct');
        const subName = isDirectMode ? '' : (document.getElementById('chainSubName').value.trim() || '主力代理');
        const subUrl = isDirectMode ? '' : (document.getElementById('subUrl').value.trim() || 'https://your-sub-domain.com/link/token');
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
                        // 自定义输入模式：读取文本输入框的值
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

        if (isDirectMode) {
            // ================================
            // 直连模式 YAML（无 proxy-providers / 无 dialer-proxy / 无策略组分流 / 无 rule-providers）
            // 仅保留：SRC-IP-CIDR 精准分流 + DIRECT 域名规则 + DNS/TUN 防泄漏
            // ================================
            lastGeneratedYaml = 
\`# ====================================================================
# 配置名称：OpenClash 直连模式 - 网段/单IP精准分流版
# 内核要求：Mihomo (Meta) Kernel 专属
# 架构方案：节点直连 + 指定设备IP/网段精准分流 + 防泄漏（无中转/无链式/无策略组分流）
# 说明：无订阅源 → 无聚合节点 → 域名级分流已失效，仅保留 SRC-IP-CIDR 源地址分流
# ====================================================================

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
\`# ====================================================================
# 配置名称：OpenClash 多设备/网段精准分流版
# 内核要求：Mihomo (Meta) Kernel 专属
# 架构方案：代理中转 + 独享住宅IP落地 + 指定设备IP/网段精准分流 + 防泄漏
# ====================================================================

\${buildYamlBase(clashSecret)}

proxy-providers:
  \${subName}:
    url: "\${subUrl}"
    type: http
    interval: 3600
    path: ./proxy_provider/provider1.yaml
    proxy: DIRECT
    filter: "^(?!.*(DIRECT|直接连接|群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|无法|说明|使用|提示|特别|访问|支持|教程|关注|更新|作者|加入|USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author|Traffic|GB|Expire)).*$"
    health-check:
      enable: true
      url: https://cp.cloudflare.com/generate_204
      interval: 300
      timeout: 5000
      lazy: false
      expected-status: 204
    override:
      udp: true

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
  - name: "🚀 故障转移"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "♻️ 自动选择"
    type: url-test
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "💬 即时通讯"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🌐 社交媒体"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🚀 GitHub"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
      - "🎯 全球直连"
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🤖 ChatGPT"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🤖 AI服务"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎶 TikTok"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "📹 YouTube"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 Netflix"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 DisneyPlus"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 HBO"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 PrimeVideo"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 AppleTV+"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎥 Emby"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🎻 Spotify"
    type: fallback
    proxies:
      - "🇸🇬 新加坡节点"
      - "🇯🇵 日本节点"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "📺 Bahamut"
    type: fallback
    proxies:
      - "🇼🇸 台湾节点"
      - "🚀 故障转移"
      - "🎯 全球直连"
    exclude-filter: '(?i)(?:🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🌎 国外媒体"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🛒 国外电商"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "📢 谷歌FCM"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🇬 谷歌服务"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🍎 苹果服务"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
  - name: "Ⓜ️ 微软服务"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
  - name: "🎮 游戏平台"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
  - name: "🎮 Steam"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
  - name: "🚀 测速工具"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
  - name: "🐟 漏网之鱼"
    type: fallback
    proxies:
      - "🇭🇰 香港节点"
      - "🇺🇸 美国节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🇼🇸 台湾节点"
      - "🇰🇷 韩国节点"
      - "♻️ 自动选择"
    exclude-filter: '(?i)(?:🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    timeout: 5000
    lazy: false
    expected-status: 204
  - name: "🔀 非标端口"
    type: select
    proxies:
      - "🐟 漏网之鱼"
      - "🎯 全球直连"
  - name: "🇭🇰 香港节点"
    type: url-test
    filter: '(?i)(🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇺🇸 美国节点"
    type: url-test
    filter: '(?i)(🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇯🇵 日本节点"
    type: url-test
    filter: '(?i)(🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇸🇬 新加坡节点"
    type: url-test
    filter: '(?i)(🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇼🇸 台湾节点"
    type: url-test
    filter: '(?i)(🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🇰🇷 韩国节点"
    type: url-test
    filter: '(?i)(🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)'
    use:
      - \${subName}
    url: https://cp.cloudflare.com/generate_204
    interval: 300
    tolerance: 50
  - name: "🎯 全球直连"
    type: select
    url: http://wifi.vivo.com.cn/generate_204
    proxies:
      - DIRECT

rules:
  # ===== WebRTC 物理防泄漏 =====
  - "AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT"
  - "DOMAIN-KEYWORD,webrtc,REJECT"
  - "DOMAIN-KEYWORD,stun,REJECT"
  - "DOMAIN-SUFFIX,stun.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun1.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun2.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun3.l.google.com,REJECT"
  - "DOMAIN-SUFFIX,stun4.l.google.com,REJECT"

\${rulesArr.join('\\n')}

  # ===== 银行/支付/政务/风控 强制直连 =====
  - "DOMAIN-SUFFIX,tongdun.net,🎯 全球直连"
  - "DOMAIN-SUFFIX,ishumei.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,geetest.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,dingxiangyun.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,unionpay.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,95516.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,alipay.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,wechat.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,wechatpay.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,tenpay.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,12306.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,chsi.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,chinatax.gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,mohrss.gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,gwy.gov.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,95559.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,95599.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,abchina.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,icbc.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,ccb.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,boc.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,cmbchina.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,citicbank.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,cib.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,spdb.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,cmbc.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,cebbank.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,hxb.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,psbc.com,🎯 全球直连"
  - "DOMAIN-KEYWORD,bank,🎯 全球直连"

  # ===== 国内核心基础服务直连 =====
  - "DOMAIN-SUFFIX,10086.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,10010.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,189.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,taobao.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,jd.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,douyin.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,bilibili.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,mi.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,midea.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,baidu.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,qq.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,meituan.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,dianping.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,amap.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,163.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,sohu.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,sina.com.cn,🎯 全球直连"
  - "DOMAIN-SUFFIX,mi-img.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,aqara.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,tplinkcloud.com,🎯 全球直连"
  - "DOMAIN-SUFFIX,heislands.com,🎯 全球直连"

  - "GEOSITE,private,🎯 全球直连"
  - "GEOIP,private,🎯 全球直连,no-resolve"
  - "RULE-SET,Custom_Direct_Domain,🎯 全球直连"
  - "RULE-SET,Custom_Direct_IP,🎯 全球直连,no-resolve"
  - "RULE-SET,Custom_Direct_Port,🎯 全球直连"
  - "RULE-SET,Custom_Proxy_Domain,🚀 故障转移"
  - "RULE-SET,Custom_Proxy_IP,🚀 故障转移,no-resolve"
  - "GEOSITE,google-cn,🎯 全球直连"
  - "GEOSITE,category-games@cn,🎯 全球直连"
  - "RULE-SET,Steam_CDN_Domain,🎯 全球直连"
  - "RULE-SET,Steam_CDN_IP,🎯 全球直连,no-resolve"
  - "GEOSITE,category-game-platforms-download,🎯 全球直连"
  - "GEOSITE,category-public-tracker,🎯 全球直连"
  - "GEOSITE,category-communication,💬 即时通讯"
  - "GEOSITE,category-social-media-!cn,🌐 社交媒体"
  - "GEOSITE,openai,🤖 ChatGPT"
  - "GEOSITE,category-ai-!cn,🤖 AI服务"
  - "GEOSITE,github,🚀 GitHub"
  - "GEOSITE,category-speedtest,🚀 测速工具"
  - "GEOSITE,steam,🎮 Steam"
  - "GEOSITE,youtube,📹 YouTube"
  - "GEOSITE,apple-tvplus,🎥 AppleTV+"
  - "GEOSITE,apple,🍎 苹果服务"
  - "GEOSITE,microsoft,Ⓜ️ 微软服务"
  - "GEOSITE,googlefcm,📢 谷歌FCM"
  - "GEOSITE,google,🇬 谷歌服务"
  - "GEOSITE,tiktok,🎶 TikTok"
  - "GEOSITE,netflix,🎥 Netflix"
  - "GEOSITE,disney,🎥 DisneyPlus"
  - "GEOSITE,hbo,🎥 HBO"
  - "GEOSITE,primevideo,🎥 PrimeVideo"
  - "GEOSITE,category-emby,🎥 Emby"
  - "GEOSITE,spotify,🎻 Spotify"
  - "GEOSITE,bahamut,📺 Bahamut"
  - "GEOSITE,category-games,🎮 游戏平台"
  - "GEOSITE,category-entertainment,🌎 国外媒体"
  - "GEOSITE,category-ecommerce,🛒 国外电商"
  - "GEOSITE,gfw,🚀 故障转移"
  - "GEOIP,telegram,💬 即时通讯,no-resolve"
  - "GEOIP,twitter,🌐 社交媒体,no-resolve"
  - "GEOIP,facebook,🌐 社交媒体,no-resolve"
  - "GEOIP,google,🇬 谷歌服务,no-resolve"
  - "GEOIP,netflix,🎥 Netflix,no-resolve"
  # ===== 远程规则集（目标已映射到现有策略组）=====
  - "RULE-SET,Test / Domain,🚀 测速工具"
  - "RULE-SET,Block / Domain,REJECT"
  - "RULE-SET,ChatGPT / Domain,🤖 ChatGPT"
  - "RULE-SET,Claude / Domain,🤖 AI服务"
  - "RULE-SET,Meta AI / Domain,🤖 AI服务"
  - "RULE-SET,Perplexity / Domain,🤖 AI服务"
  - "RULE-SET,Copilot / Domain,🤖 AI服务"
  - "RULE-SET,Gemini / Domain,🤖 AI服务"
  - "RULE-SET,Groq / Domain,🤖 AI服务"
  - "RULE-SET,Grok / Domain,🤖 AI服务"
  - "RULE-SET,Reddit / Domain,🌐 社交媒体"
  - "RULE-SET,GitHub / Domain,🚀 GitHub"
  - "RULE-SET,Telegram / Domain,💬 即时通讯"
  - "RULE-SET,Telegram / IP,💬 即时通讯,no-resolve"
  - "RULE-SET,WhatsApp / Domain,💬 即时通讯"
  - "RULE-SET,Facebook / Domain,🌐 社交媒体"
  - "RULE-SET,Apple / Domain,🍎 苹果服务"
  - "RULE-SET,Apple-CN / Domain,🍎 苹果服务"
  - "RULE-SET,Microsoft / Domain,Ⓜ️ 微软服务"
  - "RULE-SET,OKX / Domain,🚀 故障转移"
  - "RULE-SET,Bybit / Domain,🚀 故障转移"
  - "RULE-SET,Binance / Domain,🚀 故障转移"
  - "RULE-SET,BiliBili / Domain,🎯 全球直连"
  - "RULE-SET,YouTube / Domain,📹 YouTube"
  - "RULE-SET,TikTok / Domain,🎶 TikTok"
  - "RULE-SET,Netflix / Domain,🎥 Netflix"
  - "RULE-SET,Netflix / IP,🎥 Netflix,no-resolve"
  - "DOMAIN-KEYWORD,netflix,🎥 Netflix"
  - "RULE-SET,Disney / Domain,🎥 DisneyPlus"
  - "RULE-SET,Amazon / Domain,🎥 PrimeVideo"
  - "RULE-SET,Crunchyroll / Domain,🌎 国外媒体"
  - "RULE-SET,Popcorn / Domain,🌎 国外媒体"
  - "RULE-SET,HBO / Domain,🎥 HBO"
  - "RULE-SET,Spotify / Domain,🎻 Spotify"
  - "RULE-SET,Steam / Domain,🎮 Steam"
  - "RULE-SET,Epic / Domain,🎮 游戏平台"
  - "RULE-SET,EA / Domain,🎮 游戏平台"
  - "RULE-SET,Blizzard / Domain,🎮 游戏平台"
  - "RULE-SET,UBI / Domain,🎮 游戏平台"
  - "RULE-SET,PlayStation / Domain,🎮 游戏平台"
  - "RULE-SET,Nintendo / Domain,🎮 游戏平台"
  - "RULE-SET,Google / Domain,🇬 谷歌服务"
  - "RULE-SET,Google / IP,🇬 谷歌服务,no-resolve"
  - "RULE-SET,Nvidia / Domain,🎮 游戏平台"
  - "RULE-SET,Proxy / Domain,🚀 故障转移"
  - "RULE-SET,Globe / Domain,🚀 故障转移"
  - "RULE-SET,Direct / Domain,🎯 全球直连"
  - "RULE-SET,China / Domain,🎯 全球直连"
  - "RULE-SET,China / IP,🎯 全球直连,no-resolve"
  - "RULE-SET,Private / Domain,🎯 全球直连"

  - "GEOSITE,cn,🎯 全球直连"
  - "GEOIP,cn,🎯 全球直连,no-resolve"
  - "RULE-SET,Nonstandard_Port_Direct,🔀 非标端口"
  - "MATCH,🐟 漏网之鱼"

rule-providers:
  Nonstandard_Port_Direct:
    behavior: classical
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Port_Direct.yaml"
    format: yaml
  Custom_Direct_Domain:
    behavior: domain
    interval: 1800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Direct_Domain.mrs"
    format: mrs
  Custom_Direct_IP:
    behavior: ipcidr
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Direct_IP.mrs"
    format: mrs
  Custom_Direct_Port:
    behavior: classical
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Direct_Classical_Port.yaml"
    format: yaml
  Custom_Proxy_Domain:
    behavior: domain
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Proxy_Domain.mrs"
    format: mrs
  Custom_Proxy_IP:
    behavior: ipcidr
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Custom_Proxy_IP.mrs"
    format: mrs
  Steam_CDN_Domain:
    behavior: domain
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Steam_CDN_Domain.mrs"
    format: mrs
  Steam_CDN_IP:
    behavior: ipcidr
    interval: 28800
    type: http
    url: "https://cdn.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/rule/Steam_CDN_IP.mrs"
    format: mrs

  # ----- 远程规则集补充（自包含，无锚点依赖）-----
  Test / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Check.list"}
  Block / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Block.list"}
  ChatGPT / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/openai.mrs"}
  Claude / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Claude/Claude.list"}
  Meta AI / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/MetaAi.list"}
  Perplexity / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/perplexity.mrs"}
  Copilot / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Copilot.list"}
  Gemini / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Gemini.list"}
  Groq / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/groq.mrs"}
  Grok / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Grok.list"}
  Reddit / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/reddit.mrs"}
  GitHub / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/github.mrs"}
  Telegram / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/telegram.mrs"}
  Telegram / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/telegram.mrs"}
  WhatsApp / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Whatsapp/Whatsapp.list"}
  Facebook / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/facebook.mrs"}
  Apple / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple.mrs"}
  Apple-CN / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/apple-cn.mrs"}
  Microsoft / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/microsoft.mrs"}
  OKX / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/okx.mrs"}
  Bybit / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bybit.mrs"}
  Binance / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/binance.mrs"}
  BiliBili / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/bilibili.mrs"}
  YouTube / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/youtube.mrs"}
  TikTok / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/tiktok.mrs"}
  Netflix / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/netflix.mrs"}
  Netflix / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/netflix.mrs"}
  Disney / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/disney.mrs"}
  Amazon / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/amazon.mrs"}
  Crunchyroll / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Crunchyroll.list"}
  Popcorn / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Popcorn.list"}
  HBO / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/hbo.mrs"}
  Spotify / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/spotify.mrs"}
  Steam / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/steam.mrs"}
  Epic / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Epic/Epic.list"}
  EA / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/EA/EA.list"}
  Blizzard / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Blizzard/Blizzard.list"}
  UBI / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/UBI/UBI.list"}
  PlayStation / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/PlayStation/PlayStation.list"}
  Nintendo / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nintendo/Nintendo.list"}
  Google / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/google.mrs"}
  Google / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/google.mrs"}
  Nvidia / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Nvidia/Nvidia.list"}
  Proxy / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Proxy.list"}
  Globe / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Global/Global.list"}
  Direct / Domain: {type: http, interval: 86400, behavior: classical, format: text, url: "https://fastly.jsdelivr.net/gh/liandu2024/clash@main/list/Direct.list"}
  Private / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/private.mrs"}
  China / Domain: {type: http, interval: 86400, behavior: domain, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geosite/cn.mrs"}
  China / IP: {type: http, interval: 86400, behavior: ipcidr, format: mrs, url: "https://fastly.jsdelivr.net/gh/metacubex/meta-rules-dat@meta/geo/geoip/cn.mrs"}\`;

        document.getElementById('out-full').innerText = lastGeneratedYaml;
        statusMsg.innerText = '✅ 链式代理配置文件已生成！';

        if (autoDownload) {
            await downloadYaml();
        }
        } // end of else (chain mode)
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
