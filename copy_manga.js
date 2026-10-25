class CopyManga extends ComicSource {

    name = "拷贝漫画"

    key = "copy_manga"

    version = "3.5.0"

    minAppVersion = "1.6.0"

    url = "https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/copy_manga.js"

    static defaultImageQuality = "1500"

    static defaultApiHost = 'api.copy202601.com'
    static defaultContentHost = 'mapi.hotmangasg.com'
    static get defaultContentRoutes() {
        return [
            [CopyManga.defaultContentHost, 'mapi.hotmangasd.com', 'mapi.hotmangasf.com'],
            ['mapi.elfgjfghkk.club', 'mapi.fgjfghkkcenter.club', 'mapi.fgjfghkk.club'],
        ]
    }
    static defaultLoginHost = 'copy4000.com'
    static defaultCopyAppVersion = '3.0.9'
    static defaultCopyVersionCode = '83'
    static defaultWebUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0'
    static defaultWebSecChUa = '"Microsoft Edge";v="155", "Chromium";v="155", "Not(A:Brand";v="24"'
    static defaultWebAcceptLanguage = 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6,ru;q=0.5,ja;q=0.4,zh-TW;q=0.3'

    get webHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
    }

    // 拷贝 App 账号接口头（收藏等），无需签名。
    get apiHeaders() {
        let token = this.loadData("token") || ""
        let headers = {
            "User-Agent": `COPY/${this.copyAppVersion}`,
            "Accept": "application/json",
            "source": "copyApp",
            "platform": "3",
            "region": "1",
            "version": this.copyAppVersion,
            "versioncode": this.copyVersionCode,
            "webp": "1",
            "device": this.device,
            "deviceinfo": this.deviceinfo,
            "pseudoid": this.pseudoid,
        }
        if (token) {
            headers["Authorization"] = `Token ${token}`
        }
        return headers
    }

    // network2 刷新专用签名头，不用于登录、收藏或公共漫画请求。
    get networkHeaders() {
        let token = this.loadData("token") || ""
        let now = new Date()
        let year = now.getFullYear()
        let month = (now.getMonth() + 1).toString().padStart(2, '0')
        let day = now.getDate().toString().padStart(2, '0')
        let ts = Math.floor(now.getTime() / 1000).toString()
        let signature = Convert.hmacString(
            "3af08590311032efe0660550a0563a53",
            ts,
            "sha256"
        )
        return {
            "User-Agent": `COPY/${this.copyAppVersion}`,
            "source": "copyApp",
            "deviceinfo": this.deviceinfo,
            "dt": `${year}.${month}.${day}`,
            "platform": "3",
            "referer": `com.copymanga.app-${this.copyAppVersion}`,
            "version": this.copyAppVersion,
            "device": this.device,
            "pseudoid": this.pseudoid,
            "Accept": "application/json",
            "region": "0",
            "authorization": `Token${token ? ` ${token}` : ""}`,
            "umstring": "b4c89ca4104ea9a97750314d791520ac",
            "x-auth-timestamp": ts,
            "x-auth-signature": signature,
        }
    }

    // 线路节点公开漫画接口头（首页/搜索/列表/详情/章节），无需登录。
    get contentHeaders() {
        return {
            "Accept": "application/json",
            "platform": "3",
            "User-Agent": "Mozilla/5.0 (Linux; Android 15; 23113RKC6C Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.200 Mobile Safari/537.36",
            "webp": "1",
            "version": "2024.04.28",
            "X-Requested-With": "com.manga2020.app",
        }
    }

    get deviceinfo() {
        let info = this.loadData("_deviceinfo")
        if (!info) {
            info = CopyManga.generateDeviceInfo()
            this.saveData("_deviceinfo", info)
        }
        return info
    }

    get device() {
        let dev = this.loadData("_device")
        if (!dev) {
            dev = CopyManga.generateDevice()
            this.saveData("_device", dev)
        }
        return dev
    }

    get pseudoid() {
        let pid = this.loadData("_pseudoid")
        if (!pid) {
            pid = CopyManga.generatePseudoid()
            this.saveData("_pseudoid", pid)
        }
        return pid
    }

    static generateDeviceInfo() {
        return `${randomInt(1000000, 9999999)}V-${randomInt(1000, 9999)}`
    }

    static generateDevice() {
        const randCharA = () => String.fromCharCode(65 + randomInt(0, 25))
        const randDigit = () => String.fromCharCode(48 + randomInt(0, 9))
        return randCharA() + randCharA() + randDigit() + randCharA() + "." +
            randDigit() + randDigit() + randDigit() + randDigit() + randDigit() + randDigit() + "." +
            randDigit() + randDigit() + randDigit()
    }

    static generatePseudoid() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let pseudoid = ""
        for (let i = 0; i < 16; i++) {
            pseudoid += chars.charAt(randomInt(0, chars.length - 1))
        }
        return pseudoid
    }

    // 清除后，下次构造 COPY 请求头时重新生成并持久化。
    clearDeviceInfo() {
        this.deleteData("_deviceinfo")
        this.deleteData("_device")
        this.deleteData("_pseudoid")
    }

    afterRequest() {
        if (this.loadSetting('auto_clear_device_info') === true) {
            this.clearDeviceInfo()
        }
    }

    async networkGet(url, headers) {
        try {
            return await Network.get(url, headers)
        } finally {
            this.afterRequest()
        }
    }

    async networkPost(url, headers, data) {
        try {
            return await Network.post(url, headers, data)
        } finally {
            this.afterRequest()
        }
    }

    async refreshAppApi() {
        const url = "https://api.copy-manga.com/api/v3/system/network2?platform=3"
        let res = await this.networkGet(url, this.networkHeaders)
        if (res.status === 200) {
            let data = JSON.parse(res.body)
            let host = data.results && Array.isArray(data.results.api) &&
                Array.isArray(data.results.api[0])
                ? data.results.api[0][0]
                : null
            if (host) {
                this.saveData("_app_api_host", host)
            }
        }
    }

    _loadOptionalSetting(key) {
        try {
            return this.loadSetting(key)
        } catch (e) {
            return null
        }
    }

    get apiUrl() {
        const saved = this.loadSetting('base_url')
        const custom = this._loadOptionalSetting('custom_api_hosts')
        const override = this._loadOptionalSetting('base_url_override')
        const hasOverride = override === true || override === 'true' ||
            (Array.isArray(custom) && custom.includes(saved))
        const refreshed = this.loadData("_app_api_host")
        const host = hasOverride && saved ? saved : refreshed || CopyManga.defaultApiHost
        return `https://${host}`
    }

    get contentUrl() {
        const mode = this._loadOptionalSetting('content_selection_mode') || 'route'
        if (mode === 'node') {
            const host = this._loadOptionalSetting('content_host')
            if (host) return `https://${host}`
        }
        const routes = CopyManga.defaultContentRoutes
        let routeIndex = Number(this._loadOptionalSetting('content_route') || 0)
        if (!Number.isInteger(routeIndex) || routeIndex < 0 || routeIndex >= routes.length) {
            routeIndex = 0
        }
        const route = routes[routeIndex]
        const host = Array.isArray(route) && route.length > 0
            ? route[0]
            : CopyManga.defaultContentHost
        return `https://${host || CopyManga.defaultContentHost}`
    }

    get loginUrl() {
        return `https://${this.loadSetting('login_url')}`
    }

    get copyAppVersion() {
        return this.loadSetting('app_version') || CopyManga.defaultCopyAppVersion
    }

    get copyVersionCode() {
        let value = this.loadSetting('version_code')
        let digits = value ? String(value).replace(/\D/g, '') : ''
        return digits || CopyManga.defaultCopyVersionCode
    }

    get imageQuality() {
        return this.loadSetting('image_quality') || CopyManga.defaultImageQuality
    }

    init() {
        this.author_path_word_dict = {}
        this.theme_path_word_dict = {}
        this.account.loginWithWebview.url = `https://${CopyManga.defaultLoginHost}/web/login`
    }

    _encodeBase64(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        let result = ''
        let i = 0
        while (i < str.length) {
            const a = str.charCodeAt(i++)
            const b = i < str.length ? str.charCodeAt(i++) : 0
            const c = i < str.length ? str.charCodeAt(i++) : 0
            const bitmap = (a << 16) | (b << 8) | c
            result += chars.charAt((bitmap >> 18) & 63)
            result += chars.charAt((bitmap >> 12) & 63)
            result += (i > str.length + 1) ? '=' : chars.charAt((bitmap >> 6) & 63)
            result += (i > str.length) ? '=' : chars.charAt(bitmap & 63)
        }
        return result
    }

    _formatPopularCount(value) {
        let count = Number(value);
        if (!Number.isFinite(count) || count <= 0) return '';
        if (count >= 100000000) {
            return `${(count / 100000000).toFixed(1)}亿`;
        }
        if (count >= 10000) {
            return `${(count / 10000).toFixed(1)}万`;
        }
        return `${Math.trunc(count)}`;
    }

    /// 把 /api/v3 接口返回的漫画对象转成 PicaComic 卡片模型（自动处理 {comic:{...}} 嵌套）。
    _toComicBrief(comic) {
        if (!comic) return null
        if (comic["comic"] !== null && comic["comic"] !== undefined) {
            comic = comic["comic"]
        }
        let tags = []
        if (Array.isArray(comic["theme"])) {
            tags = comic["theme"].map(t => t["name"])
        }
        let author = null
        if (Array.isArray(comic["author"]) && comic["author"].length > 0) {
            author = comic["author"][0]["name"]
        }
        return {
            id: comic["path_word"],
            title: comic["name"],
            subTitle: author,
            cover: comic["cover"],
            tags: tags,
            description: comic["datetime_updated"] || ''
        }
    }

    /// 通过作者名解析作者 path_word（slug）。搜索接口返回的 author.path_word 是 slug。
    async _resolveAuthorPathWord(authorName) {
        if (!authorName) return null
        if (this.author_path_word_dict[authorName]) return this.author_path_word_dict[authorName]
        let res = await this.networkGet(
            `${this.contentUrl}/api/v3/search/comic?platform=3&q=${encodeURIComponent(authorName)}&q_type=author&limit=5&offset=0&free_type=1&_update=true`,
            this.contentHeaders
        )
        if (res.status !== 200) return null
        let data = JSON.parse(res.body)
        let list = data.results && data.results.list ? data.results.list : []
        for (let item of list) {
            let author = Array.isArray(item.author) && item.author.length > 0 ? item.author[0] : null
            if (author && author.path_word) {
                this.author_path_word_dict[authorName] = author.path_word
            }
        }
        return this.author_path_word_dict[authorName] || null
    }

    async _loadAuthorComics(slug, page) {
        let limit = 30
        let res = await this.networkGet(
            `${this.contentUrl}/api/v3/comics?free_type=1&limit=${limit}&offset=${(page - 1) * limit}&ordering=-popular&author=${encodeURIComponent(slug)}`,
            this.contentHeaders
        )
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`;
        }
        let data = JSON.parse(res.body)
        let comics = (data.results && data.results.list || []).map(c => this._toComicBrief(c)).filter(Boolean)
        let total = data.results && data.results.total ? data.results.total : 0
        return { comics: comics, maxPage: total > 0 ? Math.ceil(total / limit) : 1 }
    }

    /// 主题漫画列表。filter: "*all-全部" / "0-日漫" / "1-韩漫" / "2-美漫" / "finish-已完结"。
    async _loadThemeComics(theme, page, filter = "*all", ordering = "*datetime_updated") {
        let limit = 30
        let ord = ordering.replace("*", "-")
        let params = `free_type=1&limit=${limit}&offset=${(page - 1) * limit}&ordering=${ord}`
        if (theme) {
            params += `&theme=${encodeURIComponent(theme)}`
        }
        if (filter && filter !== "*all") {
            let value = filter.replace("*", "")
            if (value === "finish") {
                params += `&top=finish`
            } else if (value === "1") {
                params += `&top=korea`
            } else if (value === "2") {
                params += `&top=west`
            }
            // "0"（日漫）等价不传 top（kira 实测 japan 与不传等价返回全量）
        }
        let res = await this.networkGet(`${this.contentUrl}/api/v3/comics?${params}`, this.contentHeaders)
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`;
        }
        let data = JSON.parse(res.body)
        let comics = (data.results && data.results.list || []).map(c => this._toComicBrief(c)).filter(Boolean)
        let total = data.results && data.results.total ? data.results.total : 0
        return { comics: comics, maxPage: total > 0 ? Math.ceil(total / limit) : 1 }
    }

    async _loadRankComics(audience, date, page) {
        let limit = 30
        let res = await this.networkGet(
            `${this.contentUrl}/api/v3/ranks?type=1&date_type=${date}&limit=${limit}&offset=${(page - 1) * limit}&audience_type=${audience}&platform=3`,
            this.contentHeaders
        )
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`;
        }
        let data = JSON.parse(res.body)
        let list = data.results && data.results.list ? data.results.list : []
        let comics = list.map((item, i) => {
            let brief = this._toComicBrief(item)
            if (brief) {
                brief.description = `#${item.sort || i + 1} 热度 ${this._formatPopularCount(item.popular)}`
            }
            return brief
        }).filter(Boolean)
        let total = data.results && data.results.total ? data.results.total : 0
        return { comics: comics, maxPage: total > 0 ? Math.ceil(total / limit) : 1 }
    }

    async _searchByQuery(keyword, options, page) {
        let limit = 30
        let q_type = (options && options[0] && options[0] !== "-") ? options[0] : ""
        let extra = q_type ? `&q_type=${q_type}` : ""
        let res = await this.networkGet(
            `${this.contentUrl}/api/v3/search/comic?platform=3&q=${encodeURIComponent(keyword)}&limit=${limit}&offset=${(page - 1) * limit}&free_type=1&_update=true${extra}`,
            this.contentHeaders
        )
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`;
        }
        let data = JSON.parse(res.body)
        let comics = (data.results && data.results.list || []).map(c => this._toComicBrief(c)).filter(Boolean)
        let total = data.results && data.results.total ? data.results.total : 0
        return { comics: comics, maxPage: total > 0 ? Math.ceil(total / limit) : 1 }
    }

    /// account
    /// set this to null to desable account feature
    account = {
        login: async (account, pwd) => {
            Network.deleteCookies(this.loginUrl)

            let salt = 100000 + randomInt(0, 900000)
            let base64 = this._encodeBase64(`${pwd}-${salt}`)

            // 官网网页登录接口头，按 kira copyLogin 抓包 1:1 复刻浏览器指纹，
            // 避免因缺 sec-ch-ua 等头被服务端误判为破解版。
            let headers = {
                "sec-ch-ua-platform": '"Windows"',
                "user-agent": CopyManga.defaultWebUserAgent,
                "accept": "application/json, text/plain, */*",
                "sec-ch-ua": CopyManga.defaultWebSecChUa,
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "sec-ch-ua-mobile": "?0",
                "platform": "2",
                "origin": this.loginUrl,
                "sec-fetch-site": "same-origin",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                "referer": `${this.loginUrl}/web/login/loginByAccount?url=person%2Fhome`,
                "accept-language": CopyManga.defaultWebAcceptLanguage,
                "cookie": "webp=1",
                "priority": "u=1, i",
            }

            let res = await this.networkPost(
                `${this.loginUrl}/api/kb/web/login`,
                headers,
                `username=${encodeURIComponent(account)}&password=${encodeURIComponent(base64)}&salt=${salt}&platform=2&version=2025.12.10&source=freeSite`
            );

            if (res.status === 200) {
                let data = JSON.parse(res.body)
                if (data.code === 200) {
                    let token = data.results.token
                    this.saveData('token', token)

                    let domain = this.loginUrl.replace('https://', '').replace('http://', '').split('/')[0]
                    let cookiesToSet = [new Cookie({name: 'token', value: token, domain: domain})]
                    if (data.results.username) {
                        cookiesToSet.push(new Cookie({name: 'name', value: data.results.username, domain: domain}))
                    }
                    if (data.results.user_id) {
                        cookiesToSet.push(new Cookie({name: 'user_id', value: data.results.user_id, domain: domain}))
                    }
                    Network.setCookies(this.loginUrl, cookiesToSet)

                    return "ok"
                }
                throw data.message || '登录失败'
            }
            throw `Invalid status code: ${res.status}`
        },
        loginWithWebview: {
            url: "",
            checkStatus: (url, title) => {
                let cookies = Network.getCookies(this.loginUrl)
                for (let cookie of cookies) {
                    if (cookie.name === 'token' && cookie.value) {
                        this.saveData('token', cookie.value)
                        return true
                    }
                }
                return false
            },
            onLoginSuccess: () => {
                let cookies = Network.getCookies(this.loginUrl)
                for (let cookie of cookies) {
                    if (cookie.name === 'token' && cookie.value) {
                        this.saveData('token', cookie.value)
                        break
                    }
                }
            },
        },
        logout: () => {
            this.deleteData('token')
            Network.deleteCookies(this.loginUrl)
        },
        registerWebsite: null
    }

    /// explore pages
    explore = [
        {
            title: "拷贝漫画",
            type: "singlePageWithMultiPart",
            load: async () => {
                let [homeRes, latestRes] = await Promise.all([
                    this.networkGet(
                        `${this.contentUrl}/api/v3/h5/discoverIndex/freeComic?platform=3&_update=true`,
                        this.contentHeaders
                    ),
                    this.networkGet(
                        `${this.contentUrl}/api/v3/comics?free_type=1&limit=6&offset=0&ordering=-datetime_updated`,
                        this.contentHeaders
                    )
                ]);
                if (homeRes.status !== 200) {
                    throw `Invalid status code: ${homeRes.status}`;
                }
                if (latestRes.status !== 200) {
                    throw `Invalid status code: ${latestRes.status}`;
                }

                let homeResults = JSON.parse(homeRes.body).results || {};
                let latestResults = JSON.parse(latestRes.body).results || {};
                let result = {};
                let pick = (list) => {
                    if (!Array.isArray(list)) return [];
                    return list.map(c => this._toComicBrief(c)).filter(Boolean);
                }

                let rec = pick(homeResults.recs && homeResults.recs.list);
                if (rec.length > 0) result["推荐"] = rec;

                let latest = pick(latestResults.list);
                if (latest.length > 0) result["最近更新"] = latest;

                return result;
            }
        }
    ]

    static category_param_dict = {
        "全部": "",
        "愛情": "aiqing",
        "歡樂向": "huanlexiang",
        "冒險": "maoxian",
        "奇幻": "qihuan",
        "百合": "baihe",
        "校园": "xiaoyuan",
        "科幻": "kehuan",
        "東方": "dongfang",
        "耽美": "danmei",
        "生活": "shenghuo",
        "格鬥": "gedou",
        "轻小说": "qingxiaoshuo",
        "悬疑": "xuanyi",
        "其他": "qita",
        "神鬼": "shengui",
        "职场": "zhichang",
        "TL": "teenslove",
        "萌系": "mengxi",
        "治愈": "zhiyu",
        "長條": "changtiao",
        "四格": "sige",
        "节操": "jiecao",
        "舰娘": "jianniang",
        "竞技": "jingji",
        "搞笑": "gaoxiao",
        "伪娘": "weiniang",
        "热血": "rexue",
        "励志": "lizhi",
        "性转换": "xingzhuanhuan",
        "彩色": "COLOR",
        "後宮": "hougong",
        "美食": "meishi",
        "侦探": "zhentan",
        "AA": "aa",
        "音乐舞蹈": "yinyuewudao",
        "魔幻": "mohuan",
        "战争": "zhanzheng",
        "历史": "lishi",
        "异世界": "yishijie",
        "惊悚": "jingsong",
        "机战": "jizhan",
        "都市": "dushi",
        "穿越": "chuanyue",
        "恐怖": "kongbu",
        "C100": "comiket100",
        "重生": "chongsheng",
        "C99": "comiket99",
        "C101": "comiket101",
        "C97": "comiket97",
        "C96": "comiket96",
        "生存": "shengcun",
        "宅系": "zhaixi",
        "武侠": "wuxia",
        "C98": "C98",
        "C95": "comiket95",
        "FATE": "fate",
        "转生": "zhuansheng",
        "無修正": "Uncensored",
        "仙侠": "xianxia",
        "LoveLive": "loveLive"
    }

    category = {
        title: "拷贝漫画",
        parts: [
            {
                name: "拷贝漫画",
                type: "fixed",
                categories: ["排行"],
                categoryParams: ["ranking"],
                itemType: "category"
            },
            {
                name: "主题",
                type: "fixed",
                categories: Object.keys(CopyManga.category_param_dict),
                categoryParams: Object.values(CopyManga.category_param_dict),
                itemType: "category"
            }
        ]
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            if (param && param.startsWith("author:")) {
                let slug = param.substring("author:".length);
                if (!slug) {
                    throw `无法找到作者: ${category}`;
                }
                return this._loadAuthorComics(slug, page);
            }

            if (category.startsWith("author:")) {
                let authorName = category.substring("author:".length);
                let slug = await this._resolveAuthorPathWord(authorName);
                if (!slug) {
                    throw `无法找到作者: ${authorName}`;
                }
                return this._loadAuthorComics(slug, page);
            }

            if (category === "排行" || param === "ranking") {
                let audience = options[0] || "male";
                let date = options[1] || "week";
                return this._loadRankComics(audience, date, page);
            }

            let theme = (param && param !== "ranking") ? param : "";
            return this._loadThemeComics(theme, page, options[0] || "*all", options[1] || "*datetime_updated");
        },
        optionList: [
            {
                options: [
                    "*all-全部",
                    "0-日漫",
                    "1-韩漫",
                    "2-美漫",
                    "finish-已完结"
                ],
                notShowWhen: null,
                showWhen: Object.keys(CopyManga.category_param_dict)
            },
            {
                options: [
                    "*datetime_updated-时间倒序",
                    "datetime_updated-时间正序",
                    "*popular-热度倒序",
                    "popular-热度正序",
                ],
                notShowWhen: null,
                showWhen: Object.keys(CopyManga.category_param_dict)
            },
            {
                options: [
                    "male-男频",
                    "female-女频"
                ],
                notShowWhen: null,
                showWhen: ["排行"]
            },
            {
                options: [
                    "day-上升最快",
                    "week-最近7天",
                    "month-最近30天",
                    "total-總榜單"
                ],
                notShowWhen: null,
                showWhen: ["排行"]
            }
        ]
    }

    search = {
        load: async (keyword, options, page) => {
            return this._searchByQuery(keyword, options, page);
        },
        optionList: [
            {
                type: "select",
                options: [
                    "-全部",
                    "name-名称",
                    "author-作者",
                    "local-汉化组"
                ],
                label: "搜索选项"
            }
        ]
    }

    favorites = {
        multiFolder: false,
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            let is_collect = isAdding ? 1 : 0
            let comicData = await this.networkGet(
                `${this.contentUrl}/api/v3/comic2/${comicId}?platform=3`,
                this.contentHeaders
            )
            if (comicData.status !== 200) {
                throw `Invalid status code: ${comicData.status}`
            }
            let comic_id = JSON.parse(comicData.body).results.comic.uuid
            let res = await this.networkPost(
                `${this.apiUrl}/api/v3/member/collect/comic`,
                {
                    ...this.apiHeaders,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                },
                `comic_id=${comic_id}&is_collect=${is_collect}`
            )
            if (res.status === 401) {
                throw `Login expired`;
            }
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }
            return "ok"
        },
        loadComics: async (page, folder) => {
            let ordering = this.loadSetting('favorites_ordering') || '-datetime_updated';
            let res = await this.networkGet(
                `${this.apiUrl}/api/v3/member/collect/comics?limit=30&offset=${(page - 1) * 30}&free_type=1&ordering=${ordering}&platform=3`,
                this.apiHeaders
            )

            if (res.status === 401) {
                throw `Login expired`
            }

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let data = JSON.parse(res.body)
            let comics = (data.results && data.results.list || []).map(c => this._toComicBrief(c)).filter(Boolean)
            let total = data.results && data.results.total ? data.results.total : 0

            return {
                comics: comics,
                maxPage: total > 0 ? Math.ceil(total / 30) : 1
            }
        }
    }

    comic = {
        loadInfo: async (id) => {
            let res = await this.networkGet(`${this.contentUrl}/api/v3/comic2/${id}?platform=3`, this.contentHeaders);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);
            if (!data.results || !data.results.comic) {
                throw '漫画信息为空';
            }
            let comic = data.results.comic;
            let groups = data.results.groups || {};

            let title = comic.name || '';
            let popularText = this._formatPopularCount(comic.popular);
            let cover = comic.cover || '';
            let authors = [];
            for (let author of comic.author || []) {
                if (!author || !author.name) continue;
                authors.push(author.name);
                if (author.path_word) {
                    this.author_path_word_dict[author.name] = author.path_word;
                }
            }
            let tags = [];
            for (let theme of comic.theme || []) {
                if (!theme || !theme.name) continue;
                tags.push(theme.name);
                if (theme.path_word) {
                    this.theme_path_word_dict[theme.name] = theme.path_word;
                }
            }
            let description = comic.brief || '';
            let status = (comic.status && comic.status.display) ? comic.status.display : '';
            let updateTime = comic.datetime_updated || '';

            // 分页拉取每个分组下的全部章节
            let chapters = {};
            let groupKeys = Object.keys(groups);
            for (let gKey of groupKeys) {
                let group = groups[gKey];
                let groupName = group.name || gKey;
                let allChapters = [];
                let offset = 0;
                let total = -1;
                while (true) {
                    let chapterRes = await this.networkGet(
                        `${this.contentUrl}/api/v3/comic/${id}/group/${encodeURIComponent(group.path_word)}/chapters?limit=500&offset=${offset}`,
                        this.contentHeaders
                    );
                    if (chapterRes.status !== 200) break;
                    let chapterData = JSON.parse(chapterRes.body);
                    let list = chapterData.results && chapterData.results.list ? chapterData.results.list : [];
                    allChapters = allChapters.concat(list);
                    total = chapterData.results && chapterData.results.total ? chapterData.results.total : 0;
                    if (list.length === 0 || allChapters.length >= total) break;
                    offset += 500;
                }
                let groupChapters = {};
                for (let ch of allChapters) {
                    if (ch.uuid && ch.name) {
                        let pageCount = Number(ch.size);
                        groupChapters[ch.uuid] = Number.isFinite(pageCount) && pageCount > 0
                            ? `${ch.name} ${Math.trunc(pageCount)}P`
                            : ch.name;
                    }
                }
                if (Object.keys(groupChapters).length > 0) {
                    chapters[groupName] = groupChapters;
                }
            }

            return {
                title: title,
                subTitle: popularText ? `热度 ${popularText}` : '',
                cover: cover,
                description: description,
                tags: {
                    "作者": authors,
                    "更新": [updateTime],
                    "标签": tags,
                    "状态": [status],
                },
                chapters: chapters,
                isFavorite: false,
                subId: comic.uuid || ''
            }
        },
        loadEp: async (comicId, epId) => {
            let res = await this.networkGet(
                `${this.contentUrl}/api/v3/comic/${comicId}/chapter/${epId}?platform=3`,
                this.contentHeaders
            );

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);
            let chapter = data.results && data.results.chapter ? data.results.chapter : null;
            let contents = chapter && Array.isArray(chapter.contents) ? chapter.contents : [];
            let images = [];

            for (let item of contents) {
                let url = typeof item === 'string' ? item : (item && item.url ? item.url : '');
                if (url) {
                    if (url.startsWith('//')) {
                        url = 'https:' + url;
                    }
                    url = url.replace(/h\d+x\.webp$/, `h${this.imageQuality}x.webp`);
                    images.push(url);
                }
            }

            if (images.length === 0) {
                throw 'No images found in chapter';
            }

            return {
                images: images,
            };
        },
        loadComments: async (comicId, subId, page, replyTo) => {
            let url = `https://api.mangacopy.com/api/v3/comments?comic_id=${subId}&limit=20&offset=${(page - 1) * 20}`;
            if (replyTo) {
                url = url + `&reply_id=${replyTo}&_update=true`;
            }
            let res = await this.networkGet(
                url,
                {
                    ...this.webHeaders,
                    'Accept': 'application/json',
                }
            );

            if (res.status !== 200) {
                if (res.status === 210) {
                    throw "210：注冊用戶一天可以發5條評論"
                }
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);

            let total = data.results.total;

            return {
                comments: data.results.list.map(e => {
                    return {
                        userName: replyTo ? `${e.user_name}  👉  ${e.parent_user_name}` : e.user_name,
                        avatar: e.user_avatar,
                        content: e.comment,
                        time: e.create_at,
                        replyCount: e.count,
                        id: e.id,
                    }
                }),
                maxPage: (total - (total % 20)) / 20 + 1,
            }
        },
        sendComment: async (comicId, subId, content, replyTo) => {
            let token = this.loadData("token");
            if (!token) {
                throw "未登录"
            }
            if (!replyTo) {
                replyTo = '';
            }
            let res = await this.networkPost(
                `https://api.mangacopy.com/api/v3/member/comment`,
                {
                    ...this.webHeaders,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                    "Accept": "application/json",
                    "Authorization": `Token ${token}`,
                },
                `comic_id=${subId}&comment=${encodeURIComponent(content)}&reply_id=${replyTo}`,
            );

            if (res.status === 401) {
                error(`Login expired`);
                return;
            }

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            } else {
                return "ok"
            }
        },
        loadChapterComments: async (comicId, epId, page, replyTo) => {
            let url = `https://api.mangacopy.com/api/v3/roasts?chapter_id=${epId}&limit=20&offset=${(page - 1) * 20}&_update=true`;
            let res = await this.networkGet(
                url,
                {
                    ...this.webHeaders,
                    'Accept': 'application/json',
                }
            );

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);

            let total = data.results.total;

            return {
                comments: data.results.list.map(e => {
                    return {
                        userName: e.user_name,
                        avatar: e.user_avatar,
                        content: e.comment,
                        time: e.create_at,
                        replyCount: null,
                        id: null,
                    }
                }),
                maxPage: (total - (total % 20)) / 20 + 1,
            }
        },
        sendChapterComment: async (comicId, epId, content, replyTo) => {
            let token = this.loadData("token");
            if (!token) {
                throw "未登录"
            }
            let res = await this.networkPost(
                `https://api.mangacopy.com/api/v3/member/roast`,
                {
                    ...this.webHeaders,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                    "Authorization": `Token ${token}`,
                },
                `chapter_id=${epId}&roast=${encodeURIComponent(content)}`,
            );

            if (res.status === 401) {
                throw `Login expired`;
            }

            if (res.status !== 200) {
                if (res.status === 210) {
                    throw `210:评论过于频繁或评论内容过短过长`;
                }
                throw `Invalid status code: ${res.status}`;
            } else {
                return "ok"
            }
        },
        onClickTag: (namespace, tag) => {
            if (namespace === "标签") {
                let pathWord = this.theme_path_word_dict[tag] || CopyManga.category_param_dict[tag];
                if (!pathWord) {
                    throw `未找到标签: ${tag}`;
                }
                return {
                    action: 'category',
                    keyword: tag,
                    param: pathWord,
                }
            }
            if (namespace === "作者") {
                let pathWord = this.author_path_word_dict[tag];
                if (!pathWord) {
                    throw `未找到作者: ${tag}`;
                }
                return {
                    action: 'category',
                    keyword: tag,
                    param: `author:${pathWord}`,
                }
            }
            throw "未支持此类Tag检索"
        }
    }

    settings = {
        copy_advanced: {
            title: "COPY 高级设置",
            type: "copy_advanced",
            defaultApiHost: CopyManga.defaultApiHost,
            defaultAppVersion: CopyManga.defaultCopyAppVersion,
            defaultVersionCode: CopyManga.defaultCopyVersionCode,
            defaultLoginHost: CopyManga.defaultLoginHost,
            defaultContentHost: CopyManga.defaultContentHost,
            loginHostOptions: ["copy4000.com", "copy3000.com"],
            contentRoutes: CopyManga.defaultContentRoutes,
            selectionModeOptions: ["线路", "节点"],
            defaultSelectionMode: "route",
        },
        favorites_ordering: {
            title: "收藏排序方式",
            type: "select",
            options: [
                {
                    value: '-datetime_updated',
                    text: '更新时间'
                },
                {
                    value: '-datetime_modifier',
                    text: '收藏时间'
                },
                {
                    value: '-datetime_browse',
                    text: '阅读时间'
                }
            ],
            default: '-datetime_updated',
        },
        image_quality: {
            title: "图片质量",
            type: "select",
            options: [
                {
                    value: '800',
                    text: '低 (800)'
                },
                {
                    value: '1200',
                    text: '中 (1200)'
                },
                {
                    value: '1500',
                    text: '高 (1500)'
                }
            ],
            default: CopyManga.defaultImageQuality,
        },
        base_url: {
            title: "COPY API URL",
            type: "input",
            default: CopyManga.defaultApiHost,
        },
        app_version: {
            title: "COPY 请求版本号",
            type: "input",
            default: CopyManga.defaultCopyAppVersion,
        },
        version_code: {
            title: "COPY versionCode",
            type: "input",
            default: CopyManga.defaultCopyVersionCode,
        },
        login_url: {
            title: "登录域名",
            type: "input",
            default: CopyManga.defaultLoginHost,
        },
        clear_device_info: {
            title: "清除设备信息",
            type: "callback",
            buttonText: "点击清除设备信息",
            callback: () => {
                this.clearDeviceInfo()
                return this.refreshAppApi()
            }
        },
        auto_clear_device_info: {
            title: "每次请求后自动清除设备信息",
            type: "switch",
            default: false,
        },
    }

    /**
     * Check if the current app version is after the target version
     * @param target {string} target version
     * @returns {boolean} true if the current app version is after the target version
     */
    isAppVersionAfter(target) {
        let current = APP.version
        let targetArr = target.split('.')
        let currentArr = current.split('.')
        for (let i = 0; i < 3; i++) {
            if (parseInt(currentArr[i]) < parseInt(targetArr[i])) {
                return false
            }
        }
        return true
    }
}