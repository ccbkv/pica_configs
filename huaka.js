/** @type {import('./_venera_.js')} */

function decodeHtml(text) {
    return (text ?? "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, "/");
}

function cleanText(text) {
    return decodeHtml((text ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ")).trim();
}

function uniquePush(arr, value) {
    if (value && arr.indexOf(value) === -1) {
        arr.push(value);
    }
}

function isNoiseText(text) {
    if (!text) return true;
    if (/^\d+$/.test(text)) return true;
    if (/^\d+%$/.test(text)) return true;
    if (/^\d+点赞$/.test(text)) return true;
    if (/^\d+收藏$/.test(text)) return true;
    if (/^第\s*\d+\s*\/\s*\d+\+?\s*页$/.test(text)) return true;
    if (/^页\s*\d+\s*共\s*\d+$/.test(text)) return true;
    if (/^\d{4}年\d{1,2}月\d{1,2}日/.test(text)) return true;
    if (/^(作者|话列表|上一话|下一话|上一页|下一页|开始阅读|最新话|跳转页码|前往|纵向|横向|结果|最新|最热)$/.test(text)) return true;
    return false;
}

function splitMaybeTags(text) {
    if (!text) return [];
    if (text.length > 80) return [];
    let parts = text
        .replace(/#/g, " ")
        .split(/[\/｜丨·,\s]+/)
        .map(cleanText)
        .filter(Boolean);
    let result = [];
    for (let p of parts) {
        if (p.length >= 2 && p.length <= 20 && !/^\d+$/.test(p)) {
            uniquePush(result, p);
        }
    }
    return result;
}

class Huaka extends ComicSource {
    name = "花咔漫画"

    key = "huaka"

    version = "1.0.0"

    minAppVersion = "1.6.0"

    url = "https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/huaka.js"

    settings = {
        domain: {
            title: "域名",
            type: "input",
            default: "app.huakacomic.com",
        },
        locale: {
            title: "语言",
            type: "select",
            options: [
                { value: "zh-CN", text: "简中" },
                { value: "zh-TW", text: "繁中" },
            ],
            default: "zh-CN",
        },
        imageQuality: {
            title: "图片画质",
            type: "select",
            options: [
                { value: "read", text: "标准" },
                { value: "read_hd", text: "高清" },
            ],
            default: "read",
        },
    }

    get baseUrl() {
        return `https://${this.loadSetting("domain") || "app.huakacomic.com"}`
    }

    get locale() {
        return this.loadSetting("locale") || "zh-CN"
    }

    get sitePrefix() {
        return `${this.baseUrl}/${this.locale}`
    }

    get headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
            "Referer": `${this.sitePrefix}/`,
        }
    }

    normalizeUrl(url) {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        if (url.startsWith("//")) return "https:" + url;
        if (url.startsWith("/")) return this.baseUrl + url;
        return this.baseUrl + "/" + url;
    }

    async request(url) {
        let res = await Network.get(url, this.headers);
        if (res.status !== 200) {
            throw `Invalid status code: ${res.status}`;
        }
        return res.body;
    }

    async requestJson(url) {
        let body = await this.request(url);
        try {
            return JSON.parse(body);
        } catch (_) {
            throw "接口返回不是有效 JSON";
        }
    }

    getElementImage(el) {
        if (!el || !el.attributes) return "";
        let src = el.attributes["src"] || el.attributes["data-src"] || el.attributes["data-original"] || "";
        if (!src || src.startsWith("data:")) return "";
        return this.normalizeUrl(src);
    }

    isPageImageUrl(url) {
        if (!url || typeof url !== "string") return false;
        if (!/^https?:\/\//.test(url) && url.indexOf("/pica-media/") < 0) return false;
        if (url.indexOf("/thumbnails/") >= 0) return false;
        if (url.indexOf("/avatars/") >= 0) return false;
        if (url.indexOf("/badges/") >= 0) return false;
        if (url.indexOf("/achievements/") >= 0) return false;
        return /\.(webp|jpg|jpeg|png)(\?|$)/i.test(url) || url.indexOf("/medias/") >= 0 || url.indexOf("/pages/") >= 0 || url.indexOf("/images/") >= 0;
    }

    collectPageImages(value, result) {
        if (value == null) return;
        if (typeof value === "string") {
            let url = this.normalizeUrl(value);
            if (this.isPageImageUrl(url)) {
                uniquePush(result, url);
            }
            return;
        }
        if (Array.isArray(value)) {
            for (let item of value) {
                this.collectPageImages(item, result);
            }
            return;
        }
        if (typeof value === "object") {
            const preferredKeys = ["url", "originalUrl", "sourceUrl", "imageUrl", "mediaUrl", "src"];
            for (let key of preferredKeys) {
                if (typeof value[key] === "string") {
                    let url = this.normalizeUrl(value[key]);
                    if (this.isPageImageUrl(url)) {
                        uniquePush(result, url);
                    }
                }
            }
            for (let key in value) {
                this.collectPageImages(value[key], result);
            }
        }
    }

    findNextPageToken(value) {
        if (value == null) return null;
        if (Array.isArray(value)) {
            for (let item of value) {
                let token = this.findNextPageToken(item);
                if (token) return token;
            }
            return null;
        }
        if (typeof value === "object") {
            const keys = ["nextPageToken", "pageToken", "nextToken"];
            for (let key of keys) {
                if (typeof value[key] === "string" && value[key]) {
                    return value[key];
                }
            }
            for (let key in value) {
                let token = this.findNextPageToken(value[key]);
                if (token) return token;
            }
        }
        return null;
    }

    extractEpisodeId(epId) {
        if (!epId) return "";
        let match = epId.match(/\/episodes\/([0-9a-f]{24})/i);
        if (match) return match[1];
        return epId;
    }

    extractRscLiteral(text, marker) {
        let start = text.indexOf(marker);
        if (start < 0) return null;
        start += marker.length;
        let open = text[start];
        if (open !== '[' && open !== '{') return null;
        let close = open === '[' ? ']' : '}';
        let depth = 0;
        let quote = null;
        let escaped = false;
        for (let i = start; i < text.length; i++) {
            let ch = text[i];
            if (quote) {
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === quote) {
                    quote = null;
                }
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                quote = ch;
                continue;
            }
            if (ch === open) depth++;
            if (ch === close) depth--;
            if (depth === 0) {
                return text.substring(start, i + 1);
            }
        }
        return null;
    }

    parseRscLiteral(text, marker, fallback) {
        let literal = this.extractRscLiteral(text, marker);
        if (!literal) return fallback;
        try {
            return Function(`return (${literal})`)();
        } catch (_) {
            return fallback;
        }
    }

    parseRscLiteralAny(text, markers, fallback) {
        for (let marker of markers) {
            let value = this.parseRscLiteral(text, marker, null);
            if (value != null) return value;
        }
        return fallback;
    }

    parseSearchComic(item) {
        let id = cleanText(item?.huaCode || item?.id || "") || "unknown";
        let title = cleanText(item?.title || item?.huaCode || item?.id || "") || id;
        let authors = Array.isArray(item?.authors)
            ? item.authors.map(x => cleanText(x)).filter(Boolean)
            : [];
        let tags = [
            ...(Array.isArray(item?.categories) ? item.categories : []),
            ...(Array.isArray(item?.tags) ? item.tags : []),
        ].map(x => cleanText(x)).filter(Boolean);
        let subTitle = authors.length ? authors.join(', ') : "";
        let cover = typeof item?.thumbnailUrl === "string" ? item.thumbnailUrl : "";
        let description = typeof item?.description === "string" ? item.description : "";
        let maxPage = typeof item?.totalPages === 'number' ? item.totalPages : 0;
        return new Comic({
            id: id,
            title: title,
            subTitle: subTitle,
            cover: cover,
            tags: tags,
            description: description,
            maxPage: maxPage,
        });
    }

    parseComicList(html) {
        let doc = new HtmlDocument(html);
        let groups = new Map();

        for (let a of doc.querySelectorAll("a")) {
            let href = (a.attributes && a.attributes["href"]) || "";
            let match = href.match(/\/(?:[a-z]{2}-[A-Z]{2}\/)?comics\/(HC\d+)/);
            if (!match) continue;

            let id = match[1];
            if (!groups.has(id)) {
                groups.set(id, {
                    id: id,
                    href: href,
                    cover: "",
                    texts: [],
                });
            }

            let item = groups.get(id);
            if (!item.href) {
                item.href = href;
            }

            let img = a.querySelector("img");
            if (img) {
                let cover = this.getElementImage(img);
                if (cover && !item.cover) {
                    item.cover = cover;
                }
            }

            let text = cleanText(a.text);
            if (!isNoiseText(text)) {
                uniquePush(item.texts, text);
            }
        }

        let comics = [];
        for (let item of groups.values()) {
            let title = item.texts[0] || item.id;
            let subTitle = item.texts.length > 1 && item.texts[1] !== title ? item.texts[1] : undefined;
            let tags = [];
            if (item.texts.length > 2) {
                for (let t of splitMaybeTags(item.texts[2])) {
                    uniquePush(tags, t);
                }
            }
            let description = item.texts.length > 2 ? item.texts.slice(2).join(" · ") : undefined;

            comics.push(new Comic({
                id: item.id,
                title: title,
                subTitle: subTitle,
                cover: item.cover || undefined,
                tags: tags,
                description: description,
            }));
        }

        return comics;
    }

    extractHomeSectionHtml(html, title, nextTitles) {
        let start = html.indexOf(title);
        if (start < 0) return "";
        let end = html.length;
        for (let nextTitle of nextTitles || []) {
            let index = html.indexOf(nextTitle, start + title.length);
            if (index >= 0 && index < end) {
                end = index;
            }
        }
        return html.substring(start, end);
    }

    parseHomeSectionComics(html, title, nextTitles) {
        let sectionHtml = this.extractHomeSectionHtml(html, title, nextTitles);
        if (!sectionHtml) return [];
        return this.parseComicList(sectionHtml);
    }

    parseMaxPage(html) {
        let maxPage = 1;
        let doc = new HtmlDocument(html);
        for (let a of doc.querySelectorAll("a")) {
            let href = (a.attributes && a.attributes["href"]) || "";
            let match = href.match(/[?&]page=(\d+)/);
            if (match) {
                let page = parseInt(match[1]);
                if (!isNaN(page) && page > maxPage) {
                    maxPage = page;
                }
            }
        }
        return maxPage;
    }

    extractMetaDescription(html) {
        let match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["']/i);
        return match ? cleanText(match[1]) : "";
    }

    parseEpisodeGroups(doc) {
        let groups = new Map();

        for (let a of doc.querySelectorAll("a")) {
            let href = (a.attributes && a.attributes["href"]) || "";
            if (!/\/(?:[a-z]{2}-[A-Z]{2}\/)?comics\/[0-9a-f]{24}\/episodes\/[0-9a-f]{24}/i.test(href)) {
                continue;
            }

            if (!groups.has(href)) {
                groups.set(href, {
                    href: href,
                    texts: [],
                    order: 0,
                });
            }

            let item = groups.get(href);
            let text = cleanText(a.text);
            if (text) {
                uniquePush(item.texts, text);
                let orderMatch = text.match(/#\s*(\d+)/);
                if (orderMatch) {
                    item.order = parseInt(orderMatch[1]);
                } else if (/^\d{1,4}$/.test(text)) {
                    item.order = parseInt(text);
                }
            }
        }

        let result = [];
        for (let item of groups.values()) {
            let title = item.texts[0] || item.href;
            if (/^\d{1,4}$/.test(title) && item.texts.length > 1) {
                title = item.texts[1];
            }
            result.push({
                href: item.href,
                title: title,
                order: item.order,
            });
        }

        result.sort((a, b) => {
            if (a.order && b.order) return a.order - b.order;
            return a.href.localeCompare(b.href);
        });

        return result;
    }

    parseDetailTags(doc) {
        let tags = {
            "作者": [],
            "汉化组": [],
            "分类": [],
            "标签": [],
        };

        for (let a of doc.querySelectorAll("a")) {
            let href = (a.attributes && a.attributes["href"]) || "";
            let text = cleanText(a.text);
            if (isNoiseText(text)) continue;

            if (/\/authors\//.test(href)) {
                uniquePush(tags["作者"], text);
            } else if (/\/translation-teams\//.test(href)) {
                uniquePush(tags["汉化组"], text);
            } else if (/\/categories\//.test(href)) {
                uniquePush(tags["分类"], text.replace(/^#/, ""));
            } else if (/\/tags\//.test(href)) {
                uniquePush(tags["标签"], text.replace(/^#/, ""));
            }
        }

        let result = {};
        for (let key in tags) {
            if (tags[key].length > 0) {
                result[key] = tags[key];
            }
        }
        return result;
    }

    parseHuakaComment(item) {
        return new Comment({
            userName: item.user?.displayName || item.user?.username || "匿名",
            avatar: item.user?.avatarUrl || undefined,
            content: item.content || "",
            time: item.createdAt || item.updatedAt,
            replyCount: item.totalReplies ?? 0,
            id: item.id,
            isLiked: !!item.isLiked,
            score: item.totalLikes ?? 0,
        });
    }

    async resolveComicTargetId(comicId, subId) {
        if (subId && /^[0-9a-f]{24}$/i.test(subId)) return subId;
        if (/^[0-9a-f]{24}$/i.test(comicId)) return comicId;
        let html = await this.request(`${this.sitePrefix}/comics/${comicId}`);
        let target = this.parseRscLiteralAny(html, ['"target":', '\\"target\\":'], null);
        if (target && target.type === "comic" && /^[0-9a-f]{24}$/i.test(target.id || "")) {
            return target.id;
        }
        let comic = this.parseRscLiteralAny(html, ['"comic":', '\\"comic\\":'], null);
        if (comic && /^[0-9a-f]{24}$/i.test(comic.id || "")) {
            return comic.id;
        }
        let match = html.match(/"targetId":"([0-9a-f]{24})"/i)
            || html.match(/"comicId":"([0-9a-f]{24})"/i)
            || html.match(/"target":\{"type":"comic","id":"([0-9a-f]{24})"/i)
            || html.match(/\\"targetId\\":\\"([0-9a-f]{24})\\"/i)
            || html.match(/\\"comicId\\":\\"([0-9a-f]{24})\\"/i)
            || html.match(/\\"target\\":\{\\"type\\":\\"comic\\",\\"id\\":\\"([0-9a-f]{24})\\"/i);
        if (match) return match[1];
        throw "未找到漫画内部 ID，无法加载评论";
    }

    explore = [
        {
            title: "花咔首页",
            type: "singlePageWithMultiPart",
            load: async () => {
                let html = await this.request(`${this.sitePrefix}`);
                let result = {};

                let recommend = this.parseHomeSectionComics(html, "为你推荐", ["最新上架"]);
                if (recommend.length > 0) {
                    result["为你推荐"] = recommend;
                }

                let newest = this.parseHomeSectionComics(html, "最新上架", ["最新更新"]);
                if (newest.length > 0) {
                    result["最新上架"] = newest;
                }

                let updated = this.parseHomeSectionComics(html, "最新更新", ["最多阅读"]);
                if (updated.length > 0) {
                    result["最新更新"] = updated;
                }

                let mostRead = this.parseHomeSectionComics(html, "最多阅读", ["热门推荐系列"]);
                if (mostRead.length > 0) {
                    result["最多阅读"] = mostRead;
                }

                return result;
            }
        }
    ]

    category = {
        title: "花咔漫画",
        parts: [
            {
                name: "分类",
                type: "fixed",
                categories: [
                    "短篇",
                    "長篇",
                    "全彩",
                    "同人",
                    "正太",
                    "FURRY",
                    "純愛",
                    "NTR",
                    "韓漫｜WEBTOON",
                    "調教｜BDSM",
                    "CG雜圖",
                    "生肉",
                    "一般向丨無H內容",
                    "重口丨獵奇",
                    "ABO",
                    "女體化",
                    "互攻",
                    "筋肉系",
                    "單行本",
                ],
                itemType: "category",
            }
        ],
        enableRankingPage: false,
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            let sort = (options && options[0]) || "latest";
            let url = `${this.sitePrefix}/categories/${encodeURIComponent(category)}?sort=${encodeURIComponent(sort)}`;
            if (page > 1) {
                url += `&page=${page}`;
            }
            let html = await this.request(url);
            let items = this.parseRscLiteral(html, "initialComics:", null);
            let nextPageToken = null;
            let tokenMatch = html.match(/initialNextPageToken:(null|"(?:[^"\\]|\\.)*")/);
            if (tokenMatch && tokenMatch[1] !== "null") {
                try {
                    nextPageToken = Function(`return (${tokenMatch[1]})`)();
                } catch (_) {}
            }
            if (Array.isArray(items)) {
                return {
                    comics: items.map(item => this.parseSearchComic(item)),
                    maxPage: nextPageToken ? page + 1 : page,
                };
            }
            return {
                comics: this.parseComicList(html),
                maxPage: this.parseMaxPage(html),
            };
        },
        optionList: [
            {
                label: "排序",
                options: [
                    "latest-最近更新",
                    "most_read-最多阅读",
                    "most_bookmarked-最多收藏",
                    "most_liked-最多点赞",
                ],
            }
        ]
    }

    search = {
        load: async (keyword, options, page) => {
            let sort = (options && options[0]) || "relevance";
            let url = `${this.sitePrefix}/search?query=${encodeURIComponent(keyword)}&sort=${encodeURIComponent(sort)}`;
            if (page > 1) {
                url += `&page=${page}`;
            }
            let html = await this.request(url);
            let items = this.parseRscLiteral(html, "initialComics:", null);
            let nextPageToken = null;
            let tokenMatch = html.match(/initialNextPageToken:(null|"(?:[^"\\]|\\.)*")/);
            if (tokenMatch && tokenMatch[1] !== "null") {
                try {
                    nextPageToken = Function(`return (${tokenMatch[1]})`)();
                } catch (_) {}
            }
            if (Array.isArray(items)) {
                return {
                    comics: items.map(item => this.parseSearchComic(item)),
                    maxPage: nextPageToken ? page + 1 : page,
                };
            }
            return {
                comics: this.parseComicList(html),
                maxPage: this.parseMaxPage(html),
            };
        },
        optionList: [
            {
                label: "排序",
                options: [
                    "relevance-相关度",
                    "latest-最近更新",
                    "most_read-最多阅读",
                    "most_bookmarked-最多收藏",
                    "most_liked-最多点赞",
                ],
            }
        ],
        enableTagsSuggestions: false,
    }

    comic = {
        loadInfo: async (id) => {
            let html = await this.request(`${this.sitePrefix}/comics/${id}`);
            let doc = new HtmlDocument(html);
            let target = this.parseRscLiteral(html, '"target":', null);
            let comic = this.parseRscLiteral(html, '"comic":', null);
            let subId = "";
            if (target && target.type === "comic" && /^[0-9a-f]{24}$/i.test(target.id || "")) {
                subId = target.id;
            } else if (comic && /^[0-9a-f]{24}$/i.test(comic.id || "")) {
                subId = comic.id;
            } else {
                let match = html.match(/"targetId":"([0-9a-f]{24})"/i)
                    || html.match(/"comicId":"([0-9a-f]{24})"/i)
                    || html.match(/"target":\{"type":"comic","id":"([0-9a-f]{24})"/i);
                if (match) subId = match[1];
            }

            let title = "";
            let titleEl = doc.querySelector("h1");
            if (titleEl) {
                title = cleanText(titleEl.text);
            }
            if (!title) {
                title = id;
            }

            let cover = "";
            for (let img of doc.querySelectorAll("img")) {
                let src = this.getElementImage(img);
                if (!src) continue;
                if (src.indexOf("/pica-media/comics/") >= 0 && src.indexOf("/thumbnails/") < 0) {
                    cover = src;
                    break;
                }
                if (src.indexOf("/pica-media/comics/") >= 0 && !cover) {
                    cover = src;
                }
            }

            let tags = this.parseDetailTags(doc);
            let description = this.extractMetaDescription(html);

            let chapters = {};
            let addEpisodes = (items) => {
                if (!Array.isArray(items)) return;
                for (let item of items) {
                    let epId = item && item.id;
                    if (!epId) continue;
                    let title = cleanText(item.title || "");
                    if (!title) {
                        title = item.order ? `第${item.order}话` : epId;
                    }
                    chapters[`${this.sitePrefix}/comics/${id}/episodes/${epId}`] = title;
                }
            };
            let initialEpisodes = this.parseRscLiteralAny(html, ['"initialEpisodes":', '\\"initialEpisodes\\":'], null);
            let initialNextPageTokenMatch = html.match(/initialNextPageToken:(null|"(?:[^"\\]|\\.)*")/)
                || html.match(/\\"initialNextPageToken\\":(null|"(?:[^"\\]|\\.)*")/);
            let initialNextPageToken = null;
            if (initialNextPageTokenMatch && initialNextPageTokenMatch[1] !== "null") {
                try {
                    initialNextPageToken = Function(`return (${initialNextPageTokenMatch[1]})`)();
                } catch (_) {}
            }
            addEpisodes(initialEpisodes);
            if (subId) {
                let pageToken = Array.isArray(initialEpisodes) ? initialNextPageToken : null;
                let shouldFetchFirstPage = !Array.isArray(initialEpisodes);
                while (shouldFetchFirstPage || pageToken) {
                    let url = `${this.baseUrl}/api/bff/episodes?comicId=${subId}&sortOrder=desc&pageSize=25`;
                    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
                    let data = await this.requestJson(url);
                    addEpisodes(data?.data?.episodes || data?.episodes || data?.data || []);
                    shouldFetchFirstPage = false;
                    let nextToken = this.findNextPageToken(data);
                    if (!nextToken || nextToken === pageToken) break;
                    pageToken = nextToken;
                }
            }
            if (Object.keys(chapters).length === 0) {
                let eps = this.parseEpisodeGroups(doc);
                for (let ep of eps) {
                    chapters[ep.href] = ep.title;
                }
            }

            let recommend = [];
            let recommendMap = {};
            let addRecommend = (items) => {
                if (!Array.isArray(items)) return;
                for (let item of items) {
                    let comic = this.parseSearchComic(item);
                    if (!comic || !comic.id || comic.id === id || recommendMap[comic.id]) continue;
                    recommendMap[comic.id] = true;
                    recommend.push(comic);
                }
            };
            addRecommend(this.parseRscLiteralAny(html, ['"initialComics":', '\\"initialComics\\":'], null));
            if (subId) {
                let pageToken = null;
                while (recommend.length < 20) {
                    let url = `${this.baseUrl}/api/bff/recommendations/comics/${subId}?pageSize=20&excludeRead=true`;
                    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
                    let data = await this.requestJson(url);
                    addRecommend(data?.data?.comics || data?.comics || data?.data || []);
                    let nextToken = this.findNextPageToken(data);
                    if (!nextToken || nextToken === pageToken) break;
                    pageToken = nextToken;
                }
            }
            if (recommend.length === 0) {
                recommend = this.parseComicList(html).filter(c => c.id !== id).slice(0, 20);
            } else {
                recommend = recommend.slice(0, 20);
            }

            let likesCount = undefined;
            let commentCount = undefined;
            let isLiked = undefined;
            if (comic) {
                let value = comic.totalLikes ?? comic.likesCount;
                if (typeof value === 'number') {
                    likesCount = value;
                }
                let comments = comic.totalComments ?? comic.commentCount ?? comic.commentsCount;
                if (typeof comments === 'number') {
                    commentCount = comments;
                }
                if (typeof comic.isLiked === 'boolean') {
                    isLiked = comic.isLiked;
                }
            }

            return new ComicDetails({
                title: title,
                subTitle: tags["作者"] ? tags["作者"].join(", ") : undefined,
                cover: cover || undefined,
                description: description || undefined,
                tags: tags,
                subId: subId || undefined,
                chapters: chapters,
                recommend: recommend,
                commentCount: commentCount,
                likesCount: likesCount,
                isLiked: isLiked,
            });
        },

        loadEp: async (comicId, epId) => {
            let episodeId = this.extractEpisodeId(epId);
            let images = [];
            let pageToken = null;
            let visitedTokens = {};

            while (true) {
                let mediaSize = this.loadSetting("imageQuality") || "read";
                let apiUrl = `${this.baseUrl}/api/bff/comic-pages?episodeId=${episodeId}&pageSize=25&mediaSize=${encodeURIComponent(mediaSize)}`;
                if (pageToken) {
                    apiUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
                }
                let data = await this.requestJson(apiUrl);
                this.collectPageImages(data, images);

                let nextToken = this.findNextPageToken(data);
                if (!nextToken || visitedTokens[nextToken]) {
                    break;
                }
                visitedTokens[nextToken] = true;
                pageToken = nextToken;
            }

            if (images.length === 0) {
                let url = /^https?:\/\//.test(epId) ? epId : this.normalizeUrl(epId);
                let html = await this.request(url);
                let doc = new HtmlDocument(html);
                for (let img of doc.querySelectorAll("img")) {
                    let src = this.getElementImage(img);
                    if (this.isPageImageUrl(src)) {
                        uniquePush(images, src);
                    }
                }
            }

            if (images.length === 0) {
                throw "未找到章节图片，comic-pages 接口返回结构可能已变更";
            }

            return {
                images: images,
            };
        },

        likeComic: async (id, isLike) => {
            let targetId = await this.resolveComicTargetId(id);
            let res = await Network.post(
                `${this.baseUrl}/api/bff/comics/${targetId}/like`,
                this.headers,
                {}
            );
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }
            return 'ok';
        },

        loadComments: async (comicId, subId, page, replyTo) => {
            if (!replyTo) {
                let html = await this.request(`${this.sitePrefix}/comics/${comicId}`);
                let target = this.parseRscLiteralAny(html, ['"target":', '\\"target\\":'], null);
                let initialComments = this.parseRscLiteralAny(html, ['"initialComments":', '\\"initialComments\\":'], null);
                let initialNextPageTokenMatch = html.match(/initialNextPageToken:(null|"(?:[^"\\]|\\.)*")/)
                    || html.match(/\\"initialNextPageToken\\":(null|"(?:[^"\\]|\\.)*")/);
                let initialNextPageToken = null;
                if (initialNextPageTokenMatch && initialNextPageTokenMatch[1] !== "null") {
                    try {
                        initialNextPageToken = Function(`return (${initialNextPageTokenMatch[1]})`)();
                    } catch (_) {}
                }
                if (page === 1 && Array.isArray(initialComments)) {
                    return {
                        comments: initialComments.map(item => this.parseHuakaComment(item)),
                        maxPage: initialNextPageToken ? 2 : 1,
                    };
                }
                subId = subId || (target && target.type === "comic" ? target.id : "");
            }
            let targetId = await this.resolveComicTargetId(comicId, subId);
            let pageToken = null;
            let currentPage = 1;
            while (currentPage < page) {
                let url = replyTo
                    ? `${this.baseUrl}/api/bff/comments/${replyTo}/replies?sort=most_updated`
                    : `${this.baseUrl}/api/bff/comments?targetType=comic&targetId=${targetId}&sort=most_updated`;
                if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
                let data = await this.requestJson(url);
                pageToken = this.findNextPageToken(data);
                if (!pageToken) return { comments: [], maxPage: currentPage };
                currentPage++;
            }
            let url = replyTo
                ? `${this.baseUrl}/api/bff/comments/${replyTo}/replies?sort=most_updated`
                : `${this.baseUrl}/api/bff/comments?targetType=comic&targetId=${targetId}&sort=most_updated`;
            if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
            let data = await this.requestJson(url);
            let items = data?.data?.comments || data?.comments || data?.data || [];
            if (!Array.isArray(items)) items = [];
            return {
                comments: items.map(item => this.parseHuakaComment(item)),
                maxPage: this.findNextPageToken(data) ? page + 1 : page,
            };
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: this.headers,
            };
        },

        onThumbnailLoad: (url) => {
            return {
                url: url,
                headers: this.headers,
            };
        },

        idMatch: "HC\\d+",

        onClickTag: (namespace, tag) => {
            if (namespace === "分类" || namespace === "标签") {
                return {
                    action: "category",
                    keyword: tag,
                };
            }
            return {
                action: "search",
                keyword: tag,
            };
        },

        link: {
            domains: [
                "app.huakacomic.com",
            ],
            linkToId: (url) => {
                let match = url.match(/\/comics\/(HC\d+)/);
                return match ? match[1] : null;
            }
        },

        enableTagsTranslate: false,
    }

    translation = {
        "zh_CN": {
            "花咔首页": "花咔首页",
            "排序": "排序",
            "相关度": "相关度",
            "最近更新": "最近更新",
            "最多阅读": "最多阅读",
            "最多收藏": "最多收藏",
            "最多点赞": "最多点赞",
            "域名": "域名",
            "语言": "语言",
            "图片画质": "图片画质",
            "标准": "标准",
            "高清": "高清",
        },
        "zh_TW": {
            "花咔首页": "花咔首頁",
            "排序": "排序",
            "相关度": "相關度",
            "最近更新": "最近更新",
            "最多阅读": "最多閱讀",
            "最多收藏": "最多收藏",
            "最多点赞": "最多點讚",
            "域名": "域名",
            "语言": "語言",
            "图片画质": "圖片畫質",
            "标准": "標準",
            "高清": "高清",
        }
    }
}