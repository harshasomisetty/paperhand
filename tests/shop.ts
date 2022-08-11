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
} from "@solana/web3.js";
import { Shop } from "../target/types/shop";
import { Exhibition } from "../target/types/exhibition";
import { SHOP_PROGRAM_ID, otherCreators } from "../utils/constants";
import { creator, users } from "../utils/constants";

import { airdropAll, printAndTest, regSol } from "../utils/helpfulFunctions";
import { getExhibitAccounts } from "../utils/accountDerivation";
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Shop = anchor.workspace.Shop as Program<Shop>;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;

async function swapFunc(
  marketVoucher: number,
  marketSol: number,
  userVoucher: number,
  userSol: number,
  vouchers: number,
  forward: boolean
): Promise<number[]> {
  let K = marketVoucher * marketSol;
  let results;
  let marketDiff, Kdiff, amountOut;

  if (forward) {
    // Buy Vouchers for Sol
    marketDiff = marketVoucher - vouchers;
    Kdiff = Math.floor(K / marketDiff);
    amountOut = Kdiff - marketSol;

    results = [
      marketVoucher - vouchers,
      marketSol + amountOut,
      userVoucher + vouchers,
      userSol - amountOut,
    ];
  } else {
    // Sell vouchers for Sol
    marketDiff = marketVoucher + vouchers;
    Kdiff = Math.floor(K / marketDiff);
    amountOut = marketSol - Kdiff;

    results = [
      marketVoucher + vouchers,
      marketSol - amountOut,
      userVoucher - vouchers,
      userSol + amountOut,
    ];
  }

  console.log("results", results);
  return results;
}
describe("shop", () => {
  /* End goal should be for user to press a button that opens the display case and shop simultaneously
   * need to give creator option to bootstrap liq
   * so first open display case, spend some time inserting etc
   * then creator presses button to open market
   * do find pdas and get associated addresses, and init all accounts in frontend imo
   *
   * next step, wait for user1 to get some tokens for both sides, and depo liq
   * next step, allow user2 to swap
   * next step, allow for user1 to withdraw liq*/

  // The arrays contain info for Token A, and Liq token
  // There are arrays for the full mint, and for the specific token accounts for each user

  // for this isolated test for shop, the keypair is random, and serves as a seed for the rest of the program
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;
  let authBump: number;
  let marketAuth: PublicKey;
  let marketTokenFee: PublicKey;

  let liqMint: PublicKey;
  let voucherMint: PublicKey;

  // marketTokens is the wallet for tokenA and sol
  let marketTokens: PublicKey[] = new Array(2);

  // userTokens are array of token accs for each user
  // userTokens[0] is token for user1, userTokens[i][0] is liq wallet, [1] is coin A
  let userTokens: PublicKey[][] = new Array(2);
  let mintAmounts = [6, 50];
  let initAmounts = [2, 4];
  let liqAmounts = [3, 2];
  let swapAmount = [3, 5];
  let withdrawAmounts = [4, 2];

  let airdropVal = mintAmounts[1] * LAMPORTS_PER_SOL;

  before("Init variables", async () => {
    let airdropees = [creator, ...otherCreators, ...users];

    await airdropAll(airdropees, airdropVal, connection);

    [marketAuth, authBump, marketTokens, liqMint] = await getExhibitAccounts(
      exhibit
    );

    marketTokenFee = await getAssociatedTokenAddress(liqMint, marketAuth, true);

    voucherMint = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      0
    );

    for (let i = 0; i < 2; i++) {
      userTokens[i] = new Array(2);

      userTokens[i][0] = await getAssociatedTokenAddress(
        liqMint,
        users[i].publicKey
      );
      userTokens[i][1] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          users[i],
          voucherMint,
          users[i].publicKey
        )
      ).address;
    }

    for (let i = 0; i < 2; i++) {
      await mintTo(
        connection,
        creator,
        voucherMint,
        userTokens[i][1],
        creator,
        mintAmounts[0]
      );
    }
  });

  it("init market", async () => {
    // This method starts the market and bootstraps it with liquidity from the market creator

    console.log("init market");

    const tx = await Shop.methods
      .initializeMarket(
        new anchor.BN(initAmounts[0]),
        new anchor.BN(initAmounts[1] * LAMPORTS_PER_SOL),
        authBump
      )
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: liqMint,
        marketTokenFee: marketTokenFee,
        voucherMint: voucherMint,
        marketVoucher: marketTokens[0],
        marketSol: marketTokens[1],
        userVoucher: userTokens[0][1],
        userLiq: userTokens[0][0],
        user: users[0].publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[0]])
      .rpc();

    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(users[0].publicKey);

    printAndTest(
      Number(marketVoucherBal.amount),
      initAmounts[0],
      "market voucher bal"
    );
    printAndTest(
      Math.round(Number(marketSol) / LAMPORTS_PER_SOL),
      initAmounts[1],
      "market sol bal"
    );
    printAndTest(
      Number(userVoucherBal.amount),
      mintAmounts[0] - initAmounts[0],
      "user voucher bal"
    );
    printAndTest(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      mintAmounts[1] - initAmounts[1],
      "user sol bal"
    );

    console.log("ended init market");
  });

  it("Deposited liq", async () => {
    // User1 will first acquire token1 and 2
    // Then user1 will deposit into the pool using the add_liquidity

    for (let i = 0; i < 2; i++) {
      userTokens[i][0] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          users[i],
          liqMint,
          users[i].publicKey
        )
      ).address;
    }

    console.log("finished minting");

    const tx = await Shop.methods
      .depositLiquidity(new anchor.BN(liqAmounts[0]), authBump)
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: liqMint,
        // marketTokenFee: marketTokenFee,
        voucherMint: voucherMint,
        marketVoucher: marketTokens[0],
        marketSol: marketTokens[1],
        userVoucher: userTokens[0][1],
        userLiq: userTokens[0][0],
        user: users[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([users[0]])
      .rpc();

    console.log("finished deposit liq tx");

    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(users[0].publicKey);
    let userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    printAndTest(
      Number(marketVoucherBal.amount),
      initAmounts[0] + liqAmounts[0],
      "marketVoucher bal"
    );
    printAndTest(
      Math.round(Number(marketSol) / LAMPORTS_PER_SOL),
      initAmounts[1] + liqAmounts[0] * (initAmounts[1] / initAmounts[0]),
      "marketSol bal"
    );
    printAndTest(
      Number(userVoucherBal.amount),
      mintAmounts[0] - initAmounts[0] - liqAmounts[0],
      "user voucher bal"
    );
    printAndTest(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      mintAmounts[1] -
        initAmounts[1] -
        liqAmounts[0] * (initAmounts[1] / initAmounts[0]),
      "user sol bal"
    );
    printAndTest(
      Number(userTokenLiqBal.amount),
      initAmounts[0] + liqAmounts[0],
      "user liq token bal"
    );
  });

  it("Swapped: Bought vouchers", async () => {
    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[1][1]);
    let userSol = await connection.getBalance(users[1].publicKey);

    console.log(Number(marketVoucherBal.amount), "market voucher amt");
    console.log(Number(marketSol) / LAMPORTS_PER_SOL, "market sol");
    console.log(Number(userVoucherBal.amount), "user voucher amt");
    console.log(Number(userSol) / LAMPORTS_PER_SOL, "user sol");

    let swapVals = await swapFunc(
      Number(marketVoucherBal.amount),
      marketSol,
      Number(userVoucherBal.amount),
      userSol,
      swapAmount[0],
      true
    );

    try {
      const tx = await Shop.methods
        .swap(new anchor.BN(swapAmount[0]), true, authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          // marketTokenFee: marketTokenFee,
          voucherMint: voucherMint,
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[1][1],
          creator: otherCreators[0].publicKey,
          user: users[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([users[1]])
        .rpc();
    } catch (error) {
      console.log("fuck swap", error);
    }

    marketVoucherBal = await getAccount(connection, marketTokens[0]);
    marketSol = await connection.getBalance(marketTokens[1]);
    userVoucherBal = await getAccount(connection, userTokens[1][1]);
    userSol = await connection.getBalance(users[1].publicKey);

    printAndTest(
      Number(marketVoucherBal.amount),
      swapVals[0],
      "market voucher"
    );
    // printAndTest(
    //   (Number(marketSol) / LAMPORTS_PER_SOL).toFixed(4),
    //   (swapVals[1] / LAMPORTS_PER_SOL).toFixed(4),
    //   "market sol"
    // );
    printAndTest(Number(userVoucherBal.amount), swapVals[2], "user voucher");
    // printAndTest(
    //   (Number(userSol) / LAMPORTS_PER_SOL).toFixed(4),
    //   ((swapVals[3] / LAMPORTS_PER_SOL)).toFixed(4),
    //   "user sol"
    // );

    let marketInfo = await Shop.account.marketInfo.fetch(marketAuth);
    console.log("market info", Number(marketInfo.feesPaid) / LAMPORTS_PER_SOL);
  });

  it("Swapped: Sold vouchers", async () => {
    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[1][1]);
    let userSol = await connection.getBalance(users[1].publicKey);

    console.log(Number(marketVoucherBal.amount), "market voucher amt");
    console.log(Number(marketSol) / LAMPORTS_PER_SOL, "market sol");
    console.log(Number(userVoucherBal.amount), "user voucher amt");
    console.log(Number(userSol) / LAMPORTS_PER_SOL, "user sol");

    let swapVals = await swapFunc(
      Number(marketVoucherBal.amount),
      marketSol,
      Number(userVoucherBal.amount),
      userSol,
      swapAmount[1],
      false
    );

    try {
      const tx = await Shop.methods
        .swap(new anchor.BN(swapAmount[1]), false, authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          // marketTokenFee: marketTokenFee,
          voucherMint: voucherMint,
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[1][1],
          creator: otherCreators[0].publicKey,
          user: users[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([users[1]])
        .rpc();
    } catch (error) {
      console.log("fuck swap", error);
    }

    marketVoucherBal = await getAccount(connection, marketTokens[0]);
    marketSol = await connection.getBalance(marketTokens[1]);
    userVoucherBal = await getAccount(connection, userTokens[1][1]);
    userSol = await connection.getBalance(users[1].publicKey);

    printAndTest(
      Number(marketVoucherBal.amount),
      swapVals[0],
      "market voucher"
    );
    // printAndTest(
    //   (Number(marketSol) / LAMPORTS_PER_SOL).toFixed(4),
    //   (swapVals[1] / LAMPORTS_PER_SOL).toFixed(4),
    //   "market sol"
    // );
    printAndTest(Number(userVoucherBal.amount), swapVals[2], "user voucher");
    // printAndTest(
    //   (Number(userSol) / LAMPORTS_PER_SOL).toFixed(4),
    //   (swapVals[3] / LAMPORTS_PER_SOL).toFixed(4),
    //   "user sol"
    // );
  });

  it("withdrew liq", async () => {
    let prevMarketVoucherBal = await getAccount(connection, marketTokens[0]);
    let prevMarketSol = await connection.getBalance(marketTokens[1]);
    let prevUserVoucherBal = await getAccount(connection, userTokens[0][1]);
    let prevUserSol = await connection.getBalance(users[0].publicKey);
    let prevUserTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    console.log(Number(prevMarketVoucherBal.amount));
    console.log(Number(prevMarketSol));
    console.log(Number(prevUserVoucherBal.amount));
    console.log(Number(prevUserSol));
    console.log(Number(prevUserTokenLiqBal.amount));
    const mintInfo = await getMint(connection, liqMint);

    let liqTokenValue = (2 * prevMarketSol) / Number(mintInfo.supply);

    let userReceivesSol =
      liqTokenValue * (withdrawAmounts[0] - withdrawAmounts[1]);

    try {
      const tx = await Shop.methods
        .withdrawLiquidity(
          new anchor.BN(withdrawAmounts[0]),
          new anchor.BN(withdrawAmounts[1]),
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: liqMint,
          // marketTokenFee: marketTokenFee,
          voucherMint: voucherMint,
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[0][1],
          userLiq: userTokens[0][0],
          user: users[0].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([users[0]])
        .rpc();
    } catch (error) {
      console.log("fuck withdraw", error);
    }
    console.log("finished withdraw liq tx");

    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(users[0].publicKey);
    let userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    console.log(
      "market vouchers",
      marketVoucherBal.amount,
      prevMarketVoucherBal.amount
    );
    printAndTest(
      Number(marketVoucherBal.amount).toFixed(3),
      (Number(prevMarketVoucherBal.amount) - withdrawAmounts[1]).toFixed(3),
      "market voucher"
    );
    printAndTest(
      (Number(marketSol) / LAMPORTS_PER_SOL).toFixed(3),
      ((prevMarketSol - userReceivesSol) / LAMPORTS_PER_SOL).toFixed(3),
      "market sol"
    );
    printAndTest(
      Number(userVoucherBal.amount),
      Number(prevUserVoucherBal.amount) + withdrawAmounts[1],
      "user voucher"
    );
    printAndTest(
      Number(userSol / LAMPORTS_PER_SOL).toFixed(3),
      ((prevUserSol + userReceivesSol) / LAMPORTS_PER_SOL).toFixed(3),
      "user sol"
    );
    printAndTest(
      Number(userTokenLiqBal.amount),
      Number(prevUserTokenLiqBal.amount) - withdrawAmounts[0],
      "user liq"
    );
  });

  Shop.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
