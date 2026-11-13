// Recognition questions keep their English answer clues behind an explicit hint.
// Conversation/preferences and final speaking practice retain normal help settings.
export function helpForStep(
  step,
  { translations = true, requested = null, answered = false } = {},
) {
  return {
    english: step?.challenge ? (requested ?? answered) : translations,
    visualAnswers: step?.challenge === "listen-direction",
    label: step?.challenge ? "English hint" : "English help",
  };
}
