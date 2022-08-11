const assert = require("assert");
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function printAndTest(arg1, arg2, name = "") {
  console.log(name, arg1, arg2);
  assert.ok(arg1 == arg2);
}

export function regSol(val: number) {
  return Math.round(val / LAMPORTS_PER_SOL);
}
