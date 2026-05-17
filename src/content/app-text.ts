export const appText = {
  home: {
    eyebrow: "Research App",
    title: "Choose a flow",
    description: "The participant flow now starts with the NVLT vocabulary test and then continues to the rest of the experiment.",
    orderedFlowPill: "NVLT then Frances",
    orderedFlowTitle: "Full participant flow",
    orderedFlowDescription: "Begin with the NVLT worksheet, then continue into the Hebrew-shell experiment phases.",
    nvltOnlyPill: "NVLT only",
    nvltOnlyTitle: "Vocabulary test only",
    nvltOnlyDescription: "Open just the NVLT worksheet without continuing into the rest of the experiment.",
    experimentOnlyPill: "Frances et al. (2020)",
    experimentOnlyTitle: "Experiment only",
    experimentOnlyDescription: "Open the reading experiment directly, without the NVLT step first."
  },
  study: {
    pages: {
      startTitle: "תחילת הניסוי",
      recallTitle: "שלב הזיכרון",
      matchingTitle: "שלב ההתאמה",
      completeTitle: "סיום"
    },
    start: {
      readingPassagesLabel: "קטעי קריאה",
      studyVersionsLabel: "גרסאות מחקר",
      stagesLabel: "שלבים",
      stagesValue: "קריאה, זיכרון והתאמה",
      preparing: "מכין את ההשתתפות שלך...",
      startButton: "התחילו בניסוי",
      startError: "לא ניתן היה להתחיל את המחקר."
    },
    instructions: {
      loadError: "לא ניתן היה לטעון את ההשתתפות.",
      continueError: "לא ניתן היה להמשיך לשלב הבא.",
      openingFirstPassage: "פותח את הקטע הראשון..."
    },
    learning: {
      loadError: "לא ניתן היה לטעון את קטע הקריאה.",
      saveError: "לא ניתן היה לשמור את התגובה.",
      loading: "טוען את קטע הקריאה...",
      progressLabel: (current: number, total: number) => `קטע ${current} מתוך ${total}`
    },
    distractor: {
      loadError: "לא ניתן היה לטעון את ההתקדמות במשימת ההסחה.",
      startError: "לא ניתן היה להתחיל את משימת ההסחה.",
      saveError: "לא ניתן היה לשמור את התגובה במשימת ההסחה.",
      correctFeedback: "נכון",
      incorrectFeedback: "לא נכון",
      boardAriaLabel: "לוח משימת קורסי",
      blockAriaLabel: (index: number) => `ריבוע ${index}`,
      trialPill: (trialIndex: number) => `ניסיון ${trialIndex}`,
      scorePill: (score: number) => `ציון: ${score}`,
      modeSaving: "שומר את התגובה...",
      selectedCount: (selected: number, total: number) => `נבחרו ${selected} מתוך ${total} ריבועים.`,
      skipToRecall: "דלגו לשלב הזכירה"
    },
    recall: {
      loadError: "לא ניתן היה לטעון את שאלת הזיכרון.",
      saveRecallError: "לא ניתן היה לשמור את תשובת הזיכרון.",
      saveRecognitionError: "לא ניתן היה לשמור את בחירת הזיהוי.",
      loading: "טוען את שאלת הזיכרון...",
      progressLabel: (step: "recall" | "recognition", current: number, total: number) =>
        `${step === "recall" ? "שליפה" : "זיהוי"} ${current} מתוך ${total}`
    },
    matching: {
      loadError: "לא ניתן היה לטעון את משימת ההתאמה.",
      saveError: "לא ניתן היה לשמור את תגובת ההתאמה.",
      loading: "טוען את ניסוי ההתאמה...",
      progressLabel: (current: number, total: number) => `התאמה ${current} מתוך ${total}`
    },
    complete: {
      loading: "טוען את פרטי הסיום...",
      success: "השלמתם את כל שלבי הניסוי הזמינים.",
      fallback: "ההשתתפות הסתיימה, אך לא ניתן היה לטעון את קוד הסיום.",
      backToStartButton: "חזרה להתחלה"
    }
  },
  nvlt: {
    emptyState: "כרגע אין רמות NVLT פעילות.",
    progressTitle: (current: number, total: number) => `שאלה ${current} מתוך ${total}`,
    previousButton: "הקודם",
    nextButton: "הבא",
    continueToExperimentButton: "המשך לניסוי",
    finishButton: "סיום",
    sheetTitle: (current: number) => `(${current})`
  }
} as const;
