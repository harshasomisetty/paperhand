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
  AIRDROP_VALUE,
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

let decimals = 9;
let decimalsVal = Math.pow(10, decimals);

async function swapFunc(
  marketA: number,
  marketB: number,
  userA: number,
  userB: number,
  amountIn: number
) {
  let K = marketA * marketB;

  let marketDiff = marketA + amountIn;
  let Kdiff = K / marketDiff;
  let amountOut = marketB - Kdiff;

  console.log(marketA, marketB, userA, userB, amountIn);
  let results = [
    (marketA + amountIn) / decimalsVal,
    (marketB - amountOut) / decimalsVal,
    (userA - amountIn) / decimalsVal,
    (userB + amountOut) / decimalsVal,
  ];
  console.log(results);
  return results;
}

function printAndTest(arg1, arg2, name = "") {
  console.log(name, arg1, arg2);
  assert.ok(arg1 == arg2);
  console.log("passed", name);
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
  let stateBump;
  let solBump;
  let marketState: PublicKey;
  let marketAuth: PublicKey;
  let marketTokenFee: PublicKey;
  // tokenMint[0] is the pool liquidity token mint, [1] is the coin A mint
  let tokenMints: PublicKey[] = new Array(2);

  // marketTokens is the wallet for tokenA and sol
  let marketTokens: PublicKey[] = new Array(2);
  // userTokens are array of token accs for each user
  // userTokens[0] is token for user1, userTokens[i][0] is liq wallet, [1] is coin A
  let userTokens: PublicKey[][] = new Array(2);
  let mintAmounts = [5 * decimalsVal, 50 * LAMPORTS_PER_SOL];
  let initAmounts = [3 * decimalsVal, 10 * LAMPORTS_PER_SOL];
  let liqAmounts = [3 * decimalsVal, 10 * LAMPORTS_PER_SOL];
  let swapAmount = [
    [1.5 * decimalsVal, 0.9 * LAMPORTS_PER_SOL],
    [2 * LAMPORTS_PER_SOL, 1.4 * decimalsVal],
  ];
  let temp;
  before("Init variables", async () => {
    let airdropees = [creator, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          dropee.publicKey,
          mintAmounts[1]
        ),
        "confirmed"
      );
    }

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
      decimals
    );

    for (let i = 0; i < 2; i++) {
      console.log("4", i);

      let tempUserTokens = new Array(2);

      tempUserTokens[0] = await getAssociatedTokenAddress(
        tokenMints[0],
        user[i].publicKey
      );

      tempUserTokens[1] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          user[i],
          tokenMints[1],
          user[i].publicKey
        )
      ).address;

      userTokens[i] = tempUserTokens;
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

    console.log("init 0");

    const tx = await Bazaar.methods
      .initializeMarket(
        new anchor.BN(initAmounts[0]),
        new anchor.BN(initAmounts[1]),
        authBump
      )
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: tokenMints[0],
        marketTokenFee: marketTokenFee,
        tokenVoucherMint: tokenMints[1],
        marketTokenVoucher: marketTokens[0],
        marketTokenSol: marketTokens[1],
        userTokenVoucher: userTokens[0][1],
        userTokenLiq: userTokens[0][0],
        user: user[0].publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user[0]])
      .rpc();

    let postMarketABal = await getAccount(connection, marketTokens[0]);
    let postMarketSol = await connection.getBalance(marketTokens[1]);
    let userTokenVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);

    printAndTest(
      Number(postMarketABal.amount) / decimalsVal,
      initAmounts[0] / decimalsVal
    );
    printAndTest(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL),
      initAmounts[1] / LAMPORTS_PER_SOL
    );
    printAndTest(
      Number(userTokenVoucherBal.amount) / decimalsVal,
      (mintAmounts[0] - initAmounts[0]) / decimalsVal
    );
    printAndTest(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      (mintAmounts[1] - initAmounts[1]) / LAMPORTS_PER_SOL
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
    try {
      const tx = await Bazaar.methods
        .depositLiquidity(new anchor.BN(liqAmounts[0]), authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[0],
          // marketTokenFee: marketTokenFee,
          tokenVoucherMint: tokenMints[1],
          marketTokenVoucher: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenVoucher: userTokens[1][1],
          userTokenLiq: userTokens[1][0],
          user: user[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[1]])
        .rpc();
    } catch (error) {
      console.log(error);
    }

    console.log("finished deposit liq tx");

    let postMarketABal = await getAccount(connection, marketTokens[0]);
    let postMarketSol = await connection.getBalance(marketTokens[1]);
    let userTokenVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);
    let userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    printAndTest(
      Number(postMarketABal.amount) / decimalsVal,
      (initAmounts[0] + liqAmounts[0]) / decimalsVal
    );
    printAndTest(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL),
      liqAmounts[1] / LAMPORTS_PER_SOL
    );
    printAndTest(
      Number(userTokenVoucherBal.amount) / decimalsVal,
      (mintAmounts[0] - liqAmounts[0]) / decimalsVal
    );
    printAndTest(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      (mintAmounts[1] - liqAmounts[1]) / LAMPORTS_PER_SOL
    );
    printAndTest(
      Number(userTokenLiqBal.amount) / decimalsVal,
      liqAmounts[0] / decimalsVal
    );
  });

  it("Swapped from token a to token b", async () => {
    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userTokenVoucherBal = await getAccount(connection, userTokens[1][1]);
    let userSol = await connection.getBalance(user[1].publicKey);

    console.log(Number(marketVoucherBal.amount), "market a amt");
    console.log(Number(marketSol) / LAMPORTS_PER_SOL, "market sol");
    console.log(Number(userTokenVoucherBal.amount), "user a amt");
    console.log(Number(userSol) / LAMPORTS_PER_SOL, "user sol");

    let swapVals = await swapFunc(
      Number(marketVoucherBal.amount),
      marketSol,
      Number(userTokenVoucherBal.amount),
      userSol,
      swapAmount[0][0]
    );

    try {
      const tx = await Bazaar.methods
        .swap(
          new anchor.BN(swapAmount[0][0]),
          new anchor.BN(swapAmount[0][1]),
          true,
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          // marketTokenFee: marketTokenFee,
          tokenVoucherMint: tokenMints[1],
          marketTokenVoucher: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenVoucher: userTokens[1][1],
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
    userTokenVoucherBal = await getAccount(connection, userTokens[1][1]);
    userSol = await connection.getBalance(user[1].publicKey);

    printAndTest(Number(marketVoucherBal.amount) / decimalsVal, swapVals[0]);
    printAndTest(Number(marketSol) / LAMPORTS_PER_SOL, swapVals[1]);
    printAndTest(Number(userTokenVoucherBal.amount) / decimalsVal, swapVals[2]);
    printAndTest(Number(userSol) / LAMPORTS_PER_SOL, swapVals[3]);
  });

  it("Swapped from token b to token a", async () => {
    let marketVoucherBal = await getAccount(connection, marketTokens[0]);
    let marketSol = await connection.getBalance(marketTokens[1]);
    let userTokenVoucherBal = await getAccount(connection, userTokens[1][1]);
    let userSol = await connection.getBalance(user[1].publicKey);

    console.log(Number(marketVoucherBal.amount), "market a amt");
    console.log(Number(marketSol) / LAMPORTS_PER_SOL, "market sol");
    console.log(Number(userTokenVoucherBal.amount), "user a amt");
    console.log(Number(userSol) / LAMPORTS_PER_SOL, "user sol");

    let swapVals = await swapFunc(
      marketSol,
      Number(marketVoucherBal.amount),
      userSol,
      Number(userTokenVoucherBal.amount),
      swapAmount[1][0]
    );

    try {
      const tx = await Bazaar.methods
        .swap(
          new anchor.BN(swapAmount[1][0]),
          new anchor.BN(swapAmount[1][1]),
          false,
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          // marketTokenFee: marketTokenFee,
          tokenVoucherMint: tokenMints[1],
          marketTokenVoucher: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenVoucher: userTokens[1][1],
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
    userTokenVoucherBal = await getAccount(connection, userTokens[1][1]);
    userSol = await connection.getBalance(user[1].publicKey);

    printAndTest(
      (Number(marketVoucherBal.amount) / decimalsVal).toFixed(4),
      swapVals[1].toFixed(4)
    );
    printAndTest(
      (Number(marketSol) / LAMPORTS_PER_SOL).toFixed(4),
      swapVals[0].toFixed(4)
    );
    printAndTest(
      (Number(userTokenVoucherBal.amount) / decimalsVal).toFixed(4),
      swapVals[3].toFixed(4)
    );
    printAndTest(
      (Number(userSol) / LAMPORTS_PER_SOL).toFixed(4),
      swapVals[2].toFixed(4)
    );
  });

  it("withdrew liq", async () => {
    let postMarketABal = await getAccount(connection, marketTokens[0]);
    let postMarketSol = await connection.getBalance(marketTokens[1]);
    let userTokenVoucherBal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);
    let userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    console.log(Number(postMarketABal.amount));
    console.log(Number(postMarketSol));
    console.log(Number(userTokenVoucherBal.amount));
    console.log(Number(userSol));
    console.log(Number(userTokenLiqBal.amount));
    try {
      const tx = await Bazaar.methods
        .withdrawLiquidity(new anchor.BN(liqAmounts[0]), authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[0],
          // marketTokenFee: marketTokenFee,
          tokenVoucherMint: tokenMints[1],
          marketTokenVoucher: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenVoucher: userTokens[1][1],
          userTokenLiq: userTokens[1][0],
          user: user[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[1]])
        .rpc();
    } catch (error) {
      console.log("fuck withdraw", error);
    }
    console.log("finished withdraw liq tx");

    postMarketABal = await getAccount(connection, marketTokens[0]);
    postMarketSol = await connection.getBalance(marketTokens[1]);
    userTokenVoucherBal = await getAccount(connection, userTokens[0][1]);
    userSol = await connection.getBalance(user[0].publicKey);
    userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    printAndTest(
      (Number(postMarketABal.amount) / decimalsVal).toFixed(3),
      ((initAmounts[0] + liqAmounts[0]) / decimalsVal).toFixed(3)
    );
    printAndTest(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL),
      liqAmounts[1] / LAMPORTS_PER_SOL
    );
    printAndTest(
      Number(userTokenVoucherBal.amount) / decimalsVal,
      (mintAmounts[0] - liqAmounts[0]) / decimalsVal
    );
    printAndTest(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      (mintAmounts[1] - liqAmounts[1]) / LAMPORTS_PER_SOL
    );
    printAndTest(
      Number(userTokenLiqBal.amount) / decimalsVal,
      liqAmounts[0] / decimalsVal
    );
  });

  Bazaar.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
