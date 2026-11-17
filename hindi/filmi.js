/* =====================================================
   Bolo! — Filmi Album 🎬 (cards from classic Hindi films)
   -----------------------------------------------------
   Each card is a famous line or song that uses Hindi she has just learned.

   How a card unlocks:
     after: "moduleId:stageId"  → when she finishes that stage (one per stage in Modules 1–3)
     bonus: true                → a surprise drop: a near-perfect stage, the daily gift, or the 5-minute review
   cat:    romance · comedy · swag · family · songs   (see BOLO_FILMI_CATS; finishing a category earns a badge)
   rarity: common · rare · legendary                  (card frame; bonus drops favour common cards)

   yt: "VIDEO_ID" plays the clip inside the card (official uploads only, checked to allow embedding).
   Movie scenes use short official clips; songs play whole. Add start/end (seconds) to trim a longer upload.
   Card ids are saved in her progress — never rename one.
   ===================================================== */
window.BOLO_FILMI_CATS = [
  { id: "romance", icon: "💘", name: "Romance", badge: "Romance Queen", badgeIcon: "👑" },
  { id: "comedy", icon: "😂", name: "Comedy", badge: "Comedy Queen", badgeIcon: "🤣" },
  { id: "swag", icon: "🔥", name: "Filmy Swag", badge: "Dialogue Baazi", badgeIcon: "😎" },
  { id: "family", icon: "👨‍👩‍👧", name: "Family Feels", badge: "Ghar Ki Rani", badgeIcon: "🏡" },
  { id: "songs", icon: "🎵", name: "Songs", badge: "Dance Diva", badgeIcon: "💃" }
];
window.BOLO_FILMI_MILESTONES = [
  { n: 5, icon: "🍿", name: "Film Buff" },
  { n: 15, icon: "🎟️", name: "Superfan" },
  { n: 30, icon: "🌟", name: "Bollywood Legend" }
];

