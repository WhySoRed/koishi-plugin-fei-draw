import { Context, Schema, Session, Random, h } from "koishi";
import { usageTemplate } from "./usage";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";

export const name = "fei-draw";
export interface Config {
  addAt: boolean;
  drawText: string;
  deckPath: string;
  imgPath: string;
  hiddenInternalDeck: boolean;
  multiBreak: boolean;
  multiForward: boolean;
  defaultRepeat: boolean;
  maxCount: number;
}

export const Config: Schema<Config> = Schema.object({
  addAt: Schema.boolean().default(true).description("是否@发送者"),
  drawText: Schema.string().default("你抽到了：").description("抽取结果的前缀"),
  maxCount: Schema.number().default(5).description("最大单次抽取数量"),
  hiddenInternalDeck: Schema.boolean()
    .default(false)
    .description("用户查看牌堆列表时隐藏名字前有_的牌堆"),
  multiBreak: Schema.boolean()
    .default(true)
    .description("多次抽取结果分为多次消息发送"),
  multiForward: Schema.boolean()
    .default(false)
    .description("对多次抽取结果使用合并转发（如果平台支持）"),
  defaultRepeat: Schema.boolean().default(true).description("默认开启重复抽取"),
  deckPath: Schema.path({ allowCreate: true }).description("牌堆文件夹路径"),
  imgPath: Schema.path({ allowCreate: true }).description("图片文件夹路径"),
});

export let usage = usageTemplate();

type deckData = { [deckName: string]: string[] };

async function getEvaluator() {
  const { Evaluator, asScope } = await import("@dicexp/naive-evaluator");
  const { functionScope, operatorScope } = await import(
    "@dicexp/naive-evaluator-builtins"
  );
  const topLevelScope = asScope([operatorScope, functionScope]);
  const dicexpEvaluator = new Evaluator({
    topLevelScope,
    randomSourceMaker: "xorshift7",
  });
  return dicexpEvaluator;
}

export async function apply(ctx: Context, config: Config) {
  const dicexpEvaluator = await getEvaluator();

  const dicexpEvaluate = (code: string, seed?: number) => {
    seed = seed || crypto.getRandomValues(new Uint32Array(1))[0]!;
    const result = dicexpEvaluator.evaluate(code, { execution: { seed } });
    if (result[0] === "ok") {
      const resultValue = result[1];
      return resultValue;
    } else if (result[0] === "error") {
      if (result[1] === "parse") {
        console.log("解析错误：");
      } else if (result[1] === "runtime") {
        console.log("执行错误：" + result[2].message);
      } else if (result[1] === "other") {
        console.log("其他错误：" + result[2].message);
      } else {
        throw new Error("impossible");
      }
    } else {
      throw new Error("impossible");
    }
  };

  const addAt = (session: Session) =>
    config.addAt ? h.at(session.userId) + " " : "";

  const deckList: { [deckName: string]: string[] } = {};

  function deckWarning(warning: string = "") {
    usage = usageTemplate(undefined, warning);
    throw new Error(warning);
  }

  function updateDeckList() {
    const directoryPath = config.deckPath || path.join(__dirname, "deck");
    if (!fs.existsSync(directoryPath)) {
      deckWarning("未找到牌堆文件夹，请检查牌堆路径是否正确。");
    }

    const deckNameMap = new Map<string, string>();

    function updateData(data: deckData, file: string) {
      for (let key in data) {
        if (!Array.isArray(data[key])) {
          deckWarning(`牌堆 ${file} 中的 ${key} 不是一个格式符合预期的数组`);
        }
        key.trim();
        if (key === "_备注") continue;
        if (deckNameMap.has(key)) {
          deckWarning(`与${deckNameMap.get(key)}中存在重复的牌堆名称 ${key}`);
        } else deckNameMap.set(key, file);
        deckList[key] = data[key];
      }
    }

    fs.readdirSync(directoryPath).forEach((file) => {
      if (file.endsWith(".json")) {
        const jsonData: deckData = JSON.parse(
          fs.readFileSync(`${directoryPath}/${file}`, "utf8")
        );
        updateData(jsonData, file);
      } else if (file.endsWith(".yml")) {
        const ymlData = yaml.load(
          fs.readFileSync(`${directoryPath}/${file}`, "utf8")
        ) as deckData;
        updateData(ymlData, file);
      }
    });

    for (let key in deckList) {
      if (!deckNameMap.has(key)) {
        delete deckList[key];
      }
    }

    if (Object.keys(deckList).length === 0) {
      deckWarning("未找到任何牌堆，请检查牌堆路径是否正确。");
    }
    usage = usageTemplate(deckNameMap);
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
    curDeckName = curDeckName.trim();
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

  // 非牌堆内容插值
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
    string = string.replace(/\[CQ:image,file=(.*?)]/g, "<img src='$1'/>");
    string = string.replace(/<img src="(.*?)"/g, (match, src) => {
      if (src.startsWith("http")) {
        return match;
      }
      return `<img src="${path.join(
        config.imgPath || __dirname + "/deck",
        src
      )}"`;
    });
    string = string.replace(/\[(.*?)]/g, (_, dicexp) => {
      return dicexpEvaluate(dicexp);
    })
    string = string.replace(/{self}/g, self);
    string = string.replace(/{nick}/g, nick);
    return string;
  }

  ctx
    .command("牌堆.抽卡", "[牌堆名] [次数?]")
    .action(async ({ session }, deck, count) => {
      let result = config.drawText;
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
            if (count && +count > 1) {
              result += config.multiBreak ? "<message/>" : "\n";
            }
            (result += draw(deck, deckList, count ? +count : undefined)),
              (result = await insertValue(result, session));
            if (count && +count > 1 && config.multiForward) {
              result = "<message forward>" + result + "</message>";
            }
          }
        } catch (error) {
          result = error.message;
        }
      }
      return addAt(session) + result;
    });

  ctx
    .command("牌堆.不重复", "[牌堆名] [次数]")
    .action(async ({ session }, deck, count) => {
      let result = config.drawText;
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
            if (count && +count > 1) {
              result += config.multiBreak ? "<message/>" : "\n";
            }
            result += draw(deck, deckList, count ? +count : undefined, false);
            result = await insertValue(result, session);
            if (count && +count > 1 && config.multiForward) {
              result = "<message forward>" + result + "</message>";
            }
          }
        } catch (error) {
          result = error.message;
        }
      }
      return addAt(session) + result;
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
    return addAt(session) + result;
  });
}
