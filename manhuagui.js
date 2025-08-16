class ManHuaGui extends ComicSource {
  // 确保Comic构造函数可用
  constructor() {
    super();
    
    // 检查Comic是否已定义
    if (typeof Comic === 'undefined') {
      // 尝试从父类获取
      if (this.constructor.Comic) {
        this.Comic = this.constructor.Comic;
        console.log('从父类获取到Comic构造函数');
      } else {
        console.error('Comic构造函数未找到');
        // 创建一个有效构造函数代替，避免后续调用失败
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
      console.log('直接使用已定义的Comic构造函数');
    }
    this.init();
  }

  // 此漫画源的名称
  name = "漫画柜";

  // 唯一标识符
  key = "ManHuaGui";

  version = "1.0.1";

  minAppVersion = "1.4.0";

  // 更新链接
  url = "https://raw.githubusercontent.com/ccbkv/pica_configs/refs/heads/master/manhuagui.js";

  baseUrl = "https://www.manhuagui.com";

  // 检查APP版本是否大于等于目标版本
  // 为避免APP未定义的错误，添加了try-catch块
  isAppVersionAfter(target) {
    try {
      if (!APP || !APP.version) return false;
      let current = APP.version;
      let targetArr = target.split('.');
      let currentArr = current.split('.');
      for (let i = 0; i < Math.min(targetArr.length, currentArr.length); i++) {
        if (parseInt(currentArr[i]) < parseInt(targetArr[i])) {
          return false;
        } else if (parseInt(currentArr[i]) > parseInt(targetArr[i])) {
          return true;
        }
      }
      // 如果前面的版本号都相同，则当前版本大于等于目标版本
      return true;
    } catch (e) {
      console.error('检查APP版本时出错:', e);
      return false; // 出错时默认返回false
    }
  }

  // 获取HTML内容并处理响应
  async getHtml(url) {
    // 简化headers配置，与ikmmh.js保持一致
    let headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Referer": "https://www.manhuagui.com/",
    };
    let res = await Network.get(url, headers);
    
    // 只检查status状态
    if (res.status !== 200) {
      throw `Network error: Status code ${res.status}`;
    }
    
    // 确保body不为null或空
    let body = res.body || '';
    if (!body.trim()) {
      console.warn('Response body is empty');
      body = '<!DOCTYPE html><html><head><title>Empty Response</title></head><body></body></html>';
    }
    
    try {
      return new HtmlDocument(body);
    } catch (e) {
      console.error('Failed to parse HTML:', e);
      throw "Failed to parse HTML content";
    }
  }
  parseSimpleComic(e) {
    let url = e.querySelector(".ell > a").attributes["href"];
    let id = url.split("/")[2];
    let title = e.querySelector(".ell > a").text.trim();
    let cover = e.querySelector("img").attributes["src"];
    if (!cover) {
      cover = e.querySelector("img").attributes["data-src"];
    }
    cover = `https:${cover}`;
    let description = e.querySelector(".tt").text.trim();
    return new this.Comic({
      id,
      title,
      cover,
      description,
    });
  }

  parseComic(e) {
    let simple = this.parseSimpleComic(e);
    let sl = e.querySelector(".sl");
    let status = sl ? "连载" : "完结";
    // 如果能够找到 <span class="updateon">更新于：2020-03-31<em>3.9</em></span> 解析 更新和评分
    let tmp = e.querySelector(".updateon")?.childNodes;
    let update = tmp ? tmp[0].replace("更新于：", "").trim() : "";
    let tags = [status, update];
    // 尝试获取作者信息
    let authorElement = e.querySelector(".author");
    let author = authorElement ? authorElement.text.trim() : "";

    return new this.Comic({
      id: simple.id,
      title: simple.title,
      cover: simple.cover,
      description: simple.description,
      tags,
      author,
    });
  }
  /**
   * [Optional] init function
   */
  init() {
    var LZString = (function () {
      var f = String.fromCharCode;
      var keyStrBase64 =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var baseReverseDic = {};
      function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
          baseReverseDic[alphabet] = {};
          for (var i = 0; i < alphabet.length; i++) {
            baseReverseDic[alphabet][alphabet.charAt(i)] = i;
          }
        }
        return baseReverseDic[alphabet][character];
      }
      var LZString = {
        decompressFromBase64: function (input) {
          if (input == null) return "";
          if (input == "") return null;
          return LZString._0(input.length, 32, function (index) {
            return getBaseValue(keyStrBase64, input.charAt(index));
          });
        },
        _0: function (length, resetValue, getNextValue) {
          var dictionary = [],
            next,
            enlargeIn = 4,
            dictSize = 4,
            numBits = 3,
            entry = "",
            result = [],
            i,
            w,
            bits,
            resb,
            maxpower,
            power,
            c,
            data = {
              val: getNextValue(0),
              position: resetValue,
              index: 1,
            };
          for (i = 0; i < 3; i += 1) {
            dictionary[i] = i;
          }
          bits = 0;
          maxpower = Math.pow(2, 2);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          switch ((next = bits)) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2, 8);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              c = f(bits);
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2, 16);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              c = f(bits);
              break;
            case 2:
              return "";
          }
          dictionary[3] = c;
          w = c;
          result.push(c);
          while (true) {
            if (data.index > length) {
              return "";
            }
            bits = 0;
            maxpower = Math.pow(2, numBits);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            switch ((c = bits)) {
              case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
              case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
              case 2:
                return result.join("");
            }
            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
            if (dictionary[c]) {
              entry = dictionary[c];
            } else {
              if (c === dictSize) {
                entry = w + w.charAt(0);
              } else {
                return null;
              }
            }
            result.push(entry);
            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;
            w = entry;
            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
          }
        },
      };
      return LZString;
    })();

    function splitParams(str) {
      let params = [];
      let currentParam = "";
      let stack = [];

      for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (char === "(" || char === "[" || char === "{") {
          stack.push(char);
          currentParam += char;
        } else if (char === ")" && stack[stack.length - 1] === "(") {
          stack.pop();
          currentParam += char;
        } else if (char === "]" && stack[stack.length - 1] === "[") {
          stack.pop();
          currentParam += char;
        } else if (char === "}" && stack[stack.length - 1] === "{") {
          stack.pop();
          currentParam += char;
        } else if (char === "," && stack.length === 0) {
          params.push(currentParam.trim());
          currentParam = "";
        } else {
          currentParam += char;
        }
      }

      if (currentParam) {
        params.push(currentParam.trim());
      }

      return params;
    }

    function extractParams(str) {
      if (!str) {
        console.error("输入字符串为空");
        // 返回包含默认值的完整参数数组
        return ['', '', '', [], '', {}];
      }
      let splitResult = str.split("}(");
      if (splitResult.length < 2) {
        console.error("无法正确分割字符串");
        // 返回包含默认值的完整参数数组
        return ['', '', '', [], '', {}];
      }
      let params_part = splitResult[1].split("))")[0];
      if (!params_part) {
        console.error("无法提取参数部分");
        // 返回包含默认值的完整参数数组
        return ['', '', '', [], '', {}];
      }
      let params = splitParams(params_part);
      if (!params || params.length === 0) {
        console.error("splitParams返回空数组");
        // 返回包含默认值的完整参数数组
        return ['', '', '', [], '', {}];
      }
      params[5] = {};
      try {
        if (params.length > 3 && params[3]) {
          // 确保params[3]是字符串类型
          if (typeof params[3] !== 'string') {
            console.error("params[3]不是字符串类型:", typeof params[3]);
            params[3] = [];
          } else {
            let compressedData = params[3].split("'");
            if (compressedData.length < 2) {
              console.error("无法提取压缩数据");
              params[3] = [];
            } else {
              let decompressed = LZString.decompressFromBase64(compressedData[1]);
              // 确保解压后的数据是字符串类型
              if (typeof decompressed !== 'string') {
                console.error("解压后的数据不是字符串类型:", typeof decompressed);
                params[3] = [];
              } else {
                params[3] = decompressed.split("|");
              }
            }
          }
        } else {
          params[3] = [];
        }
      } catch (e) {
        console.error("解压params[3]失败:", e);
        params[3] = [];
      }
      return params;
    }

    function formatData(p, a, c, k, e, d) {
      e = function (c) {
        return (
          (c < a ? "" : e(parseInt(c / a))) +
          ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
        );
      };
      if (!"".replace(/^/, String)) {
        while (c--) d[e(c)] = k[c] || e(c);
        k = [
          function (e) {
            return d[e];
          },
        ];
        e = function () {
          return "\\w+";
        };
        c = 1;
      }
      while (c--)
        if (k[c]) p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
      return p;
    }
    function extractFields(text) {
      // 创建一个对象存储提取的结果
      const result = {};

      // 提取files数组
      const filesMatch = text.match(/"files":\s*\[(.*?)\]/);
      if (filesMatch && filesMatch[1]) {
        // 提取所有文件名并去除引号和空格
        result.files = filesMatch[1]
          .split(",")
          .map((file) => file.trim().replace(/"/g, ""));
      }

      // 提取path
      const pathMatch = text.match(/"path":\s*"([^"]+)"/);
      if (pathMatch && pathMatch[1]) {
        result.path = pathMatch[1];
      }

      // 提取len
      const lenMatch = text.match(/"len":\s*(\d+)/);
      if (lenMatch && lenMatch[1]) {
        result.len = parseInt(lenMatch[1], 10);
      }

      // 提取sl对象
      const slMatch = text.match(/"sl":\s*({[^}]+})/);
      if (slMatch && slMatch[1]) {
        try {
          // 将提取的字符串转换为对象
          result.sl = JSON.parse(slMatch[1].replace(/(\w+):/g, '"$1":'));
        } catch (e) {
          console.error("解析sl字段失败:", e);
          result.sl = null;
        }
      }

      return result;
    }
    this.getImgInfos = function (script) {
      let params = extractParams(script);
      // 确保params有足够的元素
      while (params.length < 6) {
        params.push('');
      }
      // 确保k参数是数组
      if (!Array.isArray(params[3])) {
        params[3] = [];
      }
      // 确保d参数是对象
      if (typeof params[5] !== 'object' || params[5] === null) {
        params[5] = {};
      }
      let imgData = formatData(...params);
      let imgInfos = extractFields(imgData);
      return imgInfos;
    };
  }

  // explore page list
  explore = [
    {
      // title of the page.
      // title is used to identify the page, it should be unique
      title: "漫画柜",

      /// multiPartPage or multiPageComicList or mixed
      type: "singlePageWithMultiPart",

      /**
       * load function
       * @param page {number | null} - page number, null for `singlePageWithMultiPart` type
       * @returns {{}}
       * - for `multiPartPage` type, return [{title: string, comics: Comic[], viewMore: PageJumpTarget}]
       * - for `multiPageComicList` type, for each page(1-based), return {comics: Comic[], maxPage: number}
       * - for `mixed` type, use param `page` as index. for each index(0-based), return {data: [], maxPage: number?}, data is an array contains Comic[] or {title: string, comics: Comic[], viewMore: string?}
       */
      load: async (page) => {
        let document = await this.getHtml(this.baseUrl);
        // log("info", this.name, `获取主页成功`);
        let tabs = document.querySelectorAll("#cmt-tab li");
        // log("info", this.name, tabs);
        let parts = document.querySelectorAll("#cmt-cont ul");
        // log("info", this.name, parts);
        let result = {};
        // tabs len = parts len
        for (let i = 0; i < tabs.length; i++) {
          let title = tabs[i].text.trim();
          let comics = parts[i]
            .querySelectorAll("li")
            .map((e) => this.parseSimpleComic(e));
          result[title] = comics;
        }
        // log("info", this.name, result);
        return result;
      },

      /**
       * Only use for `multiPageComicList` type.
       * `loadNext` would be ignored if `load` function is implemented.
       * @param next {string | null} - next page token, null if first page
       * @returns {Promise<{comics: Comic[], next: string?}>} - next is null if no next page.
       */
      loadNext(next) {},
    },
  ];

  // categories
  category = {
    /// title of the category page, used to identify the page, it should be unique
    title: "漫画柜",
    parts: [
      {
        name: "类型",
        type: "fixed",
        itemType: "category",
        categories: [
          "全部",
          "热血",
          "冒险",
          "魔幻",
          "神鬼",
          "搞笑",
          "萌系",
          "爱情",
          "科幻",
          "魔法",
          "格斗",
          "武侠",
          "机战",
          "战争",
          "竞技",
          "体育",
          "校园",
          "生活",
          "励志",
          "历史",
          "伪娘",
          "宅男",
          "腐女",
          "耽美",
          "百合",
          "后宫",
          "治愈",
          "美食",
          "推理",
          "悬疑",
          "恐怖",
          "四格",
          "职场",
          "侦探",
          "社会",
          "音乐",
          "舞蹈",
          "杂志",
          "黑道",
        ],
        categoryParams: [
          "",
          "rexue",
          "maoxian",
          "mohuan",
          "shengui",
          "gaoxiao",
          "mengxi",
          "aiqing",
          "kehuan",
          "mofa",
          "gedou",
          "wuxia",
          "jizhan",
          "zhanzheng",
          "jingji",
          "tiyu",
          "xiaoyuan",
          "shenghuo",
          "lizhi",
          "lishi",
          "weiniang",
          "zhainan",
          "funv",
          "danmei",
          "baihe",
          "hougong",
          "zhiyu",
          "meishi",
          "tuili",
          "xuanyi",
          "kongbu",
          "sige",
          "zhichang",
          "zhentan",
          "shehui",
          "yinyue",
          "wudao",
          "zazhi",
          "heidao",
        ],
      },
    ],
    // enable ranking page
    enableRankingPage: false,
  };

  /// category comic loading related
  categoryComics = {
    /**
     * load comics of a category
     * @param category {string} - category name
     * @param param {string?} - category param
     * @param options {string[]} - options from optionList
     * @param page {number} - page number
     * @returns {Promise<{comics: Comic[], maxPage: number}>}
     */
    load: async (category, param, options, page) => {
      let area = options[0];
      let genre = param;
      let age = options[1];
      let status = options[2];
      // log(
      //   "info",
      //   this.name,
      //   ` 加载分类漫画: ${area} | ${genre} | ${age} | ${status}`
      // );
      // 字符串之间用“_”连接，空字符串除外
      let params = [area, genre, age, status].filter((e) => e != "").join("_");

      let url = `${this.baseUrl}/list/${params}/index_p${page}.html`;

      let document = await this.getHtml(url);
      let maxPage = document
        .querySelector(".result-count")
        .querySelectorAll("strong")[1].text;
      maxPage = parseInt(maxPage);
      let comics = document
        .querySelectorAll("#contList > li")
        .map((e) => this.parseSimpleComic(e));
      return {
        comics,
        maxPage,
      };
    },
    // provide options for category comic loading
    optionList: [
      {
        options: [
          "-全部",
          "japan-日本",
          "hongkong-港台",
          "other-其它",
          "europe-欧美",
          "china-内地",
          "korea-韩国",
        ],
      },
      {
        options: [
          "-全部",
          "shaonv-少女",
          "shaonian-少年",
          "qingnian-青年",
          "ertong-儿童",
          "tongyong-通用",
        ],
      },
      {
        options: ["-全部", "lianzai-连载", "wanjie-完结"],
      },
    ],
    ranking: {
      // 对于单个选项，使用“-”分隔值和文本，左侧为值，右侧为文本
      options: [
        "-最新发布",
        "update-最新更新",
        "view-人气最旺",
        "rate-评分最高",
      ],
      /**
       * 加载排行榜漫画
       * @param option {string} - 来自optionList的选项
       * @param page {number} - 页码
       * @returns {Promise<{comics: Comic[], maxPage: number}>}
       */
      load: async (option, page) => {
        let url = `${this.baseUrl}/list/${option}_p${page}.html`;
        let document = await this.getHtml(url);
        let maxPage = document
          .querySelector(".result-count")
          .querySelectorAll("strong")[1].text;
        maxPage = parseInt(maxPage);
        let comics = document
          .querySelector("#contList")
          .querySelectorAll("li")
          .map((e) => this.parseComic(e));
        return {
          comics,
          maxPage,
        };
      },
    },
  };

  /**
   * 专门解析搜索结果页面中的漫画信息
   * @param {HTMLElement} item - 搜索结果中的单个漫画项
   * @returns {Comic} - 解析后的漫画对象
   */
  parseSearchComic(item) {
    try {
      // 获取漫画链接和ID
      let linkElement = item.querySelector(".book-detail dl dt a");
      if (!linkElement) return null;
      
      let url = linkElement.attributes["href"];
      let id = url.split("/")[2];
      let title = linkElement.text.trim();
      
      // 获取封面图片
      let coverElement = item.querySelector(".book-cover .bcover img");
      let cover = coverElement ? coverElement.attributes["src"] : null;
      if (cover) {
        cover = cover.startsWith("//") ? `https:${cover}` : cover;
      }
      
      // 获取更新状态和描述
      let statusElement = item.querySelector(".tags.status span .red");
      let status = statusElement ? statusElement.text.trim() : "";
      
      let updateElement = item.querySelector(".tags.status span .red:nth-child(2)");
      let updateTime = updateElement ? updateElement.text.trim() : "";
      
      // 获取评分信息
      let scoreElement = item.querySelector(".book-score .score-avg strong");
      let score = scoreElement ? scoreElement.text.trim() : "";
      
      // 获取作者信息
      let authorElements = item.querySelectorAll(".tags a[href*='/author/']");
      let author = authorElements.length > 0 
        ? authorElements.map(a => a.text.trim()).join(", ") 
        : "";
      
      // 获取类型信息
      let typeElements = item.querySelectorAll(".tags a[href*='/list/']");
      let types = typeElements.length > 0 
        ? typeElements.map(a => a.text.trim())
        : [];
      
      // 获取简介
      let introElement = item.querySelector(".intro span");
      let description = introElement ? introElement.text.replace("简介：", "").trim() : "";
      
      // 如果简介为空，使用更新状态作为描述
      if (!description && status) {
        description = `状态: ${status}`;
        if (updateTime) description += `, 更新: ${updateTime}`;
      }
      
      return new Comic({
        id,
        title,
        cover,
        description,
        tags: [...types, status],
        author,
        score
      });
    } catch (error) {
      console.error("解析搜索结果项时出错:", error);
      return null;
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
      let url = ""
      if (options[0]) {
        let type = options[0].split("-")[0];
          if (type == '0') {
              url = `${this.baseUrl}/s/${keyword}_p${page}.html`;
          } else{
            url = `${this.baseUrl}/s/${keyword}_o${type}_p${page}.html`;
          }
      }else{
          url = `${this.baseUrl}/s/${keyword}_p${page}.html`;
      }
      let document = await this.getHtml(url);
      
      // 检查是否有结果计数元素
      let resultCount = document.querySelector(".result-count");
      if (!resultCount) {
        // 没有搜索结果或页面结构不同
        return {
          comics: [],
          maxPage: 1
        };
      }
      
      let comicNum = resultCount.querySelectorAll("strong")[1].text;
      comicNum = parseInt(comicNum);
      // 每页10个
      let maxPage = Math.ceil(comicNum / 10);

      // 在搜索结果页面中，漫画列表位于 .book-result ul 下
      let comicList = document.querySelector(".book-result ul");
      if (!comicList) {
        return {
          comics: [],
          maxPage: maxPage || 1
        };
      }
      
      // 使用专门的搜索解析函数解析每个漫画项
      let comics = comicList.querySelectorAll("li.cf")
        .map(item => this.parseSearchComic(item))
        .filter(comic => comic !== null); // 过滤掉解析失败的项
      
      return {
        comics,
        maxPage,
      };
    },

    optionList: [
      {
        type: "select",
        options: ["0-最新更新", "1-最近最热","2-最新上架", "3-评分最高"],
        label: "sort",
        default: null,
      },
    ],

    enableTagsSuggestions: false,
  };

  /// single comic related
  comic = {
    /**
     * load comic info
     * @param id {string}
     * @returns {Promise<ComicDetails>}
     */
    loadInfo: async (id) => {
      let url = `${this.baseUrl}/comic/${id}/`;
      let document = await this.getHtml(url);
      // ANCHOR 基本信息
      let book = document.querySelector(".book-cont");
      let title = book
        .querySelector(".book-title")
        .querySelector("h1")
        .text.trim();
      let subtitle = book
        .querySelector(".book-title")
        .querySelector("h2")
        .text.trim();
      let cover = book.querySelector(".hcover").querySelector("img").attributes[
        "src"
      ];
      cover = `https:${cover}`;
      let description = book
        .querySelector("#intro-all")
        .querySelectorAll("p")
        .map((e) => e.text.trim())
        .join("\n");
      //   log("warn", this.name, { title, subtitle, cover, description });

      let detail_list = book.querySelectorAll(".detail-list span");

      function parseDetail(idx) {
        let ele = detail_list[idx].querySelectorAll("a");
        if (ele.length > 0) {
          return ele.map((e) => e.text.trim());
        }
        return [""];
      }
      let createYear = parseDetail(0);
      let area = parseDetail(1);
      let genre = parseDetail(3);
      let author = parseDetail(4);
      // let alias = parseDetail(5);

      //   let lastChapter = parseDetail(6);
      let status = detail_list[7].text.trim();

      // 确保tags对象中的所有值都是字符串数组，与ikmmh.js保持一致
      let tags = {
        "作者": author.length > 0 ? author.map(item => item.toString()) : ['未知'],
        "状态": [status.toString()],
        "地区": area.length > 0 ? area.map(item => item.toString()) : ['未知'],
        "类型": genre.length > 0 ? genre.map(item => item.toString()) : ['未知'],
        "年代": createYear.length > 0 ? createYear.map(item => item.toString()) : ['未知'],
      };
      let updateTime = detail_list[8].text.trim();

      // ANCHOR 章节信息
      // 支持多分组
      let chaptersMap = new Map();
      
      // 查找所有章节分组标题
      let chapterGroups = document.querySelectorAll(".chapter h4 span");
      
      // 处理每个分组
      for (let i = 0; i < chapterGroups.length; i++) {
        let groupName = chapterGroups[i].text.trim();
        let groupChapters = new Map();
        
        // 获取对应的章节列表
        let chapterList = document.querySelectorAll(".chapter-list")[i];
        if (chapterList) {
          let lis = chapterList.querySelectorAll("li");
          for (let li of lis) {
            let a = li.querySelector("a");
            let id = a.attributes["href"].split("/").pop().replace(".html", "");
            let title = a.querySelector("span").text.trim();
            groupChapters.set(id, title);
          }
          
          // 章节升序排列
          groupChapters = new Map([...groupChapters].sort((a, b) => a[0] - b[0]));
          
          // 将分组添加到总的章节映射中
          chaptersMap.set(groupName, groupChapters);
        }
      }
      
      // 兼容旧版本，如果app版本不支持多分组，则合并所有分组
      let chapters;
      if (this.isAppVersionAfter && this.isAppVersionAfter("1.3.0")) {
        // 支持多分组
        chapters = chaptersMap;
      } else {
        // 合并所有分组
        chapters = new Map();
        for (let [_, groupChapters] of chaptersMap) {
          for (let [id, title] of groupChapters) {
            chapters.set(id, title);
          }
        }
        // 章节升序
        chapters = new Map([...chapters].sort((a, b) => a[0] - b[0]));
      }

      //ANCHOR - 推荐
      let recommend = [];
      let similar = document.querySelector(".similar-list");
      if (similar) {
        let similar_list = similar.querySelectorAll("li");
        for (let li of similar_list) {
            let comic = this.parseSimpleComic(li);
            recommend.push(comic);
        }
      }

      // 创建并返回ComicDetails对象
      return {
        title: title,
        cover: cover,
        description: description,
        tags: tags,
        chapters: chapters,
        suggestions: recommend,
        updateTime: updateTime
      };
    },

    /**
     * load images of a chapter
     * @param comicId {string}
     * @param epId {string?}
     * @returns {Promise<{images: string[]}>}
     */
    loadEp: async (comicId, epId) => {
        let url = `${this.baseUrl}/comic/${comicId}/${epId}.html`;
        let document = await this.getHtml(url);
        
        // 更健壮地查找包含图片信息的脚本
        let scriptContent = '';
        let scripts = document.querySelectorAll("script");
        let foundPattern = '';
        
        // 增加更多搜索模式
        const patterns = [
          { regex: 'window\["\_INITIAL\_STATE\_"\]', name: 'INITIAL_STATE' },
          { regex: 'eval\(function\(p,a,c,k,e,d\)', name: 'EVAL_FUNCTION' },
          { regex: '\(function\(p,a,c,k,e,d\)', name: 'FUNCTION' },
          { regex: 'chapterImages', name: 'CHAPTER_IMAGES' },
          { regex: 'imageList', name: 'IMAGE_LIST' },
          { regex: 'pic_url', name: 'PIC_URL' },
          { regex: 'imgDomain', name: 'IMG_DOMAIN' }
        ];
        
        // 尝试匹配模式
        for (let { regex, name } of patterns) {
          for (let i = 0; i < scripts.length; i++) {
            let script = scripts[i];
            if (script.innerHTML && script.innerHTML.includes(regex)) {
              scriptContent = script.innerHTML;
              foundPattern = name;
              console.log(`找到匹配模式 ${name} 的脚本，索引: ${i}`);
              break;
            }
          }
          if (scriptContent) break;
        }
        
        // 如果没有找到特定模式的脚本，尝试其他策略
        if (!scriptContent) {
          console.warn("未找到匹配特定模式的脚本，尝试备选策略");
          
          // 策略1: 查找最后一个非空脚本
          for (let i = scripts.length - 1; i >= 0; i--) {
            let script = scripts[i];
            if (script.innerHTML && script.innerHTML.length > 100) {
              scriptContent = script.innerHTML;
              console.log(`使用最后一个非空脚本，索引: ${i}`);
              break;
            }
          }
          
          // 策略2: 查找包含大量字符的脚本
          if (!scriptContent) {
            let maxLength = 0;
            let maxIndex = -1;
            for (let i = 0; i < scripts.length; i++) {
              let script = scripts[i];
              if (script.innerHTML && script.innerHTML.length > maxLength) {
                maxLength = script.innerHTML.length;
                maxIndex = i;
              }
            }
            if (maxIndex !== -1) {
              scriptContent = scripts[maxIndex].innerHTML;
              console.log(`使用最长脚本，索引: ${maxIndex}，长度: ${maxLength}`);
            }
          }
          
          if (!scriptContent) {
            console.error("未找到包含图片信息的脚本");
            // 记录所有脚本的特征，便于调试
            console.error(`脚本总数: ${scripts.length}`);
            scripts.forEach((script, index) => {
              if (script.innerHTML) {
                console.error(`脚本 ${index}: 长度=${script.innerHTML.length}, 包含eval=${script.innerHTML.includes('eval')}, 包含function=${script.innerHTML.includes('function')}`);
              }
            });
            return { images: [] };
          }
        }
        
        // 输出找到的脚本信息
        console.log(`成功找到脚本，模式: ${foundPattern || '未知'}, 长度: ${scriptContent.length}`);
      
      let infos = this.getImgInfos(scriptContent);

      // 确保infos和infos.files存在
      if (!infos || !infos.files || !Array.isArray(infos.files)) {
        console.error("未能正确提取图片信息");
        return { images: [] };
      }
      
      // https://us.hamreus.com/ps3/y/yiquanchaoren/第190话重制版/003.jpg.webp?e=1754143606&m=DPpelwkhr-pS3OXJpS6VkQ
      let imgDomain = `https://us.hamreus.com`;
      let images = [];
      for (let f of infos.files) {
        // 确保infos.path和infos.sl存在
        if (infos.path && infos.sl && infos.sl.e && infos.sl.m) {
          let imgUrl = 
            imgDomain + infos.path + f + `?e=${infos.sl.e}&m=${infos.sl.m}`;
          images.push(imgUrl);
        } else {
          console.error("图片信息不完整");
        }
      }
      // log("warning", this.name, images);
      return {
        images,
      };
    },
    /**
     * [Optional] provide configs for an image loading
     * @param url
     * @param comicId
     * @param epId
     * @returns {ImageLoadingConfig | Promise<ImageLoadingConfig>}
     */
    onImageLoad: (url, comicId, epId) => {
      // 简化headers配置，避免复杂字段可能导致的类型转换问题
      return {
        headers: {
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: "https://www.manhuagui.com/",
          cookie: "country=US", // 添加cookie以保持一致性
        },
      };
    },
    /**
     * [Optional] provide configs for a thumbnail loading
     * @param url {string}
     * @returns {ImageLoadingConfig | Promise<ImageLoadingConfig>}
     *
     * `ImageLoadingConfig.modifyImage` and `ImageLoadingConfig.onLoadFailed` will be ignored.
     * They are not supported for thumbnails.
     */
    onThumbnailLoad: (url) => {
      // 简化headers配置，避免复杂字段可能导致的类型转换问题
      let headers = {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: "https://www.manhuagui.com/",
        cookie: "country=US", // 添加cookie以保持一致性
      };

      return {
        headers
      };
    }
  };
}
