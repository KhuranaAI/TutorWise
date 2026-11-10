/* =====================================================
   Bolo! — Modules 2–8 (content only)
   -----------------------------------------------------
   Made for Anissa: she always speaks as herself (female forms: rahi, gayi, aaungi),
   and uses "aap" + "ji" with Aunty, Uncle and other elders. Everyday family Hindi,
   with the Hinglish the family really uses.

   lexicon   every word that can appear in a sentence:
             id: [roman, devanagari, English, role, [other accepted spellings]]
             roles colour the tiles: subject, verb, aux, thing, person, other
             (Module 1's words — main, rahi, hoon, eat, drink, … — are added automatically.)
   Per module:
     cards      flashcards for the Words stage
     lesson     Learn-stage screens: explain | tip | swap | quiz | order
     items      sentences: tokens = what she must produce (alts = other correct versions)
     quiz       real-life multiple choice (answer = index of the right option)
     transforms [fromItem, toItem] pairs (same length; she swaps the words that differ)
     chat       a family conversation: them-lines and her replies (pick or type)
     confusions [wrongWord, rightWord, explanation] for friendly corrections
     mistakes   words she might reach for, with an explanation
   Editing tips: keep ids stable (progress is saved by id). If you change a stage's screens a lot,
   bump that stage's rev in stageInfo (e.g. stageInfo: { build: { rev: 2 } }).
   ===================================================== */
