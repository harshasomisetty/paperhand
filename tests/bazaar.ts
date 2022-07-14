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
  Connection,
} from "@solana/web3.js";
import { Bazaar } from "../target/types/bazaar";
import { Exhibition } from "../target/types/exhibition";
import {
  APE_URIS,
  EXHIBITION_PROGRAM_ID,
  BAZAAR_PROGRAM_ID,
} from "../utils/constants";
import {
  APE_SYMBOL,
  BEAR_SYMBOL,
  APE_URLS,
  BEAR_URLS,
  creator,
  otherCreators,
  user,
} from "../utils/constants";
const fs = require("fs");
const assert = require("assert");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Bazaar = anchor.workspace.Bazaar as Program<Bazaar>;
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
    // vouchers to sol

    marketDiff = marketVoucher + vouchers;
    Kdiff = Math.floor(K / marketDiff);
    amountOut = marketSol - Kdiff;

    results = [
      marketVoucher + vouchers,
      marketSol - amountOut,
      userVoucher - vouchers,
      userSol + amountOut,
    ];
  } else {
    //sol to vouchers
    marketDiff = marketVoucher - vouchers;
    Kdiff = Math.floor(K / marketDiff);
    amountOut = Kdiff - marketSol;

    results = [
      marketVoucher - vouchers,
      marketSol + amountOut,
      userVoucher + vouchers,
      userSol - amountOut,
    ];
  }

  // console.log(
  //   "in swap func",
  //   marketVoucher,
  //   marketSol,
  //   userVoucher,
  //   userSol,
  //   vouchers
  // );

  console.log("results", results);
  return results;
}

