/** @type {import('./_venera_.js')} */


class HitomiComicSource extends ComicSource {
    name = "hitomi"
    key = "hitomi"
    version = "1.0.0"
    minAppVersion = "4.9.0"
    url="https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/hitomi.js"

    get baseDomain() {
        return 'gold-usergeneratedcontent.net'
    }

    get ltn() {
        return 'https://ltn.' + this.baseDomain
    }

    get headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Referer': 'https://hitomi.la/',
        }
    }

    async get(url, headers = {}) {
        const res = await Network.get(url, { ...this.headers, ...headers })
        if (res.status !== 200) {
            const error = new Error('HTTP ' + res.status + ': ' + url)
            error.status = res.status
            throw error
        }
        return res.body
    }

    bytes(body) {
        if (Array.isArray(body) || body instanceof ArrayBuffer) {
            return new Uint8Array(body)
        }
        if (ArrayBuffer.isView(body)) {
            return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
        }
        throw new Error('Binary response required. Update the app HTTP byte bridge.')
    }

    header(headers, name) {
        const key = Object.keys(headers || {}).find(k => k.toLowerCase() === name)
        const value = key == null ? '' : headers[key]
        return Array.isArray(value) ? value[0] : String(value)
    }

    // Ranges are byte offsets, not gallery offsets: 100 bytes = 25 IDs.
    async getBytes(url, range = null, headers = {}) {
        const res = await Network.fetchBytes('GET', url, {
            ...this.headers,
            ...headers,
            ...(range ? { Range: 'bytes=' + range[0] + '-' + range[1] } : {}),
        }, null)
        const contentRange = this.header(res.headers, 'content-range')
        if (res.status === 416 && range) {
            const match = /^bytes \*\/(\d+)$/.exec(contentRange)
            if (match && range[0] >= Number(match[1])) {
                return { bytes: new Uint8Array(0), total: Number(match[1]) }
            }
        }
        if (res.status !== 200 && res.status !== 206) {
            throw new Error('HTTP ' + res.status + ': ' + url)
        }
        let bytes = this.bytes(res.body)
        if (res.status === 206) {
            const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange)
            if (!match || Number(match[2]) - Number(match[1]) + 1 !== bytes.length ||
                Number(match[2]) >= Number(match[3]) ||
                (range && (Number(match[1]) !== range[0] ||
                    Number(match[2]) !== Math.min(range[1], Number(match[3]) - 1)))) {
                throw new Error('Invalid Content-Range: ' + contentRange)
            }
            return { bytes, total: Number(match[3]) }
        }
        const total = bytes.length
        // Some servers ignore Range and return the entire file.
        if (range) bytes = bytes.slice(range[0], range[1] + 1)
        return { bytes, total }
    }

    decodeIds(bytes) {
        if (bytes.length % 4 !== 0) throw new Error('Invalid nozomi length')
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        const ids = []
        for (let i = 0; i < bytes.length; i += 4) {
            ids.push(view.getInt32(i, false))
        }
        return ids
    }

    async fetchComicData(url, page) {
        const start = (page - 1) * 100
        const data = await this.getBytes(url, [start, start + 99])
        if (data.total % 4 !== 0) throw new Error('Invalid nozomi total length')
        return {
            comics: await this.comicsFromIds(this.decodeIds(data.bytes)),
            maxPage: Math.max(1, Math.ceil(data.total / 100)),
        }
    }

    async comicsFromIds(ids) {
        const comics = []
        for (let i = 0; i < ids.length; i += 5) {
            const batch = await Promise.all(ids.slice(i, i + 5).map(async id => {
                try {
                    return await this.getComicInfoBrief(String(id))
                } catch (e) {
                    // An index can still contain a gallery whose card returns 404.
                    if (e.status === 404) return null
                    throw e
                }
            }))
            comics.push(...batch.filter(comic => comic !== null))
        }
        return comics
    }

    async getComicInfoBrief(id) {
        const html = await this.get(this.ltn + '/galleryblock/' + id + '.html')
        const doc = new HtmlDocument(html)
        try {
            const title = doc.querySelector('h1.lillie > a')
            if (!title) throw new Error('Missing gallery title: ' + id)
            const href = title.attributes.href
            const link = href.startsWith('https://') ? href : 'https://hitomi.la' + href
            const artist = (doc.querySelector('div.artist-list a')?.text || 'N/A').trim()
            let cover = ''
            const source = doc.querySelector('div.dj-img1 > picture > source') ||
                doc.querySelector('div.cg-img1 > picture > source')
            const srcset = source?.attributes['data-srcset']
            if (srcset) {
                let path = srcset.replace(/^https?:/, '').substring(2)
                path = path.substring(path.indexOf('/'))
                cover = ('https://atn.' + this.baseDomain + path)
                    .replace(/2x.*/, '').replace(/\s/g, '')
                    .replace('avifbigtn', 'webpbigtn').replace('.avif', '.webp')
            }
            let type = '', language = ''
            const tags = []
            const table = doc.querySelector('div.dj-content > table.dj-desc > tbody')
            if (!table) throw new Error('Missing gallery description: ' + id)
            for (const row of table.children) {
                const cells = row.children
                const label = cells[0]?.text.trim()
                if (label === 'Type') type = cells[1].text.trim()
                if (label === 'Language') language = cells[1].text.trim()
                if (label === 'Series') {
                    for (const a of row.querySelectorAll('td.series-list > ul > li > a')) {
                        if (a.text !== 'N/A') tags.push(a.text)
                    }
                }
                if (label === 'Tags') {
                    for (const a of row.querySelectorAll('td.relatedtags > ul > li > a')) {
                        tags.push(a.text)
                    }
                }
            }
            const subtitle = ['', 'N/A', 'Unknown', '未知'].includes(artist) ? '' : artist
            return new Comic({
                id: link,
                title: title.text,
                subtitle,
                subTitle: subtitle,
                cover,
                tags,
                description: type + '    ' + language,
                language,
            })
        } finally {
            doc.dispose()
        }
    }

    galleryId(target) {
        const value = String(target)
        if (/^\d+$/.test(value)) return value
        const match = /(\d+)\.html(?:[?#].*)?$/.exec(value)
        if (!match) throw new Error('Invalid gallery ID: ' + value)
        return match[1]
    }

    async getGallery(target) {
        const id = this.galleryId(target)
        const body = await this.get(this.ltn + '/galleries/' + id + '.js')
        return JSON.parse(body.slice(body.indexOf('{')).trim().replace(/;\s*$/, ''))
    }

    explore = [{
        title: 'hitomi',
        // App bridge reuses the original Dart bar, including order and language.
        // type: index / popular/today / popular/week / popular/month / popular/year
        // lang: -all / -chinese / -japanese / -english
        type: 'hitomi',
        load: async (page, type = 'index', lang = '-all') => {
            return this.fetchComicData(this.ltn + '/' + type + lang + '.nozomi', page)
        },
    }]

    category = {
        title: 'hitomi',
        parts: [
            {
                name: '语言',
                type: 'fixed',
                categories: ['汉语', '英语'],
                itemType: 'category',
                categoryParams: ['language:chinese', 'language:english'],
            },
            {
                name: '类别',
                type: 'fixed',
                categories: ['同人志', '漫画', '画师CG', '游戏CG', '图集', '动画'],
                itemType: 'category',
                categoryParams: [
                    'type:doujinshi', 'type:manga', 'type:artistcg',
                    'type:gamecg', 'type:imageset', 'type:anime',
                ],
            },
        ],
        enableRankingPage: true,
    }

    _categoryRandom = new Map()

    categoryComics = {
        load: async (category, param, options, page) => {
            const term = String(param || '').toLowerCase().trim()
            const match = /^([a-z]+):([^:]+)$/.exec(term)
            if (!match) throw new Error('不合法的标签，请使用namespace:tag的格式')
            const namespace = match[1]
            const value = match[2].replace(/_/g, ' ')
            const area = namespace === 'language' ? 'all' :
                (namespace === 'female' || namespace === 'male' ? 'tag' : namespace)
            const tag = namespace === 'language' ? 'index' :
                (area === 'tag' && namespace !== 'tag' ? namespace + ':' + value : value)
            const language = namespace === 'language' ? value : 'all'
            const option = parseInt(options?.[0] || '0')
            const orderby = option >= 2 && option <= 5 ? 'popular' : 'date'
            const orderbykey = ['', 'published', 'today', 'week', 'month', 'year'][option]
            let path
            if (orderby === 'popular' || option === 1) {
                path = area === 'all'
                    ? orderby + '/' + orderbykey + '-' + language
                    : area + '/' + orderby + '/' + orderbykey + '/' + encodeURI(tag) + '-' + language
            } else {
                path = (area === 'all' ? '' : area + '/') + encodeURI(tag) + '-' + language
            }
            if (option !== 6) {
                return this.fetchComicData(this.ltn + '/' + path + '.nozomi', page)
            }

            // Shuffle once per category visit so subsequent pages keep the same order.
            const url = this.ltn + '/n/' + path + '.nozomi'
            if (page === 1 || !this._categoryRandom.has(url)) {
                const result = (async () => {
                    const ids = this.decodeIds((await this.getBytes(url)).bytes)
                    for (let i = ids.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1))
                        ;[ids[i], ids[j]] = [ids[j], ids[i]]
                    }
                    return ids
                })()
                this._categoryRandom.delete(url)
                this._categoryRandom.set(url, result)
                if (this._categoryRandom.size > 8) {
                    this._categoryRandom.delete(this._categoryRandom.keys().next().value)
                }
            }
            const pending = this._categoryRandom.get(url)
            let ids
            try {
                ids = await pending
            } catch (e) {
                if (this._categoryRandom.get(url) === pending) this._categoryRandom.delete(url)
                throw e
            }
            return {
                comics: await this.comicsFromIds(ids.slice((page - 1) * 25, page * 25)),
                maxPage: Math.max(1, Math.ceil(ids.length / 25)),
            }
        },
        optionList: [{
            options: [
                '0-上传日期', '1-发布日期', '2-热门 | 今天',
                '3-热门 | 一周', '4-热门 | 一个月', '5-热门 | 一年', '6-随机',
            ],
            notShowWhen: null,
            showWhen: null,
        }],
        ranking: {
            options: ['today-今天', 'week-一周', 'month-一个月', 'year-一年'],
            load: async (option, page) => this.fetchComicData(
                this.ltn + '/popular/' + option + '-all.nozomi', page || 1),
        },
    }

    _search = null

    search = {
        load: async (keyword, options, page) => {
            const language = options?.[0] || 'all'
            const query = (keyword || '').trim() +
                (language === 'all' ? '' : ' language:' + language)
            const key = this.baseDomain + '\n' + query
            if (page === 1 || this._search?.key !== key) {
                this._search = { key, result: new HitomiSearch(this, query).search() }
            }
            const search = this._search
            let ids
            try {
                ids = await search.result
            } catch (e) {
                if (this._search === search) this._search = null
                throw e
            }
            return {
                comics: await this.comicsFromIds(ids.slice((page - 1) * 25, page * 25)),
                maxPage: Math.max(1, Math.ceil(ids.length / 25)),
            }
        },
        optionList: [{
            type: 'select',
            label: '语言',
            options: ['all-All', 'chinese-中文', 'japanese-日本語', 'english-English'],
            default: 'all',
        }],
        enableTagsSuggestions: false,
    }

    comic = {
        loadInfo: async (target) => {
            const id = this.galleryId(target)
            const brief = await this.getComicInfoBrief(id)
            const g = await this.getGallery(id)
            const files = g.files || []
            const artists = (g.artists || []).map(a => a.artist)
            const groups = (g.groups || []).map(a => a.group)
            const tags = {
                Artists: artists.length ? artists : ['N/A'],
                Groups: groups.length ? groups : ['N/A'],
                Categories: [g.type || ''],
                Time: [g.date || ''],
                Languages: [g.language || ''],
                Tags: (g.tags || []).map(t => t.tag +
                    (t.female == '1' ? ' ♀' : '') + (t.male == '1' ? ' ♂' : '')),
                Series: (g.parodys || []).map(p => p.parody),
                Characters: (g.characters || []).map(c => c.character),
            }
            if (!tags.Series.length) tags.Series.push('N/A')
            const gg = new GG(this)
            await gg.getGg(id)
            const details = new ComicDetails({
                title: g.title,
                subtitle: brief.subTitle,
                cover: brief.cover,
                tags,
                chapters: null,
                thumbnails: files.map(file => gg.urlFromHash(file, 'webpsmallsmalltn', 'webp')),
                recommend: await this.comicsFromIds(g.related || []),
                updateTime: g.date,
                url: brief.id,
                maxPage: files.length,
            })
            // PicaComic's parser reads subTitle; Venera's constructor uses subtitle.
            details.subTitle = brief.subTitle
            return details
        },
        loadEp: async (target, epId) => {
            const id = this.galleryId(target)
            const g = await this.getGallery(id)
            const gg = new GG(this)
            await gg.getGg(id)
            return { images: (g.files || []).map(file => gg.urlFromHash(file, 'webp', null)) }
        },
        onImageLoad: (url, comicId, epId) => ({ headers: this.headers }),
        onThumbnailLoad: (url) => ({ headers: this.headers }),
        onClickTag: (namespace, tag) => {
            if (tag === 'N/A' || namespace === 'Time') return null
            let keyword
            if (namespace === 'Tags') {
                if (tag.endsWith(' ♀')) keyword = 'female:' + tag.slice(0, -2)
                else if (tag.endsWith(' ♂')) keyword = 'male:' + tag.slice(0, -2)
                else keyword = 'tag:' + tag
            } else {
                const ns = {
                    Artists: 'artist', Groups: 'group', Categories: 'type',
                    Languages: 'language', Series: 'series', Characters: 'character',
                }[namespace]
                if (!ns) return null
                keyword = ns + ':' + tag
            }
            return { page: 'search', attributes: { keyword: keyword.replace(/ /g, '_') } }
        },
        idMatch: '^\\d+$',
        enableTagsTranslate: true,
        link: {
            domains: ['hitomi.la'],
            linkToId: (url) => {
                const match = /(\d+)\.html(?:[?#].*)?$/.exec(url)
                return match ? match[1] : null
            },
        },
    }

}

class HitomiSearch {
    constructor(source, keyword) {
        this.source = source
        this.keyword = keyword
        this.tagIndexVersion = null
        this.nozomiExtension = '.nozomi'
        this.indexDir = 'galleriesindex'
        this.galleriesIndexDir = 'galleriesindex'
        this.languagesIndexDir = 'languagesindex'
        this.nozomiUrlIndexDir = 'nozomiurlindex'
        this.rangeCache = new Map()
    }

    async search() {
        await this.getTagIndexVersion()
        const positive = [], negative = [], languages = []
        for (let term of this.keyword.toLowerCase().trim().split(/\s+/).filter(Boolean)) {
            term = term.replace(/_/g, ' ')
            if (term.startsWith('-')) negative.push(term.slice(1))
            else if (term.startsWith('language:')) languages.push(term)
            else positive.push(term)
        }
        let results
        if (languages.length === 1 && positive.length === 1 && positive[0].includes(':')) {
            results = await this.getGalleryIdsForTermAndLanguage(
                positive.shift(), languages.shift().slice('language:'.length))
        } else {
            const first = positive.shift() || languages.shift()
            results = first ? await this.getGalleryIdsForQuery(first) :
                await this.getGalleryIdsFromNozomi(null, 'index', 'all')
        }
        for (const term of [...positive, ...languages]) {
            const ids = await this.getGalleryIdsForQuery(term)
            const next = []
            let p1 = 0, p2 = 0
            while (p1 < ids.length && p2 < results.length) {
                if (ids[p1] > results[p2]) p1++
                else if (ids[p1] < results[p2]) p2++
                else {
                    next.push(results[p2])
                    p1++
                    p2++
                }
            }
            results = next
        }
        for (const term of negative) {
            const ids = await this.getGalleryIdsForQuery(term)
            const next = []
            let p1 = 0
            // Preserve unmatched IDs and the tail; never read after advancing past the end.
            for (const id of results) {
                while (p1 < ids.length && ids[p1] > id) p1++
                if (p1 === ids.length || ids[p1] !== id) next.push(id)
            }
            results = next
        }
        return results
    }

    async getTagIndexVersion() {
        this.tagIndexVersion = String(await this.source.get(this.source.ltn +
            '/galleriesindex/version?_=' + Math.floor(Date.now() / 1000))).trim()
        if (!/^\d+$/.test(this.tagIndexVersion)) throw new Error('Invalid index version')
    }

    async getGalleryIdsFromNozomi(area, tag, language) {
        const url = this.source.ltn + '/n/' +
            (area == null ? '' : encodeURIComponent(area) + '/') +
            encodeURIComponent(tag) + '-' + encodeURIComponent(language) + this.nozomiExtension
        return this.source.decodeIds((await this.source.getBytes(url)).bytes)
    }

    async getGalleryIdsForQuery(query) {
        query = query.replace(/_/g, ' ')
        if (query.includes(':')) return this.getGalleryIdsForTermAndLanguage(query, 'all')
        const key = this.hashTerm(query)
        const node = await this.getNodeAtAddress('galleries', 0)
        const data = await this.bSearch('galleries', key, node)
        return data == null ? [] : this.getGalleryIdsFromData(data)
    }

    getGalleryIdsForTermAndLanguage(term, language) {
        const colon = term.indexOf(':')
        const ns = term.slice(0, colon)
        let tag = term.slice(colon + 1)
        let area = ns
        if (ns === 'female' || ns === 'male') {
            area = 'tag'
            tag = term
        } else if (ns === 'language') {
            area = null
            language = tag
            tag = 'index'
        }
        return this.getGalleryIdsFromNozomi(area, tag, language)
    }

    hashTerm(term) {
        return this.source.bytes(Convert.sha256(Convert.encodeUtf8(term))).slice(0, 4)
    }

    async getUrlAtRange(url, range) {
        const key = url + ':' + range.join('-')
        if (this.rangeCache.has(key)) return this.rangeCache.get(key)
        const result = await this.source.getBytes(url, range, {
            'Referer': 'https://hitomi.la/search.html',
            'Origin': 'https://hitomi.la',
        })
        if (result.bytes.length !== range[1] - range[0] + 1) {
            throw new Error('Truncated index data')
        }
        this.rangeCache.set(key, result.bytes)
        return result.bytes
    }

    async getNodeAtAddress(field, address) {
        const url = this.source.ltn + '/' + this.indexDir + '/' +
            field + '.' + this.tagIndexVersion + '.index'
        return this.decodeNodeData(await this.getUrlAtRange(url, [address, address + 463]))
    }

    decodeNodeData(bytes) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        let pos = 0
        const int32 = () => {
            const value = view.getInt32(pos, false)
            pos += 4
            return value
        }
        const uint64 = () => {
            const value = view.getUint32(pos, false) * 0x100000000 +
                view.getUint32(pos + 4, false)
            pos += 8
            if (!Number.isSafeInteger(value)) throw new Error('Index offset exceeds JS precision')
            return value
        }
        const numberOfKeys = int32()
        if (numberOfKeys < 0 || numberOfKeys > 16) throw new Error('Invalid key count')
        const keys = []
        for (let i = 0; i < numberOfKeys; i++) {
            const size = int32()
            if (size <= 0 || size > 32 || pos + size > bytes.length) {
                throw new Error('Invalid index key')
            }
            keys.push(bytes.slice(pos, pos + size))
            pos += size
        }
        const numberOfDatas = int32()
        if (numberOfDatas !== numberOfKeys) throw new Error('Invalid index data count')
        const data = []
        for (let i = 0; i < numberOfDatas; i++) data.push([uint64(), int32()])
        const subNodeAddresses = []
        // Keep all 17 child slots, including zeroes; their positions match the keys.
        for (let i = 0; i < 17; i++) subNodeAddresses.push(uint64())
        return { keys, data, subNodeAddresses }
    }

    async bSearch(field, key, node) {
        const visited = new Set()
        while (node && node.keys.length) {
            let where = 0
            for (; where < node.keys.length; where++) {
                const other = node.keys[where]
                let cmp = 0
                for (let i = 0; i < Math.min(key.length, other.length); i++) {
                    if (key[i] !== other[i]) {
                        cmp = key[i] < other[i] ? -1 : 1
                        break
                    }
                }
                if (cmp === 0) cmp = key.length - other.length
                if (cmp === 0) return node.data[where]
                if (cmp < 0) break
            }
            const address = node.subNodeAddresses[where]
            if (!address) return null
            if (visited.has(address)) throw new Error('Cyclic index node')
            visited.add(address)
            node = await this.getNodeAtAddress(field, address)
        }
        return null
    }

    async getGalleryIdsFromData(data) {
        const [offset, length] = data
        if (length <= 0 || length > 100000000) throw new Error('Invalid index data length')
        const url = this.source.ltn + '/' + this.galleriesIndexDir +
            '/galleries.' + this.tagIndexVersion + '.data'
        const bytes = await this.getUrlAtRange(url, [offset, offset + length - 1])
        if (bytes.length < 4) throw new Error('Missing gallery count')
        const count = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(0, false)
        if (count < 0 || count > 10000000 || bytes.length !== count * 4 + 4) {
            throw new Error('Invalid gallery data')
        }
        return this.source.decodeIds(bytes.subarray(4))
    }
}

