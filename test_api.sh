#!/bin/bash

# 测试搜索排序API，添加-v参数获取详细输出
curl -v -X GET "https://api.comick.io/v1.0/search?q=horror&limit=49&page=1&sort=uploaded&country=jp&status=1"