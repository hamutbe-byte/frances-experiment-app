export const instructionText = {
  study: {
    instructionsPage: {
      title: "הוראות",
      subtitle:
        "קראו כל קטע באנגלית וענו על שאלת ההבנה שאחריו. לאחר שלב הקריאה תמשיכו למשימות זיכרון והתאמה, שגם התוכן שלהן יופיע באנגלית.",
      startReadingButton: "התחילו בקריאה"
    },
    learning: {
      comprehensionLabel: "בדיקת הבנה",
      yesExplanation: "המשפט נכון.",
      noExplanation: "המשפט אינו נכון."
    },
    distractor: {
      instructionsAriaLabel: "הוראות למשימת קורסי",
      instructionsIntro:
        "בכל ניסיון יוצג רצף של ריבועים מודגשים. לאחר שהרצף יסתיים, לחצו על הריבועים לפי הסדר המתאים.",
      instructionsForwardLead: "כאשר מוצג ניסיון",
      forwardPill: "קדימה",
      instructionsForwardTail: "לחצו על הריבועים באותו הסדר שבו הם הופיעו.",
      instructionsBackwardLead: "כאשר מוצג ניסיון",
      backwardPill: "אחורה",
      instructionsBackwardTail: "לחצו על הריבועים בסדר הפוך.",
      instructionsCueDuration: "כל ריבוע יואר למשך חצי שנייה לפני שהרצף יעבור לריבוע הבא.",
      instructionsDuration: "המשיכו לבצע ניסיונות עד שתסתיים הפסקת 10 הדקות.",
      startSequenceButton: "התחילו את הרצף הבא",
      nextSequenceButton: "הרצף הבא",
      modeShowing: "התבוננו ברצף הריבועים המודגשים.",
      modeRespondingForward: "כעת לחצו על הריבועים באותו הסדר.",
      modeRespondingBackward: "כעת לחצו על הריבועים בסדר הפוך.",
      modeReady: "לחצו על הכפתור כדי להתחיל את הרצף הבא."
    },
    recall: {
      recallInputLabel: "הקלידו את מילת הפסאודו באנגלית שמשלימה את כל החסר",
      continueButton: "המשיכו",
      recognitionLabel: "בחרו את מילת הפסאודו שאתם זוכרים"
    },
    matching: {
      questionLabel: "האם התמונה והמילה מתאימות זו לזו?",
      noKeyHint: "לחצו F",
      yesKeyHint: "לחצו J"
    }
  },
  nvlt: {
    pageTitle: "מבחן אוצר מילים באנגלית",
    pageSubtitle: "בחרו את מספר המילה המתאימה לכל משמעות.",
    wordBankAriaLabel: "רשימת המילים הזמינות",
    inputAriaLabel: (prompt: string) => `הקלידו את מספר המילה המתאימה עבור ${prompt}`,
    inputSrLabel: (prompt: string) => `הקלידו את מספר המילה המתאימה עבור ${prompt}`
  }
} as const;
