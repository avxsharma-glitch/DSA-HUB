import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../interceptor-utils.js", import.meta.url), "utf8");
const context = vm.createContext({ URL });
vm.runInContext(source, context);
const utils = context.DSAHubInterceptorUtils;

test("pathname matcher ignores query strings", () => {
  assert.equal(
    utils.pathnameOf("https://leetcode.com/submissions/detail/12345/check/?x=1", "https://leetcode.com"),
    "/submissions/detail/12345/check/"
  );
});

test("problem slug is extracted from a LeetCode problem route", () => {
  assert.equal(utils.slugFromPath("/problems/valid-parentheses/"), "valid-parentheses");
  assert.equal(utils.slugFromPath("/contest/weekly-contest-1/"), null);
});

test("submit payload matching requires code and language fields", () => {
  assert.equal(utils.looksLikeSubmitBody({ typed_code: "class Solution {}", lang: "cpp" }), true);
  assert.equal(utils.looksLikeSubmitBody({ typed_code: "class Solution {}" }), false);
  assert.equal(utils.looksLikeSubmitBody({ code: "x", lang: "cpp" }), false);
});

test("judge response matching supports nested and top-level payloads", () => {
  assert.equal(utils.looksLikeCheckPayload({ state: "SUCCESS", status_code: 10 }), true);
  assert.equal(utils.looksLikeCheckPayload({ data: { state: "SUCCESS", status_code: 10 } }), true);
  assert.equal(utils.looksLikeCheckPayload({ status_msg: "Accepted", status_code: 10 }), true);
  assert.equal(utils.looksLikeCheckPayload({ status_msg: "Accepted" }), false);
});

test("submission ID extraction handles response envelopes", () => {
  assert.equal(utils.idFromPayload({ submission_id: 123 }), "123");
  assert.equal(utils.idFromPayload({ data: { submission_id: 456 } }), "456");
  assert.equal(utils.idFromPayload({ id: 789 }), "789");
  assert.equal(utils.idFromPayload({ state: "SUCCESS" }), null);
});

test("XHR response reader never throws for unreadable response types", () => {
  assert.equal(utils.safeXhrResponseText({ responseType: "blob", get responseText() { throw new Error("invalid state"); } }), null);
  assert.equal(utils.safeXhrResponseText({ responseType: "json", response: { status_code: 10 } }), '{"status_code":10}');
  assert.equal(utils.safeXhrResponseText({ responseType: "text", responseText: '{"ok":true}' }), '{"ok":true}');
});

test("submit path matcher extracts the slug", () => {
  assert.equal(utils.submitSlugFromPath("/problems/two-sum/submit/"), "two-sum");
  assert.equal(utils.submitSlugFromPath("/problems/valid-parentheses/submit"), "valid-parentheses");
  assert.equal(utils.submitSlugFromPath("/problems/valid-parentheses/"), null);
});

test("check path matcher supports standard and versioned routes", () => {
  assert.equal(utils.submissionIdFromCheckPath("/submissions/detail/12345/check/"), "12345");
  assert.equal(utils.submissionIdFromCheckPath("/submissions/detail/98765/v2/check/"), "98765");
  assert.equal(utils.submissionIdFromCheckPath("/submissions/detail/not-an-id/check/"), null);
});

test("extension entry scripts parse as JavaScript", () => {
  for (const name of ["../content.js", "../interceptor.js", "../interceptor-utils.js", "../background.js", "../popup.js"]) {
    const script = readFileSync(new URL(name, import.meta.url), "utf8");
    assert.doesNotThrow(() => new vm.Script(script, { filename: name }), name + " should parse");
  }
});
