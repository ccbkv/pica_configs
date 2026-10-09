/** @type {import('./_venera_.js')} */

const picacgCategories = [
    "大家都在看", "大濕推薦", "那年今天", "官方都在看", "嗶咔漢化",
    "全彩", "長篇", "同人", "短篇", "圓神領域",
    "碧藍幻想", "CG雜圖", "英語 ENG", "生肉", "純愛",
    "百合花園", "耽美花園", "偽娘哲學", "後宮閃光", "扶他樂園",
    "單行本", "姐姐系", "妹妹系", "SM", "性轉換",
    "足の恋", "人妻", "NTR", "強暴", "非人類",
    "艦隊收藏", "Love Live", "SAO 刀劍神域", "Fate", "東方",
    "WEBTOON", "禁書目錄", "歐美", "Cosplay", "重口地帶",
]

class PicacgComicSource extends ComicSource {
    // 漫画源名称
    name = "picacg"

    // 唯一标识
    key = "picacg"

    version = "1.3.0"

    minAppVersion = "1.0.0"

    // 更新链接
    url = "https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/picacg.js"

    apiUrl = "https://picaapi.picacomic.com"

    apiKey = "C69BAF41DA5ABD1FFEDC6D2FEA56B"

    // 哔咔 API 签名密钥 (与 headers.dart 中一致)
    signatureSecret = '~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn'

    // -------------------- 通用工具 --------------------

    getSettingValue(key, fallback) {
        try {
            let value = this.loadSetting(key)
            if (value != null) {
                return value
            }
        } catch (e) { }
        return fallback
    }

    getToken() {
        return this.loadData('token') ?? ''
    }

    /**
     * 构造请求头 (与 headers.dart 中 getHeaders 一致)
     * @param method {string} - 大写的 HTTP 方法
     * @param path {string} - 不含域名前缀的路径 (含查询参数)
     */
    createHeaders(method, path) {
        let nonce = createUuid().replace(/-/g, '')
        let time = Math.floor(Date.now() / 1000).toString()
        // signature = HMAC-SHA256(secret, (path + time + nonce + method + apiKey).toLowerCase())
        let raw = (path + time + nonce + method + this.apiKey).toLowerCase()
        let signature = Convert.hmacString(
            Convert.encodeUtf8(this.signatureSecret),
            Convert.encodeUtf8(raw),
            'sha256'
        )
        return {
            'api-key': this.apiKey,
            'accept': 'application/vnd.picacomic.com.v1+json',
            'app-channel': this.loadData('appChannel') ??
                this.getSettingValue('appChannel', '3'),
            'authorization': this.getToken(),
            'time': time,
            'nonce': nonce,
            'app-version': '2.2.1.3.3.4',
            'app-uuid': 'defaultUuid',
            'image-quality': this.loadData('imageQuality') ??
                this.getSettingValue('imageQuality', 'original'),
            'app-platform': 'android',
            'app-build-version': '45',
            'Content-Type': 'application/json; charset=UTF-8',
            'user-agent': 'okhttp/3.8.1',
            'version': 'v1.4.1',
            'Host': 'picaapi.picacomic.com',
            'signature': signature,
        }
    }

    /**
     * 使用保存的账号重新登录
     */
    async reLogin() {
        let account = this.loadData('account')
        if (account == null || account.length < 2) {
            throw 'Login expired'
        }
        await this.account.login(account[0], account[1])
    }

    /**
     * 发送 API 请求, 自动处理 400 / 401
     * @param method {string} - HTTP 方法
     * @param path {string} - 不含域名前缀的路径 (含查询参数)
     * @param data {Object?} - POST 请求体
     * @param allowRelogin {boolean} - 401 时是否自动重新登录并重试
     */
    async request(method, path, data, allowRelogin = true) {
        method = method.toUpperCase()
        if (this.getToken() === '' && !path.startsWith('auth')) {
            throw '未登录'
        }
        let url = this.apiUrl + '/' + path
        let body = data == null ? null : JSON.stringify(data)
        let res = await Network.sendRequest(
            method, url, this.createHeaders(method, path), body)
        if (res.status === 200) {
            return JSON.parse(res.body)
        } else if (res.status === 400) {
            let message = 'Invalid request'
            try {
                message = JSON.parse(res.body).message ?? message
            } catch (e) { }
            throw message
        } else if (res.status === 401) {
            if (!allowRelogin) {
                throw 'Login expired'
            }
            await this.reLogin()
            return await this.request(method, path, data, false)
        } else {
            throw 'Invalid status code: ' + res.status
        }
    }