class GG {
    constructor(source) {
        this.source = source
        this.numbers = []
        this.initialG = 1
        this.b = null
    }

    static cache = null

    mm(g) {
        return this.numbers.includes(String(g)) ? (~this.initialG & 1) : this.initialG
    }

    static s(hash) {
        const match = /(..)(.)$/.exec(hash)
        return match ? parseInt(match[2] + match[1], 16).toString() : ''
    }

    async getGg(galleryId) {
        const domain = this.source.baseDomain
        if (GG.cache && GG.cache.domain === domain && Date.now() - GG.cache.time < 100) {
            this.numbers = GG.cache.numbers
            this.initialG = GG.cache.initialG
            this.b = GG.cache.b
            return
        }
        const body = await this.source.get(this.source.ltn + '/gg.js?_=1683939645979', {
            'Referer': 'https://hitomi.la/reader/' + galleryId + '.html',
        })
        const b = /b:\s*'(\d+)/.exec(body)
        const initial = /var o = (\d+)/.exec(body)
        if (!b || !initial) throw new Error('Invalid gg.js')
        this.numbers = Array.from(body.matchAll(/case (\d+)/g), m => m[1])
        this.b = b[1]
        this.initialG = Number(initial[1])
        GG.cache = {
            domain, time: Date.now(), numbers: this.numbers,
            b: this.b, initialG: this.initialG,
        }
    }

