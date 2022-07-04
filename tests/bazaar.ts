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

async function initUserLiqTokenIfNeeded(
  connection: Connection,
  user: PublicKey,
  mint: PublicKey
) {}
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

  // marketTokens is the wallet for tokenA and sol
  let marketTokens: PublicKey[] = new Array(2);
  // userTokens are array of token accs for each user
  // userTokens[0] is token for user1, userTokens[i][0] is liq wallet, [1] is coin A
  let userTokens: PublicKey[][] = new Array(2);
  let mintAmounts = [5, 50];
  let initAmounts = [3, 10];
  let liqAmounts = [3, 10];
  let swapAmount = [2, 4];
  let temp;
  before("Init variables", async () => {
    let airdropees = [creator, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          dropee.publicKey,
          mintAmounts[1] * LAMPORTS_PER_SOL
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

    [tokenMints[0], temp] = await PublicKey.findProgramAddress(
      [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    // tokenMints[0] = await createMint(
    //   connection,
    //   creator,
    //   creator.publicKey,
    //   creator.publicKey,
    //   0
    // );

    [marketTokens[0], temp] = await PublicKey.findProgramAddress(
      [Buffer.from("token_a"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    [marketTokens[1], temp] = await PublicKey.findProgramAddress(
      [Buffer.from("token_sol"), marketAuth.toBuffer()],
      BAZAAR_PROGRAM_ID
    );

    console.log("1");
    marketTokenFee = await getAssociatedTokenAddress(
      tokenMints[0],
      marketAuth,
      true
    );

    console.log("2");
    tokenMints[1] = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      0
    );

    console.log("3");
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
        new anchor.BN(initAmounts[1] * LAMPORTS_PER_SOL),
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
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user[0]])
      .rpc();

    let postMarketABal = await getAccount(connection, marketTokens[0]);
    let postMarketSol = await connection.getBalance(marketTokens[1]);
    let userTokenABal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);

    console.log(Number(postMarketABal.amount), initAmounts[0]);
    console.log(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL),
      initAmounts[1]
    );
    console.log(Number(userTokenABal.amount), mintAmounts[0] - initAmounts[0]);
    console.log(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      mintAmounts[1] - initAmounts[1]
    );

    assert.ok(Number(postMarketABal.amount) == initAmounts[0]);
    assert.ok(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL) == initAmounts[1]
    );
    assert.ok(Number(userTokenABal.amount) == mintAmounts[0] - initAmounts[0]);
    assert.ok(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL) ==
        mintAmounts[1] - initAmounts[1]
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
          tokenAMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenA: userTokens[1][1],
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
    let userTokenABal = await getAccount(connection, userTokens[0][1]);
    let userSol = await connection.getBalance(user[0].publicKey);
    let userTokenLiqBal = await getAccount(connection, userTokens[0][0]);

    console.log(Number(postMarketABal.amount), initAmounts[0] + liqAmounts[0]);
    console.log(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL),
      liqAmounts[1]
    );
    console.log(Number(userTokenABal.amount), mintAmounts[0] - liqAmounts[0]);
    console.log(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL),
      mintAmounts[1] - liqAmounts[1]
    );
    console.log(Number(userTokenLiqBal.amount), liqAmounts[0]);

    assert.ok(Number(postMarketABal.amount) == initAmounts[0] + liqAmounts[0]);
    assert.ok(
      Math.round(Number(postMarketSol) / LAMPORTS_PER_SOL) == liqAmounts[1]
    );
    assert.ok(Number(userTokenABal.amount) == mintAmounts[0] - liqAmounts[0]);
    assert.ok(
      Math.round(Number(userSol) / LAMPORTS_PER_SOL) ==
        mintAmounts[1] - liqAmounts[1]
    );
    assert.ok(Number(userTokenLiqBal.amount) == liqAmounts[0]);
  });

  it.skip("Swapped from token a to token b", async () => {
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
          // marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          marketTokenSol: marketTokens[1],
          userTokenA: userTokens[1][0],
          user: user[1].publicKey,
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

  it.skip("Swapped from token b to token a", async () => {
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
          // marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[0],
          marketTokenA: marketTokens[0],
          marketTokenSol: marketTokens[1],

          userTokenA: userTokens[0][0],
          user: user[0].publicKey,
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

  it.skip("withdrew liq", async () => {
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
        marketTokenSol: marketTokens[1],

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
