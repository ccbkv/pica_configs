/** @type {import('./_venera_.js')} */

// Port of built_in/ht_manga.dart and network/htmanga_network.
class WnacgComicSource extends ComicSource {
    name = '绅士漫画'
    key = 'htmanga'
    version = '1.3.0'
    minAppVersion = '4.9.0'
    url = 'https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/wnacg.js'

    // Set a URL here to override the native API selection; leave empty to use it.
    apiOverride = ''
    // Used on hosts without the htmanga_state bridge.
    fallbackApi = 'https://www.wnacg.com'

    _favoriteIds = new Map()
    _thumbnailPages = new Map()

    get baseUrl() {
        if (this.apiOverride.trim()) return this.normalizeApi(this.apiOverride)
        const state = sendMessage({ method: 'htmanga_state', key: this.key })
        return this.normalizeApi(state?.baseUrl || this.fallbackApi)
    }

    normalizeApi(value) {
        let url = String(value).trim().replace(/\/+$/, '')
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url
        if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[^?#\s]*)?$/i.test(url)) {
            throw new Error('Invalid URL')
        }
        return url
    }

    absoluteUrl(path) {
        path = path.trim()
        if (/^https?:\/\//i.test(path)) return path.replace(/^(https?:)\/{2,}/i, '$1//')
        if (path.startsWith('//')) return 'https://' + path.replace(/^\/+/, '')
        return this.baseUrl + '/' + path.replace(/^\/+/, '')
    }

    get headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Referer': this.baseUrl + '/',
        }
    }

    async get(path) {
        const res = await Network.get(this.absoluteUrl(path), this.headers)
        if (res.status !== 200) throw new Error('HTTP ' + res.status)
        const body = String(res.body ?? '')
        // Older hosts do not expose Dio's realUri; recognize the redirected login form.
        if (/users-login/.test(res.url || '') ||
            (/<input\b[^>]*\bname\s*=\s*["']login_name["']/i.test(body) &&
             /<input\b[^>]*\bname\s*=\s*["']login_pass["']/i.test(body))) {
            throw new Error('Login expired: 未登录或登录到期')
        }
        return body
    }

    async post(path, data) {
        const res = await Network.post(this.absoluteUrl(path), {
            ...this.headers,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        }, data)
        if (res.status !== 200) throw new Error('HTTP ' + res.status)
        return res.body
    }

    compact(value) {
        return value.replace(/[\n \t]/g, '')
    }

    comicId(link) {
        if (/^\d+$/.test(String(link))) return String(link)
        const match = /-aid-(\d+)/.exec(link)
        if (!match) throw new Error('Invalid comic ID')
        return match[1]
    }

    parseBrief(element, home = false) {
        const link = element.querySelector('div.pic_box > a').attributes.href
        const image = element.querySelector('div.pic_box > a > img').attributes.src
        const title = element.querySelector('div.info > div.title > a')
        const info = element.querySelector('div.info > div.info_col').text
        return {
            id: this.comicId(link),
            title: (home ? title.text : (title.attributes.title ?? title.text)
                .replace(/<\/?em>/g, '')).trim(),
            subTitle: '',
            cover: this.absoluteUrl(image),
            // Preserve count units: the host adds "P" to numeric pages.
            description: info.trim().replace(/[\n\t]/g, ''),
            tags: [],
        }
    }

    listUrl(url, page) {
        url = this.absoluteUrl(url)
        if (page === 1) return url
        if (url.includes('search')) return url + '&p=' + page
        if (url.includes('ranking')) return url.replace(/ranking/g, 'ranking-page-' + page)
        if (!url.includes('-')) url = url.replace(/\.html/g, '-.html')
        url = url.replace(/index/g, '')
        const parts = url.split('albums-')
        if (parts.length < 2) throw new Error('Invalid albums URL')
        return parts[0] + 'albums-index-page-' + page + parts[1]
    }

    lastPage(document, fallback) {
        const links = document.querySelectorAll('div.f_left.paginator > a')
        const text = links.length ? links[links.length - 1].text.trim() : ''
        return /^\d+$/.test(text) ? Number(text) : fallback
    }

    async getComicList(url, page = 1, searchPage = false) {
        const document = new HtmlDocument(await this.get(this.listUrl(url, page)))
        try {
            const elements = document.querySelectorAll('div.grid div.gallary_wrap > ul.cc > li')
            const comics = []
            for (const element of elements) {
                try { comics.push(this.parseBrief(element)) } catch (_) {}
            }
            let maxPage = 1
            if (searchPage) {
                const result = document.querySelector('p.result > b')?.text.replace(/\D/g, '')
                if (result && elements.length) maxPage = Math.floor(Number(result) / elements.length) + 1
            } else {
                maxPage = this.lastPage(document, 1)
            }
            return { comics, maxPage }
        } finally {
            document.dispose()
        }
    }

    account = {
        registerWebsite: 'https://www.wnacg.com/albums.html',
        login: async (account, pwd) => {
            const body = await this.post('/users-check_login.html',
                'login_name=' + encodeURIComponent(account) + '&login_pass=' + encodeURIComponent(pwd))
            const data = typeof body === 'string' ? JSON.parse(body) : body
            if (!String(data?.html || '').includes('登錄成功')) {
                throw new Error(data?.html || 'Login failed')
            }
            this._favoriteIds.clear()
            this.saveData('name', account)
            return true
        },
        logout: () => {
            Network.deleteCookies(this.baseUrl)
            this._favoriteIds.clear()
            this.saveData('name', null)
            this.saveData('account', null)
        },
    }

    explore = [{
        title: '绅士漫画',
        type: 'multiPartPage',
        load: async () => {
            const document = new HtmlDocument(await this.get(this.baseUrl))
            try {
                const titles = document.querySelectorAll('div.title_sort')
                const blocks = document.querySelectorAll('div.bodywrap')
                if (titles.length !== blocks.length) throw new Error('漫画块数量和标题数量不相等')
                return titles.map((title, i) => {
                    const name = this.compact(title.querySelector('div.title_h2').text)
                    const link = title.querySelector('div.r > a').attributes.href
                    return {
                        title: name,
                        comics: blocks[i].querySelectorAll('div.gallary_wrap > ul.cc > li')
                            .map(element => this.parseBrief(element, true)),
                        viewMore: { page: 'category', attributes: { category: name, param: link } },
                    }
                })
            } finally {
                document.dispose()
            }
        },
    }]

    category = {
        title: '绅士漫画',
        key: 'htmanga',
        enableRankingPage: true,
        parts: [
            { name: '最新', type: 'fixed', categories: ['最新漫画'],
                itemType: 'category', categoryParams: ['/albums.html'] },
            { name: '同人志', type: 'fixed',
                categories: ['同人志', '同人志-汉化', '同人志-日语', '同人志-English', '同人志-CG画集', '同人志-3D漫画', '同人志-Cosplay'],
                itemType: 'category', categoryParams: [5, 1, 12, 16, 2, 22, 3].map(id => '/albums-index-cate-' + id + '.html') },
            { name: '单行本', type: 'fixed',
                categories: ['单行本', '单行本-汉化', '单行本-日语', '单行本-English'],
                itemType: 'category', categoryParams: [6, 9, 13, 17].map(id => '/albums-index-cate-' + id + '.html') },
            { name: '杂志&短篇', type: 'fixed',
                categories: ['杂志&短篇', '杂志&短篇-汉化', '杂志&短篇-日语', '杂志&短篇-English'],
                itemType: 'category', categoryParams: [7, 10, 14, 18].map(id => '/albums-index-cate-' + id + '.html') },
            { name: '韩漫', type: 'fixed', categories: ['韩漫', '韩漫-汉化', '韩漫-其它'],
                itemType: 'category', categoryParams: [19, 20, 21].map(id => '/albums-index-cate-' + id + '.html') },
        ],
    }

    categoryComics = {
        load: async (category, param, options, page) => this.getComicList(param || '/albums.html', page),
        ranking: {
            // The host splits options at the first "-", so use these short keys.
            options: ['day-今日', 'week-本週', 'month-本月'],
            load: async (option, page) => this.getComicList(
                '/albums-favorite_ranking-type-' + option + '.html', page),
        },
    }

    search = {
        load: async (keyword, options, page) => this.getComicList(
            '/search/?q=' + encodeURIComponent(keyword) + '&f=_all&s=create_time_DESC&syn=yes', page, true),
    }

    comic = {
        loadInfo: async (id) => {
            id = this.comicId(id)
            // Keep collection chapters in ascending list order regardless of site preferences.
            let document = new HtmlDocument(await this.get(
                '/photos-index-page-1-aid-' + id + '.html?order=asc&mode=list'))
            try {
                const title = document.querySelector('div.userwrap > h2').text
                const cover = document.querySelector('div.userwrap > div.asTB > div.asTBcell.uwthumb > img').attributes.src
                const labels = document.querySelectorAll('div.asTBcell.uwconn > label')
                const category = labels[0].text.split('：')[1]
                const isSeries = document.querySelector('#sr_pub') !== null
                const count = labels[1].text.split('：')[1]
                const pages = isSeries ? undefined : Number(/\d+/.exec(count)[0])
                const tags = {}
                for (const tag of document.querySelectorAll(
                    isSeries ? 'div.asTBcell.uwconn a.tagshow' : 'a.tagshow')) {
                    tags[tag.text] = tag.attributes.href
                }
                const uploader = document.querySelector('div.asTBcell.uwuinfo > a > p').text
                const avatar = document.querySelector('div.asTBcell.uwuinfo > a > img').attributes.src
                const uploadNum = Number(document.querySelector('div.asTBcell.uwuinfo > p > font').text)
                const thumbnailMaxPage = isSeries ? 0 : Math.ceil(pages / 12)
                this._thumbnailPages.set(id, thumbnailMaxPage)
                const result = {
                    title: this.compact(title), subTitle: uploader,
                    cover: this.absoluteUrl(cover),
                    description: document.querySelector('div.asTBcell.uwconn > p').text,
                    tags: { ...(isSeries ? { '章节': [count] } : {}),
                        '分类': [category], '标签': Object.keys(tags) },
                    uploader: { id: uploader, name: uploader, avatarUrl: this.absoluteUrl(avatar),
                        slogan: '投稿作品' + uploadNum + '部',
                        // PicaComic renders updateTime as the uploader card's second line.
                        updateTime: '投稿作品' + uploadNum + '部' },
                    pages, maxPage: pages, isFavorite: false,
                    thumbnails: isSeries ? [] : document.querySelectorAll('div.pic_box.tb > a > img')
                        .map(image => this.absoluteUrl(image.attributes.src)),
                    thumbnailMaxPage,
                    url: this.baseUrl + '/photos-index-page-1-aid-' + id + '.html',
                }
                if (isSeries) {
                    const chapters = new Map()
                    let page = 1
                    let maxPage = 1
                    while (true) {
                        for (const chapter of document.querySelectorAll('a[data-chid]')) {
                            chapters.set(chapter.attributes['data-chid'], chapter.text.trim())
                        }
                        for (const link of document.querySelectorAll('div.f_left.paginator a[href]')) {
                            const match = /-page-(\d+)-/.exec(link.attributes.href)
                            if (match) maxPage = Math.max(maxPage, Number(match[1]))
                        }
                        if (page >= maxPage) break
                        page++
                        document.dispose()
                        document = null
                        document = new HtmlDocument(await this.get(
                            '/photos-index-page-' + page + '-aid-' + id + '.html?order=asc&mode=list'))
                    }
                    if (chapters.size === 0) throw new Error('Invalid chapter directory')
                    result.chapters = chapters
                }
                return result
            } finally {
                if (document) document.dispose()
            }
        },
        loadThumbnails: async (id, next) => {
            id = this.comicId(id)
            // PicaComic sends "0" for the second thumbnail page.
            const page = next == null ? 1 : Number(next) + 2
            const document = new HtmlDocument(await this.get('/photos-index-page-' + page + '-aid-' + id + '.html'))
            try {
                if (document.querySelector('#sr_pub')) {
                    return { thumbnails: [], next: null }
                }
                const thumbnails = document.querySelectorAll('div.pic_box.tb > a > img')
                    .map(image => this.absoluteUrl(image.attributes.src))
                const maxPage = this._thumbnailPages.get(id)
                return { thumbnails, next: (maxPage != null ? page < maxPage : thumbnails.length === 12)
                    ? String(page - 1) : null }
            } finally {
                document.dispose()
            }
        },
        loadEp: async (id, epId) => {
            const body = await this.get('/photos-gallery-aid-' + this.comicId(epId || id) + '.html')
            // Same extraction as Dart; retain the ?verify= signature in full.
            const images = []
            const pattern = /\/\/([\w./\[\]()?&=%+-]+)/g
            let match
            while ((match = pattern.exec(body)) !== null) images.push(this.absoluteUrl('//' + match[1]))
            return { images }
        },
        onImageLoad: () => ({ headers: this.headers }),
        onThumbnailLoad: () => ({ headers: this.headers }),
        onClickTag: (namespace, tag) => ({ page: 'search', attributes: { keyword: tag } }),
        idMatch: '^\\d+$',
        link: {
            domains: ['www.wnacg.com', 'wnacg.com'],
            linkToId: url => /-aid-(\d+)\.html/.exec(url)?.[1] || null,
        },
    }

    favoriteKey(id, folder) {
        return JSON.stringify([this.baseUrl, this.loadData('name'), String(folder ?? '0'), String(id)])
    }

    favorites = {
        multiFolder: true,
        loadFolders: async (comicId) => {
            const document = new HtmlDocument(await this.get('/users-addfav-id-210814.html'))
            try {
                // The JS adapter has no allFavoritesId; expose "0" only in folder browsing.
                const folders = comicId == null ? { '0': '全部' } : {}
                for (const option of document.querySelectorAll('option')) {
                    if (option.attributes.value) folders[option.attributes.value] = option.text
                }
                return { folders }
            } finally {
                document.dispose()
            }
        },
        addFolder: async name => {
            await this.post('/users-favc_save-id.html', 'favc_name=' + encodeURIComponent(name))
            return true
        },
        deleteFolder: async id => {
            if (String(id) === '0') throw new Error('不能删除全部收藏入口')
            await this.get('/users-favclass_del-id-' + id + '.html?ajax=true&_t=' + Math.random())
            return true
        },
        loadComics: async (page, folder) => {
            const document = new HtmlDocument(await this.get(
                '/users-users_fav-page-' + page + '-c-' + (folder ?? '0') + '.html'))
            try {
                const comics = document.querySelectorAll('div.asTB').map(element => {
                    const title = element.querySelector('div.box_cel.u_listcon > p.l_title > a')
                    const id = this.comicId(title.attributes.href)
                    const info = element.querySelector('div.box_cel.u_listcon > p.l_detla')?.text || ''
                    const pageMatch = /頁數：(\d+)/.exec(info)
                    const pages = pageMatch ? Number(pageMatch[1]) : undefined
                    const onclick = element.querySelector('div.box_cel.u_listcon > p.alopt > a').attributes.onclick
                    const favoriteId = /del-id-(\d+)/.exec(onclick)[1]
                    this._favoriteIds.set(this.favoriteKey(id, folder), favoriteId)
                    return {
                        id, title: title.text.trim(), subTitle: '', tags: [], pages, maxPage: pages, favoriteId,
                        cover: this.absoluteUrl(element.querySelector('div.asTBcell.thumb > div > img').attributes.src),
                        description: element.querySelector('div.box_cel.u_listcon > p.l_catg > span')
                            .text.replace('創建時間：', '').trim(),
                    }
                })
                return { comics, maxPage: this.lastPage(document, page) }
            } finally {
                document.dispose()
            }
        },
        addOrDelFavorite: async (id, folder, isAdding, favoriteId) => {
            if (isAdding) {
                await this.post('/users-save_fav-id-' + this.comicId(id) + '.html', 'favc_id=' + folder)
            } else {
                // PicaComic does not pass Comic.favoriteId through its JS adapter.
                const context = JSON.parse(this.favoriteKey(id, folder))
                const records = [...this._favoriteIds.entries()].filter(([key]) => {
                    const value = JSON.parse(key)
                    return value[0] === context[0] && value[1] === context[1] && value[3] === context[3]
                })
                let recordId = favoriteId
                if (!recordId && folder && String(folder) !== '0') {
                    recordId = this._favoriteIds.get(this.favoriteKey(id, folder))
                }
                if (!recordId) {
                    // Some native favorite menus always pass "0". Never guess between records.
                    const ids = new Set(records.map(([, value]) => value))
                    if (ids.size === 1) recordId = [...ids][0]
                }
                if (!recordId) throw new Error('请刷新收藏列表后再删除')
                await this.get('/users-fav_del-id-' + recordId + '.html?ajax=true&_t=' + Math.random())
                for (const [key, value] of records) {
                    if (value === recordId) this._favoriteIds.delete(key)
                }
            }
            return true
        },
    }

    settings = {
        htmanga: { type: 'native', page: 'htmanga' },
    }
}
