export const usageTemplate = (
  currentDeckInfo?: Map<string,string>,
  usageWarning?: string
) => {

  if (usageWarning) {
    usageWarning = `
    <div class="usage-warning">
      <div class="jump-warning">❗</div>${usageWarning}
    </div>`;
  }
  else {
    usageWarning = "";
  }

  let currentDeckInfoString = "<table><tr><th>牌堆</th><th>来源</th></tr>";
  if (currentDeckInfo) {
    currentDeckInfo.forEach((value, key) => {
      currentDeckInfoString += `<tr><td>${key}</td><td>${value}</td></tr>`;
    })
  }
  currentDeckInfoString += "</table>";


  return `
<div>
${usageWarning}
<style>
  .usage-warning {
    color: #de3163;
    font-weight: bold;
    border: 1px dashed #de3163;
    border-radius: 5px;
    padding: 20px;
    display: inline-block;
    animation: usage-warning 3s infinite;
  }
  .jump-warning {
    display: inline-block;
    animation: jump-warning 3s infinite;
  }
  @keyframes usage-warning {
    0% {
      border-color: #de3163;
    }
    50% {
      border-color: #f5a9bc;
    }
    100% {
      border-color: #de3163;
    }
  }
  @keyframes jump-warning {
    0% {
      transform: translateY(0);
    }
    10% {
      transform: translateY(-5px);
    }
    20% {
      transform: translateY(0);
    }
  }
</style>
</div>

本插件是模仿了dice!的".draw"功能的自制抽牌插件<br>
牌堆的json文件沿用了dice!的格式<br>
...其实还兼容了yml格式)<br>

关于目前支持的牌堆格式请查看[插件主页](https://github.com/WhySoRed/koishi-plugin-fei-draw)

**注意:更新牌堆后请重载配置**

## 当前已加载的牌堆列表
<details>
<summary>点击展开</summary>
${currentDeckInfoString}
</details>
`;
};
