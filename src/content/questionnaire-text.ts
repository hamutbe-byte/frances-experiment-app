function makeScaleOptions(entries: Array<[string, string]>) {
  return entries.map(([value, label]) => ({ value, label }));
}

const commonIsraeliLanguages = ["עברית", "ערבית", "אנגלית", "רוסית", "ספרדית"];
const otherLanguages = [
  "אמהרית",
  "איטלקית",
  "אינדונזית",
  "אירית",
  "איסלנדית",
  "אלבנית",
  "ארמנית",
  "בולגרית",
  "בוסנית",
  "גרוזינית",
  "גרמנית",
  "דנית",
  "הולנדית",
  "הונגרית",
  "הינדית",
  "וייטנאמית",
  "יוונית",
  "יידיש",
  "יפנית",
  "כורדית",
  "לאדינו",
  "לטבית",
  "ליטאית",
  "מקדונית",
  "מלאית",
  "נורווגית",
  "נפאלית",
  "סינית (קנטונזית)",
  "סינית (מנדרינית)",
  "סלובקית",
  "סלובנית",
  "סרבית",
  "פולנית",
  "פורטוגזית",
  "פינית",
  "פרסית",
  "צ'כית",
  "צרפתית",
  "קוריאנית",
  "קרואטית",
  "רומנית",
  "שוודית",
  "תאית",
  "תיגרינית",
  "טורקית",
  "טמילית",
  "אוקראינית",
  "אורדו"
];

