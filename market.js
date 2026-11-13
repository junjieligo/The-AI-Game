// A small, optional bargain. Prices are derived here, never accepted from a save.
export const MARKET_VERSION = 1;
export const MARKET_STEPS = Object.freeze([
  "ask-price",
  "recognise-price",
  "choose-approach",
  "agree-price",
  "pay",
  "receive",
]);

export function normaliseMarketOrder(value = {}) {
  const asked = value?.asked === true;
  const identified = asked && value?.identified === true;
  const approach =
    identified && ["buy", "bargain"].includes(value?.approach)
      ? value.approach
      : null;
  // "I'll take it" accepts the original price. Preserve an explicit refusal
  // from the older direct-buy confirmation screen, but migrate its pending
  // null/absent acceptance without resetting the learner's saved progress.
  const accepted =
    approach === "buy"
      ? value?.accepted !== false
      : approach && typeof value?.accepted === "boolean"
        ? value.accepted
        : null;
  const paid = accepted === true && value?.paid === true;
  return {
    version: MARKET_VERSION,
    asked,
    identified,
    approach,
    accepted,
    paid,
    received: paid && value?.received === true,
  };
}

export function marketPrice(value) {
  return normaliseMarketOrder(value).approach === "bargain" ? 10 : 12;
}

/** Canonical IDs for progress display; authored numeric indices stay stable. */
export function marketRoute(value) {
  const order = normaliseMarketOrder(value);
  const route = MARKET_STEPS.filter((id) => {
    if (id === "agree-price")
      return order.approach !== "buy" || order.accepted === false;
    if (["pay", "receive"].includes(id)) return order.accepted !== false;
    return true;
  });
  return [...route, "practice"];
}

/** Upgrade only obsolete saved positions, without renumbering stable steps. */
export function marketResumeStep(index, value) {
  if (!Number.isInteger(index) || index < 0 || index > MARKET_STEPS.length)
    return 0;
  const order = normaliseMarketOrder(value);
  if (order.accepted === false && index >= 3 && index <= 5)
    return MARKET_STEPS.length;
  if (order.approach === "buy" && index === 3) return 4;
  return index;
}

/** Only a valid action at its authored step can update the transaction. */
export function applyMarketChoice(value, stepId, option = {}) {
  const order = normaliseMarketOrder(value);
  const unchanged = () => ({ order, acceptedChoice: false, nextStepId: null });
  const choice = option.marketChoice;
  if (stepId === "ask-price" && choice === "ask") {
    return {
      order: { ...order, asked: true },
      acceptedChoice: true,
      nextStepId: null,
    };
  }
  if (
    stepId === "recognise-price" &&
    choice === "identify" &&
    order.asked &&
    option.amount === 12
  ) {
    return {
      order: { ...order, identified: true },
      acceptedChoice: true,
      nextStepId: null,
    };
  }
  if (
    stepId === "choose-approach" &&
    ["buy", "bargain"].includes(choice) &&
    order.identified
  ) {
    return {
      order: {
        ...order,
        approach: choice,
        accepted: choice === "buy" ? true : null,
        paid: false,
        received: false,
      },
      acceptedChoice: true,
      nextStepId: choice === "buy" ? "pay" : "agree-price",
    };
  }
  if (
    stepId === "agree-price" &&
    ["accept", "decline"].includes(choice) &&
    order.approach === "bargain"
  ) {
    return {
      order: {
        ...order,
        accepted: choice === "accept",
        paid: false,
        received: false,
      },
      acceptedChoice: true,
      nextStepId: choice === "decline" ? "practice" : null,
    };
  }
  if (
    stepId === "pay" &&
    choice === "pay" &&
    order.accepted === true &&
    option.amount === marketPrice(order)
  ) {
    return {
      order: { ...order, paid: true },
      acceptedChoice: true,
      nextStepId: null,
    };
  }
  if (stepId === "receive" && choice === "thanks" && order.paid) {
    return {
      order: { ...order, received: true },
      acceptedChoice: true,
      nextStepId: null,
    };
  }
  return unchanged();
}

export function resolveMarketLesson(base, value) {
  if (!base || base.id !== "market") return base;
  const lesson = structuredClone(base);
  const order = normaliseMarketOrder(value),
    price = marketPrice(order);
  const amount =
    price === 10
      ? { zh: "十元", py: "Shí yuán", en: "Ten yuan" }
      : { zh: "十二元", py: "Shí’èr yuán", en: "Twelve yuan" };
  const offer = lesson.steps.find((step) => step.id === "agree-price");
  Object.assign(offer, {
    zh: "可以，十元。",
    py: "Kěyǐ, shí yuán.",
    en: "All right, ten yuan.",
    hint: "The seller offers ten yuan. Accept with 好的，我要了 or decline with 不了，谢谢。",
  });
  const pay = lesson.steps.find((step) => step.id === "pay");
  Object.assign(pay, {
    zh: `${amount.zh}，谢谢。`,
    py: `${amount.py}, xièxie.`,
    en: `${amount.en}, thank you.`,
    hint: `Pay the agreed price: ¥${price}. ${price === 10 ? "One ten-yuan note." : "One ten-yuan note and two one-yuan coins."}`,
  });
  pay.options.forEach((option) => {
    option.correct = order.accepted === true && option.amount === price;
    option.feedback = option.correct
      ? `Paid ¥${price}. Your fan is ready.`
      : order.accepted !== true
        ? "Agree on the price before paying."
        : `The agreed price is ¥${price}. Try that amount.`;
  });
  const receive = lesson.steps.find((step) => step.id === "receive");
  receive.options.forEach((option) => {
    if (option.marketChoice === "thanks") option.correct = order.paid;
  });
  lesson.steps.forEach((step, index) => {
    step.sceneMarket = {
      stage: step.id,
      price: index < 3 ? 12 : price,
      approach: order.approach,
      accepted: order.accepted,
      paid: order.paid,
      received: order.received,
      declined: order.accepted === false,
    };
  });
  lesson.marketOrder = order;
  lesson.practicePhrase =
    order.accepted === false
      ? { zh: "谢谢！", py: "Xièxie!", en: "Thank you!" }
      : order.approach === "bargain"
        ? {
            zh: "能便宜一点吗？",
            py: "Néng piányi yìdiǎn ma?",
            en: "Could it be a little cheaper?",
          }
        : { ...lesson.phrases[0] };
  // The generic reward screen reviews the last two phrases. Match that review
  // to the learner's actual choice instead of showing a refusal after a sale.
  const reviewText =
    order.accepted === false
      ? "不了，谢谢。"
      : order.approach === "bargain"
        ? "能便宜一点吗？"
        : "好的，我要了。";
  const review = lesson.phrases.find((phrase) => phrase.zh === reviewText);
  const thanks = lesson.phrases.find((phrase) => phrase.zh === "谢谢！");
  lesson.phrases = [
    ...lesson.phrases.filter(
      (phrase) => ![reviewText, "谢谢！"].includes(phrase.zh),
    ),
    review,
    thanks,
  ];
  lesson.reward =
    order.accepted === false
      ? {
          title: "A polite goodbye",
          zh: "谢谢！",
          description: "You chose not to buy. No money spent, no fan taken.",
        }
      : order.received
        ? {
            title: "Your Chongqing fan",
            zh: "谢谢！",
            description: `You paid ¥${price} and collected your fan.`,
          }
        : {
            title: "Market conversation",
            zh: "多少钱？",
            description: "Ask, choose and pay before collecting your fan.",
          };
  return lesson;
}
