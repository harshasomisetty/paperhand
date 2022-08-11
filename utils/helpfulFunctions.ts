const assert = require("assert");
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  Connection,
} from "@solana/web3.js";

export function printAndTest(arg1, arg2, name = "") {
  console.log(name, arg1, arg2);
  assert.ok(arg1 == arg2);
}

export function regSol(val: number) {
  return Math.round(val / LAMPORTS_PER_SOL);
}

export async function airdropAll(
  airdropees: Keypair[],
  airdropVal: number,
  connection: Connection
) {
  for (const dropee of airdropees) {
    await connection.confirmTransaction(
      await connection.requestAirdrop(dropee.publicKey, airdropVal),
      "confirmed"
    );
  }
}