window.BOLO_FILMI = [
  /* ---------- Module 1 · Main, Aap & the 3 H Words ---------- */
  {
    id: "mainhoonna", after: "class1:learn", cat: "songs", rarity: "legendary",
    film: "Main Hoon Na", year: 2004, line: "Main hoon na!", dv: "मैं हूँ ना!", en: "I'm here for you, aren't I?",
    know: ["Main = I", "hoon = am"],
    note: "The title of SRK's 2004 hit — and it's your class's “Main … hoon”! The “na” at the end means “right?”.",
    q: "Main Hoon Na title song Shah Rukh Khan",
    yt: "DIJW7rWPkSw" // T-Series · the whole title song
  },
  {
    id: "favourite", after: "class1:words", cat: "swag", rarity: "rare",
    film: "Jab We Met", year: 2007, line: "Main apni favourite hoon!", dv: "मैं अपनी फ़ेवरेट हूँ!", en: "I'm my own favourite!",
    know: ["Main … hoon = I am", "Hinglish: favourite stays English"],
    note: "Geet (Kareena Kapoor) on the train — the most confident line in Bollywood. Say it in the mirror!",
    q: "Jab We Met main apni favourite hoon",
    yt: "tMCu2OyHQHY" // Shemaroo
  },
  {
    id: "maa", after: "class1:quiz", cat: "family", rarity: "legendary",
    film: "Deewaar", year: 1975, line: "Mere paas maa hai.", dv: "मेरे पास माँ है।", en: "I have Mother.",
    know: ["hai = is — one of your 3 H words!", "mere paas = I have (literally “near me”)"],
    note: "Amitabh lists his building, property and bank balance. Shashi Kapoor wins with four words — Hindi cinema's greatest comeback.",
    q: "Deewaar mere paas maa hai",
    yt: "7xOPzBhHKWY" // Prime Video India
  },
  {
    id: "teja", after: "class1:build", cat: "comedy", rarity: "rare",
    film: "Andaz Apna Apna", year: 1994, line: "Teja main hoon, mark idhar hai!", dv: "तेजा मैं हूँ, मार्क इधर है!", en: "I'm Teja — the mark is here!",
    know: ["main hoon = I am", "hai = is", "idhar = here"],
    note: "Paresh Rawal's double role in the funniest cult comedy of the 90s — which one is the real Teja?",
    q: "Andaz Apna Apna Teja main hoon mark idhar hai",
    yt: "2KA4UNbFsvA" // Prime Video India
  },
  {
    id: "anthony", after: "class1:transform", cat: "songs", rarity: "common",
    film: "Amar Akbar Anthony", year: 1977, line: "My name is Anthony Gonsalves!", dv: "माय नेम इज़ एंथनी गोंज़ाल्विस!", en: "My name is Anthony Gonsalves!",
    know: ["Hindi songs switch to English too — just like your family!"],
    note: "Amitabh pops out of a giant Easter egg in a top hat. Peak 70s fun.",
    q: "My Name Is Anthony Gonsalves song",
    yt: "Erc_BtQvTJw" // Universal Music India
  },
  {
    id: "aalizz", after: "class1:chat", cat: "songs", rarity: "rare",
    film: "3 Idiots", year: 2009, line: "Aal izz well!", dv: "ऑल इज़ वेल!", en: "All is well!",
    know: ["When Aunty asks “Kaise ho?” — “Main theek hoon” means the same!"],
    note: "Rancho's trick: pat your heart and say it whenever you're scared.",
    q: "3 Idiots Aal Izz Well song",
    yt: "7PzwOiW8-n0" // Zee Music Company
  },
  {
    id: "karanarjun", after: "class1:speak", cat: "family", rarity: "rare",
    film: "Karan Arjun", year: 1995, line: "Mere Karan Arjun aayenge!", dv: "मेरे करन अर्जुन आएँगे!", en: "My Karan and Arjun will come!",
    know: ["mere = my", "aayenge = will come (from aa = come)"],
    note: "A mother who never stops believing her sons will come back. Full filmi drama — say it like Rakhee!",
    q: "Karan Arjun mere Karan Arjun aayenge",
    yt: "TxoyukHUU1Q" // Tips Official
  },
  {
    id: "badebade", after: "class1:challenge", cat: "romance", rarity: "legendary",
    film: "Dilwale Dulhania Le Jayenge", year: 1995,
    line: "Bade bade deshon mein aisi chhoti chhoti baatein hoti rehti hain, Senorita.", dv: "बड़े बड़े देशों में ऐसी छोटी छोटी बातें होती रहती हैं, सेनोरिटा।",
    en: "In big countries, little things like this keep happening, Senorita.",
    know: ["mein = in (your “mei”)", "rehti hain — like rehti / rehte"],
    note: "Raj's cheeky line to Simran in Switzerland — one of the most quoted lines in Bollywood.",
    q: "DDLJ bade bade deshon mein scene",
    yt: "lfuAN-o6H0Q" // YRF
  },

  /* ---------- Module 2 · Voh, Kaam aur Acha ---------- */
  {
    id: "pyaardosti", after: "class2:learn", cat: "romance", rarity: "rare",
    film: "Kuch Kuch Hota Hai", year: 1998, line: "Pyaar dosti hai.", dv: "प्यार दोस्ती है।", en: "Love is friendship.",
    know: ["hai = is — same “… hai” as Voh … hai"],
    note: "Rahul's big belief in Kuch Kuch Hota Hai. Pyaar = love, dosti = friendship.",
    q: "Kuch Kuch Hota Hai pyaar dosti hai scene",
    yt: "HpLb56jcEGM" // Prime Video India
  },
  {
    id: "baburao", after: "class2:words", cat: "comedy", rarity: "common",
    film: "Hera Pheri", year: 2000, line: "Yeh Baburao ka style hai!", dv: "ये बाबूराव का स्टाइल है!", en: "This is Baburao's style!",
    know: ["yeh = this (voh = that / he / she)", "hai = is"],
    note: "Babu Bhaiya answering the phone his way — Paresh Rawal at his funniest.",
    q: "Hera Pheri yeh Baburao ka style hai",
    yt: "qPVA_xQfp6A" // Goldmines
  },
  {
    id: "thappad", after: "class2:quiz", cat: "swag", rarity: "rare",
    film: "Dabangg", year: 2010, line: "Thappad se darr nahi lagta sahab, pyaar se lagta hai.", dv: "थप्पड़ से डर नहीं लगता साहब, प्यार से लगता है।",
    en: "I'm not scared of a slap, sir — I'm scared of love.",
    know: ["lagta hai — the same -ta hai ending as karta hai", "nahi = not", "sahab = sir (respect!)"],
    note: "Rajjo (Sonakshi Sinha, in her very first film) shuts down Chulbul Pandey.",
    q: "Dabangg thappad se darr nahi lagta",
    yt: "zoVUoVu1QZU" // Netflix India
  },
  {
    id: "kainaat", after: "class2:build", cat: "swag", rarity: "legendary",
    film: "Om Shanti Om", year: 2007,
    line: "Kehte hain agar kisi cheez ko dil se chaaho, toh poori kainaat usse tumse milane ki koshish mein lag jaati hai.",
    dv: "कहते हैं अगर किसी चीज़ को दिल से चाहो, तो पूरी कायनात उसे तुमसे मिलाने की कोशिश में लग जाती है।",
    en: "They say if you want something with all your heart, the whole universe works to bring it to you.",
    know: ["kehte hain = they say — the respectful -te hain ending", "mein = in"],
    note: "Om's award-night speech — SRK's most quoted line ever.",
    q: "Om Shanti Om award speech kehte hain agar kisi cheez ko dil se chaho",
    yt: "D6eJo5XdMhc" // Netflix India
  },
  {
    id: "paisadouble", after: "class2:transform", cat: "comedy", rarity: "common",
    film: "Phir Hera Pheri", year: 2006, line: "25 din mein paisa double!", dv: "पच्चीस दिन में पैसा डबल!", en: "Money doubled in 25 days!",
    know: ["mein = in (your “mei”)", "Hinglish: double stays English"],
    note: "Laxmi Chit Fund's too-good-to-be-true deal. (Spoiler: it's not true.)",
    q: "Phir Hera Pheri 25 din mein paisa double",
    yt: "zxbF1w9Rck4" // Prime Video India
  },
  {
    id: "sattar", after: "class2:chat", cat: "swag", rarity: "legendary",
    film: "Chak De! India", year: 2007, line: "Sattar minute hain tumhare paas.", dv: "सत्तर मिनट हैं तुम्हारे पास।", en: "You have seventy minutes.",
    know: ["hain = are (many minutes!)", "tumhare paas = you have (like “mere paas”)"],
    note: "Coach Kabir Khan's speech before the final. Goosebumps guaranteed.",
    q: "Chak De India sattar minute",
    yt: "xK3x7EOA30s" // YRF
  },
  {
    id: "k3g", after: "class2:speak", cat: "family", rarity: "rare",
    film: "Kabhi Khushi Kabhie Gham", year: 2001, line: "Kabhi Khushi Kabhie Gham", dv: "कभी खुशी कभी ग़म", en: "Sometimes happiness, sometimes sorrow",
    know: ["khush = happy → khushi = happiness"],
    note: "The ultimate family movie — and the title song every Indian family knows by heart.",
    q: "Kabhi Khushi Kabhie Gham title song",
    yt: "2N7-GZpLlC0" // Sony Music India
  },
  {
    id: "jasimran", after: "class2:challenge", cat: "romance", rarity: "legendary",
    film: "Dilwale Dulhania Le Jayenge", year: 1995, line: "Ja Simran ja, jee le apni zindagi.", dv: "जा सिमरन जा, जी ले अपनी ज़िंदगी।",
    en: "Go, Simran, go — live your life.",
    know: ["ja = go (to someone close)", "apni = your own — like “apni favourite”!"],
    note: "Babuji finally lets go. The train, the hand — the most famous ending in Bollywood.",
    q: "DDLJ ja simran ja",
    yt: "lNhZpUfB0Xo" // YRF
  },

  /* ---------- Module 3 · What Am I Doing? ---------- */
  {
    id: "dekhaek", after: "m1:learn", cat: "songs", rarity: "rare",
    film: "Silsila", year: 1981, line: "Dekha ek khwab toh yeh silsile hue", dv: "देखा एक ख़्वाब तो ये सिलसिले हुए", en: "I saw a dream, and this story began",
    know: ["dekha = saw — from dekh!"],
    note: "Amitabh and Rekha in the tulip fields — Yash Chopra's most romantic song.",
    q: "Dekha Ek Khwab Silsila song",
    yt: "7dO_MS9tZ5E" // YRF
  },
  {
    id: "palat", after: "m1:words", cat: "romance", rarity: "legendary",
    film: "Dilwale Dulhania Le Jayenge", year: 1995,
    line: "Agar yeh tujhe pyaar karti hai, toh yeh palat ke dekhegi. Palat… palat… palat!",
    dv: "अगर यह तुझे प्यार करती है, तो यह पलट के देखेगी। पलट… पलट… पलट!",
    en: "If she loves you, she'll turn around and look. Turn… turn… turn!",
    know: ["karti hai = she does", "dekhegi = she will look (from dekh!)"],
    note: "Raj waits for Simran to turn around — the most famous moment in Bollywood.",
    q: "DDLJ palat palat scene",
    yt: "cizFble7ZRY" // YRF
  },
  {
    id: "peeloon", after: "m1:build", cat: "songs", rarity: "common",
    film: "Once Upon a Time in Mumbaai", year: 2010, line: "Pee loon tere neele neele nainon se shabnam", dv: "पी लूँ तेरे नीले नीले नैनों से शबनम",
    en: "Let me drink the dew from your blue, blue eyes",
    know: ["pee = drink — like “Main chai pee rahi hoon”!"],
    note: "Filmi poetry at its dreamiest.",
    q: "Pee Loon song",
    yt: "D8XFTglfSMg" // T-Series
  },
  {
    id: "bhaagmilkha", after: "m1:transform", cat: "songs", rarity: "rare",
    film: "Bhaag Milkha Bhaag", year: 2013, line: "Bhaag Milkha bhaag!", dv: "भाग मिल्खा भाग!", en: "Run, Milkha, run!",
    know: ["bhaag = run — your verb!"],
    note: "The true story of Milkha Singh, “The Flying Sikh”. Farhan Akhtar trained for months to play him.",
    q: "Bhaag Milkha Bhaag song",
    yt: "JvokzZTtpCU" // Sony Music India
  },
  {
    id: "tujhedekha", after: "m1:challenge", cat: "romance", rarity: "legendary",
    film: "Dilwale Dulhania Le Jayenge", year: 1995, line: "Tujhe dekha toh yeh jaana sanam…", dv: "तुझे देखा तो ये जाना सनम…", en: "When I saw you, I realised, my love…",
    know: ["dekha = saw (from dekh)"],
    note: "The mustard-field song everyone knows. Sing it — that's speaking practice too!",
    q: "Tujhe Dekha To DDLJ song",
    yt: "cNV5hLSa9H8" // YRF
  },

  /* ---------- 🎁 Bonus drops (perfect runs, daily gifts, daily reviews) ---------- */
  {
    id: "controluday", bonus: true, cat: "comedy", rarity: "common",
    film: "Welcome", year: 2007, line: "Control Uday, control!", dv: "कंट्रोल उदय, कंट्रोल!", en: "Control yourself, Uday!",
    know: ["Pure Hinglish — Uday talking to himself"],
    note: "Nana Patekar's gangster Uday Shetty, who secretly just wants to paint.",
    q: "Welcome control Uday control",
    yt: "yXEB4xMT2rw" // Prime Video India
  },
  {
    id: "gogo", bonus: true, cat: "comedy", rarity: "rare",
    film: "Andaz Apna Apna", year: 1994, line: "Crime Master Gogo naam hai mera!", dv: "क्राइम मास्टर गोगो नाम है मेरा!", en: "Crime Master Gogo is my name!",
    know: ["naam = name", "mera = my", "hai = is"],
    note: "Shakti Kapoor's villain is so silly he's adorable — he's Mogambo's nephew!",
    q: "Andaz Apna Apna Crime Master Gogo",
    yt: "h5GdZXfKWaU" // Netflix India
  },
  {
    id: "jhappi", bonus: true, cat: "family", rarity: "common",
    film: "Munna Bhai M.B.B.S.", year: 2003, line: "Jaadu ki jhappi", dv: "जादू की झप्पी", en: "A magic hug",
    know: ["ki = of"],
    note: "Munna Bhai's cure for everything: a big, warm hug. Try one on Mumma!",
    q: "Munna Bhai jaadu ki jhappi",
    yt: "Xak8CqTIRD8" // Netflix India
  },
  {
    id: "commonman", bonus: true, cat: "swag", rarity: "common",
    film: "Chennai Express", year: 2013, line: "Don't underestimate the power of a common man!", dv: "", en: "",
    know: ["Sometimes SRK just says it in English 😄"],
    note: "Rahul's warning — delivered with full filmi swag.",
    q: "Chennai Express common man",
    yt: "Al-Vt6SgdpQ" // Red Chillies Entertainment
  },
  {
    id: "kajrare", bonus: true, cat: "songs", rarity: "rare",
    film: "Bunty Aur Babli", year: 2005, line: "Kajra re, kajra re, tere kaare kaare naina", dv: "कजरा रे, कजरा रे, तेरे कारे कारे नैना", en: "Kohl-lined, your dark, dark eyes",
    know: ["tere = your (casual)"],
    note: "Aishwarya, Abhishek and Amitabh in one song — a wedding dance-floor must.",
    q: "Kajra Re song",
    yt: "4dsFQFCvVGU" // YRF
  },
  {
    id: "thumakda", bonus: true, cat: "songs", rarity: "common",
    film: "Queen", year: 2014, line: "London thumakda", dv: "लंदन ठुमकदा", en: "Dancing in London!",
    know: ["thumka = a little hip-shake dance move"],
    note: "Rani's (Kangana Ranaut) family sangeet — a Punjabi wedding song everyone dances to.",
    q: "London Thumakda Queen song",
    yt: "udra3Mfw2oo" // T-Series
  },
  {
    id: "senorita", bonus: true, cat: "songs", rarity: "common",
    film: "Zindagi Na Milegi Dobara", year: 2011, line: "Señorita!", dv: "सेनोरिटा!", en: "Señorita!",
    know: ["The three friends sing in Hindi and Spanish — even Farhan Akhtar sings!"],
    note: "Three best friends on a road trip through Spain.",
    q: "Senorita ZNMD song",
    yt: "PuhOFhmy3BU" // T-Series
  },
  {
    id: "mehndi", bonus: true, cat: "family", rarity: "rare",
    film: "Dilwale Dulhania Le Jayenge", year: 1995, line: "Mehndi laga ke rakhna, doli saja ke rakhna", dv: "मेहंदी लगा के रखना, डोली सजा के रखना",
    en: "Keep your mehndi on, keep the doli decorated",
    know: ["rakhna = keep"],
    note: "The wedding song every Punjabi family dances to.",
    q: "Mehndi Laga Ke Rakhna DDLJ",
    yt: "-bNwqXvMuB8" // YRF
  },
  {
    id: "bolechudiyan", bonus: true, cat: "family", rarity: "legendary",
    film: "Kabhi Khushi Kabhie Gham", year: 2001, line: "Bole chudiyan, bole kangana", dv: "बोले चूड़ियाँ, बोले कंगना", en: "The bangles sing, the bracelets sing",
    know: ["bole = says / speaks — like “Bolo!”, the name of this app!"],
    note: "The whole K3G family dancing on Karva Chauth — Amitabh, Jaya, SRK, Kajol, Hrithik and Kareena.",
    q: "Bole Chudiyan K3G",
    yt: "IBvg3WeqP1U" // Sony Music India
  },
  {
    id: "baazigar", bonus: true, cat: "swag", rarity: "rare",
    film: "Baazigar", year: 1993,
    line: "Kabhi kabhi kuch jeetne ke liye kuch haarna padta hai… aur haar kar jeetne wale ko baazigar kehte hain.",
    dv: "कभी कभी कुछ जीतने के लिए कुछ हारना पड़ता है… और हार कर जीतने वाले को बाज़ीगर कहते हैं।",
    en: "Sometimes, to win something, you have to lose something… and the one who wins after losing is called a baazigar.",
    know: ["aur = and", "kehte hain — the respectful -te hain ending"],
    note: "The line that made SRK a superstar villain-hero.",
    q: "Baazigar haar kar jeetne wale ko baazigar kehte hain"
  },

  /* ---------- Later modules ---------- */
  {
    id: "kuchkuch", after: "m4:learn", cat: "romance", rarity: "rare",
    film: "Kuch Kuch Hota Hai", year: 1998, line: "Kuch kuch hota hai, Anjali… tum nahin samjhogi.", dv: "कुछ कुछ होता है, अंजलि… तुम नहीं समझोगी।",
    en: "Something happens, Anjali… you won't understand.",
    know: ["nahin = not / no"],
    note: "Rahul's teasing line that became the title of the film.",
    q: "Kuch Kuch Hota Hai Anjali tum nahi samjhogi scene"
  },
  {
    id: "don", after: "m4:challenge", cat: "swag", rarity: "rare",
    film: "Don", year: 2006, line: "Don ko pakadna mushkil hi nahin, namumkin hai.", dv: "डॉन को पकड़ना मुश्किल ही नहीं, नामुमकिन है।",
    en: "Catching Don isn't just difficult — it's impossible.",
    know: ["nahin = not", "hai = is"],
    note: "SRK's coolest line as Don.",
    q: "Don 2006 mushkil hi nahi namumkin hai"
  },
  {
    id: "chutki", after: "m5:learn", cat: "comedy", rarity: "rare",
    film: "Om Shanti Om", year: 2007, line: "Ek chutki sindoor ki keemat tum kya jaano, Ramesh babu?", dv: "एक चुटकी सिंदूर की कीमत तुम क्या जानो, रमेश बाबू?",
    en: "What would you know about the worth of a pinch of sindoor, Ramesh babu?",
    know: ["kya = what"],
    note: "SRK hamming it up as a movie star — the funniest scene in Om Shanti Om.",
    q: "Om Shanti Om ek chutki sindoor scene",
    yt: "1g7OQlxL3dU" // Red Chillies Entertainment
  },
  {
    id: "kalhonaaho", after: "m7:words", cat: "songs", rarity: "rare",
    film: "Kal Ho Naa Ho", year: 2003, line: "Kal ho naa ho", dv: "कल हो ना हो", en: "Tomorrow may or may not come",
    know: ["kal = tomorrow"],
    note: "Aman's message: live today, because tomorrow isn't promised.",
    q: "Kal Ho Naa Ho title song",
    yt: "g0eO74UmRBs" // Sony Music India
  },
  {
    id: "ddlj", after: "m8:challenge", cat: "romance", rarity: "legendary",
    film: "Dilwale Dulhania Le Jayenge", year: 1995, line: "Dilwale Dulhania Le Jayenge", dv: "दिलवाले दुल्हनिया ले जायेंगे", en: "The big-hearted one will take the bride",
    know: ["You finished every module — this one's for you!"],
    note: "The longest-running film in Indian cinema history. Ja Simran, jee le apni zindagi! 💛",
    q: "Dilwale Dulhania Le Jayenge best scenes"
  }
];
