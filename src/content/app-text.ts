export const appText = {
  study: {
    pages: {
      startTitle: "תחילת הניסוי",
      recallTitle: "שלב הזיכרון",
      matchingTitle: "שלב ההתאמה"
    },
    start: {
      readingPassagesLabel: "קטעי קריאה",
      studyVersionsLabel: "גרסאות מחקר",
      stagesLabel: "שלבים",
      stagesValue: "קריאה, זיכרון והתאמה",
      preparing: "מכין את ההשתתפות שלך...",
      startButton: "המשך",
      startError: "לא ניתן היה להתחיל את המחקר."
    },
    instructions: {
      loadError: "לא ניתן היה לטעון את ההשתתפות.",
      continueError: "לא ניתן היה להמשיך לשלב הבא.",
      loading: "טוען את פרטי ההשתתפות...",
      openingFirstPassage: "פותח את הקטע הראשון..."
    },
    learning: {
      loadError: "לא ניתן היה לטעון את קטע הקריאה.",
      saveError: "לא ניתן היה לשמור את התגובה.",
      loading: "טוען את קטע הקריאה...",
      progressLabel: "קטע {current} מתוך {total}"
    },
    distractor: {
      loadError: "לא ניתן היה לטעון את ההתקדמות במשימת ההסחה.",
      startError: "לא ניתן היה להתחיל את משימת ההסחה.",
      saveError: "לא ניתן היה לשמור את התגובה במשימת ההסחה.",
      correctFeedback: "נכון",
      incorrectFeedback: "לא נכון",
      boardAriaLabel: "לוח משימת קורסי",
      blockAriaLabel: "ריבוע {index}",
      trialPill: "ניסיון {trialIndex}",
      scorePill: "ציון: {score}",
      modeSaving: "שומר את התגובה...",
      selectedCount: "נבחרו {selected} מתוך {total} ריבועים.",
      skipToRecall: "דלגו לשלב הזכירה"
    },
    recall: {
      loadError: "לא ניתן היה לטעון את שאלת הזיכרון.",
      saveRecallError: "לא ניתן היה לשמור את תשובת הזיכרון.",
      saveRecognitionError: "לא ניתן היה לשמור את בחירת הזיהוי.",
      loading: "טוען את שאלת הזיכרון...",
      progressLabel: "{stepLabel} {current} מתוך {total}"
    },
    matching: {
      loadError: "לא ניתן היה לטעון את משימת ההתאמה.",
      saveError: "לא ניתן היה לשמור את תגובת ההתאמה.",
      loading: "טוען את ניסוי ההתאמה...",
      progressLabel: "התאמה {current} מתוך {total}",
      finishedTitle: "הניסוי הסתיים",
      finishedDescription: "תודה רבה על ההשתתפות. אפשר לסגור את החלון."
    }
  },
  nvlt: {
    emptyState: "כרגע אין רמות NVLT פעילות.",
    progressTitle: "שאלה {current} מתוך {total}",
    previousButton: "הקודם",
    nextButton: "הבא",
    continueToExperimentButton: "המשך לניסוי",
    finishButton: "סיום",
    sheetTitle: "({current})"
  }
} as const;
