class CopyManga extends ComicSource {
    constructor() {
        super();
        this.init();
    }

    name = "拷贝漫画"

    key = "copy_manga"

    version = "1.1.6"

    minAppVersion = "3.1.0"

    url = "https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/copy_manga.js"

    headers = {}

    static copyVersion = "3.0.0"

    static generateDeviceInfo() {
        return `${randomInt(1000000, 9999999)}V-${randomInt(1000, 9999)}`;
    }

    static generateDevice() {
        function randCharA() {
            return String.fromCharCode(65 + randomInt(0, 25));
        }
        function randDigit() {
            return String.fromCharCode(48 + randomInt(0, 9));
        }
        return (
            randCharA() +
            randCharA() +
            randDigit() +
            randCharA() + "." +
            randDigit() +
            randDigit() +
            randDigit() +
            randDigit() +
            randDigit() +
            randDigit() + "." +
            randDigit() +
            randDigit() +
            randDigit()
        );
    }

    static generatePseudoid() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let pseudoid = '';
        for (let i = 0; i < 16; i++) {
            pseudoid += chars.charAt(randomInt(0, chars.length - 1));
        }
        return pseudoid;
    }

    init() {
        let token = this.loadData("token");
        let secret = "M2FmMDg1OTAzMTEwMzJlZmUwNjYwNTUwYTA1NjNhNTM="

        if (!token) {
            token = "";
        } else {
            token = " " + token;
        }
        this.headers = {
            "User-Agent": "COPY/" + CopyManga.copyVersion,
            "Accept": "*/*",
            "Accept-Encoding": "gzip",
            "source": "copyApp",
            "webp": "1",
            "region": "1",
            "version": CopyManga.copyVersion,
            "authorization": `Token${token}`,
            "platform": "3",
        }
    }

    account = {
        login: async function(account, pwd) {
            let salt = randomInt(1000, 9999)
            let base64 = Convert.encodeBase64(`${pwd}-${salt}`)
            let res = await Network.post(
                "https://api.2025copy.com/api/v3/login?platform=3",
                {
                    ...this.headers,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
                },
                `username=${account}&password=${base64}\n&salt=${salt}&platform=3&authorization=Token+&version=1.4.4&source=copyApp&region=1&webp=1`
            );
            if (res.status === 200) {
                let data = JSON.parse(res.body)
                let token = data.results.token
                this.saveData('token', token)
                this.headers = {
                    "User-Agent": "COPY/" + CopyManga.copyVersion,
                    "Accept": "*/*",
                    "Accept-Encoding": "gzip",
                    "source": "copyApp",
                    "webp": "1",
                    "region": "1",
                    "version": CopyManga.copyVersion,
                    "authorization": `Token ${token}`,
                    "platform": "3",
                }
                return "ok"
            } else {
                throw `Invalid Status Code ${res.status}`
            }
        }.bind(this),
        logout: function() {
            this.deleteData('token')
        }.bind(this),
        registerWebsite: "https://www.mangacopy.com/web/login/loginByAccount"
    }

    explore = [
        {
            title: "拷贝漫画",
            type: "singlePageWithMultiPart",
            load: async function() {
                let dataStr = await Network.get(
                    "https://api.2025copy.com/api/v3/h5/homeIndex?platform=3",
                    this.headers
                )

                if (dataStr.status !== 200) {
                    throw `Invalid status code: ${dataStr.status}`
                }

                let data = JSON.parse(dataStr.body)

                function parseComic(comic) {
                    if (comic["comic"] !== null && comic["comic"] !== undefined) {
                        comic = comic["comic"]
                    }
                    let tags = []
                    if (comic["theme"] !== null && comic["theme"] !== undefined) {
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
                        tags: tags
                    }
                }

                let res = {}
                res["推荐"] = data["results"]["recComics"]["list"].map(parseComic)
                res["热门"] = data["results"]["hotComics"].map(parseComic)
                res["最新"] = data["results"]["newComics"].map(parseComic)
                res["完结"] = data["results"]["finishComics"]["list"].map(parseComic)
                res["今日排行"] = data["results"]["rankDayComics"]["list"].map(parseComic)
                res["本周排行"] = data["results"]["rankWeekComics"]["list"].map(parseComic)
                res["本月排行"] = data["results"]["rankMonthComics"]["list"].map(parseComic)

                return res
            }.bind(this)
        }
    ]

    category = {
        title: "拷贝漫画",
        parts: [
            {
                name: "主题",
                type: "fixed",
                categories: ["全部", "爱情", "欢乐向", "冒险", "奇幻", "百合", "校园", "科幻", "东方", "耽美", "生活", "格斗", "轻小说", "悬疑",
                    "其它", "神鬼", "职场", "TL", "萌系", "治愈", "长条"],
                itemType: "category",
                categoryParams: ["", "aiqing", "huanlexiang", "maoxian", "qihuan", "baihe", "xiaoyuan", "kehuan", "dongfang", "danmei", "shenghuo", "gedou", "qingshuo", "xuanyi",
                    "qita", "shengui", "zhichang", "teenslove", "mengxi", "zhiliao", "changtiao"]
            }
        ]
    }

    categoryComics = {
        load: async function(category, param, options, page) {
            options = options.map(e => e.replace("*", "-"))
            let res = await Network.get(
                `https://api.2025copy.com/api/v3/comics?limit=21&offset=${(page - 1) * 21}&ordering=${options[1]}&theme=${param}&top=${options[0]}&platform=3`,
                this.headers
            )
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let data = JSON.parse(res.body)

            function parseComic(comic) {
                if (comic["comic"] !== null && comic["comic"] !== undefined) {
                    comic = comic["comic"]
                }
                let tags = []
                if (comic["theme"] !== null && comic["theme"] !== undefined) {
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
                    description: comic["datetime_updated"]
                }
            }

            return {
                comics: data["results"]["list"].map(parseComic),
                maxPage: (data["results"]["total"] - (data["results"]["total"] % 21)) / 21 + 1
            }
        }.bind(this),
        optionList: [
            {
                options: [
                    "-全部",
                    "japan-日漫",
                    "korea-韩漫",
                    "west-美漫",
                    "finish-已完结"
                ],
                notShowWhen: null,
                showWhen: null
            },
            {
                options: [
                    "*datetime_updated-时间倒序",
                    "datetime_updated-时间正序",
                    "*popular-热度倒序",
                    "popular-热度正序",
                ],
                notShowWhen: null,
                showWhen: null
            }
        ]
    }

    search = {
        load: async function(keyword, page) {
            let dataStr = await Network.get(
                `https://api.2025copy.com/api/v3/comics?limit=21&offset=${(page - 1) * 21}&keyword=${keyword}&platform=3`,
                this.headers
            )
            if (dataStr.status !== 200) {
                throw `Invalid status code: ${dataStr.status}`
            }

            let data = JSON.parse(dataStr.body)

            function parseComic(comic) {
                if (comic["comic"] !== null && comic["comic"] !== undefined) {
                    comic = comic["comic"]
                }
                let tags = []
                if (comic["theme"] !== null && comic["theme"] !== undefined) {
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
                    description: comic["datetime_updated"]
                }
            }

            return {
                comics: data["results"]["list"].map(parseComic),
                maxPage: (data["results"]["total"] - (data["results"]["total"] % 21)) / 21 + 1
            }
        }.bind(this),
        optionList: []
    }

    favorites = {
        multiFolder: false,
        addOrDelFavorite: async function(comicId, folderId, isAdding) {
            let is_collect = isAdding ? 1 : 0
            let token = this.loadData("token");
            let comicData = await Network.get(
                `https://api.2025copy.com/api/v3/comic2/${comicId}?platform=3`,
                this.headers
            )
            if (comicData.status !== 200) {
                throw `Invalid status code: ${comicData.status}`
            }
            let comic_id = JSON.parse(comicData.body).results.comic.uuid
            let res = await Network.post(
                "https://api.2025copy.com/api/v3/member/collect/comic?platform=3",
                {
                    ...this.headers,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                },
                `comic_id=${comic_id}&is_collect=${is_collect}&authorization=Token+${token}`
            )
            if (res.status === 401) {
                throw `Login expired`;
            }
            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }
            return "ok"
        }.bind(this),
        loadComics: async function(page, folder) {
            var res = await Network.get(
                `https://api.2025copy.com/api/v3/member/collect/comics?limit=21&offset=${(page - 1) * 21}&free_type=1&ordering=-datetime_updated&platform=3`,
                this.headers
            )

            if (res.status === 401) {
                throw `Login expired`
            }

            if (res.status !== 200) {
                throw `Invalid status code: ${res.status}`
            }

            let data = JSON.parse(res.body)

            function parseComic(comic) {
                if (comic["comic"] !== null && comic["comic"] !== undefined) {
                    comic = comic["comic"]
                }
                let tags = []
                if (comic["theme"] !== null && comic["theme"] !== undefined) {
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
                    description: comic["datetime_updated"]
                }
            }

            return {
                comics: data["results"]["list"].map(parseComic),
                maxPage: (data["results"]["total"] - (data["results"]["total"] % 21)) / 21 + 1
            }
        }.bind(this)
    }

    comic = {
        loadInfo: async function(id) {
            const getChapters = async (id) => {
                var res = await Network.get(
                    `https://api.2025copy.com/api/v3/comic/${id}/group/default/chapters?limit=500&offset=0&platform=3`,
                    this.headers
                );
                if (res.status !== 200) {
                    throw `Invalid status code: ${res.status}`;
                }
                
                let data = JSON.parse(res.body);
                
                // 添加更详细的错误日志，帮助调试
                console.log("章节列表API返回数据:", JSON.stringify(data));
                
                // 检查数据结构，兼容不同的API响应格式
                let chaptersData = null;
                if (data.results) {
                    chaptersData = data.results;
                } else if (data.data) {
                    chaptersData = data.data;
                } else if (data.chapters) {
                    chaptersData = { list: data.chapters, total: data.total || data.chapters.length };
                } else {
                    // 尝试从其他可能的位置获取chapters数据
                    console.log("尝试从其他位置获取chapters数据");
                    for (let key in data) {
                        if (data[key] && (data[key].list || Array.isArray(data[key]))) {
                            chaptersData = data[key];
                            if (!chaptersData.list && Array.isArray(chaptersData)) {
                                chaptersData = { list: chaptersData, total: chaptersData.length };
                            }
                            break;
                        }
                    }
                }
                
                if (!chaptersData || !chaptersData.list) {
                    throw "Cannot find chapters data";
                }
                
                let eps = new Map();
                chaptersData.list.forEach((e) => {
                    let title = e.name;
                    let id = e.uuid;
                    eps.set(id, title);
                });
                
                let maxChapter = chaptersData.total || chaptersData.list.length;
                if (maxChapter > 500) {
                    let offset = 500;
                    while (offset < maxChapter) {
                        res = await Network.get(
                            `https://api.2025copy.com/api/v3/comic/${id}/group/default/chapters?limit=500&offset=${offset}&platform=3`,
                            this.headers
                        );
                        if (res.status !== 200) {
                            throw `Invalid status code: ${res.status}`;
                        }
                        
                        let moreData = JSON.parse(res.body);
                        
                        // 检查更多章节的数据结构
                        let moreChaptersData = null;
                        if (moreData.results) {
                            moreChaptersData = moreData.results;
                        } else if (moreData.data) {
                            moreChaptersData = moreData.data;
                        } else if (moreData.chapters) {
                            moreChaptersData = { list: moreData.chapters };
                        } else {
                            // 尝试从其他可能的位置获取chapters数据
                            for (let key in moreData) {
                                if (moreData[key] && (moreData[key].list || Array.isArray(moreData[key]))) {
                                    moreChaptersData = moreData[key];
                                    if (!moreChaptersData.list && Array.isArray(moreChaptersData)) {
                                        moreChaptersData = { list: moreChaptersData };
                                    }
                                    break;
                                }
                            }
                        }
                        
                        if (!moreChaptersData || !moreChaptersData.list) {
                            console.log("无法获取更多章节数据，跳过");
                            break;
                        }
                        
                        moreChaptersData.list.forEach((e) => {
                            let title = e.name;
                            let id = e.uuid;
                            eps.set(id, title)
                        });
                        offset += 500;
                    }
                }
                return eps;
            }

            const getFavoriteStatus = async (id) => {
                let res = await Network.get(`https://api.2025copy.com/api/v3/comic2/${id}/query?platform=3`, this.headers);
                if (res.status !== 200) {
                    throw `Invalid status code: ${res.status}`;
                }
                
                let data = JSON.parse(res.body);
                
                // 添加更详细的错误日志，帮助调试
                console.log("收藏状态API返回数据:", JSON.stringify(data));
                
                // 检查数据结构，兼容不同的API响应格式
                let collectData = null;
                if (data.results && data.results.collect !== undefined) {
                    collectData = data.results.collect;
                } else if (data.collect !== undefined) {
                    collectData = data.collect;
                } else if (data.data && data.data.collect !== undefined) {
                    collectData = data.data.collect;
                } else {
                    // 尝试从其他可能的位置获取collect数据
                    console.log("尝试从其他位置获取collect数据");
                    for (let key in data) {
                        if (data[key] && data[key].collect !== undefined) {
                            collectData = data[key].collect;
                            break;
                        }
                    }
                }
                
                return collectData != null;
            }

            let results = await Promise.all([
                Network.get(
                    `https://api.2025copy.com/api/v3/comic2/${id}?platform=3`,
                    this.headers
                ),
                getChapters(id),
                getFavoriteStatus(id)
            ])

            if (results[0].status !== 200) {
                throw `Invalid status code: ${results[0].status}`;
            }

            let parsedData = JSON.parse(results[0].body);
            // 添加更详细的错误日志，帮助调试
            console.log("API返回数据:", JSON.stringify(parsedData));
            
            // 检查数据结构，兼容不同的API响应格式
            let comicData = null;
            if (parsedData.results && parsedData.results.comic) {
                comicData = parsedData.results.comic;
            } else if (parsedData.comic) {
                comicData = parsedData.comic;
            } else if (parsedData.data && parsedData.data.comic) {
                comicData = parsedData.data.comic;
            } else if (parsedData.results && parsedData.results.comics && Array.isArray(parsedData.results.comics) && parsedData.results.comics.length > 0) {
                // 处理comics数组的情况
                comicData = parsedData.results.comics[0];
            } else if (parsedData.comics && Array.isArray(parsedData.comics) && parsedData.comics.length > 0) {
                // 处理comics数组的情况
                comicData = parsedData.comics[0];
            } else {
                // 尝试从其他可能的位置获取comic数据
                console.log("尝试从其他位置获取comic数据");
                for (let key in parsedData) {
                    if (parsedData[key] && parsedData[key].comic) {
                        comicData = parsedData[key].comic;
                        break;
                    } else if (parsedData[key] && parsedData[key].comics && Array.isArray(parsedData[key].comics) && parsedData[key].comics.length > 0) {
                        comicData = parsedData[key].comics[0];
                        break;
                    }
                }
                
                // 如果仍然没有找到，尝试直接使用整个响应作为comic数据
                if (!comicData && (parsedData.name || parsedData.title || parsedData.cover)) {
                    comicData = parsedData;
                }
                
                // 添加更多可能的检查路径
                if (!comicData) {
                    console.log("尝试更多可能的路径获取comic数据");
                    // 检查是否有其他可能的嵌套结构
                    if (parsedData.data && parsedData.data.comics && Array.isArray(parsedData.data.comics) && parsedData.data.comics.length > 0) {
                        comicData = parsedData.data.comics[0];
                    }
                    // 检查是否有其他可能的嵌套结构
                    else if (parsedData.response && parsedData.response.comic) {
                        comicData = parsedData.response.comic;
                    }
                    // 检查是否有其他可能的嵌套结构
                    else if (parsedData.response && parsedData.response.comics && Array.isArray(parsedData.response.comics) && parsedData.response.comics.length > 0) {
                        comicData = parsedData.response.comics[0];
                    }
                    // 检查是否有其他可能的嵌套结构
                    else if (parsedData.result && parsedData.result.comic) {
                        comicData = parsedData.result.comic;
                    }
                    // 检查是否有其他可能的嵌套结构
                    else if (parsedData.result && parsedData.result.comics && Array.isArray(parsedData.result.comics) && parsedData.result.comics.length > 0) {
                        comicData = parsedData.result.comics[0];
                    }
                }
                
                // 如果仍然没有找到，记录详细的API响应结构以便调试
                if (!comicData) {
                    console.error("无法找到comic数据，API返回结构:", JSON.stringify(parsedData));
                    // 尝试创建一个基本的comic对象，避免完全失败
                    comicData = {
                        name: parsedData.name || parsedData.title || "未知标题",
                        cover: parsedData.cover || "",
                        author: parsedData.author || [],
                        theme: parsedData.theme || parsedData.tags || [],
                        datetime_updated: parsedData.datetime_updated || parsedData.updated_at || "",
                        brief: parsedData.brief || parsedData.description || "",
                        uuid: parsedData.uuid || parsedData.id || id
                    };
                }
            }
            
            if (!comicData) {
                console.log("无法找到comic数据，API返回结构:", JSON.stringify(parsedData));
                throw "Cannot find comic data";
            }

            let title = comicData.name;
            let cover = comicData.cover;
            let authors = comicData.author.map(e => e.name);
            let tags = comicData.theme.map(e => e.name);
            let updateTime = comicData.datetime_updated;
            let description = comicData.brief;


            return {
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "作者": authors,
                    "更新": [updateTime],
                    "标签": tags
                },
                chapters: results[1],
                isFavorite: results[2],
                subId: comicData.uuid
            }
        },
        loadEp: async function(comicId, epId) {
            let res = await Network.get(
                `https://api.2025copy.com/api/v3/comic/${comicId}/chapter2/${epId}?platform=3`,
                this.headers
            );

            if (res.status !== 200){
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);
            
            // 添加更详细的错误日志，帮助调试
            console.log("章节API返回数据:", JSON.stringify(data));
            
            // 检查数据结构，兼容不同的API响应格式
            let chapterData = null;
            if (data.results && data.results.chapter) {
                chapterData = data.results.chapter;
            } else if (data.chapter) {
                chapterData = data.chapter;
            } else if (data.data && data.data.chapter) {
                chapterData = data.data.chapter;
            } else {
                // 尝试从其他可能的位置获取chapter数据
                console.log("尝试从其他位置获取chapter数据");
                for (let key in data) {
                    if (data[key] && (data[key].chapter || (data[key].contents && data[key].words))) {
                        chapterData = data[key].chapter || data[key];
                        break;
                    }
                }
            }
            
            if (!chapterData) {
                throw "Cannot find chapter data";
            }

            let imagesUrls = chapterData.contents.map(e => e.url)
            let orders = chapterData.words

            let images = imagesUrls.map(e => "")

            for(let i=0; i < imagesUrls.length; i++){
                images[orders[i]] = imagesUrls[i]
            }

            return {
                images: images
            }
        },
        loadComments: async function(comicId, subId, page, replyTo) {
            let url = `https://api.2025copy.com/api/v3/comments?comic_id=${subId}&limit=20&offset=${(page-1)*20}`;
            if(replyTo){
                url = url + `&reply_id=${replyTo}&_update=true`;
            }
            let res = await Network.get(
                url,
                this.headers,
            );

            if (res.status !== 200){
                throw `Invalid status code: ${res.status}`;
            }

            let data = JSON.parse(res.body);
            
            // 添加更详细的错误日志，帮助调试
            console.log("评论API返回数据:", JSON.stringify(data));
            
            // 检查数据结构，兼容不同的API响应格式
            let commentsData = null;
            if (data.results) {
                commentsData = data.results;
            } else if (data.data) {
                commentsData = data.data;
            } else if (data.comments) {
                commentsData = { list: data.comments, total: data.total || 0 };
            } else {
                // 尝试从其他可能的位置获取comments数据
                console.log("尝试从其他位置获取comments数据");
                for (let key in data) {
                    if (data[key] && (data[key].list || Array.isArray(data[key]))) {
                        commentsData = data[key];
                        if (!commentsData.list && Array.isArray(commentsData)) {
                            commentsData = { list: commentsData, total: commentsData.length };
                        }
                        break;
                    }
                }
            }
            
            if (!commentsData || !commentsData.list) {
                throw "Cannot find comments data";
            }

            let total = commentsData.total || commentsData.list.length;

            return {
                comments: commentsData.list.map(e => {
                    return {
                        userName: e.user_name,
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
        sendComment: async function(comicId, subId, content, replyTo) {
            let token = this.loadData("token");
            if(!token){
                throw "未登录"
            }
            if(!replyTo){
                replyTo = '';
            }
            let res = await Network.post(
                `https://api.2025copy.com/api/v3/member/comment`,
                {
                    ...this.headers,
                    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                },
                `comic_id=${subId}&comment=${encodeURIComponent(content)}&reply_id=${replyTo}`,
            );

            if (res.status === 401){
                error(`Login expired`);
                return;
            }

            if (res.status !== 200){
                throw `Invalid status code: ${res.status}`;
            } else {
                return "ok"
            }
        }
    }
}
