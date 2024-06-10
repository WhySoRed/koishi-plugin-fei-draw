# koishi-plugin-fei-draw

[![npm](https://img.shields.io/npm/v/koishi-plugin-fei-draw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-fei-draw)

fei的自定义抽牌~

本插件是模仿了dice!的".draw"功能的自制抽牌插件<br>
牌堆的json文件沿用了dice!的格式<br>
...其实还兼容了yml格式)<br>

## 牌堆的文件格式
<details>
<summary>json</summary>
<pre>
{
  "牌堆名称1": [
    "内容1",
    "内容2",
    ...
  ],
  "牌堆名称2": [
    "内容1",
    "内容2",
    ...
  ],
  "_备注": ["..."]
}
</pre>
</details>
<details>
<summary>yml</summary>
<pre>
牌堆名称1:
  - 内容1
  - 内容2
  - ...
牌堆名称2:
  - 内容1
  - 内容2
  - ...
_备注:
  - "..."
</details>

## 目前支持的插值内容:

插值格式 | 效果 | 示例
:--- | :--- | :---
`{%牌堆名称}` | 从指定的牌堆中抽取一张牌(会自动忽略两边的空格) | `一张{%_随机颜色}的{%卡片} `
`{self}` | 机器人的群名称或昵称 | `{self}疑惑地看着你`
`{nick}` | 发送者的群昵称或昵称 | `{self}疑惑地看着{nick}`
`<img src="..."/>` | html标签格式的图片(koishi本身支持) | `<img src="https://koishi.chat/logo.png"/>`
`[CQ:image,file=...]` | cq码格式的图片(手动转换成img进行了支持) | `[CQ:image,file=https://koishi.chat/logo.png]`
`<message/>` | 消息分割 | `我想想...<message/>...我想不出来了`

...以及其他能够利用 `session.send()` 发送的koishi[消息元素](https://koishi.chat/zh-CN/api/message/elements.html)

## 目前计划

- [] 添加对骰子表达式的支持

## 作者注

为了避免用户自定义内容导致的滥用，预计不会支持自定义牌堆的功能

## 更新日志

### 0.0.5

- 支持在插件配置页面查看当前装载的牌堆了
- 添加了一个带有图片的牌堆示例

### 0.0.4

- 支持了yml格式~感觉真不错
- 添加了一个yml格式的牌堆示例

### 0.0.3

- 添加了对{self}和{nick}的支持

### 0.0.2

- 完善了基本功能,允许从本地选择牌堆文件夹

### 0.0.1

- 初次发布