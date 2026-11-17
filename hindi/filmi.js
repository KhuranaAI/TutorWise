/* =====================================================
   Bolo! — Filmi moments 🎬 (Shah Rukh Khan classics)
   -----------------------------------------------------
   Each moment unlocks when she finishes a stage (after: "moduleId:stageId") and uses
   something she has just learned. Only short famous lines are quoted; the scene itself
   opens on YouTube (q = search words). To play a specific clip inside the app instead,
   add  yt: "VIDEO_ID", start: seconds, end: seconds  (use an official channel's upload).
   ===================================================== */
window.BOLO_FILMI = [
  {
    id: "mainhoonna", after: "class1:learn", film: "Main Hoon Na", year: 2004,
    line: "Main hoon na!", dv: "मैं हूँ ना!", en: "I'm here for you, aren't I?",
    know: ["Main = I", "hoon = am"],
    note: "The title of SRK's 2004 hit — and it's your class's “Main … hoon”! The “na” at the end means “right?”.",
    q: "Main Hoon Na title song Shah Rukh Khan"
  },
  {
    id: "badebade", after: "class1:challenge", film: "Dilwale Dulhania Le Jayenge", year: 1995,
    line: "Bade bade deshon mein aisi chhoti chhoti baatein hoti rehti hain, Senorita.", dv: "बड़े बड़े देशों में ऐसी छोटी छोटी बातें होती रहती हैं, सेनोरिटा।",
    en: "In big countries, little things like this keep happening, Senorita.",
    know: ["mein = in (your “mei”)", "rehti hain — like rehti / rehte"],
    note: "Raj's cheeky line to Simran in Switzerland — one of the most quoted lines in Bollywood.",
    q: "DDLJ bade bade deshon mein scene"
  },
  {
    id: "pyaardosti", after: "class2:learn", film: "Kuch Kuch Hota Hai", year: 1998,
    line: "Pyaar dosti hai.", dv: "प्यार दोस्ती है।", en: "Love is friendship.",
    know: ["hai = is — same “… hai” as Voh … hai"],
    note: "Rahul's big belief in Kuch Kuch Hota Hai. Pyaar = love, dosti = friendship.",
    q: "Kuch Kuch Hota Hai pyaar dosti hai scene"
  },
  {
    id: "baazigar", after: "class2:challenge", film: "Baazigar", year: 1993,
    line: "Kabhi kabhi kuch jeetne ke liye kuch haarna padta hai… aur haar kar jeetne wale ko baazigar kehte hain.",
    dv: "कभी कभी कुछ जीतने के लिए कुछ हारना पड़ता है… और हार कर जीतने वाले को बाज़ीगर कहते हैं।",
    en: "Sometimes, to win something, you have to lose something… and the one who wins after losing is called a baazigar.",
    know: ["aur = and", "kehte hain — the respectful -te hain ending"],
    note: "The line that made SRK a superstar villain-hero.",
    q: "Baazigar haar kar jeetne wale ko baazigar kehte hain"
  },
  {
    id: "palat", after: "m1:words", film: "Dilwale Dulhania Le Jayenge", year: 1995,
    line: "Agar yeh tujhe pyaar karti hai, toh yeh palat ke dekhegi. Palat… palat… palat!",
    dv: "अगर यह तुझे प्यार करती है, तो यह पलट के देखेगी। पलट… पलट… पलट!",
    en: "If she loves you, she'll turn around and look. Turn… turn… turn!",
    know: ["karti hai = she does", "dekhegi = she will look (from dekh!)"],
    note: "Raj waits for Simran to turn around — the most famous moment in Bollywood.",
    q: "DDLJ palat palat scene"
  },
  {
    id: "tujhedekha", after: "m1:challenge", film: "Dilwale Dulhania Le Jayenge", year: 1995,
    line: "Tujhe dekha toh yeh jaana sanam…", dv: "तुझे देखा तो ये जाना सनम…", en: "When I saw you, I realised, my love…",
    know: ["dekha = saw (from dekh)"],
    note: "The mustard-field song everyone knows. Sing it — that's speaking practice too!",
    q: "Tujhe Dekha To DDLJ song"
  },
  {
    id: "k3g", after: "m3:words", film: "Kabhi Khushi Kabhie Gham", year: 2001,
    line: "Kabhi Khushi Kabhie Gham", dv: "कभी खुशी कभी ग़म", en: "Sometimes happiness, sometimes sorrow",
    know: ["khush = happy → khushi = happiness"],
    note: "The ultimate family movie — Rahul and Anjali, and that title song.",
    q: "Kabhi Khushi Kabhie Gham title song"
  },
  {
    id: "kuchkuch", after: "m4:learn", film: "Kuch Kuch Hota Hai", year: 1998,
    line: "Kuch kuch hota hai, Anjali… tum nahin samjhogi.", dv: "कुछ कुछ होता है, अंजलि… तुम नहीं समझोगी।",
    en: "Something happens, Anjali… you won't understand.",
    know: ["nahin = not / no"],
    note: "Rahul's teasing line that became the title of the film.",
    q: "Kuch Kuch Hota Hai Anjali tum nahi samjhogi scene"
  },
  {
    id: "don", after: "m4:challenge", film: "Don", year: 2006,
    line: "Don ko pakadna mushkil hi nahin, namumkin hai.", dv: "डॉन को पकड़ना मुश्किल ही नहीं, नामुमकिन है।",
    en: "Catching Don isn't just difficult — it's impossible.",
    know: ["nahin = not", "hai = is"],
    note: "SRK's coolest line as Don.",
    q: "Don 2006 mushkil hi nahi namumkin hai"
  },
  {
    id: "chutki", after: "m5:learn", film: "Om Shanti Om", year: 2007,
    line: "Ek chutki sindoor ki keemat tum kya jaano, Ramesh babu?", dv: "एक चुटकी सिंदूर की कीमत तुम क्या जानो, रमेश बाबू?",
    en: "What would you know about the worth of a pinch of sindoor, Ramesh babu?",
    know: ["kya = what"],
    note: "SRK hamming it up as a movie star — the funniest scene in Om Shanti Om.",
    q: "Om Shanti Om ek chutki sindoor scene"
  },
  {
    id: "kalhonaaho", after: "m7:words", film: "Kal Ho Naa Ho", year: 2003,
    line: "Kal ho naa ho", dv: "कल हो ना हो", en: "Tomorrow may or may not come",
    know: ["kal = tomorrow"],
    note: "Aman's message: live today, because tomorrow isn't promised.",
    q: "Kal Ho Naa Ho title song"
  },
  {
    id: "ddlj", after: "m8:challenge", film: "Dilwale Dulhania Le Jayenge", year: 1995,
    line: "Dilwale Dulhania Le Jayenge", dv: "दिलवाले दुल्हनिया ले जायेंगे", en: "The big-hearted one will take the bride",
    know: ["You finished every module — this one's for you!"],
    note: "The longest-running film in Indian cinema history. Ja Simran, jee le apni zindagi! 💛",
    q: "Dilwale Dulhania Le Jayenge best scenes"
  }
];
