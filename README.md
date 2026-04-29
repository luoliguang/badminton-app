# 羽毛球小程序 Quickstart

这是一个基于微信云开发的羽毛球小程序项目，包含小程序前端、云函数和共享逻辑代码。

## 项目结构

- `miniprogram/`：小程序前端页面、样式、工具和类型定义
- `cloudfunctions/`：云函数目录，每个功能一个独立函数
- `common/`：前后端共享的基础代码
- `project.config.json`：小程序项目配置
- `project.private.config.json`：本地私有配置

## 当前功能

- 首页统计与最近对局
- 房间创建与加入
- 实时计分
- 比赛结算与结果展示
- 用户资料与战绩统计

## 开发提示

- 主要业务逻辑在 `miniprogram/utils/gameLogic.ts` 和对应的云函数中复用
- 页面入口在 `miniprogram/pages/`
- 云函数入口在 `cloudfunctions/*/index.js`
- 如果要调整数据结构，优先查看 `miniprogram/types/index.ts` 和 `DEPENDENCY_MAP.md`

## 参考文档

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- `PLANNING.md`
- `DEPENDENCY_MAP.md`

