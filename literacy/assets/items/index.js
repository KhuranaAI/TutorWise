// One component per item type. Adding a type = adding a file and a line here.
import * as explain from "./explain.js";
import * as worked from "./worked.js";
import * as mcq from "./mcq.js";
import * as job from "./job.js";
import * as find from "./find.js";
import * as verify from "./verify.js";
import * as match from "./match.js";
import * as sort from "./sort.js";
import * as multi from "./multi.js";
import * as text from "./text.js";

export const components = {
  explain: explain.render,
  worked: worked.render,
  mcq: mcq.render,
  job: job.render,
  find: find.render,
  verify: verify.render,
  match: match.render,
  sort: sort.render,
  multi: multi.render,
  text: text.render,
};
