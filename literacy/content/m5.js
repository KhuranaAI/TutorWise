// Module 5: the opinion essay. Marking codes follow EQAO's opinion essay scoring guides
// (checked November 2026); the wording and the sample essays are ours.
MODULES.push({ id:"m5", title:"The Opinion Essay", time:"60 min",
  blurb:"Learn how the essay is marked, compare a weak essay with a strong one, then plan and write your own.",
  blocks:[
  {k:"lesson", title:"How your essay is marked", html:`
    <p>The essay is worth about a quarter of the whole test. You are given a topic that teenagers know about and asked for your opinion. You write <b>three or more paragraphs</b>, up to about <b>500 words</b>. It gets two separate codes:</p>
    <div class="tablewrap"><table class="facts">
      <tr><th>Topic development</th><th>What the marker sees</th></tr>
      <tr><td>Code 60</td><td>A clear opinion that never changes, with specific, well-chosen details. The ideas build on each other.</td></tr>
      <tr><td>Code 50</td><td>A clear opinion with enough <b>specific</b> details, in a logical order.</td></tr>
      <tr><td>Code 40</td><td>A clear opinion with enough details, but only some are specific. The organization works but feels mechanical.</td></tr>
      <tr><td>Code 30</td><td>A clear opinion, but the details are too few or too vague.</td></tr>
      <tr><td>Code 10–20</td><td>No clear opinion, or an opinion with almost nothing to support it.</td></tr>
      <tr><td>Code I</td><td>No credit: off topic, only repeats the prompt, or just says yes or no.</td></tr>
    </table></div>
    <div class="tablewrap"><table class="facts">
      <tr><th>Conventions</th><th>What the marker sees</th></tr>
      <tr><td>Code 40</td><td>You are in control of spelling, grammar and punctuation.</td></tr>
      <tr><td>Code 30</td><td>There are errors, but they do not distract the reader.</td></tr>
      <tr><td>Code 20</td><td>Errors distract the reader.</td></tr>
      <tr><td>Code 10</td><td>Errors make the writing hard to understand, or there are fewer than 30 words.</td></tr>
    </table></div>
    <div class="tip"><b>Where the points are:</b> the step from Code 30 to Code 50 is almost always about <b>specific details</b>. It is marked as a first draft, so a few small slips are fine if they do not distract.</div>`},
  {k:"lesson", title:"The shape of a strong essay", html:`
    <ol>
      <li><b>Introduction:</b> state your opinion clearly in one sentence. A short hook before it is a bonus, not a must.</li>
      <li><b>Body paragraph 1:</b> your first reason → proof (a fact, an example or an experience) → why it matters.</li>
      <li><b>Body paragraph 2:</b> the same pattern with a new reason. Open with a transition (<em>Second, Another reason, In addition</em>).</li>
      <li><b>Body paragraph 3 (optional):</b> a third reason, or the other side’s best point and why your view is still stronger.</li>
      <li><b>Conclusion:</b> restate your opinion in new words and sum up your reasons. Do not add a new argument.</li>
    </ol>
    <p>Pick one side and stay on it. An essay that argues both sides and never decides cannot score above Code 20.</p>
    <div class="tip"><b>Specific beats general.</b> “Sports are good for students” is vague. “After a season of 6 a.m. practices, a swimmer knows how to get out of bed without being told” is proof.</div>`},
  {k:"label", text:"Practise the building blocks"},
  {k:"q", type:"single", id:"m5q6", skill:"Opinion statement", fam:"W1", prompt:"Prompt: <em>Should students be allowed to use phones in class?</em>Which is the strongest opinion statement?",
    options:["Phones should be allowed in class because, with clear rules, they are useful learning tools.","Phones in class are a topic that many schools, parents and students are debating right now.","There are good arguments on both sides of the phone debate, and each side deserves to be heard.","In this essay, I will discuss whether or not students should be allowed to use phones in class."], answer:0,
    explain:"It takes a side and gives the reason. The others announce the topic or sit on the fence, so a marker cannot tell what the writer believes."},
  {k:"q", type:"single", id:"m5q7", skill:"Supporting details", fam:"W1", prompt:"Which detail BEST supports the reason “school sports teach teamwork”?",
    options:["A volleyball player who never passes soon costs the team points, so players learn to rely on each other.","Sports are fun, and many students say that being on a team is the best part of their school week.","Teamwork is one of the most important skills in life, and employers say they look for it in every person they hire.","Our school has volleyball, basketball and soccer teams, and each one practises three times a week."], answer:0,
    explain:"It shows teamwork being learned, with a specific example. The others are general statements, or facts that prove nothing about teamwork."},
  {k:"q", type:"sort", id:"m5q8", skill:"Paragraph structure", fam:"W2", prompt:"What job does each sentence do in a body paragraph?", cats:["Reason","Proof","Why it matters"],
    items:[["School sports teach students to manage their time.",0],["An athlete with practice three nights a week has to finish homework before supper or between classes.",1],["College and full-time jobs demand the same planning, so the habit pays off after the season ends.",2],["Teams also give students a place to belong.",0],["A Grade 9 student who knows nobody can have twelve teammates by the end of the first week.",1]],
    explain:"A reason is a claim. Proof is a specific fact, example or experience that backs it up. “Why it matters” connects the proof back to the opinion."},
  {k:"q", type:"single", id:"m5q11", skill:"Body paragraphs", fam:"W1", prompt:"Read this body paragraph.<em>Phones are bad in class. They are really distracting. Phones distract people a lot. That is why they are bad.</em>What is its main weakness?",
    options:["It repeats one idea and gives no specific detail or example.","It gives too many different reasons and does not explain any of them.","It drifts off topic and ends up arguing about something else.","It is too long for a body paragraph and should be split in two."], answer:0,
    explain:"All four sentences say the same thing. A marker is looking for proof: who gets distracted, how, and what happens as a result. This is the pattern that keeps essays at Code 20 or 30."},
  {k:"q", type:"single", id:"m5q9", skill:"Organization", fam:"W2", prompt:"A student is writing an essay arguing that the school day should start later. Which plan is strongest?",
    options:["Opinion in the introduction → sleep, with an example → attendance, with an example → a reply to the worry about sports and jobs → conclusion","Introduction → three reasons for a later start → three reasons against a later start → a conclusion saying that both sides have good points","Opinion in the introduction → sleep → sleep again in different words → attendance, with no example → a conclusion with a brand-new reason","Introduction → the history of school schedules in Ontario → a story about being late for class once → a conclusion that gives the opinion for the first time"], answer:0,
    explain:"It keeps one opinion throughout, gives each reason its own paragraph with proof, and deals with the other side. The plan with reasons for and against never decides. The plan that returns to sleep repeats itself and adds a new argument at the end. The plan that begins with history drifts off topic and hides the opinion until the last paragraph."},
  {k:"q", type:"single", id:"m5q10", skill:"Conclusions", fam:"W2", prompt:"Which is the best concluding paragraph for an essay arguing that students should learn to cook in school?",
    options:["A skill people use three times a day belongs on the timetable. Cooking classes save students money, keep them healthier and prepare them to live alone.","In conclusion, there are many opinions about cooking classes. Some people like them and some people do not, and it is hard to say who is right.","Cooking classes are good for students. Another reason is that cooking can become a career, and many famous chefs started when they were young.","That is my essay about cooking classes. I hope you enjoyed reading it, and I hope you agree with me now that you have heard my reasons."], answer:0,
    explain:"It restates the opinion in new words and sums up the reasons. The paragraph that says it is hard to know who is right backs away from the opinion. The one about chefs adds a new argument. The one that hopes you enjoyed the essay restates neither the opinion nor a single reason."},
  {k:"lesson", title:"Two essays on the same topic", html:`
    <p class="kicker">Prompt: <b>Should high schools switch to a four-day school week?</b> Read both. Then look at why one would score much higher.</p>
    <div class="sample"><span class="score">Essay A · about Code 30 for topic development, Code 20 for conventions</span>
      <p>I think high schools should not have a four day week. It is a bad idea for alot of reasons. First of all students would have longer days and that is bad, nobody wants to be at school longer then they have to. Also it would be hard for some people, there are things they have to do. School is important and we need to learn things so we should of kept five days. Another reason is teachers they would not like it. In conclusion a four day week is not good and thats why I think we should keep it the way it is.</p>
      <p class="muted small"><b>Why:</b> the opinion is clear and stays the same, which is why it is not lower. But every reason is vague. Hard for whom? Why would teachers not like it? There is not one example, and it is a single paragraph of about 100 words when the task asks for at least three paragraphs. The errors come in almost every sentence (comma splices, “alot,” “then” for “than,” “should of,” “teachers they,” a missing apostrophe), so the reader keeps stopping to sort them out.</p></div>
    <div class="sample tagged"><span class="score">Essay B · about Code 50 to 60 for topic development, Code 40 for conventions</span>
      <p><span class="tag">Hook</span>Imagine every weekend lasting three days. It sounds like a dream, and some schools have tried a four-day week to make it real. <span class="tag">Opinion</span>However, I believe Ontario high schools should keep the five-day week, because it is better for learning and fairer to students who have jobs and other commitments.</p>
      <p><span class="tag">Reason 1</span>First, a five-day week gives students time to learn without rushing. <span class="tag">Proof</span>To cover the same material in four days, each school day would have to be about an hour and a half longer. A student who already struggles to focus in the last period of the afternoon would be expected to concentrate until almost five o’clock. <span class="tag">Why it matters</span>When lessons are spread across five days, teachers can move at a steady pace, and students have more chances to ask questions before a topic is left behind.</p>
      <p><span class="tag">Reason 2</span>Second, longer days would squeeze everything that happens after school. <span class="tag">Proof</span>Many students in my grade work part-time, play on teams or look after younger brothers and sisters. A shift that starts at four o’clock is impossible if the final bell rings at a quarter to five. <span class="tag">Why it matters</span>Employers will not rearrange their schedules for one school, so students could lose jobs that they depend on.</p>
      <p><span class="tag">Other side</span>Supporters of the four-day week argue that an extra day off would let students rest and catch up. <span class="tag">Reply</span>That might be true for a few weeks. Over a whole year, though, a week of four exhausting days followed by a day of recovery is not real rest; it is the same work packed into less time.</p>
      <p><span class="tag">Conclusion</span>In the end, the five-day week is the better choice. It gives students room to learn at a reasonable pace and protects the jobs, teams and family duties that fill their afternoons. A three-day weekend sounds wonderful, but it is not worth what students would have to give up to get it.</p>
      <p class="muted small"><b>Why:</b> the same opinion as Essay A, but each reason has proof you can picture (an hour and a half longer, a four o’clock shift) and an explanation. It answers the other side, and the conclusion sums up without adding anything new. It is about 310 words: long enough to develop two reasons, and well under the limit.</p></div>
    <p class="muted small">These essays and the codes beside them are ours, judged the way the marking guide describes. They are not official EQAO samples.</p>`},
  {k:"write", id:"m5w1", mode:"essay", title:"Your turn: opinion essay",
    prompt:"Is it a good idea for high school students to have a part-time job during the school year? Write a series of paragraphs that states your opinion and supports it with reasons and details.",
    target:"Three or more paragraphs, up to about 500 words", min:120, max:500, planner:true,
    checklist:["My opinion is clear in the introduction and stays the same all the way through.","Each body paragraph makes one main point.","Each point has specific proof: a fact, an example or an experience.","I explained why each piece of proof matters.","I used transitions between paragraphs.","My conclusion restates my opinion without adding a new argument.","I reread for sentences that run together, missing capitals, apostrophes and sound-alike words.","If I brought in the other side, I answered its strongest point fairly."],
    model:null},
  {k:"lesson", title:"More topics to practise", html:`
    <p>The more opinions you plan, the faster you get. For each topic below, give yourself five minutes to write an opinion sentence and two reasons with proof. Write a full essay on paper for any you like, and ask your tutor to mark it.</p>
    <ul>
      <li>Should the school year run all twelve months, with shorter breaks spread through the year?</li>
      <li>Is it better to live in a big city or a small town?</li>
      <li>Should every student have to take a cooking or personal finance course?</li>
      <li>Do teenagers spend too much time on their phones?</li>
      <li>Should schools replace printed textbooks with tablets or laptops?</li>
    </ul>
    <p><b>Level up:</b> for any of these, add a paragraph that gives the other side’s best argument and explains why you still disagree. An essay that answers the other side fairly is harder to argue with.</p>
    <div class="tip"><b>No opinion?</b> Pick the side you can find the most proof for. Markers score how well you support an opinion, not which side you choose.</div>`}
  ]});
