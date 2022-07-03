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
import { Bazaar } from "../target/types/bazaar";
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
  let marketState: PublicKey;
  let marketAuth: PublicKey;
  let marketTokenFee: PublicKey;

  // tokenMint[0] is the pool liquidity token mint, [1] is the coin A mint
  let tokenMints: PublicKey[] = new Array(2);

  // marketToken is the wallet for tokenA
  let marketTokens: PublicKey[] = new Array(2);
  // userTokens are array of token accs for each user
  // userTokens[0] is token for user1, userTokens[i][0] is liq wallet, [1] is coin A
  let userTokens: PublicKey[][] = new Array(2);
  let mintAmounts = [5, 10];
  let swapAmount = [2, 4];

  it("Init variables", async () => {
    let airdropees = [creator, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          dropee.publicKey,
          50 * LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    [marketState, stateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market_state"), exhibit.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [marketAuth, authBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market_auth"), exhibit.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [tokenMints[0]] = await PublicKey.findProgramAddress(
      [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [marketTokens[0]] = await PublicKey.findProgramAddress(
      [Buffer.from("token_a"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );
    [marketTokens[1]] = await PublicKey.findProgramAddress(
      [Buffer.from("token_sol"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    marketTokenFee = await getAssociatedTokenAddress(
      tokenMints[2],
      marketAuth,
      true
    );

    tokenMints[1] = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      0
    );

    for (let i = 0; i < 2; i++) {
      let tempUserTokens = new Array(3);
      tempUserTokens[0] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          user[i],
          tokenMints[0],
          user[i].publicKey
        )
      ).address;

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
  });

  it("init market", async () => {
    // This method starts the market and bootstraps it with liquidity from the market creator

    await mintTo(
      connection,
      creator,
      tokenMints[1],
      user[0][1],
      creator,
      mintAmounts[0] + 1
    );

    try {
      const tx = await Bazaar.methods
        .initializeMarket(
          new anchor.BN(mintAmounts[0]),
          new anchor.BN(mintAmounts[1]),
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketState: marketState,
          marketAuth: marketAuth,
          marketMint: tokenMints[0],
          marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenA: userTokens[0][1],
          userTokenLiq: userTokens[0][0],
          user: user[0].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log(error);
    }
    let postMarketABal = await getAccount(connection, marketTokens[0]);
    assert.ok(Number(postMarketABal.amount) == mintAmounts[0]);
    let postMarketBBal = await getAccount(connection, marketTokens[1]);
    assert.ok(Number(postMarketBBal.amount) == mintAmounts[1]);

    let userTokenABal = await getAccount(connection, userTokens[0][0]);
    assert.ok(Number(userTokenABal.amount) == 1);

    let userTokenBBal = await getAccount(connection, userTokens[0][1]);
    assert.ok(Number(userTokenBBal.amount) == 1);

    console.log("ended init market");
  });

  it("Deposited liq", async () => {
    // User1 will first acquire token1 and 2
    // Then user1 will deposit into the pool using the add_liquidity

    // TODO Checking if liq calculations are correct
    await mintTo(
      connection,
      user[1],
      tokenMints[1],
      userTokens[1][1],
      creator,
      mintAmounts[0] + 1
    );

    console.log("finished minting");
    try {
      const tx = await Bazaar.methods
        .depositLiquidity(new anchor.BN(mintAmounts[0]), authBump)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[2],
          // marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[0],
          marketTokenA: marketTokens[0],
          userTokenA: userTokens[1][0],
          userTokenLiq: userTokens[1][2],
          user: user[1].publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log(error);
    }

    console.log("finished deposit liq tx");

    let postLiqBal = await getAccount(connection, userTokens[1][2]);
    let userTokenABal = await getAccount(connection, userTokens[1][0]);
    let userTokenBBal = await getAccount(connection, userTokens[1][1]);
    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    let marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log(Number(postLiqBal.amount));
    console.log(Number(userTokenABal));
    console.log(Number(userTokenBBal));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    assert.ok(Number(postLiqBal.amount) == mintAmounts[0]);
    assert.ok(Number(userTokenABal.amount) == 1);
    assert.ok(Number(userTokenBBal.amount) == 1);
    assert.ok(Number(marketTokenABal.amount) == mintAmounts[0] * 2);
    assert.ok(Number(marketTokenBBal.amount) == mintAmounts[1] * 2);
  });

  it("Swapped from token a to token b", async () => {
    await mintTo(
      connection,
      user[1],
      tokenMints[0],
      userTokens[1][0],
      creator,
      swapAmount[0]
    );

    let userTokenABal = await getAccount(connection, userTokens[0][0]);
    let userTokenBBal = await getAccount(connection, userTokens[0][1]);
    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    let marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("pre");
    console.log(Number(userTokenABal.amount));
    console.log(Number(userTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    try {
      const tx = await Bazaar.methods
        .swap(new anchor.BN(swapAmount[0]), new anchor.BN(swapAmount[1]), true)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[0],
          // marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          swapperTokenA: userTokens[1][0],
          swapper: user[1].publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log("fuck swap", error);
    }

    userTokenABal = await getAccount(connection, userTokens[0][0]);
    userTokenBBal = await getAccount(connection, userTokens[0][1]);
    marketTokenABal = await getAccount(connection, marketTokens[0]);
    marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("post");
    console.log(Number(userTokenABal.amount));
    console.log(Number(userTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    assert.ok(Number(userTokenABal.amount) == 2);
    assert.ok(Number(userTokenBBal.amount) == 19);
    assert.ok(Number(marketTokenABal.amount) == 110);
    assert.ok(Number(marketTokenBBal.amount) == 182);
  });

  it("Swapped from token b to token a", async () => {
    let userTokenABal = await getAccount(connection, userTokens[0][0]);
    let userTokenBBal = await getAccount(connection, userTokens[0][1]);
    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    let marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("pre");
    console.log(Number(userTokenABal.amount));
    console.log(Number(userTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    try {
      const tx = await Bazaar.methods
        .swap(new anchor.BN(10), new anchor.BN(10), false)
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[2],
          // marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[0],
          tokenBMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          marketTokenB: marketTokens[1],
          swapperTokenA: userTokens[0][0],
          swapperTokenB: userTokens[0][1],
          swapper: user[0].publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log("fuck swap", error);
    }

    userTokenABal = await getAccount(connection, userTokens[0][0]);
    userTokenBBal = await getAccount(connection, userTokens[0][1]);
    marketTokenABal = await getAccount(connection, marketTokens[0]);
    marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("post");
    console.log(Number(userTokenABal.amount));
    console.log(Number(userTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    assert.ok(Number(userTokenABal.amount) == 7);
    assert.ok(Number(userTokenBBal.amount) == 9);
    assert.ok(Number(marketTokenABal.amount) == 105);
    assert.ok(Number(marketTokenBBal.amount) == 192);
  });

  it("withdrew liq", async () => {
    let mintInfo = await getMint(connection, tokenMints[2]);

    console.log(mintInfo.supply);
    let postLiqBal = await getAccount(connection, userTokens[0][2]);
    let userTokenABal = await getAccount(connection, userTokens[0][0]);
    let userTokenBBal = await getAccount(connection, userTokens[0][1]);
    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    let marketTokenBBal = await getAccount(connection, marketTokens[1]);

    // console.log(Number(postMarketLiqBal.amount));
    console.log(Number(postLiqBal.amount));
    console.log(Number(userTokenABal.amount));
    console.log(Number(userTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    const tx = await Bazaar.methods
      .withdrawLiquidity(new anchor.BN(10), authBump)
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: tokenMints[2],
        // marketTokenFee: marketTokenFee,
        tokenAMint: tokenMints[0],
        marketTokenA: marketTokens[0],
        userTokenA: userTokens[0][0],
        userTokenLiq: userTokens[0][2],
        user: user[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user[0]])
      .rpc();

    console.log("finished withdraw liq tx");

    mintInfo = await getMint(connection, tokenMints[2]);

    console.log("after mint", mintInfo.supply);
    postLiqBal = await getAccount(connection, userTokens[0][2]);
    userTokenABal = await getAccount(connection, userTokens[0][0]);
    userTokenBBal = await getAccount(connection, userTokens[0][1]);
    marketTokenABal = await getAccount(connection, marketTokens[0]);
    marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log(Number(postLiqBal.amount));
    console.log(Number(userTokenABal.amount));
    console.log(Number(userTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    assert.ok(Number(postLiqBal.amount) == 40);
    assert.ok(Number(userTokenABal.amount) == 17);
    assert.ok(Number(userTokenBBal.amount) == 28);
    assert.ok(Number(marketTokenABal.amount) == 95);
    assert.ok(Number(marketTokenBBal.amount) == 173);
  });

  Bazaar.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
