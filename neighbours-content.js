// Authored neighbourhood encounters. These are learning prompts, not speech
// recognition or automatic assessment. Models follow the resolved conversation.
const phrase = (zh, py, en) => ({ zh, py, en });
const card = (id, word, lines, visual, context) => ({ id, word, lines, visual, context });
const clonePhrase = (value) => value ? ({ zh: value.zh, py: value.py, en: value.en }) : null;

export const RESIDENTS = Object.freeze({
  xiaohe: Object.freeze({
    id: "xiaohe", zh: "小禾", en: "Xiaohe", py: "Xiǎohé",
    role: "Your restaurant neighbour", color: "#78937b",
    description: "I make room for everyone at the table.",
    greeting: phrase("你好！欢迎光临。", "Nǐ hǎo! Huānyíng guānglín.", "Hello! Welcome."),
  }),
  grandma: Object.freeze({
    id: "grandma", zh: "陈奶奶", en: "Grandma Chen", py: "Chén nǎinai",
    role: "Your teahouse neighbour", color: "#9b796b",
    description: "I pour tea, light the lanterns and bring neighbours together.",
    greeting: phrase("你好！", "Nǐ hǎo!", "Hello!"),
  }),
  lee: Object.freeze({
    id: "lee", zh: "李叔", en: "Uncle Lee", py: "Lǐ shū",
    role: "Your market neighbour", color: "#b58d4e",
    description: "I enjoy a friendly chat beside my little stall.",
    greeting: phrase("你好！看看这把扇子。", "Nǐ hǎo! Kànkan zhè bǎ shànzi.", "Hello! Have a look at this fan."),
  }),
  alan: Object.freeze({
    id: "alan", zh: "阿兰", en: "Alan", py: "Ālán",
    role: "Your local walking companion", color: "#527e7c",
    description: "I’m a local student. I know the lanes and always have time to help.",
    greeting: phrase("你好！", "Nǐ hǎo!", "Hello!"),
  }),
});

export const TRAIL_RESIDENTS = Object.freeze({
  hotpot: "xiaohe", cafe: "grandma", market: "lee", gate: "alan", culture: "grandma",
});

// Each card pairs the target word with ONE sentence already present in its
// trail. Brief English context carries the extra explanation, so an opening
// cannot silently become another Mandarin vocabulary lesson.
export const VOCAB_INTROS = Object.freeze({
  hotpot: [
    card("hotpot", phrase("火锅", "huǒguō", "hot pot"), [
      phrase("你好！欢迎光临。", "Nǐ hǎo! Huānyíng guānglín.", "Hello! Welcome."),
    ], "hotpot", "Hot pot is a meal to share around the table."),
    card("water", phrase("水", "shuǐ", "water"), [
      phrase("我要一杯水，谢谢。", "Wǒ yào yì bēi shuǐ, xièxie.", "I’d like a glass of water, thank you."),
    ], "water", "At the restaurant, you can choose water or tea."),
    card("vegetables", phrase("蔬菜", "shūcài", "vegetables"), [
      phrase("我要一份蔬菜，谢谢。", "Wǒ yào yí fèn shūcài, xièxie.", "I’d like a portion of vegetables, thank you."),
    ], "vegetables", "Vegetables are one of the dishes on the hotpot menu."),
  ],
  cafe: [
    card("tea", phrase("茶", "chá", "tea"), [
      phrase("我要一杯茶，谢谢。", "Wǒ yào yì bēi chá, xièxie.", "I’d like a cup of tea, thank you."),
    ], "tea", "A cup of tea is a chance to sit and chat."),
    card("cup", phrase("一杯", "yì bēi", "one cup / glass"), [
      phrase("请给我一杯茶，谢谢。", "Qǐng gěi wǒ yì bēi chá, xièxie.", "Please give me a cup of tea, thank you."),
    ], "cup", "Use 一杯 for a cup of tea or a glass of water."),
  ],
  market: [
    card("yuan", phrase("元", "yuán", "yuan"), [
      phrase("十二元。", "Shí’èr yuán.", "Twelve yuan."),
    ], "yuan", "Prices here use yuan: ¥12 means twelve yuan."),
    card("price", phrase("多少钱", "duōshao qián", "how much"), [
      phrase("请问，这个多少钱？", "Qǐngwèn, zhège duōshao qián?", "Excuse me, how much is this?"),
    ], "price", "Ask the price before deciding whether to buy."),
  ],
  gate: [
    card("where", phrase("哪里", "nǎlǐ", "where"), [
      phrase("请问，洪崖洞在哪里？", "Qǐngwèn, Hóngyádòng zài nǎlǐ?", "Excuse me, where is Hongyadong?"),
    ], "where", "Chongqing’s hillside lanes have plenty of turns."),
    card("left", phrase("左", "zuǒ", "left"), [
      phrase("往左走。", "Wǎng zuǒ zǒu.", "Go left."),
    ], "left", "I can help you choose a path at the junction."),
    card("right", phrase("右", "yòu", "right"), [
      phrase("往右走。", "Wǎng yòu zǒu.", "Go right."),
    ], "right", "Listen for the direction before you turn."),
  ],
  culture: [
    card("lantern", phrase("灯笼", "dēnglong", "lantern"), [
      phrase("灯笼挂在哪里？", "Dēnglong guà zài nǎlǐ?", "Where shall we hang the lantern?"),
    ], "lantern", "A lantern lights the table for the evening meal."),
    card("together", phrase("一起", "yìqǐ", "together"), [
      phrase("我们一起吃火锅吧！", "Wǒmen yìqǐ chī huǒguō ba!", "Let’s eat hotpot together!"),
    ], "together", "The evening ends with friends sharing a meal."),
  ],
});

