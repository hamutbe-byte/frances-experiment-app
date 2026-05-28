export const instructionText = {
  study: {
    instructionsPage: {
      title: "הוראות",
      subtitle:
        "קראו כל קטע באנגלית וענו על שאלת ההבנה שאחריו. לאחר שלב הקריאה תמשיכו למשימות זיכרון והתאמה, שגם התוכן שלהן יופיע באנגלית.",
      startReadingButton: "התחילו בקריאה"
    },
    learning: {
      comprehensionLabel: "בדיקת הבנה / Comprehension check",
      comprehensionLabelEnglish: "Comprehension check",
      yesExplanation: "המפתח נכון.",
      yesExplanationEnglish: "The statement is correct.",
      noExplanation: "המפתח אינו נכון.",
      noExplanationEnglish: "The statement is not correct."
    },
    distractor: {
      instructionsAriaLabel: "הוראות למשימה",
      instructionsIntro:
        "צפו ברצף הריבועים המופיע על המסך, ולאחר מכן לחצו עליהם באותו סדר.",
      taskLine: "",
      instructionsForwardLead: "",
      forwardPill: "",
      instructionsForwardTail: "",
      instructionsBackwardLead: "",
      backwardPill: "",
      instructionsBackwardTail: "",
      instructionsCueDuration: "",
      instructionsDuration: "",
      startSequenceButton: "התחילו את הרצף הבא",
      nextSequenceButton: "המשיכו",
      modeShowing: "",
      modeRespondingForward: "",
      modeRespondingBackward: "",
      modeReady: ""
    },
    recall: {
      recallInputLabel: "הקלידו את מילת הפסאודו באנגלית שמשלימה את החסר",
      recallInputLabelEnglish: "Type the word you remember in English.",
      continueButton: "המשיכו",
      continueButtonEnglish: "Continue",
      recognitionLabel: "בחרו את מילת הפסאודו שאתם זוכרים",
      recognitionLabelEnglish: "Choose the word that matches what you remember."
    },
    matching: {
      questionLabel: "האם התמונה והמילה מתאימות זו לזו?",
      questionLabelEnglish: "Do the image and the word match?",
      noKeyHint: "לחצו F",
      noKeyHintEnglish: "Press F",
      yesKeyHint: "לחצו J",
      yesKeyHintEnglish: "Press J"
    }
  },
  nvlt: {
    pageTitle: "מבחן אוצר מילים באנגלית",
    pageSubtitle:
      "נא כתבו את מספר המילה המתאימה ליד ההגדרה שלצד שמאל",
    exampleTitle: "דוגמה פתורה",
    exampleSubtitle:
      "נא כתבו את מספר המילה המתאימה ליד ההגדרה שלצד שמאל, לפניכם דוגמה לפתרון נכון של השאלה:",
    exampleAnswerLabel: "תשובה",
    wordBankAriaLabel: "רשימת המילים הזמינות",
    inputAriaLabel: "הקלידו את מספר המילה המתאימה עבור {prompt}",
    inputSrLabel: "הקלידו את מספר המילה המתאימה עבור {prompt}"
  }
} as const;
