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
    yearsOfEducation: "(10) כמה שנות השכלה פורמלית יש לכם?",
    academicEnglishPlacement:
      "(11) מהי רמת האנגלית שאליה שובצת במוסד האקדמי שלך (על סמך ציון בפסיכומטרי, אמיר\"ם או אמירנט)?",
    ageAtImmigration: "(8) באיזה גיל עלית לישראל?",
    englishCourseLevel:
      "(12) נא ציינו את רמת קורס האנגלית הנוכחית שלך במוסד הלימודים:",
    countryOfBirth: "(7) ארץ לידה",
    highestEducation:
      "נא לסמן את רמת ההשכלה הגבוהה ביותר שלכם (או את המקבילה המשוערת בארה\"ב לתואר שהושג במדינה אחרת):",
    otherEducationSpecify: "נא לציין:",
    usaImmigrationDate: "תאריך העלייה לישראל, אם רלוונטי",
    otherImmigrationDetails:
      "(9) אם אי פעם גרת בחו\"ל, נא ציין את שם המדינה ואת משך הזמן שגרת שם.",
    immigrationCountryLabel: "מדינה",
    immigrationYearsLabel: "מספר שנים",
    difficulties:
      "(13) האם הייתה לכם אי פעם בעיית ראייה, לקות שמיעה, לקות שפה או לקות למידה? (סמנו את כל האפשרויות הרלוונטיות). אם כן, נא להסביר (כולל כל תיקון או התאמה):",
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
  englishCourseLevelOptions: [
    { value: "pre_basic_a", label: "טרום בסיסי א" },
    { value: "advanced_b", label: "מתקדמים ב" }
  ],
  academicEnglishPlacementOptions: [
    { value: "pre_basic_a", label: "טרום-בסיסי א" },
    { value: "pre_basic_b", label: "טרום-בסיסי ב" },
    { value: "basic_a", label: "בסיסי" },
    { value: "advanced_a", label: "מתקדמים א" },
    { value: "advanced_b", label: "מתקדמים ב" }
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
      ["1", "1"],
      ["2", "2"],
      ["3", "3"],
      ["4", "4"],
      ["5", "5 - בינוני"],
      ["6", "6"],
      ["7", "7"],
      ["8", "8"],
      ["9", "9"],
      ["10", "10 - כבד מאוד"]
    ])
  },
  languageSection: {
    profileHeading: "פרטי שפה {number}",
    profileIntro: "בחלק זה יש למלא את כל השאלות עבור שפה אחת.",
    englishInstruction: "נא ענה על החלק עבור השפה האנגלית",
    addLanguageButton: "הוספת שפה נוספת",
    additionalLanguagesInstruction: "במידה ואתה יודע שפה נוספת נא ענה על החלק הבא",
    removeLanguageButton: "הסרת שפה",
    motherTonguePrompt: "מה שפת האם שלך?",
    heading: "השפה שעליה מתייחס חלק זה",
    knowledgePrefix: "כל השאלות הבאות מתייחסות לידע ולניסיון שלך בשפה זו:",
    ageWhenYou: "(1) באיזה גיל...",
    ageLabels: {
      beganAcquiring: "התחלת ללמוד או לרכוש את השפה",
      becameFluent: "הגעת לשטף בדיבור",
      beganReading: "התחלת לקרוא בשפה",
      becameFluentReading: "הגעת לשטף בקריאה"
    },
    environmentPrompts: {
      motherTongue: "(2) כמה שנים היית בכל אחת מהסביבות שבהן השתמשו בשפת האם שלך?",
      english: "(2) כמה שנים היית בכל אחת מהסביבות שבהן השתמשו באנגלית?",
      additional: "(2) כמה שנים היית בכל אחת מהסביבות שבהן השתמשו בשפה זו?"
    },
    environmentColumns: {
      years: "שנים",
      months: "חודשים"
    },
    environmentRows: {
      country: "במדינה שבה דיברו",
      family: "במשפחה שבה דיברו",
      schoolWork: "במסגרת לימודים ו/או עבודה שבה דיברו"
    },
    proficiencyPrompts: {
      motherTongue: "(3) בסולם של 0 עד 10, מה רמת היכולת שלך בשפת האם שלך בדיבור, בהבנת שפה מדוברת ובקריאה?",
      english: "(3) בסולם של 0 עד 10, מה רמת היכולת שלך באנגלית בדיבור, בהבנת שפה מדוברת ובקריאה?",
      additional: "(3) בסולם של 0 עד 10, מה רמת היכולת שלך בשפה זו בדיבור, בהבנת שפה מדוברת ובקריאה?"
    },
    proficiencyLabels: {
      speaking: "דיבור",
      understandingSpokenLanguage: "הבנת שפה מדוברת",
      reading: "קריאה"
    },
    learningPrompts: {
      motherTongue: "(4) בסולם של 0 עד 10, עד כמה כל אחד מהגורמים הבאים תרם ללמידת שפת האם שלך?",
      english: "(4) בסולם של 0 עד 10, עד כמה כל אחד מהגורמים הבאים תרם ללמידת האנגלית?",
      additional: "(4) בסולם של 0 עד 10, עד כמה כל אחד מהגורמים הבאים תרם ללמידת שפה זו?"
    },
    learningFactors: {
      friends: "אינטראקציה עם חברים",
      family: "אינטראקציה עם משפחה",
      reading: "קריאה",
      languageTapesSelfInstruction: "קלטות שפה / לימוד עצמי",
      watchingTv: "צפייה בטלוויזיה",
      listeningToRadio: "האזנה לרדיו"
    },
    exposurePrompts: {
      motherTongue: "(5) בסולם של 0 עד 10, עד כמה את/ה חשוף/ה כיום לשפת האם שלך בכל אחד מההקשרים הבאים?",
      english: "(5) בסולם של 0 עד 10, עד כמה את/ה חשוף/ה כיום לאנגלית בכל אחד מההקשרים הבאים?",
      additional: "(5) בסולם של 0 עד 10, עד כמה את/ה חשוף/ה כיום לשפה זו בכל אחד מההקשרים הבאים?"
    },
    exposureFactors: {
      friends: "אינטראקציה עם חברים",
      family: "אינטראקציה עם משפחה",
      watchingTv: "צפייה בטלוויזיה",
      radioMusic: "האזנה לרדיו / מוזיקה",
      reading: "קריאה",
      languageLabSelfInstruction: "מעבדת שפה / לימוד עצמי"
    },
    foreignAccentPrompts: {
      english: "(6) לפי תפיסתך, עד כמה יש לך מבטא זר כשאת/ה מדבר/ת באנגלית?",
      additional: "(6) לפי תפיסתך, עד כמה יש לך מבטא זר כשאת/ה מדבר/ת בשפה זו?"
    },
    nonNativeIdentificationPrompts: {
      english: "(7) באיזו תדירות אנשים אחרים מזהים אותך כדובר/ת לא ילידי/ת של אנגלית על סמך המבטא שלך?",
      additional: "(7) באיזו תדירות אנשים אחרים מזהים אותך כדובר/ת לא ילידי/ת של שפה זו על סמך המבטא שלך?"
    }
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
