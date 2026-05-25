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
      instructionsAriaLabel: "\u05d4\u05d5\u05e8\u05d0\u05d5\u05ea \u05dc\u05de\u05e9\u05d9\u05de\u05d4",
      instructionsIntro:
        "\u05e6\u05e4\u05d5 \u05d1\u05e8\u05e6\u05e3 \u05d4\u05e8\u05d9\u05d1\u05d5\u05e2\u05d9\u05dd \u05d4\u05de\u05d5\u05e4\u05d9\u05e2 \u05e2\u05dc \u05d4\u05de\u05e1\u05da, \u05d5\u05dc\u05d0\u05d7\u05e8 \u05de\u05db\u05df \u05dc\u05d7\u05e6\u05d5 \u05e2\u05dc\u05d9\u05d4\u05dd \u05d1\u05d0\u05d5\u05ea\u05d5 \u05e1\u05d3\u05e8.",
      taskLine: "",
      instructionsForwardLead: "",
      forwardPill: "",
      instructionsForwardTail: "",
      instructionsBackwardLead: "",
      backwardPill: "",
      instructionsBackwardTail: "",
      instructionsCueDuration: "",
      instructionsDuration: "",
      startSequenceButton: "\u05d4\u05ea\u05d7\u05d9\u05dc\u05d5 \u05d0\u05ea \u05d4\u05e8\u05e6\u05e3 \u05d4\u05d1\u05d0",
      nextSequenceButton: "\u05d4\u05de\u05e9\u05db\u05d5",
      modeShowing: "",
      modeRespondingForward: "",
      modeRespondingBackward: "",
      modeReady: ""
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
    pageSubtitle: "נא כתבו את מספר המילה המתאימה ליד ההגדרה שלה בצד שמאל",
    exampleTitle: "דוגמה פתורה",
    exampleSubtitle: "נא כתבו את מספר המילה המתאימה ליד ההגדרה שלה בצד שמאל, לפניכם דוגמה לפתרון נכון של השאלה:",
    exampleAnswerLabel: "תשובה",
    wordBankAriaLabel: "רשימת המילים הזמינות",
    inputAriaLabel: "הקלידו את מספר המילה המתאימה עבור {prompt}",
    inputSrLabel: "הקלידו את מספר המילה המתאימה עבור {prompt}"
  }
} as const;
