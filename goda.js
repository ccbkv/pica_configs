/** @type {import('./_venera_.js')} */
class Goda extends ComicSource {
  // Note: The fields which are marked as [Optional] should be removed if not used

  // name of the source
  name = "GoDa漫画"

  // unique id of the source
  key = "goda"

  version = "1.1.0"

  minAppVersion = "1.4.0"

  // update url
  url = "https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/goda.js"

  settings = {
    domains: {
      title: "域名",
      type: "input",
      default: "godamh.com"
    },
    api: {
      title: "API域名",
      type: "input",
      default: "api-get-v3.mgsearcher.com"
    },
    image: {
      title: "图片域名",
      type: "input",
      default: "f40-1-4.g-mh.online"
    }
  }

  get baseUrl() {
    return `https://${this.loadSetting("domains")}`;
  }

  get apiUrl() {
    return `https://${this.loadSetting("api")}/api/v2`;
  }

  get imageUrl() {
    return `https://${this.loadSetting("image")}`;
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
      "Referer": this.baseUrl
    };
  }

  parseComics(doc) {
    console.warn(doc)
    const result = [];
    for (let item of doc.querySelectorAll(".pb-2")) {
      result.push(new Comic({
        id: item.querySelector("a").attributes["href"],
        title: item.querySelector("h3").text,
        cover: item.querySelector("img").attributes["src"]
      }))
    }
    return result;
  }

  decodeImages(input) {
    const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const CUSTOM = '_-9876543210abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const PREFIX = 'J7r';
    const MARKER1 = 'kD';
    const MARKER2 = 'W4s';
    const SUFFIX = 'nQ';
    const GROUP = 7;
    const text = String(input || '');
    if (!text.startsWith(PREFIX) || !text.endsWith(SUFFIX)) return text;
    const body = text.substring(PREFIX.length, text.length - SUFFIX.length);
    const payloadLen = body.length - MARKER1.length - MARKER2.length;
    if (payloadLen <= 0) return '[]';
    const aLen = Math.floor(payloadLen / 3);
    const bLen = Math.floor((payloadLen - aLen) / 2);
    const cLen = payloadLen - aLen - bLen;
    const part1 = body.substring(0, bLen);
    const marker1 = body.substring(bLen, bLen + MARKER1.length);
    const part2 = body.substring(bLen + MARKER1.length, bLen + MARKER1.length + cLen);
    const marker2 = body.substring(bLen + MARKER1.length + cLen, bLen + MARKER1.length + cLen + MARKER2.length);
    const part3 = body.substring(bLen + MARKER1.length + cLen + MARKER2.length);
    if (marker1 !== MARKER1 || marker2 !== MARKER2 || part3.length !== aLen) return '[]';
    const reordered = part3 + part1 + part2;
    let unzigzag = '';
    for (let i = 0, block = 0; i < reordered.length; i += GROUP, block++) {
      const chunk = reordered.substring(i, i + GROUP);
      unzigzag += block % 2 === 1 ? chunk.split('').reverse().join('') : chunk;
    }
    let standard = '';
    for (let j = 0; j < unzigzag.length; j++) {
      const idx = CUSTOM.indexOf(unzigzag[j]);
      if (idx < 0) return '[]';
      standard += STD[idx];
    }
    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let padded = standard.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4 !== 0) padded += '=';
    const bytes = [];
    for (let k = 0; k < padded.length; k += 4) {
      const c1 = b64chars.indexOf(padded[k]);
      const c2 = b64chars.indexOf(padded[k + 1]);
      const c3 = padded[k + 2] === '=' ? -1 : b64chars.indexOf(padded[k + 2]);
      const c4 = padded[k + 3] === '=' ? -1 : b64chars.indexOf(padded[k + 3]);
      bytes.push((c1 << 2) | (c2 >> 4));
      if (c3 >= 0) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
      if (c4 >= 0) bytes.push(((c3 & 3) << 6) | c4);
    }
    let result = '';
    let m = 0;
    while (m < bytes.length) {
      const b1 = bytes[m];
      if (b1 < 0x80) {
        result += String.fromCharCode(b1);
        m += 1;
      } else if (b1 < 0xE0) {
        result += String.fromCharCode(((b1 & 0x1F) << 6) | (bytes[m + 1] & 0x3F));
        m += 2;
      } else if (b1 < 0xF0) {
        result += String.fromCharCode(((b1 & 0x0F) << 12) | ((bytes[m + 1] & 0x3F) << 6) | (bytes[m + 2] & 0x3F));
        m += 3;
      } else {
        const cp = ((b1 & 0x07) << 18) | ((bytes[m + 1] & 0x3F) << 12) | ((bytes[m + 2] & 0x3F) << 6) | (bytes[m + 3] & 0x3F);
        const u = cp - 0x10000;
        result += String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 0x3FF));
        m += 4;
      }
    }
    return result;
  }

  // explore page list
  explore = [
    {
      // title of the page.
      // title is used to identify the page, it should be unique
      title: this.name,

      /// multiPartPage or multiPageComicList or mixed
      type: "multiPartPage",

      load: async () => {
        const res = await Network.get(this.baseUrl, this.headers);
        const document = new HtmlDocument(res.body);
        const result = [{ title: "近期更新", comics: [], viewMore: null }];
        for (let item of document.querySelector(".pb-unit-md").querySelectorAll(".slicarda")) {
          result[0].comics.push(new Comic({
            id: item.attributes["href"],
            title: item.querySelector("h3").text,
            cover: item.querySelector("img").attributes["src"]
          }))
        }
        const cardlists = document.querySelectorAll(".cardlist");
        const hometitles = document.querySelectorAll(".hometitle");
        for (let i = 0; i < hometitles.length; i++) {
          result.push({
            title: hometitles[i].querySelector("h2").text,
            comics: this.parseComics(cardlists[i]),
            viewMore: {
              page: "category",
              attributes: {
                category: hometitles[i].querySelector("h2").text,
                param: hometitles[i].attributes["href"]
              },
            }
          });
        }
        return result;
      }
    }
  ]

  // categories
  category = {
    /// title of the category page, used to identify the page, it should be unique
    title: this.name,
    parts: [
      {
        name: "类型",
        type: "fixed",
        categories: [
          "全部",
          "韩漫",
          "热门漫画",
          "国漫",
          "其他",
          "日漫",
          "欧美"
        ],
        itemType: "category",
        categoryParams: [
          "/manga",
          "/manga-genre/kr",
          "/manga-genre/hots",
          "/manga-genre/cn",
          "/manga-genre/qita",
          "/manga-genre/jp",
          "/manga-genre/ou-mei"
        ],
      },
      {
        name: "标签",
        type: "fixed",
        categories: [
          "复仇",
          "古风",
          "奇幻",
          "逆袭",
          "异能",
          "宅向",
          "穿越",
          "热血",
          "纯爱",
          "系统",
          "重生",
          "冒险",
          "灵异",
          "大女主",
          "剧情",
          "恋爱",
          "玄幻",
          "女神",
          "科幻",
          "魔幻",
          "推理",
          "猎奇",
          "治愈",
          "都市",
          "异形",
          "青春",
          "末日",
          "悬疑",
          "修仙",
          "战斗"
        ],
        itemType: "category",
        categoryParams: [
          "/manga-tag/fuchou",
          "/manga-tag/gufeng",
          "/manga-tag/qihuan",
          "/manga-tag/nixi",
          "/manga-tag/yineng",
          "/manga-tag/zhaixiang",
          "/manga-tag/chuanyue",
          "/manga-tag/rexue",
          "/manga-tag/chunai",
          "/manga-tag/xitong",
          "/manga-tag/zhongsheng",
          "/manga-tag/maoxian",
          "/manga-tag/lingyi",
          "/manga-tag/danvzhu",
          "/manga-tag/juqing",
          "/manga-tag/lianai",
          "/manga-tag/xuanhuan",
          "/manga-tag/nvshen",
          "/manga-tag/kehuan",
          "/manga-tag/mohuan",
          "/manga-tag/tuili",
          "/manga-tag/lieqi",
          "/manga-tag/zhiyu",
          "/manga-tag/doushi",
          "/manga-tag/yixing",
          "/manga-tag/qingchun",
          "/manga-tag/mori",
          "/manga-tag/xuanyi",
          "/manga-tag/xiuxian",
          "/manga-tag/zhandou"
        ],
      }
    ],
    // enable ranking page
    enableRankingPage: false,
  }

  /// category comic loading related
  categoryComics = {
    load: async (category, params, options, page) => {
      const res = await Network.get(`${this.baseUrl}${params}/page/${page}`, this.headers);
      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`;
      }
      const document = new HtmlDocument(res.body);
      let maxPage = null;
      try {
        maxPage = parseInt(document.querySelectorAll("button.text-small").pop().text.replaceAll("\n", "").replaceAll(" ", ""));
      } catch(_) {
        maxPage = 1;
      }
      return {
        comics: this.parseComics(document),
        maxPage: maxPage
      };
    }
  }

  /// search related
  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(`${this.baseUrl}/s/${keyword}?page=${page}`);
      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`;
      }
      const document = new HtmlDocument(res.body);
      let maxPage = null;
      try {
        maxPage = parseInt(document.querySelectorAll("button.text-small").pop().text.replaceAll("\n", "").replaceAll(" ", ""));
      } catch(_) {
        maxPage = 1;
      }
      return {
        comics: this.parseComics(document),
        maxPage: maxPage
      };
    },
    // enable tags suggestions
    enableTagsSuggestions: false,
  }

  /// single comic related
  comic = {
    onThumbnailLoad: (url) => {
      return {
        headers: this.headers
      }
    },
    loadInfo: async (id) => {
      const res = await Network.get(this.baseUrl + id);
      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`;
      }
      const document = new HtmlDocument(res.body);
      const title = document.querySelector(".text-xl").text.trim().split("   ")[0]
      const cover = document.querySelector(".object-cover").attributes["src"];
      const description = document.querySelector("p.text-medium").text;
      const infos = document.querySelectorAll("div.py-1");
      const tags = { "作者": [], "类型": [], "标签": [] };
      for (let author of infos[0].querySelectorAll("a > span")) {
        let author_name = author.text.trim();
        if (author_name.endsWith(",")) {
          author_name = author_name.slice(0, -1).trim();
        }
        tags["作者"].push(author_name);
      }
      for (let category of infos[1].querySelectorAll("a > span")) {
        let category_name = category.text.trim();
        if (category_name.endsWith(",")) {
          category_name = category_name.slice(0, -1).trim();
        }
        tags["类型"].push(category_name);
      }
      for (let tag of infos[2].querySelectorAll("a")) {
        tags["标签"].push(tag.text.replace("\n", "").replaceAll(" ", "").replace("#", ""));
      }
      const mangaId = document.querySelector("#mangachapters").attributes["data-mid"];
      const jsonRes = await Network.get(`${this.apiUrl}/manga/get?mid=${mangaId}&mode=all&t=${Date.now()}`, this.headers);
      const jsonData = JSON.parse(jsonRes.body);
      const chapters = {};
      for (let ch of jsonData["data"]["chapters"]) {
        chapters[`${mangaId}@${ch["id"]}`] = ch["attributes"]["title"];
      }
      const recommend = [];
      for (let item of document.querySelectorAll("div.cardlist > div.pb-2")) {
        recommend.push(new Comic({
          id: item.querySelector("a").attributes["href"],
          title: item.querySelector("h3").text,
          cover: item.querySelector("img").attributes["src"]
        }));
      }
      return new ComicDetails({
        title: title,
        cover: cover,
        description: description,
        tags: tags,
        chapters: chapters,
        recommend: recommend,
      });
    },

    loadEp: async (comicId, epId) => {
      const ids = epId.split("@");
      const res = await Network.get(`${this.apiUrl}/chapter/getinfo?m=${ids[0]}&c=${ids[1]}`, this.headers);
      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`;
      }
      const jsonData = JSON.parse(res.body);
      const rawImages = jsonData["data"]["info"]["images"]["images"];
      const images = Array.isArray(rawImages) ? rawImages : JSON.parse(this.decodeImages(rawImages));
      const result = [];
      for (let i of images) {
        if (i["url"]) {
          result.push(this.imageUrl + i["url"]);
        }
      }
      return { images: result };
    },

    // enable tags translate
    enableTagsTranslate: false,
  }
}
