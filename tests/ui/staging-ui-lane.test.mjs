import test from "node:test";
import assert from "node:assert/strict";
import { selectLane, classifyGit, GENERATED } from "../../scripts/ui/staging-ui-lane.mjs";

const HOME="static/ui-config/home.json", FOOTER="static/ui-config/footer.json";
const home={hero:{title:"GradStudio",heading:"Old",subheading:"Sub",primaryAction:{label:"Start",href:"#courses"},secondaryAction:{label:"Join",href:"#signup",authMode:"signup"},featureAlt:"Preview"},blocks:[{visible:true}]};
const footer={description:"Old description",copyright:"Copyright",links:[{label:"Privacy",href:"#privacy"}]};
const record=(path, patch={})=>({path,status:"M",oldMode:"100644",newMode:"100644",...patch});
function run(files, edit, original=home) {
  const after=structuredClone(original); edit(after);
  return selectLane(files,(file,rev)=>rev==="base"?original:after);
}
test("copy lane accepts only registered text changes with generated runtime",()=>{
  assert.equal(run([record(HOME),record(GENERATED)],x=>x.hero.heading="New"),"copy");
  assert.equal(run([record(FOOTER),record(GENERATED)],x=>x.description="New",footer),"copy");
});
test("copy lane refuses routing, auth mode, visibility and other unknown fields",()=>{
  for(const edit of [x=>x.hero.primaryAction.href="#other",x=>x.hero.secondaryAction.authMode="signin",x=>x.blocks[0].visible=false,x=>x.extra=true,x=>delete x.hero.heading,x=>x.hero.heading=" "]) {
    assert.equal(run([record(HOME),record(GENERATED)],edit),"full");
  }
  assert.equal(run([record(FOOTER),record(GENERATED)],x=>x.links[0].href="#other",footer),"full");
});
test("copy lane fails closed for mixed, generated-only, missing, added, deleted or mode changes",()=>{
  for(const files of [[],[record(GENERATED)],[record(HOME)],[record(HOME),record(GENERATED),record("worker/src/index.js")],[record(HOME),record(GENERATED),record("static/ui-config/site.json")],[record(HOME,{status:"D"}),record(GENERATED)],[record(HOME,{status:"A"}),record(GENERATED)],[record(HOME,{newMode:"120000"}),record(GENERATED)],[record(HOME),record(GENERATED),record(".github/workflows/ui-ci.yml")]]) {
    assert.equal(run(files,x=>x.hero.heading="New"),"full");
  }
  assert.equal(classifyGit("bad","bad"),"full");
});
test("Git gate refuses a divergent or mismatched checkout and parses regular raw diff",()=>{
  const base="a".repeat(40),head="b".repeat(40);
  const git=(...args)=>{
    if(args[0]==="merge-base"||args[1]==="--quiet") return "";
    if(args[0]==="diff") return ":100644 100644 abcdef0 abcdef1 M\0"+HOME+"\0:100644 100644 abcdef0 abcdef1 M\0"+GENERATED+"\0";
    if(args[0]==="show"){const copy=structuredClone(home);if(args[1].startsWith(head))copy.hero.heading="New";return JSON.stringify(copy);}
    throw Error("unexpected");
  };
  assert.equal(classifyGit(base,head,git),"copy");
  assert.equal(classifyGit(base,head,(...args)=>{if(args[1]==="--quiet")throw Error("mismatch");return git(...args)}),"full");
});
