// Module 8: extra reading practice with feedback, written November 2026.
// Three new passages (information paragraph, real-life narrative, dialogue) and a short written answer.
Object.assign(P, {
  leaves: {form:"Information Paragraph", title:"Why Leaves Change Colour", paras:[
    "Every fall, the forests of Ontario turn red, orange and gold. Surprisingly, some of those colours were in the leaves all summer. During the summer, leaves are green because they are full of chlorophyll, a chemical that captures sunlight and helps the tree turn water and air into food. Chlorophyll is so plentiful that it hides the other colours in the leaf. In the fall, as the days grow shorter and the nights grow cooler, the tree begins to prepare for winter. It slowly stops making chlorophyll, and the green fades away. Underneath, yellow and orange chemicals called carotenoids have been in the leaf all along, and now they can finally be seen. Red is different. The bright reds and purples of maples are made fresh in the fall, when sugar trapped in the leaves is turned into new chemicals called anthocyanins. Scientists believe these red chemicals may protect the leaf from too much sunlight while the tree pulls nutrients back into its branches before the leaf drops. Weather makes a big difference to the show. A fall with sunny days and cool, but not freezing, nights produces the brightest reds, because sunshine helps the leaves make more sugar. A warm, cloudy fall usually brings duller colours, and an early frost can end the season before it reaches its peak. That is why no two autumns look exactly alike."
  ]},
  openmic: {form:"Real-Life Narrative", title:"Louder", paras:[
    "Rosa Alvarez had been writing poems since Grade 7, in the back of a math notebook that nobody was allowed to touch. She had let her best friend, Noor, read a few of them, but she had never read one out loud to anyone. So when Noor signed them both up for the school’s open-mic night without asking, Rosa did not speak to her for an entire lunch period.",
    "“You’re good,” Noor said finally. “Somebody besides me should know it.”",
    "Rosa had three weeks. She chose a poem about her grandfather’s hands, which had fixed every broken thing in her family’s house. She practised it in her bedroom until she knew every word. Then she practised it in front of the mirror, which was worse, because she could watch her face turn red.",
    "On the night of the show, the library was packed. Students sat on tables and on the carpet, and a few teachers stood at the back with paper cups of hot chocolate. Rosa was sixth on the list. While the first five performers took their turns, she read her poem again and again, until the words began to look like a language she did not speak.",
    "When her name was called, she walked to the microphone and unfolded the paper. Her hands were shaking so badly that the page rattled. She read the first line too quickly, in a voice so quiet that someone at the back called out, “Louder!” For a second, she thought about walking straight off the stage.",
    "Then she looked down and saw the line about her grandfather holding a screwdriver “the way other people hold a pen.” She remembered him at the kitchen table, fixing her bike light while she watched. She stopped trying to get through the poem and started trying to show it to the room. She slowed down. Her voice grew steadier, and by the last verse she was looking up instead of at the page.",
    "When she finished, there was a pause just long enough for her to wonder whether something had gone wrong. Then the applause came, and someone in the front row whistled. Afterwards, a Grade 12 student she had never met asked whether she would write something for the school magazine.",
    "Rosa still gets nervous before she reads. Last month she read at a public library downtown, and her hands shook for the first two lines. She has learned that the fear does not go away. “You just have to care about the words more than you care about the fear,” she says."
  ]},
  defence: {form:"Dialogue", title:"A New Position", intro:"A soccer coach talks with a player after practice about changing positions.", lines:[
    ["Coach Reyes","Jordan, got a minute? I want to talk about Saturday’s game. I’d like to try you at centre back."],
    ["Jordan","Defence? I’ve played striker since I was eight. I scored four goals this season."],
    ["Coach Reyes","You did, and two of them came from winning the ball back near our own net and running the whole field. You read the play better than anyone on the team."],
    ["Jordan","But nobody notices defenders. Strikers are the ones who get the goals."],
    ["Coach Reyes","Right now we’re losing games because other teams walk straight through our back line. Ellis’s ankle is still healing, and nobody else is fast enough to cover that space."],
    ["Jordan","So it’s only until Ellis comes back?"],
    ["Coach Reyes","That’s the plan. Give it three games. If it doesn’t work for you, we’ll talk again. And you’ll still take every free kick."],
    ["Jordan","Every free kick?"],
    ["Coach Reyes","Every one. Your long passes are the best we have."],
    ["Jordan","Okay. Three games. But if I score from defence, I’m celebrating twice as hard."],
    ["Coach Reyes","Deal. I’ll even celebrate with you."]
  ]}
});

