class HitomiJs extends ComicSource{
  name="hitomi.la";
  key="hitomi_js";
  version="1.1.5";
  minAppVersion="0.0.0";
  url="https://raw.githubusercontent.com/ccbkv/pica_configs/master/hitomi.js";
  galleryCache=[];
  categoryResultCache=undefined;
  searchResultCaches=new Map();
  _mapGalleryBlockInfoToComic(n){
    // 正确格式化标签以支持翻译
    const thumbnailHash = n.thumbnail_hashs && n.thumbnail_hashs.length > 0 ? n.thumbnail_hashs[0] : "";
    const coverUrl = get_thumbnail_url_from_hash(thumbnailHash,true) || "";
    return {id:n.gid||"",title:n.title||"",subTitle:n.artists && n.artists.length ? n.artists.join(" "):"",cover:coverUrl,tags:[...(n.series||[]).map(m=>"parody:"+m),...(n.females||[]).map(m=>"female:"+m),...(n.males||[]).map(m=>"male:"+m),...(n.others||[]).map(m=>"tag:"+m)],language:n.language||"",description:n.type?n.type+"\n"+formatDate(n.posted_time):formatDate(n.posted_time)};
  }
  init(){}
  explore=[{title:"hitomi.la",type:"multiPageComicList",load:async(page)=>{if(!page) page=1;const result=await getSingleTagSearchPage({state:{area:"all",tag:"index",language:"all",orderby:"date",orderbykey:"added",orderbydirection:"desc"},page:page-1});const comics=(await get_galleryblocks(result.galleryids)).map(n=>this._mapGalleryBlockInfoToComic(n));return {comics,maxPage:Math.ceil(result.count/25)};},loadNext(next){}}];
  category={title:"hitomi_js",parts:[{name:"语言",type:"fixed",categories:["汉语","英语"],itemType:"category",categoryParams:["language:chinese","language:english"]},{name:"类别",type:"fixed",categories:["同人志","漫画","画师CG","游戏CG","图集","动画"],itemType:"category",categoryParams:["type:doujinshi","type:manga","type:artistcg","type:gamecg","type:imageset","type:anime"]}],enableRankingPage:true};
  categoryComics={load:async(category,param,options,page)=>{const term=param;if(!term.includes(":")) throw new Error("不合法的标签，请使用namespace:tag的格式"); if(page===1){const option=parseInt(options[0]);const searchOptions={term,orderby:"date",orderbykey:"added",orderbydirection:"desc"};switch(option){case 1:searchOptions.orderbykey="published";break;case 2:searchOptions.orderby="popular";searchOptions.orderbykey="today";break;case 3:searchOptions.orderby="popular";searchOptions.orderbykey="week";break;case 4:searchOptions.orderby="popular";searchOptions.orderbykey="month";break;case 5:searchOptions.orderby="popular";searchOptions.orderbykey="year";break;case 6:searchOptions.orderbydirection="random";break;default:break;} const result=await search(searchOptions);if(result.type==="single"){const comics=(await get_galleryblocks(result.gids)).map(n=>this._mapGalleryBlockInfoToComic(n));this.categoryResultCache={type:"single",state:result.state,count:result.count};return {comics,maxPage:Math.ceil(result.count/25)};} else {const comics=(await get_galleryblocks(result.gids.slice(25*page-25,25*page))).map(n=>this._mapGalleryBlockInfoToComic(n));this.categoryResultCache={type:"all",gids:result.gids,count:result.count};return {comics,maxPage:Math.ceil(result.count/25)};}} else {if(this.categoryResultCache.type==="single"){const result=await getSingleTagSearchPage({state:this.categoryResultCache.state,page:page-1});const comics=(await get_galleryblocks(result.galleryids)).map(n=>this._mapGalleryBlockInfoToComic(n));return {comics,maxPage:Math.ceil(this.categoryResultCache.count/25)};} else {const comics=(await get_galleryblocks(this.categoryResultCache.gids.slice(25*page-25,25*page))).map(n=>this._mapGalleryBlockInfoToComic(n));return {comics,maxPage:Math.ceil(this.categoryResultCache.count/25)};}}},optionList:[{options:["0-添加日期","1-发布日期","2-热门|今天","3-热门|一周","4-热门|本月","5-热门|一年","随机"],notShowWhen:null,showWhen:null}],ranking:{options:["today-今天","week-一周","month-本月","year-一年"],load:async(option,page)=>{if(!page) page=1;const result=await getSingleTagSearchPage({state:{area:"all",tag:"index",language:"all",orderby:"popular",orderbykey:option,orderbydirection:"desc"},page:page-1});const comics=(await get_galleryblocks(result.galleryids)).map(n=>this._mapGalleryBlockInfoToComic(n));return {comics,maxPage:Math.ceil(result.count/25)};}}};
  search={load:async(keyword,options,page)=>{const cacheKey=(keyword||"")+"|"+options.join(",");if(page===1){const option=parseInt(options[0]);const term=keyword;const searchOptions={term,orderby:"date",orderbykey:"added",orderbydirection:"desc"};switch(option){case 1:searchOptions.orderbykey="published";break;case 2:searchOptions.orderby="popular";searchOptions.orderbykey="today";break;case 3:searchOptions.orderby="popular";searchOptions.orderbykey="week";break;case 4:searchOptions.orderby="popular";searchOptions.orderbykey="month";break;case 5:searchOptions.orderby="popular";searchOptions.orderbykey="year";break;case 6:searchOptions.orderbydirection="random";break;default:break;} const result=await search(searchOptions);if(result.type==="single"){const comics=(await get_galleryblocks(result.gids)).map(n=>this._mapGalleryBlockInfoToComic(n));this.searchResultCaches.set(cacheKey,{type:"single",state:result.state,count:result.count});return {comics,maxPage:Math.ceil(result.count/25)};} else {const comics=(await get_galleryblocks(result.gids.slice(25*page-25,25*page))).map(n=>this._mapGalleryBlockInfoToComic(n));this.searchResultCaches.set(cacheKey,{type:"all",gids:result.gids,count:result.count});return {comics,maxPage:Math.ceil(result.count/25)};}} else {const searchResultCache=this.searchResultCaches.get(cacheKey);if(searchResultCache.type==="single"){const result=await getSingleTagSearchPage({state:searchResultCache.state,page:page-1});const comics=(await get_galleryblocks(result.galleryids)).map(n=>this._mapGalleryBlockInfoToComic(n));return {comics,maxPage:Math.ceil(searchResultCache.count/25)};} else {const comics=(await get_galleryblocks(searchResultCache.gids.slice(25*page-25,25*page))).map(n=>this._mapGalleryBlockInfoToComic(n));return {comics,maxPage:Math.ceil(searchResultCache.count/25)};}}},loadNext:async(keyword,options,next)=>{},optionList:[{type:"select",options:["0-添加日期","1-发布日期","2-热门|今天","3-热门|一周","4-热门|本月","5-热门|一年","随机"],label:"sort",default:null}],enableTagsSuggestions:true,onTagSuggestionSelected:(namespace,tag)=>{let fixedNamespace=undefined;switch(namespace){case "reclass":fixedNamespace="reclass";break;case "parody":fixedNamespace="parody";break;case "other":fixedNamespace="tag";break;case "mixed":fixedNamespace="tag";break;case "temp":fixedNamespace="tag";break;case "cosplayer":fixedNamespace="tag";break;default:fixedNamespace=namespace;break;} return fixedNamespace+":"+tag.replaceAll(" ","_");}};
  enableTagsTranslate=true;
  comic={loadInfo:async(id)=>{const data=await get_gallery_detail(id);const tagsObj={};if("type" in data&&data.type) tagsObj["reclass"]=[data.type];if(data.groups.length) tagsObj["group"]=data.groups;if(data.artists.length) tagsObj["artist"]=data.artists;if("language" in data&&data.language) tagsObj["language"]= [data.language];if(data.series.length) tagsObj["parody"]=data.series;if(data.characters.length) tagsObj["character"]=data.characters;if(data.females.length) tagsObj["female"]=data.females;if(data.males.length) tagsObj["male"]=data.males;if(data.others.length) tagsObj["tag"]=data.others;let recommend=undefined;if(data.related_gids.length){recommend=(await get_galleryblocks(data.related_gids)).map(n=>this._mapGalleryBlockInfoToComic(n));}
    this.galleryCache=data;
    return {title:data.title||"",cover:data.thumbnail_hash?get_thumbnail_url_from_hash(data.thumbnail_hash,true):"",tags:tagsObj,chapters:{"1":"1"},maxPage:data.files?data.files.length:0,thumbnails:data.files?data.files.map(n=>n.hash?get_thumbnail_url_from_hash(n.hash):"").filter(url=>url):[],uploadTime:formatDate(data.posted_time),url:data.url||"",recommend};},loadEp:async(comicId,epId)=>{const data=this.galleryCache;if(data.type==="anime") throw new Error("不支持视频浏览");const images=await get_image_srcs(data.files, data.gid);return {images};},onImageLoad:(url,comicId,epId)=>{const id=(comicId||"").match(/\d+/)?.[0];const ref=id?`https://hitomi.la/reader/${id}.html`:refererUrl;return {url,headers:{referer:ref,"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}};},onThumbnailLoad:(url)=>{return {url,headers:{referer:refererUrl,"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}};},onClickTag:(namespace,tag)=>{let fixedNamespace=undefined;switch(namespace){case "type":fixedNamespace="type";break;case "groups":fixedNamespace="group";break;case "artists":fixedNamespace="artist";break;case "language":fixedNamespace="language";break;case "series":fixedNamespace="parody";break;case "parody":fixedNamespace="parody";break;case "characters":fixedNamespace="character";break;case "females":fixedNamespace="female";break;case "males":fixedNamespace="male";break;case "others":fixedNamespace="tag";break;default:break;} if(!fixedNamespace){throw new Error("不支持的标签命名空间: "+namespace);} const keyword=fixedNamespace+":"+tag.replaceAll(" ","_");return {page:"search",attributes:{keyword}};},link:{domains:["hitomi.la"],linkToId:(url)=>{const reg=/https:\/\/hitomi\.la\/\w+\/[^\/]+-(\d+)\.html/;const r=reg.exec(url);if(r){return r[1];} else {throw new Error("Invalid gallery url of hitomi.la");}}}};
}

