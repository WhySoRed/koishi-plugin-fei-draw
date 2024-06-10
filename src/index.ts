import { Context, Schema, Session, Random } from "koishi";
import * as fs from "fs";
import * as path from "path";

export const name = "fei-draw";
export interface Config {
  deckPath: string;
  hiddenInternalDeck: boolean;
  multiBreak: boolean;
  multiForward: boolean;
  defaultRepeat: boolean;
  maxCount: number;
}

export const Config: Schema<Config> = Schema.object({
  maxCount: Schema.number().default(5).description("最大单次抽取数量"),
  hiddenInternalDeck: Schema.boolean()
    .default(false)
    .description("查看牌堆列表时隐藏名字前有_的牌堆"),
  multiBreak: Schema.boolean()
    .default(true)
    .description("多次抽取结果分为多次消息发送"),
  multiForward: Schema.boolean()
    .default(true)
    .description("对多次抽取结果使用合并转发（如果平台支持）"),
  defaultRepeat: Schema.boolean().default(true).description("默认开启重复抽取"),
  deckPath: Schema.path({ allowCreate: true }).description("牌堆文件夹路径"),
});

const usageTemplate = (usageWarning: string = "") => `
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

## 目前支持的插值格式:

插值格式 | 效果 | 示例
--- | --- | ---
{%牌堆名称} | 从指定的牌堆中抽取一张牌 | \`你抽到了一张{%_随机颜色}的{%卡片} \`
{self} | 机器人的群名称或昵称 | \`{self}疑惑地看着你\`
{nick} | 发送者的群昵称或昵称 | \`{self}疑惑地看着{nick}\`

`;

export let usage = usageTemplate();

export function apply(ctx: Context, config: Config) {
  const deckList: { [deckName: string]: string[] } = {};

  function updateDeckList() {
    const directoryPath = config.deckPath || path.join(__dirname, "deck");
    function warningCreater(warning: string = "") {
      return `<div class="usage-warning">
        <div class="jump-warning">❗</div>${warning}
      </div>`;
    }
    if (!fs.existsSync(directoryPath)) {
      usage = usageTemplate(
        warningCreater("未找到牌堆文件夹，请检查牌堆路径是否正确。")
      );
      throw new Error("未找到牌堆文件夹，请检查牌堆路径是否正确。");
    }
    const deckNameMap = new Map<string, string>();

    fs.readdirSync(directoryPath).forEach((file) => {
      if (file.endsWith(".json")) {
        const jsonData = JSON.parse(
          fs.readFileSync(`${directoryPath}/${file}`, "utf8")
        );
        for (let key in jsonData) {
          if (key === "_备注") continue;
          if (deckNameMap.has(key)) {
            usage = usageTemplate(
              warningCreater(
                `与${deckNameMap.get(key)}中存在重复的牌堆名称 ${key}`
              )
            );
            throw new Error(
              `${file}与${deckNameMap.get(key)}中存在重复的牌堆名称 ${key}`
            );
          } else deckNameMap.set(key, file);
          deckList[key] = jsonData[key];
        }
      }
    });

    for (let key in deckList) {
      if (!deckNameMap.has(key)) {
        delete deckList[key];
      }
    }

    if (Object.keys(deckList).length === 0) {
      throw new Error("未找到任何牌堆，请检查牌堆路径是否正确。");
    }
  }

  ctx.on("ready", () => {
    updateDeckList();
  });

  ctx.on("config", () => {
    updateDeckList();
  });

  function draw(
    curDeckName: string,
    curDeckList: { [curDeckName: string]: string[] },
    drawCount: number = 1,
    enableRepeat: boolean = config.defaultRepeat
  ): string {
    if (!curDeckList[curDeckName]) {
      throw new Error(`牌堆 ${curDeckName} 不存在`);
    } else if (isNaN(drawCount) || drawCount < 1) {
      throw new Error(`抽取数量必须为大于0的整数`);
    } else {
      if (!enableRepeat && drawCount > curDeckList[curDeckName].length) {
        throw new Error(`牌堆 ${curDeckName} 中的牌不足 ${drawCount} 张`);
      }
      const tempDeck = [...curDeckList[curDeckName]];

      const messageBreak = config.multiBreak ? "<message/>" : "\n";

      let result = "";
      if (enableRepeat) {
        let resultList: string[] = [];
        for (let i = 0; i < drawCount; i++) {
          resultList.push(Random.pick(tempDeck));
        }
        result = resultList.join(messageBreak);
      } else {
        result = Random.pick(tempDeck, drawCount).join(messageBreak);
      }
      if (/{%.*?}/.test(result)) {
        return result.replace(/{%(.*?)}/g, (_, curDeckName) =>
          draw(curDeckName, curDeckList)
        );
      }

      return result;
    }
  }

  async function insertValue(string: string, session: Session) {
    let self: string, nick: string;
    if (session.event.channel.type) {
      self = session.bot.user.name;
      nick = session.event.user.name;
    } else {
      self =
        (await session.bot.getGuildMember(session.guildId, session.bot.selfId))
          .nick ||
        session.bot.user.name ||
        session.bot.selfId;
      nick =
        (await session.bot.getGuildMember(session.guildId, session.userId))
          .nick ||
        session.event.user.name ||
        session.userId;
    }
    return string.replace(/{self}/g, self).replace(/{nick}/g, nick);
  }

  ctx
    .command("牌堆.抽卡", "[牌堆名] [次数?]")
    .action(async ({ session }, deck, count) => {
      let result = "";
      if (!deck) {
        result = `请指定牌堆名称。\n可以发送“${
          ctx.root.config.prefix +
          (ctx.$commander.get("牌堆 列表")?.alias || "牌堆 列表")
        }”查看当前可用的牌堆。`;
      } else {
        try {
          if (count && +count > config.maxCount) {
            result = `单次抽取数量不能超过 ${config.maxCount} 张。`;
          } else {
            (result = draw(deck, deckList, count ? +count : undefined)),
              (result = await insertValue(result, session));
            if (count && +count > 1 && config.multiForward) {
              result = "<message forward>" + result + "</message>";
            }
          }
        } catch (error) {
          result = error.message;
        }
      }
      return result;
    });

  ctx
    .command("牌堆.不重复", "[牌堆名] [次数]")
    .action(async ({ session }, deck, count) => {
      let result = "";
      if (!deck) {
        result = `请指定牌堆名称。\n可以发送“${
          ctx.root.config.prefix +
          (ctx.$commander.get("牌堆 列表")?.alias || "牌堆 列表")
        }”查看当前可用的牌堆。`;
      } else if (!count) {
        result = "不重复抽卡请指定抽取数量。";
      } else {
        try {
          if (count && +count > config.maxCount) {
            result = `单次抽取数量不能超过 ${config.maxCount} 张。`;
          } else {
            result = draw(deck, deckList, count ? +count : undefined, false);
            result = await insertValue(result, session);
            if (count && +count > 1 && config.multiForward) {
              result = "<message forward>" + result + "</message>";
            }
          }
        } catch (error) {
          result = error.message;
        }
      }
      return result;
    });

  ctx.command("牌堆.列表").action(async ({ session }) => {
    if (Object.keys(deckList).length === 0) {
      return "未找到任何牌堆，请检查牌堆路径是否正确。";
    }
    let result = "当前的牌堆列表：\n";
    const deckNameList = Object.keys(deckList)
      .map((deckName) => deckName)
      .filter(
        (deckName) => !(!config.hiddenInternalDeck && deckName.startsWith("_"))
      );
    result += deckNameList.join(" / ");
    return result;
  });
}
