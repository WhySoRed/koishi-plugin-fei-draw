# koishi-plugin-fei-draw

[![npm](https://img.shields.io/npm/v/koishi-plugin-fei-draw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-fei-draw)

fei的自定义抽牌~

本插件是模仿了dice!的".draw"功能的自制抽牌插件<br>
牌堆的json文件沿用了dice!的格式<br>
**更新牌堆后请重载配置**

## 牌堆的json文件格式
<details>
<summary>点击展开</summary>
<pre>
\`\`\`json
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
\`\`\`
</pre>
</details>

## 目前支持的插值内容:

插值格式 | 效果 | 示例
--- | --- | ---
{%牌堆名称} | 从指定的牌堆中抽取一张牌 | \`你抽到了一张{%_随机颜色}的{%卡片} \`
{self} | 机器人的群名称或昵称 | \`{self}疑惑地看着你\`
{nick} | 发送者的群昵称或昵称 | \`{self}疑惑地看着{nick}\`