const domain2 = "gold-usergeneratedcontent.net";
const domain = "ltn." + domain2;
const nozomiextension = ".nozomi";
const extension = ".html";
const galleriesdir = "galleries";
const index_dir = "tagindex";
const galleries_index_dir = "galleriesindex";
const languages_index_dir = "languagesindex";
const nozomiurl_index_dir = "nozomiurlindex";
const max_node_size = 464;
const B = 16;
const compressed_nozomi_prefix = "n";
const tag_index_domain = `tagindex.hitomi.la`;
const namespaces = ["artist","character","female","group","language","male","series","tag","type"];
const refererUrl = "https://hitomi.la/";
let galleries_index_version = "";
let gg = undefined;

function intersectAll(arrays){
  if(!arrays.length) return [];
  if(arrays.length===1) return arrays[0];
  return arrays.reduce((acc,curr)=>{const set=new Set(curr);return acc.filter(x=>set.has(x));});
}

function subtract(arrA,arrB){
  const setB=new Set(arrB);
  return arrA.filter(x=>!setB.has(x));
}

function unionAll(arrays){
  return Array.from(new Set(arrays.flat()));
}

function shuffleArray(arr){
  const array=arr.slice();
  for(let i=array.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [array[i],array[j]]=[array[j],array[i]];
  }
  return array;
}

