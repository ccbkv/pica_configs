class Baihehui extends ComicSource {
    constructor() {
        super();
        // 检查Comic是否已定义
        if (typeof Comic === 'undefined') {
            // 尝试从父类获取
            if (this.constructor.Comic) {
                this.Comic = this.constructor.Comic;
            } else {
                // 创建一个有效构造函数代替
                this.Comic = function(options) {
                    return {
                        id: options.id || '',
                        title: options.title || '',
                        cover: options.cover || '',
                        description: options.description || '',
                        tags: options.tags || [],
                        author: options.author || ''
                    };
                };
            }
        } else {
            this.Comic = Comic;
        }
        // 检查Chapter是否已定义
        if (typeof Chapter === 'undefined') {
            // 尝试从父类获取
            if (this.constructor.Chapter) {
                this.Chapter = this.constructor.Chapter;
            } else {
                // 创建一个有效构造函数代替
                this.Chapter = function(options) {
                    return {
                        id: options.id || '',
                        title: options.title || ''
                    };
                };
            }
        } else {
            this.Chapter = Chapter;
        }
    }
    // Note: The fields which are marked as [Optional] should be removed if not used

    // name of the source
    name = "百合会"

    // unique id of the source
    key = "baihehui"

    version = "1.0.0"

    minAppVersion = "1.4.0"

    // update url
    url = "https://raw.githubusercontent.com/ccbkv/pica_configs/master/baihehui.js"


    get baseUrl() {
        return `https://www.${this.loadSetting('domains')}`;
    }

    /**
     * [Optional] init function
     */
    init() {

    }

    account = {
        login: async (username, password) => {
            Network.deleteCookies("https://www.yamibo.com");
            // 1. GET 登录页，保存 PHPSESSID 和 _csrf-frontend
            let resGet = await Network.get("https://www.yamibo.com/user/login", {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            if (resGet.status !== 200) throw "无法打开登录页";

            // 1.1 提取并保存 GET 返回的 Set-Cookie
            let sc1 = resGet.headers["set-cookie"] || resGet.headers["Set-Cookie"] || [];
            let initialCookies = [];
            for (let line of Array.isArray(sc1) ? sc1 : [sc1]) {
                let [pair] = line.split(";");
                let [name, value] = pair.split("=");
                name = name.trim(); value = value.trim();
                if (name === "PHPSESSID" || name === "_csrf-frontend") {
                    initialCookies.push(new Cookie({ name, value, domain: "www.yamibo.com" }));
                }
            }
            Network.setCookies("https://www.yamibo.com", initialCookies);

            // 2. 解析 CSRF token
            let doc = new Document(resGet.body);
            let csrf = doc
                .querySelector('meta[name="csrf-token"]')
                .attributes.content;
            doc.dispose();

            // 3. 构造编码后的表单
            let form = [
                `_csrf-frontend=${encodeURIComponent(csrf)}`,
                `LoginForm%5Busername%5D=${encodeURIComponent(username)}`,
                `LoginForm%5Bpassword%5D=${encodeURIComponent(password)}`,
                'LoginForm%5BrememberMe%5D=0',
                'LoginForm%5BrememberMe%5D=1',
                `login-button=${encodeURIComponent("登录")}`
            ].join("&");

            // 4. POST 登录（会自动带上刚才的 Cookie）
            let resPost = await Network.post(
                "https://www.yamibo.com/user/login",
                {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": "https://www.yamibo.com/user/login",
                    "User-Agent": "Mozilla/5.0"
                },
                form
            );
            if (resPost.status === 400) throw "登录失败";
            Network.deleteCookies("https://www.yamibo.com");

            // …account.login 中 POST 后提取 Cookie 部分…
            let raw = resPost.headers["set-cookie"] || resPost.headers["Set-Cookie"];
            if (!raw) throw "未收到任何 Cookie";

            // 1. 将单条字符串按“逗号+Cookie名=”拆分
            let parts = Array.isArray(raw)
                ? raw
                : raw.split(/,(?=\s*(?:PHPSESSID|_identity-frontend|_csrf-frontend)=)/);

            // 2. 提取目标 Cookie
            const names = ["PHPSESSID", "_identity-frontend", "_csrf-frontend"];
            let cookies = parts.map(line => {
                let [pair] = line.split(";");
                let [k, v] = pair.split("=");
                k = k.trim(); v = v.trim();
                if (names.includes(k)) return new Cookie({ name: k, value: v, domain: "www.yamibo.com" });
            }).filter(Boolean);

            // 3. 验证并保存
            if (cookies.length !== names.length) {
                throw "登录未返回完整 Cookie，实际：" + cookies.map(c => c.name).join(",");
            }
            Network.setCookies("https://www.yamibo.com", cookies);

            return true;
        },

        logout: () => {
            Network.deleteCookies("https://www.yamibo.com");
        },

        registerWebsite: "https://www.yamibo.com/user/signup"
    }


    static category_types = {
        "全部作品": "manga/list@a@?",
        "原创": "manga/list?q=4@a@&",
        "同人": "manga/list?q=6@a@&",
    }

    static article_types = {
        "翻页漫画": "search/type?type=3&tag=@b@翻页漫画",
        "条漫": "search/type?type=3&tag=@b@条漫",
        "四格": "search/type?type=3&tag=@b@四格",
        "绘本": "search/type?type=3&tag=@b@绘本",
        "杂志": "search/type?type=3&tag=@b@杂志",
        "合志": "search/type?type=3&tag=@b@合志",
    }

    static relate_types = {
        "编辑推荐": "manga/rcmds?type=3012@c@&",
        "最近更新": "manga/latest@c@?",
        "原创推荐": "manga/rcmds?type=3014@c@&",
        "同人推荐": "manga/rcmds?type=3015@c@&",
    }




// explore page list
explore = [
    {
        title: "百合会",
        type: "multiPageComicList",
        load: async (page) => {
            if (page > 1) {
                return { comics: [], maxPage: 1 };
            }
            // 1. 拿到 HTML
            let res = await Network.get("https://www.yamibo.com/site/manga");
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            // 2. 解析文档
            let doc = new Document(res.body);

            // 3. 通用解析单元函数
            function parseItem(el) {
                try {
                    const a = el.querySelector(".media-img") || el.querySelector("a.media-img");
                    if (!a || !a.attributes.href) return null;

                    const href = a.attributes.href;
                    const rawIdMatch = href.match(/\/manga\/(\d+)/);
                    if (!rawIdMatch || !rawIdMatch[1]) return null;
                    
                    const rawId = rawIdMatch[1];
                    const id = rawId.padStart(3, '0');

                    const titleEl = el.querySelector("h3 a");
                    if (!titleEl || !titleEl.text) return null;
                    const title = titleEl.text.trim();
                    
                    const cover = `https://www.yamibo.com/coverm/000/000/${id}.jpg`;

                    return { id, title, cover };
                } catch (e) {
                    console.log(`Error parsing an item in explore.load: ${e}`);
                    return null;
                }
            }

            let allComics = [];

            const processElements = (elements) => {
                if (!elements) return;
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    const comicData = parseItem(el);
                    if (comicData) {
                        allComics.push(comicData);
                    }
                }
            };

            // 4. 抓「编辑推荐」
            try {
                const editorEls = doc.querySelectorAll(".recommend-list .media-cell.horizontal");
                processElements(editorEls);
            } catch (e) {
                console.log(`Error parsing editor picks: ${e}`);
            }

            // 5. 抓取其他分区
            try {
                const titleElements = doc.querySelectorAll("h2.module-title");
                if (titleElements) {
                    for (let i = 0; i < titleElements.length; i++) {
                        const titleEl = titleElements[i];
                        try {
                            const titleText = titleEl.text;
                            if (titleText.includes("最近更新") || titleText.includes("原创推荐") || titleText.includes("同人推荐")) {
                                const ul = titleEl.nextElementSibling;
                                if (ul) {
                                    const items = ul.querySelectorAll(".media-cell.vertical");
                                    processElements(items);
                                }
                            }
                        } catch(e) {
                            console.log(`Error processing section: ${e}`);
                        }
                    }
                }
            } catch (e) {
                console.log(`Error processing module titles: ${e}`);
            }

            // 7. 清理并返回
            doc.dispose();
            return {
                comics: allComics,
                maxPage: 1
            };
        }
    }
];

    // categories
    category = {
        /// title of the category page, used to identify the page, it should be unique
        title: "百合会",
        parts: [
            {
                name: "分类",
                type: "fixed",
                categories: Object.keys(Baihehui.category_types),
                itemType: "category",
                categoryParams: Object.values(Baihehui.category_types),
            },
            {
                name: "作品类型（需要登陆）",
                type: "fixed",
                categories: Object.keys(Baihehui.article_types),
                itemType: "category",
                categoryParams: Object.values(Baihehui.article_types),
            },
            {
                name: "更多推荐",
                type: "fixed",
                categories: Object.keys(Baihehui.relate_types),
                itemType: "category",
                categoryParams: Object.values(Baihehui.relate_types),
            },
        ],
        // enable ranking page
        enableRankingPage: false,
    }

    /// category comic loading related
    categoryComics = {
        load: async (category, params, options, page) => {
            let param = params.split('@')[0];
            let type = params.split('@')[1];
            let type_options = params.split('@')[2];
            let url = ""
            if (type == "b") {
                url = `${this.baseUrl}/${param}${encodeURIComponent(type_options)}&sort=updated_at`;
                url += `&page=${page}&per-page=50`;
            } else {
                url = `${this.baseUrl}/${param}${type_options}sort=updated_at`;
                url += `&page=${page}&per-page=50`;
            }

            // 发起请求
            let res = await Network.get(url, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }


            // 解析 HTML
            let document = new Document(res.body);

            // 获取最大页数
            let lastPageElement = document.querySelector('li.last > a');
            let maxPage = lastPageElement ? parseInt(lastPageElement.attributes['data-page']) + 1 : 1;


            // 分类解析、
            if (type == "a") {
                let mangaList = [];
                // 获取所有漫画行
                let rows = document.querySelectorAll('tr[data-key]');

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    try {
                        let anchor = row.querySelector('a');
                        if (!anchor) continue;

                        let href = anchor.attributes['href'];
                        if (!href) continue;

                        let rawIdMatch = href.match(/\/manga\/(\d+)$/);
                        if (!rawIdMatch || !rawIdMatch[1]) continue;

                        let rawId = rawIdMatch[1];
                        let id = rawId.padStart(3, '0');
                        let title = anchor.text;

                        let cells = row.querySelectorAll('td');
                        let author = cells.length > 2 ? cells[2].text : '';
                        let tags = [];
                        if (cells.length > 5) {
                            tags.push(cells[4].text); // 作品分类(原创/同人)
                            tags.push(cells[5].text); // 连载状态
                        }
                        let updateTime = cells.length > 8 ? cells[8].text : '';

                        // 构建漫画对象
                        let manga = {
                            id: id,
                            title: title,
                            cover: `https://www.yamibo.com/coverm/000/000/${id}.jpg`, // 默认封面
                            tags: tags,
                            description: `更新于: ${updateTime}`
                        };

                        mangaList.push(manga);
                    } catch (e) {
                        console.log(`Error parsing a row in categoryComics.load (type a): ${e}`);
                    }
                }

                return {
                    comics: mangaList,
                    maxPage: maxPage // 从分页信息可以看出总共5页
                };
            } else if (type == "b") {
                let mangaList = [];
                // 获取所有漫画行
                let rows = document.querySelectorAll('tr[data-key]');
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    try {
                        let anchor = row.querySelector('a');
                        if (!anchor) continue;

                        let href = anchor.attributes['href'];
                        if (!href) continue;

                        let rawIdMatch = href.match(/\/manga\/(\d+)$/);
                        if (!rawIdMatch || !rawIdMatch[1]) continue;

                        let rawId = rawIdMatch[1];
                        let id = rawId.padStart(3, '0');
                        let title = anchor.text;

                        let cells = row.querySelectorAll('td');
                        let author = cells.length > 2 ? cells[2].text : '';
                        let tags = [];
                        if (cells.length > 4) {
                            tags.push(cells[3].text.replace(/\[|\]/g, '')); // 作品分类 (去掉方括号)
                            tags.push(cells[4].text); // 连载状态
                        }
                        let updateTime = cells.length > 6 ? cells[6].text : '';

                        // 构建封面 URL
                        let cover = `https://www.yamibo.com/coverm/000/000/${id}.jpg`;

                        // 构建漫画对象
                        let manga = {
                            id: id,
                            title: title,
                            cover: cover, // 使用有效封面或默认封面
                            tags: tags,
                            description: `${updateTime}`
                        };

                        mangaList.push(manga);
                    } catch (e) {
                        console.log(`Error parsing a row in categoryComics.load (type b): ${e}`);
                    }
                }

                return {
                    comics: mangaList,
                    maxPage: maxPage // 从分页信息可以看出总共8页
                };
            } else {
                let mangaList = [];
                // 获取所有漫画行
                let rows = document.querySelectorAll('tr[data-key]');
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    try {
                        let anchor = row.querySelector('a');
                        if (!anchor) continue;

                        let href = anchor.attributes['href'];
                        if (!href) continue;

                        let rawIdMatch = href.match(/\/manga\/(\d+)$/);
                        if (!rawIdMatch || !rawIdMatch[1]) continue;

                        let rawId = rawIdMatch[1];
                        let id = rawId.padStart(3, '0');
                        let title = anchor.text;

                        let lastCell = row.querySelector('td:last-child');
                        let updateTime = lastCell ? lastCell.text.trim() : '';

                        // 构建封面 URL
                        let cover = `https://www.yamibo.com/coverm/000/000/${id}.jpg`;

                        // 构建漫画对象
                        let manga = {
                            id: id,
                            title: title,
                            cover: cover, // 使用有效封面或默认封面
                            tags: [],
                            description: `更新于: ${updateTime}`
                        };

                        mangaList.push(manga);
                    } catch (e) {
                        console.log(`Error parsing a row in categoryComics.load (type c): ${e}`);
                    }
                }

                return {
                    comics: mangaList,
                    maxPage: maxPage // 从分页信息可以看出总共8页
                };
            }
        }
    }

    /// search related
    search = {
        /**
         * load search result
         * @param keyword {string}
         * @param options {string[]} - options from optionList
         * @param page {number}
         * @returns {Promise<{comics: Comic[], maxPage: number}>}
         */
        load: async (keyword, options, page) => {
            let url = `https://www.yamibo.com/search/manga?SearchForm%5Bkeyword%5D=${encodeURIComponent(keyword)}&page=${page}`;
            let res = await Network.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0"
                }
            });

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let document = new Document(res.body);
            let lastPageElement = document.querySelector('li.last > a');
            let maxPage = lastPageElement ? parseInt(lastPageElement.attributes['data-page']) + 1 : 1;

            let mangaList = [];
            let rows = document.querySelectorAll('tr[data-key]');

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    let anchor = row.querySelector('a');
                    if (!anchor) continue;

                    let href = anchor.attributes['href'];
                    if (!href) continue;

                    let rawIdMatch = href.match(/\/manga\/(\d+)$/);
                    if (!rawIdMatch || !rawIdMatch[1]) continue;

                    let rawId = rawIdMatch[1];
                    let id = rawId.padStart(3, '0');
                    let title = anchor.text;

                    let lastCell = row.querySelector('td:last-child');
                    let updateTime = lastCell ? lastCell.text.trim() : '';

                    let cover = `https://www.yamibo.com/coverm/000/000/${id}.jpg`;

                    let manga = {
                        id: id,
                        title: title,
                        cover: cover,
                        tags: [],
                        description: `更新于: ${updateTime}`
                    };

                    mangaList.push(manga);
                } catch (e) {
                    console.log(`Error parsing a row in search.load: ${e}`);
                }
            }

            return {
                comics: mangaList,
                maxPage: maxPage
            };
        },

        /**
         * load search result with next page token.
         * The field will be ignored if `load` function is implemented.
         * @param keyword {string}
         * @param options {(string)[]} - options from optionList
         * @param next {string | null}
         * @returns {Promise<{comics: Comic[], maxPage: number}>}
         */
        loadNext: async (keyword, options, next) => {

        },

        // provide options for search
        optionList: [],

        // enable tags suggestions
        enableTagsSuggestions: false,
    }

    /// single comic related
    comic = {
        /**
         * load comic info
         * @param id {string}
         * @returns {Promise<ComicDetails>}
         */
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}/manga/${id}`);
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let document = new Document(res.body);
            let title = '未知标题';
            try {
                title = document.querySelector("h3.col-md-12").text.trim();
            } catch (e) {
                console.log(`Error parsing title: ${e}`);
            }

            let cover = `https://www.yamibo.com/coverm/000/000/${id}.jpg`;

            let author = "未知作者";
            try {
                let paragraphs = document.querySelectorAll("p");
                for (let i = 0; i < paragraphs.length; i++) {
                    const p = paragraphs[i];
                    if (p.text.includes("作者：")) {
                        author = p.text.replace("作者：", "").trim();
                        break; // 找到后即可退出循环
                    }
                }
            } catch (e) {
                console.log(`Error parsing author: ${e}`);
            }

            let tags = [];
            try {
                let tagElements = document.querySelectorAll("a.label.label-ntype");
                for (let i = 0; i < tagElements.length; i++) {
                    const tag = tagElements[i];
                    tags.push(tag.text.trim());
                }
            } catch (e) {
                console.log(`Error parsing tags: ${e}`);
            }

            let updateTime = "未知时间";
            try {
                let paragraphs = document.querySelectorAll("p");
                for (let i = 0; i < paragraphs.length; i++) {
                    const p = paragraphs[i];
                    if (p.text.includes("更新时间：")) {
                        updateTime = p.text.replace("更新时间：", "").trim();
                        break; // 找到后即可退出循环
                    }
                }
            } catch (e) {
                console.log(`Error parsing updateTime: ${e}`);
            }

            let description = "暂无简介";
            try {
                let descriptionEl = document.querySelector("#collapse-1 > .panel-body");
                if (descriptionEl) {
                    description = descriptionEl.text.trim();
                }
            } catch (e) {
                console.log(`Error parsing description: ${e}`);
            }

            let chapters = [];
            try {
                let chapterElements = document.querySelectorAll("div[data-key]");
                for (let i = 0; i < chapterElements.length; i++) {
                    const chapter = chapterElements[i];
                    let chapterKey = chapter.attributes['data-key'];
                    let chapterAnchor = chapter.querySelector("a");
                    if (chapterKey && chapterAnchor) {
                        let chapterTitle = chapterAnchor.text.trim();
                        chapters.push(new Chapter({
                            id: chapterKey,
                            title: chapterTitle,
                        }));
                    }
                }
            } catch (e) {
                console.log(`Error parsing chapters: ${e}`);
            }

            document.dispose();

            return {
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "作者": [author],
                    "更新": [updateTime],
                    "标签": tags
                },
                chapters: chapters
            };
        },
        loadComments: async (comicId, subId, page, replyTo) => {
            let url = `${this.baseUrl}/manga/${comicId}?dp-1-page=${page}`;
            let res = await Network.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0"
                }
            });

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let document = new Document(res.body);
            let totalComments = 0;
            try {
                let totalCommentsMatch = document.querySelector("div.panel-body").text.match(/共(\d+)篇/);
                totalComments = totalCommentsMatch ? parseInt(totalCommentsMatch[1]) : 0;
            } catch (e) {
                console.log(`Error parsing totalComments: ${e}`);
            }

            let comments = [];
            try {
                let posts = document.querySelectorAll("div.post.row");
                for (let i = 0; i < posts.length; i++) {
                    const post = posts[i];
                    try {
                        let userName = post.querySelector("span.cmt-username > a").text.trim();
                        let avatar = "https://www.yamibo.com/" + post.querySelector("a > img.cmt-avatar").attributes['src'];
                        let content = post.querySelector("div.row > p").text.trim();
                        let time = post.querySelector("span.description").text.replace("在 ", "").trim();
                        let replyCountMatch = post.querySelector("a.btn.btn-sm").text.match(/(\d+) 条回复/);
                        let replyCount = replyCountMatch ? parseInt(replyCountMatch[1]) : 0;
                        let id = post.querySelector("button.btn_reply").attributes['pid'];

                        comments.push({
                            userName: userName,
                            avatar: avatar,
                            content: content,
                            time: time,
                            replyCount: replyCount,
                            id: id
                        });
                    } catch (e) {
                        console.log(`Error parsing a comment: ${e}`);
                    }
                }
            } catch (e) {
                console.log(`Error parsing comments: ${e}`);
            }

            let maxPage = 1;
            try {
                let maxPageElement = document.querySelector("li.last > a");
                maxPage = maxPageElement ? parseInt(maxPageElement.attributes['data-page']) + 1 : 1;
            } catch (e) {
                console.log(`Error parsing maxPage: ${e}`);
            }

            document.dispose();

            return {
                comments: comments,
                totalComments: totalComments,
                maxPage: maxPage
            };
        },

        loadEp: async (comicId, epId) => {
            let url = `https://www.yamibo.com/manga/view-chapter?id=${epId}`;
            let res = await Network.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0"
                }
            });

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`;
            }

            let body = res.body;
            try {
                let match = body.match(/var pages = (.*?);/);
                if (match && match[1]) {
                    let pagesData = JSON.parse(match[1]);
                    let images = pagesData.map(p => p.url);
                    return { images: images };
                }
            } catch (e) {
                console.log(`Error parsing pages array: ${e}`);
            }

            // Fallback to single image parsing
            try {
                let doc = new Document(body);
                let imageElement = doc.querySelector("img#imgPic") || doc.querySelector(".comic-contain img");
                if (imageElement && imageElement.attributes['src']) {
                    let imageUrl = imageElement.attributes['src'];
                    doc.dispose();
                    return { images: [imageUrl] };
                }
                doc.dispose();
            } catch (e) {
                console.log(`Error parsing single image: ${e}`);
            }

            throw `Could not find any images for comicId: ${comicId}, epId: ${epId}`;
        },

        // enable tags translate
        enableTagsTranslate: false,
    }
}
