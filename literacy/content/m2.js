// Module 2: Narratives and dialogues.
Object.assign(P, {
  skating: {form:"Real-Life Narrative", title:"Learning to Fall", paras:[
    "The winter my family moved from Manila to Sudbury, I learned that snow is not soft. It looks soft in pictures. In real life, it squeaks under your boots and finds its way inside your sleeves. By January, I had decided that a Canadian winter was something to survive indoors, preferably under a blanket with my phone.",
    "My cousin Marisol had other plans. She had moved to Sudbury three years before us, and she treated me like the little sister she never had. She also skated the way other people walk. “You can’t hide until April,” she told me one Saturday, dropping a pair of borrowed skates on my bed. They were two sizes too big, so she stuffed the toes with socks and laced them so tightly that my feet tingled.",
    "The outdoor rink behind the community centre was crowded with little kids who zipped past me as if they had motors. I clung to the boards and inched forward, my ankles wobbling. When I finally let go, my feet shot out in two directions and I landed hard on my hip. A boy who looked about six skated over, studied me seriously, and said, “You have to bend your knees.” Then he was gone.",
    "My face burned, and not from the cold. I wanted to go home. Instead, Marisol crouched beside me. “Everybody falls,” she said. “The trick is learning how. Bend your knees, lean a little forward, and when you go down, go down sideways. Then get up fast, before you have time to feel embarrassed.”",
    "So that became the lesson for the afternoon: not skating, but falling. I fell sideways. I fell forward onto my mittens. Once, I took Marisol down with me, and we lay on the ice laughing while the six-year-old circled us like a small, disapproving referee. Each time, I got up a little faster. Each time, the ice seemed a little less far away.",
    "By the time the rink lights flickered on, I had made it all the way around once without touching the boards. It was not graceful. My arms were out like airplane wings, and I was moving at roughly the speed of a shopping cart with a broken wheel. My hip ached and my toes were frozen inside the extra socks, but I was grinning so hard that my cheeks hurt.",
    "We went back the next Saturday, and the one after that. By March, I could skate backward, badly. More important, I had stopped dreading the cold. Winter was no longer something that happened to me. It was something I could do.",
    "I still think about that first afternoon whenever something new scares me, like my first job interview or my first presentation in English class. I remind myself that the falling is part of it. Nobody gets to skip that part. You just learn to get up before the embarrassment catches you."
  ]},
  bell: {form:"Dialogue", title:"Should Our School Start Later?", intro:"Two Grade 10 students talk at their lockers after a student council survey.", lines:[
    ["Jordan","Did you see the student council survey? They want to know if we’d support moving the first bell from 8:15 to 9:00."],
    ["Amira","I filled it out already. I said yes. Half of my first-period class looks like they’re sleepwalking."],
    ["Jordan","Sure, but think about the other end of the day. If we start at 9:00, we finish at 3:45. I have basketball practice right after school, and a lot of people have jobs."],
    ["Amira","I get that. But I read that teenagers’ sleep cycles shift as they get older. Most of us can’t fall asleep before eleven, so an 8:15 start means we’re running on less sleep than we need."],
    ["Jordan","Okay, but some people would just stay up later if school started later. Then we’d be right back where we started."],
    ["Amira","Maybe some would. But I read that schools that tried later start times saw better attendance in the morning. That has to count for something."],
    ["Jordan","It counts. I’m not saying it’s a bad idea. I just think the council should talk to coaches and local employers before they decide anything. My manager schedules me for four o’clock, and she won’t move a whole shift for one school."],
    ["Amira","That’s fair. I hadn’t thought about how many people it touches. Bus drivers too, probably."],
    ["Jordan","Exactly. A survey of students only tells them what students want."],
    ["Amira","Then let’s suggest it at the next meeting. If they change the schedule, everyone affected should get a say."]
  ]}
});

