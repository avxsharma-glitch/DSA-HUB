import test from "node:test";
import assert from "node:assert/strict";
import { identifyPlatform } from "../src/platform.mjs";
test("identifies supported coding platforms", () => {
  assert.equal(identifyPlatform("leetcode.com"), "leetcode");
  assert.equal(identifyPlatform("www.geeksforgeeks.org"), "geeksforgeeks");
  assert.equal(identifyPlatform("example.com"), null);
});
