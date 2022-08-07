import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
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
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;
  let creator: Keypair = Keypair.generate();

  let listHolder = new Keypair();

  let voucherMint, checkoutVoucher, userVoucher: PublicKey;
  let checkoutAuth: PublicKey;
  let authBump: number;

  let users: Keypair[] = [Keypair.generate(), Keypair.generate()];
  let userVouchers: PublicKey[] = Array(2);

  let nftHeap: PublicKey;

  let bump;

  let airdropVal = 20;
  let bidSizes = [5 * LAMPORTS_PER_SOL, 10 * LAMPORTS_PER_SOL];
  let totalBidSize = bidSizes.reduce((partialSum, a) => partialSum + a, 0);

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
    const init_caravan_tx = await Caravan.methods
      .createBinaryHeap()
      .accounts({
        exhibit: exhibit,
        nftHeap: nftHeap,
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
        .makeBid(new anchor.BN(bidSizes[i]))
        .accounts({
          exhibit: exhibit,
          nftHeap: nftHeap,
          bidder: users[i].publicKey,
        })
        .signers([users[i]])
        .rpc();

      console.log("fisnihed bid ", i);

      await new Promise((r) => setTimeout(r, 500));
    }

    console.log("first test");
    let account = await Caravan.account.nftHeap.fetch(nftHeap);

    // check there are 2 bids in heap

    // check that highest bid is 10
    // heap lamport count is about 15
    printAndTest(
      regSol(account.heap.items[0].bidPrice),
      regSol(Math.max.apply(Math, bidSizes)),
      "max heap"
    );

    console.log("finsihed first test");
    // let balanceBidder = await connection.getBalance(users[0].publicKey);
    // assert.ok(balanceBidder / 1e9 < airdropVal - bidSize);

    let balanceHeap = await connection.getBalance(nftHeap);
    printAndTest(
      regSol(balanceHeap),
      regSol(totalBidSize),
      "balance heap size"
    );
    console.log("finsihed second test");
  });

  it.skip("seller sells to highest bid", async () => {});

  it.skip("user claims token", async () => {});

  it.skip("user cancels bid", async () => {});

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
  Caravan.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
