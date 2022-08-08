import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmRawTransaction,
  Connection,
} from "@solana/web3.js";

import { Caravan } from "../target/types/caravan";
const assert = require("assert");
const { BN } = anchor;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;

const Caravan = anchor.workspace.Caravan as Program<Caravan>;

let airdropVal = 20;

function printAndTest(arg1, arg2, name = "") {
  console.log(name, arg1, arg2);
  assert.ok(arg1 == arg2);
  // console.log("passed", name);
}

function regSol(val) {
  return Math.round(val / LAMPORTS_PER_SOL);
}

describe("caravan", () => {
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;

  let creator: Keypair = Keypair.generate();
  let users: Keypair[] = [Keypair.generate(), Keypair.generate()];

  let bump: number;

  let nftHeap: PublicKey;

  let bidSizes = [5 * LAMPORTS_PER_SOL, 10 * LAMPORTS_PER_SOL];
  let totalBidSize = bidSizes.reduce((partialSum, a) => partialSum + a, 0);

  let caravanAuth, orderbookSol: PublicKey;
  let caravanAuthBump;

  it("init heap", async () => {
    console.log(new Date(), "requesting airdrop");

    let airdropees = [creator, ...users];

    for (const dropee of airdropees) {
      await connection.confirmTransaction(
        await connection.requestAirdrop(
          dropee.publicKey,
          20 * LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    [caravanAuth, caravanAuthBump] = await PublicKey.findProgramAddress(
      [Buffer.from("auth"), exhibit.toBuffer()],
      Caravan.programId
    );

    [orderbookSol, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("orderbook_sol"), exhibit.toBuffer()],
      Caravan.programId
    );

    // make pda
    [nftHeap, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_heap"), exhibit.toBuffer()],
      Caravan.programId
    );

    const init_tx = await Caravan.methods
      .createBinaryHeap()
      .accounts({
        exhibit: exhibit,
        nftHeap: nftHeap,
        orderbookSol: orderbookSol,
        signer: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
  });

  it("Makes 2 bids!", async () => {
    for (let i = 0; i < 2; i++) {
      let bid_tx = await Caravan.methods
        .makeBid(new BN(bidSizes[i]))
        .accounts({
          exhibit: exhibit,
          nftHeap: nftHeap,
          orderbookSol: orderbookSol,
          bidder: users[0].publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([users[0]])
        .rpc();

      console.log("finished bid ", i);

      await new Promise((r) => setTimeout(r, 500));
    }

    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    printAndTest(
      regSol(account.heap.items[0].bidPrice),
      regSol(Math.max.apply(Math, bidSizes)),
      "max heap"
    );

    // test that there are 2 bids

    let postHeapBal = await connection.getBalance(orderbookSol);

    printAndTest(
      regSol(postHeapBal),
      regSol(totalBidSize),
      "balance heap size"
    );
  });

  it("Fulfills highest bid!", async () => {
    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    let highestBid = Number(account.heap.items[0].bidPrice);

    // let preSellerBal = await connection.getBalance(users[0].publicKey);
    let preHeapBal = await connection.getBalance(orderbookSol);

    const fulfill_highest_tx = await Caravan.methods
      .bidFloor()
      .accounts({
        exhibit: exhibit,
        nftHeap: nftHeap,
        orderbookSol: orderbookSol,
        seller: users[1].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[1]])
      .rpc();

    // check prelength - 1 = curLength

    // check heap balance changed propperly
    //
    let postHeapBal = await connection.getBalance(orderbookSol);

    console.log(
      "uh prices? ",
      regSol(preHeapBal),
      regSol(highestBid),
      regSol(postHeapBal)
    );
    // printAndTest(preSellerBal - highestBid, postSellerBal, "seller bal change");
    printAndTest(preHeapBal - highestBid, postHeapBal, "heap bal change");
  });

  // it("Cancels a bid!", async () => {
  //   const cancel_tx = await Caravan.methods
  //     .cancelBid()
  //     .accounts({
  //       exhibit: exhibit,
  //       nftHeap: nftHeap,
  //                   auth: caravanAuth,
  // orderbookSol: orderbookSol,

  //       bidder: users[0].publicKey,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([users[0]])
  //     .rpc();

  //   let balance_bidder = await connection.getBalance(users[0].publicKey);
  //   console.log((balance_bidder * 1.01) / 1e9, airdropVal - bidSizes[0]);
  //   assert.ok((balance_bidder * 1.01) / 1e9 > airdropVal - bidSizes[0]);
  // });

  Caravan.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