function printAndTest(arg1, arg2, name = "") {
  console.log(name, arg1, arg2);
  assert.ok(arg1 == arg2);
  // console.log("passed", name);
}
describe("bazaar", () => {
  /* end goal should be for user to press a button that opens the display case and bazaar simultaneously
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

  // for this isolated test for bazaar, the keypair is random, and serves as a seed for the rest of the program
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;
  let authBump;
  let solBump;
  let stateBump;
  let marketAuth: PublicKey;
  let marketTokenFee: PublicKey;
  // tokenMint[0] is the pool liquidity token mint, [1] is the voucher mint
  let tokenMints: PublicKey[] = new Array(2);

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
  let temp;

  before("Init variables", async () => {
    let airdropees = [creator, ...user];

    let airdropPromises = [];
    airdropees.forEach((dropee) =>
      airdropPromises.push(
        provider.connection.requestAirdrop(
          dropee.publicKey,
          50 * LAMPORTS_PER_SOL
        )
      )
    );
    await Promise.all(airdropPromises);

    [marketAuth, authBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market_auth"), exhibit.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [tokenMints[0], temp] = await PublicKey.findProgramAddress(
      [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [marketTokens[0], temp] = await PublicKey.findProgramAddress(
      [Buffer.from("token_voucher"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [marketTokens[1], solBump] = await PublicKey.findProgramAddress(
      [Buffer.from("token_sol"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    marketTokenFee = await getAssociatedTokenAddress(
      tokenMints[0],
      marketAuth,
      true
    );

    tokenMints[1] = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      1
    );

    for (let i = 0; i < 2; i++) {
      userTokens[i] = new Array(2);

      userTokens[i][0] = await getAssociatedTokenAddress(
        tokenMints[0],
        user[i].publicKey
      );
      userTokens[i][1] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          user[i],
          tokenMints[1],
          user[i].publicKey
        )
      ).address;
    }

    for (let i = 0; i < 2; i++) {
      await mintTo(
        connection,
        creator,
        tokenMints[1],
        userTokens[i][1],
        creator,
        mintAmounts[0]
      );
    }
  });

  it("init market", async () => {
    // This method starts the market and bootstraps it with liquidity from the market creator

    console.log("init market");

    try {
      const tx = await Bazaar.methods
        .initializeMarket(
          new anchor.BN(initAmounts[0]),
          new anchor.BN(initAmounts[1] * LAMPORTS_PER_SOL),
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[0],
          marketTokenFee: marketTokenFee,
          voucherMint: tokenMints[1],
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[0][1],
          userLiq: userTokens[0][0],
          user: user[0].publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log("error in init market", error);
    }

    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);

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

    // TODO Checking if liq calculations are correct
    // init the user liq token if needed (if market is inited, and if liq)

    for (let i = 0; i < 2; i++) {
      userTokens[i][0] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          user[i],
          tokenMints[0],
          user[i].publicKey
        )
      ).address;
    }

    console.log("finished minting");

    const tx = await Bazaar.methods
      .depositLiquidity(new anchor.BN(liqAmounts[0]), authBump)
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: tokenMints[0],
        // marketTokenFee: marketTokenFee,
        voucherMint: tokenMints[1],
        marketVoucher: marketTokens[0],
        marketSol: marketTokens[1],
        userVoucher: userTokens[0][1],
        userLiq: userTokens[0][0],
        user: user[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user[0]])
      .rpc();

    console.log("finished deposit liq tx");

    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);
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

  it("Swapped from voucher to sol", async () => {
    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[1][1]);
    let userSol = await connection.getBalance(user[1].publicKey);

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
      const tx = await Bazaar.methods
        .swap(new anchor.BN(swapAmount[0]), true, authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          // marketTokenFee: marketTokenFee,
          voucherMint: tokenMints[1],
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[1][1],
          user: user[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[1]])
        .rpc();
    } catch (error) {
      console.log("fuck swap", error);
    }

    marketVoucherBal = await getAccount(connection, marketTokens[0]);
    marketSol = await connection.getBalance(marketTokens[1]);
    userVoucherBal = await getAccount(connection, userTokens[1][1]);
    userSol = await connection.getBalance(user[1].publicKey);

    printAndTest(
      Number(marketVoucherBal.amount),
      swapVals[0],
      "market voucher"
    );
    printAndTest(
      (Number(marketSol) / LAMPORTS_PER_SOL).toFixed(4),
      (swapVals[1] / LAMPORTS_PER_SOL).toFixed(4),
      "market sol"
    );
    printAndTest(Number(userVoucherBal.amount), swapVals[2], "user voucher");
    printAndTest(
      (Number(userSol) / LAMPORTS_PER_SOL).toFixed(4),
      (swapVals[3] / LAMPORTS_PER_SOL).toFixed(4),
      "user sol"
    );
  });

  it("Swapped from sol to voucher", async () => {
    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[1][1]);
    let userSol = await connection.getBalance(user[1].publicKey);

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
      const tx = await Bazaar.methods
        .swap(new anchor.BN(swapAmount[1]), false, authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          // marketTokenFee: marketTokenFee,
          voucherMint: tokenMints[1],
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[1][1],
          user: user[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[1]])
        .rpc();
    } catch (error) {
      console.log("fuck swap", error);
    }

    marketVoucherBal = await getAccount(connection, marketTokens[0]);
    marketSol = await connection.getBalance(marketTokens[1]);
    userVoucherBal = await getAccount(connection, userTokens[1][1]);
    userSol = await connection.getBalance(user[1].publicKey);

    printAndTest(
      Number(marketVoucherBal.amount),
      swapVals[0],
      "market voucher"
    );
    printAndTest(
      (Number(marketSol) / LAMPORTS_PER_SOL).toFixed(4),
      (swapVals[1] / LAMPORTS_PER_SOL).toFixed(4),
      "market sol"
    );
    printAndTest(Number(userVoucherBal.amount), swapVals[2], "user voucher");
    printAndTest(
      (Number(userSol) / LAMPORTS_PER_SOL).toFixed(4),
      (swapVals[3] / LAMPORTS_PER_SOL).toFixed(4),
      "user sol"
    );
  });

  it("withdrew liq", async () => {
    let prevMarketVoucherBal = await getAccount(connection, marketTokens[0]);
    let prevMarketSol = await connection.getBalance(marketTokens[1]);
    let prevUserVoucherBal = await getAccount(connection, userTokens[0][1]);
    let prevUserSol = await connection.getBalance(user[0].publicKey);
    let prevUserTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    console.log(Number(prevMarketVoucherBal.amount));
    console.log(Number(prevMarketSol));
    console.log(Number(prevUserVoucherBal.amount));
    console.log(Number(prevUserSol));
    console.log(Number(prevUserTokenLiqBal.amount));
    const mintInfo = await getMint(connection, tokenMints[0]);

    let liqTokenValue = Math.floor(prevMarketSol / Number(mintInfo.supply));

    let userReceivesSol =
      liqTokenValue * (withdrawAmounts[0] - withdrawAmounts[1]);

    try {
      const tx = await Bazaar.methods
        .withdrawLiquidity(
          new anchor.BN(withdrawAmounts[0]),
          new anchor.BN(withdrawAmounts[1]),
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[0],
          // marketTokenFee: marketTokenFee,
          voucherMint: tokenMints[1],
          marketVoucher: marketTokens[0],
          marketSol: marketTokens[1],
          userVoucher: userTokens[0][1],
          userLiq: userTokens[0][0],
          user: user[0].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log("fuck withdraw", error);
    }
    console.log("finished withdraw liq tx");

    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);
    let userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    printAndTest(
      Number(marketVoucherBal.amount).toFixed(3),
      (
        initAmounts[0] +
        liqAmounts[0] +
        swapAmount[0] -
        swapAmount[1] -
        withdrawAmounts[1]
      ).toFixed(3),
      "market voucher"
    );
    printAndTest(
      Number(marketSol),
      prevMarketSol - userReceivesSol,
      "market sol"
    );
    printAndTest(
      Number(userVoucherBal.amount),
      mintAmounts[0] - initAmounts[0] - liqAmounts[0] + withdrawAmounts[1],
      "user voucher"
    );
    printAndTest(Number(userSol), prevUserSol + userReceivesSol, "user sol");
    printAndTest(
      Number(userTokenLiqBal.amount),
      initAmounts[0] + liqAmounts[0] - withdrawAmounts[0],
      "user liq"
    );
  });

  Bazaar.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