MODULES.push({ id:"m8", title:"More Reading", time:"50 min",
  blurb:"Three new passages to practise on: an information paragraph, a real-life narrative and a dialogue, plus a short written answer. You see the answer and why after each question.",
  blocks:[
  {k:"lesson", title:"Before you start", html:`
    <p>Three new passages, written at the level of the real test. This time you <b>check each answer as you go</b> and see why it is right.</p>
    <div class="grid2">
      <div class="cardlet"><h3>Read the question first</h3><p>Know what you are looking for before you reread the passage.</p></div>
      <div class="cardlet"><h3>Prove it</h3><p>Find the sentence in the passage that supports your answer before you choose it.</p></div>
      <div class="cardlet"><h3>Watch for half-right answers</h3><p>A choice can be true and still not answer the question that was asked.</p></div>
      <div class="cardlet"><h3>Main idea test</h3><p>Could the answer be a title for the whole passage? If it fits only one part, it is a detail.</p></div>
    </div>`},
  {k:"label", text:"Information paragraph"},
  {k:"set", passage:"leaves", qs:[
    {type:"single", id:"rw-01", skill:"Main idea", fam:"R2", prompt:"What is the main idea of this paragraph?",
      options:["Fall colours come from chemicals in leaves, and the weather affects how bright they are.","Chlorophyll is the chemical that makes leaves green and helps the tree make food.","The brightest red leaves appear after sunny days and cool nights in the fall.","Trees pull nutrients back into their branches before their leaves drop."], answer:0,
      explain:"The paragraph explains where each colour comes from and how weather changes the show. The other choices are single details from it."},
    {type:"sort", id:"rw-02", skill:"Finding details", fam:"R1", prompt:"According to the paragraph, which colours were in the leaf all summer, and which are made new in the fall?", cats:["In the leaf all summer","Made new in the fall"],
      items:[["Yellow",0],["Orange",0],["Red",1],["Purple",1]],
      explain:"The yellow and orange carotenoids “have been in the leaf all along.” The reds and purples “are made fresh in the fall” from trapped sugar."},
    {type:"single", id:"rw-03", skill:"Finding details", fam:"R1", prompt:"According to the paragraph, why can’t we see yellow and orange in leaves during the summer?",
      options:["Chlorophyll is so plentiful that it hides them.","Those chemicals are only made when it gets cold.","The summer sun is too bright to show those colours.","Trees keep those colours in their branches until fall."], answer:0,
      explain:"“Chlorophyll is so plentiful that it hides the other colours in the leaf.” The yellows and oranges were there all along; they are not made in the cold."},
    {type:"single", id:"rw-04", skill:"Word meaning", fam:"R2", prompt:"What does the word “plentiful” mean as it is used in this paragraph?",
      options:["Present in large amounts","Easy to see from far away","Made fresh every morning","Needed to stay alive"], answer:0,
      explain:"There is so much chlorophyll that it covers up the other colours. “Plentiful” means there is a lot of it."},
    {type:"single", id:"rw-05", skill:"Cause and effect", fam:"R2", prompt:"Which kind of fall weather produces the brightest reds?",
      options:["Sunny days and cool nights that are not freezing","Warm, cloudy days and mild nights all fall long","An early, hard frost in the middle of September","Rainy days followed by nights below freezing"], answer:0,
      explain:"“A fall with sunny days and cool, but not freezing, nights produces the brightest reds.” A warm, cloudy fall brings duller colours, and frost can end the season early."},
    {type:"single", id:"rw-06", skill:"The writer’s choices", fam:"R3", prompt:"Why does the writer end with the sentence “That is why no two autumns look exactly alike”?",
      options:["To sum up how changing weather makes each fall different","To suggest that scientists still do not understand fall colours","To introduce a new topic about how forests change over time","To warn readers that early frost is becoming more common"], answer:0,
      explain:"The sentences just before explain how sun, cloud and frost change the colours. The last sentence sums that up. Nothing says scientists are confused or that frost is more common."}
  ]},
  {k:"label", text:"Real-life narrative"},
  {k:"set", passage:"openmic", qs:[
    {type:"single", id:"rw-07", skill:"Inference", fam:"R2", prompt:"Why did Rosa not speak to Noor for an entire lunch period?",
      options:["She was upset that Noor had signed her up without asking.","She was busy choosing which poem she would read.","She was worried that Noor had read her notebook.","She thought that Noor was a better poet than she was."], answer:0,
      explain:"Noor signed them both up “without asking,” and Rosa had never read a poem out loud to anyone. Her silence shows she was upset about it. Noor had already read some of the poems, so that was not the worry."},
    {type:"single", id:"rw-08", skill:"Finding details", fam:"R1", prompt:"According to paragraph 3, what was Rosa’s poem about?",
      options:["Her grandfather’s hands, which fixed every broken thing","Her best friend, who believed she was a good writer","Her fear of speaking in front of a crowded room","Her math notebook, where she wrote all her poems"], answer:0,
      explain:"“She chose a poem about her grandfather’s hands, which had fixed every broken thing in her family’s house.”"},
    {type:"single", id:"rw-09", skill:"Word meaning", fam:"R2", prompt:"In paragraph 4, what does it mean that the words “began to look like a language she did not speak”?",
      options:["She had read them so many times that they stopped making sense.","The poem was written in a language that Rosa was still learning.","The light in the library was too dim for her to read clearly.","Someone had changed the words of her poem without telling her."], answer:0,
      explain:"She read the poem “again and again” while she waited. Reading something over and over can make the words look strange, as if you could no longer understand them."},
    {type:"single", id:"rw-10", skill:"Inference", fam:"R2", prompt:"What helps Rosa get through her poem at the microphone?",
      options:["Remembering her grandfather makes her want to share the poem, not just finish it.","Someone at the back of the room calls out and tells her to speak louder.","Noor stands beside her at the microphone and reads the first line with her.","Three weeks of practising in front of the mirror have taken away her nerves."], answer:0,
      explain:"The turning point is in paragraph 6: she remembers her grandfather and starts “trying to show it to the room.” The shout of “Louder!” only made her want to leave, Noor is not at the microphone, and practice had not stopped her hands from shaking."},
    {type:"order", id:"rw-11", skill:"Sequence", fam:"R1", prompt:"Put these events in the order they happen.",
      items:["Noor signs Rosa up for open-mic night.","Rosa practises her poem in front of the mirror.","Someone at the back calls out, “Louder!”","Rosa slows down and looks up at the audience.","A Grade 12 student asks her to write for the magazine."],
      explain:"The sign-up (paragraph 1), practising (paragraph 3), the shout (paragraph 5), the turning point (paragraph 6) and the invitation after the show (paragraph 7)."},
    {type:"single", id:"rw-12", skill:"Connections", fam:"R3", prompt:"Which statement BEST describes what Rosa has learned?",
      options:["Caring about what you share can matter more than being afraid.","Practising in front of a mirror is the best way to beat nerves.","After you perform once, you never feel nervous again.","It is always easier to read your own poems than other people’s."], answer:0,
      explain:"Her own words sum it up: “care about the words more than you care about the fear.” The last paragraph says she still gets nervous, so the fear has not gone away."}
  ]},
  {k:"write", id:"rw-w1", mode:"short", passage:"openmic", title:"Short written answer",
    prompt:"How does Rosa change from the beginning of the narrative to the end? Use details from the narrative to support your answer.",
    target:"Up to 100 words", min:30, max:100,
    checklist:["I answered the question in my first sentence.","I used at least two specific details from the narrative.","I explained how the details show the change.","I checked spelling and punctuation."],
    model:`<p><span class="tag">Answer</span>Rosa changes from someone who hides her poems to someone who shares them, even though she is still nervous. <span class="tag">Cite</span>At first, she keeps her poems in a notebook “nobody was allowed to touch” and is angry when Noor signs her up. By the end, she reads at a public library downtown and is asked to write for the school magazine. <span class="tag">Explain</span>Her fear does not disappear, but she learns to care more about the words than the fear.</p>`},
  {k:"label", text:"Dialogue"},
  {k:"set", passage:"defence", qs:[
    {type:"single", id:"rw-13", skill:"Viewpoint", fam:"R2", prompt:"Why does the coach want Jordan to play centre back?",
      options:["The team needs a fast player who reads the game to stop other teams’ attacks.","Jordan has not scored enough goals as a striker this season.","Jordan asked to try a new position in Saturday’s game.","The coach wants Ellis to play striker once Ellis’s ankle heals."], answer:0,
      explain:"Other teams “walk straight through our back line,” Ellis is hurt, and “nobody else is fast enough to cover that space.” The coach also says Jordan reads the play best. Jordan’s four goals are praised, not criticized."},
    {type:"single", id:"rw-14", skill:"Inference", fam:"R2", prompt:"Why does the coach point out that two of Jordan’s goals came from winning the ball back near their own net?",
      options:["To show that Jordan already has skills a defender needs","To remind Jordan that most goals come from lucky plays","To suggest that Jordan should stop running the whole field","To prove that Jordan has been playing the wrong position"], answer:0,
      explain:"Winning the ball back near your own net is a defender’s job. The coach uses Jordan’s own goals to show that Jordan can already do it."},
    {type:"sort", id:"rw-15", skill:"Viewpoint", fam:"R1", prompt:"Who makes each point?", cats:["Coach Reyes","Jordan"],
      items:[["The team keeps losing because the back line is beaten.",0],["People do not notice defenders.",1],["Jordan will still take every free kick.",0],["Jordan has played striker since age eight.",1]],
      explain:"The coach explains the team’s problem and offers the free kicks. Jordan defends playing striker and worries that defenders are not noticed."},
    {type:"single", id:"rw-16", skill:"Character", fam:"R2", prompt:"Which word BEST describes how Jordan feels at the start of the conversation?",
      options:["Reluctant","Delighted","Relieved","Bored"], answer:0,
      explain:"Jordan pushes back right away: “Defence? I’ve played striker since I was eight.” Jordan is unwilling at first, not pleased or bored."},
    {type:"single", id:"rw-17", skill:"Inference", fam:"R2", prompt:"What does Jordan’s last line suggest?",
      options:["Jordan has accepted the change and still hopes to score.","Jordan is still angry about being moved to defence.","Jordan thinks defenders are not allowed to score.","Jordan plans to ask to play striker again tomorrow."], answer:0,
      explain:"“Okay. Three games” shows Jordan agrees, and the joke about celebrating “twice as hard” shows Jordan still hopes to score. The tone is playful, not angry."}
  ]}
  ]});