(function () {
  const C = window.BOLO_CONTENT;
  const RAHA_FEMALE = { words: ["raha", "rahaa", "rha"], why: "“Raha” is what a man says. You're a woman, so you say “rahi”." };
  const NOT_TUM = { words: ["tum", "tu", "tumhara"], why: "“Tum” is for friends and kids. With Aunty, Uncle and other elders, always use “aap”." };

  C.lexicon = {
    kar: ["kar", "कर", "do", "verb", ["karr", "kr"]],
    bana: ["bana", "बना", "make", "verb", ["banaa", "bna"]],
    ho: ["ho", "हो", "be", "aux", []],
    ja: ["ja", "जा", "go", "verb", ["jaa"]],
    aa: ["aa", "आ", "come", "verb", ["aaa"]],
    thak: ["thak", "थक", "tire", "verb", ["thakk"]],
    bhar: ["bhar", "भर", "fill", "verb", ["bharr"]],
    chal: ["chal", "चल", "go along", "verb", ["chall"]],
    milte: ["milte", "मिलते", "meet", "verb", ["milty", "milt"]],
    aaungi: ["aaungi", "आऊँगी", "I'll come (female)", "verb", ["aaongi", "aungi", "aaoongi", "aaugi", "aaoungi", "aaungee"]],

    chai: ["chai", "चाय", "tea", "thing", ["chay", "chaai", "chaye", "chaay", "chae"]],
    paani: ["paani", "पानी", "water", "thing", ["pani", "panee", "paanee"]],
    khana: ["khana", "खाना", "food", "thing", ["khaana", "khanaa"]],
    kitaab: ["kitaab", "किताब", "book", "thing", ["kitab", "kitaabein"]],
    tv: ["TV", "टीवी", "TV", "thing", ["teevee", "telly"]],
    movie: ["movie", "मूवी", "movie", "thing", ["film", "movies", "picture"]],
    kaam: ["kaam", "काम", "work", "thing", ["kam", "kaamm"]],
    baat: ["baat", "बात", "talk", "thing", ["bat", "baath"]],
    shopping: ["shopping", "शॉपिंग", "shopping", "thing", ["shoping"]],
    cooking: ["cooking", "कुकिंग", "cooking", "thing", ["kuking", "cookin"]],
    call: ["call", "कॉल", "call", "thing", ["cal", "phone"]],
    relax: ["relax", "रिलैक्स", "relax", "thing", ["rilax", "relaxing"]],
    din: ["din", "दिन", "day", "thing", ["dinn"]],
    dal: ["dal", "दाल", "dal (lentils)", "thing", ["daal", "dhal"]],
    roti: ["roti", "रोटी", "roti (flatbread)", "thing", ["rotee", "rotti"]],
    chawal: ["chawal", "चावल", "rice", "thing", ["chaawal", "chaval"]],
    mithai: ["mithai", "मिठाई", "sweets", "thing", ["mitai", "meethai", "mithaai"]],
    pet: ["pet", "पेट", "stomach", "thing", []],
    bhookh: ["bhookh", "भूख", "hunger", "thing", ["bhook", "bhukh", "bhuk"]],
    ghar: ["ghar", "घर", "home", "thing", ["gharr", "ghr"]],
    office: ["office", "ऑफिस", "office", "thing", ["ofis", "offis", "ofice"]],
    market: ["market", "मार्केट", "market", "thing", ["markit", "bazaar", "bazar"]],
    gym: ["gym", "जिम", "gym", "thing", ["jim"]],

    aunty: ["Aunty", "आंटी", "Aunty", "person", ["auntie", "aunti", "anty", "aunt", "antie"]],
    uncle: ["Uncle", "अंकल", "Uncle", "person", ["unkle", "ankal"]],
    aap: ["aap", "आप", "you (respectful)", "subject", ["ap", "aapp"]],
    mujhe: ["mujhe", "मुझे", "to me", "subject", ["mujhey", "mujhay", "muje", "mujhee"]],

    rahe: ["rahe", "रहे", "…-ing (respectful)", "aux", ["rahey", "rhe", "rahay"]],
    raha: ["raha", "रहा", "…-ing (for a man / a thing)", "aux", ["rha", "rahaa"]],
    hain: ["hain", "हैं", "are (with aap)", "aux", ["hein", "hen"]],
    hai: ["hai", "है", "is", "aux", ["he", "hae"]],
    gayi: ["gayi", "गई", "got (female)", "aux", ["gai", "gayee", "gyi", "gaee"]],
    gaya: ["gaya", "गया", "got (for pet)", "aux", ["gya", "gayaa"]],
    liya: ["liya", "लिया", "(done)", "aux", ["lia", "liyaa"]],
    tha: ["tha", "था", "was", "aux", ["thaa"]],
    lagi: ["lagi", "लगी", "(is felt)", "aux", ["lagee", "lgi"]],

    namaste: ["Namaste", "नमस्ते", "hello", "other", ["namastey", "namaskar", "namastay", "namasthe"]],
    ji: ["ji", "जी", "(respect)", "other", ["jee"]],
    aur: ["aur", "और", "and / more", "other", ["or", "aurr"]],
    theek: ["theek", "ठीक", "fine", "other", ["thik", "theik", "teek", "thek", "thiik"]],
    khush: ["khush", "खुश", "happy", "other", ["kush", "khus"]],
    busy: ["busy", "बिज़ी", "busy", "other", ["bizzy", "bizy", "bisy"]],
    excited: ["excited", "एक्साइटेड", "excited", "other", ["exited", "exicted"]],
    bore: ["bore", "बोर", "bored", "other", ["bor"]],
    bahut: ["bahut", "बहुत", "very", "other", ["bohot", "bahot", "bhot", "bohat", "bahoot", "bht"]],
    shukriya: ["shukriya", "शुक्रिया", "thank you", "other", ["shukria", "shukriyaa", "sukriya", "dhanyavaad", "dhanyawad", "dhanyavad", "thanks"]],
    kya: ["kya", "क्या", "what", "other", ["kyaa", "kia"]],
    kaise: ["kaise", "कैसे", "how (respectful)", "other", ["kese", "kaisey", "kayse", "kaisay"]],
    kaisi: ["kaisi", "कैसी", "how (to a woman)", "other", ["kesi", "kaisee", "kaisy"]],
    kaisa: ["kaisa", "कैसा", "how", "other", ["kesa", "kaisaa"]],
    haan: ["haan", "हाँ", "yes", "other", ["ha", "han", "haa"]],
    nahin: ["nahin", "नहीं", "no", "other", ["nahi", "nai", "nhi", "nahee", "nahii"]],
    sab: ["sab", "सब", "everything", "other", ["sabb", "sub"]],
    abhi: ["abhi", "अभी", "now", "other", ["abi", "abhii", "abhee"]],
    please: ["please", "प्लीज़", "please", "other", ["plz", "pls", "plis"]],
    aapka: ["aapka", "आपका", "your (respectful)", "other", ["apka", "aapkaa"]],
    pasand: ["pasand", "पसंद", "liked", "other", ["pasant", "psand", "pasnd"]],
    accha: ["accha", "अच्छा", "good", "other", ["acha", "achha", "achcha", "acchha", "achaa", "aacha"]],
    tasty: ["tasty", "टेस्टी", "tasty", "other", ["testy", "tasti"]],
    thoda: ["thoda", "थोड़ा", "a little", "other", ["thora", "thodaa"]],
    bas: ["bas", "बस", "enough", "other", ["buss", "bass"]],
    mera: ["mera", "मेरा", "my", "other", ["meraa"]],
    aaj: ["aaj", "आज", "today", "other", ["aj"]],
    kal: ["kal", "कल", "tomorrow", "other", ["kall"]],
    par: ["par", "पर", "at", "other", ["pe", "pr"]],
    bilkul: ["bilkul", "बिल्कुल", "absolutely", "other", ["bilkull", "bilkool"]],
    chalo: ["chalo", "चलो", "alright then", "other", ["challo", "chlo"]],
    phir: ["phir", "फिर", "then / again", "other", ["fir", "phirr"]],
    bye: ["bye", "बाय", "bye", "other", ["bai", "byee", "bbye"]],

    // from Anissa's Hindi class
    mei: ["mei", "में", "in", "other", ["mein", "me", "mai", "may", "mey", "mien", "men"]],
    ladki: ["ladki", "लड़की", "girl", "other", ["larki", "ladkee", "ladkii", "larkee"]],
    ladka: ["ladka", "लड़का", "boy", "other", ["larka", "ladkaa"]],
    doctor: ["doctor", "डॉक्टर", "doctor", "other", ["docter", "daktar", "dr"]],
    teacher: ["teacher", "टीचर", "teacher", "other", ["techer", "teachar"]],
    indian: ["Indian", "इंडियन", "Indian", "other", ["indain", "indan"]],
    canadian: ["Canadian", "कैनेडियन", "Canadian", "other", ["canadien", "canadan", "kanadian"]],
    canada: ["Canada", "कनाडा", "Canada", "thing", ["kanada", "canda"]],
    toronto: ["Toronto", "टोरंटो", "Toronto", "thing", ["toranto", "torronto"]],
    california: ["California", "कैलिफ़ोर्निया", "California", "thing", ["califoria", "califronia", "kalifornia"]],
    living: ["living", "लिविंग", "living", "thing", ["livin", "livng"]],
    room: ["room", "रूम", "room", "thing", ["rum", "rooom"]],
    kitchen: ["kitchen", "किचन", "kitchen", "thing", ["kichen", "kitchn", "kichan"]],
    school: ["school", "स्कूल", "school", "thing", ["skool", "scool", "schol"]],
    book: ["book", "बुक", "book", "thing", ["buk", "books"]],
    charger: ["charger", "चार्जर", "charger", "thing", ["chargr", "charjer", "charjar"]],
    remote: ["remote", "रिमोट", "remote", "thing", ["remot", "rimot", "rimote"]],
    bahar: ["bahar", "बाहर", "outside", "other", ["baahar", "bahr", "baher"]],
    rehti: ["rehti", "रहती", "live (a woman)", "verb", ["rehtee", "rahti", "rehthi", "rheti", "reti", "rehtii"]],
    rehte: ["rehte", "रहते", "live (respectful)", "verb", ["rahte", "rehtey", "rehtay", "rhete"]],
    rehta: ["rehta", "रहता", "live (a man)", "verb", ["rahta", "rehtaa"]],
    kahan: ["kahan", "कहाँ", "where", "other", ["kaha", "kahaan", "kahaa", "kidhar"]],
    papa: ["Papa", "पापा", "Dad", "person", ["pappa", "papaji", "daddy", "dad"]],
    mumma: ["Mumma", "मम्मा", "Mom", "person", ["mummy", "mumy", "mumi", "maa", "mom", "mommy", "mum"]],
    anissa: ["Anissa", "अनीसा", "Anissa", "person", ["anisa", "anisha", "annisa"]],
    jack: ["Jack", "जैक", "Jack", "person", ["jak", "jaik"]],

    // from her Nov 9 class
    voh: ["voh", "वह", "he / she", "subject", ["vo", "woh", "wo", "vah", "वो"]],
    karta: ["karta", "करता", "works / does (he)", "verb", ["kartaa", "krta"]],
    karti: ["karti", "करती", "works / does (she)", "verb", ["kartee", "krti", "kartii"]],
    karte: ["karte", "करते", "works / does (respectful)", "verb", ["kartey", "krte", "kartay"]],
    achi: ["achi", "अच्छी", "good (she)", "other", ["acchi", "achhi", "aachi", "achchi", "achii"]],
    ache: ["ache", "अच्छे", "good (respectful)", "other", ["acche", "achhe", "aache", "achche", "achey"]],
    hospital: ["hospital", "हॉस्पिटल", "hospital", "thing", ["hospitel", "haspatal", "aspatal", "अस्पताल"]],
    mumbai: ["Mumbai", "मुंबई", "Mumbai", "thing", ["bombay", "mumbay"]],
    delhi: ["Delhi", "दिल्ली", "Delhi", "thing", ["dilli", "dehli"]],
    lawyer: ["lawyer", "लॉयर", "lawyer", "other", ["layer", "loyer", "vakeel", "vakil", "वकील"]],
    court: ["court", "कोर्ट", "court", "thing", ["cort", "kort"]],
    apartment: ["apartment", "अपार्टमेंट", "apartment", "thing", ["appartment", "apartmnt", "flat"]],
    university: ["university", "यूनिवर्सिटी", "university", "thing", ["univercity", "uni", "universty"]],
    jill: ["Jill", "जिल", "Jill", "person", ["jil"]],
    riya: ["Riya", "रिया", "Riya", "person", ["ria", "reeya"]],
    ram: ["Ram", "राम", "Ram", "person", ["raam"]]
  };

  /* ===================== FROM ANISSA'S HINDI CLASS (shown first) =====================
     Built from her teacher's notes: Main … hoon · Aap … hain · the 3 H words · mei (in) ·
     rehti hoon (live) · kahan (where). Uses the teacher's exact examples and spellings. */
  const KAISE_OK = "Correct — like in your class, <b>kaise</b> works with aap for anyone. (With a woman you'll also hear <b>kaisi</b>.)";
  const KAISI_OK = "Correct! With a woman, <b>kaisi</b> is very natural. (Your class's <b>kaise</b> is right too.)";
  const classMod = {
    id: "class1", icon: "🏫", title: "Main, Aap & the 3 H Words", tagline: "From your Hindi class: who you are, where you are, and where things are", minutes: "15–20",
    stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
    stageInfo: {
      learn: { desc: "Your class, step by step: Main … hoon, Aap … hain, mei, and the 3 H words." },
      words: { title: "Words from Class", desc: "hoon, hain, hai, mei, bahar, rehti, kahan…" },
      quiz: { icon: "🔤", title: "Which H Word?", desc: "hoon, hain or hai? Pick the right one every time." },
      chat: { title: "Chat with Aunty", desc: "Aunty asks how you are and where everyone is." }
    },
    formula: [["Main / Aap / thing", "subject"], ["…", "other"], ["(place) mei", "thing"], ["hoon / hain / hai", "aux"]],
    formulaText: "Main … hoon · Aap … hain · one thing … hai",
    mistakes: [NOT_TUM, { words: ["rehta", "rahta", "rehtaa"], why: "“Rehta” is the male form. You're a woman, so it's <b>rehti</b> (Main … rehti hoon)." }],
    softSwaps: [["kaise", "kaisi", KAISI_OK]],
    confusions: [
      ["hain", "hoon", "With <b>Main</b>, it's always <b>hoon</b>. (Trick from class: Main … hoon.)"],
      ["hai", "hoon", "With <b>Main</b>, it's always <b>hoon</b>. <b>hai</b> is for one thing or person."],
      ["hoon", "hain", "With <b>aap</b>, it's <b>hain</b>. (Trick from class: Aap … hain.)"],
      ["hai", "hain", "For <b>aap</b>, Papa, Mumma — people you respect — use <b>hain</b>."],
      ["hain", "hai", "For one thing or person (the charger, Jack), use <b>hai</b>."],
      ["hoon", "hai", "<b>hoon</b> is only for Main (I). For one thing, use <b>hai</b>."],
      ["rehte", "rehti", "Talking about yourself (a woman): <b>rehti hoon</b>."],
      ["rehti", "rehte", "For aap or Papa (respect): <b>rehte hain</b>."],
      ["kaise", "kahan", "<b>kaise</b> = how. Where = <b>kahan</b>."],
      ["kahan", "kaise", "<b>kahan</b> = where. How = <b>kaise</b>."],
      ["ladka", "ladki", "<b>ladka</b> is boy — you're a <b>ladki</b> (girl)!"],
      ["main", "aap", "<b>Main</b> = I. For “you” (respectful), use <b>aap</b>."],
      ["aap", "main", "<b>aap</b> = you. For “I”, use <b>Main</b>."]
    ],
    cards: [
      { id: "hoon", roman: "hoon", deva: "हूँ", en: "am (for Main — yourself)", emoji: "🙋🏽‍♀️", sounds: "rhymes with “moon”, a little nasal" },
      { id: "hain", roman: "hain", deva: "हैं", en: "are (aap · many · respect)", emoji: "🫶🏽", sounds: "like “hen”, nasal n" },
      { id: "hai", roman: "hai", deva: "है", en: "is (one thing or person)", emoji: "☝🏽", sounds: "like “hey”" },
      { id: "mei", roman: "mei", deva: "में", en: "in (after the place)", emoji: "📍", sounds: "like “may”, a little nasal" },
      { id: "ladki", roman: "ladki", deva: "लड़की", en: "girl", emoji: "👧🏽", sounds: "lud-KEE (soft rolled d)" },
      { id: "bahar", roman: "bahar", deva: "बाहर", en: "outside", emoji: "🌳", sounds: "BAA-har" },
      { id: "rehti", roman: "rehti", deva: "रहती", en: "live (you, a woman)", emoji: "🏠", sounds: "REH-tee" },
      { id: "kahan", roman: "kahan", deva: "कहाँ", en: "where", emoji: "🗺️", sounds: "kuh-HAAN (nasal)" }
    ],
    lesson: [
      { kind: "tip", kicker: "From your Hindi class", title: "This module = your class notes",
        html: "Everything here is from your teacher's lesson, so you can practise it all week:<ul><li><b>Main … hoon</b> — I am …</li><li><b>Aap … hain</b> — you are …</li><li><b>mei</b> = in · <b>kahan</b> = where</li><li><b>rehti hoon</b> = I live</li><li>the <b>3 H words</b>: hoon, hain, hai</li></ul>" },
      { kind: "explain", kicker: "Trick: Main … hoon", title: "Tap each block to see what it means",
        blocks: [[["main"], "I"], [["anissa"], "Anissa"], [["hoon"], "am"]],
        roman: "Main Anissa hoon.", deva: "मैं अनीसा हूँ।", en: "I am Anissa.", emoji: "👋🏽",
        note: "Like your teacher said: <b>Main … hoon</b>. Whatever you are goes in the middle — your name, ladki, doctor, Canadian." },
      { kind: "swap", kicker: "Main … hoon", title: "Tap each one", options: ["main_anissa", "main_ladki", "main_doctor", "main_canadian"],
        note: "Only the middle changes. <b>Main</b> and <b>hoon</b> always stay." },
      { kind: "explain", kicker: "Trick: Aap … hain", title: "Tap each block to see what it means",
        blocks: [[["aap"], "you (respectful)"], [["canada"], "Canada"], [["mei"], "in"], [["hain"], "are"]],
        roman: "Aap Canada mei hain.", deva: "आप कनाडा में हैं।", en: "You are in Canada.", emoji: "🍁",
        note: "<b>Aap … hain</b>. And <b>mei</b> (in) comes <i>after</i> the place: <b>Canada mei</b> = in Canada, <b>kitchen mei</b> = in the kitchen." },
      { kind: "tip", kicker: "The 3 H words", title: "hoon · hain · hai",
        html: "<ul><li><b>hoon</b> = am → only with <b>Main</b> (yourself)</li><li><b>hain</b> = are → <b>aap</b>, more than one, or respect (<b>Papa</b>, <b>Mumma</b>)</li><li><b>hai</b> = is → <b>one</b> thing or person (the remote, Jack)</li></ul>",
        examples: ["main_kitchen", "aap_kitchen", "papa_cal", "charger_kitchen"] },
      { kind: "tip", kicker: "Live", title: "rehta · rehti · rehte",
        html: "<b>rehta</b> (a man) · <b>rehti</b> (a woman — you!) · <b>rehte</b> (plural or respectful).<br>Your class's structure: <b>Subject + Object + Verb + H word</b>.",
        examples: ["live_canada", "aap_live", "papa_live"] },
      { kind: "tip", kicker: "Where?", title: "kahan = where",
        html: "Put <b>kahan</b> right before the H word:<ul><li><b>Mumma kahan hain?</b> = Where is Mom?</li><li><b>Remote kahan hai?</b> = Where is the remote?</li></ul>",
        examples: ["kahan_mumma", "kahan_aap", "kahan_remote"] },
      { kind: "quiz", q: { prompt: "Which H word? “Charger kitchen mei ___.”", options: ["hai", "hain", "hoon"], answer: 0,
        whys: ["", "<b>hain</b> is for aap, many, or respect. One charger → <b>hai</b>.", "<b>hoon</b> is only for Main (I)."] } },
      { kind: "order", item: "main_ghar", chunks: [["main"], ["ghar"], ["mei"], ["hoon"]] }
    ],
    items: [
      { id: "main_anissa", en: "I am Anissa.", roman: "Main Anissa hoon.", deva: "मैं अनीसा हूँ।", tokens: ["main", "anissa", "hoon"], chip: "👋🏽 Anissa" },
      { id: "main_ladki", en: "I am a girl.", roman: "Main ladki hoon.", deva: "मैं लड़की हूँ।", tokens: ["main", "ladki", "hoon"], chip: "👧🏽 ladki" },
      { id: "main_doctor", en: "I am a doctor.", roman: "Main doctor hoon.", deva: "मैं डॉक्टर हूँ।", tokens: ["main", "doctor", "hoon"], chip: "🩺 doctor" },
      { id: "main_canadian", en: "I am Canadian.", roman: "Main Canadian hoon.", deva: "मैं कैनेडियन हूँ।", tokens: ["main", "canadian", "hoon"], chip: "🍁 Canadian" },
      { id: "main_theek", en: "I am fine.", roman: "Main theek hoon.", deva: "मैं ठीक हूँ।", tokens: ["main", "theek", "hoon"] },
      { id: "main_canada", en: "I am in Canada.", roman: "Main Canada mei hoon.", deva: "मैं कनाडा में हूँ।", tokens: ["main", "canada", "mei", "hoon"] },
      { id: "main_kitchen", en: "I am in the kitchen.", roman: "Main kitchen mei hoon.", deva: "मैं किचन में हूँ।", tokens: ["main", "kitchen", "mei", "hoon"] },
      { id: "main_living", en: "I am in the living room.", roman: "Main living room mei hoon.", deva: "मैं लिविंग रूम में हूँ।", tokens: ["main", "living", "room", "mei", "hoon"] },
      { id: "main_ghar", en: "I am at home.", roman: "Main ghar mei hoon.", deva: "मैं घर में हूँ।", tokens: ["main", "ghar", "mei", "hoon"], alts: [["main", "ghar", "par", "hoon"]] },
      { id: "main_bahar", en: "I am outside.", roman: "Main bahar hoon.", deva: "मैं बाहर हूँ।", tokens: ["main", "bahar", "hoon"] },
      { id: "aap_kaise", en: "How are you?", roman: "Aap kaise hain?", deva: "आप कैसे हैं?", tokens: ["aap", "kaise", "hain"], alts: [["namaste", "aap", "kaise", "hain"]] },
      { id: "aap_doctor", en: "You are a doctor.", roman: "Aap doctor hain.", deva: "आप डॉक्टर हैं।", tokens: ["aap", "doctor", "hain"] },
      { id: "aap_indian", en: "You are Indian.", roman: "Aap Indian hain.", deva: "आप इंडियन हैं।", tokens: ["aap", "indian", "hain"] },
      { id: "aap_canada", en: "You are in Canada.", roman: "Aap Canada mei hain.", deva: "आप कनाडा में हैं।", tokens: ["aap", "canada", "mei", "hain"] },
      { id: "aap_kitchen", en: "You are in the kitchen.", roman: "Aap kitchen mei hain.", deva: "आप किचन में हैं।", tokens: ["aap", "kitchen", "mei", "hain"] },
      { id: "aap_office", en: "You are in the office.", roman: "Aap office mei hain.", deva: "आप ऑफिस में हैं।", tokens: ["aap", "office", "mei", "hain"] },
      { id: "live_canada", en: "I live in Canada.", roman: "Main Canada mei rehti hoon.", deva: "मैं कनाडा में रहती हूँ।", tokens: ["main", "canada", "mei", "rehti", "hoon"] },
      { id: "live_toronto", en: "I live in Toronto.", roman: "Main Toronto mei rehti hoon.", deva: "मैं टोरंटो में रहती हूँ।", tokens: ["main", "toronto", "mei", "rehti", "hoon"] },
      { id: "aap_live", en: "You live in Canada.", roman: "Aap Canada mei rehte hain.", deva: "आप कनाडा में रहते हैं।", tokens: ["aap", "canada", "mei", "rehte", "hain"] },
      { id: "papa_live", en: "Dad lives in California.", roman: "Papa California mei rehte hain.", deva: "पापा कैलिफ़ोर्निया में रहते हैं।", tokens: ["papa", "california", "mei", "rehte", "hain"] },
      { id: "papa_cal", en: "Dad is in California.", roman: "Papa California mei hain.", deva: "पापा कैलिफ़ोर्निया में हैं।", tokens: ["papa", "california", "mei", "hain"] },
      { id: "mumma_ghar", en: "Mom is at home.", roman: "Mumma ghar mei hain.", deva: "मम्मा घर में हैं।", tokens: ["mumma", "ghar", "mei", "hain"] },
      { id: "mumma_kitchen", en: "Mom is in the kitchen.", roman: "Mumma kitchen mei hain.", deva: "मम्मा किचन में हैं।", tokens: ["mumma", "kitchen", "mei", "hain"] },
      { id: "kahan_mumma", en: "Where is Mom?", roman: "Mumma kahan hain?", deva: "मम्मा कहाँ हैं?", tokens: ["mumma", "kahan", "hain"] },
      { id: "kahan_papa", en: "Where is Dad?", roman: "Papa kahan hain?", deva: "पापा कहाँ हैं?", tokens: ["papa", "kahan", "hain"] },
      { id: "kahan_aap", en: "Where are you?", roman: "Aap kahan hain?", deva: "आप कहाँ हैं?", tokens: ["aap", "kahan", "hain"] },
      { id: "book_room", en: "The book is in the living room.", roman: "Book living room mei hai.", deva: "बुक लिविंग रूम में है।", tokens: ["book", "living", "room", "mei", "hai"], alts: [["kitaab", "living", "room", "mei", "hai"]] },
      { id: "charger_kitchen", en: "The charger is in the kitchen.", roman: "Charger kitchen mei hai.", deva: "चार्जर किचन में है।", tokens: ["charger", "kitchen", "mei", "hai"] },
      { id: "jack_school", en: "Jack is at school.", roman: "Jack school mei hai.", deva: "जैक स्कूल में है।", tokens: ["jack", "school", "mei", "hai"] },
      { id: "kahan_charger", en: "Where is the charger?", roman: "Charger kahan hai?", deva: "चार्जर कहाँ है?", tokens: ["charger", "kahan", "hai"] },
      { id: "kahan_remote", en: "Where is the remote?", roman: "Remote kahan hai?", deva: "रिमोट कहाँ है?", tokens: ["remote", "kahan", "hai"] },
      { id: "remote_bahar", en: "The remote is outside.", roman: "Remote bahar hai.", deva: "रिमोट बाहर है।", tokens: ["remote", "bahar", "hai"] }
    ],
    quiz: [
      { prompt: "Which H word? “Main Anissa ___.”", options: ["hoon", "hain", "hai"], answer: 0, whys: ["", "<b>hain</b> is for aap / respect. With Main it's <b>hoon</b>.", "<b>hai</b> is for one thing or person. With Main it's <b>hoon</b>."] },
      { prompt: "Which H word? “Aap doctor ___.”", options: ["hain", "hoon", "hai"], answer: 0, whys: ["", "<b>hoon</b> is only for Main. Aap … <b>hain</b>.", "<b>hai</b> is for one thing. Aap … <b>hain</b>."] },
      { prompt: "Which H word? “Remote bahar ___.”", options: ["hai", "hain", "hoon"], answer: 0, whys: ["", "One remote → <b>hai</b>.", "<b>hoon</b> is only for Main."] },
      { prompt: "Which H word? “Papa California mei ___.”", options: ["hain", "hai", "hoon"], answer: 0, whys: ["", "For Papa, Mumma and elders, use the respectful <b>hain</b>.", "<b>hoon</b> is only for Main."] },
      { prompt: "Where does mei (in) go?", options: ["Canada mei", "mei Canada"], answer: 0, whys: ["", "<b>mei</b> comes <i>after</i> the place: <b>Canada mei</b>."] },
      { prompt: "You live in Toronto. Say it!", options: ["Main Toronto mei rehti hoon.", "Main Toronto mei rehta hoon.", "Main Toronto mei rehte hain."], answer: 0, whys: ["", "<b>rehta</b> is what a man says — you say <b>rehti</b>.", "<b>rehte hain</b> is for aap or respect. About yourself: <b>rehti hoon</b>."] },
      { prompt: "What does kahan mean?", hi: "kahan", options: ["where", "how", "what"], answer: 0, whys: ["", "How is <b>kaise</b>.", "What is <b>kya</b>."] },
      { prompt: "Ask “Where is Mom?”", options: ["Mumma kahan hain?", "Mumma kaise hain?", "Mumma kahan hoon?"], answer: 0, whys: ["", "That's “How is Mom?” — where is <b>kahan</b>.", "<b>hoon</b> is only for Main."] },
      { prompt: "What does bahar mean?", hi: "bahar", options: ["outside", "inside", "home"], answer: 0, whys: ["", "Inside a place is <b>… mei</b>.", "Home is <b>ghar</b>."] }
    ],
    transforms: [["main_kitchen", "aap_kitchen"], ["main_canada", "aap_canada"], ["aap_doctor", "aap_indian"], ["main_kitchen", "main_ghar"], ["papa_cal", "mumma_kitchen"], ["live_canada", "live_toronto"], ["kahan_charger", "kahan_remote"], ["charger_kitchen", "jack_school"]],
    chat: {
      who: "aunty",
      lines: [
        { them: "Namaste Anissa! Aap kaise hain?", dv: "नमस्ते अनीसा! आप कैसे हैं?", en: "Hello Anissa! How are you?" },
        { pick: [{ text: "Main theek hoon.", ok: true }, { text: "Main theek hain.", why: "With <b>Main</b>, it's <b>hoon</b>." }, { text: "Aap theek hain.", why: "That means “<i>You</i> are fine.” 😄" }] },
        { them: "Aap kahan hain?", dv: "आप कहाँ हैं?", en: "Where are you?" },
        { type: "main_ghar", goal: "Tell her you're at home." },
        { them: "Accha! Aap kitchen mei hain?", dv: "अच्छा! आप किचन में हैं?", en: "Oh nice! Are you in the kitchen?" },
        { pick: [{ text: "Nahin, main living room mei hoon.", ok: true }, { text: "Nahin, main living room mei hain.", why: "With <b>Main</b>, it's <b>hoon</b>." }, { text: "Nahin, mei living room main hoon.", why: "<b>mei</b> comes after the place: <b>living room mei</b>." }] },
        { them: "Aur aapki mummy kahan hain?", dv: "और आपकी मम्मी कहाँ हैं?", en: "And where is your mom?" },
        { type: "mumma_kitchen", goal: "Tell her Mom is in the kitchen." },
        { them: "Aur Papa?", dv: "और पापा?", en: "And Dad?" },
        { type: "papa_cal", goal: "Say Dad is in California." },
        { them: "Accha! Aap Canada mei kahan rehti hain?", dv: "अच्छा! आप कनाडा में कहाँ रहती हैं?", en: "Oh! Where in Canada do you live?" },
        { type: "live_toronto", goal: "Tell her you live in Toronto." },
        { them: "Bahut accha! Phir milte hain. 😊", dv: "बहुत अच्छा! फिर मिलते हैं।", en: "Very good! See you soon." },
        { pick: [{ text: "Bye Aunty ji! 👋", ok: true }] }
      ]
    }
  };

  /* ===================== CLASS 2 (Nov 9): Voh, Kaam aur Acha =====================
     From her teacher's notes: Voh … hai (he / she is) · aur (and) · kaam karta / karti / karte ·
     rehta / rehti · acha / achi / ache. Items with `ask` are answered out loud in Speak It
     (a Hindi question, no English); `cue` is a picture hint instead of an English sentence. */
  const classMod2 = {
    id: "class2", icon: "👩🏽‍⚖️", title: "Voh, Kaam aur Acha", tagline: "From your Nov 9 class: he / she is, who works where, and who's good", minutes: "15–20",
    stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
    stageInfo: {
      learn: { desc: "Voh … hai, aur, kaam karta / karti / karte, acha / achi / ache." },
      words: { title: "Words from Class", desc: "voh, aur, karta / karti / karte, acha / achi / ache" },
      quiz: { icon: "⚖️", title: "He, She or Respect?", desc: "karta or karti? acha or achi? Pick the right ending." },
      chat: { title: "Chat with Aunty", desc: "Aunty asks where you work and about your friends." }
    },
    formula: [["Voh / name", "subject"], ["(place) mei", "thing"], ["kaam karta / karti", "verb"], ["hai", "aux"]],
    formulaText: "Voh … hai · Voh (place) mei kaam karta / karti hai",
    mistakes: [NOT_TUM],
    confusions: [
      ["karti", "karta", "For <b>he</b> (a man) it's <b>karta</b>."],
      ["karta", "karti", "For <b>she</b> (a woman) it's <b>karti</b>."],
      ["karta", "karte", "With <b>aap</b> (respect) it's <b>karte hain</b>."],
      ["karti", "karte", "With <b>aap</b> (respect) it's <b>karte hain</b>."],
      ["rehti", "rehta", "For <b>he</b> it's <b>rehta</b>."],
      ["rehta", "rehti", "For <b>she</b> it's <b>rehti</b>."],
      ["accha", "achi", "For a woman or girl it's <b>achi</b>."],
      ["achi", "accha", "For a man or boy it's <b>acha</b>."],
      ["accha", "ache", "For Papa or aap (respect) it's <b>ache hain</b>."],
      ["achi", "ache", "For Papa or aap (respect) it's <b>ache hain</b>."],
      ["hai", "hain", "For Papa or aap (respect) use <b>hain</b>."],
      ["hain", "hai", "For <b>voh</b> (one person) use <b>hai</b>."],
      ["hoon", "hai", "<b>hoon</b> is only for Main. With <b>voh</b> it's <b>hai</b>."],
      ["main", "voh", "<b>Main</b> = I. He / she = <b>voh</b>."],
      ["kaise", "kahan", "<b>kaise</b> = how. Where = <b>kahan</b>."]
    ],
    cards: [
      { id: "voh", roman: "voh", deva: "वह", en: "he / she", emoji: "👉🏽", sounds: "like “vo” (people often write wo / vo)" },
      { id: "aur", roman: "aur", deva: "और", en: "and", emoji: "➕", sounds: "like English “or”" },
      { id: "karta", roman: "kaam karta", deva: "काम करता", en: "works (he)", emoji: "👨🏽‍💼", sounds: "kaam KUR-taa" },
      { id: "karti", roman: "kaam karti", deva: "काम करती", en: "works (she)", emoji: "👩🏽‍💼", sounds: "kaam KUR-tee" },
      { id: "karte", roman: "kaam karte", deva: "काम करते", en: "works (respectful / aap)", emoji: "🫶🏽", sounds: "kaam KUR-tay" },
      { id: "acha", roman: "acha", deva: "अच्छा", en: "good (he)", emoji: "👍🏽", sounds: "UTCH-chaa" },
      { id: "achi", roman: "achi", deva: "अच्छी", en: "good (she)", emoji: "💐", sounds: "UTCH-chee" },
      { id: "ache", roman: "ache", deva: "अच्छे", en: "good (respectful)", emoji: "🙏🏽", sounds: "UTCH-chay" }
    ],
    lesson: [
      { kind: "tip", kicker: "From your Nov 9 class", title: "This module = your new notes",
        html: "Everything here is from your teacher's lesson:<ul><li><b>Voh … hai</b> — he / she is</li><li><b>aur</b> = and</li><li><b>kaam karta / karti / karte</b> — works (he / she / respect)</li><li><b>rehta / rehti</b> — lives (he / she)</li><li><b>acha / achi / ache</b> — good (he / she / respect)</li></ul>" },
      { kind: "explain", kicker: "Trick: Voh … hai", title: "Tap each block to see what it means",
        blocks: [[["voh"], "he / she"], [["jack"], "Jack"], [["hai"], "is"]],
        roman: "Voh Jack hai.", deva: "वह जैक है।", en: "He is Jack.", emoji: "👨🏽",
        note: "<b>Voh</b> means he <i>or</i> she — the same word for both! One person → <b>hai</b>." },
      { kind: "swap", kicker: "Voh … hai", title: "Tap each one", options: ["voh_jack", "voh_doctor", "voh_hospital", "voh_lawyer"],
        note: "Just like Main … hoon: only the middle changes. <b>Voh</b> and <b>hai</b> stay." },
      { kind: "explain", kicker: "Who works where", title: "Tap each block to see what it means",
        blocks: [[["voh"], "she"], [["court"], "court"], [["mei"], "in"], [["kaam", "karti"], "works (she)"], [["hai"], "is"]],
        roman: "Voh court mei kaam karti hai.", deva: "वह कोर्ट में काम करती है।", en: "She works in a court.", emoji: "👩🏽‍⚖️",
        note: "Your class's structure: <b>Subject + place mei + kaam karti + hai</b>. Same pattern as <b>rehti hai</b> (lives)." },
      { kind: "tip", kicker: "Works", title: "karta · karti · karte",
        html: "<ul><li><b>he</b> → kaam <b>karta</b> hai</li><li><b>she</b> → kaam <b>karti</b> hai</li><li><b>aap</b> / respect → kaam <b>karte</b> hain</li></ul>Same endings as <b>rehta / rehti / rehte</b> from your first class!",
        examples: ["jack_school_work", "jill_hospital_work", "aap_work"] },
      { kind: "tip", kicker: "Good", title: "acha · achi · ache",
        html: "<ul><li>a man / boy → <b>acha</b></li><li>a woman / girl → <b>achi</b></li><li>Papa, aap, respect → <b>ache</b> hain</li></ul>",
        examples: ["voh_achi", "achi_ladki", "papa_ache"] },
      { kind: "tip", kicker: "aur = and", title: "Join two sentences",
        html: "Put <b>aur</b> between two sentences — and say <b>voh</b> again for he / she:",
        examples: ["jack_doc_aur", "riya_aur", "mumbai_delhi"] },
      { kind: "quiz", q: { prompt: "She works in a court:", options: ["Voh court mei kaam karti hai.", "Voh court mei kaam karta hai.", "Voh kaam karti court mei hai."], answer: 0,
        whys: ["", "<b>karta</b> is for he. She → <b>karti</b>.", "The place comes first: <b>court mei</b> kaam karti hai."] } },
      { kind: "order", item: "court_work", chunks: [["voh"], ["court"], ["mei"], ["kaam"], ["karti"], ["hai"]] }
    ],
    items: [
      { id: "voh_jack", en: "He is Jack.", roman: "Voh Jack hai.", deva: "वह जैक है।", tokens: ["voh", "jack", "hai"], cue: "👨🏽 He · Jack", chip: "👨🏽 Jack" },
      { id: "voh_ladka", en: "He is a boy.", roman: "Voh ladka hai.", deva: "वह लड़का है।", tokens: ["voh", "ladka", "hai"], cue: "👦🏽 He · boy" },
      { id: "voh_doctor", en: "He is a doctor.", roman: "Voh doctor hai.", deva: "वह डॉक्टर है।", tokens: ["voh", "doctor", "hai"], cue: "👨🏽‍⚕️ He · doctor", chip: "🩺 doctor" },
      { id: "voh_hospital", en: "He is in the hospital.", roman: "Voh hospital mei hai.", deva: "वह हॉस्पिटल में है।", tokens: ["voh", "hospital", "mei", "hai"], cue: "👨🏽 He · in 🏥 hospital", chip: "🏥 hospital" },
      { id: "voh_jill", en: "She is Jill.", roman: "Voh Jill hai.", deva: "वह जिल है।", tokens: ["voh", "jill", "hai"], cue: "👩🏼 She · Jill", ask: { hi: "Voh kaun hai?", dv: "वह कौन है?", en: "Who is she?" } },
      { id: "voh_lawyer", en: "She is a lawyer.", roman: "Voh lawyer hai.", deva: "वह लॉयर है।", tokens: ["voh", "lawyer", "hai"], cue: "👩🏽‍⚖️ She · lawyer", chip: "⚖️ lawyer" },
      { id: "voh_indian", en: "She is Indian.", roman: "Voh Indian hai.", deva: "वह इंडियन है।", tokens: ["voh", "indian", "hai"], cue: "👩🏽 She · Indian 🇮🇳" },
      { id: "voh_theek", en: "She is fine.", roman: "Voh theek hai.", deva: "वह ठीक है।", tokens: ["voh", "theek", "hai"], cue: "👩🏽 She · fine 👍🏽", ask: { hi: "Riya kaisi hai?", dv: "रिया कैसी है?", en: "How is Riya?" } },
      { id: "voh_achi", en: "She is good.", roman: "Voh achi hai.", deva: "वह अच्छी है।", tokens: ["voh", "achi", "hai"], cue: "👩🏽 She · good 💐" },
      { id: "achi_lawyer", en: "She is a good lawyer.", roman: "Voh achi lawyer hai.", deva: "वह अच्छी लॉयर है।", tokens: ["voh", "achi", "lawyer", "hai"], cue: "👩🏽‍⚖️ She · good · lawyer" },
      { id: "achi_ladki", en: "She is a good girl.", roman: "Voh achi ladki hai.", deva: "वह अच्छी लड़की है।", tokens: ["voh", "achi", "ladki", "hai"], cue: "👧🏽 She · good · girl" },
      { id: "achi_teacher", en: "And she is a good teacher.", roman: "Aur voh achi teacher hai.", deva: "और वह अच्छी टीचर है।", tokens: ["aur", "voh", "achi", "teacher", "hai"], alts: [["voh", "achi", "teacher", "hai"]], cue: "➕ and · 👩🏽‍🏫 she · good · teacher" },
      { id: "papa_ache", en: "Dad is good.", roman: "Papa ache hain.", deva: "पापा अच्छे हैं।", tokens: ["papa", "ache", "hain"], cue: "👨🏽 Papa · good 👍🏽", ask: { hi: "Papa kaise hain?", dv: "पापा कैसे हैं?", en: "How is Dad?" } },
      { id: "jack_school_work", en: "Jack works in a school.", roman: "Jack school mei kaam karta hai.", deva: "जैक स्कूल में काम करता है।", tokens: ["jack", "school", "mei", "kaam", "karta", "hai"], cue: "👨🏽 Jack · 💼 works · 🏫 school", ask: { hi: "Jack kahan kaam karta hai?", dv: "जैक कहाँ काम करता है?", en: "Where does Jack work?" } },
      { id: "jill_hospital_work", en: "Jill works in a hospital.", roman: "Jill hospital mei kaam karti hai.", deva: "जिल हॉस्पिटल में काम करती है।", tokens: ["jill", "hospital", "mei", "kaam", "karti", "hai"], cue: "👩🏼 Jill · 💼 works · 🏥 hospital", ask: { hi: "Jill kahan kaam karti hai?", dv: "जिल कहाँ काम करती है?", en: "Where does Jill work?" } },
      { id: "voh_hosp_work", en: "He works in a hospital.", roman: "Voh hospital mei kaam karta hai.", deva: "वह हॉस्पिटल में काम करता है।", tokens: ["voh", "hospital", "mei", "kaam", "karta", "hai"], cue: "👨🏽 He · 💼 works · 🏥 hospital" },
      { id: "court_work", en: "She works in a court.", roman: "Voh court mei kaam karti hai.", deva: "वह कोर्ट में काम करती है।", tokens: ["voh", "court", "mei", "kaam", "karti", "hai"], cue: "👩🏽 She · 💼 works · ⚖️ court" },
      { id: "uni_work", en: "She works at a university.", roman: "Voh university mei kaam karti hai.", deva: "वह यूनिवर्सिटी में काम करती है।", tokens: ["voh", "university", "mei", "kaam", "karti", "hai"], cue: "👩🏽 She · 💼 works · 🎓 university" },
      { id: "delhi_live", en: "She lives in Delhi.", roman: "Voh Delhi mei rehti hai.", deva: "वह दिल्ली में रहती है।", tokens: ["voh", "delhi", "mei", "rehti", "hai"], cue: "👩🏽 She · 🏠 lives · Delhi", ask: { hi: "Riya kahan rehti hai?", dv: "रिया कहाँ रहती है?", en: "Where does Riya live?" } },
      { id: "apt_live", en: "She lives in an apartment.", roman: "Voh apartment mei rehti hai.", deva: "वह अपार्टमेंट में रहती है।", tokens: ["voh", "apartment", "mei", "rehti", "hai"], cue: "👩🏽 She · 🏠 lives · 🏢 apartment" },
      { id: "mumbai_live", en: "He lives in Mumbai.", roman: "Voh Mumbai mei rehta hai.", deva: "वह मुंबई में रहता है।", tokens: ["voh", "mumbai", "mei", "rehta", "hai"], cue: "👨🏽 He · 🏠 lives · Mumbai", ask: { hi: "Ram kahan rehta hai?", dv: "राम कहाँ रहता है?", en: "Where does Ram live?" } },
      { id: "aap_work", en: "Where do you work?", roman: "Aap kahan kaam karte hain?", deva: "आप कहाँ काम करते हैं?", tokens: ["aap", "kahan", "kaam", "karte", "hain"], cue: "❓ Ask Aunty: where · 💼 work" },
      { id: "main_work", en: "I work in Toronto.", roman: "Main Toronto mei kaam karti hoon.", deva: "मैं टोरंटो में काम करती हूँ।", tokens: ["main", "toronto", "mei", "kaam", "karti", "hoon"], cue: "🙋🏽‍♀️ I · 💼 work · Toronto", ask: { hi: "Aap kahan kaam karti hain?", dv: "आप कहाँ काम करती हैं?", en: "Where do you work?" } },
      { id: "jack_doc_aur", en: "Jack is a doctor and he works in a hospital.", roman: "Jack doctor hai aur voh hospital mei kaam karta hai.", deva: "जैक डॉक्टर है और वह हॉस्पिटल में काम करता है।", tokens: ["jack", "doctor", "hai", "aur", "voh", "hospital", "mei", "kaam", "karta", "hai"], cue: "👨🏽‍⚕️ Jack · doctor ➕ works · 🏥" },
      { id: "riya_aur", en: "Riya is a teacher and she works in a school.", roman: "Riya teacher hai aur voh school mei kaam karti hai.", deva: "रिया टीचर है और वह स्कूल में काम करती है।", tokens: ["riya", "teacher", "hai", "aur", "voh", "school", "mei", "kaam", "karti", "hai"], cue: "👩🏽‍🏫 Riya · teacher ➕ works · 🏫", ask: { hi: "Riya kya karti hai?", dv: "रिया क्या करती है?", en: "What does Riya do?" } },
      { id: "mumbai_delhi", en: "He lives in Mumbai and he is in Delhi.", roman: "Voh Mumbai mei rehta hai aur voh Delhi mei hai.", deva: "वह मुंबई में रहता है और वह दिल्ली में है।", tokens: ["voh", "mumbai", "mei", "rehta", "hai", "aur", "voh", "delhi", "mei", "hai"], cue: "👨🏽 lives · Mumbai ➕ is in · Delhi" }
    ],
    quiz: [
      { prompt: "He works in a school: “Voh school mei kaam ___ hai.”", options: ["karta", "karti", "karte"], answer: 0, whys: ["", "<b>karti</b> is for she. He → <b>karta</b>.", "<b>karte</b> is for aap / respect. He → <b>karta</b>."] },
      { prompt: "She lives in Delhi: “Voh Delhi mei ___ hai.”", options: ["rehti", "rehta", "rehte"], answer: 0, whys: ["", "<b>rehta</b> is for he. She → <b>rehti</b>.", "<b>rehte</b> is for aap / respect. She → <b>rehti</b>."] },
      { prompt: "Dad is good: “Papa ___ hain.”", options: ["ache", "acha", "achi"], answer: 0, whys: ["", "For Papa (respect) it's <b>ache hain</b>.", "<b>achi</b> is for a woman — and Papa takes respect: <b>ache</b>."] },
      { prompt: "She is a good girl:", options: ["Voh achi ladki hai.", "Voh acha ladki hai.", "Voh achi ladki hain."], answer: 0, whys: ["", "A girl is good → <b>achi</b>.", "One person → <b>hai</b>."] },
      { prompt: "What does voh mean?", hi: "voh", options: ["he or she", "you", "I"], answer: 0, whys: ["", "You (respectful) is <b>aap</b>.", "I is <b>Main</b>."] },
      { prompt: "Ask Aunty “Where do you work?”", options: ["Aap kahan kaam karte hain?", "Aap kahan kaam karta hai?", "Aap kaise kaam karte hain?"], answer: 0, whys: ["", "With <b>aap</b>, use the respectful <b>karte hain</b>.", "<b>kaise</b> = how. Where = <b>kahan</b>."] },
      { prompt: "What does aur mean?", hi: "aur", options: ["and", "or", "but"], answer: 0, whys: ["", "It <i>sounds</i> like “or” — but it means <b>and</b>!", "It means <b>and</b>."] },
      { prompt: "Jack is a doctor and he works in a hospital:", options: ["Jack doctor hai aur voh hospital mei kaam karta hai.", "Jack doctor hai aur voh hospital mei kaam karti hai.", "Jack doctor aur hai voh hospital mei kaam karta hai."], answer: 0, whys: ["", "Jack is a man → <b>karta</b>.", "Finish the first sentence first: <b>Jack doctor hai</b> + <b>aur</b> + …"] }
    ],
    transforms: [["jack_school_work", "jill_hospital_work"], ["court_work", "uni_work"], ["delhi_live", "mumbai_live"], ["voh_jack", "voh_jill"], ["achi_lawyer", "achi_ladki"], ["voh_lawyer", "voh_doctor"]],
    buildItems: ["voh_jack", "voh_hospital", "achi_lawyer", "papa_ache", "jack_school_work", "jill_hospital_work", "delhi_live", "aap_work", "riya_aur", "main_work"],
    chat: {
      who: "aunty",
      lines: [
        { them: "Namaste Anissa! Aap kahan kaam karti hain?", dv: "नमस्ते अनीसा! आप कहाँ काम करती हैं?", en: "Hello Anissa! Where do you work?" },
        { type: "main_work", goal: "Tell her you work in Toronto." },
        { them: "Accha! Aur Jack kaun hai?", dv: "अच्छा! और जैक कौन है?", en: "Nice! And who is Jack?" },
        { pick: [{ text: "Voh doctor hai.", ok: true }, { text: "Voh doctor hoon.", why: "<b>hoon</b> is only for Main. With voh → <b>hai</b>." }, { text: "Main doctor hai.", why: "<b>Main</b> means I. He → <b>voh</b>." }] },
        { them: "Voh kahan kaam karta hai?", dv: "वह कहाँ काम करता है?", en: "Where does he work?" },
        { type: "voh_hosp_work", goal: "Say he works in a hospital." },
        { them: "Aur Riya?", dv: "और रिया?", en: "And Riya?" },
        { type: "riya_aur", goal: "Say Riya is a teacher and she works in a school." },
        { them: "Wah! Aur aapke Papa kaise hain?", dv: "वाह! और आपके पापा कैसे हैं?", en: "Wow! And how is your dad?" },
        { type: "papa_ache", goal: "Say Dad is good." },
        { them: "Bahut accha! 😊", dv: "बहुत अच्छा!", en: "Very good!" },
        { pick: [{ text: "Bye Aunty ji! 👋", ok: true }] }
      ]
    }
  };

  const mods = [
    /* ============================ MODULE 2 ============================ */
    {
      id: "m2", number: 2, icon: "🍵", title: "Chai, TV aur Kaam", tagline: "Say what you're doing — and use kar for almost anything", minutes: "15–20",
      stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "The sentence grows: add the thing you're doing — and meet kar." },
        quiz: { icon: "🤔", title: "Kar or Not?", desc: "Pick the right action for each thing. When do you use kar?" },
        chat: { title: "Chat with Aunty", desc: "Aunty messages you. Tell her what you're up to." }
      },
      formula: [["Main", "subject"], ["thing", "thing"], ["verb", "verb"], ["rahi hoon", "aux"]],
      formulaText: "Main + thing + verb + rahi hoon",
      mistakes: [RAHA_FEMALE],
      confusions: [["kar", "watch", "You <i>watch</i> TV or a movie, so use <b>dekh</b> — never “TV kar”."], ["kar", "drink", "You <i>drink</i> chai and water, so use <b>pee</b>."], ["kar", "eat", "You <i>eat</i> food, so use <b>kha</b>."], ["kar", "read", "You <i>read</i> a book, so use <b>padh</b>."]],
      cards: [
        { id: "chai", roman: "chai", deva: "चाय", en: "tea", emoji: "🍵", sounds: "like “chai” in English — Hindi is where the word comes from!" },
        { id: "paani", roman: "paani", deva: "पानी", en: "water", emoji: "💧", sounds: "PAA-nee" },
        { id: "khana", roman: "khana", deva: "खाना", en: "food / a meal", emoji: "🍛", sounds: "KHAA-naa — breathy kh" },
        { id: "kitaab", roman: "kitaab", deva: "किताब", en: "book", emoji: "📚", sounds: "ki-TAAB" },
        { id: "kaam", roman: "kaam", deva: "काम", en: "work", emoji: "💼", sounds: "rhymes with “calm”" },
        { id: "baat", roman: "baat", deva: "बात", en: "talk / chat", emoji: "💬", sounds: "rhymes with “thought” (soft t)" },
        { id: "kar", roman: "kar", deva: "कर", en: "do", emoji: "🛠️", sounds: "like “cur”" }
      ],
      lesson: [
        { kind: "explain", kicker: "The sentence grows", title: "Tap each block to see what it means",
          blocks: [[["main"], "I"], [["chai"], "tea"], [["drink"], "drink"], [["rahi", "hoon"], "am …-ing"]],
          roman: "Main chai pee rahi hoon.", deva: "मैं चाय पी रही हूँ।", en: "I am drinking chai.", emoji: "🍵",
          note: "<b>New:</b> the thing goes <i>before</i> the action. Hindi says “I · chai · drink · am-ing”." },
        { kind: "swap", kicker: "Things and their actions", title: "Tap each one to drop it into the sentence", options: ["chai", "kitaab", "tv", "khana"],
          note: "Each thing has its own action: chai → <b>pee</b>, kitaab → <b>padh</b>, TV → <b>dekh</b>, khana → <b>kha</b>." },
        { kind: "tip", kicker: "Meet kar", title: "kar = do",
          html: "Some things aren't a single action — they're an <b>activity</b>. For those, Hindi uses <b>kar</b> (do).<ul><li><b>kaam kar</b> = do work → <i>work</i></li><li><b>baat kar</b> = do talk → <i>talk / chat</i></li></ul>",
          examples: ["kaam", "baat"] },
        { kind: "tip", kicker: "The Hinglish trick", title: "English activity + kar",
          html: "Your family does this all the time: take an English activity word and add <b>kar</b>.<br>It works for shopping, cooking, a call, relaxing… hundreds of things.",
          examples: ["shopping", "cooking", "call", "relax"] },
        { kind: "tip", kicker: "When to use kar", title: "Three simple rules",
          html: "<ol><li>There's a Hindi action for it? Use that — <b>chai pee</b>, <b>TV dekh</b>, <b>khana kha</b>.</li><li>It's an activity? Use <b>kar</b> — <b>kaam kar</b>, <b>baat kar</b>.</li><li>Using an English activity word? Add <b>kar</b> — <b>shopping kar</b>.</li></ol>The classic slip: it's <b>TV dekh</b>, never “TV kar”." },
        { kind: "quiz", q: { prompt: "How do you say “I'm watching TV”?", options: ["Main TV dekh rahi hoon.", "Main TV kar rahi hoon.", "Main dekh TV rahi hoon."], answer: 0,
          whys: ["", "You <i>watch</i> TV, so it's <b>dekh</b>. kar is for activities like kaam or shopping.", "The thing comes before the action: <b>TV dekh</b>."] } },
        { kind: "order", item: "kaam", chunks: [["main"], ["kaam"], ["kar"], ["rahi", "hoon"]] }
      ],
      items: [
        { id: "chai", en: "I am drinking chai.", roman: "Main chai pee rahi hoon.", deva: "मैं चाय पी रही हूँ।", tokens: ["main", "chai", "drink", "rahi", "hoon"], chip: "🍵 chai" },
        { id: "paani", en: "I am drinking water.", roman: "Main paani pee rahi hoon.", deva: "मैं पानी पी रही हूँ।", tokens: ["main", "paani", "drink", "rahi", "hoon"], chip: "💧 paani" },
        { id: "khana", en: "I am eating food.", roman: "Main khana kha rahi hoon.", deva: "मैं खाना खा रही हूँ।", tokens: ["main", "khana", "eat", "rahi", "hoon"], chip: "🍛 khana" },
        { id: "kitaab", en: "I am reading a book.", roman: "Main kitaab padh rahi hoon.", deva: "मैं किताब पढ़ रही हूँ।", tokens: ["main", "kitaab", "read", "rahi", "hoon"], alts: [["main", "book", "read", "rahi", "hoon"]], chip: "📚 kitaab" },
        { id: "tv", en: "I am watching TV.", roman: "Main TV dekh rahi hoon.", deva: "मैं टीवी देख रही हूँ।", tokens: ["main", "tv", "watch", "rahi", "hoon"], chip: "📺 TV" },
        { id: "movie", en: "I am watching a movie.", roman: "Main movie dekh rahi hoon.", deva: "मैं मूवी देख रही हूँ।", tokens: ["main", "movie", "watch", "rahi", "hoon"] },
        { id: "kaam", en: "I am working.", roman: "Main kaam kar rahi hoon.", deva: "मैं काम कर रही हूँ।", tokens: ["main", "kaam", "kar", "rahi", "hoon"] },
        { id: "baat", en: "I am chatting.", roman: "Main baat kar rahi hoon.", deva: "मैं बात कर रही हूँ।", tokens: ["main", "baat", "kar", "rahi", "hoon"] },
        { id: "shopping", en: "I am shopping.", roman: "Main shopping kar rahi hoon.", deva: "मैं शॉपिंग कर रही हूँ।", tokens: ["main", "shopping", "kar", "rahi", "hoon"] },
        { id: "cooking", en: "I am cooking.", roman: "Main cooking kar rahi hoon.", deva: "मैं कुकिंग कर रही हूँ।", tokens: ["main", "cooking", "kar", "rahi", "hoon"], alts: [["main", "khana", "bana", "rahi", "hoon"]] },
        { id: "call", en: "I am on a call.", roman: "Main call kar rahi hoon.", deva: "मैं कॉल कर रही हूँ।", tokens: ["main", "call", "kar", "rahi", "hoon"] },
        { id: "relax", en: "I am relaxing.", roman: "Main relax kar rahi hoon.", deva: "मैं रिलैक्स कर रही हूँ।", tokens: ["main", "relax", "kar", "rahi", "hoon"] }
      ],
      quiz: [
        { prompt: "Which action goes with chai?", hi: "chai", options: ["pee", "kar", "dekh", "kha"], answer: 0, whys: ["", "You <i>drink</i> chai → <b>chai pee</b>.", "dekh is for watching.", "kha is for eating."] },
        { prompt: "Which action goes with TV?", hi: "TV", options: ["dekh", "kar", "pee", "padh"], answer: 0, whys: ["", "You <i>watch</i> TV → <b>TV dekh</b>. Never “TV kar”.", "pee is for drinking.", "padh is for reading."] },
        { prompt: "Which action goes with kaam (work)?", hi: "kaam", options: ["kar", "dekh", "kha", "padh"], answer: 0, whys: ["", "Work is an activity → <b>kaam kar</b>.", "Work is an activity → <b>kaam kar</b>.", "Work is an activity → <b>kaam kar</b>."] },
        { prompt: "Which action goes with shopping?", hi: "shopping", options: ["kar", "dekh", "pee", "khel"], answer: 0, whys: ["", "English activity word + <b>kar</b> → shopping kar.", "English activity word + <b>kar</b> → shopping kar.", "English activity word + <b>kar</b> → shopping kar."] },
        { prompt: "Which action goes with kitaab (book)?", hi: "kitaab", options: ["padh", "kar", "dekh", "likh"], answer: 0, whys: ["", "You <i>read</i> a book → <b>kitaab padh</b>.", "You <i>read</i> a book → <b>kitaab padh</b>.", "likh is for writing — you read a book: <b>padh</b>."] },
        { prompt: "Which action goes with khana (food)?", hi: "khana", options: ["kha", "pee", "kar", "dekh"], answer: 0, whys: ["", "You <i>eat</i> food → <b>khana kha</b>.", "You <i>eat</i> food → <b>khana kha</b>.", "You <i>eat</i> food → <b>khana kha</b>."] },
        { prompt: "Which action goes with baat (talk)?", hi: "baat", options: ["kar", "dekh", "kha", "so"], answer: 0, whys: ["", "Talking is an activity → <b>baat kar</b>.", "Talking is an activity → <b>baat kar</b>.", "Talking is an activity → <b>baat kar</b>."] },
        { prompt: "Which action goes with call?", hi: "call", options: ["kar", "pee", "dekh", "padh"], answer: 0, whys: ["", "English word + <b>kar</b> → call kar.", "English word + <b>kar</b> → call kar.", "English word + <b>kar</b> → call kar."] }
      ],
      transforms: [["chai", "paani"], ["tv", "movie"], ["kaam", "baat"], ["chai", "khana"], ["tv", "kaam"], ["shopping", "call"]],
      chat: {
        who: "aunty",
        lines: [
          { them: "Hi Anissa! Kya kar rahi ho?", dv: "हाय अनीसा! क्या कर रही हो?", en: "Hi Anissa! What are you doing?" },
          { pick: [{ text: "Main chai pee rahi hoon.", ok: true }, { text: "Main chai kar rahi hoon.", why: "You <i>drink</i> chai → <b>chai pee</b>." }, { text: "Main pee chai rahi hoon.", why: "The thing comes first: <b>chai pee</b>." }] },
          { them: "Accha! Main bhi chai pee rahi hoon. 😄", dv: "अच्छा! मैं भी चाय पी रही हूँ।", en: "Oh nice! I'm drinking chai too." },
          { them: "Aur Uncle TV dekh rahe hain.", dv: "और अंकल टीवी देख रहे हैं।", en: "And Uncle is watching TV." },
          { type: "kaam", goal: "Tell Aunty you're working now." },
          { them: "Theek hai beta, baad mein baat karte hain!", dv: "ठीक है बेटा, बाद में बात करते हैं!", en: "Okay dear, let's talk later!" },
          { pick: [{ text: "Bye Aunty ji! 👋", ok: true }] }
        ]
      }
    },

    /* ============================ MODULE 3 ============================ */
    {
      id: "m3", number: 3, icon: "🙏", title: "Namaste! Kaise Hain?", tagline: "Greet the family and say how you're feeling", minutes: "15",
      stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "Greetings, respect, and Main + feeling + hoon." },
        quiz: { icon: "🤔", title: "What Would You Say?", desc: "Real moments with the family — pick the right words." },
        chat: { title: "Call with Uncle", desc: "Uncle calls to check in. Greet him and chat." }
      },
      formula: [["Main", "subject"], ["feeling", "other"], ["hoon", "aux"]],
      formulaText: "Main + feeling + hoon",
      mistakes: [RAHA_FEMALE, NOT_TUM, { words: ["gaya"], why: "“Gaya” is the male form. You say <b>thak gayi</b>." }],
      confusions: [["hai", "hoon", "With <b>Main</b> (I), it's always <b>hoon</b> (am). “hai” means “is”."], ["gaya", "gayi", "You're a woman, so it's <b>gayi</b> (a man says gaya)."]],
      cards: [
        { id: "namaste", roman: "Namaste", deva: "नमस्ते", en: "hello", emoji: "🙏", sounds: "nuh-muh-STAY" },
        { id: "ji", roman: "ji", deva: "जी", en: "(a word of respect)", emoji: "🌸", sounds: "like “gee”" },
        { id: "aap", roman: "aap", deva: "आप", en: "you (respectful)", emoji: "🫶🏽", sounds: "like “up” with a long a: AAP" },
        { id: "theek", roman: "theek", deva: "ठीक", en: "fine / okay", emoji: "👍🏽", sounds: "like “teak”" },
        { id: "khush", roman: "khush", deva: "खुश", en: "happy", emoji: "😊", sounds: "like “push” with a breathy kh" },
        { id: "bahut", roman: "bahut", deva: "बहुत", en: "very / a lot", emoji: "💯", sounds: "buh-HOOT (often “bohot”)" },
        { id: "thak", roman: "thak gayi", deva: "थक गई", en: "tired (got tired)", emoji: "😩", sounds: "thuk guh-YEE" },
        { id: "shukriya", roman: "shukriya", deva: "शुक्रिया", en: "thank you", emoji: "💐", sounds: "shook-ree-YAA" }
      ],
      lesson: [
        { kind: "explain", kicker: "Saying how you are", title: "Tap each block to see what it means",
          blocks: [[["main"], "I"], [["theek"], "fine"], [["hoon"], "am"]],
          roman: "Main theek hoon.", deva: "मैं ठीक हूँ।", en: "I am fine.", emoji: "👍🏽",
          note: "Same <b>hoon</b> as in <b>rahi hoon</b>! For feelings it's just <b>Main + feeling + hoon</b>." },
        { kind: "swap", kicker: "Feelings", title: "Tap each feeling", options: ["theek", "khush", "busy", "thak"],
          note: "“Busy” is just the English word — your family uses it all the time." },
        { kind: "tip", kicker: "Respect", title: "aap + ji = warm and polite",
          html: "With Aunty, Uncle and every elder:<ul><li>say <b>aap</b> for “you” (never “tum” — that's for friends)</li><li>add <b>ji</b> after their name: <b>Aunty ji</b>, <b>Uncle ji</b>, <b>haan ji</b></li></ul>It sounds warm and respectful, never stiff.",
          examples: ["namaste_a", "namaste_u", "aur_aap"] },
        { kind: "tip", kicker: "Girl power ✨", title: "thak gayi — the female form",
          html: "“I'm tired” is <b>Main thak gayi hoon</b>. Just like <b>rahi</b>, the <b>-i</b> ending in <b>gayi</b> is the female form (a man says thak gaya).",
          examples: ["thak", "bore"] },
        { kind: "quiz", q: { prompt: "Uncle asks “Kaisi ho?” (How are you?). You're fine. What do you say?", options: ["Main theek hoon.", "Main theek hai.", "Aap theek hoon."], answer: 0,
          whys: ["", "With <b>Main</b> it's <b>hoon</b>: Main theek hoon.", "<b>Main</b> means I — start with Main."] } },
        { kind: "order", item: "bahut_khush", chunks: [["main"], ["bahut"], ["khush"], ["hoon"]] }
      ],
      items: [
        { id: "namaste_a", en: "Hello Aunty!", roman: "Namaste Aunty ji!", deva: "नमस्ते आंटी जी!", tokens: ["namaste", "aunty", "ji"], alts: [["namaste", "aunty"]] },
        { id: "namaste_u", en: "Hello Uncle!", roman: "Namaste Uncle ji!", deva: "नमस्ते अंकल जी!", tokens: ["namaste", "uncle", "ji"], alts: [["namaste", "uncle"]] },
        { id: "theek", en: "I'm fine.", roman: "Main theek hoon.", deva: "मैं ठीक हूँ।", tokens: ["main", "theek", "hoon"], chip: "👍🏽 fine" },
        { id: "khush", en: "I'm happy.", roman: "Main khush hoon.", deva: "मैं खुश हूँ।", tokens: ["main", "khush", "hoon"], chip: "😊 happy" },
        { id: "bahut_khush", en: "I'm very happy.", roman: "Main bahut khush hoon.", deva: "मैं बहुत खुश हूँ।", tokens: ["main", "bahut", "khush", "hoon"] },
        { id: "busy", en: "I'm busy.", roman: "Main busy hoon.", deva: "मैं बिज़ी हूँ।", tokens: ["main", "busy", "hoon"], chip: "📅 busy" },
        { id: "thak", en: "I'm tired.", roman: "Main thak gayi hoon.", deva: "मैं थक गई हूँ।", tokens: ["main", "thak", "gayi", "hoon"], chip: "😩 tired" },
        { id: "excited", en: "I'm really excited!", roman: "Main bahut excited hoon!", deva: "मैं बहुत एक्साइटेड हूँ!", tokens: ["main", "bahut", "excited", "hoon"] },
        { id: "bore", en: "I'm getting bored.", roman: "Main bore ho rahi hoon.", deva: "मैं बोर हो रही हूँ।", tokens: ["main", "bore", "ho", "rahi", "hoon"] },
        { id: "aur_aap", en: "And you?", roman: "Aur aap?", deva: "और आप?", tokens: ["aur", "aap"] },
        { id: "shukriya", en: "Thank you!", roman: "Shukriya!", deva: "शुक्रिया!", tokens: ["shukriya"], noBuild: true }
      ],
      quiz: [
        { prompt: "Aunty calls you. What do you say first?", options: ["Namaste Aunty ji!", "Kya kar rahi ho?", "Bye Aunty!"], answer: 0, whys: ["", "That's what <i>she</i> asks you! Start with a greeting.", "That's for the end of the call 😄"] },
        { prompt: "How do you ask an elder “And you?”", options: ["Aur aap?", "Aur tum?", "Aap aur?"], answer: 0, whys: ["", "“Tum” is for friends. With elders always use <b>aap</b>.", "Order: <b>Aur aap?</b>"] },
        { prompt: "What does “Main thak gayi hoon” mean?", hi: "Main thak gayi hoon.", dv: "मैं थक गई हूँ।", options: ["I'm tired.", "I'm busy.", "I'm happy."], answer: 0, whys: ["", "Busy is <b>busy</b> 😄", "Happy is <b>khush</b>."] },
        { prompt: "Why is it “thak gayi” and not “thak gaya”?", options: ["-i is the female ending, like rahi", "gayi means “very”", "gaya is more polite"], answer: 0, whys: ["", "“Very” is <b>bahut</b>.", "It's about who's speaking: you're a woman, so <b>gayi</b>."] },
        { prompt: "Add respect: “Namaste Uncle ___!”", options: ["ji", "aap", "bahut"], answer: 0, whys: ["", "<b>aap</b> means you. After a name, add <b>ji</b>.", "<b>bahut</b> means very."] },
        { prompt: "You're very happy to see them. Say it!", options: ["Main bahut khush hoon!", "Main khush bahut hoon!", "Main bahut khush hai!"], answer: 0, whys: ["", "<b>bahut</b> (very) goes right before the feeling.", "With Main it's <b>hoon</b>."] },
        { prompt: "What does bahut mean?", hi: "bahut", options: ["very / a lot", "happy", "and"], answer: 0, whys: ["", "Happy is <b>khush</b>.", "And is <b>aur</b>."] }
      ],
      transforms: [["theek", "khush"], ["khush", "busy"], ["namaste_a", "namaste_u"], ["excited", "bahut_khush"]],
      chat: {
        who: "uncle",
        lines: [
          { them: "Namaste Anissa! Kaisi ho?", dv: "नमस्ते अनीसा! कैसी हो?", en: "Hello Anissa! How are you?" },
          { pick: [{ text: "Namaste Uncle ji! Main theek hoon.", ok: true }, { text: "Namaste Uncle! Main theek hai.", why: "With <b>Main</b> it's <b>hoon</b>: Main theek hoon." }, { text: "Kaisi ho, Uncle?", why: "That's his question to you — answer it first!" }] },
          { type: "aur_aap", goal: "Ask him “And you?”" },
          { them: "Main bhi theek hoon. Aaj bahut kaam hai!", dv: "मैं भी ठीक हूँ। आज बहुत काम है!", en: "I'm fine too. Lots of work today!" },
          { type: "thak", goal: "Tell him you're tired too." },
          { them: "Accha, aaraam karo! Khush raho, beta.", dv: "अच्छा, आराम करो! खुश रहो, बेटा।", en: "Okay, get some rest! Stay happy, dear." },
          { type: "shukriya", goal: "Say thank you." }
        ]
      }
    },

    /* ============================ MODULE 4 ============================ */
    {
      id: "m4", number: 4, icon: "👂", title: "Understanding Their Questions", tagline: "Know what the family is asking — and answer right away", minutes: "15",
      stages: ["learn", "words", "quiz", "build", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "The questions you'll hear most, and polite yes / no." },
        words: { title: "Questions You'll Hear", desc: "Flip cards for everyday family questions." },
        quiz: { icon: "👂", title: "What Are They Asking?", desc: "Hear a question, then pick what it means — or the best reply." },
        build: { desc: "Build your polite replies with tiles." },
        chat: { title: "Visiting Aunty", desc: "You arrive at the house. Aunty has questions!" }
      },
      formula: [["Haan ji / Nahin ji", "other"], ["…", "other"]],
      formulaText: "Haan ji / Nahin ji + your answer",
      mistakes: [RAHA_FEMALE, NOT_TUM],
      confusions: [],
      cards: [
        { id: "q_kya", roman: "Kya kar rahi ho?", deva: "क्या कर रही हो?", en: "What are you doing?", emoji: "❓", sounds: "kyaa kur ruh-HEE ho" },
        { id: "q_kaisi", roman: "Kaisi ho?", deva: "कैसी हो?", en: "How are you?", emoji: "🙂", sounds: "KAY-see ho" },
        { id: "q_khana", roman: "Khana khaya?", deva: "खाना खाया?", en: "Have you eaten?", emoji: "🍛", sounds: "KHAA-naa KHAA-yaa" },
        { id: "q_chai", roman: "Chai piyogi?", deva: "चाय पियोगी?", en: "Will you have chai?", emoji: "🍵", sounds: "chai pee-YO-gee" },
        { id: "q_sab", roman: "Sab theek hai?", deva: "सब ठीक है?", en: "Is everything okay?", emoji: "🤗", sounds: "sub teek hai" },
        { id: "haan", roman: "haan ji", deva: "हाँ जी", en: "yes (polite)", emoji: "✅", sounds: "haan gee — nasal aa" },
        { id: "nahin", roman: "nahin ji", deva: "नहीं जी", en: "no (polite)", emoji: "❌", sounds: "nuh-HEEN gee" },
        { id: "abhi", roman: "abhi nahin", deva: "अभी नहीं", en: "not yet", emoji: "⏳", sounds: "uh-BHEE nuh-HEEN" }
      ],
      lesson: [
        { kind: "tip", kicker: "They ask, you answer", title: "The questions you'll hear",
          html: "Family will often ask you things in a casual way (<b>Kya kar rahi ho?</b>) or a polite way (<b>Aap kya kar rahi hain?</b>). <b>Both mean the same.</b><br>And you already know how to answer: <b>Main … rahi hoon</b>." },
        { kind: "explain", kicker: "The most common question", title: "Tap each block to see what it means",
          blocks: [[["kya"], "what"], [["kar"], "do"], [["rahi"], "-ing (to you, a woman)"], [["ho"], "are (you)"]],
          roman: "Kya kar rahi ho?", deva: "क्या कर रही हो?", en: "What are you doing?", emoji: "❓",
          note: "It's literally “What doing are you?”. Answer with what you're doing: <b>Main TV dekh rahi hoon.</b>" },
        { kind: "tip", kicker: "Polite yes and no", title: "Add ji to sound sweet",
          html: "<ul><li><b>Haan ji</b> = yes 😊</li><li><b>Nahin ji</b> = no</li><li><b>Abhi nahin</b> = not yet</li></ul>",
          examples: ["haan_sab", "abhi_nahin", "nahin_shukriya"] },
        { kind: "quiz", q: { prompt: "Aunty asks “Khana khaya?”. What does she mean?", hi: "Khana khaya?", dv: "खाना खाया?", options: ["Have you eaten?", "What are you cooking?", "Are you hungry?"], answer: 0,
          whys: ["", "Close! It's “Have you eaten?” — khaya = ate.", "Close! It's “Have you eaten?” — khaya = ate."] } },
        { kind: "order", item: "haan_sab", chunks: [["haan"], ["ji"], ["sab"], ["theek"], ["hai"]] }
      ],
      items: [
        { id: "haan_sab", en: "Yes, everything's fine.", roman: "Haan ji, sab theek hai.", deva: "हाँ जी, सब ठीक है।", tokens: ["haan", "ji", "sab", "theek", "hai"], alts: [["haan", "sab", "theek", "hai"]] },
        { id: "kha_liya", en: "Yes, I've eaten.", roman: "Haan ji, kha liya.", deva: "हाँ जी, खा लिया।", tokens: ["haan", "ji", "eat", "liya"], alts: [["haan", "eat", "liya"]] },
        { id: "abhi_nahin", en: "Not yet.", roman: "Abhi nahin.", deva: "अभी नहीं।", tokens: ["abhi", "nahin"], alts: [["nahin", "abhi", "nahin"], ["nahin", "ji", "abhi", "nahin"], ["abhi", "nahin", "ji"]] },
        { id: "haan_please", en: "Yes, please!", roman: "Haan ji, please!", deva: "हाँ जी, प्लीज़!", tokens: ["haan", "ji", "please"], alts: [["haan", "please"]] },
        { id: "nahin_shukriya", en: "No, thank you.", roman: "Nahin ji, shukriya.", deva: "नहीं जी, शुक्रिया।", tokens: ["nahin", "ji", "shukriya"], alts: [["nahin", "shukriya"]] },
        { id: "r_tv", en: "I'm watching TV.", roman: "Main TV dekh rahi hoon.", deva: "मैं टीवी देख रही हूँ।", tokens: ["main", "tv", "watch", "rahi", "hoon"] },
        { id: "r_theek", en: "I'm fine.", roman: "Main theek hoon.", deva: "मैं ठीक हूँ।", tokens: ["main", "theek", "hoon"] },
        { id: "r_kaam", en: "I'm working.", roman: "Main kaam kar rahi hoon.", deva: "मैं काम कर रही हूँ।", tokens: ["main", "kaam", "kar", "rahi", "hoon"] }
      ],
      quiz: [
        { prompt: "What does this mean?", hi: "Kya kar rahi ho?", dv: "क्या कर रही हो?", options: ["What are you doing?", "How are you?", "Where are you?"], answer: 0, whys: ["", "“How are you?” is <b>Kaisi ho?</b>", "“Where are you?” is <b>Kahan ho?</b>"] },
        { prompt: "What does this mean?", hi: "Kaisi ho?", dv: "कैसी हो?", options: ["How are you?", "What are you doing?", "Have you eaten?"], answer: 0, whys: ["", "That's <b>Kya kar rahi ho?</b>", "That's <b>Khana khaya?</b>"] },
        { prompt: "What does this mean?", hi: "Aap kaisi hain?", dv: "आप कैसी हैं?", options: ["How are you? (polite)", "Who are you?", "Are you hungry?"], answer: 0, whys: ["", "It's the polite “How are you?” — same as Kaisi ho?", "It's the polite “How are you?” — same as Kaisi ho?"] },
        { prompt: "Aunty asks this. Pick the best reply.", hi: "Khana khaya?", dv: "खाना खाया?", options: ["Haan ji, kha liya.", "Main theek hoon.", "Shukriya."], answer: 0, whys: ["", "That answers “How are you?”. She asked if you've eaten!", "She asked if you've eaten — say <b>Haan ji, kha liya</b> or <b>Abhi nahin</b>."] },
        { prompt: "Uncle offers this. You'd love some. Reply:", hi: "Chai piyogi?", dv: "चाय पियोगी?", options: ["Haan ji, please!", "Main busy hoon.", "Namaste!"], answer: 0, whys: ["", "He's offering chai — say <b>Haan ji, please!</b> or <b>Nahin ji, shukriya</b>.", "You've already said hello 😄"] },
        { prompt: "Aunty asks this. Pick the best reply.", hi: "Sab theek hai?", dv: "सब ठीक है?", options: ["Haan ji, sab theek hai.", "Main bhaag rahi hoon.", "Abhi nahin."], answer: 0, whys: ["", "She's asking if everything's okay!", "That's “not yet” — she asked if everything's okay."] },
        { prompt: "Someone asks this. Which reply works?", hi: "Kya kar rahi ho?", dv: "क्या कर रही हो?", options: ["Main TV dekh rahi hoon.", "Haan ji, please!", "Abhi nahin."], answer: 0, whys: ["", "That's for an offer. Say what you're doing: <b>Main … rahi hoon</b>.", "Say what you're doing: <b>Main … rahi hoon</b>."] },
        { prompt: "The polite version. Which reply works?", hi: "Aap kya kar rahi hain?", dv: "आप क्या कर रही हैं?", options: ["Main kitaab padh rahi hoon.", "Aap theek hain.", "Bye!"], answer: 0, whys: ["", "Answer about yourself: <b>Main … rahi hoon</b>.", "Answer about yourself: <b>Main … rahi hoon</b>."] }
      ],
      transforms: [],
      chat: {
        who: "aunty",
        lines: [
          { them: "Anissa, aao aao! Kaisi ho?", dv: "अनीसा, आओ आओ! कैसी हो?", en: "Anissa, come in! How are you?" },
          { pick: [{ text: "Main theek hoon, Aunty ji. Aur aap?", ok: true }, { text: "Haan ji, please!", why: "She asked how you are: <b>Main theek hoon</b>." }, { text: "Main kaam kar rahi hoon.", why: "She asked how you are, not what you're doing." }] },
          { them: "Main bhi theek hoon. Khana khaya?", dv: "मैं भी ठीक हूँ। खाना खाया?", en: "I'm fine too. Have you eaten?" },
          { type: "abhi_nahin", goal: "Tell her: not yet." },
          { them: "Arre! Pehle khana khao. Chai piyogi?", dv: "अरे! पहले खाना खाओ। चाय पियोगी?", en: "Oh! Eat first. Will you have chai?" },
          { type: "haan_please", goal: "Say: yes, please!" },
          { them: "Sab theek hai? Kaam kaisa chal raha hai?", dv: "सब ठीक है? काम कैसा चल रहा है?", en: "Everything okay? How's work going?" },
          { pick: [{ text: "Haan ji, sab theek hai!", ok: true }, { text: "Nahin ji, shukriya.", why: "That's “no thank you” — she asked if everything's okay." }] },
          { them: "Bahut accha! 😊", dv: "बहुत अच्छा!", en: "Very good!" }
        ]
      }
    },

    /* ============================ MODULE 5 ============================ */
    {
      id: "m5", number: 5, icon: "🫶🏽", title: "Asking Them Back", tagline: "Ask Aunty and Uncle how they are — politely", minutes: "15–20",
      stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "aap + hain, and the one tricky bit: Aunty vs Uncle." },
        quiz: { icon: "👩🏽‍🦱", title: "Aunty or Uncle?", desc: "Pick the right form for who you're asking." },
        chat: { title: "Call with Uncle", desc: "Ask Uncle how he is and what everyone's up to." }
      },
      formula: [["Aunty / Uncle", "person"], ["aap", "subject"], ["…", "other"], ["hain?", "aux"]],
      formulaText: "Aunty / Uncle, aap + … + hain?",
      mistakes: [NOT_TUM, { words: ["ho"], why: "“ho” goes with tum. With <b>aap</b>, use <b>hain</b>." }],
      softSwaps: [["kaisi", "kaise", KAISE_OK], ["rahi", "rahe", "Correct — like in your class, the respectful <b>rahe hain</b> works for anyone. (With a woman you'll also hear <b>rahi hain</b>.)"]],
      confusions: [["rahi", "rahe", "For Uncle (or any man) it's <b>rahe</b>."], ["kaisi", "kaise", "For Uncle (or any man) it's <b>kaise</b>."], ["hoon", "hain", "<b>hoon</b> is “I am”. With <b>aap</b>, it's <b>hain</b>."], ["hai", "hain", "With <b>aap</b>, it's <b>hain</b> (with an n)."], ["aunty", "uncle", "This one is for Uncle."], ["uncle", "aunty", "This one is for Aunty."]],
      cards: [
        { id: "aap", roman: "aap", deva: "आप", en: "you (respectful)", emoji: "🫶🏽", sounds: "AAP" },
        { id: "hain", roman: "hain", deva: "हैं", en: "are (with aap)", emoji: "🟰", sounds: "like “hen” with a nasal n" },
        { id: "kaise", roman: "kaise", deva: "कैसे", en: "how (respectful — anyone)", emoji: "👨🏽", sounds: "KAY-say" },
        { id: "kaisi", roman: "kaisi", deva: "कैसी", en: "how (to a woman)", emoji: "👩🏽", sounds: "KAY-see" },
        { id: "rahe", roman: "rahe", deva: "रहे", en: "…-ing (respectful / a man)", emoji: "🔁", sounds: "ruh-HAY" },
        { id: "din", roman: "din", deva: "दिन", en: "day", emoji: "☀️", sounds: "like “din”" },
        { id: "aapka", roman: "aapka", deva: "आपका", en: "your (respectful)", emoji: "👉🏽", sounds: "AAP-kaa" },
        { id: "sab", roman: "sab", deva: "सब", en: "everything / all", emoji: "🌍", sounds: "like “sub”" }
      ],
      lesson: [
        { kind: "explain", kicker: "Asking politely", title: "Tap each block to see what it means",
          blocks: [[["uncle"], "Uncle"], [["aap"], "you (respectful)"], [["kaise"], "how"], [["hain"], "are"]],
          roman: "Uncle, aap kaise hain?", deva: "अंकल, आप कैसे हैं?", en: "Uncle, how are you?", emoji: "👨🏽",
          note: "With <b>aap</b> it's always <b>hain</b> (not hoon — hoon is only for “I am”)." },
        { kind: "tip", kicker: "Respect, like in your class", title: "kaise · rahe · rehte = respectful",
          html: "Your own sentences always use <b>rahi</b> — you're a woman. When you ask an elder, use the respectful <b>-e</b> forms your teacher taught: <b>kaise</b>, <b>rahe</b>, <b>rehte</b> + <b>hain</b>. They work for anyone.<ul><li><b>Uncle</b> → <b>kaise</b>, <b>rahe</b> (always)</li><li><b>Aunty</b> → <b>kaise</b>, <b>rahe</b> — or <b>kaisi</b>, <b>rahi</b>, which you'll also hear a lot</li></ul>The only real slip: <b>kaisi</b> / <b>rahi</b> for Uncle.",
          examples: ["u_kaise", "a_kaisi", "u_kya", "a_kya"] },
        { kind: "swap", kicker: "Aunty or Uncle", title: "Tap each one and spot the difference", options: ["a_kaisi", "u_kaise", "a_kya", "u_kya"],
          note: "Only the words for <i>them</i> change. <b>aap</b> and <b>hain</b> stay the same. (For Aunty, kaise / rahe is fine too.)" },
        { kind: "quiz", q: { prompt: "You're asking Uncle what he's doing:", options: ["Uncle, aap kya kar rahe hain?", "Uncle, aap kya kar rahi hain?", "Uncle, aap kya kar rahe hoon?"], answer: 0,
          whys: ["", "<b>rahi</b> is for Aunty. For Uncle it's <b>rahe</b>.", "<b>hoon</b> is “I am”. With aap, it's <b>hain</b>."] } },
        { kind: "tip", kicker: "How are things?", title: "Two easy check-ins",
          html: "<ul><li><b>Aapka din kaisa tha?</b> = How was your day?</li><li><b>Sab kaisa chal raha hai?</b> = How's everything going?</li></ul>Here <b>raha</b> goes with <i>sab</i> (everything), not with you — so it stays <b>raha</b>.",
          examples: ["din", "sab_kaisa"] },
        { kind: "order", item: "a_kaisi", chunks: [["aunty"], ["aap"], ["kaisi"], ["hain"]] }
      ],
      items: [
        { id: "u_kaise", en: "Uncle, how are you?", roman: "Uncle, aap kaise hain?", deva: "अंकल, आप कैसे हैं?", tokens: ["uncle", "aap", "kaise", "hain"], alts: [["uncle", "ji", "aap", "kaise", "hain"], ["aap", "kaise", "hain"], ["namaste", "uncle", "ji", "aap", "kaise", "hain"]], chip: "👨🏽 Uncle: how?" },
        { id: "a_kaisi", en: "Aunty, how are you?", roman: "Aunty, aap kaisi hain?", deva: "आंटी, आप कैसी हैं?", tokens: ["aunty", "aap", "kaisi", "hain"], alts: [["aunty", "ji", "aap", "kaisi", "hain"], ["aap", "kaisi", "hain"], ["namaste", "aunty", "ji", "aap", "kaisi", "hain"]], chip: "👩🏽 Aunty: how?" },
        { id: "a_kya", en: "Aunty, what are you doing?", roman: "Aunty, aap kya kar rahi hain?", deva: "आंटी, आप क्या कर रही हैं?", tokens: ["aunty", "aap", "kya", "kar", "rahi", "hain"], alts: [["aunty", "ji", "aap", "kya", "kar", "rahi", "hain"]], chip: "👩🏽 Aunty: doing?" },
        { id: "u_kya", en: "Uncle, what are you doing?", roman: "Uncle, aap kya kar rahe hain?", deva: "अंकल, आप क्या कर रहे हैं?", tokens: ["uncle", "aap", "kya", "kar", "rahe", "hain"], alts: [["uncle", "ji", "aap", "kya", "kar", "rahe", "hain"]], chip: "👨🏽 Uncle: doing?" },
        { id: "a_tv", en: "Aunty, are you watching TV?", roman: "Aunty, aap TV dekh rahi hain?", deva: "आंटी, आप टीवी देख रही हैं?", tokens: ["aunty", "aap", "tv", "watch", "rahi", "hain"], alts: [["aunty", "kya", "aap", "tv", "watch", "rahi", "hain"]] },
        { id: "u_chai", en: "Uncle, are you drinking chai?", roman: "Uncle, aap chai pee rahe hain?", deva: "अंकल, आप चाय पी रहे हैं?", tokens: ["uncle", "aap", "chai", "drink", "rahe", "hain"], alts: [["uncle", "kya", "aap", "chai", "drink", "rahe", "hain"]] },
        { id: "u_theek", en: "Uncle, are you okay?", roman: "Uncle, aap theek hain?", deva: "अंकल, आप ठीक हैं?", tokens: ["uncle", "aap", "theek", "hain"], alts: [["uncle", "kya", "aap", "theek", "hain"]] },
        { id: "din", en: "How was your day?", roman: "Aapka din kaisa tha?", deva: "आपका दिन कैसा था?", tokens: ["aapka", "din", "kaisa", "tha"] },
        { id: "sab_kaisa", en: "How's everything going?", roman: "Sab kaisa chal raha hai?", deva: "सब कैसा चल रहा है?", tokens: ["sab", "kaisa", "chal", "raha", "hai"] }
      ],
      quiz: [
        { prompt: "Ask Aunty “How are you?”", options: ["Aunty, aap kaisi hain?", "Aunty, aap kaisi hoon?", "Aunty, tum kaisi ho?"], answer: 0, whys: ["", "<b>hoon</b> is “I am”. With aap it's <b>hain</b>. (Aunty, aap kaise hain? is fine too.)", "“Tum” is too casual for elders — use <b>aap … hain</b>."] },
        { prompt: "Asking Uncle: kaise or kaisi?", options: ["kaise", "kaisi"], answer: 0, whys: ["", "<b>kaisi</b> is for Aunty. Uncle → <b>kaise</b>."] },
        { prompt: "Which is the respectful “live” your teacher taught?", options: ["rehte hain", "rehta hai", "rehti hoon"], answer: 0, whys: ["", "<b>rehta</b> is the male form for one person.", "<b>rehti hoon</b> is for yourself (a woman)."] },
        { prompt: "Asking Uncle: rahe or rahi?", options: ["rahe", "rahi"], answer: 0, whys: ["", "<b>rahi</b> is for Aunty. Uncle → <b>rahe</b>."] },
        { prompt: "What does this mean?", hi: "Aapka din kaisa tha?", dv: "आपका दिन कैसा था?", options: ["How was your day?", "What are you doing?", "Where are you?"], answer: 0, whys: ["", "That's <b>Aap kya kar rahe hain?</b>", "“din” means day — it's “How was your day?”"] },
        { prompt: "Uncle sounds busy. Ask how everything's going:", options: ["Sab kaisa chal raha hai?", "Aap kaise ho?", "Main busy hoon."], answer: 0, whys: ["", "With aap use <b>hain</b> — and this asks “how are you”, not “how's everything”.", "That's about you!"] },
        { prompt: "With aap, which word ends the question?", options: ["hain", "hoon", "ho"], answer: 0, whys: ["", "<b>hoon</b> is only for “I am”.", "<b>ho</b> goes with tum — with aap it's <b>hain</b>."] }
      ],
      transforms: [["u_kaise", "a_kaisi"], ["u_kya", "a_kya"], ["a_kya", "a_tv"], ["u_chai", "u_kya"], ["u_theek", "u_kaise"]],
      chat: {
        who: "uncle",
        lines: [
          { them: "Namaste Anissa!", dv: "नमस्ते अनीसा!", en: "Hello Anissa!" },
          { type: "u_kaise", goal: "Ask Uncle how he is." },
          { them: "Main theek hoon, beta. Thoda busy hoon.", dv: "मैं ठीक हूँ, बेटा। थोड़ा बिज़ी हूँ।", en: "I'm fine, dear. A little busy." },
          { pick: [{ text: "Uncle, aap kya kar rahe hain?", ok: true }, { text: "Uncle, aap kya kar rahi hain?", why: "For Uncle it's <b>rahe</b>." }, { text: "Uncle, aap kya kar rahe hoon?", why: "With aap, end with <b>hain</b>." }] },
          { them: "Main kaam kar raha hoon. Aunty khana bana rahi hain.", dv: "मैं काम कर रहा हूँ। आंटी खाना बना रही हैं।", en: "I'm working. Aunty is cooking. (Notice: Uncle says raha — he's a man!)" },
          { type: "sab_kaisa", goal: "Ask: how's everything going?" },
          { them: "Sab badhiya! Tumhara din kaisa tha?", dv: "सब बढ़िया! तुम्हारा दिन कैसा था?", en: "All great! How was your day?" },
          { pick: [{ text: "Bahut accha tha! Main bahut khush hoon.", ok: true }, { text: "Uncle, aap kaise hain?", why: "You already asked that 😄 — tell him about your day." }] },
          { them: "Khush raho! 😊", dv: "खुश रहो!", en: "Stay happy!" }
        ]
      }
    },

    /* ============================ MODULE 6 ============================ */
    {
      id: "m6", number: 6, icon: "🍛", title: "Food & Home", tagline: "Compliment the food, say what you like, and say when you're full", minutes: "15",
      stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "Compliments, “I like…”, and dinner-table phrases." },
        quiz: { icon: "🍽️", title: "At the Table", desc: "Real dinner moments — pick what you'd say." },
        chat: { title: "Dinner with Aunty", desc: "Aunty made dinner. Tell her what you think!" }
      },
      formula: [["Mujhe", "subject"], ["thing", "thing"], ["pasand hai", "other"]],
      formulaText: "Mujhe + thing + pasand hai",
      mistakes: [NOT_TUM],
      confusions: [["hoon", "hai", "<b>hoon</b> is only “I am”. Here it's <b>hai</b> (is)."], ["main", "mujhe", "For “I like”, Hindi says <b>Mujhe</b> (to me): Mujhe … pasand hai."], ["gayi", "gaya", "Here <b>gaya</b> goes with <i>pet</i> (stomach), not with you — so it stays gaya."]],
      cards: [
        { id: "accha", roman: "accha", deva: "अच्छा", en: "good / nice", emoji: "👌🏽", sounds: "UTCH-chaa" },
        { id: "mujhe", roman: "mujhe", deva: "मुझे", en: "to me (for “I like”)", emoji: "🙋🏽‍♀️", sounds: "MOO-jhay" },
        { id: "pasand", roman: "pasand", deva: "पसंद", en: "liked", emoji: "❤️", sounds: "puh-SUND" },
        { id: "dal", roman: "dal", deva: "दाल", en: "dal (lentils)", emoji: "🥣", sounds: "DAAL" },
        { id: "roti", roman: "roti", deva: "रोटी", en: "roti (flatbread)", emoji: "🫓", sounds: "RO-tee" },
        { id: "thoda", roman: "thoda aur", deva: "थोड़ा और", en: "a little more", emoji: "🤏🏽", sounds: "THO-daa or" },
        { id: "bas", roman: "bas", deva: "बस", en: "enough / that's it", emoji: "✋🏽", sounds: "like “bus”" },
        { id: "mithai", roman: "mithai", deva: "मिठाई", en: "sweets", emoji: "🍬", sounds: "mi-THAI" }
      ],
      lesson: [
        { kind: "explain", kicker: "The best compliment", title: "Tap each block to see what it means",
          blocks: [[["khana"], "food"], [["bahut"], "very"], [["accha"], "good"], [["hai"], "is"]],
          roman: "Khana bahut accha hai!", deva: "खाना बहुत अच्छा है!", en: "The food is really good!", emoji: "😋",
          note: "<b>hai</b> = is. (Remember: <b>hoon</b> is only for “I am”.) Say this at every meal 😄" },
        { kind: "tip", kicker: "“I like…”", title: "Hindi says it the other way round",
          html: "<b>Mujhe chai pasand hai</b> = literally “To me, chai is liked.”<br>Just swap the food in the middle: <b>Mujhe ___ pasand hai</b>.",
          examples: ["p_chai", "p_dal", "p_roti"] },
        { kind: "swap", kicker: "What do you like?", title: "Tap each one", options: ["p_chai", "p_dal", "p_roti", "p_chawal"],
          note: "Only the food changes. <b>Mujhe … pasand hai</b> stays the same." },
        { kind: "tip", kicker: "At the dinner table", title: "More, enough, full",
          html: "<ul><li><b>Thoda aur, please</b> = a little more, please</li><li><b>Bas, shukriya</b> = that's enough, thanks</li><li><b>Mera pet bhar gaya</b> = I'm full (my stomach filled)</li></ul>In “bhar <b>gaya</b>”, gaya goes with <i>pet</i>, not with you — so it stays gaya.",
          examples: ["thoda", "bas", "pet"] },
        { kind: "quiz", q: { prompt: "Aunty offers more food. You're full. What do you say?", options: ["Bas, shukriya.", "Thoda aur, please.", "Mujhe bhookh lagi hai."], answer: 0,
          whys: ["", "That asks for more! 😄", "That means “I'm hungry”."] } },
        { kind: "order", item: "p_chai", chunks: [["mujhe"], ["chai"], ["pasand"], ["hai"]] }
      ],
      items: [
        { id: "accha", en: "The food is really good!", roman: "Khana bahut accha hai!", deva: "खाना बहुत अच्छा है!", tokens: ["khana", "bahut", "accha", "hai"], alts: [["khana", "accha", "hai"], ["khana", "bahut", "tasty", "hai"]] },
        { id: "tasty", en: "It's very tasty!", roman: "Bahut tasty hai!", deva: "बहुत टेस्टी है!", tokens: ["bahut", "tasty", "hai"] },
        { id: "p_chai", en: "I like chai.", roman: "Mujhe chai pasand hai.", deva: "मुझे चाय पसंद है।", tokens: ["mujhe", "chai", "pasand", "hai"], chip: "🍵 chai" },
        { id: "p_dal", en: "I like dal.", roman: "Mujhe dal pasand hai.", deva: "मुझे दाल पसंद है।", tokens: ["mujhe", "dal", "pasand", "hai"], chip: "🥣 dal" },
        { id: "p_roti", en: "I like roti.", roman: "Mujhe roti pasand hai.", deva: "मुझे रोटी पसंद है।", tokens: ["mujhe", "roti", "pasand", "hai"], chip: "🫓 roti" },
        { id: "p_chawal", en: "I like rice.", roman: "Mujhe chawal pasand hai.", deva: "मुझे चावल पसंद है।", tokens: ["mujhe", "chawal", "pasand", "hai"], chip: "🍚 chawal" },
        { id: "p_mithai", en: "I really like sweets!", roman: "Mujhe mithai bahut pasand hai!", deva: "मुझे मिठाई बहुत पसंद है!", tokens: ["mujhe", "mithai", "bahut", "pasand", "hai"], alts: [["mujhe", "mithai", "pasand", "hai"]] },
        { id: "p_dal_bahut", en: "I really like dal!", roman: "Mujhe dal bahut pasand hai!", deva: "मुझे दाल बहुत पसंद है!", tokens: ["mujhe", "dal", "bahut", "pasand", "hai"], alts: [["haan", "ji", "mujhe", "dal", "bahut", "pasand", "hai"], ["haan", "mujhe", "dal", "bahut", "pasand", "hai"], ["mujhe", "dal", "pasand", "hai"]] },
        { id: "thoda", en: "A little more, please.", roman: "Thoda aur, please.", deva: "थोड़ा और, प्लीज़।", tokens: ["thoda", "aur", "please"], alts: [["thoda", "aur"]] },
        { id: "bas", en: "That's enough, thank you.", roman: "Bas, shukriya.", deva: "बस, शुक्रिया।", tokens: ["bas", "shukriya"], alts: [["bas", "ji", "shukriya"]] },
        { id: "pet", en: "I'm full.", roman: "Mera pet bhar gaya.", deva: "मेरा पेट भर गया।", tokens: ["mera", "pet", "bhar", "gaya"] },
        { id: "bhookh", en: "I'm hungry.", roman: "Mujhe bhookh lagi hai.", deva: "मुझे भूख लगी है।", tokens: ["mujhe", "bhookh", "lagi", "hai"] }
      ],
      quiz: [
        { prompt: "Say you like dal:", options: ["Mujhe dal pasand hai.", "Main dal pasand hoon.", "Mujhe pasand dal hai."], answer: 0, whys: ["", "Hindi says “to me, it is liked”: <b>Mujhe … pasand hai</b>.", "The food goes in the middle: <b>Mujhe dal pasand hai</b>."] },
        { prompt: "Compliment Aunty's cooking:", options: ["Khana bahut accha hai!", "Khana bahut accha hoon!", "Main khana kha rahi hoon."], answer: 0, whys: ["", "<b>hoon</b> means “I am”. The food <i>is</i> good: <b>hai</b>.", "True — but it's not a compliment! 😄"] },
        { prompt: "You'd like a bit more. Say:", options: ["Thoda aur, please.", "Bas, shukriya.", "Mera pet bhar gaya."], answer: 0, whys: ["", "That means “that's enough”.", "That means “I'm full”."] },
        { prompt: "What does this mean?", hi: "Mera pet bhar gaya.", dv: "मेरा पेट भर गया।", options: ["I'm full.", "I'm hungry.", "I like it."], answer: 0, whys: ["", "Hungry is <b>Mujhe bhookh lagi hai</b>.", "“I like it” uses <b>pasand</b>."] },
        { prompt: "What does this mean?", hi: "Mujhe bhookh lagi hai.", dv: "मुझे भूख लगी है।", options: ["I'm hungry.", "I'm full.", "I'm tired."], answer: 0, whys: ["", "Full is <b>Mera pet bhar gaya</b>.", "Tired is <b>Main thak gayi hoon</b>."] },
        { prompt: "What does bas mean?", hi: "bas", options: ["enough", "more", "very"], answer: 0, whys: ["", "More is <b>aur</b>.", "Very is <b>bahut</b>."] }
      ],
      transforms: [["p_chai", "p_dal"], ["p_dal", "p_roti"], ["p_roti", "p_chawal"]],
      chat: {
        who: "aunty",
        lines: [
          { them: "Anissa, khana kaisa hai?", dv: "अनीसा, खाना कैसा है?", en: "Anissa, how's the food?" },
          { type: "accha", goal: "Tell her the food is really good!" },
          { them: "Shukriya beta! Aur logi?", dv: "शुक्रिया बेटा! और लोगी?", en: "Thank you dear! Will you have more?" },
          { pick: [{ text: "Thoda aur, please!", ok: true }, { text: "Bas, shukriya. Mera pet bhar gaya.", ok: true }, { text: "Mujhe bhookh pasand hai.", why: "That means “I like hunger” 😄" }] },
          { them: "Dal aur logi? Mujhe pata hai tumhe dal pasand hai! 😄", dv: "दाल और लोगी? मुझे पता है तुम्हें दाल पसंद है!", en: "More dal? I know you like dal!" },
          { type: "p_dal_bahut", goal: "Tell her you really like dal!" },
          { them: "Aur mithai khaogi?", dv: "और मिठाई खाओगी?", en: "Will you have some sweets?" },
          { pick: [{ text: "Haan ji! Mujhe mithai bahut pasand hai!", ok: true }, { text: "Bas, shukriya. Mera pet bhar gaya!", ok: true }, { text: "Main mithai hoon.", why: "That means “I am sweets” 😄" }] },
          { them: "Haha, theek hai! 😊", dv: "हाहा, ठीक है!", en: "Haha, okay!" }
        ]
      }
    },

    /* ============================ MODULE 7 ============================ */
    {
      id: "m7", number: 7, icon: "📅", title: "Today & Plans", tagline: "Say where you are, where you're going, and when you'll come", minutes: "15",
      stages: ["learn", "words", "quiz", "build", "transform", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "Going, coming, at home — and time words." },
        quiz: { icon: "🗓️", title: "When & Where?", desc: "Pick the right words for plans and places." },
        chat: { title: "Call with Uncle", desc: "Uncle wants to know your plans." }
      },
      formula: [["(aaj / kal)", "other"], ["Main", "subject"], ["place", "thing"], ["ja rahi hoon", "verb"]],
      formulaText: "(aaj / kal / abhi) + Main + place + ja rahi hoon",
      mistakes: [RAHA_FEMALE, { words: ["aaunga", "aunga"], why: "“Aaunga” is the male form. You say <b>aaungi</b>." }],
      confusions: [["aa", "ja", "<b>aa</b> = come, <b>ja</b> = go. You're going somewhere: <b>ja</b>."], ["ja", "aa", "<b>ja</b> = go, <b>aa</b> = come. You're coming: <b>aa</b>."], ["kal", "aaj", "<b>kal</b> is tomorrow — today is <b>aaj</b>."], ["aaj", "kal", "<b>aaj</b> is today — tomorrow is <b>kal</b>."]],
      cards: [
        { id: "aaj", roman: "aaj", deva: "आज", en: "today", emoji: "📍", sounds: "AAJ" },
        { id: "kal", roman: "kal", deva: "कल", en: "tomorrow (or yesterday!)", emoji: "📆", sounds: "like “cull”" },
        { id: "abhi", roman: "abhi", deva: "अभी", en: "right now", emoji: "⏱️", sounds: "uh-BHEE" },
        { id: "ja", roman: "ja", deva: "जा", en: "go", emoji: "🚶🏽‍♀️", sounds: "JAA" },
        { id: "aa", roman: "aa", deva: "आ", en: "come", emoji: "🏃🏽‍♀️", sounds: "AA" },
        { id: "ghar", roman: "ghar", deva: "घर", en: "home", emoji: "🏠", sounds: "like “gur” with a breathy gh" },
        { id: "par", roman: "par", deva: "पर", en: "at / on (also “pe”)", emoji: "📌", sounds: "like “per”" },
        { id: "aaungi", roman: "aaungi", deva: "आऊँगी", en: "I'll come (female)", emoji: "🗓️", sounds: "AA-oon-gee" }
      ],
      lesson: [
        { kind: "explain", kicker: "Going places", title: "Tap each block to see what it means",
          blocks: [[["main"], "I"], [["ghar"], "home"], [["ja"], "go"], [["rahi", "hoon"], "am …-ing"]],
          roman: "Main ghar ja rahi hoon.", deva: "मैं घर जा रही हूँ।", en: "I'm going home.", emoji: "🏠",
          note: "Same pattern as “Chai, TV aur Kaam” — the <b>place</b> goes where the thing went. (No word for “to” needed!)" },
        { kind: "tip", kicker: "Add a time", title: "aaj, kal, abhi",
          html: "Put a time word at the start:<ul><li><b>aaj</b> = today</li><li><b>kal</b> = tomorrow (and also yesterday — context tells you!)</li><li><b>abhi</b> = right now</li></ul>",
          examples: ["office", "abhi_kaam", "market"] },
        { kind: "swap", kicker: "Where are you going?", title: "Tap each place", options: ["ghar_ja", "gym", "office"],
          note: "Your family will say these English place words too: office, gym, market." },
        { kind: "tip", kicker: "Here, coming, later", title: "Three handy lines",
          html: "<ul><li><b>Main ghar par hoon</b> = I'm at home (your class's “ghar <b>mei</b>” and “ghar <b>pe</b>” work too)</li><li><b>Main aa rahi hoon!</b> = I'm coming!</li><li><b>Kal main aaungi</b> = I'll come tomorrow — the <b>-i</b> ending is the female form again ✨</li></ul>",
          examples: ["ghar_par", "aa_rahi", "kal_aaungi"] },
        { kind: "quiz", q: { prompt: "Uncle asks “Kahan ho?” (Where are you?). You're at home.", options: ["Main ghar par hoon.", "Main ghar ja rahi hoon.", "Main ghar hoon par."], answer: 0,
          whys: ["", "That means “I'm going home”.", "Order: <b>ghar par hoon</b>."] } },
        { kind: "order", item: "ghar_ja", chunks: [["main"], ["ghar"], ["ja"], ["rahi", "hoon"]] }
      ],
      items: [
        { id: "office", en: "Today I'm going to the office.", roman: "Aaj main office ja rahi hoon.", deva: "आज मैं ऑफिस जा रही हूँ।", tokens: ["aaj", "main", "office", "ja", "rahi", "hoon"], alts: [["main", "aaj", "office", "ja", "rahi", "hoon"]], chip: "🏢 office" },
        { id: "ghar_ja", en: "I'm going home.", roman: "Main ghar ja rahi hoon.", deva: "मैं घर जा रही हूँ।", tokens: ["main", "ghar", "ja", "rahi", "hoon"], chip: "🏠 home" },
        { id: "gym", en: "I'm going to the gym.", roman: "Main gym ja rahi hoon.", deva: "मैं जिम जा रही हूँ।", tokens: ["main", "gym", "ja", "rahi", "hoon"], chip: "🏋🏽‍♀️ gym" },
        { id: "ghar_par", en: "I'm at home.", roman: "Main ghar par hoon.", deva: "मैं घर पर हूँ।", tokens: ["main", "ghar", "par", "hoon"], alts: [["main", "ghar", "mei", "hoon"]] },
        { id: "abhi_kaam", en: "Right now I'm working.", roman: "Abhi main kaam kar rahi hoon.", deva: "अभी मैं काम कर रही हूँ।", tokens: ["abhi", "main", "kaam", "kar", "rahi", "hoon"], alts: [["main", "abhi", "kaam", "kar", "rahi", "hoon"]] },
        { id: "aa_rahi", en: "I'm coming!", roman: "Main aa rahi hoon!", deva: "मैं आ रही हूँ!", tokens: ["main", "aa", "rahi", "hoon"] },
        { id: "kal_aaungi", en: "I'll come tomorrow.", roman: "Kal main aaungi.", deva: "कल मैं आऊँगी।", tokens: ["kal", "main", "aaungi"], alts: [["main", "kal", "aaungi"], ["haan", "ji", "kal", "main", "aaungi"], ["haan", "kal", "main", "aaungi"], ["haan", "ji", "main", "kal", "aaungi"]] },
        { id: "market", en: "Tomorrow I'm going to the market.", roman: "Kal main market ja rahi hoon.", deva: "कल मैं मार्केट जा रही हूँ।", tokens: ["kal", "main", "market", "ja", "rahi", "hoon"], alts: [["main", "kal", "market", "ja", "rahi", "hoon"]] },
        { id: "kal_ghar", en: "Tomorrow I'm going home.", roman: "Kal main ghar ja rahi hoon.", deva: "कल मैं घर जा रही हूँ।", tokens: ["kal", "main", "ghar", "ja", "rahi", "hoon"], alts: [["main", "kal", "ghar", "ja", "rahi", "hoon"]] }
      ],
      quiz: [
        { prompt: "What does kal mean?", hi: "kal", options: ["tomorrow (or yesterday)", "today", "right now"], answer: 0, whys: ["", "Today is <b>aaj</b>.", "Right now is <b>abhi</b>."] },
        { prompt: "Say “Today I'm going to the office”:", options: ["Aaj main office ja rahi hoon.", "Aaj main office aa rahi hoon.", "Kal main office ja rahi hoon."], answer: 0, whys: ["", "<b>aa</b> = come. Going is <b>ja</b>.", "<b>kal</b> = tomorrow. Today is <b>aaj</b>."] },
        { prompt: "Aunty calls you down for dinner. You're on your way!", options: ["Main aa rahi hoon!", "Main ja rahi hoon!", "Kal main aaungi."], answer: 0, whys: ["", "<b>ja</b> = going away 😄 Coming is <b>aa</b>.", "That's “I'll come tomorrow” — dinner's now!"] },
        { prompt: "What does this mean?", hi: "Kal main aaungi.", dv: "कल मैं आऊँगी।", options: ["I'll come tomorrow.", "I'm coming now.", "I went yesterday."], answer: 0, whys: ["", "Now would be <b>Main aa rahi hoon</b>.", "<b>aaungi</b> is the future: I <i>will</i> come."] },
        { prompt: "What does this mean?", hi: "Kahan ho?", dv: "कहाँ हो?", options: ["Where are you?", "How are you?", "What are you doing?"], answer: 0, whys: ["", "How are you is <b>Kaisi ho?</b>", "That's <b>Kya kar rahi ho?</b>"] },
        { prompt: "Why “aaungi” and not “aaunga”?", options: ["-i is the female ending", "aaungi is more polite", "aaunga means yesterday"], answer: 0, whys: ["", "It's about who's speaking — you're a woman: <b>aaungi</b>.", "It's about who's speaking — you're a woman: <b>aaungi</b>."] }
      ],
      transforms: [["ghar_ja", "gym"], ["office", "market"], ["market", "kal_ghar"]],
      chat: {
        who: "uncle",
        lines: [
          { them: "Hello Anissa! Kahan ho?", dv: "हैलो अनीसा! कहाँ हो?", en: "Hello Anissa! Where are you?" },
          { type: "ghar_par", goal: "Tell him you're at home." },
          { them: "Accha. Aaj kya kar rahi ho?", dv: "अच्छा। आज क्या कर रही हो?", en: "Okay. What are you doing today?" },
          { pick: [{ text: "Aaj main market ja rahi hoon.", ok: true }, { text: "Abhi main kaam kar rahi hoon.", ok: true }, { text: "Kal main aaungi.", why: "That answers “When will you come?”" }] },
          { them: "Kal ghar aaogi? Aunty khana bana rahi hain.", dv: "कल घर आओगी? आंटी खाना बना रही हैं।", en: "Will you come over tomorrow? Aunty is cooking." },
          { type: "kal_aaungi", goal: "Say: yes, I'll come tomorrow!" },
          { them: "Bahut badhiya! Phir milte hain.", dv: "बहुत बढ़िया! फिर मिलते हैं।", en: "Wonderful! See you then." },
          { pick: [{ text: "Bye Uncle ji! 👋", ok: true }] }
        ]
      }
    },

    /* ============================ MODULE 8 ============================ */
    {
      id: "m8", number: 8, icon: "📞", title: "The Family Call", tagline: "Put it all together in a real call with Aunty and Uncle", minutes: "15–20",
      stages: ["learn", "words", "quiz", "build", "chat", "challenge"],
      stageInfo: {
        learn: { desc: "Conversation glue — the little words that make chats flow." },
        words: { title: "Conversation Glue", desc: "Bilkul, chalo, phir milte hain…" },
        quiz: { icon: "🧠", title: "Mixed Review", desc: "A bit of everything from the earlier modules." },
        build: { desc: "Build sentences from every module." },
        chat: { title: "The Family Call", desc: "A full call with Aunty, then Uncle. You've got this!" }
      },
      formula: [["Everything you've learned", "other"]],
      formulaText: "everything you've learned",
      mistakes: [RAHA_FEMALE, NOT_TUM],
      softSwaps: [["kaisi", "kaise", KAISE_OK], ["rahi", "rahe", "Correct — the respectful <b>rahe hain</b> works for anyone."]],
      confusions: [["rahi", "rahe", "For Uncle it's <b>rahe</b>."], ["kaisi", "kaise", "For Uncle it's <b>kaise</b>."], ["hoon", "hain", "With <b>aap</b>, it's <b>hain</b>."], ["hai", "hoon", "With <b>Main</b>, it's <b>hoon</b>."], ["kar", "watch", "You watch TV: <b>dekh</b>."], ["kar", "drink", "You drink chai: <b>pee</b>."]],
      cards: [
        { id: "accha2", roman: "Accha!", deva: "अच्छा!", en: "Oh, okay! / Nice!", emoji: "😮", sounds: "UTCH-chaa" },
        { id: "bilkul", roman: "bilkul", deva: "बिल्कुल", en: "absolutely", emoji: "💯", sounds: "BIL-kool" },
        { id: "theek_hai", roman: "theek hai", deva: "ठीक है", en: "okay / alright", emoji: "👌🏽", sounds: "teek hai" },
        { id: "chalo", roman: "chalo", deva: "चलो", en: "alright then / let's go", emoji: "👋🏽", sounds: "CHUH-lo" },
        { id: "phir", roman: "phir milte hain", deva: "फिर मिलते हैं", en: "see you later", emoji: "🤗", sounds: "fir MIL-tay hain" },
        { id: "bye", roman: "bye", deva: "बाय", en: "bye", emoji: "👋🏽", sounds: "like English “bye”" }
      ],
      lesson: [
        { kind: "tip", kicker: "Conversation glue", title: "Little words, big difference",
          html: "These tiny words make you sound natural:<ul><li><b>Accha!</b> = Oh okay! / Nice!</li><li><b>Bilkul!</b> = Absolutely!</li><li><b>Theek hai</b> = Okay</li><li><b>Chalo, bye!</b> = Alright, bye!</li><li><b>Phir milte hain</b> = See you later</li></ul>",
          examples: ["bilkul", "theek_hai", "chalo_bye", "phir"] },
        { kind: "tip", kicker: "Your toolkit", title: "Everything you can already say",
          html: "<ul><li><b>Main + verb + rahi hoon</b> — what you're doing</li><li><b>Main + thing + verb/kar + rahi hoon</b> — chai, TV, kaam, shopping…</li><li><b>Main + feeling + hoon</b> — theek, khush, busy, thak gayi</li><li><b>Haan ji / Nahin ji</b> — polite answers</li><li><b>Aunty, aap kaisi hain? / Uncle, aap kaise hain?</b></li><li><b>Mujhe … pasand hai</b> — what you like</li><li><b>Aaj / kal + Main + place + ja rahi hoon</b> — plans</li></ul>" },
        { kind: "quiz", q: { prompt: "Uncle says “Kal aaogi?” (Will you come tomorrow?). Say “Absolutely! I'll come tomorrow.”", options: ["Bilkul! Kal main aaungi.", "Bilkul! Kal main aaunga.", "Bilkul! Aaj main aa rahi hoon."], answer: 0,
          whys: ["", "<b>aaunga</b> is the male form — you say <b>aaungi</b>.", "He asked about tomorrow — <b>kal</b>."] } },
        { kind: "order", item: "phir", chunks: [["phir"], ["milte"], ["hain"]] }
      ],
      items: [
        { id: "bilkul", en: "Absolutely!", roman: "Bilkul!", deva: "बिल्कुल!", tokens: ["bilkul"], noBuild: true },
        { id: "theek_hai", en: "Okay!", roman: "Theek hai!", deva: "ठीक है!", tokens: ["theek", "hai"], noBuild: true },
        { id: "phir", en: "See you later!", roman: "Phir milte hain!", deva: "फिर मिलते हैं!", tokens: ["phir", "milte", "hain"] },
        { id: "chalo_bye", en: "Alright, bye!", roman: "Chalo, bye!", deva: "चलो, बाय!", tokens: ["chalo", "bye"] },
        { id: "r_run", en: "I am running.", roman: "Main bhaag rahi hoon.", deva: "मैं भाग रही हूँ।", tokens: ["main", "run", "rahi", "hoon"] },
        { id: "r_chai", en: "I am drinking chai.", roman: "Main chai pee rahi hoon.", deva: "मैं चाय पी रही हूँ।", tokens: ["main", "chai", "drink", "rahi", "hoon"] },
        { id: "r_shopping", en: "I am shopping.", roman: "Main shopping kar rahi hoon.", deva: "मैं शॉपिंग कर रही हूँ।", tokens: ["main", "shopping", "kar", "rahi", "hoon"] },
        { id: "r_thak", en: "I'm tired.", roman: "Main thak gayi hoon.", deva: "मैं थक गई हूँ।", tokens: ["main", "thak", "gayi", "hoon"] },
        { id: "r_sab", en: "Yes, everything's fine.", roman: "Haan ji, sab theek hai.", deva: "हाँ जी, सब ठीक है।", tokens: ["haan", "ji", "sab", "theek", "hai"], alts: [["haan", "sab", "theek", "hai"], ["sab", "theek", "hai"]] },
        { id: "r_u_kaise", en: "Uncle, how are you?", roman: "Uncle, aap kaise hain?", deva: "अंकल, आप कैसे हैं?", tokens: ["uncle", "aap", "kaise", "hain"], alts: [["uncle", "ji", "aap", "kaise", "hain"], ["aap", "kaise", "hain"], ["namaste", "uncle", "ji", "aap", "kaise", "hain"], ["namaste", "uncle", "aap", "kaise", "hain"]] },
        { id: "r_a_kya", en: "Aunty, what are you doing?", roman: "Aunty, aap kya kar rahi hain?", deva: "आंटी, आप क्या कर रही हैं?", tokens: ["aunty", "aap", "kya", "kar", "rahi", "hain"], alts: [["aunty", "ji", "aap", "kya", "kar", "rahi", "hain"]] },
        { id: "r_khana", en: "The food is really good!", roman: "Khana bahut accha hai!", deva: "खाना बहुत अच्छा है!", tokens: ["khana", "bahut", "accha", "hai"], alts: [["khana", "accha", "hai"]] },
        { id: "r_dal", en: "I really like dal!", roman: "Mujhe dal bahut pasand hai!", deva: "मुझे दाल बहुत पसंद है!", tokens: ["mujhe", "dal", "bahut", "pasand", "hai"], alts: [["mujhe", "dal", "pasand", "hai"], ["haan", "ji", "mujhe", "dal", "bahut", "pasand", "hai"], ["haan", "mujhe", "dal", "bahut", "pasand", "hai"]] },
        { id: "r_kal", en: "I'll come tomorrow.", roman: "Kal main aaungi.", deva: "कल मैं आऊँगी।", tokens: ["kal", "main", "aaungi"], alts: [["main", "kal", "aaungi"], ["bilkul", "kal", "main", "aaungi"], ["haan", "ji", "kal", "main", "aaungi"]] },
        { id: "r_office", en: "Today I'm going to the office.", roman: "Aaj main office ja rahi hoon.", deva: "आज मैं ऑफिस जा रही हूँ।", tokens: ["aaj", "main", "office", "ja", "rahi", "hoon"], alts: [["main", "aaj", "office", "ja", "rahi", "hoon"]] }
      ],
      quiz: [
        { prompt: "Aunty asks “Kya kar rahi ho?”. You're cooking.", hi: "Kya kar rahi ho?", dv: "क्या कर रही हो?", options: ["Main cooking kar rahi hoon.", "Main cooking dekh rahi hoon.", "Main cooking hoon."], answer: 0, whys: ["", "English activity + <b>kar</b>: cooking kar.", "Add the action: <b>cooking kar rahi hoon</b>."] },
        { prompt: "Ask Uncle what he's doing:", options: ["Uncle, aap kya kar rahe hain?", "Uncle, aap kya kar rahi hain?", "Uncle, tum kya kar rahe ho?"], answer: 0, whys: ["", "For Uncle it's <b>rahe</b>.", "With elders use <b>aap … hain</b>."] },
        { prompt: "You're tired after work. Say it:", options: ["Main thak gayi hoon.", "Main thak gaya hoon.", "Main thak gayi hai."], answer: 0, whys: ["", "<b>gaya</b> is the male form — you say <b>gayi</b>.", "With Main, it's <b>hoon</b>."] },
        { prompt: "Aunty offers more dal. You're full.", options: ["Bas, shukriya. Mera pet bhar gaya.", "Thoda aur, please.", "Mujhe bhookh lagi hai."], answer: 0, whys: ["", "That asks for more!", "That means “I'm hungry”."] },
        { prompt: "Uncle asks “Khana khaya?”. You have.", hi: "Khana khaya?", dv: "खाना खाया?", options: ["Haan ji, kha liya.", "Abhi nahin.", "Main khana pasand hoon."], answer: 0, whys: ["", "That's “not yet” — but you have eaten!", "Just say <b>Haan ji, kha liya</b>."] },
        { prompt: "End the call nicely:", options: ["Chalo, phir milte hain! Bye!", "Namaste! Kaisi ho?", "Kya kar rahi ho?"], answer: 0, whys: ["", "That's how you start a call 😄", "That's a question for someone else!"] },
        { prompt: "Say “I like chai”:", options: ["Mujhe chai pasand hai.", "Main chai pasand hoon.", "Mujhe chai pee rahi hoon."], answer: 0, whys: ["", "Use <b>Mujhe … pasand hai</b>.", "Use <b>Mujhe … pasand hai</b>."] },
        { prompt: "Tomorrow you're going to the market:", options: ["Kal main market ja rahi hoon.", "Aaj main market ja rahi hoon.", "Kal main market aa rahi hoon."], answer: 0, whys: ["", "<b>aaj</b> is today — tomorrow is <b>kal</b>.", "<b>aa</b> = come. Going is <b>ja</b>."] }
      ],
      transforms: [],
      buildItems: ["r_run", "r_chai", "r_shopping", "r_thak", "r_sab", "r_u_kaise", "r_a_kya", "r_khana", "r_kal", "r_office"],
      chat: {
        who: "aunty",
        lines: [
          { them: "Hello Anissa beta! Kaisi ho?", dv: "हैलो अनीसा बेटा! कैसी हो?", en: "Hello Anissa dear! How are you?" },
          { pick: [{ text: "Namaste Aunty ji! Main theek hoon. Aur aap?", ok: true }, { text: "Namaste Aunty ji! Aap kahan hain?", why: "That asks “Where are you?” — she asked how <i>you</i> are. Answer first!" }] },
          { them: "Main bhi theek hoon. Kya kar rahi ho?", dv: "मैं भी ठीक हूँ। क्या कर रही हो?", en: "I'm fine too. What are you doing?" },
          { type: "r_chai", goal: "Tell her you're drinking chai." },
          { them: "Accha! Khana khaya?", dv: "अच्छा! खाना खाया?", en: "Oh nice! Have you eaten?" },
          { pick: [{ text: "Haan ji, kha liya.", ok: true }, { text: "Abhi nahin.", ok: true }, { text: "Haan ji, please!", why: "She asked if you've eaten — not offering anything yet 😄" }] },
          { them: "Theek hai. Ruko, Uncle se baat karo!", dv: "ठीक है। रुको, अंकल से बात करो!", en: "Okay. Wait, talk to Uncle!" },
          { them: "Namaste beta!", dv: "नमस्ते बेटा!", en: "Hello dear!", who: "uncle" },
          { type: "r_u_kaise", goal: "Greet Uncle and ask how he is." },
          { them: "Main bilkul theek hoon. Sab kaisa chal raha hai?", dv: "मैं बिल्कुल ठीक हूँ। सब कैसा चल रहा है?", en: "I'm totally fine. How's everything going?", who: "uncle" },
          { type: "r_sab", goal: "Say: yes, everything's fine." },
          { them: "Bahut accha. Kal ghar aaogi?", dv: "बहुत अच्छा। कल घर आओगी?", en: "Very good. Will you come over tomorrow?", who: "uncle" },
          { pick: [{ text: "Bilkul! Kal main aaungi.", ok: true }, { text: "Bilkul! Kal main aaunga.", why: "<b>aaunga</b> is the male form — you say <b>aaungi</b>." }, { text: "Main ghar par hoon.", why: "He's asking about tomorrow!" }] },
          { them: "Badhiya! Aunty tumhare liye dal bana rahi hain.", dv: "बढ़िया! आंटी तुम्हारे लिए दाल बना रही हैं।", en: "Great! Aunty is making dal for you.", who: "uncle" },
          { type: "r_dal", goal: "Say you really like dal!" },
          { them: "Haha! Chalo, phir milte hain.", dv: "हाहा! चलो, फिर मिलते हैं।", en: "Haha! Alright, see you then.", who: "uncle" },
          { pick: [{ text: "Phir milte hain, Uncle ji! Bye! 👋", ok: true }] }
        ]
      }
    }
  ];
  mods.forEach((m) => C.modules.push(m));
  C.modules.unshift(classMod, classMod2);            // her classes come first, in order

  // Speak It! — answer out loud, no tiles or typing. Questions (ask) and picture cues for her first class:
  const speakData = {
    main_theek: { ask: { hi: "Aap kaise hain?", dv: "आप कैसे हैं?", en: "How are you?" }, cue: "🙋🏽‍♀️ I · fine 👍🏽" },
    main_ghar: { ask: { hi: "Aap kahan hain?", dv: "आप कहाँ हैं?", en: "Where are you?" }, cue: "🙋🏽‍♀️ I · at 🏠 home" },
    mumma_kitchen: { ask: { hi: "Mumma kahan hain?", dv: "मम्मा कहाँ हैं?", en: "Where is Mom?" }, cue: "👩🏽 Mom · in 🍳 kitchen" },
    papa_live: { ask: { hi: "Papa kahan rehte hain?", dv: "पापा कहाँ रहते हैं?", en: "Where does Dad live?" }, cue: "👨🏽 Dad · lives · 🌴 California" },
    live_toronto: { ask: { hi: "Aap kahan rehti hain?", dv: "आप कहाँ रहती हैं?", en: "Where do you live?" }, cue: "🙋🏽‍♀️ I · live · 🏙️ Toronto" },
    remote_bahar: { ask: { hi: "Remote kahan hai?", dv: "रिमोट कहाँ है?", en: "Where is the remote?" }, cue: "📺 remote · 🌳 outside" },
    charger_kitchen: { ask: { hi: "Charger kahan hai?", dv: "चार्जर कहाँ है?", en: "Where is the charger?" }, cue: "🔌 charger · in 🍳 kitchen" },
    main_anissa: { cue: "🙋🏽‍♀️ I · Anissa" }, main_ladki: { cue: "🙋🏽‍♀️ I · girl" }, main_canadian: { cue: "🙋🏽‍♀️ I · Canadian 🍁" },
    aap_doctor: { cue: "🫵🏽 You · doctor 🩺" }, aap_kitchen: { cue: "🫵🏽 You · in 🍳 kitchen" }, kahan_mumma: { cue: "❓ Where · Mom" }
  };
  classMod.items.forEach((it) => Object.assign(it, speakData[it.id] || {}));
  // Every module gets a Speak It! stage before its final challenge (her request: practise out loud).
  C.modules.forEach((m) => {
    if (!Array.isArray(m.stages) || m.stages.includes("speak")) return;
    const at = m.stages.indexOf("challenge");
    m.stages.splice(at < 0 ? m.stages.length : at, 0, "speak");
  });
  C.modules.forEach((m, i) => (m.number = i + 1));   // numbers follow the order
})();
