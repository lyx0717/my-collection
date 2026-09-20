import type { StoreShape } from '../types'

/** 内置书签数据；想固化自己的数据时替换本文件 */
export const SEED_DATA: StoreShape = {
  "version": 2,
  "collections": [
    {
      "id": "col_social",
      "name": "主页",
      "emoji": "🏠",
      "order": 0
    },
    {
      "id": "col_shop",
      "name": "杂项",
      "emoji": "🛒",
      "order": 1
    },
    {
      "id": "col_ai",
      "name": "AI",
      "emoji": "🤖",
      "order": 3
    },
    {
      "id": "col_work",
      "name": "工作",
      "emoji": "💼",
      "order": 4
    },
    {
      "id": "col_dev",
      "name": "程序员",
      "emoji": "💻",
      "order": 5
    },
    {
      "id": "col_life",
      "name": "科学",
      "emoji": "✈️",
      "order": 7
    }
  ],
  "bookmarks": [
    {
      "id": "bm_87abac22-75ba-40f6-bf61-42bb40d20837",
      "url": "https://weibo.com/mygroups",
      "title": "微博",
      "tags": [
        "社交",
        "微博"
      ],
      "starred": false,
      "domain": "weibo.com",
      "createdAt": "2026-09-18T01:00:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_social",
      "order": 0
    },
    {
      "id": "bm_521cfbc1-4db7-4c9d-a7a0-6fd9e860ed75",
      "url": "https://www.xiaohongshu.com",
      "title": "小红书",
      "tags": [
        "社交",
        "种草"
      ],
      "starred": false,
      "domain": "xiaohongshu.com",
      "createdAt": "2026-09-18T00:58:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_social",
      "order": 1
    },
    {
      "id": "bm_be749a15-9c4d-4403-b170-0399d32da471",
      "url": "http://ditu.amap.com",
      "title": "高德地图",
      "tags": [
        "地图"
      ],
      "starred": false,
      "domain": "ditu.amap.com",
      "createdAt": "2026-09-18T00:59:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 2
    },
    {
      "id": "bm_06042474-40c5-4c4d-a43d-809ae3007386",
      "url": "https://www.zhihu.com",
      "title": "知乎",
      "tags": [
        "社交",
        "问答"
      ],
      "starred": false,
      "domain": "zhihu.com",
      "createdAt": "2026-09-18T00:57:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_social",
      "order": 3
    },
    {
      "id": "bm_2fa600a9-1c51-44e4-83c9-f6715e6f43cd",
      "url": "https://www.toutiao.com/",
      "title": "今日头条",
      "tags": [
        "资讯"
      ],
      "starred": false,
      "domain": "toutiao.com",
      "createdAt": "2026-09-18T00:56:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 4
    },
    {
      "id": "bm_8861e9c4-6d1d-4d68-bea3-0f14ed03c113",
      "url": "https://www.jd.com",
      "title": "京东",
      "tags": [
        "电商"
      ],
      "starred": false,
      "domain": "jd.com",
      "createdAt": "2026-09-18T00:55:00.000Z",
      "updatedAt": "2026-09-20T02:29:30.024Z",
      "collectionId": "col_social",
      "order": 5
    },
    {
      "id": "bm_1bb94136-a410-41ff-95fa-0a170f2ee0fb",
      "url": "https://www.taobao.com",
      "title": "淘宝",
      "tags": [
        "电商"
      ],
      "starred": false,
      "domain": "taobao.com",
      "createdAt": "2026-09-18T00:54:00.000Z",
      "updatedAt": "2026-09-20T02:29:30.024Z",
      "collectionId": "col_social",
      "order": 6
    },
    {
      "id": "bm_56a229ea-a01c-4e32-806b-59e5ccb73ba6",
      "url": "https://xiaomiyoupin.com",
      "title": "小米有品",
      "tags": [
        "电商",
        "小米"
      ],
      "starred": false,
      "domain": "xiaomiyoupin.com",
      "createdAt": "2026-09-18T00:52:00.000Z",
      "updatedAt": "2026-09-20T02:29:30.024Z",
      "collectionId": "col_social",
      "order": 7
    },
    {
      "id": "bm_37d12077-525b-43f0-8e8c-706509bdf12f",
      "url": "https://www.mi.com/shop",
      "title": "小米商城",
      "tags": [
        "电商",
        "小米"
      ],
      "starred": false,
      "domain": "mi.com",
      "createdAt": "2026-09-18T00:50:00.000Z",
      "updatedAt": "2026-09-20T02:29:30.024Z",
      "collectionId": "col_social",
      "order": 8
    },
    {
      "id": "bm_266a7711-0985-422d-bcb0-7fd8dee0f023",
      "url": "https://cdn.codenews.cc/pdf/%E5%B0%8F%E7%B1%B3%E5%88%9B%E4%B8%9A%E6%80%9D%E8%80%83.pdf",
      "title": "小米创业思考（PDF）",
      "tags": [
        "阅读"
      ],
      "starred": false,
      "domain": "cdn.codenews.cc",
      "createdAt": "2026-09-18T00:49:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 9
    },
    {
      "id": "bm_bcf499fd-3ac5-4ad7-a934-e05e085e42f1",
      "url": "https://www.apple.com/cn/",
      "title": "Apple 中国",
      "tags": [
        "苹果"
      ],
      "starred": false,
      "domain": "apple.com",
      "createdAt": "2026-09-18T00:48:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 10
    },
    {
      "id": "bm_ce62640a-e63d-4e3b-9725-b5f297642509",
      "url": "https://www.dongchedi.com/",
      "title": "懂车帝",
      "tags": [
        "汽车"
      ],
      "starred": false,
      "domain": "dongchedi.com",
      "createdAt": "2026-09-18T00:47:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 11
    },
    {
      "id": "bm_cbe9a6dc-0183-4265-a151-f7e5742766ff",
      "url": "https://www.12306.cn/",
      "title": "12306 铁路购票",
      "tags": [
        "出行",
        "购票"
      ],
      "starred": false,
      "domain": "12306.cn",
      "createdAt": "2026-09-18T00:46:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 12
    },
    {
      "id": "bm_7b5141d0-5052-4f7b-a3a7-1b65e4f81b42",
      "url": "https://pan.baidu.com/",
      "title": "百度网盘",
      "tags": [
        "云盘"
      ],
      "starred": false,
      "domain": "pan.baidu.com",
      "createdAt": "2026-09-18T00:45:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 13
    },
    {
      "id": "bm_3665ca0c-46ea-4256-97d2-e78a69fae682",
      "url": "https://www.aliyundrive.com/",
      "title": "阿里云盘",
      "tags": [
        "云盘"
      ],
      "starred": false,
      "domain": "aliyundrive.com",
      "createdAt": "2026-09-18T00:44:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 14
    },
    {
      "id": "bm_a56753eb-ea0b-4664-82a4-c46d2b6bad5c",
      "url": "https://www.123pan.com/",
      "title": "123 云盘",
      "tags": [
        "云盘"
      ],
      "starred": false,
      "domain": "123pan.com",
      "createdAt": "2026-09-18T00:43:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 15
    },
    {
      "id": "bm_5cce19f6-17fa-4032-b40c-001e325e2e1d",
      "url": "https://xueqiu.com",
      "title": "雪球",
      "tags": [
        "金融",
        "股票"
      ],
      "starred": false,
      "domain": "xueqiu.com",
      "createdAt": "2026-09-18T00:42:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 16
    },
    {
      "id": "bm_a1d00bea-fc8c-4d7a-b62d-0a83dbee3bef",
      "url": "https://www.iqiyi.com/?vfm=f_432_dhm&fv=8648154ddd63e0af",
      "title": "爱奇艺",
      "tags": [
        "视频"
      ],
      "starred": false,
      "domain": "iqiyi.com",
      "createdAt": "2026-09-18T00:41:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 17
    },
    {
      "id": "bm_7322ea93-23f0-420e-894d-af8aa0fdd5be",
      "url": "http://www.youku.com",
      "title": "优酷",
      "tags": [
        "视频"
      ],
      "starred": false,
      "domain": "youku.com",
      "createdAt": "2026-09-18T00:40:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 18
    },
    {
      "id": "bm_9b6dcef3-c803-4221-8e52-f03282ef5951",
      "url": "http://v.qq.com/",
      "title": "腾讯视频",
      "tags": [
        "视频"
      ],
      "starred": false,
      "domain": "v.qq.com",
      "createdAt": "2026-09-18T00:39:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 19
    },
    {
      "id": "bm_f60ff791-714c-49fc-8dc1-f866a12b076e",
      "url": "https://www.douyin.com/?ug_source=pc_liangxiang_01",
      "title": "抖音",
      "tags": [
        "短视频"
      ],
      "starred": false,
      "domain": "douyin.com",
      "createdAt": "2026-09-18T00:38:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 20
    },
    {
      "id": "bm_3d40c987-c657-4e4d-8569-02a7dcbe18bf",
      "url": "https://www.bilibili.com/",
      "title": "哔哩哔哩",
      "tags": [
        "视频",
        "B站"
      ],
      "starred": false,
      "domain": "bilibili.com",
      "createdAt": "2026-09-18T00:37:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 21
    },
    {
      "id": "bm_f3a47226-9317-4db0-95f7-082c2f108a7b",
      "url": "https://www.bilibili.com/list/ml3793493697?spm_id_from=333.1007.0.0&oid=822691423&bvid=BV1ig4y1J7ez",
      "title": "B站 · 我的歌单",
      "tags": [
        "音乐",
        "B站"
      ],
      "starred": false,
      "domain": "bilibili.com",
      "createdAt": "2026-09-18T00:36:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 22
    },
    {
      "id": "bm_f6e67c34-6cb2-4786-8fa9-98d8d62ae352",
      "url": "http://liuyan.people.com.cn/forum/list?fid=4659",
      "title": "领导留言板",
      "tags": [
        "政务"
      ],
      "starred": false,
      "domain": "liuyan.people.com.cn",
      "createdAt": "2026-09-18T00:35:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 23
    },
    {
      "id": "bm_6e34305d-3eb3-471f-a947-48dc8050cef2",
      "url": "https://nba.hupu.com/games",
      "title": "虎扑 NBA",
      "tags": [
        "NBA",
        "体育"
      ],
      "starred": false,
      "domain": "nba.hupu.com",
      "createdAt": "2026-09-18T00:34:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 24
    },
    {
      "id": "bm_0195f7d9-ebbf-4d70-8105-5e5c8b9b17b4",
      "url": "https://jrszbj.com",
      "title": "JRS 直播吧",
      "tags": [
        "NBA",
        "体育"
      ],
      "starred": false,
      "domain": "jrszbj.com",
      "createdAt": "2026-09-18T00:33:00.000Z",
      "updatedAt": "2026-09-20T02:34:29.312Z",
      "collectionId": "col_shop",
      "order": 25
    },
    {
      "id": "bm_3b2e50f1-942e-4c70-aef5-b73581b94f7a",
      "url": "https://cli.im/url",
      "title": "草料二维码",
      "tags": [
        "工具",
        "二维码"
      ],
      "starred": false,
      "domain": "cli.im",
      "createdAt": "2026-09-18T00:32:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 26
    },
    {
      "id": "bm_f537ec9b-1ba0-419e-ba65-625ba13a3e43",
      "url": "https://itab.link",
      "title": "iTab 新标签页",
      "tags": [
        "工具",
        "起始页"
      ],
      "starred": false,
      "domain": "itab.link",
      "createdAt": "2026-09-18T00:31:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 27
    },
    {
      "id": "bm_6da3c8f7-1ffa-485a-8c8d-301c2e79596c",
      "url": "https://chat.deepseek.com",
      "title": "DeepSeek",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "chat.deepseek.com",
      "createdAt": "2026-09-18T00:30:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 28
    },
    {
      "id": "bm_4c54a292-7834-41b0-b083-2cc9be511b04",
      "url": "https://www.doubao.com/chat/?channel=hw_db_itab&source=hw_db_itab",
      "title": "豆包",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "doubao.com",
      "createdAt": "2026-09-18T00:29:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 29
    },
    {
      "id": "bm_7ba752cb-fddc-4e38-babc-152998978d92",
      "url": "https://qianwen.com",
      "title": "千问",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "qianwen.com",
      "createdAt": "2026-09-18T00:28:00.000Z",
      "updatedAt": "2026-09-20T06:23:45.476Z",
      "collectionId": "col_ai",
      "order": 30,
      "description": "千问大模型"
    },
    {
      "id": "bm_d5005df1-1de7-4949-b6f8-54cc102fdb54",
      "url": "https://yuanbao.tencent.com/chat/naQivTmsDa",
      "title": "腾讯元宝",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "yuanbao.tencent.com",
      "createdAt": "2026-09-18T00:27:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 31
    },
    {
      "id": "bm_f52f191e-cd65-4156-8cf5-fd6a01241901",
      "url": "https://www.kimi.com",
      "title": "Kimi",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "kimi.com",
      "createdAt": "2026-09-18T00:26:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 32
    },
    {
      "id": "bm_4797a0af-7212-4a38-ba94-03dd0da7aea1",
      "url": "https://yiyan.baidu.com",
      "title": "文心一言",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "yiyan.baidu.com",
      "createdAt": "2026-09-18T00:25:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 33
    },
    {
      "id": "bm_8d02c6f3-2d95-4601-8a2a-ffb20ffe1f30",
      "url": "https://aistudio.xiaomimimo.com",
      "title": "Xiaomi MiMo",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "aistudio.xiaomimimo.com",
      "createdAt": "2026-09-18T00:24:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 34
    },
    {
      "id": "bm_8ad816a8-00e4-4954-b44d-34b792d1994a",
      "url": "https://www.minimaxi.com/",
      "title": "MiniMax",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "minimaxi.com",
      "createdAt": "2026-09-18T00:23:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 35
    },
    {
      "id": "bm_ecc19b96-06be-432b-8b5c-2e3c46d9f832",
      "url": "https://openclaw.ai",
      "title": "OpenClaw",
      "tags": [
        "智能体",
        "Agent"
      ],
      "starred": false,
      "domain": "openclaw.ai",
      "createdAt": "2026-09-18T00:22:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 36
    },
    {
      "id": "bm_6827f34d-094f-4c97-9d69-ecc90cabaf60",
      "url": "https://clawhub.ai/skills?sort=downloads",
      "title": "ClawHub",
      "tags": [
        "智能体",
        "Agent"
      ],
      "starred": false,
      "domain": "clawhub.ai",
      "createdAt": "2026-09-18T00:21:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 37
    },
    {
      "id": "bm_8d9beb1f-e70a-474b-a476-6bebd5412949",
      "url": "https://cn.clawhub-mirror.com",
      "title": "ClawHub 中文镜像",
      "tags": [
        "智能体",
        "镜像"
      ],
      "starred": false,
      "domain": "cn.clawhub-mirror.com",
      "createdAt": "2026-09-18T00:20:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 38
    },
    {
      "id": "bm_567d136a-dab3-4779-ad03-2a901d7760bb",
      "url": "https://skillhub.tencent.com",
      "title": "腾讯 SkillHub",
      "tags": [
        "智能体"
      ],
      "starred": false,
      "domain": "skillhub.tencent.com",
      "createdAt": "2026-09-18T00:19:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 39
    },
    {
      "id": "bm_e70a37aa-dffe-4adb-a1bf-40ca67bfeeb7",
      "url": "https://openclaw101.dev/zh",
      "title": "OpenClaw 101",
      "tags": [
        "智能体",
        "教程"
      ],
      "starred": false,
      "domain": "openclaw101.dev",
      "createdAt": "2026-09-18T00:18:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 40
    },
    {
      "id": "bm_426c49f0-182d-48fd-a4f8-1f7277027870",
      "url": "https://code.claude.com/docs/zh-CN/overview",
      "title": "Claude Code 文档",
      "tags": [
        "AI编程",
        "文档"
      ],
      "starred": false,
      "domain": "code.claude.com",
      "createdAt": "2026-09-18T00:17:00.000Z",
      "updatedAt": "2026-09-20T02:37:12.789Z",
      "collectionId": "col_ai",
      "order": 41
    },
    {
      "id": "bm_fdf6a1db-f932-42f2-be28-a5990f6b5d62",
      "url": "https://dis.csqixiang.cn/unpo/jmitab.html",
      "title": "即梦 AI",
      "tags": [
        "AI绘画"
      ],
      "starred": false,
      "domain": "dis.csqixiang.cn",
      "createdAt": "2026-09-18T00:16:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 42
    },
    {
      "id": "bm_e6f7c904-64a1-4a92-9c6c-49a530e09833",
      "url": "https://open.feishu.cn/app",
      "title": "飞书开放平台",
      "tags": [
        "效率工具",
        "开放平台"
      ],
      "starred": false,
      "domain": "open.feishu.cn",
      "createdAt": "2026-09-18T00:15:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 43
    },
    {
      "id": "bm_f6ccafa8-59d7-4850-bd2e-663fe27c0602",
      "url": "https://console.volcengine.com/ark/region:cn-beijing/overview",
      "title": "火山方舟控制台",
      "tags": [
        "API",
        "大模型"
      ],
      "starred": false,
      "domain": "console.volcengine.com",
      "createdAt": "2026-09-18T00:14:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 44
    },
    {
      "id": "bm_fb076564-5986-41d4-ac54-f4f45659b40e",
      "url": "https://bailian.console.aliyun.com/cn-beijing/?tab=coding-plan#/efm/detail",
      "title": "阿里云百炼",
      "tags": [
        "API",
        "大模型"
      ],
      "starred": false,
      "domain": "bailian.console.aliyun.com",
      "createdAt": "2026-09-18T00:13:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 45
    },
    {
      "id": "bm_9fac025e-9ca2-4b63-80f7-44f28b4201df",
      "url": "https://openrouter.ai",
      "title": "OpenRouter",
      "tags": [
        "API",
        "大模型"
      ],
      "starred": false,
      "domain": "openrouter.ai",
      "createdAt": "2026-09-18T00:12:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 46
    },
    {
      "id": "bm_6faf5cf6-19a2-40e2-8573-29b50d46f3f8",
      "url": "https://app.tavily.com/home",
      "title": "Tavily API",
      "tags": [
        "API",
        "搜索"
      ],
      "starred": false,
      "domain": "app.tavily.com",
      "createdAt": "2026-09-18T00:11:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 47
    },
    {
      "id": "bm_103cae21-451c-47f2-bd7c-fa5dd65c5b71",
      "url": "https://makerworld.com.cn/zh",
      "title": "MakerWorld",
      "tags": [
        "3D打印"
      ],
      "starred": false,
      "domain": "makerworld.com.cn",
      "createdAt": "2026-09-18T00:10:00.000Z",
      "updatedAt": "2026-09-20T02:32:12.792Z",
      "collectionId": "col_social",
      "order": 48
    },
    {
      "id": "bm_71c9267d-c0d6-49f3-8880-8857b1c90c46",
      "url": "https://hermes-agent.nousresearch.com",
      "title": "Hermes Agent",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "hermes-agent.nousresearch.com",
      "createdAt": "2026-09-18T00:09:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 49
    },
    {
      "id": "bm_bc49de7e-8491-4793-bf0d-9c6965b49b9a",
      "url": "https://huggingface.co/",
      "title": "Hugging Face",
      "tags": [
        "模型社区"
      ],
      "starred": false,
      "domain": "huggingface.co",
      "createdAt": "2026-09-18T00:08:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 50
    },
    {
      "id": "bm_b5e9af8e-e4c9-44f8-b172-f6fad27aa72e",
      "url": "https://3d.hunyuan.tencent.com",
      "title": "混元 3D",
      "tags": [
        "AI绘画",
        "3D"
      ],
      "starred": false,
      "domain": "3d.hunyuan.tencent.com",
      "createdAt": "2026-09-18T00:07:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 51
    },
    {
      "id": "bm_affcecbb-7a60-4ca7-86c5-8ebcfc520a99",
      "url": "https://studio.tripo3d.com/?category=featured&model_type=all&recommended=recommended&use_case=all",
      "title": "Tripo3D",
      "tags": [
        "AI绘画",
        "3D"
      ],
      "starred": false,
      "domain": "studio.tripo3d.com",
      "createdAt": "2026-09-18T00:06:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 52
    },
    {
      "id": "bm_8f9baa7f-ebed-4b4a-91c0-e98d4d6beb47",
      "url": "https://labs.google/fx",
      "title": "Google AI 创作工具",
      "tags": [
        "AI绘画",
        "视频生成"
      ],
      "starred": false,
      "domain": "labs.google",
      "createdAt": "2026-09-18T00:05:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 53
    },
    {
      "id": "bm_4abf1905-ccf0-4254-8b8e-12041183f065",
      "url": "https://agent.qq.com/page/list?alias_id=alias_qRNtcvmFsjqTLkXKg8a9Ja1PxAJQlXUKPd5-VvhaYMvfTA",
      "title": "QQ AI 邮箱",
      "tags": [
        "AI邮箱"
      ],
      "starred": false,
      "domain": "agent.qq.com",
      "createdAt": "2026-09-18T00:04:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 54
    },
    {
      "id": "bm_ab446c60-3102-4491-a962-ec2539575fac",
      "url": "https://juejin.cn/",
      "title": "掘金",
      "tags": [
        "社区"
      ],
      "starred": false,
      "domain": "juejin.cn",
      "createdAt": "2026-09-18T00:03:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 55
    },
    {
      "id": "bm_73a98559-5ada-4aca-a8d6-679bd21de57b",
      "url": "https://mp.weixin.qq.com/wxopen/initprofile?action=home&lang=zh_CN&token=93210959",
      "title": "微信公众平台",
      "tags": [
        "公众号",
        "运营"
      ],
      "starred": false,
      "domain": "mp.weixin.qq.com",
      "createdAt": "2026-09-18T00:02:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 56
    },
    {
      "id": "bm_6f520a72-9181-4d90-ae98-beaa4e6704e9",
      "url": "https://developers.weixin.qq.com/miniprogram/dev/api/",
      "title": "微信开放文档（小程序）",
      "tags": [
        "小程序",
        "文档"
      ],
      "starred": false,
      "domain": "developers.weixin.qq.com",
      "createdAt": "2026-09-18T00:01:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 57
    },
    {
      "id": "bm_12c039a6-032d-4faa-a7b9-6a5db08e8314",
      "url": "https://developer.mozilla.org/zh-CN/docs/Learn",
      "title": "MDN Web 文档",
      "tags": [
        "前端",
        "文档"
      ],
      "starred": false,
      "domain": "developer.mozilla.org",
      "createdAt": "2026-09-18T00:00:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 58
    },
    {
      "id": "bm_73366c14-dceb-42d4-b797-94ffe6c125c5",
      "url": "https://github.com/",
      "title": "GitHub",
      "tags": [
        "代码托管"
      ],
      "starred": false,
      "domain": "github.com",
      "createdAt": "2026-09-17T23:59:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 59
    },
    {
      "id": "bm_97db5aa6-e1d7-4718-8505-4e9675e78780",
      "url": "https://gitee.com/",
      "title": "Gitee 码云",
      "tags": [
        "代码托管"
      ],
      "starred": false,
      "domain": "gitee.com",
      "createdAt": "2026-09-17T23:58:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 60
    },
    {
      "id": "bm_d6d6d471-c62f-4460-8c14-c37aaade47e3",
      "url": "https://gitee.com/organizations/mirrors/projects",
      "title": "Gitee 镜像站",
      "tags": [
        "代码托管",
        "镜像"
      ],
      "starred": false,
      "domain": "gitee.com",
      "createdAt": "2026-09-17T23:57:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 61
    },
    {
      "id": "bm_6f0f4a9e-e2ce-4644-9576-c7763b125f7e",
      "url": "https://gitcode.com/",
      "title": "GitCode",
      "tags": [
        "代码托管"
      ],
      "starred": false,
      "domain": "gitcode.com",
      "createdAt": "2026-09-17T23:56:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 62
    },
    {
      "id": "bm_a4eaf6b4-820c-44f6-a878-8689f11cc83a",
      "url": "https://cn.vuejs.org/",
      "title": "Vue 3 中文文档",
      "tags": [
        "前端",
        "Vue"
      ],
      "starred": false,
      "domain": "cn.vuejs.org",
      "createdAt": "2026-09-17T23:55:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 63
    },
    {
      "id": "bm_b9cc7eb9-04fa-4699-8290-3a56db993648",
      "url": "https://v2.cn.vuejs.org/",
      "title": "Vue 3 中文文档",
      "tags": [
        "前端",
        "Vue"
      ],
      "starred": false,
      "domain": "v2.cn.vuejs.org",
      "createdAt": "2026-09-17T23:54:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 64
    },
    {
      "id": "bm_565abd27-cad7-4efb-8b52-78a40728d05e",
      "url": "https://vueuse.nodejs.cn/",
      "title": "VueUse",
      "tags": [
        "前端",
        "Vue"
      ],
      "starred": false,
      "domain": "vueuse.nodejs.cn",
      "createdAt": "2026-09-17T23:53:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 65
    },
    {
      "id": "bm_33da6ab7-a93e-495e-a8d3-0a0b7b1b44c6",
      "url": "https://cn.vitejs.dev/",
      "title": "Vite 中文文档",
      "tags": [
        "前端",
        "构建工具"
      ],
      "starred": false,
      "domain": "cn.vitejs.dev",
      "createdAt": "2026-09-17T23:52:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 66
    },
    {
      "id": "bm_78748d86-fcfa-4287-ad76-9e57a937d933",
      "url": "https://element.eleme.cn/#/zh-CN/component/installation",
      "title": "Element-UI",
      "tags": [
        "前端",
        "组件库"
      ],
      "starred": false,
      "domain": "element.eleme.cn",
      "createdAt": "2026-09-17T23:51:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 67
    },
    {
      "id": "bm_3da7c496-5916-4614-99a9-87070287b534",
      "url": "https://element-plus.org/zh-CN/component/overview.html",
      "title": "Element Plus",
      "tags": [
        "前端",
        "组件库",
        "Vue"
      ],
      "starred": false,
      "domain": "element-plus.org",
      "createdAt": "2026-09-17T23:50:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 68
    },
    {
      "id": "bm_7c995891-1e99-4433-8e60-357b627b7309",
      "url": "https://www.electronjs.org/zh/",
      "title": "Electron",
      "tags": [
        "前端",
        "桌面端"
      ],
      "starred": false,
      "domain": "electronjs.org",
      "createdAt": "2026-09-17T23:49:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 69
    },
    {
      "id": "bm_f0e8b4f5-7ca4-4e14-855a-bfd639c67988",
      "url": "https://zh-hans.reactjs.org/",
      "title": "React 中文文档",
      "tags": [
        "前端",
        "React"
      ],
      "starred": false,
      "domain": "zh-hans.reactjs.org",
      "createdAt": "2026-09-17T23:48:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 70
    },
    {
      "id": "bm_062ad1fd-0e6a-4adb-96a0-f2fc7c9556f5",
      "url": "https://www.redux.org.cn/",
      "title": "Redux 中文文档",
      "tags": [
        "前端",
        "React"
      ],
      "starred": false,
      "domain": "redux.org.cn",
      "createdAt": "2026-09-17T23:47:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 71
    },
    {
      "id": "bm_71b02775-e145-4131-bfd7-5ab13f48306e",
      "url": "https://typescript.bootcss.com/",
      "title": "TypeScript 中文文档",
      "tags": [
        "前端",
        "TypeScript",
        "文档"
      ],
      "starred": false,
      "domain": "typescript.bootcss.com",
      "createdAt": "2026-09-17T23:46:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 72
    },
    {
      "id": "bm_491581a5-01c1-4ae1-8cd2-53bf850e0626",
      "url": "https://git-scm.com/",
      "title": "Git 官方文档",
      "tags": [
        "Git",
        "文档"
      ],
      "starred": false,
      "domain": "git-scm.com",
      "createdAt": "2026-09-17T23:45:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 73
    },
    {
      "id": "bm_3d4123ef-3d1d-4001-a401-ae25775217c6",
      "url": "https://www.antdv.com/docs/vue/introduce-cn/",
      "title": "Ant Design Vue",
      "tags": [
        "前端",
        "组件库",
        "Vue"
      ],
      "starred": false,
      "domain": "antdv.com",
      "createdAt": "2026-09-17T23:44:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 74
    },
    {
      "id": "bm_2541d6c0-995e-4ed3-8d66-4e444c8efc82",
      "url": "https://flutter.cn/",
      "title": "Flutter 中文文档",
      "tags": [
        "移动端",
        "跨端"
      ],
      "starred": false,
      "domain": "flutter.cn",
      "createdAt": "2026-09-17T23:43:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 75
    },
    {
      "id": "bm_5473df10-e7e6-4102-aff2-ac38222e1252",
      "url": "https://s.qiniu.com/naaI7f",
      "title": "七牛云控制台",
      "tags": [
        "云服务",
        "对象存储"
      ],
      "starred": false,
      "domain": "s.qiniu.com",
      "createdAt": "2026-09-17T23:42:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 76
    },
    {
      "id": "bm_78077d4b-f4b1-47dd-925b-4f93ed3d202b",
      "url": "https://uniapp.dcloud.io/collocation/pages",
      "title": "uni-app",
      "tags": [
        "移动端",
        "跨端"
      ],
      "starred": false,
      "domain": "uniapp.dcloud.io",
      "createdAt": "2026-09-17T23:41:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 77
    },
    {
      "id": "bm_325720f7-69c2-46fa-b312-954d59ccf424",
      "url": "https://es6.ruanyifeng.com/",
      "title": "ES6 入门教程（阮一峰）",
      "tags": [
        "前端",
        "JavaScript",
        "文档"
      ],
      "starred": false,
      "domain": "es6.ruanyifeng.com",
      "createdAt": "2026-09-17T23:40:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 78
    },
    {
      "id": "bm_f45f98e7-6c3b-4442-b0ff-b483b75cdea3",
      "url": "https://leetcode-cn.com/",
      "title": "力扣 LeetCode",
      "tags": [
        "算法"
      ],
      "starred": false,
      "domain": "leetcode-cn.com",
      "createdAt": "2026-09-17T23:39:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 79
    },
    {
      "id": "bm_a78019fa-99e0-4f10-a577-e32c40aeebc2",
      "url": "https://www.nuxtjs.cn/",
      "title": "Nuxt 中文网",
      "tags": [
        "前端",
        "Vue"
      ],
      "starred": false,
      "domain": "nuxtjs.cn",
      "createdAt": "2026-09-17T23:38:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 80
    },
    {
      "id": "bm_bdac4294-f14c-4438-8961-bbac333e479b",
      "url": "https://www.koajs.com.cn/",
      "title": "Koa 中文网",
      "tags": [
        "后端",
        "Node"
      ],
      "starred": false,
      "domain": "koajs.com.cn",
      "createdAt": "2026-09-17T23:37:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 81
    },
    {
      "id": "bm_f6d3af08-23d2-4d6d-a86f-ff35bbd31a61",
      "url": "https://arco.design/vue/docs/start",
      "title": "Arco Design Vue",
      "tags": [
        "前端",
        "组件库"
      ],
      "starred": false,
      "domain": "arco.design",
      "createdAt": "2026-09-17T23:36:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 82
    },
    {
      "id": "bm_f134298d-d1bc-464b-8307-ae9595c79da5",
      "url": "https://c.runoob.com/",
      "title": "菜鸟工具",
      "tags": [
        "开发工具"
      ],
      "starred": false,
      "domain": "c.runoob.com",
      "createdAt": "2026-09-17T23:34:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 83
    },
    {
      "id": "bm_e2f0e776-7895-4ea3-aa47-2ff227b46bdf",
      "url": "https://visualgo.net/zh",
      "title": "VisuAlgo 算法可视化",
      "tags": [
        "算法",
        "可视化"
      ],
      "starred": false,
      "domain": "visualgo.net",
      "createdAt": "2026-09-17T23:33:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 84
    },
    {
      "id": "bm_0294cdea-cc93-4bbf-8124-9905f93ce4c8",
      "url": "https://echarts.apache.org/zh/index.html",
      "title": "Apache ECharts",
      "tags": [
        "前端",
        "图表"
      ],
      "starred": false,
      "domain": "echarts.apache.org",
      "createdAt": "2026-09-17T23:32:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 85
    },
    {
      "id": "bm_6b4370ec-c812-4b23-a3e4-e63a5f2a047f",
      "url": "https://www.iconfont.cn/manage/index?spm=a313x.7781069.1998910419.12&manage_type=myprojects&projectId=1589005&keyword=&project_type=&page=",
      "title": "iconfont 阿里图标库",
      "tags": [
        "前端",
        "图标"
      ],
      "starred": false,
      "domain": "iconfont.cn",
      "createdAt": "2026-09-17T23:31:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 86
    },
    {
      "id": "bm_f6f27f8b-2e28-40e7-8316-eddd394809c9",
      "url": "https://www.zhipin.com/?ka=header-home-logo",
      "title": "BOSS 直聘",
      "tags": [
        "招聘"
      ],
      "starred": false,
      "domain": "zhipin.com",
      "createdAt": "2026-09-17T23:30:00.000Z",
      "updatedAt": "2026-09-20T02:31:05.008Z",
      "collectionId": "col_social",
      "order": 87
    },
    {
      "id": "bm_ebc535cf-fcfe-44cc-b2bc-85ac51ae5e9e",
      "url": "https://qiankun.umijs.org/zh/guide/getting-started",
      "title": "qiankun 微前端",
      "tags": [
        "前端",
        "微前端"
      ],
      "starred": false,
      "domain": "qiankun.umijs.org",
      "createdAt": "2026-09-17T23:25:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 88
    },
    {
      "id": "bm_d82f3424-9a60-4aaa-8ef0-ad7be9397ed0",
      "url": "http://mockjs.com/",
      "title": "Mock.js",
      "tags": [
        "前端",
        "Mock"
      ],
      "starred": false,
      "domain": "mockjs.com",
      "createdAt": "2026-09-17T23:24:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 89
    },
    {
      "id": "bm_74131ea1-cf47-4c49-b160-584922e6d480",
      "url": "https://tinypng.com",
      "title": "TinyPNG 图片压缩",
      "tags": [
        "开发工具",
        "图片"
      ],
      "starred": false,
      "domain": "tinypng.com",
      "createdAt": "2026-09-17T23:22:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 90
    },
    {
      "id": "bm_31459edb-bec7-4e4f-8a85-0007cb35e5e0",
      "url": "https://www.lodashjs.com/",
      "title": "Lodash.js",
      "tags": [
        "前端",
        "JavaScript"
      ],
      "starred": false,
      "domain": "lodashjs.com",
      "createdAt": "2026-09-17T23:20:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 91
    },
    {
      "id": "bm_fb7d2a7f-6c5b-4edd-b32d-3cc2678de557",
      "url": "https://ant.design/index-cn",
      "title": "Ant Design",
      "tags": [
        "前端",
        "组件库",
        "React"
      ],
      "starred": false,
      "domain": "ant.design",
      "createdAt": "2026-09-17T23:19:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_dev",
      "order": 92
    },
    {
      "id": "bm_85fef999-b1e9-4f4e-bfd5-133bbc597835",
      "url": "https://oms.hngtrust.com/#/flowCenter/flowDone",
      "title": "报工系统",
      "tags": [
        "工作后台",
        "报工"
      ],
      "starred": false,
      "domain": "oms.hngtrust.com",
      "createdAt": "2026-09-17T23:18:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 93
    },
    {
      "id": "bm_b6bf7621-1883-43a3-b468-fb922a2f0330",
      "url": "https://mail.northking.net/webmail/se/mail/m.do?r=fde9665d5ac713c-40309&sid=00RC1sgsP0FENVcPb97TGACoo1rdp37K000001",
      "title": "京北方邮箱",
      "tags": [
        "工作后台",
        "邮箱"
      ],
      "starred": false,
      "domain": "mail.northking.net",
      "createdAt": "2026-09-17T23:17:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 94
    },
    {
      "id": "bm_364568b0-ca06-4a19-ae01-f21e6e1651fa",
      "url": "https://edm.northking.net/#/workbench/index",
      "title": "京北方 EDM",
      "tags": [
        "工作后台",
        "邮箱"
      ],
      "starred": false,
      "domain": "edm.northking.net",
      "createdAt": "2026-09-17T23:16:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 95
    },
    {
      "id": "bm_4c901965-9067-4374-a434-a2fcf28689bf",
      "url": "http://10.213.151.249/ui/#/profile/improvement",
      "title": "测试堡垒机",
      "tags": [
        "工作后台",
        "堡垒机"
      ],
      "starred": false,
      "domain": "10.213.151.249",
      "createdAt": "2026-09-17T23:15:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 96
    },
    {
      "id": "bm_b60cd6da-32b3-4fbd-acb6-1ba7a690ee6f",
      "url": "https://10.213.118.247/ui/#/workbench/home",
      "title": "生产堡垒机",
      "tags": [
        "工作后台",
        "堡垒机"
      ],
      "starred": false,
      "domain": "10.213.118.247",
      "createdAt": "2026-09-17T23:14:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 97
    },
    {
      "id": "bm_4d6a1e6f-c79d-4f5d-81da-b573c7632ca6",
      "url": "https://gitlab.hngtrust.com",
      "title": "内部 GitLab",
      "tags": [
        "工作后台",
        "代码托管"
      ],
      "starred": false,
      "domain": "gitlab.hngtrust.com",
      "createdAt": "2026-09-17T23:13:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 98
    },
    {
      "id": "bm_d5c74955-da4e-4e6a-8bc4-4a89fcb367e0",
      "url": "http://10.213.120.58:8081/tosignserver/",
      "title": "金格测试",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "10.213.120.58",
      "createdAt": "2026-09-17T23:12:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 99
    },
    {
      "id": "bm_0ed3cc5e-2df8-489e-a2be-e2ffc4cc8874",
      "url": "https://phtsim.hngtrust.com/cmf/",
      "title": "老普惠通（测试）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "phtsim.hngtrust.com",
      "createdAt": "2026-09-17T23:11:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 100
    },
    {
      "id": "bm_cfacac6c-d52d-4c6e-84b0-b76edd3072b4",
      "url": "https://pht.hngtrust.com/admin/",
      "title": "普惠通（生产）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "pht.hngtrust.com",
      "createdAt": "2026-09-17T23:10:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 101
    },
    {
      "id": "bm_4e439e0b-9ee3-409f-9402-1580d1921c6e",
      "url": "https://www.figma.com/design/u0GDzTGoC5z9ows66poYVy/AI%E5%9F%B9%E8%AE%AD%E7%B3%BB%E7%BB%9F?node-id=0-1&t=QaygcOzblXiDDDtZ-0",
      "title": "Figma · AI 培训系统",
      "tags": [
        "Figma",
        "UI"
      ],
      "starred": false,
      "domain": "figma.com",
      "createdAt": "2026-09-17T23:09:00.000Z",
      "updatedAt": "2026-09-20T02:37:52.579Z",
      "collectionId": "col_work",
      "order": 102
    },
    {
      "id": "bm_a034f60d-4bb1-47bc-89c1-f133dac4caae",
      "url": "http://10.213.126.104/zhuque+/document",
      "title": "朱雀框架文档",
      "tags": [
        "工作后台",
        "文档"
      ],
      "starred": false,
      "domain": "10.213.126.104",
      "createdAt": "2026-09-17T23:08:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 103
    },
    {
      "id": "bm_5cad0660-94ff-42e9-8dbc-56101f93f1f5",
      "url": "https://pmssim.hngtrust.com/pms",
      "title": "PMS（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "pmssim.hngtrust.com",
      "createdAt": "2026-09-17T23:07:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 104
    },
    {
      "id": "bm_c19d9ee5-f74a-451f-ace4-15c109684e18",
      "url": "http://10.213.120.27:8080/jenkins/view/TSTC-%E4%BA%A4%E6%98%93%E6%9F%9C%E5%8F%B0",
      "title": "Jenkins 交易柜台",
      "tags": [
        "Jenkins"
      ],
      "starred": false,
      "domain": "10.213.120.27",
      "createdAt": "2026-09-17T23:06:00.000Z",
      "updatedAt": "2026-09-20T06:08:48.231Z",
      "collectionId": "col_work",
      "order": 105
    },
    {
      "id": "bm_0fa77182-54ef-4695-8e82-ea438dd6a2b5",
      "url": "http://10.213.151.1:8080/jenkins/view/uat-sim%E7%8E%AF%E5%A2%83",
      "title": "Jenkins门户",
      "tags": [
        "Jenkins"
      ],
      "starred": false,
      "domain": "10.213.151.1",
      "createdAt": "2026-09-17T23:05:00.000Z",
      "updatedAt": "2026-09-20T06:08:58.839Z",
      "collectionId": "col_work",
      "order": 106
    },
    {
      "id": "bm_cc6c36f2-2101-44ce-ab67-0a8d3a9d733a",
      "url": "http://10.213.103.82:8080/jenkins/login",
      "title": "Jenkins · 生产",
      "tags": [
        "Jenkins",
        "CI"
      ],
      "starred": false,
      "domain": "10.213.103.82",
      "createdAt": "2026-09-17T23:04:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 107
    },
    {
      "id": "bm_3b79f54d-3d48-49dd-a011-d34f7c7f5814",
      "url": "https://wiki.hngtrust.com/pages/viewpage.action?pageId=81203735",
      "title": "内部 Wiki",
      "tags": [
        "工作后台",
        "Wiki"
      ],
      "starred": false,
      "domain": "wiki.hngtrust.com",
      "createdAt": "2026-09-17T23:03:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 108
    },
    {
      "id": "bm_5ece2925-2160-47d6-b2e4-254b6f43b16b",
      "url": "https://i.hngtrust.com:1443/",
      "title": "VPN",
      "tags": [
        "VPN"
      ],
      "starred": false,
      "domain": "i.hngtrust.com",
      "createdAt": "2026-09-17T23:02:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 109
    },
    {
      "id": "bm_2d8c0529-749d-47e5-926f-3691cf77aa21",
      "url": "https://lanhuapp.com/web/#/item/project/stage?pid=fc239b8e-bbcd-436f-9b11-6c95e65a7880&image_id=ccad6889-baf8-4b51-9b27-48b5ecd96606&tid=10fda9dd-196d-4c64-a625-7f9d3f50541a",
      "title": "蓝湖",
      "tags": [
        "设计协作"
      ],
      "starred": false,
      "domain": "lanhuapp.com",
      "createdAt": "2026-09-17T23:01:00.000Z",
      "updatedAt": "2026-09-20T02:37:52.579Z",
      "collectionId": "col_work",
      "order": 110
    },
    {
      "id": "bm_599a3b26-07a5-4552-9398-bf611f475ab3",
      "url": "https://cjb-sim.hngtrust.com/admin/",
      "title": "传家宝（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "cjb-sim.hngtrust.com",
      "createdAt": "2026-09-17T22:59:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 111
    },
    {
      "id": "bm_3edc195f-ba5e-40c5-9a08-0cb95e8dab28",
      "url": "https://dualsim.hngtrust.com/web-huaneng-doublerecording",
      "title": "老财富宝（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "dualsim.hngtrust.com",
      "createdAt": "2026-09-17T22:58:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 112
    },
    {
      "id": "bm_b887d21d-1769-4d2b-95df-4b437750f1d8",
      "url": "https://dualsim.hngtrust.com/tstc-ui/#/login",
      "title": "柜台（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "dualsim.hngtrust.com",
      "createdAt": "2026-09-17T22:57:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 113
    },
    {
      "id": "bm_9d07845a-1e36-4a57-9ad2-ca43f019ec6a",
      "url": "https://dualdemo.hngtrust.com/tstc-ui/#/login",
      "title": "柜台（Demo）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "dualdemo.hngtrust.com",
      "createdAt": "2026-09-17T22:56:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 114
    },
    {
      "id": "bm_61f08f32-8685-4ea5-a3f2-cada066b2997",
      "url": "https://smartsales.hngtrust.com/tstc-ui/#/login",
      "title": "柜台生产",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "smartsales.hngtrust.com",
      "createdAt": "2026-09-17T22:55:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 115
    },
    {
      "id": "bm_a6f4b2ab-b341-4d3b-b560-70a18f526ee3",
      "url": "https://portal-sim.hngtrust.com/portal-admin/#/login",
      "title": "门户管理（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "portal-sim.hngtrust.com",
      "createdAt": "2026-09-17T22:54:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 116
    },
    {
      "id": "bm_80fb3f97-7e65-46ed-8611-4396787a4e54",
      "url": "https://sim.hngtrust.com/portal-web/web/index",
      "title": "门户前台（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "sim.hngtrust.com",
      "createdAt": "2026-09-17T22:53:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 117
    },
    {
      "id": "bm_5c0869bf-5c0a-40d1-a727-8fdf422a0c93",
      "url": "https://portal-sim.hngtrust.com/cfb/login",
      "title": "门户项目（SIM）",
      "tags": [
        "工作后台"
      ],
      "starred": false,
      "domain": "portal-sim.hngtrust.com",
      "createdAt": "2026-09-17T22:52:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_work",
      "order": 118
    },
    {
      "id": "bm_c7c07ab7-f0d1-45ec-8ef5-b9187ff29c8a",
      "url": "http://sports.qq.com/nba/",
      "title": "腾讯 NBA",
      "tags": [
        "NBA",
        "体育"
      ],
      "starred": false,
      "domain": "sports.qq.com",
      "createdAt": "2026-09-17T22:51:00.000Z",
      "updatedAt": "2026-09-20T02:29:58.169Z",
      "collectionId": "col_social",
      "order": 119
    },
    {
      "id": "bm_463390d1-6e7b-4bae-adfa-de83e4eb3eda",
      "url": "https://www.chajianxw.com/",
      "title": "浏览器插件网",
      "tags": [
        "浏览器插件",
        "工具"
      ],
      "starred": false,
      "domain": "chajianxw.com",
      "createdAt": "2026-09-17T22:50:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 120
    },
    {
      "id": "bm_83899fde-e88d-45b8-986d-2fe92a78909b",
      "url": "https://www.macat.vip/",
      "title": "马克喵",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "macat.vip",
      "createdAt": "2026-09-17T22:49:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 121
    },
    {
      "id": "bm_5e4d14a9-0d2c-4d56-9754-8e95bbcc95dd",
      "url": "https://www.mac163.cn/",
      "title": "小番茄盒子",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "mac163.cn",
      "createdAt": "2026-09-17T22:48:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 122
    },
    {
      "id": "bm_4b05ba0e-98b1-4523-bd36-01e887c2ca64",
      "url": "https://macwk.cn/",
      "title": "MacWk",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "macwk.cn",
      "createdAt": "2026-09-17T22:47:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 123
    },
    {
      "id": "bm_039c36a5-5071-4807-b8d2-f92a032288a0",
      "url": "https://www.better365.cn/",
      "title": "Better365",
      "tags": [
        "Mac软件",
        "效率"
      ],
      "starred": false,
      "domain": "better365.cn",
      "createdAt": "2026-09-17T22:46:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 124
    },
    {
      "id": "bm_33c10bce-8826-42f1-bc26-e807b5d6adc7",
      "url": "https://5imac.net/",
      "title": "5iMac",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "5imac.net",
      "createdAt": "2026-09-17T22:45:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 125
    },
    {
      "id": "bm_72826775-be00-4b08-92f8-976287414545",
      "url": "https://macked.app",
      "title": "MacKed",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "macked.app",
      "createdAt": "2026-09-17T22:44:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 126
    },
    {
      "id": "bm_70af9b00-8c01-4ec3-a5fa-5e1f25360f20",
      "url": "https://xclient.info/",
      "title": "XClient",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "xclient.info",
      "createdAt": "2026-09-17T22:43:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 127
    },
    {
      "id": "bm_8a9e4c98-61d9-4779-aeba-a761f56e030a",
      "url": "https://macpa.cn/",
      "title": "MACPA",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "macpa.cn",
      "createdAt": "2026-09-17T22:42:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 128
    },
    {
      "id": "bm_a7118dc9-27d9-4f36-81d9-95ae41327c13",
      "url": "https://www.seemac.cn/",
      "title": "SeeMac",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "seemac.cn",
      "createdAt": "2026-09-17T22:41:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 129
    },
    {
      "id": "bm_ba0b208a-76c4-42a5-a7f6-1688430dea3a",
      "url": "https://www.wuji7.com/",
      "title": "无极影院",
      "tags": [
        "影视"
      ],
      "starred": false,
      "domain": "wuji7.com",
      "createdAt": "2026-09-17T22:40:00.000Z",
      "updatedAt": "2026-09-20T02:34:29.313Z",
      "collectionId": "col_shop",
      "order": 130
    },
    {
      "id": "bm_38e7e900-1fb3-4167-955e-2773590b77e5",
      "url": "https://www.660f.com/",
      "title": "660 影视",
      "tags": [
        "影视"
      ],
      "starred": false,
      "domain": "660f.com",
      "createdAt": "2026-09-17T22:39:00.000Z",
      "updatedAt": "2026-09-20T02:34:29.313Z",
      "collectionId": "col_shop",
      "order": 131
    },
    {
      "id": "bm_c0634d75-2eb6-494e-a6e9-3055c43cde6b",
      "url": "https://www.ghxi.com",
      "title": "果核剥壳",
      "tags": [
        "软件资源"
      ],
      "starred": false,
      "domain": "ghxi.com",
      "createdAt": "2026-09-17T22:38:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 132
    },
    {
      "id": "bm_9ed736e6-4d01-49b5-b983-3e4791aa6311",
      "url": "https://www.maclub.net",
      "title": "Mac 俱乐部",
      "tags": [
        "Mac软件"
      ],
      "starred": false,
      "domain": "maclub.net",
      "createdAt": "2026-09-17T22:37:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 133
    },
    {
      "id": "bm_52f8995b-7c41-4f91-a525-156cfcccf4c2",
      "url": "https://ygpy.net",
      "title": "机场收集",
      "tags": [
        "机场",
        "梯子"
      ],
      "starred": false,
      "domain": "ygpy.net",
      "createdAt": "2026-09-17T22:36:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 134
    },
    {
      "id": "bm_e15ab312-1c9c-4ec3-83d7-56ccee0ecdc5",
      "url": "https://mag.96533.com:8243/personService/index.html#/login/UserLogin",
      "title": "粤卡通",
      "tags": [
        "出行",
        "ETC"
      ],
      "starred": false,
      "domain": "mag.96533.com",
      "createdAt": "2026-09-17T22:34:00.000Z",
      "updatedAt": "2026-09-20T02:33:23.643Z",
      "collectionId": "col_shop",
      "order": 135
    },
    {
      "id": "bm_f73d4920-860e-403a-8045-d822fe11fdb7",
      "url": "https://www.libvio.cam",
      "title": "LIBVIO 影视",
      "tags": [
        "影视"
      ],
      "starred": false,
      "domain": "libvio.cam",
      "createdAt": "2026-09-17T22:33:00.000Z",
      "updatedAt": "2026-09-20T02:34:29.313Z",
      "collectionId": "col_shop",
      "order": 136
    },
    {
      "id": "bm_bb78abb1-6794-4285-a2fe-9c70566863af",
      "url": "https://www.hhkan0.com",
      "title": "红花影视",
      "tags": [
        "影视"
      ],
      "starred": false,
      "domain": "hhkan0.com",
      "createdAt": "2026-09-17T22:32:00.000Z",
      "updatedAt": "2026-09-20T02:34:29.313Z",
      "collectionId": "col_shop",
      "order": 137
    },
    {
      "id": "bm_f9b0ff0e-3650-447b-8b73-4c7b144caa0a",
      "url": "https://一元机场.ink/#/dashboard",
      "title": "一元机场",
      "tags": [
        "机场",
        "梯子"
      ],
      "starred": false,
      "domain": "xn--4gq62f52gdss.ink",
      "createdAt": "2026-09-17T22:31:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 138
    },
    {
      "id": "bm_38ee1950-723b-4ac4-8a68-7bc0090acf89",
      "url": "https://两元店.com/#/dashboard",
      "title": "两元店",
      "tags": [
        "机场",
        "梯子"
      ],
      "starred": false,
      "domain": "xn--5hqx9equq.com",
      "createdAt": "2026-09-17T22:30:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 139
    },
    {
      "id": "bm_47a94c25-b19d-4ec0-9335-44745e8298b8",
      "url": "https://gw-1.三毛机场.com/#/plan",
      "title": "三毛机场",
      "tags": [
        "机场",
        "梯子"
      ],
      "starred": false,
      "domain": "gw-1.xn--ehqx7tcnnope.com",
      "createdAt": "2026-09-17T22:29:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 140
    },
    {
      "id": "bm_acbded71-1169-4ad9-93f3-c23951229b91",
      "url": "https://三毛导航.com",
      "title": "三毛机场导航",
      "tags": [
        "机场",
        "导航"
      ],
      "starred": false,
      "domain": "xn--ehqx35aimmzwv.com",
      "createdAt": "2026-09-17T22:28:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 141
    },
    {
      "id": "bm_0a382101-b639-45b2-9dc7-7b40ef4acb02",
      "url": "https://良心云.com/#/dashboard",
      "title": "良心云",
      "tags": [
        "机场",
        "梯子"
      ],
      "starred": false,
      "domain": "xn--9kqz23b19z.com",
      "createdAt": "2026-09-17T22:27:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 142
    },
    {
      "id": "bm_71cddd61-efb9-45a1-a728-3150f1699eac",
      "url": "https://www.suyou.org",
      "title": "速游",
      "tags": [
        "机场",
        "梯子"
      ],
      "starred": false,
      "domain": "suyou.org",
      "createdAt": "2026-09-17T22:26:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 143
    },
    {
      "id": "bm_e07fc300-18de-4d20-acd2-8f350bb8f757",
      "url": "https://chatgpt.com",
      "title": "ChatGPT",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "chatgpt.com",
      "createdAt": "2026-09-17T22:25:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 144
    },
    {
      "id": "bm_8f91939d-2bc3-4d06-9c95-dfed77860c40",
      "url": "https://www.youtube.com/",
      "title": "YouTube",
      "tags": [
        "视频"
      ],
      "starred": false,
      "domain": "youtube.com",
      "createdAt": "2026-09-17T22:24:00.000Z",
      "updatedAt": "2026-09-20T02:34:45.563Z",
      "collectionId": "col_life",
      "order": 145
    },
    {
      "id": "bm_bcd049f4-7e4f-4862-aee3-83728f185fd2",
      "url": "https://gemini.google.com/",
      "title": "Gemini",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "gemini.google.com",
      "createdAt": "2026-09-17T22:23:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 146
    },
    {
      "id": "bm_3d8a3f2f-b9aa-48f2-868c-e81662461b70",
      "url": "https://jc.swk69978.com/doc/189/",
      "title": "Apple 账号共享",
      "tags": [
        "账号"
      ],
      "starred": false,
      "domain": "jc.swk69978.com",
      "createdAt": "2026-09-17T22:22:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 147
    },
    {
      "id": "bm_f77fced0-fba0-49ab-a400-8d7e77a2542a",
      "url": "https://www.instagram.com/",
      "title": "Instagram",
      "tags": [
        "社交",
        "图片"
      ],
      "starred": false,
      "domain": "instagram.com",
      "createdAt": "2026-09-17T22:21:00.000Z",
      "updatedAt": "2026-09-20T02:34:45.563Z",
      "collectionId": "col_life",
      "order": 148
    },
    {
      "id": "bm_002e87ef-eaff-4386-9215-beeacf2c094d",
      "url": "https://x.com",
      "title": "X (Twitter)",
      "tags": [
        "社交"
      ],
      "starred": false,
      "domain": "x.com",
      "createdAt": "2026-09-17T22:20:00.000Z",
      "updatedAt": "2026-09-20T02:34:45.563Z",
      "collectionId": "col_life",
      "order": 149
    },
    {
      "id": "bm_1b721fec-4607-477b-9135-875f4a5e31cb",
      "url": "https://openai.com/zh-Hans-CN/",
      "title": "OpenAI",
      "tags": [
        "大模型"
      ],
      "starred": false,
      "domain": "openai.com",
      "createdAt": "2026-09-17T22:19:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 150
    },
    {
      "id": "bm_dbf75dcb-fda7-4e56-8d53-04cba9d1e544",
      "url": "https://platform.agnes-ai.com/settings/apiKeys",
      "title": "Agnes AI",
      "tags": [
        "大模型",
        "API"
      ],
      "starred": false,
      "domain": "platform.agnes-ai.com",
      "createdAt": "2026-09-17T22:18:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_ai",
      "order": 151
    },
    {
      "id": "bm_9ea42536-b270-4e0b-a6f8-c76fd5c68eff",
      "url": "https://twitsave.com/en",
      "title": "X 视频下载",
      "tags": [
        "下载工具"
      ],
      "starred": false,
      "domain": "twitsave.com",
      "createdAt": "2026-09-17T22:17:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 152
    },
    {
      "id": "bm_fd926000-5e26-42b3-8b4f-338f84b30f45",
      "url": "https://v21.www-y2mate.com",
      "title": "YouTube 视频下载",
      "tags": [
        "下载工具"
      ],
      "starred": false,
      "domain": "v21.www-y2mate.com",
      "createdAt": "2026-09-17T22:16:00.000Z",
      "updatedAt": "2026-09-18T07:40:18.183Z",
      "collectionId": "col_life",
      "order": 153
    }
  ]
}
