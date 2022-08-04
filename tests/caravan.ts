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

import { nextTick } from "process";
import { Caravan } from "../target/types/caravan";
const assert = require("assert");
const { BN } = anchor;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;

const Caravan = anchor.workspace.Caravan as Program<Caravan>;

let bidder = Keypair.generate();

let airdropVal = 20;

describe("caravan", () => {
  let nftHeap: PublicKey;
  let bump: number;
  it("init heap", async () => {
    console.log(new Date(), "requesting airdrop");
    const airdropTx = await connection.requestAirdrop(
      bidder.publicKey,
      airdropVal * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropTx);

    // make pda
    [nftHeap, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_heap")],
      Caravan.programId
    );

    const init_tx = await Caravan.methods
      .createbinaryheap()
      .accounts({
        nftHeap: nftHeap,
        initialBidder: bidder.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidder])
      .rpc();

    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    let zero = new BN(0);
    assert.ok(Number(account.heap.items[0].sequenceNumber) == 0);
  });

  /*
                                        Need to check that the SOL was debited to the heap acc.
                                        */
  it("Makes a bid!", async () => {
    let firstBid = 5;

    const bid_tx = await Caravan.methods
      .makebid(new BN(firstBid))
      .accounts({
        nftHeap: nftHeap,
        bidder: bidder.publicKey,
      })
      .signers([bidder])
      .rpc();

    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    assert.ok(Number(account.heap.items[0].bidPrice) == firstBid);
    let balance_bidder = await connection.getBalance(bidder.publicKey);

    assert.ok(balance_bidder / 1e9 < airdropVal - firstBid);

    let balance_heap = await connection.getBalance(nftHeap);
    assert.ok(balance_heap / 1e9 > firstBid);
  });

  it("Fulfills highest bid!", async () => {
    const [nftHeap, _bump] = await PublicKey.findProgramAddress
    ([Buffer.from("nft_heap")], 
    Caravan.programId
    );

    let account = await Caravan.account.nftHeap.fetch(nftHeap);
    let highest_bid = account.heap.items[0].bidPrice;

    let balance_bidderPre = await connection.getBalance(bidder.publicKey);

    let balance_heapPre = await connection.getBalance(nftHeap);

    const fulfill_highest_tx = await Caravan.methods
    .accepthighestbid()
    .accounts({
        nftHeap: nftHeap,
        buyer: bidder.publicKey,
        systemProgram: SystemProgram.programId
    })
    .signers([bidder])
    .rpc();

    let balance_heapPost = await connection.getBalance(nftHeap);


    let balance_bidderPost = await connection.getBalance(bidder.publicKey);

    assert.ok(balance_bidderPre - highest_bid, balance_bidderPost)
    assert.ok(balance_heapPre + highest_bid, balance_heapPost)
})

it("Makes a bid!", async () => {
    let firstBid = 5;

    const bid_tx = await Caravan.methods
      .makebid(new BN(firstBid))
      .accounts({
        nftHeap: nftHeap,
        bidder: bidder.publicKey,
      })
      .signers([bidder])
      .rpc();

    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    assert.ok(Number(account.heap.items[0].bidPrice) == firstBid);
    let balance_bidder = await connection.getBalance(bidder.publicKey);

    assert.ok(balance_bidder / 1e9 < airdropVal - firstBid);

    let balance_heap = await connection.getBalance(nftHeap);
    assert.ok(balance_heap / 1e9 > firstBid);
  });

  it("Cancels a bid!", async () => {
    const cancel_tx = await Caravan.methods
      .cancelbid()
      .accounts({
        nftHeap: nftHeap,
        bidder: bidder.publicKey,
      })
      .signers([bidder])
      .rpc();

    let balance_bidder = await connection.getBalance(bidder.publicKey);
    assert.ok((balance_bidder * 1.01) / 1e9 > airdropVal);
  });
});