    subdomainFromUrl(url, base) {
        let retval = base == null ? 'b' : base
        const match = /\/[0-9a-f]{61}([0-9a-f]{2})([0-9a-f])/.exec(url)
        if (!match) return 'a'
        const g = parseInt(match[2] + match[1], 16)
        const char = String.fromCharCode(97 + this.mm(g))
        if (retval === 'tn') retval = char + retval
        else if (retval === 'w') {
            if (char === 'a') retval += '1'
            else if (char === 'b') retval += '2'
        }
        return retval
    }

    fullPathFromHash(hash) {
        return this.b + '/' + GG.s(hash) + '/' + hash
    }

    realFullPathFromHash(hash) {
        const match = /(..)(.)$/.exec(hash)
        if (!match) throw new Error('Invalid image hash')
        return match[2] + '/' + match[1] + '/' + hash
    }

    urlFromUrl(url, base) {
        return url.replace('https://', 'https://' + this.subdomainFromUrl(url, base) + '.')
    }

    urlFromHash(image, dir, ext) {
        if (ext == null) {
            if (dir == null) dir = image.name.split('.').pop()
            ext = dir
        }
        if (dir == null) dir = 'images'
        if (dir.includes('small')) {
            return this.urlFromUrl('https://' + this.source.baseDomain + '/' + dir +
                '/' + this.realFullPathFromHash(image.hash) + '.' + ext, 'tn')
        }
        return this.urlFromUrl('https://' + this.source.baseDomain + '/' +
            this.fullPathFromHash(image.hash) + '.' + ext, 'w')
    }
}