function findPhrase(lesson, text, fallback) {
  return clonePhrase(lesson.phrases?.find((item) => item?.zh === text) || fallback);
}
function round(lesson, index, values) {
  const stages = ["repeat", "use", "create"];
  const titles = ["Hear it · Say it", "A little conversation", "Your turn"];
  const lastScene = [...(lesson.steps || [])].reverse().find((step) => step.type !== "speak");
  return {
    id: `${lesson.id}-${stages[index]}`,
    residentId: TRAIL_RESIDENTS[lesson.id],
    stage: stages[index], title: titles[index],
    openEnded: index === 2,
    sceneOrder: lastScene?.sceneOrder ? { ...lastScene.sceneOrder } : undefined,
    sceneMarket: lastScene?.sceneMarket ? { ...lastScene.sceneMarket } : undefined,
    sceneIndex: Math.max(0, (lesson.steps || []).filter((step) => step.type !== "speak").length - 1),
    ...values,
    model: clonePhrase(values.model),
    cue: clonePhrase(values.cue),
  };
}

// Instructions such as “try again” stay in English, outside the target language.
const sayAgain = null;
const drinkQuestion = phrase("你想喝什么？", "Nǐ xiǎng hē shénme?", "What would you like to drink?");

/** Two supported rehearsals preserve the completed branch; the final round
 * invites a new personal response, with the prior branch only as an example.
 * Recorded speech is never treated as recognised or assessed by this module.
 */
