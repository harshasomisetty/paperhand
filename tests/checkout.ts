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
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Checkout } from "../target/types/checkout";
import { Exhibition } from "../target/types/exhibition";
import { getCheckoutAccounts } from "../utils/accountDerivation";
import { checkIfAccountExists } from "../utils/actions";
import { otherCreators, creator, users } from "../utils/constants";
import { airdropAll, printAndTest, regSol } from "../utils/helpfulFunctions";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Checkout = anchor.workspace.Checkout as Program<Checkout>;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;

describe("checkout", () => {
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;

  let voucherMint: PublicKey;

  let userVouchers = Array(2);

  let bidSizes = [5 * LAMPORTS_PER_SOL, 10 * LAMPORTS_PER_SOL];

  let totalBidSize = bidSizes.reduce((partialSum, a) => partialSum + a, 0);

  let airdropVal = 20 * LAMPORTS_PER_SOL;
  before(async () => {
    console.log(new Date(), "requesting airdrop");

    let airdropees = [...users, creator];

    await airdropAll(airdropees, airdropVal, connection);

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
  });

  it("Initialized Checkout!", async () => {
    let { matchedStorage, bidOrders, checkoutAuth, escrowSol, escrowVoucher } =
      await getCheckoutAccounts(exhibit);

    let matchedOrdersPair: Keypair = Keypair.generate();
    let matchedOrders = matchedOrdersPair.publicKey;

    const init_create_tx = await SystemProgram.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: matchedOrders,
      space: 3610,
      lamports: await connection.getMinimumBalanceForRentExemption(3610),
      programId: Checkout.programId,
    });

    // const init_create_tx =
    //   await Checkout.account.matchedOrders.createInstruction(matchedOrdersPair);

    const init_checkout_tx = await Checkout.methods
      .initialize()
      .accounts({
        exhibit: exhibit,
        matchedStorage: matchedStorage,
        matchedOrders: matchedOrders,
        bidOrders: bidOrders,
        checkoutAuth: checkoutAuth,
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
      // .preInstructions([init_create_tx])
      .transaction();
    // .signers([matchedOrders, creator])
    // .rpc();

    let mOrderBal = await connection.getBalance(matchedOrders);
    console.log("order bal", mOrderBal);
    let cOrderBal = await connection.getBalance(creator.publicKey);
    console.log("order bal", cOrderBal);

    let transaction = new Transaction();

    transaction = transaction.add(init_create_tx);
    transaction = transaction.add(init_checkout_tx);
    let signature = await sendAndConfirmTransaction(connection, transaction, [
      creator,
      matchedOrdersPair,
    ]);
    await connection.confirmTransaction(signature, "confirmed");

    printAndTest(await checkIfAccountExists(escrowVoucher, connection), true);
    printAndTest(await checkIfAccountExists(checkoutAuth, connection), true);
  });

  it("Makes 2 bids!", async () => {
    let { bidOrders, escrowSol } = await getCheckoutAccounts(exhibit);

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
      console.log(account.orderbook.items[i].bidderPubkey.toString());
    }

    printAndTest(
      regSol(account.orderbook.items[0].bidPrice),
      regSol(Math.max.apply(Math, bidSizes)),
      "max orderbook"
    );

    let postHeapBal = await connection.getBalance(escrowSol);

    printAndTest(
      regSol(postHeapBal),
      regSol(totalBidSize),
      "balance heap size"
    );
  });

  it("Bid Floor!", async () => {
    let {
      matchedStorage,
      bidOrders,
      checkoutAuth,
      checkoutAuthBump,
      escrowSol,
      escrowVoucher,
    } = await getCheckoutAccounts(exhibit);

    let matchedOrdersInfo = await Checkout.account.matchedStorage.fetch(
      matchedStorage
    );
    let matchedOrders = matchedOrdersInfo.matchedOrders;

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
    let highestBid = Number(account.orderbook.items[0].bidPrice);

    let preHeapBal = await connection.getBalance(escrowSol);
    let preUserBal = await connection.getBalance(users[0].publicKey);

    let tx = await Checkout.methods
      .sellFloor()
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedOrders,
        matchedStorage: matchedStorage,
        bidOrders: bidOrders,
        checkoutAuth: checkoutAuth,
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
    matchedOrdersInfo = await Checkout.account.matchedOrders.fetch(
      matchedOrders
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
    let { matchedStorage, checkoutAuth, checkoutAuthBump, escrowVoucher } =
      await getCheckoutAccounts(exhibit);

    let matchedOrdersInfo = await Checkout.account.matchedStorage.fetch(
      matchedStorage
    );
    let matchedOrders = matchedOrdersInfo.matchedOrders;

    const fulfill_tx = await Checkout.methods
      .fulfillOrder(users[0].publicKey, checkoutAuthBump)
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedOrders,
        matchedStorage: matchedStorage,
        checkoutAuth: checkoutAuth,
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
    let { bidOrders, escrowSol } = await getCheckoutAccounts(exhibit);

    let preHeapBal = await connection.getBalance(escrowSol);

    let preUserBal = await connection.getBalance(users[0].publicKey);

    let account = await Checkout.account.bidOrders.fetch(bidOrders);

    console.log("account orders");
    for (let i = 0; i < 5; i++) {
      console.log(account.orderbook.items[i].bidderPubkey.toString());
    }

    console.log("user 0", users[0].publicKey.toString());
    console.log("user 1", users[1].publicKey.toString());

    const cancel_tx = await Checkout.methods
      .cancelBid(new BN(0))
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