function toISO8601(s){
  return s.replace(" ","T").replace(/([+-]\d{2})$/,"$1:00");
}

function formatDate(date){
  if(typeof date==="string"){date=toISO8601(date);date=new Date(date);} 
  function pad(n){return n<10?"0"+n:n;}
  const year=date.getFullYear();
  const month=pad(date.getMonth()+1);
  const day=pad(date.getDate());
  const hour=pad(date.getHours());
  const minute=pad(date.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function encodeUtf8(str){
  const s=unescape(encodeURIComponent(str));
  const buf=new ArrayBuffer(s.length);
  const arr=new Uint8Array(buf);
  for(let i=0;i<s.length;i++){arr[i]=s.charCodeAt(i);} 
  return buf;
}

const hash_term=function(term){
  return new Uint8Array(Convert.sha256(encodeUtf8(term))).slice(0,4);
};

function getUint64(view,byteOffset,littleEndian=false){
  const left=view.getUint32(byteOffset,littleEndian);
  const right=view.getUint32(byteOffset+4,littleEndian);
  const combined=littleEndian?left+2**32*right:2**32*left+right;
  return combined;
}

function decode_node(data){
  let node={keys:[],datas:[],subnode_addresses:[]};
  let view=new DataView(data.buffer);let pos=0;
  const number_of_keys=view.getInt32(pos,false);pos+=4;
  let keys=[];
  for(let i=0;i<number_of_keys;i++){
    const key_size=view.getInt32(pos,false);
    if(!key_size||key_size>32){throw new Error("fatal: !key_size || key_size > 32");}
    pos+=4;keys.push(data.slice(pos,pos+key_size));pos+=key_size;
  }
  const number_of_datas=view.getInt32(pos,false);pos+=4;
  let datas=[];
  for(let i=0;i<number_of_datas;i++){
    const offset=getUint64(view,pos,false);pos+=8;
    const length=view.getInt32(pos,false);pos+=4;
    datas.push([offset,length]);
  }
  const number_of_subnode_addresses=B+1;let subnode_addresses=[];
  for(let i=0;i<number_of_subnode_addresses;i++){
    let subnode_address=getUint64(view,pos,false);pos+=8;subnode_addresses.push(subnode_address);
  }
  node.keys=keys;node.datas=datas;node.subnode_addresses=subnode_addresses;return node;
}

async function get_url_at_range(url,range){
  const headers={referer:refererUrl};
  if(range) headers.range=`bytes=${range[0]}-${range[1]}`;
  const res=await Network.fetchBytes("GET",url,headers);
  if(res.status!==200&&res.status!==206){throw new Error("get_url_at_range: "+res.status);} 
  return new Uint8Array(res.body);
}

async function get_node_at_address(field,address){
  if(!galleries_index_version) throw new Error("galleries_index_version is not set");
  const url="https://"+domain+"/"+"galleriesindex/galleries."+galleries_index_version+".index";
  const data=await get_url_at_range(url,[address,address+max_node_size-1]);
  return decode_node(data);
}

async function get_galleryids_from_data(data){
  let url="https://"+domain+"/"+galleries_index_dir+"/galleries."+galleries_index_version+".data";
  let [offset,length]=data;
  if(length>100000000||length<=0){throw new Error("length "+length+" is too long");}
  const inbuf=await get_url_at_range(url,[offset,offset+length-1]);
  let galleryids=[];let pos=0;let view=new DataView(inbuf.buffer);
  let number_of_galleryids=view.getInt32(pos,false);pos+=4;
  let expected_length=number_of_galleryids*4+4;
  if(number_of_galleryids>10000000||number_of_galleryids<=0){throw new Error("number_of_galleryids "+number_of_galleryids+" is too long");}
  else if(inbuf.byteLength!==expected_length){throw new Error("inbuf.byteLength "+inbuf.byteLength+" !== expected_length "+expected_length);} 
  for(let i=0;i<number_of_galleryids;++i){galleryids.push(view.getInt32(pos,false));pos+=4;}
  return galleryids;
}

async function B_search(field,key,node){
  const compare_arraybuffers=function(dv1,dv2){const top=Math.min(dv1.length,dv2.length);for(let i=0;i<top;i++){if(dv1[i]<dv2[i]){return -1;} else if(dv1[i]>dv2[i]){return 1;}} return 0;};
  const locate_key=function(key,node){let cmp_result=-1;let i;for(i=0;i<node.keys.length;i++){cmp_result=compare_arraybuffers(key,node.keys[i]);if(cmp_result<=0){break;}} return [!cmp_result,i];};
  const is_leaf=function(node){for(let i=0;i<node.subnode_addresses.length;i++){if(node.subnode_addresses[i]){return false;}} return true;};
  if(!node||!node.keys.length){return;} 
  let [there,where]=locate_key(key,node);
  if(there){return node.datas[where];} else if(is_leaf(node)){return;} 
  if(node.subnode_addresses[where]==0){return;} 
  const subnode=await get_node_at_address(field,node.subnode_addresses[where]);
  return await B_search(field,key,subnode);
}

async function get_galleryids_for_query_without_namespace(query){
  query=query.replace(/_/g," ");
  const key=hash_term(query);
  const field="galleries";
  const node=await get_node_at_address(field,0);
  const data=await B_search(field,key,node);
  if(!data){return [];} else {return await get_galleryids_from_data(data);} 
}

function nozomi_address_from_state(state,with_prefix){
  if(state.orderby!=="date"||state.orderbykey==="published"){
    if(state.area==="all") return("https://"+domain+"/"+(with_prefix?compressed_nozomi_prefix+"/":"")+[state.orderby,[state.orderbykey,state.language].join("-")].join("/")+nozomiextension);
    return("https://"+domain+"/"+(with_prefix?compressed_nozomi_prefix+"/":"")+[state.area,state.orderby,state.orderbykey,[encodeURI(state.tag),state.language].join("-")].join("/")+nozomiextension);
  }
  if(state.area==="all") return("https://"+domain+"/"+(with_prefix?compressed_nozomi_prefix+"/":"")+[[encodeURI(state.tag),state.language].join("-")].join("/")+nozomiextension);
  return("https://"+domain+"/"+(with_prefix?compressed_nozomi_prefix+"/":"")+[state.area,[encodeURI(state.tag),state.language].join("-")].join("/")+nozomiextension);
}

async function get_galleryids_from_state(state){
  const url=nozomi_address_from_state(state,true);
  const data=await get_url_at_range(url);
  var nozomi=[];var view=new DataView(data.buffer);var total=view.byteLength/4;for(var i=0;i<total;i++){nozomi.push(view.getInt32(i*4,false));} 
  return nozomi;
}

async function get_galleryids_and_count({range,state}){
  const headers={referer:refererUrl};
  if(range) headers.range=range;
  const resp=await Network.fetchBytes("GET",nozomi_address_from_state(state,false),headers);
  if(resp.status!==200&&resp.status!==206){throw `failed fetch: ${resp.status}`;} 
  let itemCount=0;
  const cr=resp.headers["content-range"]||resp.headers["Content-Range"];
  const temp=parseInt(cr?.replace(/^[Bb]ytes \d+-\d+\//,""));
  if(!isNaN(temp)&&temp>0){itemCount=temp/4;} 
  const arrayBuffer=resp.body;const nozomi=[];
  if(arrayBuffer){const view=new DataView(arrayBuffer);const total=view.byteLength/4;for(let i=0;i<total;i++){nozomi.push(view.getInt32(i*4,false));}}
  return {galleryids:nozomi,count:itemCount};
}

async function get_single_galleryblock(gid){
  const url="https://"+domain+"/"+`galleryblock/${gid}.html`;
  const res=await Network.get(url,{referer:refererUrl});
  return parseGalleryBlockInfo(res.body);
}

async function get_galleryblocks(gids){
  if(gids.length>25) throw new Error("Be careful: too many blocks");
  return await Promise.all(gids.map(n=>get_single_galleryblock(n)));
}

async function get_index_version(name="galleriesindex"){
  const url="https://"+domain+"/"+name+"/version?_="+new Date().getTime();
  const resp=await Network.get(url,{referer:refererUrl});
  if(resp.status===200){return resp.body;} else {throw new Error(resp.status);} 
}

async function update_galleries_index_version(){
  galleries_index_version=await get_index_version();
}

async function get_image_srcs(files, galleryId){
  const referer = galleryId ? `https://hitomi.la/reader/${galleryId}.html` : refererUrl;
  const resp=await Network.get("https://"+domain+"/"+"gg.js?_="+new Date().getTime(),{referer});
  if(resp.status>=400){throw new Error(resp.status);} 
  const js = resp.body;
  const caseMatches = Array.from(js.matchAll(/(?<=case )\d+/g)).map(m=>m[0]);
  const initialMatch = /(?<=var o = )[0-9]+/.exec(js);
  const bMatch = /(?<=b: ')\d+/.exec(js);
  const initialG = initialMatch ? parseInt(initialMatch[0]) : 1;
  const bVal = bMatch ? bMatch[0] : "1763208001";
  const mm = (g)=> caseMatches.includes(String(g)) ? ((~initialG)&1) : initialG;
  const GG_s = (h)=>{const m=/(..)(.)$/.exec(h);return m?parseInt(m[2]+m[1],16):0;};
  const full_path_from_hash=(hash)=>{return bVal+"/"+GG_s(hash)+"/"+hash;};
  const subdomain_from_url=(url,base)=>{
    let retval = base ?? 'b';
    const m = /\/[0-9a-f]{61}([0-9a-f]{2})([0-9a-f])/.exec(url);
    if(!m) return 'a';
    const g = parseInt(m[2]+m[1],16);
    const char = String.fromCharCode(97 + mm(g));
    if(retval === 'tn') return char + retval;
    if(retval === 'w') return char === 'a' ? 'w1' : 'w2';
    return char;
  };
  const url_from_hash=(image)=>{
    const ext = "webp";
    const path = full_path_from_hash(image.hash)+`.${ext}`;
    const raw = `https://${domain2}/${path}`;
    const sub = subdomain_from_url(raw,'w');
    return `https://${sub}.${domain2}/${path}`;
  };
  return files.map((image)=>url_from_hash(image));
}

function get_thumbnail_url_from_hash(hash,bigTn){
  if(!hash || typeof hash !== 'string'){
    return "";
  }
  return("https://atn."+domain2+"/"+`${bigTn?"webpbigtn":"webpsmalltn"}/${hash.slice(-1)}/${hash.slice(-3,-1)}/${hash}.webp`);
}

async function get_gallery_detail(gid){
  const resp=await Network.get("https://"+domain+"/"+`galleries/${gid}.js`,{referer:refererUrl});
  if(resp.status!==200){throw new Error(resp.status);} 
  return parseGalleryDetail(resp.body);
}

function parseQuery(query){
  const positive_terms=[];const negative_terms=[];let or_terms=[[]];const terms=query.toLowerCase().trim().split(/\s+/);
  terms.forEach((term,i)=>{
    if(term==="or") return;
    let namespace=undefined;let value="";
    if(term.split("").filter(n=>n===":").length>1){throw new Error("不合法的标签，请使用namespace:tag的格式");}
    if(term.includes(":")){
      const splits=term.split(":");const left=splits[0].replace(/^-/,"");
      if(namespaces.includes(left)){namespace=left;} else {throw new Error("不合法的namespace");}
      if(!splits[1]) throw new Error("不合法，标签为空");
      value=splits[1].replace(/_/g," ");
    } else {value=term.replace(/_/g," ");}
    const or_previous=i>0&&terms[i-1]==="or";const or_next=i+1<terms.length&&terms[i+1]==="or";
    if(or_previous||or_next){
      if(term.match(/^-/)) throw new Error("不合法，或搜索中只能使用正向关键词");
      or_terms[or_terms.length-1].push({namespace,value});
      if(!or_next){or_terms.push([]);} 
      return;
    }
    if(term.match(/^-/)){negative_terms.push({namespace,value});} else {positive_terms.push({namespace,value});}
  });
  or_terms.filter(n=>n.length===1).forEach(n=>{positive_terms.push(n[0]);});
  or_terms=or_terms.filter(n=>n.length>1);
  if((or_terms.length>0||negative_terms.length>0)&&positive_terms.length===0){positive_terms.push({value:""});}
  return {positive_terms,negative_terms,or_terms};
}

async function getSingleTagSearchPage({state,page}){
  return await get_galleryids_and_count({state,range:"bytes="+`${page*100}-${(page+1)*100-1}`});
}

async function multiTagSearch(options){
  const getPromise=(n)=>{
    if(!n.value){const state={area:"all",tag:"index",language:"all",orderby:options.orderby,orderbykey:options.orderbykey,orderbydirection:options.orderbydirection};return get_galleryids_from_state(state);} 
    else if(!n.namespace){return get_galleryids_for_query_without_namespace(n.value);} 
    else if(n.namespace==="language"){const state={area:"all",tag:"index",language:n.value,orderby:options.orderby,orderbykey:options.orderbykey,orderbydirection:options.orderbydirection};return get_galleryids_from_state(state);} 
    else {const state={area:n.namespace==="female"||n.namespace==="male"?"tag":n.namespace,tag:n.namespace==="female"?"female:"+n.value:n.namespace==="male"?"male:"+n.value:n.value,language:"all",orderby:options.orderby,orderbykey:options.orderbykey,orderbydirection:options.orderbydirection};return get_galleryids_from_state(state);} 
  };
  const parsed=parseQuery(options.term);
  const promises=[...parsed.positive_terms.map(n=>getPromise(n)),...parsed.negative_terms.map(n=>getPromise(n)),...parsed.or_terms.flat().map(n=>getPromise(n))];
  const result=await Promise.all(promises);
  const lp=parsed.positive_terms.length;const ln=parsed.negative_terms.length;let r=intersectAll(result.slice(0,lp));
  for(let i=lp;i<lp+ln;i++){r=subtract(r,result[i]);}
  let i=lp+ln;for(const or_term of parsed.or_terms){const length=or_term.length;r=intersectAll([r,unionAll(result.slice(i,i+length))]);i+=length;}
  return r;
}

async function search(options){
  const parsed=parseQuery(options.term);
  if(!options.term.trim()&&options.orderbydirection==="desc"){
    const state={area:"all",tag:"index",language:"all",orderby:options.orderby,orderbykey:options.orderbykey,orderbydirection:options.orderbydirection};
    const {galleryids,count}=await getSingleTagSearchPage({state,page:0});
    return {type:"single",gids:galleryids,count,state};
  } else if(parsed.negative_terms.length===0&&parsed.or_terms.length===0&&parsed.positive_terms.length===1&&parsed.positive_terms[0].namespace&&options.orderbydirection==="desc"){
    const state={area:"all",tag:"index",language:"all",orderby:options.orderby,orderbykey:options.orderbykey,orderbydirection:options.orderbydirection};
    const n=parsed.positive_terms[0];
    if(!n.namespace) throw new Error("");
    if(n.namespace==="language"){state.language=n.value;} else {state.area=n.namespace==="female"||n.namespace==="male"?"tag":n.namespace;state.tag=n.namespace==="female"?"female:"+n.value:n.namespace==="male"?"male:"+n.value:n.value;}
    const {galleryids,count}=await getSingleTagSearchPage({state,page:0});
    return {type:"single",gids:galleryids,count,state};
  } else {
    await update_galleries_index_version();
    const gids=await multiTagSearch(options);
    const rgids=options.orderbydirection==="random"?shuffleArray(gids):options.orderbydirection==="asc"?gids.slice().reverse():gids;
    return {type:"all",gids:rgids,count:rgids.length};
  }
}

function parseGalleryBlockInfo(body){
  const mangaEl=new HtmlDocument(body);
  const titleLink=mangaEl.querySelector("h1.lillie > a");
  if(!titleLink){
    return {gid:"0",title:"",type:undefined,language:undefined,artists:[],series:[],females:[],males:[],others:[],thumbnail_hashs:[],posted_time:new Date()};
  }
  const m = titleLink.attributes && titleLink.attributes["href"] ? /-(\d+)\.html$/.exec(titleLink.attributes["href"]) : null;
  const gid = m ? m[1] : "0";
  const title=titleLink.text || "";
  const thumbnail_hashs=[];
  const srcs=Array.from(mangaEl.querySelectorAll("img")).map(a=>a.attributes && a.attributes["data-src"] ? a.attributes["data-src"].trim() : "").filter(src=>src);
  srcs.forEach(src=>{const r=/\/(\w{64})\./.exec(src);if(r){const hash=r[1];thumbnail_hashs.push(hash);}});
  const artists=Array.from(mangaEl.querySelectorAll(".artist-list li a")).map(a=>a.text ? a.text.trim() : "").filter(text=>text);
  let language=undefined;let series=[];let type=undefined;
  const rows=mangaEl.querySelectorAll(".dj-desc tr");
  rows.forEach(row=>{const key=row.children[0] && row.children[0].text ? row.children[0].text.trim().toLowerCase() : "";const valueCell=row.children[1];if(!valueCell)return;switch(key){case "series":{const text=valueCell.text ? valueCell.text.trim() : "";if(text!=="N/A"){const as=valueCell.querySelectorAll("a");as.forEach(a=>{if(a.text)series.push(a.text.trim());});} break;} case "type":{type=valueCell.text ? valueCell.text.trim() : "";break;} case "language":{const link=valueCell.querySelector("a");if(link && link.attributes && link.attributes["href"]){const href=link.attributes["href"];const r=/\/index-(\w+)\.html/.exec(href);if(r){language=r[1];}} break;}}});
  const females=[];const males=[];const others=[];
  // 使用正确的标签格式以支持翻译
  Array.from(mangaEl.querySelectorAll(".relatedtags li a")).map(a=>{const text=a.text ? a.text.trim() : "";if(text.endsWith(" ♀")){females.push(text.slice(0,-2));} else if(text.endsWith(" ♂")){males.push(text.slice(0,-2));} else if(text){others.push(text);} });
  const postedElement=mangaEl.querySelector(".date");
  const postedRaw=postedElement && postedElement.text ? postedElement.text.trim() : "";
  const posted_time=postedRaw ? new Date(toISO8601(postedRaw)) : new Date();
  return {gid:gid||"0",title:title||"",type:type||"",language:language||"",artists:artists||[],series:series||[],females:females||[],males:males||[],others:others||[],thumbnail_hashs:thumbnail_hashs||[],posted_time:posted_time||new Date()};
}

function parseGalleryDetail(text){
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const json = start >= 0 && end > start ? text.slice(start, end + 1) : '{}';
  const data=JSON.parse(json);
  const artists=[];const groups=[];const series=[];const characters=[];const females=[];const males=[];const others=[];const translations=[];const related_gids=[];
  if("artists" in data&&Array.isArray(data.artists)&&data.artists.length>0){data.artists.forEach(n=>artists.push(n.artist));}
  if("groups" in data&&Array.isArray(data.groups)&&data.groups.length>0){data.groups.forEach(n=>groups.push(n.group));}
  if("parodys" in data&&Array.isArray(data.parodys)&&data.parodys.length>0){data.parodys.forEach(n=>series.push(n.parody));}
  if("characters" in data&&Array.isArray(data.characters)&&data.characters.length>0){data.characters.forEach(n=>characters.push(n.character));}
  // 确保标签正确分类以支持翻译
  if("tags" in data&&Array.isArray(data.tags)&&data.tags.length>0){data.tags.filter(n=>n.female==="1").forEach(n=>females.push(n.tag));data.tags.filter(n=>n.male==="1").forEach(n=>males.push(n.tag));data.tags.filter(n=>!n.male&&!n.female).forEach(n=>others.push(n.tag));}
  if("languages" in data&&Array.isArray(data.languages)&&data.languages.length>0){data.languages.forEach(n=>{translations.push({gid:n.galleryid,language:n.name});});}
  if("related" in data&&Array.isArray(data.related)&&data.related.length>0){data.related.forEach(n=>related_gids.push(n));}
  return {gid:parseInt(data.id)||0,title:data.title||"",url:"https://hitomi.la"+(data.galleryurl||""),type:data.type||"",length:data.files?data.files.length:0,language:("language" in data&&data.language)?data.language:"",artists:artists||[],groups:groups||[],series:series||[],characters:characters||[],females:females||[],males:males||[],others:others||[],thumbnail_hash:data.files&&data.files[0]&&data.files[0].hash?data.files[0].hash:"",files:data.files||[],posted_time:new Date(toISO8601(data.date||"")),translations:translations||[],related_gids:related_gids||[]};
}
