// Preferences are conversation state, not wrong answers. No browser dependency.
export const DRINKS = Object.freeze({
  water: { zh: "水", py: "shuǐ", en: "water", unit: "glass" },
  tea: { zh: "茶", py: "chá", en: "tea", unit: "cup" },
});
export function normaliseOrder(id, value = {}) {
  return {
    drink: Object.hasOwn(DRINKS, value?.drink)
      ? value.drink
      : id === "cafe"
        ? "tea"
        : "water",
    vegetables: id === "hotpot" && value?.vegetables !== false,
  };
}
export function describeOrder(id, value) {
  const order = normaliseOrder(id, value),
    d = DRINKS[order.drink];
  return {
    zh: `${order.vegetables ? "一份蔬菜和" : ""}一杯${d.zh}`,
    py: `${order.vegetables ? "yí fèn shūcài hé " : ""}yì bēi ${d.py}`,
    en: `${order.vegetables ? "Vegetables + " : ""}${d.en}`,
  };
}
export function resolveOrderLesson(base, value) {
  if (!base || !["hotpot", "cafe"].includes(base.id)) return base;
  const lesson = structuredClone(base),
    order = normaliseOrder(base.id, value),
    d = DRINKS[order.drink];
  const choice = lesson.steps[base.id === "hotpot" ? 2 : 0];
  choice.preference = true;
  choice.prompt = "Choose water or tea.";
  choice.hint = "水 means water; 茶 means tea. Either drink is welcome.";
  for (const option of choice.options) {
    const drink = option.zh.includes("一杯水")
      ? "water"
      : option.zh.includes("一杯茶")
        ? "tea"
        : null;
    option.correct = !!drink;
    if (drink) {
      option.drink = drink;
      option.feedback =
        drink === "water"
          ? "Water added to your order."
          : "Tea added to your order.";
    } else option.feedback = "蔬菜 means vegetables. Choose a drink: 水 or 茶.";
  }
  const full = {
    zh: `我要${describeOrder(base.id, order).zh}，谢谢。`,
    py: `Wǒ yào ${describeOrder(base.id, order).py}, xièxie.`,
    en: `I’d like ${order.vegetables ? "a portion of vegetables and " : ""}a ${d.unit} of ${d.en}, thank you.`,
  };
  if (base.id === "hotpot") {
    const confirmation = lesson.steps[3];
    Object.assign(confirmation, {
      zh: "对吗？",
      py: "Duì ma?",
      en: "Is that right?",
      prompt: "Confirm your order, or change it.",
      hint: "对 confirms. 不对 lets you change your order.",
      orderSummary: describeOrder(base.id, order),
    });
    Object.assign(confirmation.options[0], {
      correct: true,
      action: "change-order",
      feedback: "Let’s change your order.",
    });
    confirmation.options[2].feedback =
      "再见 means goodbye. Confirm or change your order first.";
    const build = lesson.steps[4];
    build.answer = [
      "我要",
      ...(order.vegetables ? ["一份蔬菜", "和"] : []),
      `一杯${d.zh}`,
      "，谢谢。",
    ];
    build.tokens = [
      `一杯${d.zh}`,
      "，谢谢。",
      "我要",
      ...(order.vegetables ? ["和", "一份蔬菜"] : []),
    ];
    build.alternatives = order.vegetables
      ? [`我要一杯${d.zh}和一份蔬菜，谢谢。`]
      : [];
    build.prompt = `Build your order: ${describeOrder(base.id, order).en.toLowerCase()}, thank you.`;
    build.hint = order.vegetables
      ? "Start with 我要. Join food and drink with 和. End with 谢谢."
      : "Start with 我要, add your drink, then ，谢谢。";
    build.success = "Your order is ready. 谢谢 makes it polite.";
    lesson.phrases = [
      lesson.phrases[0],
      ...(order.vegetables ? [lesson.phrases[1]] : []),
      {
        zh: `我要一杯${d.zh}，谢谢。`,
        py: `Wǒ yào yì bēi ${d.py}, xièxie.`,
        en: `I’d like a ${d.unit} of ${d.en}, thank you.`,
      },
      lesson.phrases[3],
      full,
    ];
    lesson.reward.description = order.vegetables
      ? `Your vegetables and ${d.en} are ready.`
      : `Your ${d.en} is ready.`;
  } else {
    lesson.phrases = lesson.phrases.slice(0, 3);
    Object.assign(lesson.steps[1], {
      zh: `你的${d.zh}。`,
      py: `Nǐ de ${d.py}.`,
      en: `Here is your ${d.en}.`,
    });
    const build = lesson.steps[2];
    Object.assign(build, {
      zh: "你来试试！",
      py: "Nǐ lái shìshi!",
      en: "Your turn to try!",
      prompt: `Build your ${d.en} order, starting with 请.`,
      hint: `请 → 给 → 我 → 一杯${d.zh} → ，谢谢。`,
      tokens: [`一杯${d.zh}`, "我", "，谢谢。", "给", "请"],
      answer: ["请", "给", "我", `一杯${d.zh}`, "，谢谢。"],
    });
    lesson.phrases[0] = {
      zh: `我要一杯${d.zh}，谢谢。`,
      py: `Wǒ yào yì bēi ${d.py}, xièxie.`,
      en: `I’d like a ${d.unit} of ${d.en}, thank you.`,
    };
    lesson.phrases[2] = {
      zh: `请给我一杯${d.zh}，谢谢。`,
      py: `Qǐng gěi wǒ yì bēi ${d.py}, xièxie.`,
      en: `Please give me a ${d.unit} of ${d.en}, thank you.`,
    };
    lesson.reward.title = "Drink ready";
    lesson.reward.description = `Your ${d.en} is ready.`;
  }
  lesson.steps.forEach((step) => {
    step.sceneOrder = { ...order };
  });
  return lesson;
}