MODULES.push({ id:"m2", title:"Narratives & Dialogues", time:"45 min",
  blurb:"Read a true-to-life story and a conversation closely: what happens, what it means, and what each speaker believes.",
  blocks:[
  {k:"lesson", title:"Reading a real-life narrative", html:`
    <p>A real-life narrative tells about an important time in a real person’s life. It may be told by the person (“I”) or about the person (“she,” “he,” “they”). It has events, people and a change or a lesson. On the test it is the longest reading, well over 500 words, and it has seven questions.</p>
    <p>The questions usually ask about:</p>
    <div class="grid2">
      <div class="cardlet"><h3>Main idea</h3><p>What is the story really about? Look for what the person learns, often near the end.</p></div>
      <div class="cardlet"><h3>Inference</h3><p>What can you figure out that is not stated? Clue + what you know = inference.</p></div>
      <div class="cardlet"><h3>Character</h3><p>What do people’s words and actions show about them?</p></div>
      <div class="cardlet"><h3>Word meaning</h3><p>Use the words around an unfamiliar word or phrase to work out what it means.</p></div>
      <div class="cardlet"><h3>The writer’s choices</h3><p>Why did the writer include this detail, this comparison or this punctuation mark?</p></div>
      <div class="cardlet"><h3>Connections</h3><p>How does an idea in the story fit another situation, or something you already know?</p></div>
    </div>
    <div class="tip"><b>Inference check:</b> a good inference is supported by the text. If you cannot point to a clue, it is only a guess.</div>`},
  {k:"set", passage:"skating", qs:[
    {type:"single", id:"m2q13", skill:"Main idea", fam:"R2", prompt:"What is the main idea of this narrative?",
      options:["Learning how to fall gave the narrator a way to face new and frightening things.","Moving to a new country is easier with a relative who has already made the move.","Marisol proves that she is a patient teacher and a skilled skater.","With enough practice, the narrator becomes a confident skater by March."], answer:0,
      explain:"Paragraphs 7 and 8 show what the afternoon gave her: a way to handle anything new that scares her. The other choices are details, or they go further than the text does (she skates backward “badly”)."},
    {type:"single", id:"m2q25", skill:"Inference", fam:"R2", prompt:"In paragraph 1, the narrator says “snow is not soft.” What does this suggest?",
      options:["Canadian winter is harder than she had expected.","She was hurt during her first snowstorm in Sudbury.","She wishes that her family had stayed in Manila.","She thinks people who enjoy winter are only pretending."], answer:0,
      explain:"She contrasts how snow looks in pictures with how it feels in real life, then decides winter is “something to survive indoors.” Winter turned out to be harder than she expected. Nothing says she was hurt, wants to move back or doubts other people."},
    {type:"single", id:"m2q4", skill:"The writer’s choices", fam:"R2", prompt:"Why does the writer include the boy who “looked about six” (paragraph 3)?",
      options:["To show that the outdoor rink was an unsafe place to skate","To add humour and show how much of a beginner the narrator was","To introduce a character who later becomes the narrator’s friend","To explain why the narrator’s family moved to Sudbury"], answer:1,
      explain:"A small child giving her serious skating advice is funny, and it shows that even little kids skate better than she does."},
    {type:"single", id:"m2q14", skill:"Inference", fam:"R2", prompt:"In paragraph 5, the six-year-old circles the cousins “like a small, disapproving referee.” What does this comparison suggest about him?",
      options:["He takes skating seriously and is not impressed by their laughing.","He has been put in charge of keeping the younger skaters on the rink safe.","He is angry because the two cousins are blocking his way around the rink.","He wants to join in their game but is too shy to ask."], answer:0,
      explain:"A referee watches for mistakes, and “disapproving” means he does not like what he sees. He is the same serious boy who told her to bend her knees. Nothing says he is in charge, angry or wants to play."},
    {type:"dropdown", id:"m2q15", skill:"Word meaning", fam:"R2", prompt:"Use the context to complete the sentence.",
      parts:["In paragraph 7, the narrator says she had “stopped dreading the cold.” Here, dreading means ", {o:["feeling anxious about","getting used to","being curious about","complaining about"],a:0}, "."],
      explain:"Earlier she wanted to “survive” winter indoors. By March, winter is “something I could do.” What stopped was her fear of it, so dreading means feeling anxious about something that is coming."},
    {type:"order", id:"m2q5", skill:"Sequence", fam:"R1", prompt:"Put these events in the order they happen.",
      items:["Marisol brings borrowed skates to the narrator.","The narrator falls after letting go of the boards.","Marisol explains how to fall sideways.","The narrator makes it around the rink once."],
      explain:"The skates arrive (paragraph 2), she falls (paragraph 3), Marisol teaches her to fall (paragraph 4), and she makes it around the rink (paragraph 6)."},
    {type:"single", id:"m2q18", skill:"The writer’s choices", fam:"R2", prompt:"In paragraph 5, why does the writer use a colon in “that became the lesson for the afternoon: not skating, but falling”?",
      options:["To introduce an explanation of what the lesson really was","To show that someone is about to speak","To separate two ideas that are not related","To begin a list of everything the cousins did that afternoon"], answer:0,
      explain:"A colon can point forward to an explanation. Here it sets up the surprise: the lesson was falling, not skating. There is no speech and no list."},
    {type:"multi", id:"m2q16", skill:"Character", fam:"R2", prompt:"Which TWO words best describe Marisol in this narrative? Select two.",
      options:["Encouraging","Patient","Competitive","Reserved","Easily embarrassed"], answer:[0,1],
      explain:"She gets her cousin onto the ice, crouches beside her after the fall, says “Everybody falls,” and spends the whole afternoon teaching one skill. That is encouraging and patient. She never competes, she is outgoing, and she laughs when she is knocked over."},
    {type:"single", id:"m2q26", skill:"Inference", fam:"R2", prompt:"In paragraph 4, the narrator says, “My face burned, and not from the cold.” What does this show?",
      options:["She was embarrassed after falling and being corrected by a small child.","She was getting warm from the effort of learning to skate.","She was angry with the boy for laughing at the way she fell.","She had scraped her cheek on the ice when she landed."], answer:0,
      explain:"Her face burns from embarrassment: she has just fallen hard, and a boy of about six has told her what she is doing wrong. The next sentence confirms it: “I wanted to go home.” The boy did not laugh, and she landed on her hip, not her face."},
    {type:"single", id:"m2q17", skill:"Connections", fam:"R3", prompt:"Which situation is most like what the narrator learns in this story?",
      options:["A nervous student stumbles over a line in a speech, keeps going, and volunteers to speak again the next week.","A student decides not to try out for the school play because she is afraid she will forget her lines on stage.","A talented swimmer who has barely practised wins her first race easily and decides to enter a second one.","A student quits the basketball team after missing an important shot in front of a crowd at a home game."], answer:0,
      explain:"The narrator learns that falling is part of doing something new, and that you get up and go on. Only the speaker stumbles, recovers and tries again. The others avoid failing, never fail, or stop after failing."}
  ]},
  {k:"lesson", title:"Reading a dialogue", html:`
    <p>A dialogue is a conversation between two people, usually with different opinions. On the test each speaker’s turn is a numbered paragraph, and the dialogue has five questions. Track three things as you read:</p>
    <ul>
      <li><b>Position:</b> what each speaker believes.</li>
      <li><b>Reasons:</b> why they believe it. Look for words like <em>because, but, I read that</em>.</li>
      <li><b>Shift:</b> does anyone change their mind, or do they agree on something by the end?</li>
    </ul>
    <div class="tip"><b>Quick trick:</b> before you answer, sum up each speaker in about five words. For example: “Ravi: wants the cheaper phone plan.”</div>`},
  {k:"set", passage:"bell", qs:[
    {type:"single", id:"m2q8", skill:"Viewpoint", fam:"R1", prompt:"What is Amira’s main reason for supporting a later start?",
      options:["A later start would give students more time to finish their homework.","Teenagers’ sleep patterns make an early start hard.","A later start would be better for the basketball team.","The student council asked her to support it."], answer:1,
      explain:"In paragraph 4, Amira says teenagers’ sleep cycles shift and “most of us can’t fall asleep before eleven.”"},
    {type:"single", id:"m2q9", skill:"Viewpoint", fam:"R1", prompt:"What is Jordan’s main concern?",
      options:["Teachers would have to stay at school later in the day.","A later finish could interfere with sports and jobs.","Students would no longer have time to eat breakfast.","The student council’s survey was unfair."], answer:1,
      explain:"In paragraph 3, Jordan points out that school would end at 3:45, which affects practice and part-time jobs. Paragraph 7 gives an example: a shift that starts at four o’clock."},
    {type:"sort", id:"m2q21", skill:"Viewpoint", fam:"R2", prompt:"Who would be more likely to say each statement?", cats:["Amira","Jordan"],
      items:[["Students learn better when they are well rested.",0],["A schedule change could make it hard to get to work on time.",1],["Better morning attendance is a good sign.",0],["A later start might not lead to any more sleep.",1]],
      explain:"Amira argues from sleep and attendance (paragraphs 2, 4 and 6). Jordan raises after-school commitments (paragraphs 3 and 7) and doubts that students would sleep more (paragraph 5)."},
    {type:"dropdown", id:"m2q11", skill:"Tone", fam:"R2", prompt:"Complete the sentence.",
      parts:["The tone of the conversation is best described as ", {o:["hostile","respectful","sarcastic","bored"],a:1}, " because both speakers ", {o:["refuse to change their opinions","listen and respond to each other’s points","interrupt each other","avoid the topic"],a:1}, "."],
      explain:"They disagree, but each answers the other’s point. Amira says “I get that” and “That’s fair.” Jordan says “It counts. I’m not saying it’s a bad idea.”"},
    {type:"single", id:"m2q27", skill:"Word meaning", fam:"R2", prompt:"In paragraph 2, Amira says that half of her first-period class “looks like they’re sleepwalking.” What does she mean?",
      options:["Many students are too tired to pay attention early in the morning.","Several students in her class have a medical problem with sleep.","Her first-period class is too dull to keep students interested.","Students walk to class slowly because they would rather not go."], answer:0,
      explain:"Sleepwalkers move around without being fully awake. Amira is exaggerating to make a point: at 8:15, many of her classmates are in the room but too tired to take anything in. That is why she supports a later start."},
    {type:"single", id:"m2q22", skill:"Conclusion", fam:"R1", prompt:"How does the conversation end?",
      options:["Jordan is persuaded that the later start would be good for most students.","They agree to ask the council to consult other groups before it decides.","They decide that the council’s survey was a waste of everyone’s time.","Amira decides that the later start is a bad idea because of jobs and sports."], answer:1,
      explain:"Neither changes sides. Amira takes up Jordan’s point that other people should be consulted and offers to raise it at the next meeting: “everyone affected should get a say.”"},
    {type:"single", id:"m2q28", skill:"Connections", fam:"R3", prompt:"In paragraph 8, Amira says, “That’s fair. I hadn’t thought about how many people it touches.” Which situation is most like the way she responds here?",
      options:["A student who wants a later curfew admits that her parents’ worry about safety makes sense, and offers to text when she arrives.","A student stops arguing and agrees with everything her friend says, because she wants to avoid a fight before class.","A student repeats her opinion a little more loudly each time her friend raises a problem with the plan she has made.","A student changes the subject as soon as her friend points out a problem, and never comes back to the plan they were making together."], answer:0,
      explain:"Amira does not give up her opinion, and she does not brush Jordan’s point aside. She admits it is a good point and then builds on it (“Bus drivers too, probably”). Only the student who accepts her parents’ worry and offers a way forward does both."}
  ]}
  ]});
