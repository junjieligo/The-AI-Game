// Derive the spoken target from the resolved conversation, including drink choice.
export function withSpeakingPractice(lesson) {
  if (!lesson) return lesson;
  const steps = lesson.steps.filter((step) => step.type !== "speak");
  const phrase =
    lesson.practicePhrase ||
    (lesson.id === "hotpot"
      ? lesson.phrases.find((p) => p.zh.startsWith("我要一杯"))
      : ["cafe", "culture"].includes(lesson.id)
        ? lesson.phrases.at(-1)
        : lesson.phrases[0]);
  return {
    ...lesson,
    steps: [
      ...steps,
      {
        type: "speak",
        speaker: "You · your turn",
        ...phrase,
        prompt: "Say this sentence in your own voice.",
        sceneOrder: steps.at(-1).sceneOrder,
        sceneMarket: steps.at(-1).sceneMarket,
        sceneIndex: steps.length - 1,
      },
    ],
  };
}
