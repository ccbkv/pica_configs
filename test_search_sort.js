// 测试search.load方法的排序功能
const https = require('https');

// 模拟search.load方法的参数
const keyword = 'horror';
const options = ['uploaded-更新排序', 'jp-日本', '1-连载'];
const page = 1;

// 构建URL
let url = `https://api.comick.io/v1.0/search?q=${encodeURIComponent(keyword)}&limit=49&page=${encodeURIComponent(page)}`;

// 添加排序参数
if (options[0]) {
    url += `&sort=${encodeURIComponent(options[0].split('-')[0])}`;
}

// 添加地区参数
if (options[1] && options[1] !== '-全部') {
    url += `&country=${encodeURIComponent(options[1].split('-')[0])}`;
}

// 添加状态参数
if (options[2]) {
    url += `&status=${encodeURIComponent(options[2].split('-')[0])}`;
}

console.log('请求URL:', url);

// 发送请求
const req = https.get(url, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log('响应头:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log('响应数据长度:', result.length);
            if (result.length > 0) {
                console.log('第一条数据:', result[0]);
            }
        } catch (e) {
            console.error('解析JSON失败:', e);
            console.log('原始数据:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`请求遇到问题: ${e.message}`);
});

// 结束请求
req.end();