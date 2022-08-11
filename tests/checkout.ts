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
import { Checkout } from "../target/types/checkout";
import { Exhibition } from "../target/types/exhibition";
import { checkIfAccountExists } from "../utils/actions";
import { otherCreators, creator, users } from "../utils/constants";
import { printAndTest, regSol } from "../utils/helpfulFunctions";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Checkout = anchor.workspace.Checkout as Program<Checkout>;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;

describe("checkout", () => {
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;

  let matchedOrders: Keypair = Keypair.generate();

  let bump: number;
  let voucherMint, escrowVoucher, escrowSol: PublicKey;

  let userVouchers = Array(2);

  let auth: PublicKey;
  let authBump: number;
  let bidOrders: PublicKey;

  let bidSizes = [5 * LAMPORTS_PER_SOL, 10 * LAMPORTS_PER_SOL];

  let totalBidSize = bidSizes.reduce((partialSum, a) => partialSum + a, 0);

  before(async () => {
    console.log(new Date(), "requesting airdrop");

    let airdropees = [...users, creator];

    for (const dropee of airdropees) {
      await connection.confirmTransaction(
        await connection.requestAirdrop(
          dropee.publicKey,
          20 * LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    voucherMint = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      0
    );

    for (let i = 0; i < 2; i++) {
      userVouchers[i] = await getAssociatedTokenAddress(
        voucherMint,
        users[i].publicKey
      );
    }

    [auth, authBump] = await PublicKey.findProgramAddress(
      [Buffer.from("auth"), exhibit.toBuffer()],
      Checkout.programId
    );

    [escrowVoucher, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow_voucher"), auth.toBuffer()],
      Checkout.programId
    );

    [escrowSol, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow_sol"), exhibit.toBuffer()],
      Checkout.programId
    );

    [bidOrders, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("bid_orders"), exhibit.toBuffer()],
      Checkout.programId
    );
  });

  it("Is initialized!", async () => {
    // TODO make matchedOrders a pda
    const init_linked_tx =
      await Checkout.account.matchedOrders.createInstruction(matchedOrders);

    const init_tx = await Checkout.methods
      .initialize()
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedOrders.publicKey,
        bidOrders: bidOrders,
        auth: auth,
        voucherMint: voucherMint,
        escrowVoucher: escrowVoucher,
        escrowSol: escrowSol,
        user: creator.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        exhibitionProgram: Exhibition.programId,
      })
      .preInstructions([init_linked_tx])
      .signers([matchedOrders, creator])
      .rpc();

    printAndTest(await checkIfAccountExists(escrowVoucher, connection), true);
    printAndTest(await checkIfAccountExists(auth, connection), true);
  });

  it("Makes 2 bids!", async () => {
    for (let i = 0; i < 2; i++) {
      let bid_tx = await Checkout.methods
        .makeBid(new BN(bidSizes[i]))
        .accounts({
          exhibit: exhibit,
          bidOrders: bidOrders,
          escrowSol: escrowSol,
          bidder: users[i].publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([users[i]])
        .rpc();

      console.log("finished bid ", i);

      await new Promise((r) => setTimeout(r, 500));
    }

    let account = await Checkout.account.bidOrders.fetch(bidOrders);

    console.log("account orders");
    for (let i = 0; i < 5; i++) {
      console.log(account.heap.items[i].bidderPubkey.toString());
    }

    printAndTest(
      regSol(account.heap.items[0].bidPrice),
      regSol(Math.max.apply(Math, bidSizes)),
      "max heap"
    );

    let postHeapBal = await connection.getBalance(escrowSol);

    printAndTest(
      regSol(postHeapBal),
      regSol(totalBidSize),
      "balance heap size"
    );
  });

  it("Bid Floor!", async () => {
    console.log("in bid floor test");
    if (!(await checkIfAccountExists(userVouchers[0], connection))) {
      await getOrCreateAssociatedTokenAccount(
        connection,
        users[0],
        voucherMint,
        users[0].publicKey
      );

      await mintTo(
        connection,
        users[0],
        voucherMint,
        userVouchers[0],
        creator,
        2
      );
    }

    let account = await Checkout.account.bidOrders.fetch(bidOrders);
    let highestBid = Number(account.heap.items[0].bidPrice);

    let preHeapBal = await connection.getBalance(escrowSol);
    let preUserBal = await connection.getBalance(users[0].publicKey);

    let tx = await Checkout.methods
      .bidFloor()
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedOrders.publicKey,
        bidOrders: bidOrders,
        auth: auth,
        voucherMint: voucherMint,
        escrowVoucher: escrowVoucher,
        escrowSol: escrowSol,
        userVoucher: userVouchers[0],
        user: users[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[0]])
      .rpc();

    let postHeapBal = await connection.getBalance(escrowSol);
    let postUserBal = await connection.getBalance(users[0].publicKey);

    printAndTest(regSol(preHeapBal) - regSol(highestBid), regSol(postHeapBal));
    printAndTest(regSol(preUserBal) + regSol(highestBid), regSol(postUserBal));
    let matchedOrdersInfo = await Checkout.account.matchedOrders.fetch(
      matchedOrders.publicKey
    );

    printAndTest(
      matchedOrdersInfo.trades.orders[1].val.toString(),
      users[1].publicKey.toString()
    );

    printAndTest(
      Number((await getAccount(connection, escrowVoucher)).amount),
      1
    );
  });

  it("Fulfills bid in DLL!", async () => {
    const fulfill_tx = await Checkout.methods
      .fulfillOrder(users[0].publicKey, authBump)
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedOrders.publicKey,
        auth: auth,
        voucherMint: voucherMint,
        escrowVoucher: escrowVoucher,
        orderVoucher: userVouchers[0],
        orderUser: users[0].publicKey,
        user: users[1].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([users[1]])
      .rpc();

    printAndTest(
      Number((await getAccount(connection, escrowVoucher)).amount),
      0
    );
  });

  it("Cancels a bid!", async () => {
    let preHeapBal = await connection.getBalance(escrowSol);
    let preUserBal = await connection.getBalance(users[0].publicKey);

    let account = await Checkout.account.bidOrders.fetch(bidOrders);

    console.log("account orders");
    for (let i = 0; i < 5; i++) {
      console.log(account.heap.items[i].bidderPubkey.toString());
    }

    console.log("user 0", users[0].publicKey.toString());
    console.log("user 1", users[1].publicKey.toString());

    const cancel_tx = await Checkout.methods
      .cancelBid()
      .accounts({
        exhibit: exhibit,
        bidOrders: bidOrders,
        escrowSol: escrowSol,
        bidder: users[0].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[0]])
      .rpc();

    let postHeapBal = await connection.getBalance(escrowSol);
    let postUserBal = await connection.getBalance(users[0].publicKey);

    printAndTest(regSol(preHeapBal) - regSol(bidSizes[0]), regSol(postHeapBal));
    printAndTest(regSol(preUserBal) + regSol(bidSizes[0]), regSol(postUserBal));
  });

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