    /**
     * 拼接图片链接
     */
    buildImageUrl(image) {
        if (image == null) {
            return ''
        }
        return (image.fileServer ?? '') + '/static/' + (image.path ?? '')
    }

    /**
     * 过滤无效的作者名 (与内置 _PicComicTile.subTitle 逻辑一致)
     */
    parseSubtitle(author) {
        author = (author ?? '').trim()
        if (author === '' || author === 'N/A' || author === 'Unknown' || author === '未知') {
            return ''
        }
        return author
    }

    /**
     * 将 API 返回的漫画简介数据转换为 Comic
     */
    parseComic(doc) {
        let tags = []
        tags.push(...(doc.tags ?? []))
        tags.push(...(doc.categories ?? []))
        let subtitle = this.parseSubtitle(doc.author)
        return new Comic({
            id: doc._id ?? '',
            title: doc.title ?? 'Unknown',
            subtitle: subtitle,
            subTitle: subtitle,
            cover: this.buildImageUrl(doc.thumb),
            tags: tags,
            description: (doc.totalLikes ?? doc.likesCount ?? 0) + ' likes',
            maxPage: doc.pagesCount,
        })
    }

    /**
     * 解析分页漫画列表响应 (docs / pages)
     */
    parseComicsResponse(comicsData) {
        return {
            comics: (comicsData.docs ?? []).map((e) => this.parseComic(e)),
            maxPage: comicsData.pages ?? 1,
        }
    }

    /**
     * 获取全部章节, 返回 { 章节序号: 章节标题 }, 按序号升序
     */
    async loadChapters(id) {
        let eps = []
        let page = 1
        while (true) {
            let res = await this.request('GET', 'comics/' + id + '/eps?page=' + page)
            let docs = res.data.eps.docs ?? []
            eps.push(...docs)
            if (res.data.eps.pages === page || docs.length === 0) {
                break
            }
            page++
        }
        eps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        let chapters = {}
        for (let i = 0; i < eps.length; i++) {
            chapters[eps[i].order.toString()] = eps[i].title
        }
        return chapters
    }

    /**
     * 将 API 用户信息转换为 Profile 兼容格式保存
     * (与 methods.dart getProfile / Profile.fromJson 字段一致,
     *  供账号信息显示及留言板等哔咔专属页面使用)
     */
    parseProfile(user) {
        let avatarUrl = 'DEFAULT AVATAR URL'
        if (user.avatar != null) {
            avatarUrl = (user.avatar.fileServer ?? '') +
                '/static/' + (user.avatar.path ?? '')
        }
        return {
            id: user._id,
            title: user.title,
            email: user.email,
            name: user.name,
            level: user.level,
            exp: user.exp,
            avatarUrl: avatarUrl,
            frameUrl: user.character,
            isPunched: user.isPunched,
            slogan: user.slogan,
        }
    }

    /**
     * 将 API 上传者信息转换为 UploaderInfo 格式
     * (与 comic_source.dart UploaderInfo 字段一致, 用于详情页上传者卡片)
     */
    parseUploader(creator, updateTime) {
        if (creator == null || creator._id == null) {
            return null
        }
        let avatarUrl = 'DEFAULT AVATAR URL'
        if (creator.avatar != null) {
            avatarUrl = (creator.avatar.fileServer ?? '') +
                '/static/' + (creator.avatar.path ?? '')
        }
        return {
            id: creator._id,
            name: creator.name ?? '',
            avatarUrl: avatarUrl,
            frameUrl: creator.character,
            slogan: creator.slogan,
            level: creator.level ?? 0,
            updateTime: updateTime ?? '',
        }
    }

    // -------------------- 账号 --------------------

    account = {
        /**
         * 登录, 成功后保存 token 与用户信息
         */
        login: async (account, pwd) => {
            let res = await this.request('POST', 'auth/sign-in', {
                'email': account,
                'password': pwd,
            }, false)
            if (res.data == null || res.data.token == null) {
                throw res.message ?? '登录失败'
            }
            this.saveData('token', res.data.token)
            // 获取并保存用户信息 (与内置 login 一致)
            let profileRes = await this.request('GET', 'users/profile')
            if (profileRes.data == null || profileRes.data.user == null) {
                this.deleteData('token')
                throw profileRes.message ?? '获取用户信息失败'
            }
            this.saveData('user', this.parseProfile(profileRes.data.user))
            return 'ok'
        },

        /**
         * 登出, 清除 token 与用户信息
         */
        logout: () => {
            this.deleteData('token')
            this.deleteData('user')
        },

        registerWebsite: null,

        // 账号信息项 (与内置 infoItems 一致)
        infoItems: [
            {
                title: '账号',
                data: () => this.loadData('user')?.email ?? '',
            },
            {
                title: '用户名',
                data: () => this.loadData('user')?.name ?? '',
            },
            {
                title: '等级',
                data: () => {
                    let user = this.loadData('user')
                    if (user == null) {
                        return ''
                    }
                    return 'Lv' + (user.level ?? 0) + ' ' +
                        (user.title ?? '') + ' Exp' + (user.exp ?? 0)
                },
            },
            {
                title: '简介',
                data: () => this.loadData('user')?.slogan ?? '',
            },
            {
                title: '留言板',
                action: 'picacg_leave_messages',
            },
            {
                title: '我的评论',
                action: 'picacg_user_comments',
            },
        ],
    }

