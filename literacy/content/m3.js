// Module 3: Information paragraphs, news reports and the short written answer.
Object.assign(P, {
  maple: {form:"Information Paragraph", title:"From Sap to Syrup", paras:[
    "Every spring, maple producers in Ontario and Quebec wait for a particular kind of weather. Sap flows best when nights fall below freezing and days climb above it. During cold nights, the tree draws water up from its roots; during warm days, pressure inside the tree pushes the sap out through small tap holes drilled into the trunk. Indigenous peoples of the region collected this sap and boiled it down for centuries, long before settlers arrived and learned the practice from them. Fresh sap looks like water and is only about two percent sugar. To turn it into syrup, producers boil it for hours until most of the water evaporates. It takes roughly 40 litres of sap to make a single litre of syrup, which helps to explain why real maple syrup costs so much more than the imitations sold beside it. Many producers have replaced metal buckets with networks of plastic tubing that carry sap straight from the trees to the sugar shack, saving days of labour. Even so, the season remains at the mercy of the weather. Once the buds on the trees begin to open, the sap turns bitter and the harvest ends, usually after four to six weeks. A warm spell in March can cut the season short; a late cold snap can stretch it out. Maple syrup is easily the most delicious thing Canada produces, but it is also one of the least predictable."
  ]},
  garden: {form:"News Report", title:"Students Turn Empty Lot into Pollinator Garden", sub:"Grade 10 science project aims to bring bees, butterflies and neighbours back to Elm Street", byline:"Port Alder Weekly · A made-up town, for practice", paras:[
    "PORT ALDER — A gravel lot on Elm Street that sat empty for nearly a decade is now home to more than 600 native plants, thanks to 28 Grade 10 students from Port Alder Secondary School.",
    "The students planted the pollinator garden last Saturday, the biggest step so far in a science project that began in September. Their goal is to create habitat for bees and butterflies, whose numbers have been declining in many parts of Ontario.",
    "“We learned that a lot of insects depend on native plants, like milkweed and wild bergamot, that don’t grow in lawns,” said student organizer Daniel Osei, 15. “This lot was just sitting here doing nothing. We figured it could do something.”",
    "The class spent six weeks researching which plants grow best in local soil, then presented its plan to town council in October. Council agreed to lend the lot to the school for five years. A local garden centre donated soil and compost, and more than 40 volunteers, including parents and neighbours, helped with the planting.",
    "Ruth Lambert, who has lived across the street for 31 years, brought coffee for the volunteers. “I’ve looked at that gravel every morning,” she said. “Now I’ll be looking at flowers. It’s the best thing that’s happened on this street in years.”",
    "Science teacher Mei Chen said the project taught students more than biology. “They had to write a proposal, speak in front of council and organize volunteers,” she said. “Those are skills they’ll use for the rest of their lives.”",
    "Next spring, the students plan to install signs that identify each plant species. They will take turns watering the garden over the summer."
  ]}
});