export const questionnaireText = {
  participant: {
    lastName: "שם משפחה",
    firstName: "שם פרטי",
    todayDate: "התאריך של היום",
    age: "גיל",
    dateOfBirth: "תאריך לידה",
    gender: "מגדר",
    genderOptions: [
      { value: "male", label: "זכר" },
      { value: "female", label: "נקבה" }
    ]
  },
  languageOptions: commonIsraeliLanguages
    .concat(otherLanguages)
    .map((language) => ({
      value: language,
      label: language
    })),
  percentageOptions: Array.from({ length: 11 }, (_, index) => {
    const value = String(index * 10);
    return { value, label: `${value}%` };
  }),
  rankingSlots: ["1", "2", "3", "4", "5"],
  prompts: {
    dominance: "(1) נא לציין את כל השפות שאתם יודעים לפי סדר שליטה:",
    acquisition: "(2) נא לציין את כל השפות שאתם יודעים לפי סדר רכישה (שפת האם תחילה):",
    currentExposure: "(3) נא לציין לאיזה אחוז מהזמן אתם חשופים כיום ובממוצע לכל שפה.",
    readingPreference:
      "(4) כאשר אתם בוחרים לקרוא טקסט הזמין בכל השפות שלכם, באיזה אחוז מהמקרים תבחרו לקרוא אותו בכל אחת מהשפות שלכם? הניחו שהמקור נכתב בשפה אחרת שאינכם יודעים.",
    speakingPreference:
      "(5) כאשר אתם בוחרים באיזו שפה לדבר עם אדם השולט בכל השפות שלכם במידה שווה, באיזה אחוז מהזמן תבחרו לדבר בכל שפה? נא לדווח באחוזים מתוך כלל הזמן.",
    percentagesHint: "(האחוזים צריכים להסתכם ב־100%):",
    cultures:
      "(6) נא לציין את התרבויות שאיתן אתם מזדהים. בסולם שבין אפס לעשר, נא לדרג עד כמה אתם מזדהים עם כל תרבות. (דוגמאות לתרבויות אפשריות: אמריקאית, סינית, יהודית-אורתודוקסית וכו'):",
    yearsOfEducation: "(7) כמה שנות השכלה פורמלית יש לכם?",
    highestEducation:
      "נא לסמן את רמת ההשכלה הגבוהה ביותר שלכם (או את המקבילה המשוערת בארה\"ב לתואר שהושג במדינה אחרת):",
    otherEducationSpecify: "נא לציין:",
    usaImmigrationDate: "(8) תאריך העלייה לישראל, אם רלוונטי",
    otherImmigrationDetails:
      "אם עליתם אי פעם לישראל ממדינה אחרת, נא לציין כאן את שם המדינה ואת תאריך העלייה.",
    difficulties:
      "(9) האם הייתה לכם אי פעם בעיית ראייה, לקות שמיעה, לקות שפה או לקות למידה? (סמנו את כל האפשרויות הרלוונטיות). אם כן, נא להסביר (כולל כל תיקון או התאמה):",
    disabilityExplanationLabel: "פירוט"
  },
  pairedEntryLabels: {
    listLanguageHere: "שפה",
    listPercentageHere: "אחוז",
    listCulturesHere: "תרבות",
    identificationLevel: "מידת הזדהות"
  },
  tableLabels: {
    listLanguageHere: "ציינו כאן שפה",
    listPercentageHere: "ציינו כאן אחוז",
    listCulturesHere: "ציינו כאן תרבות",
    identificationLevel: "מידת הזדהות (0–10)"
  },
  educationOptions: [
    { value: "less_than_high_school", label: "פחות מתיכון" },
    { value: "high_school", label: "תיכון" },
    { value: "professional_training", label: "הכשרה מקצועית" },
    { value: "some_college", label: "לימודים אקדמיים חלקיים" },
    { value: "college", label: "קולג' / תואר ראשון" },
    { value: "some_graduate_school", label: "לימודים לתואר מתקדם חלקיים" },
    { value: "masters", label: "תואר שני" },
    { value: "phd_md_jd", label: "Ph.D./M.D./J.D." },
    { value: "other", label: "אחר" }
  ],
  disabilityOptions: [
    { key: "hasVisionProblem", label: "בעיית ראייה" },
    { key: "hasHearingImpairment", label: "לקות שמיעה" },
    { key: "hasLanguageDisability", label: "לקות שפה" },
    { key: "hasLearningDisability", label: "לקות למידה" }
  ],
  scales: {
    identification: makeScaleOptions([
      ["0", "0 - ללא הזדהות"],
      ["1", "1 - הזדהות נמוכה מאוד"],
      ["2", "2"],
      ["3", "3"],
      ["4", "4"],
      ["5", "5 - הזדהות בינונית"],
      ["6", "6"],
      ["7", "7"],
      ["8", "8"],
      ["9", "9"],
      ["10", "10 - הזדהות מלאה"]
    ]),
    languageStatus: [
      { value: "native", label: "ראשונה / שפת אם" },
      { value: "second", label: "שנייה" },
      { value: "third", label: "שלישית" },
      { value: "fourth", label: "רביעית" },
      { value: "fifth", label: "חמישית" }
    ],
    proficiency: makeScaleOptions([
      ["0", "0 - אין כלל"],
      ["1", "1 - נמוכה מאוד"],
      ["2", "2 - נמוכה"],
      ["3", "3 - סבירה"],
      ["4", "4 - מעט פחות ממספקת"],
      ["5", "5 - מספקת"],
      ["6", "6 - מעט יותר ממספקת"],
      ["7", "7 - טובה"],
      ["8", "8 - טובה מאוד"],
      ["9", "9 - מצוינת"],
      ["10", "10 - מושלמת"]
    ]),
    contributor: makeScaleOptions([
      ["0", "0 - לא תרם כלל"],
      ["1", "1 - תרם מעט מאוד"],
      ["2", "2"],
      ["3", "3"],
      ["4", "4"],
      ["5", "5 - תרם במידה בינונית"],
      ["6", "6"],
      ["7", "7"],
      ["8", "8"],
      ["9", "9"],
      ["10", "10 - הגורם המשמעותי ביותר"]
    ]),
    frequency: makeScaleOptions([
      ["0", "0 - אף פעם"],
      ["1", "1 - כמעט אף פעם"],
      ["2", "2"],
      ["3", "3"],
      ["4", "4"],
      ["5", "5 - חצי מהזמן"],
      ["6", "6"],
      ["7", "7"],
      ["8", "8"],
      ["9", "9"],
      ["10", "10 - תמיד"]
    ]),
    accent: makeScaleOptions([
      ["0", "0 - אין בכלל"],
      ["1", "1 - כמעט אין"],
      ["2", "2 - קל מאוד"],
      ["3", "3 - קל"],
      ["4", "4 - מסוים"],
      ["5", "5 - בינוני"],
      ["6", "6 - ניכר"],
      ["7", "7 - כבד"],
      ["8", "8 - כבד מאוד"],
      ["9", "9 - כבד ביותר"],
      ["10", "10 - נוכח מאוד"]
    ])
  },
  languageSection: {
    profileHeading: "פרטי שפה {number}",
    profileIntro: "בחלק זה יש למלא את כל השאלות עבור שפה אחת.",
    addLanguageButton: "הוספת שפה נוספת",
    removeLanguageButton: "הסרת שפה",
    heading: "השפה שעליה מתייחס חלק זה",
    statusLabel: "מעמד השפה עבורי",
    knowledgePrefix: "כל השאלות הבאות מתייחסות לידע ולניסיון שלך ב־",
    ageWhenYou: "(1) באיזה גיל...",
    ageLabels: {
      beganAcquiring: "התחלת ללמוד או לרכוש את השפה",
      becameFluent: "הגעת לשטף בדיבור",
      beganReading: "התחלת לקרוא בשפה",
      becameFluentReading: "הגעת לשטף בקריאה"
    },
    environmentPrompt: "(2) כמה שנים וכמה חודשים היית בכל אחת מהסביבות שבהן השתמשו בשפה הזו?",
    environmentColumns: {
      years: "שנים",
      months: "חודשים"
    },
    environmentRows: {
      country: "במדינה שבה דיברו",
      family: "במשפחה שבה דיברו",
      schoolWork: "במסגרת לימודים ו/או עבודה שבה דיברו"
    },
    proficiencyPrompt:
      "(3) בסולם של 0 עד 10, מה רמת היכולת שלך בשפה הזו בדיבור, בהבנת שפה מדוברת ובקריאה?",
    proficiencyLabels: {
      speaking: "דיבור",
      understandingSpokenLanguage: "הבנת שפה מדוברת",
      reading: "קריאה"
    },
    learningPrompt:
      "(4) בסולם של 0 עד 10, עד כמה כל אחד מהגורמים הבאים תרם ללמידת השפה הזו?",
    learningFactors: {
      friends: "אינטראקציה עם חברים",
      family: "אינטראקציה עם משפחה",
      reading: "קריאה",
      languageTapesSelfInstruction: "קלטות שפה / לימוד עצמי",
      watchingTv: "צפייה בטלוויזיה",
      listeningToRadio: "האזנה לרדיו"
    },
    exposurePrompt:
      "(5) בסולם של 0 עד 10, עד כמה את/ה חשוף/ה כיום ל־{language} בכל אחד מההקשרים הבאים?",
    exposureFactors: {
      friends: "אינטראקציה עם חברים",
      family: "אינטראקציה עם משפחה",
      watchingTv: "צפייה בטלוויזיה",
      radioMusic: "האזנה לרדיו / מוזיקה",
      reading: "קריאה",
      languageLabSelfInstruction: "מעבדת שפה / לימוד עצמי"
    },
    foreignAccent: "(6) לפי תפיסתך, עד כמה יש לך מבטא זר כשאת/ה מדבר/ת ב־{language}?",
    nonNativeIdentification:
      "(7) באיזו תדירות אנשים אחרים מזהים אותך כדובר/ת לא ילידי/ת של {language} על סמך המבטא שלך?"
  },
  steps: [
    {
      tabLabel: "חלק 1",
      title: "פרטים כלליים ורקע לשוני"
    },
    {
      tabLabel: "חלק 2",
      title: "השכלה ורקע אישי"
    },
    {
      tabLabel: "חלק 3",
      title: "פירוט על שפות"
    }
  ],
  stepButtons: {
    previous: "חזרה",
    next: "המשך"
  },
  buttons: {
    submit: "המשך",
    submitting: "שומר ומתחיל..."
  },
  validation: {
    percentageTotal: "האחוזים צריכים להסתכם בדיוק ב־100.",
    percentageLanguageMissing: "יש לבחור שפה לכל אחוז שמולא בקבוצה \"{label}\".",
    percentageValueMissing: "יש לבחור אחוז לכל שפה שנבחרה בקבוצה \"{label}\".",
    generic: "לא ניתן היה להתחיל את המחקר."
  }
} as const;