    // -------------------- 探索页 --------------------

    explore = [
        {
            title: "picacg",
            type: "multiPartPage",
            load: async () => {
                let [randomRes, latestRes] = await Promise.all([
                    this.request('GET', 'comics/random'),
                    this.request('GET', 'comics?page=1&s=dd'),
                ])
                return [
                    {
                        title: '随机',
                        comics: (randomRes.data.comics ?? [])
                            .map((e) => this.parseComic(e)),
                        viewMore: {
                            page: 'category',
                            attributes: { category: 'random', param: null },
                        },
                    },
                    {
                        title: '最新',
                        comics: (latestRes.data.comics.docs ?? [])
                            .map((e) => this.parseComic(e)),
                        viewMore: {
                            page: 'category',
                            attributes: { category: 'latest', param: null },
                        },
                    },
                ]
            },
        },
    ]

    // -------------------- 分类页 --------------------

    category = {
        title: "Picacg",
        key: "picacg",
        parts: [
            {
                name: '分类',
                type: 'fixed',
                categories: picacgCategories.map((label) => ({
                    label: label,
                    target: {
                        page: 'category',
                        attributes: {
                            category: label,
                            param: null,
                        },
                    },
                })),
            },
        ],
        enableRankingPage: true,
    }

    // -------------------- 分类漫画 --------------------

    categoryComics = {
        /**
         * 加载分类漫画
         * @param category {string} - 分类名 / "random" / "latest" / 作者名
         * @param param {string?} - "a": 作者, "ca": 创作者, 其它: 分类
         * @param options {string[]} - 排序选项
         * @param page {number} - 页码
         */
        load: async (category, param, options, page) => {
            if (category === 'random') {
                let res = await this.request('GET', 'comics/random')
                return {
                    comics: (res.data.comics ?? []).map((e) => this.parseComic(e)),
                    maxPage: 1,
                }
            }
            if (category === 'latest') {
                let res = await this.request('GET', 'comics?page=' + page + '&s=dd')
                return this.parseComicsResponse(res.data.comics)
            }
            let sort = options[0] ?? 'dd'
            let type = param === 'a' ? 'a' : (param === 'ca' ? 'ca' : 'c')
            if (type === 'c' && category.includes(',')) {
                // 多分类搜索, 使用高级搜索 API
                let categories = category.split(',').filter((s) => s !== '')
                let res = await this.request(
                    'POST', 'comics/advanced-search?page=' + page, {
                    categories: categories,
                    keyword: '',
                    sort: sort,
                })
                return this.parseComicsResponse(res.data.comics)
            }
            let res = await this.request('GET',
                'comics?page=' + page + '&' + type + '=' +
                encodeURIComponent(category) + '&s=' + sort)
            return this.parseComicsResponse(res.data.comics)
        },

        optionList: [
            {
                options: [
                    'dd-新到旧',
                    'da-旧到新',
                    'ld-最多喜欢',
                    'vd-最多指名',
                ],
                notShowWhen: ['random', 'latest'],
            },
        ],

        ranking: {
            options: [
                'H24-24小时',
                'D7-7天',
                'D30-30天',
                'creator-骑士榜',
            ],
            /**
             * 加载排行榜
             * @param option {string} - H24 / D7 / D30 / creator
             * @param page {number} - 页码
             */
            load: async (option, page) => {
                if (option === 'creator') {
                    // 骑士榜 (用户榜)
                    let res = await this.request('GET', 'comics/knight-leaderboard')
                    let comics = (res.data.users ?? []).map((user) => {
                        let subtitle = (user.title ?? '') + ' Lv' + (user.level ?? 0)
                        return new Comic({
                            id: 'creator:' + (user._id ?? ''),
                            title: user.name ?? 'Unknown',
                            subtitle: subtitle,
                            subTitle: subtitle,
                            cover: this.buildImageUrl(user.avatar),
                            tags: [...(user.characters ?? [])],
                            description: (user.exp ?? 0) + ' exp',
                        })
                    })
                    return { comics: comics, maxPage: 1 }
                }
                let res = await this.request(
                    'GET', 'comics/leaderboard?tt=' + option + '&ct=VC')
                return {
                    comics: (res.data.comics ?? []).map((e) => this.parseComic(e)),
                    maxPage: 1,
                }
            },
        },
    }

