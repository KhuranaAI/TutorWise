// Module 1: Know the Test.
// Every fact here was checked against EQAO's OSSLT page and test framework (November 2026).
MODULES.push({ id:"m1", title:"Know the Test", time:"25 min",
  blurb:"Learn exactly what the OSSLT looks like and how it is scored, so nothing on test day is a surprise.",
  blocks:[
  {k:"lesson", title:"The OSSLT at a glance", html:`
    <p>The Ontario Secondary School Literacy Test checks whether you can read and write well enough for school, work and everyday life. Meeting the literacy requirement is needed to graduate. Most students write the test in Grade 10.</p>
    <div class="tablewrap"><table class="facts">
      <tr><th>What</th><th>Details</th></tr>
      <tr><td>Format</td><td>On a computer, in <b>two sessions</b>. Session A is planned for about 65 minutes and Session B for about 75. You may take extra time, but you finish each session in one sitting. Your school decides whether you write both on one day or on two.</td></tr>
      <tr><td>Questions</td><td><b>37 questions count</b>: 35 selected-response questions and 2 written answers. You will also see 7 to 10 extra questions that EQAO is trying out. They do not count, but you cannot tell which ones they are, so treat every question as real.</td></tr>
      <tr><td>Reading</td><td>Four kinds of text: <mark>real-life narrative</mark>, <mark>information paragraph</mark>, <mark>news report</mark> and <mark>dialogue</mark>.</td></tr>
      <tr><td>Writing</td><td>Twelve selected-response questions about sentences, paragraphs and conventions; one <b>short written answer</b> about the news report (up to 100 words); and one <b>opinion essay</b> (up to about 500 words).</td></tr>
      <tr><td>Scoring</td><td>Your result is a scale score from <b>200 to 400</b>. <b>300 or higher</b> is successful. It is not a mark out of 400, and it is not a percentage.</td></tr>
      <tr><td>What counts most</td><td>The selected-response questions are worth about 70% of the points. The two written answers are worth about 30%, and the essay alone is about a quarter of the whole test.</td></tr>
      <tr><td>2026–27 dates</td><td>Fall: November 3–30, 2026. Spring: March 30 – April 19, 2027. Your school picks the exact days.</td></tr>
      <tr><td>If it doesn’t go well</td><td>You can write the test again the next time it is offered, and your school must give you extra help to get ready. After two chances, with at least one unsuccessful result, the literacy course (OSSLC) is another way to meet the requirement.</td></tr>
    </table></div>
    <p class="muted small">Checked against EQAO’s OSSLT page and test framework in November 2026. Ask your teacher for your school’s dates.</p>`},
  {k:"lesson", title:"Six kinds of questions", html:`
    <p>Every question on the test is one of these. You practise all of them on this site.</p>
    <div class="grid2">
      <div class="cardlet"><h3>Single selection</h3><p>Pick the one best answer from four choices.</p></div>
      <div class="cardlet"><h3>Multiple selection</h3><p>“Select two” or “Select three.” Read how many the question asks for, and choose exactly that many.</p></div>
      <div class="cardlet"><h3>Drop-down menu</h3><p>Choose the word or phrase that correctly completes a sentence.</p></div>
      <div class="cardlet"><h3>Drag and drop</h3><p>Put events or sentences in order, or move items into the right place.</p></div>
      <div class="cardlet"><h3>Checklist</h3><p>For each statement, pick the group it belongs in, such as Fact or Opinion.</p></div>
      <div class="cardlet"><h3>Open response</h3><p>You write the answer: the short answer about the news report and the opinion essay. Trained Ontario educators score these.</p></div>
    </div>
    <div class="tip"><b>Good to know:</b> some selected-response questions have several parts and are worth more than one point. Answer every part, even when you are sure of only half of it.</div>`},
  {k:"lesson", title:"Your toolbar on test day", html:`
    <p>The real test has a toolbar on every screen. Every student may use these tools:</p>
    <div class="grid2">
      <div class="cardlet"><h3>Listen</h3><p>Reads the text aloud. Bring headphones.</p></div>
      <div class="cardlet"><h3>Highlighter, Draw Line and Eraser</h3><p>Mark key words, underline, or cross out answers you have ruled out. The Eraser removes your marks.</p></div>
      <div class="cardlet"><h3>Line Reader</h3><p>Shows one line at a time so you do not lose your place.</p></div>
      <div class="cardlet"><h3>Zoom and High Contrast</h3><p>Make the text bigger or easier to see.</p></div>
      <div class="cardlet"><h3>Rough Notes</h3><p>A notepad for jotting down ideas and planning your written answers.</p></div>
      <div class="cardlet"><h3>Flag this question</h3><p>Mark a question to come back to. Return to your flagged questions before you submit.</p></div>
    </div>
    <p><b>You may bring</b> a pen or pencil, an eraser and headphones, and your school gives you rough paper. <b>Not allowed:</b> phones, smartwatches, dictionaries, translation tools, notes, other websites and AI tools.</p>
    <div class="tip"><b>Try them here.</b> Every passage on this site has a highlighter, and in the practice test you can flag questions.</div>`},
  {k:"lesson", title:"Eight habits that earn points", html:`
    <ol>
      <li><b>Read the question before the passage.</b> Then you know what you are looking for while you read.</li>
      <li><b>Go back to the text.</b> Questions often name a paragraph number. Reread that paragraph before you answer.</li>
      <li><b>Rule out wrong answers.</b> Cross out choices that are false, too extreme, or true but not what the question asks.</li>
      <li><b>Watch for “most,” “best” and “main.”</b> More than one answer may be partly true. Pick the one that covers the most.</li>
      <li><b>Flag it and move on.</b> Do not let one hard question eat ten minutes. Come back to it at the end.</li>
      <li><b>Plan before you write.</b> Five minutes of planning makes an essay clearer than fifteen extra minutes of writing.</li>
      <li><b>Never leave an answer blank.</b> A blank earns zero. A careful guess might earn a point.</li>
      <li><b>Reread your writing.</b> Use leftover time to fix sentences that run together, missing capitals and end punctuation.</li>
    </ol>`},
  {k:"label", text:"Check your understanding"},
  {k:"q", type:"single", id:"m1q1", skill:"Test format", fam:"T", prompt:"What score do you need to be successful on the OSSLT?",
    options:["200 out of 400","250 or higher","300 or higher","60 percent of the questions correct"], answer:2,
    explain:"Results are reported on a scale from 200 to 400, and 300 or higher is successful. It is a scale score, not a percentage."},
  {k:"q", type:"multi", id:"m1q6", skill:"Test format", fam:"T", prompt:"Which TWO of these are kinds of reading on the OSSLT? Select two.",
    options:["Dialogue","Persuasive speech","News report","Poem","Advertisement"], answer:[0,2],
    explain:"The four kinds of reading are the real-life narrative, the information paragraph, the news report and the dialogue."},
  {k:"q", type:"dropdown", id:"m1q8", skill:"Test format", fam:"T", prompt:"Complete the sentences about the two written answers.",
    parts:["The short written answer is about the ", {o:["dialogue","news report","real-life narrative"],a:1}, " and can be up to ", {o:["50","100","250"],a:1}, " words. The opinion essay can be up to about ", {o:["150","300","500"],a:2}, " words."],
    explain:"The short answer is about the news report, and its box stops at 100 words. The essay box stops at about 500 words."},
  {k:"q", type:"sort", id:"m1q9", skill:"Test format", fam:"T", prompt:"True or false? Decide for each statement about the OSSLT.", cats:["True","False"],
    items:[["A blank answer is safer than a guess.",1],["Every student may use the highlighter and the line reader.",0],["A few questions on your test are being tried out and do not count.",0],["You need to get 300 questions right to pass.",1],["Students learning English may use an online translator.",1]],
    explain:"A blank earns zero, so always answer. The toolbar is for everyone. Forms carry 7 to 10 try-out questions. The 300 is a scale score, not a count of questions. Translation tools are never allowed."},
  {k:"q", type:"single", id:"m1q11", skill:"Strategies", fam:"T", prompt:"A question asks for the “main idea” of a passage. Two answers seem true. What should you do?",
    options:["Choose the answer that gives the most specific detail from the passage","Choose the answer that covers the whole passage, not just one part","Choose the longest answer, because it probably says the most","Choose the answer that repeats a sentence from the passage word for word"], answer:1,
    explain:"A main idea covers the whole passage. A detail that is true but describes only one paragraph is a trap answer, and so is a sentence copied from the text. The length of an answer tells you nothing."},
  {k:"q", type:"single", id:"m1q10", skill:"Strategies", fam:"T", prompt:"A question asks: “What is the most likely reason the author included paragraph 4?” What should you do first?",
    options:["Reread paragraph 4, along with the sentences just before and after it","Pick the answer that repeats the most words from paragraph 4","Answer from what you remember, without going back to the passage","Reread the entire passage from the first line before you look at the choices"], answer:0,
    explain:"The question points you to one place, so go back there. Reading the sentences around it shows what job the paragraph does. Rereading everything costs time you need for other questions, and an answer that only repeats words from the text is often a trap."},
  {k:"q", type:"single", id:"m1q7", skill:"Strategies", fam:"T", prompt:"You have answered everything in Session A except two questions you flagged because you were not sure. What is the best thing to do before you submit?",
    options:["Leave both blank, because a wrong answer will count against your score","Return to each one, reread the text it points to, and choose your best answer","Go back through all your other answers and change the ones you doubt","Submit right away, since thinking longer usually leads to changing right answers"], answer:1,
    explain:"A blank earns nothing, and there is no penalty for a wrong answer. Use the flag to return, reread the text and commit to your best choice."}
  ]});
