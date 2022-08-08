import * as anchor from "@project-serum/anchor";
import { BN, Program } from "@project-serum/anchor";
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
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Transaction,
} from "@solana/web3.js";
import { Exhibition } from "../target/types/exhibition";

import { Checkout } from "../target/types/checkout";
import { Caravan } from "../target/types/caravan";
import { checkIfAccountExists } from "../utils/actions";

const assert = require("assert");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;

const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;
const Checkout = anchor.workspace.Checkout as Program<Checkout>;
const Caravan = anchor.workspace.Caravan as Program<Caravan>;

function printAndTest(arg1, arg2, name = "") {
  console.log(name, arg1, arg2);
  assert.ok(arg1 == arg2);
  // console.log("passed", name);
}

function regSol(val) {
  return Math.round(val / LAMPORTS_PER_SOL);
}

describe("Full Floorbid", () => {
  // general info
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;

  let voucherMint, checkoutVoucher, userVoucher: PublicKey;
  let checkoutAuth: PublicKey;
  let authBump: number;

  let creator: Keypair = Keypair.generate();

  let users: Keypair[] = [Keypair.generate(), Keypair.generate()];

  let userVouchers: PublicKey[] = Array(2);

  let bump;
  let airdropVal = 20;

  // caravan info

  let nftHeap: PublicKey;

  let bidSizes = [5 * LAMPORTS_PER_SOL, 10 * LAMPORTS_PER_SOL];
  let totalBidSize = bidSizes.reduce((partialSum, a) => partialSum + a, 0);

  let caravanAuth, orderbookSol: PublicKey;
  let caravanAuthBump;

  // checkout info

  let listHolder = new Keypair();

  before(async () => {
    console.log("start of before");

    let airdropees = [creator, ...users];

    for (const dropee of airdropees) {
      await connection.confirmTransaction(
        await connection.requestAirdrop(
          dropee.publicKey,
          airdropVal * LAMPORTS_PER_SOL
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

    [checkoutAuth, authBump] = await PublicKey.findProgramAddress(
      [Buffer.from("checkout_auth"), exhibit.toBuffer()],
      Checkout.programId
    );
    // [voucherMint] = await PublicKey.findProgramAddress(
    //   [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    //   EXHIBITION_PROGRAM_ID
    // );

    console.log("before voucher mint create");
    voucherMint = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      0
    );
    console.log("after voucher mint create");

    [checkoutVoucher, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("checkout_voucher"), checkoutAuth.toBuffer()],
      Checkout.programId
    );
    console.log("after checkout voucher");

    for (let i = 0; i < 2; i++) {
      let temp = await getAssociatedTokenAddress(
        voucherMint,
        users[i].publicKey
      );
      console.log("temp", temp.toString());
      userVouchers[i] = temp;
    }

    console.log("end of before");
  });

  it("Inited caravan and checkout!", async () => {
    console.log("in inited caravan");

    const init_tx = await Caravan.methods
      .createBinaryHeap()
      .accounts({
        exhibit: exhibit,
        nftHeap: nftHeap,
        auth: caravanAuth,
        orderbookSol: orderbookSol,
        signer: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    let zero = new anchor.BN(0);
    assert.ok(Number(account.heap.items[0].sequenceNumber) == 0);

    const init_linked_tx =
      await Checkout.account.linkedHolder.createInstruction(listHolder);

    const actual_tx = await Checkout.methods
      .initialize(authBump)
      .accounts({
        linkedHolder: listHolder.publicKey,
        exhibit: exhibit,
        checkoutAuth: checkoutAuth,
        voucherMint: voucherMint,
        checkoutVoucher: checkoutVoucher,
        user: users[0].publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        exhibitionProgram: Exhibition.programId,
      })
      .preInstructions([init_linked_tx])
      .signers([listHolder, users[0]])
      .rpc();

    assert.equal(
      await checkIfAccountExists(checkoutVoucher, connection),
      true,
      "checkout no exist"
    );

    console.log("checkout does exist");
    assert.ok((await checkIfAccountExists(checkoutAuth, connection)) == true);
  });

  it("Makes 2 bids!", async () => {
    for (let i = 0; i < 2; i++) {
      let bid_tx = await Caravan.methods
        .makeBid(new BN(bidSizes[i]))
        .accounts({
          exhibit: exhibit,
          nftHeap: nftHeap,
          auth: caravanAuth,
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

  it("seller sells to highest bid", async () => {
    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    let highestBid = Number(account.heap.items[0].bidPrice);

    // let preSellerBal = await connection.getBalance(users[0].publicKey);
    let preHeapBal = await connection.getBalance(orderbookSol);

    const fulfill_highest_tx = await Caravan.methods
      .bidFloor()
      .accounts({
        exhibit: exhibit,
        nftHeap: nftHeap,
        auth: caravanAuth,
        orderbookSol: orderbookSol,
        seller: users[1].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[1]])
      .rpc();

    /*
     * if user selects nft, call to voucher
     * if user has a voucher already, good.
     *
     * transaction(
     * transfer voucher to
     *
     )
     *
     */
  });

  it("user claims token", async () => {});

  it.skip("user cancels bid", async () => {});

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
  Caravan.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