MODULES.push({ id:"m3", title:"Information & News", time:"65 min",
  blurb:"Pull key information from factual texts, see how news reports are built, and write the short answer that markers want.",
  blocks:[
  {k:"lesson", title:"Reading an information paragraph", html:`
    <p>An information paragraph explains one topic in a single long paragraph. It usually opens with a <b>topic sentence</b>, then gives <b>supporting details</b>: facts, numbers, examples and explanations. On the test it has six questions.</p>
    <div class="grid2">
      <div class="cardlet"><h3>Fact</h3><p>Can be checked and proven: “The Trans-Canada Highway is about 7,800 kilometres long.”</p></div>
      <div class="cardlet"><h3>Opinion</h3><p>A belief or judgment: “Driving across Canada is the best way to see the country.” Watch for judgment words such as <em>best, worst, should, most beautiful</em>.</p></div>
      <div class="cardlet"><h3>How it is organized</h3><p>In time order (a process), by cause and effect, by comparing two things, or as a problem and its solution.</p></div>
      <div class="cardlet"><h3>Main idea or detail?</h3><p>The main idea covers the whole paragraph. A detail supports it.</p></div>
    </div>
    <div class="tip"><b>Main-idea test:</b> could the answer be a title for the whole paragraph? If it fits only one sentence, it is a detail.</div>`},
  {k:"set", passage:"maple", qs:[
    {type:"single", id:"m3q11", skill:"Main idea", fam:"R2", prompt:"What is the main idea of this paragraph?",
      options:["Making maple syrup takes a great deal of sap and work, and it depends on the weather.","Plastic tubing has replaced metal buckets, and it has made the harvest far less work.","Settlers in Ontario and Quebec learned how to make maple syrup from the Indigenous peoples of the region.","Modern equipment has made maple syrup production quick and predictable."], answer:0,
      explain:"The paragraph covers the weather that makes sap flow, the long boiling, and a season that can be cut short. Tubing and the history are single details. The claim that production is now quick and predictable is the opposite of the text, which calls syrup “one of the least predictable” products."},
    {type:"sort", id:"m3q12", skill:"Fact and opinion", fam:"R3", prompt:"Is each statement a fact or an opinion?", cats:["Fact","Opinion"],
      items:[["It takes roughly 40 litres of sap to make a single litre of syrup.",0],["Maple syrup is easily the most delicious thing Canada produces.",1],["Real maple syrup is worth the extra cost.",1],["Fresh sap is only about two percent sugar.",0],["The harvest usually ends after four to six weeks.",0]],
      explain:"Facts can be measured or checked. “Most delicious” and “worth the extra cost” are judgments that people could disagree about."},
    {type:"single", id:"m3q13", skill:"Word meaning", fam:"R2", prompt:"The paragraph says the season “remains at the mercy of the weather.” What does this phrase mean?",
      options:["The weather controls the season, and producers cannot change that.","The weather has been unusually kind to maple producers in recent years.","Producers now have tools that predict the spring weather accurately.","The season is cancelled whenever the weather turns bad."], answer:0,
      explain:"To be “at the mercy of” something is to be controlled by it. The next sentences show how: a warm spell shortens the season and a cold snap stretches it."},
    {type:"single", id:"m3q22", skill:"The writer’s choices", fam:"R2", prompt:"Why does the writer explain what happens during cold nights and warm days?",
      options:["To show why the weather matters for sap flow","To warn producers about the damage frost can do to trees","To compare the climate of Ontario with the climate of Quebec","To explain why sap has to be boiled for hours"], answer:0,
      explain:"The freeze-and-thaw explanation shows how the weather makes sap move inside the tree. Frost damage and a comparison of the two provinces are not in the paragraph, and the boiling is explained later, by how watery the sap is."},
    {type:"single", id:"m3q24", skill:"Finding details", fam:"R1", prompt:"According to the paragraph, what signals the end of the maple season?",
      options:["A late cold snap arrives.","The trees begin to come into bud.","The nights fall below freezing.","The sap reaches about two percent sugar."], answer:1,
      explain:"“Once the buds on the trees begin to open, the sap turns bitter and the harvest ends.” A late cold snap stretches the season out, freezing nights are part of what makes sap flow, and two percent is the sugar in all fresh sap."},
    {type:"single", id:"m3q14", skill:"Finding details", fam:"R1", prompt:"According to the paragraph, why does real maple syrup cost much more than imitations?",
      options:["A lot of sap is needed to make a small amount of syrup.","The plastic tubing that carries the sap is expensive to install.","Most of the maple syrup sold in Ontario is shipped in from Quebec.","The season lasts for only a few days each spring."], answer:0,
      explain:"The writer says the 40-to-1 ratio “helps to explain why real maple syrup costs so much more.” The season lasts weeks, not days, and tubing is described as saving labour."},
    {type:"single", id:"m3q15", skill:"Organization", fam:"R2", prompt:"How is most of the information in this paragraph organized?",
      options:["It follows the process from the first sap flow to the end of the season.","It compares maple syrup with the imitation syrups sold beside it in stores.","It lists the problems producers face and gives a solution for each one.","It gives one person’s opinion of maple syrup and the reasons for it."], answer:0,
      explain:"The paragraph moves in order: the weather starts the sap, the sap is collected and boiled, and the buds end the season. Only the last sentence gives an opinion."},
    {type:"single", id:"m3q16", skill:"Connections", fam:"R3", prompt:"Based on the paragraph, which spring would most likely give producers the longest season?",
      options:["A spring with freezing nights and mild days that last well into April","A spring that turns warm and sunny early in March and stays that way","A spring with mild nights and mild days from late February onward","A spring in which a cold winter is followed by trees that bud early"], answer:0,
      explain:"Sap needs freezing nights and warmer days, and the season ends when the buds open. Freeze-and-thaw weather that lasts into April keeps the sap flowing longest. Early warmth and early buds both end the season, and without freezing nights the sap does not flow well."}
  ]},
  {k:"lesson", title:"How a news report is built", html:`
    <div class="grid2">
      <div class="cardlet"><h3>Headline</h3><p>Sums up the main event in a few words. A second line under it tells readers a little more.</p></div>
      <div class="cardlet"><h3>Lead (first paragraph)</h3><p>Answers the most important of the 5 Ws: who, what, when, where and why. The rest follow in the next paragraph or two.</p></div>
      <div class="cardlet"><h3>Body</h3><p>The most important details come first and the less important ones later.</p></div>
      <div class="cardlet"><h3>Quotations</h3><p>Real people’s words add a personal view, show the effect on people, or give an expert’s opinion.</p></div>
    </div>
    <p>On the test, the news report has five selected-response questions and the short written answer.</p>
    <div class="tip"><b>On the test:</b> when a question asks <em>why the reporter includes a quotation</em>, ask what that person adds that facts alone cannot: a feeling, an expert view or a reaction.</div>`},
  {k:"set", passage:"garden", qs:[
    {type:"single", id:"m3q17", skill:"Text features", fam:"R2", prompt:"What is the purpose of the line under the headline?",
      options:["To tell readers who did the project and what it is for","To give the reporter’s own opinion of the students’ project","To quote the student who organized the planting day","To explain the steps for planting a pollinator garden"], answer:0,
      explain:"The second line tells readers it is a Grade 10 science project and what it aims to do. It contains no opinion, quotation or instructions."},
    {type:"dropdown", id:"m3q18", skill:"The 5 Ws", fam:"R1", prompt:"Complete the summary using information from the report.",
      parts:[{o:["Town council","Grade 10 students","Volunteers from a garden centre"],a:1}, " ", {o:["planted a pollinator garden","presented a plan to council","installed signs for each plant"],a:0}, " on Elm Street ", {o:["in September","in October","last Saturday"],a:2}, "."],
      explain:"Who: 28 Grade 10 students. What: planted a pollinator garden. When: last Saturday (paragraphs 1 and 2). The plan went to council in October, and the signs are still to come."},
    {type:"single", id:"m3q23", skill:"Quotations", fam:"R2", prompt:"Why does the reporter include Ruth Lambert’s words in paragraph 5?",
      options:["To explain how pollinators help native plants grow","To show how the garden affects people who live nearby","To show that some neighbours were against the project","To describe how the class chose which plants to grow"], answer:1,
      explain:"Ruth has lived across the street for 31 years. Her reaction shows the effect of the project on the neighbourhood, and it is a happy one: she calls the garden “the best thing that’s happened on this street in years.”"},
    {type:"order", id:"m3q9", skill:"Sequence", fam:"R1", prompt:"Put the project’s steps in order.",
      items:["The class begins a science project.","Students present their plan to town council.","Volunteers plant the garden.","Students install signs for each plant."],
      explain:"The project begins in September, the plan goes to council in October, the garden is planted last Saturday, and the signs are planned for next spring."},
    {type:"multi", id:"m3q10", skill:"Supporting details", fam:"R1", prompt:"Which TWO details show that the community supported the project? Select two.",
      options:["The lot sat empty for nearly a decade.","A local garden centre donated soil and compost.","Bee and butterfly numbers are declining.","More than 40 volunteers helped with the planting.","Students will water the garden in summer."], answer:[1,3],
      explain:"Donations and volunteers are community support. The other details are true, but they are about the lot, the insects or the students."},
    {type:"single", id:"m3q20", skill:"Word meaning", fam:"R2", prompt:"In paragraph 2, what does the word “habitat” mean?",
      options:["A place where a living thing can find what it needs","A scientific study of how insects such as bees behave","A supply of native plants that are grown to be sold","A local rule that protects wildlife from being harmed"], answer:0,
      explain:"The students want to “create habitat for bees and butterflies,” and paragraph 3 explains that the insects depend on native plants. A habitat is a place where a living thing can find what it needs."},
    {type:"single", id:"m3q19", skill:"Inference", fam:"R2", prompt:"What can you infer from council’s decision to lend the lot to the school for five years?",
      options:["Council was convinced that the students’ plan was worth supporting.","Council expects the garden to fail before the five years are over.","Council wants the school to buy the lot at the end of the project.","Council plans to sell the lot to a builder when the five years are over."], answer:0,
      explain:"Council said yes after the students presented a researched plan, so the plan persuaded them. Nothing in the report suggests that council expects failure or wants to sell the land."},
    {type:"single", id:"m3q21", skill:"Summary", fam:"R2", prompt:"Which sentence best summarizes the news report?",
      options:["Students in Port Alder turned an empty lot into a pollinator garden with help from their community.","A Port Alder resident is delighted that she will now look out at flowers instead of gravel every morning.","Bees and butterflies are disappearing from Ontario because lawns do not contain native plants.","Town council has decided to give an empty lot on Elm Street to Port Alder Secondary School for good."], answer:0,
      explain:"A summary covers the main event and the key facts. The neighbour’s reaction and the insects are single details, and council did not give the lot away: it lent the lot for five years."}
  ]},
  {k:"lesson", title:"The short written answer", html:`
    <p>One of your two written answers is a short response about the <b>news report</b>. The box on the real test stops at <b>100 words</b>, so every sentence has to earn its place. A marker gives it one code:</p>
    <div class="tablewrap"><table class="facts">
      <tr><th>Code</th><th>What the marker sees</th></tr>
      <tr><td>30</td><td>Clear understanding: a reason, <b>explained</b>, with accurate and <b>specific</b> details from the text.</td></tr>
      <tr><td>20</td><td>Some understanding: a reason, but the support from the text is vague.</td></tr>
      <tr><td>10</td><td>Very little understanding: support that is missing, tiny or beside the point. Just listing details lands here.</td></tr>
      <tr><td>Code I</td><td>No credit: off topic, or only repeats the question.</td></tr>
    </table></div>
    <p>Use <b>A–C–E</b> to reach Code 30:</p>
    <div class="grid2">
      <div class="cardlet"><h3>A · Answer</h3><p>Answer the question directly in your first sentence. Reuse words from the question.</p></div>
      <div class="cardlet"><h3>C · Cite</h3><p>Give specific details from the text: names, numbers, short quotations.</p></div>
      <div class="cardlet"><h3>E · Explain</h3><p>Say how those details prove your answer. Do not drop a quotation and move on.</p></div>
    </div>
    <div class="tip"><b>Common mistake:</b> retelling the whole report. Use only the details that answer the question.</div>`},
  {k:"lesson", title:"Three answers, three codes", html:`
    <p class="kicker">Question: <b>How did people outside the school help the students’ project? Use specific details from the report to support your answer.</b></p>
    <div class="sample"><span class="score">About Code 10</span><p>People helped the students. They did a lot of things for the garden and it was nice. The garden has plants in it now.</p><p class="muted small">Why: it is on topic, but there is not one specific detail from the report.</p></div>
    <div class="sample"><span class="score">About Code 20</span><p>People outside the school helped the students make the garden. Volunteers came and helped, and a store gave them stuff. The town also helped. This shows the community helped.</p><p class="muted small">Why: it gives a reason and points toward the right details, but they are vague. Which store? What stuff? How did the town help?</p></div>
    <div class="sample"><span class="score">About Code 30</span><p>People outside the school helped by giving the students space, supplies and labour. Town council lent the school the empty lot for five years. A garden centre gave soil and compost, and “more than 40 volunteers,” including parents and neighbours, came to plant. Without this support, a class of 28 students could not have turned a gravel lot into a garden of 600 plants.</p><p class="muted small">Why: it answers in the first sentence, gives accurate and specific details in the writer’s own words (with quotation marks around the words taken from the report), and explains why they mattered.</p></div>
    <p class="muted small">These samples are ours, judged the way the marking guide describes. They are not official EQAO samples.</p>`},
  {k:"write", id:"m3w1", mode:"short", passage:"garden", title:"Your turn: short answer",
    prompt:"According to the news report, what did students learn from the garden project besides science? Use specific details from the report to support your answer.",
    target:"Up to 100 words", min:30, max:100,
    checklist:["My first sentence answers the question directly.","I used at least two specific details from the report.","I explained how the details support my answer.","I stayed on the question and did not retell the whole report.","I checked spelling, capitals and punctuation."],
    model:`<p><span class="tag">Answer</span>Besides science, the students learned real-world skills such as writing, public speaking and organizing people. <span class="tag">Cite</span>Their teacher, Mei Chen, says they “had to write a proposal, speak in front of council and organize volunteers.” The class presented its plan to town council in October and convinced council to lend the school the lot for five years. On planting day, the students worked with more than 40 volunteers. <span class="tag">Explain</span>These skills matter because the students will need them in future jobs and in their community, not only in biology class.</p>`},
  {k:"label", text:"Level up"},
  {k:"lesson", title:"Level up: harder short-answer questions", html:`
    <p>Not every short-answer question asks “why” or “what.” The harder ones ask you to do a little more with the report. The method stays the same, <b>Answer, Cite, Explain</b>, but watch what the question demands.</p>
    <div class="grid2">
      <div class="cardlet"><h3>“Explain two viewpoints”</h3><p>Give each side its own sentence and its own detail. One detail for both sides is not enough.</p></div>
      <div class="cardlet"><h3>“Was it a good idea?” “Has it been a success?”</h3><p>Decide, and say so in your first sentence. “Yes, because…” or “No, because…” A marker cannot give credit to “maybe.”</p></div>
      <div class="cardlet"><h3>“Why is this a good headline?”</h3><p>Say what the headline promises, then show with details that the report delivers it.</p></div>
      <div class="cardlet"><h3>Count your words</h3><p>With 100 words you have room for one answer, two or three details and one explaining sentence. Skip the introduction and get to the point.</p></div>
    </div>
    <div class="tip"><b>Whatever the question, the support has to come from the report.</b> Your own experience is welcome in the essay, but here it earns nothing.</div>`},
  {k:"write", id:"m3w2", mode:"short", passage:"garden", title:"Level up: decide, then prove it",
    prompt:"Has the garden project been good for the whole neighbourhood, and not only for the students? Use specific details from the news report to support your answer.",
    target:"Up to 100 words", min:30, max:100,
    checklist:["My first sentence gives a clear yes or no.","I used at least two specific details from the report.","I explained how the details prove my answer.","I stayed within 100 words.","I checked spelling, capitals and punctuation."],
    model:`<p><span class="tag">Answer</span>Yes, the project has been good for the whole neighbourhood. <span class="tag">Cite</span>The lot on Elm Street “sat empty for nearly a decade,” and now it holds more than 600 native plants. Ruth Lambert, who has lived across the street for 31 years, calls the garden “the best thing that’s happened on this street in years.” More than 40 volunteers, including parents and neighbours, came to help plant. <span class="tag">Explain</span>These details show that neighbours wanted the change and now share something better to look at and care for, so the benefit reaches well beyond one science class.</p>`}
  ]});
