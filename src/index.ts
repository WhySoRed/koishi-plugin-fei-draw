import { Context, Schema } from "koishi";
import * as fs from "fs";
import * as path from "path";

export const name = "fei-draw";
export interface Config {
  deckPath: string;
}

export const Config: Schema<Config> = Schema.object({
  deckPath: Schema.path({ allowCreate: true }).description("牌堆文件夹路径"),
});

export function apply(ctx: Context, config: Config) {
  const deckList: { [deckName: string]: string[] } = {};
  ctx.on("ready", () => {
    const directoryPath = config.deckPath || path.join(__dirname, "deck");
    fs.readdirSync(directoryPath).forEach((file) => {
      if (file.endsWith(".json")) {
        const jsonData = JSON.parse(
          fs.readFileSync(`${directoryPath}/${file}`, "utf8")
        );
        for (let key in jsonData) {
          if (key === "_备注") continue;
          if (key in deckList) {
            console.log(`牌堆 ${key} 出现重复，已被覆盖。`);
          }
          deckList[key] = jsonData[key];
        }
      }
    });

    if (Object.keys(deckList).length === 0) {
      throw new Error("未找到任何牌堆，请检查牌堆路径是否正确。");
    }
  });

  function draw(
    curDeckName: string,
    curDeckList: { [curDeckName: string]: string[] }
  ): string {
    if (!curDeckList[curDeckName]) {
      throw new Error(`牌堆 ${curDeckName} 不存在`);
    } else {
      const result =
      curDeckList[curDeckName][
          Math.floor(Math.random() * curDeckList[curDeckName].length)
        ];
      if (/{%.*?}/.test(result)) {
        return result.replace(/{%(.*?)}/, (_, curDeckName) =>
          draw(curDeckName, curDeckList)
        );
      }
      return result;
    }
  }

  ctx.command("牌堆抽卡").action(async ({ session }, deck) => {
    try {
      return draw(deck, deckList);
    } catch (error) {
      return error.message;
    }
  });

  ctx.command("牌堆列表").action(async ({ session }) => {
    if (Object.keys(deckList).length === 0) {
      return "未找到任何牌堆，请检查牌堆路径是否正确。";
    }
    let result = "当前的牌堆列表：\n";
    const deckNameList = Object.keys(deckList)
      .map((deckName) => deckName)
      .filter((deckName) => !deckName.startsWith("_"));
    result += deckNameList.join(" / ");
    return result;
  });
}
