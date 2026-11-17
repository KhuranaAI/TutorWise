// Module 4: the writing questions (sentences, grammar, punctuation, paragraphs).
// The real test has twelve of these. They cover three skills: developing a main idea,
// organizing ideas and using conventions.
MODULES.push({ id:"m4", title:"Writing Skills", time:"70 min",
  blurb:"Master the sentence, grammar, punctuation and paragraph skills behind the twelve writing questions, then level up with the traps in the hardest ones.",
  blocks:[
  {k:"lesson", title:"Sentences that work", html:`
    <p>Twelve questions on the test ask you to choose the best-written sentence or paragraph. Start with the sentence itself.</p>
    <div class="grid2">
      <div class="cardlet"><h3>Complete sentence</h3><p>Needs a subject and a verb, and must express a complete thought. “Because the bus was late.” leaves you waiting for the rest. It is a <b>fragment</b>.</p></div>
      <div class="cardlet"><h3>Run-on</h3><p>Two sentences pushed together with nothing between them: “The bell rang we ran.”</p></div>
      <div class="cardlet"><h3>Comma splice</h3><p>Two sentences joined by only a comma: “The bell rang, we ran.” A comma is not strong enough.</p></div>
      <div class="cardlet"><h3>Three ways to fix both</h3><p>A period: “The bell rang. We ran.” A semicolon: “The bell rang; we ran.” A comma plus a joining word: “The bell rang, <b>so</b> we ran.”</p></div>
    </div>
    <div class="tip"><b>Combining sentences:</b> the best choice keeps every idea, cuts repeated words and shows how the ideas connect (<em>because, although, which, so</em>).</div>`},
  {k:"label", text:"Sentences"},
  {k:"q", type:"single", id:"m4q13", skill:"Complete sentences", fam:"W3", prompt:"Which of these is a complete sentence?",
    options:["Although the bus was late and the roads were icy.","The coach, who had been waiting since noon.","Because we left early, we caught the first ferry.","Running the last lap with nothing left in her legs."], answer:2,
    explain:"Only this one has a subject and verb that finish the thought: “we caught the first ferry.” The others leave you waiting. What happened although the bus was late? What did the coach do?"},
  {k:"q", type:"single", id:"m4q2", skill:"Run-ons", fam:"W3", prompt:"Which is the best way to correct this run-on? <em>“The power went out we finished the test by flashlight.”</em>",
    options:["The power went out, we finished the test by flashlight.","The power went out, but we finished the test by flashlight.","The power went out we, finished the test by flashlight.","The power, went out we finished the test by flashlight."], answer:1,
    explain:"A comma plus a joining word (but) correctly joins two complete sentences. Joining them with only a comma (“The power went out, we finished…”) makes a comma splice."},
  {k:"q", type:"single", id:"m4q14", skill:"Run-ons", fam:"W3", prompt:"Which sentence is punctuated correctly?",
    options:["The game went into overtime, nobody left the gym.","The game went into overtime; nobody left the gym.","The game went into overtime nobody, left the gym.","The game, went into overtime and nobody left the gym."], answer:1,
    explain:"A semicolon can join two complete sentences that are closely related. A comma alone cannot, and the other two choices put commas where they split a subject from its verb."},
  {k:"q", type:"single", id:"m4q15", skill:"Complete sentences", fam:"W3", prompt:"Read the sentences.<em>(1) On Tuesday, our class visited the recycling plant. (2) Which was louder than anyone expected. (3) We wore earplugs for the whole tour.</em>What is the best way to fix sentence 2?",
    options:["Join it to sentence 1: “…the recycling plant, which was louder than anyone expected.”","Add a comma after “louder”: “Which was louder, than anyone expected.”","Change the first word to “Being”: “Being louder than anyone expected.”","Move it after sentence 3: “We wore earplugs for the whole tour. Which was louder than anyone expected.”"], answer:0,
    explain:"Sentence 2 is a fragment: it describes the plant but cannot stand alone. Attaching it to sentence 1 gives it something to describe. Each of the other changes still leaves a fragment."},
  {k:"q", type:"single", id:"m4q32", skill:"Combining sentences", fam:"W2", prompt:"Which choice best combines these sentences? <em>“The library is quiet. The library has free Wi-Fi. Many students study there.”</em>",
    options:["The library is quiet, the library has free Wi-Fi, many students study there.","Because the library is quiet and has free Wi-Fi, many students study there.","The library is quiet and the library has free Wi-Fi and many students study there.","The library is quiet and has free Wi-Fi, however many students study there."], answer:1,
    explain:"It removes the repetition and shows the cause-and-effect link clearly. Joining the sentences with commas or with “and” keeps the repetition, and “however” signals a contrast that is not there."},

  {k:"lesson", title:"Grammar and word choice", html:`
    <div class="grid2">
      <div class="cardlet"><h3>Subject–verb agreement</h3><p>Find the real subject and ignore the words in between: “<b>One</b> of the players <b>is</b> injured.” With <em>neither … nor</em>, the verb matches the nearer subject.</p></div>
      <div class="cardlet"><h3>Consistent verb tense</h3><p>Do not switch between past and present without a reason: “She <b>opened</b> the door and <b>walked</b> in,” not “walks in.”</p></div>
      <div class="cardlet"><h3>Verb forms after has, have and had</h3><p>Some verbs change after a helping verb: “The show <b>began</b>,” but “the show had <b>begun</b>.” Also <em>went / had gone</em>, <em>saw / had seen</em>, <em>did / had done</em>, <em>wrote / had written</em>.</p></div>
      <div class="cardlet"><h3>Clear pronouns</h3><p>If “he” or “it” could mean two different things, use the name instead.</p></div>
      <div class="cardlet"><h3>Its or it’s?</h3><p>If you can say “it is” or “it has,” write <b>it’s</b>. Otherwise write <b>its</b>: “The dog wagged its tail.”</p></div>
      <div class="cardlet"><h3>Sound-alike words</h3><p><em>their / there / they’re</em> · <em>your / you’re</em> · <em>to / too / two</em> · <em>whose / who’s</em> · <em>then / than</em> · <em>lose / loose</em></p></div>
      <div class="cardlet"><h3>Affect, effect and “could of”</h3><p>The weather <b>affects</b> us (verb); it has an <b>effect</b> (noun). Write <b>could have</b>, never “could of.”</p></div>
    </div>
    <div class="tip"><b>Test the contraction:</b> say it in full. “You are early” works, so <em>you’re</em> is right. “Who is locker is this” does not, so it must be <em>whose</em>: “Whose locker is this?”</div>`},
  {k:"label", text:"Grammar and word choice"},
  {k:"q", type:"dropdown", id:"m4q16", skill:"Word choice", fam:"W3", prompt:"Choose the correct word for each blank.",
    parts:["The students leave ", {o:["their","there","they’re"],a:0}, " bags by the door because ", {o:["its","it’s"],a:1}, " almost time for the bus, and ", {o:["their","there","they’re"],a:2}, " in a hurry."],
    explain:"their = belonging to them · it’s = it is · they’re = they are."},
  {k:"q", type:"dropdown", id:"m4q17", skill:"Agreement", fam:"W3", prompt:"Choose the verb that agrees with each subject.",
    parts:["Each of the answers ", {o:["is","are"],a:0}, " worth two marks. On the top shelf ", {o:["sits","sit"],a:1}, " the trophies from last season. Neither the drivers nor the dispatcher ", {o:["was","were"],a:0}, " ready for the storm."],
    explain:"“Each” is singular, so it takes “is.” In the second sentence the subject comes after the verb: the trophies sit. With “neither … nor,” the verb matches the nearer subject, “dispatcher,” so it is “was.”"},
  {k:"q", type:"single", id:"m4q18", skill:"Verb tense", fam:"W3", prompt:"Which sentence keeps the same verb tense all the way through?",
    options:["When the fire alarm rang, everyone stops talking and walked outside.","When the fire alarm rang, everyone stopped talking and walked outside.","When the fire alarm rings, everyone stopped talking and walks outside.","When the fire alarm rang, everyone stopped talking and walks outside."], answer:1,
    explain:"All three verbs are in the past tense: rang, stopped, walked. Each of the others mixes past and present."},
  {k:"q", type:"dropdown", id:"m4q33", skill:"Verb forms", fam:"W3", prompt:"Choose the correct verb form for each blank.",
    parts:["The bell had already ", {o:["rang","rung"],a:1}, " when we reached the cafeteria. Someone had ", {o:["took","taken"],a:1}, " our usual table, so we ", {o:["ate","eaten"],a:0}, " our lunch outside."],
    explain:"After had, has or have, use rung and taken: “had rung,” “had taken.” With no helping verb, use the simple past: “we ate.”"},
  {k:"q", type:"single", id:"m4q11", skill:"Clear pronouns", fam:"W3", prompt:"Which revision is clearest? <em>“When Jamal talked to Theo, he said he was moving.”</em>",
    options:["When Jamal talked to Theo, he said that he was moving.","Jamal told Theo, “I’m moving.”","He told him he was moving when they talked.","When they talked, he said Jamal or Theo was moving."], answer:1,
    explain:"In the original, “he” could be Jamal or Theo. The quotation makes it clear that Jamal is the one moving."},
  {k:"q", type:"dropdown", id:"m4q20", skill:"Word choice", fam:"W3", prompt:"Choose the correct word for each blank.",
    parts:["I would ", {o:["of","have"],a:1}, " come earlier, but the storm had a bigger ", {o:["affect","effect"],a:1}, " on the roads ", {o:["then","than"],a:1}, " I expected."],
    explain:"“Would have” is the verb (“would of” is never correct). An effect is a result (noun). “Than” compares; “then” is about time."},
  {k:"q", type:"dropdown", id:"m4q21", skill:"Word choice", fam:"W3", prompt:"Choose the correct word for each blank.",
    parts:[{o:["Who’s","Whose"],a:1}, " jacket is this? It is far ", {o:["to","too","two"],a:1}, " big for me, and the zipper is so ", {o:["lose","loose"],a:1}, " that it keeps sliding down."],
    explain:"Whose shows ownership (who’s = who is). Too means “more than enough.” Loose means not tight; lose means to misplace."},

  {k:"lesson", title:"Punctuation and capitals", html:`
    <div class="grid2">
      <div class="cardlet"><h3>Commas</h3><p>After an opening phrase (“After the game, we ate.”), between items in a list, before a joining word that links two sentences, and <b>around</b> extra information (“Our neighbour, who coaches hockey, shovelled our driveway.”).</p></div>
      <div class="cardlet"><h3>Apostrophes</h3><p>One owner: the <b>dog’s</b> leash. More than one owner: the <b>coaches’</b> offices. No apostrophe for a simple plural: two <b>offices</b>.</p></div>
      <div class="cardlet"><h3>Capital letters</h3><p>For the names of particular people, places, days and months: <b>Mr. Haddad</b>, <b>Georgian Bay</b>, <b>Tuesday</b>. In a name, every main word gets one: <b>Lake of the Woods</b>. Not for seasons or general words: <b>winter</b>, <b>my uncle</b>, <b>the arena</b>.</p></div>
      <div class="cardlet"><h3>Quotation marks</h3><p>The comma or period goes <b>inside</b> the closing mark: “Line up at the door,” the coach said.</p></div>
    </div>
    <div class="tip"><b>Never put one comma between a subject and its verb.</b> “My older brother, plays guitar.” is wrong.</div>`},
  {k:"label", text:"Punctuation and capitals"},
  {k:"q", type:"single", id:"m4q34", skill:"Commas", fam:"W3", prompt:"Which sentence uses commas correctly?",
    options:["After the final bell rang, Maya, who plays goal for the Wolves, packed her bag and ran for the bus.","After the final bell rang Maya, who plays goal for the Wolves, packed her bag and ran for the bus.","After the final bell rang, Maya, who plays goal for the Wolves packed her bag and ran for the bus.","After the final bell rang, Maya who plays goal for the Wolves, packed her bag, and ran for the bus."], answer:0,
    explain:"A comma follows the opening part (“After the final bell rang”), and the extra information “who plays goal for the Wolves” needs a comma on each side. Each of the other choices drops one of those commas."},
  {k:"q", type:"single", id:"m4q19", skill:"Apostrophes", fam:"W3", prompt:"Which sentence uses apostrophes correctly?",
    options:["The two team’s buses were parked beside the schools’ gym.","The two teams’ buses were parked beside the school’s gym.","The two teams buses were parked beside the schools gym.","The two teams’ buse’s were parked beside the school’s gym."], answer:1,
    explain:"Two teams own the buses, so the apostrophe follows the s: teams’. One school owns the gym: school’s. “Buses” is a simple plural and needs no apostrophe."},
  {k:"q", type:"single", id:"m4q23", skill:"Capital letters", fam:"W3", prompt:"Which sentence uses capital letters correctly?",
    options:["Last summer, my aunt drove us to Lake Superior Provincial Park.","Last Summer, my Aunt drove us to lake Superior provincial park.","Last summer, my aunt drove us to lake superior Provincial Park.","last summer, My aunt drove us to Lake Superior Provincial park."], answer:0,
    explain:"Every main word in the name of a particular place takes a capital: Lake Superior Provincial Park. Seasons and “my aunt” do not."},
  {k:"q", type:"single", id:"m4q24", skill:"Quotation marks", fam:"W3", prompt:"Which sentence is punctuated correctly?",
    options:["“Bring your health card,” the nurse reminded us.","“Bring your health card”, the nurse reminded us.","“Bring your health card” the nurse reminded us.","Bring your health card, “the nurse reminded us.”"], answer:0,
    explain:"The quotation marks go around the speaker’s exact words, and the comma goes inside the closing mark."},
  {k:"q", type:"single", id:"m4q25", skill:"Spelling", fam:"W3", prompt:"Which sentence has no spelling errors?",
    options:["It is definitely necessary to separate the recycling.","It is definately necessary to separate the recycling.","It is definitely neccessary to seperate the recycling.","It is definitely necessary to seperate the recycling."], answer:0,
    explain:"Definitely (think “finite”), necessary (one c, two s’s) and separate (there is “a rat” in separate) are three of the most commonly misspelled words."},

  {k:"lesson", title:"Building a strong paragraph", html:`
    <div class="grid2">
      <div class="cardlet"><h3>Topic sentence</h3><p>States the one main idea of the paragraph. Every other sentence must fit under it.</p></div>
      <div class="cardlet"><h3>Supporting details</h3><p>Specific beats general. “The rink opens at six so that teams can practise before school” is stronger than “The rink is useful.”</p></div>
      <div class="cardlet"><h3>Order and transitions</h3><p>Add an idea: <em>in addition, also</em>. Show a result: <em>as a result, therefore</em>. Show a contrast: <em>however, on the other hand</em>. Give an example: <em>for example</em>.</p></div>
      <div class="cardlet"><h3>Concluding sentence</h3><p>Wraps up the main idea in new words. It does not add a new topic.</p></div>
    </div>
    <div class="tip"><b>The sentence that does not belong</b> is usually on the same topic but beside the point. Ask: does it support the topic sentence, or does it just mention the same subject?</div>`},
  {k:"label", text:"Paragraphs"},
  {k:"q", type:"single", id:"m4q27", skill:"Topic sentences", fam:"W1", prompt:"Which is the best topic sentence for this paragraph?<em>______. They reduce the pressure to buy expensive brand-name clothes. They also make mornings faster, because students do not have to choose an outfit. Finally, they make it easy to tell at a glance who belongs in the building.</em>",
    options:["School uniforms offer students and schools several practical benefits.","School uniforms are usually made of durable fabric that lasts for several years.","Many students dislike wearing uniforms and would rather choose their own clothes.","Some Ontario schools have required uniforms for decades."], answer:0,
    explain:"All three supporting sentences describe benefits, so the topic sentence must state that idea. The other choices are about uniforms, but the details do not support them."},
  {k:"q", type:"single", id:"m4q30", skill:"Supporting details", fam:"W1", prompt:"Which sentence would BEST support this topic sentence? <em>“A part-time job can teach teenagers to manage money.”</em>",
    options:["A student who earns $150 a week soon learns how much of it goes to bus fare, lunches and a phone bill.","Many teenagers work in restaurants, grocery stores or summer camps, where they serve customers and follow a schedule.","Money is important to people of all ages, and everyone needs to earn it at some point in their lives.","Some part-time jobs pay more than others, and the best ones are usually the hardest to get."], answer:0,
    explain:"It gives a specific example of a teenager learning where money goes. The others mention jobs or money without showing any managing."},
  {k:"q", type:"single", id:"m4q26", skill:"Staying on topic", fam:"W2", fixed:true, prompt:"Which sentence does NOT belong in this paragraph?<em>(1) Volunteering can help teens build useful skills. (2) At a food bank, for example, volunteers learn to sort donations, track supplies and work as a team. (3) Volunteers also practise talking with people they have just met. (4) Many food banks receive most of their donations in December. (5) These experiences can later be listed on a résumé.</em>",
    options:["Sentence 2","Sentence 3","Sentence 4","Sentence 5"], answer:2,
    explain:"Sentence 4 is about food banks, but it says nothing about the skills volunteers build. It is on the subject and off the point."},
  {k:"q", type:"single", id:"m4q9", skill:"Transitions", fam:"W2", prompt:"Choose the best transition. <em>“Riding a bike to school is good exercise. ______, it reduces pollution from cars.”</em>",
    options:["However","In addition","For example","Instead"], answer:1,
    explain:"The second sentence adds another benefit, so “In addition” fits. “However” would signal a contrast."},
  {k:"q", type:"single", id:"m4q31", skill:"Transitions", fam:"W2", prompt:"Choose the best transition. <em>“The new bike lanes have made riding to school safer. ______, some drivers complain that the lanes have made parking harder.”</em>",
    options:["However","Therefore","For example","In addition"], answer:0,
    explain:"The second sentence gives the other side, so it needs a contrast word. “Therefore” would mean the complaints were caused by the safer riding."},
  {k:"q", type:"order", id:"m4q28", skill:"Ordering sentences", fam:"W2", prompt:"Put these sentences in the best order to make a paragraph.",
    items:["Learning to cook is one of the most useful skills a teenager can pick up.","First, it saves money, because a homemade meal costs far less than takeout.","It is also healthier, since you decide exactly what goes into your food.","For these reasons, every student should leave high school knowing how to make a few simple meals."],
    explain:"The topic sentence comes first. “First” and “also” put the two reasons in order, and “For these reasons” signals the conclusion."},
  {k:"q", type:"single", id:"m4q29", skill:"Concluding sentences", fam:"W2", prompt:"Which is the best concluding sentence for this paragraph?<em>Public libraries offer far more than books. Many lend tools, musical instruments and even snowshoes. Most also provide free Wi-Fi, quiet study rooms and help with job applications.</em>",
    options:["In short, a library card may be the most useful card in your wallet.","In conclusion, libraries were first opened to the public in the 1800s.","Clearly, some people still prefer to buy their own books.","As a result, snowshoes are especially useful in northern Ontario."], answer:0,
    explain:"A concluding sentence wraps up the main idea, here that libraries offer a great deal. A phrase such as “In conclusion” does not make a sentence a conclusion: the other choices start a new topic or pick up one small detail."},
  {k:"label", text:"Level up"},
  {k:"lesson", title:"Level up: traps in harder questions", html:`
    <p>The hardest writing questions give you four sentences that all look fine at first glance. These are the problems that usually separate them.</p>
    <div class="grid2">
      <div class="cardlet"><h3>Parallel structure</h3><p>Items in a list or a pair need the same form. Not “The coach told us to stretch, to drink water and <b>that we should rest</b>,” but “to stretch, to drink water and <b>to rest</b>.”</p></div>
      <div class="cardlet"><h3>Describing phrases in the wrong place</h3><p>An opening phrase describes whoever comes right after the comma. “At the age of six, my grandmother taught me to knit” says the grandmother was six. Fix it: “<b>When I was six</b>, my grandmother taught me to knit.”</p></div>
      <div class="cardlet"><h3>I or me? He or him?</h3><p>Take the other person out and listen. “Sara and <b>I</b> went” (I went). “The coach thanked Sara and <b>me</b>” (thanked me).</p></div>
      <div class="cardlet"><h3>Good or well? Fewer or less?</h3><p><b>Well</b> tells how something is done: “She sings well.” <b>Good</b> describes a thing: “a good song.” Use <b>fewer</b> for things you can count (fewer cars) and <b>less</b> for an amount (less traffic).</p></div>
      <div class="cardlet"><h3>Colons</h3><p>A colon introduces a list or an explanation, but only after a complete sentence: “Pack three things: a pen, a ruler and a calculator.” Not “Pack: a pen, a ruler…”</p></div>
      <div class="cardlet"><h3>Where does this sentence go?</h3><p>Some questions give you a new sentence and ask where it fits. Find its clue words (<em>as a result, for example, this, they</em>) and look for the sentence they point back to.</p></div>
    </div>
    <div class="tip"><b>How to attack these:</b> do not pick the choice that “sounds right.” Find the exact spot where the four choices differ, name the rule, then choose.</div>`},
  {k:"q", type:"single", id:"m4q35", skill:"Sentence structure", fam:"W3", prompt:"Which sentence is written correctly?",
    options:["The new manager is friendly, organized and fair to everyone.","The new manager is friendly, organized and treats everyone fairly.","The new manager is friendly, has organization and fair to everyone.","The new manager is friendly, organized and she is fair to everyone."], answer:0,
    explain:"All three items describe the manager with the same kind of word: friendly, organized, fair. In each of the other choices, the list changes form partway through (“treats everyone fairly,” “has organization,” “she is fair”)."},
  {k:"q", type:"dropdown", id:"m4q36", skill:"Sentence structure", fam:"W3", prompt:"Choose the words that keep each list in the same form.",
    parts:["On Saturdays I work at the rink, where I sharpen skates, sell tickets and ", {o:["clean the benches","cleaning the benches","the benches get cleaned"],a:0}, ". My boss says the job takes patience, a good memory and ", {o:["to be on time","punctuality","you have to be on time"],a:1}, "."],
    explain:"The first list is made of actions in the same form: sharpen, sell, clean. The second is made of things: patience, a good memory, punctuality."},
  {k:"q", type:"single", id:"m4q37", skill:"Sentence structure", fam:"W3", prompt:"Which sentence is clearest?",
    options:["Covered in mud, my mother made me leave my boots on the porch.","My mother made me leave my muddy boots on the porch.","My mother made me leave my boots on the porch covered in mud.","Covered in mud, the porch is where my mother made me leave my boots."], answer:1,
    explain:"The boots are what is covered in mud. Only this sentence says so, by putting “muddy” right beside “boots.” The others make it sound as if the mother or the porch is covered in mud."},
  {k:"q", type:"single", id:"m4q38", skill:"Sentence structure", fam:"W3", prompt:"A student wrote: <em>“Barking at every car, I walked the dog past the school.”</em>What is the problem, and what is the best fix?",
    options:["It says the writer was barking. Fix: “As I walked the dog past the school, it barked at every car.”","It is a run-on sentence. Fix: “Barking at every car. I walked the dog past the school.”","Its verbs are in the wrong tense. Fix: “Barked at every car, I walk the dog past the school.”","It is missing two commas. Fix: “Barking, at every car, I walked the dog past the school.”"], answer:0,
    explain:"An opening phrase describes whoever comes right after the comma, so the sentence says “I” was barking. The fix gives the barking to the dog. The other fixes leave the barking attached to the wrong word, or break the sentence."},
  {k:"q", type:"dropdown", id:"m4q39", skill:"Pronouns", fam:"W3", prompt:"Choose the correct words.",
    parts:["My brother and ", {o:["I","me"],a:0}, " split the cost of the gift. The cashier handed the receipt to my brother and ", {o:["I","me"],a:1}, ". At home, my brother said that ", {o:["him and his friend","he and his friend"],a:1}, " would wrap it."],
    explain:"Take the other person out and listen: “I split the cost,” “handed the receipt to me,” “he would wrap it.”"},
  {k:"q", type:"dropdown", id:"m4q40", skill:"Word choice", fam:"W3", prompt:"Choose the correct word for each blank.",
    parts:["Our team played ", {o:["good","well"],a:1}, " in the second half and gave up ", {o:["fewer","less"],a:0}, " goals than last week. With ", {o:["fewer","less"],a:1}, " time on the clock, though, the other team pushed ", {o:["real","really"],a:1}, " hard."],
    explain:"“Well” tells how the team played. Goals can be counted, so “fewer”; time is an amount, so “less.” “Really” tells how hard they pushed; “real” describes a thing."},
  {k:"q", type:"single", id:"m4q41", skill:"Punctuation", fam:"W3", prompt:"Which sentence is punctuated correctly?",
    options:["The kit includes three tools: a wrench, a screwdriver and a level.","The kit includes: a wrench, a screwdriver and a level.","The kit includes three tools; a wrench, a screwdriver and a level.","The kit includes three tools, a wrench: a screwdriver and a level."], answer:0,
    explain:"A colon introduces a list after a complete sentence (“The kit includes three tools”). Putting it right after “includes” splits the verb from what follows, and a semicolon joins two complete sentences; it does not start a list."},
  {k:"q", type:"single", id:"m4q42", skill:"Organization", fam:"W2", fixed:true, prompt:"Read the paragraph.<em>(1) Our school’s breakfast club started with a toaster and a table in the front hall. (2) Within a month, the volunteers who ran it could no longer fit everyone into the hall. (3) This year, the club moved into the cafeteria and added fruit and yogurt. (4) More than a hundred students now stop by each morning.</em>Where is the best place to add this sentence? <em>“As a result, they asked the principal for a bigger space.”</em>",
    options:["After sentence 1","After sentence 2","After sentence 3","After sentence 4"], answer:1,
    explain:"“As a result” needs a cause just before it, and “they” needs someone to point back to. Sentence 2 gives both: the volunteers ran out of room, so they asked for more. Sentence 3 then shows what came of it."},
  {k:"q", type:"dropdown", id:"m4q44", skill:"Punctuation", fam:"W3", prompt:"Choose the correct punctuation mark for each blank.",
    parts:["The bus was late", {o:[";",",",":"],a:0}, " we still made it to the game on time. I packed three things", {o:[";",",",":"],a:2}, " skates, a stick and a helmet. Because the roads were icy", {o:[";",",",":"],a:1}, " the game started late."],
    explain:"A semicolon joins two complete sentences (a comma there would be a comma splice). A colon introduces a list after a complete sentence. “Because the roads were icy” cannot stand alone, so it is joined to the main sentence with a comma, never a semicolon."},
  {k:"q", type:"single", id:"m4q43", skill:"Tone", fam:"W1", prompt:"The opinion essay is written for an adult reader. Which sentence fits best in an opinion essay?",
    options:["Students should have a say in the rules that affect them most.","Honestly, half the rules at this school are a total joke.","Its obvious that kids should get to pick the rules, period.","Whoever wrote these rules clearly did not think at all."], answer:0,
    explain:"It states an opinion in plain, respectful language that an adult reader will take seriously. The others are slangy, careless (“Its”) or insulting, and none of them gives the reader a reason to agree."}
  ]});