    // -------------------- 搜索 --------------------

    search = {
        /**
         * 搜索漫画
         * @param keyword {string}
         * @param options {string[]} - 排序选项
         * @param page {number}
         */
        load: async (keyword, options, page) => {
            let res = await this.request(
                'POST', 'comics/advanced-search?page=' + page, {
                keyword: keyword,
                sort: options[0] ?? 'dd',
                ...(options[1] ? { categories: JSON.parse(options[1]) } : {}),
            })
            return this.parseComicsResponse(res.data.comics)
        },

        optionList: [
            {
                label: '排序',
                options: [
                    'dd-新到旧',
                    'da-旧到新',
                    'ld-最多喜欢',
                    'vd-最多指名',
                ],
            },
        ],

        enableTagsSuggestions: false,
    }

    // -------------------- 漫画详情 --------------------

    comic = {
        /**
         * 加载漫画详情
         * @param id {string}
         */
        loadInfo: async (id) => {
            if (id.startsWith('creator:')) {
                throw '暂不支持查看用户主页'
            }
            let res = await this.request('GET', 'comics/' + id)
            let comic = res.data.comic
            // 章节列表
            let chapters = await this.loadChapters(id)
            // 相关推荐 (失败不影响详情加载)
            let recommend = []
            try {
                let recRes = await this.request(
                    'GET', 'comics/' + id + '/recommendation')
                recommend = (recRes.data.comics ?? [])
                    .map((e) => this.parseComic(e))
            } catch (e) { }
            let subtitle = this.parseSubtitle(comic.author)
            let tags = {}
            tags['作者'] = [comic.author ?? '']
            tags['汉化'] = [comic.chineseTeam ?? '']
            tags['分类'] = comic.categories ?? []
            tags['标签'] = comic.tags ?? []
            return {
                title: comic.title ?? 'Unknown',
                subtitle: subtitle,
                subTitle: subtitle,
                cover: this.buildImageUrl(comic.thumb),
                description: comic.description ?? '无',
                tags: tags,
                chapters: chapters,
                thumbnails: null,
                recommend: recommend,
                isFavorite: comic.isFavourite ?? false,
                likesCount: comic.likesCount ?? 0,
                isLiked: comic.isLiked ?? false,
                uploader: this.parseUploader(comic._creator, comic.updated_at),
                updateTime: comic.updated_at,
                maxPage: comic.pagesCount,
            }
        },

        /**
         * 加载章节图片
         * @param comicId {string}
         * @param epId {string} - 章节序号 (1-based)
         */
        loadEp: async (comicId, epId) => {
            let images = []
            let page = 1
            while (true) {
                let res = await this.request('GET',
                    'comics/' + comicId + '/order/' + epId + '/pages?page=' + page)
                let docs = res.data.pages.docs ?? []
                for (let i = 0; i < docs.length; i++) {
                    images.push(this.buildImageUrl(docs[i].media))
                }
                if (res.data.pages.pages === page || docs.length === 0) {
                    break
                }
                page++
            }
            return { images: images }
        },

        /**
         * 加载评论
         * @param comicId {string}
         * @param subId {string?}
         * @param page {number}
         * @param replyTo {string?} - 非空时加载该评论的回复
         */
        loadComments: async (comicId, subId, page, replyTo) => {
            let res
            if (replyTo != null) {
                res = await this.request('GET',
                    'comments/' + replyTo + '/childrens?page=' + page)
            } else {
                res = await this.request('GET',
                    'comics/' + comicId + '/comments?page=' + page)
            }
            let docs = res.data.comments.docs ?? []
            let comments = docs.map((doc) => {
                let user = doc._user
                return new Comment({
                    userName: user?.name ?? 'Unknown',
                    avatar: this.buildImageUrl(user?.avatar),
                    content: doc.content ?? '',
                    time: doc.created_at ?? '',
                    replyCount: doc.commentsCount ?? 0,
                    id: doc._id ?? '',
                    isLiked: doc.isLiked ?? false,
                    score: doc.likesCount ?? 0,
                })
            })
            return {
                comments: comments,
                maxPage: res.data.comments.pages ?? 1,
            }
        },

        /**
         * 发送评论 / 回复
         * @param comicId {string}
         * @param subId {string?}
         * @param content {string}
         * @param replyTo {string?} - 非空时回复该评论
         */
        sendComment: async (comicId, subId, content, replyTo) => {
            if (replyTo != null) {
                await this.request('POST', 'comments/' + replyTo, {
                    content: content,
                })
            } else {
                await this.request('POST', 'comics/' + comicId + '/comments', {
                    content: content,
                })
            }
            return 'ok'
        },

        /**
         * 点赞 / 取消点赞评论
         * @param comicId {string}
         * @param subId {string?}
         * @param commentId {string}
         * @param isLike {boolean}
         */
        likeComment: async (comicId, subId, commentId, isLike) => {
            await this.request('POST', 'comments/' + commentId + '/like', {})
        },

        /**
         * 点击标签跳转 (分类 -> 分类页, 作者 -> 作者搜索, 其它 -> 搜索)
         * @param namespace {string}
         * @param tag {string}
         */
        onClickTag: (namespace, tag) => {
            if (namespace === '分类') {
                return {
                    page: 'category',
                    attributes: { category: tag, param: null },
                }
            } else if (namespace === '作者') {
                return {
                    page: 'category',
                    attributes: { category: tag, param: 'a' },
                }
            }
            return {
                page: 'search',
                attributes: { keyword: tag },
            }
        },
    }