export function getNeighbourPractice(lesson) {
  if (!lesson || !TRAIL_RESIDENTS[lesson.id]) return [];
  const candidates = (lesson.phrases || []).filter(Boolean);
  if (!candidates.length) return [];
  if (["hotpot", "cafe"].includes(lesson.id)) {
    const drink = candidates.find((p) => p.zh.startsWith("我要一杯")) || candidates[0];
    const chosen = lesson.id === "hotpot"
      ? candidates.find((p) => p.zh.startsWith("我要") && p.zh.includes("和")) || drink
      : candidates.find((p) => p.zh.startsWith("请给我")) || drink;
    const isWater = drink.zh.includes("水");
    const visual = isWater ? "water" : "tea";
    return [
      round(lesson, 0, {
        prompt: "Listen to your drink order, then say it aloud.",
        cue: sayAgain, model: drink, support: "Say the whole phrase, including 谢谢.", visual,
      }),
      round(lesson, 1, {
        prompt: lesson.id === "hotpot" ? "Practise telling Xiaohe your chosen order." : "Practise asking Grandma Chen for your chosen drink.",
        cue: lesson.id === "hotpot" ? null : drinkQuestion,
        model: chosen,
        support: lesson.id === "hotpot" ? "我要……，谢谢。" : "请给我……，谢谢。",
        visual,
      }),
      round(lesson, 2, {
        prompt: lesson.id === "hotpot"
          ? "What would you like to eat or drink right now? Tell me your own order."
          : "What would you like to drink today? Ask me for your own choice.",
        cue: null, model: chosen,
        support: lesson.id === "hotpot" ? "我要……，谢谢。" : "请给我……，谢谢。",
        visual: lesson.id === "hotpot" ? "hotpot" : "cup",
      }),
    ];
  }
  if (lesson.id === "market") {
    const scene = lesson.steps?.find((step) => step.sceneMarket)?.sceneMarket || {};
    const order = lesson.marketOrder || {};
    const declined = order.accepted === false || scene.declined === true;
    const bargained = order.approach === "bargain" || scene.approach === "bargain";
    const ask = findPhrase(lesson, "请问，这个多少钱？", phrase("请问，这个多少钱？", "Qǐngwèn, zhège duōshao qián?", "Excuse me, how much is this?"));
    const bargain = findPhrase(lesson, "能便宜一点吗？", phrase("能便宜一点吗？", "Néng piányi yìdiǎn ma?", "Could it be a little cheaper?"));
    const refusal = findPhrase(lesson, "不了，谢谢。", phrase("不了，谢谢。", "Bù le, xièxie.", "No, thank you."));
    const model = lesson.practicePhrase || (declined ? refusal : bargained ? bargain : ask);
    // Authoritative normalised branch, never an arbitrary amount from a save.
    const price = bargained ? 10 : 12;
    const amount = price === 10
      ? phrase("十元。", "Shí yuán.", "Ten yuan.")
      : phrase("十二元。", "Shí’èr yuán.", "Twelve yuan.");
    return [
      round(lesson, 0, { prompt: "Listen to a phrase from your market visit, then repeat it.", cue: sayAgain, model, support: "A phrase you have just used", visual: declined ? "goodbye" : "price" }),
      round(lesson, 1, declined ? {
        prompt: "You chose not to buy. Practise leaving politely.",
        cue: phrase("你要吗？", "Nǐ yào ma?", "Would you like it?"),
        model: refusal, support: "不了，……。", visual: "goodbye",
      } : {
        prompt: `Recall your agreed price: ¥${price}. Say the amount aloud.`,
        cue: phrase("多少钱？", "Duōshao qián?", "How much?"),
        model: amount, support: "……元。", visual: "price", price,
      }),
      round(lesson, 2, {
        prompt: "Imagine something you would like at my stall. What would you say to me? Ask the price, bargain, buy or politely say no.",
        cue: null, model: declined ? refusal : model,
        support: "Choose a market phrase that fits what you want to do.",
        visual: "yuan",
      }),
    ];
  }
  if (lesson.id === "gate") {
    return [
      round(lesson, 0, { prompt: "Listen, then practise asking Alan where Hongyadong is.", cue: sayAgain, model: candidates[0], support: "请问，……在哪里？", visual: "where" }),
      round(lesson, 1, { prompt: "Help Alan take the left-hand path in the picture.", cue: null, model: findPhrase(lesson, "往左走。", phrase("往左走。", "Wǎng zuǒ zǒu.", "Go left.")), support: "往……走。", visual: "left" }),
      round(lesson, 2, { prompt: "Where would you like to go in Chongqing? Ask me where it is, or give me a direction.", cue: null, model: findPhrase(lesson, "往右走。", phrase("往右走。", "Wǎng yòu zǒu.", "Go right.")), support: "请问，……在哪里？ / 往……走。", visual: "where" }),
    ];
  }
  const invitation = candidates.find((p) => p.zh.includes("我们一起")) || candidates.at(-1);
  return [
    round(lesson, 0, { prompt: "Look at the lantern. Practise asking where to hang it.", cue: sayAgain, model: phrase("灯笼挂在哪里？", "Dēnglong guà zài nǎlǐ?", "Where shall we hang the lantern?"), support: "Ask where to hang the lantern", visual: "lantern" }),
    round(lesson, 1, { prompt: "Pass your friend the chopsticks and say a short sentence.", cue: phrase("请给我筷子，谢谢。", "Qǐng gěi wǒ kuàizi, xièxie.", "Please give me chopsticks, thank you."), model: findPhrase(lesson, "给你筷子。", phrase("给你筷子。", "Gěi nǐ kuàizi.", "Here are your chopsticks.")), support: "给你……。", visual: "chopsticks" }),
    round(lesson, 2, { prompt: "Who would you invite to your lantern evening? Tell them what you would like to do together.", cue: null, model: invitation, support: "我们一起……吧！", visual: "together" }),
  ];
}

/** Optional street encounters only revisit a completed trail. Passing the
 * resolved lessons keeps the learner's chosen drink and market branch intact.
 */
export function getStreetRecap(residentId, completed = [], resolvedLessons = []) {
  if (!RESIDENTS[residentId]) return null;
  const lessons = Array.isArray(resolvedLessons) ? resolvedLessons : Object.values(resolvedLessons || {});
  const preferences = {
    xiaohe: ["hotpot"], grandma: ["culture", "cafe"],
    lee: ["market"], alan: ["gate"],
  };
  const id = preferences[residentId].find((trail) => completed.includes(trail) && lessons.some((lesson) => lesson?.id === trail));
  if (!id) return null;
  const lesson = lessons.find((entry) => entry.id === id);
  const target = getNeighbourPractice(lesson).at(-1);
  if (!target) return null;
  return {
    ...target,
    id: `${residentId}-street-${id}`,
    residentId, trailId: id, title: "Your turn",
    prompt: target.prompt,
    cue: null,
  };
}
