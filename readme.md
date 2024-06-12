# koishi-plugin-fei-draw

[![npm](https://img.shields.io/npm/v/koishi-plugin-fei-draw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-fei-draw)

fei的自定义抽牌~

本插件是模仿了dice!的".draw"功能的自制抽牌插件<br>
牌堆的json文件沿用了dice!的格式<br>
...还兼容了yml格式)<br>

## 牌堆的json文件格式
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
</pre>
</details>
`_备注` 是可选的, 会被忽略

## 目前支持的插值内容:

插值格式 | 效果 | 示例
:--- | :--- | :---
`{%牌堆名称}` | 从指定的牌堆中抽取一张牌(会自动忽略两边的空格) | `一张{%_随机颜色}的{%卡片} `
`{self}` | 机器人的群名称或昵称 | `{self}疑惑地看着你`
`{nick}` | 发送者的群昵称或昵称 | `{self}疑惑地看着{nick}`
`<img src="..."/>` | html标签格式的图片(koishi本身支持) | `<img src="https://koishi.chat/logo.png"/>`
`[CQ:image,file=...]` | cq码格式的图片(手动转换成img进行了支持) | `[CQ:image,file=https://koishi.chat/logo.png]`
`<br>` `\n` | 换行 | `我看看...<br>是这样吗？`
`<message/>` | 消息分割 | `我想想...<message/>...我想不出来了`
`[骰子表达式]` | 骰子表达式[Dicexp](https://github.com/umajho/dicexp) | `[1d6+1]`

...以及其他能够利用 `session.send()` 发送的koishi[消息元素](https://koishi.chat/zh-CN/api/message/elements.html)

## 未来计划

- [] 加入对权重语法的支持

## 作者声明

为避免被滥用，本插件的更新计划不会包含用户通过指令自定义牌堆的功能

## 更新日志

### 0.0.6

- 支持了骰子表达式

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