    // -------------------- 收藏 --------------------

    favorites = {
        multiFolder: false,

        /**
         * 收藏 / 取消收藏
         * @param comicId {string}
         * @param folderId {string}
         * @param isAdding {boolean}
         * @param favoriteId {string?}
         */
        addOrDelFavorite: async (comicId, folderId, isAdding, favoriteId) => {
            await this.request('POST', 'comics/' + comicId + '/favourite', {})
            return 'ok'
        },

        /**
         * 加载收藏漫画
         * @param page {number}
         * @param folder {string?}
         */
        loadComics: async (page, folder) => {
            let sort = this.getSettingValue('favoriteSort', 'dd')
            let res = await this.request('GET',
                'users/favourite?s=' + sort + '&page=' + page)
            return this.parseComicsResponse(res.data.comics)
        },
    }

    // -------------------- 设置 --------------------

    
    settings = {
        imageQuality: {
            title: '设置图片质量',
            type: 'select',
            saveTo: 'data',
            options: [
                { value: 'original', text: '原图' },
                { value: 'low', text: '低' },
                { value: 'middle', text: '中' },
                { value: 'high', text: '高' },
            ],
            default: 'original',
        },
        appChannel: {
            title: '设置分流',
            type: 'select',
            saveTo: 'data',
            options: [
                { value: '1', text: '分流1' },
                { value: '2', text: '分流2' },
                { value: '3', text: '分流3' },
            ],
            default: '3',
        },
        favoriteSort: {
            title: '图片收藏排序方式',
            type: 'select',
            options: [
                { value: 'dd', text: '新到旧' },
                { value: 'da', text: '旧到新' },
            ],
            default: 'dd',
        },
        leaveMessages: {
            title: '留言板',
            type: 'action',
            action: 'picacg_leave_messages',
        },
        userComments: {
            title: '我的评论',
            type: 'action',
            action: 'picacg_user_comments',
        },
        showAvatarFrame: {
            title: '显示头像框',
            type: 'appSwitch',
            appKey: 'showAvatarFrame',
        },
        autoPunchIn: {
            title: '自动打卡',
            type: 'appSwitch',
            appKey: 'autoPunchIn',
        },
    }

    // -------------------- 翻译 --------------------

    translation = {
        'zh_CN': {},
        'zh_TW': {},
        'en': {
            '随机': 'Random',
            '最新': 'Latest',
            '分类': 'Categories',
            '排序': 'Sort',
            '新到旧': 'New to Old',
            '旧到新': 'Old to New',
            '最多喜欢': 'Most Liked',
            '最多指名': 'Most Followed',
            '24小时': '24 Hours',
            '7天': '7 Days',
            '30天': '30 Days',
            '骑士榜': 'Knight Rank',
            '设置图片质量': 'Image Quality',
            '设置分流': 'API Channel',
            '图片收藏排序方式': 'Favorites Order',
            '留言板': 'Messages',
            '我的评论': 'My Comments',
            '显示头像框': 'Show Avatar Frame',
            '自动打卡': 'Auto Punch-in',
            '原图': 'Original',
            '低': 'Low',
            '中': 'Medium',
            '高': 'High',
        },
    }
}
