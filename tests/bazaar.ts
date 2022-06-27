import { creatorsConfigDefault } from "@metaplex-foundation/js";
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
  Account,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Bazaar } from "../target/types/bazaar";
const fs = require("fs");
const assert = require("assert");
const { SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Bazaar = anchor.workspace.Bazaar as Program<Bazaar>;
const BazaarID = Bazaar.programId;
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

  const creator: Keypair = Keypair.generate();

  const user: Keypair[] = [Keypair.generate(), Keypair.generate()];

  let airdropVal = 20 * LAMPORTS_PER_SOL;
  const marketState = Keypair.generate();

  // The arrays contain info for Token A, Token B, and Liq token
  // There are arrays for the full mint, and for the specific token accounts for each user
  let exhibit: PublicKey;
  let exhibitBump;
  let authBump;
  let marketAuth: PublicKey;
  let marketTokenFee: PublicKey;
  let tokenMints: PublicKey[] = new Array(3);
  let marketTokens: PublicKey[] = new Array(2);
  let creatorTokens: PublicKey[] = new Array(3);
  let userTokens: PublicKey[][] = new Array(2);
  let colCurSymbol = "nft0";
  let mintAmounts = [50, 100];

  it("Init variables", async () => {
    let airdropees = [creator, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(dropee.publicKey, airdropVal),
        "confirmed"
      );
    }

    [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("exhibit"),
        Buffer.from(colCurSymbol),
        creator.publicKey.toBuffer(),
      ],
      BazaarID
    );

    [marketAuth, authBump] = await PublicKey.findProgramAddress(
      [Buffer.from("market_auth"), exhibit.toBuffer()],
      BazaarID
    );

    [tokenMints[2]] = await PublicKey.findProgramAddress(
      [Buffer.from("market_token_mint"), marketAuth.toBuffer()],
      BazaarID
    );

    [marketTokens[0]] = await PublicKey.findProgramAddress(
      [Buffer.from("token_a"), marketAuth.toBuffer()],
      BazaarID
    );

    [marketTokens[1]] = await PublicKey.findProgramAddress(
      [Buffer.from("token_b"), marketAuth.toBuffer()],
      BazaarID
    );

    marketTokenFee = await getAssociatedTokenAddress(
      tokenMints[2],
      marketAuth,
      true
    );

    // This is pool liq token address
    creatorTokens[2] = await getAssociatedTokenAddress(
      tokenMints[2],
      creator.publicKey
    );

    for (let i = 0; i < 2; i++) {
      console.log("in create mint");
      let mint = await createMint(
        connection,
        creator,
        creator.publicKey,
        creator.publicKey,
        0
      );
      tokenMints[i] = mint;
      creatorTokens[i] = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          creator,
          tokenMints[i],
          creator.publicKey
        )
      ).address;
    }

    for (let i = 0; i < 2; i++) {
      let tempUserTokens = new Array(3);
      for (let j = 0; j < 2; j++) {
        tempUserTokens[j] = (
          await getOrCreateAssociatedTokenAccount(
            connection,
            user[i],
            tokenMints[j],
            user[i].publicKey
          )
        ).address;
      }
      // tempUserTokens[2] = (
      //   await getOrCreateAssociatedTokenAccount(
      //     connection,
      //     user[i],
      //     tokenMints[2],
      //     user[i].publicKey
      //   )
      // ).address;

      tempUserTokens[2] = await getAssociatedTokenAddress(
        tokenMints[2],
        user[i].publicKey
      );

      userTokens[i] = tempUserTokens;
    }

    const tx = await Bazaar.methods
      .initializeExhibit(creator.publicKey, colCurSymbol)
      .accounts({
        exhibit: exhibit,
        creator: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    let exhibitInfo = await Bazaar.account.exhibit.fetch(exhibit);

    assert.ok(exhibitInfo.exhibitSymbol === colCurSymbol);
    // assert.ok(
    // exhibitInfo.colCreator.toString() === creator.publicKey.toString()
    // );
  });

  it("init market", async () => {
    // This method starts the market and bootstraps it with liquidity from the market creator

    for (let i = 0; i < 2; i++) {
      await mintTo(
        connection,
        creator,
        tokenMints[i],
        creatorTokens[i],
        creator,
        mintAmounts[i] + 1
      );
    }

    try {
      const tx = await Bazaar.methods
        .initializeMarket(
          new anchor.BN(mintAmounts[0]),
          new anchor.BN(mintAmounts[1]),
          colCurSymbol,
          exhibitBump,
          authBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[2],
          marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[0],
          tokenBMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          marketTokenB: marketTokens[1],
          creatorTokenA: creatorTokens[0],
          creatorTokenB: creatorTokens[1],
          creatorTokenLiq: creatorTokens[2],
          creator: creator.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
    } catch (error) {
      console.log(error);
    }
    let postLiqBal = await getAccount(connection, creatorTokens[2]);
    assert.ok(Number(postLiqBal.amount) == 50);

    let creatorTokenABal = await getAccount(connection, creatorTokens[0]);
    assert.ok(Number(creatorTokenABal.amount) == 1);

    let creatorTokenBBal = await getAccount(connection, creatorTokens[0]);
    assert.ok(Number(creatorTokenBBal.amount) == 1);

    console.log("ended init market");
  });

  it("Deposited liq", async () => {
    // User1 will first acquire token1 and 2
    // Then user1 will deposit into the pool using the add_liquidity

    // TODO Checking if liq calculations are correct
    for (let i = 0; i < 2; i++) {
      await mintTo(
        connection,
        user[0],
        tokenMints[i],
        userTokens[0][i],
        creator,
        mintAmounts[i] + 1
      );
    }

    console.log("finished minting");
    try {
      const tx = await Bazaar.methods
        .depositLiquidity(
          new anchor.BN(mintAmounts[0]),
          colCurSymbol,
          exhibitBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: tokenMints[2],
          // marketTokenFee: marketTokenFee,
          tokenAMint: tokenMints[0],
          tokenBMint: tokenMints[1],
          marketTokenA: marketTokens[0],
          marketTokenB: marketTokens[1],
          depositorTokenA: userTokens[0][0],
          depositorTokenB: userTokens[0][1],
          depositorTokenLiq: userTokens[0][2],
          creator: creator.publicKey,
          depositor: user[0].publicKey,
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

    let postLiqBal = await getAccount(connection, userTokens[0][2]);
    assert.ok(Number(postLiqBal.amount) == 50);

    let creatorTokenABal = await getAccount(connection, userTokens[0][0]);
    assert.ok(Number(creatorTokenABal.amount) == 1);

    let creatorTokenBBal = await getAccount(connection, userTokens[0][1]);
    assert.ok(Number(creatorTokenBBal.amount) == 1);

    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    console.log(Number(marketTokenABal.amount));
    assert.ok(Number(marketTokenABal.amount) == 100);

    let marketTokenBBal = await getAccount(connection, marketTokens[1]);
    console.log(Number(marketTokenBBal.amount));
    assert.ok(Number(marketTokenBBal.amount) == 200);
  });

  it("Swapped from token a to token b", async () => {
    await mintTo(
      connection,
      user[0],
      tokenMints[0],
      userTokens[0][0],
      creator,
      11
    );

    let creatorTokenABal = await getAccount(connection, userTokens[0][0]);
    let creatorTokenBBal = await getAccount(connection, userTokens[0][1]);
    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    let marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("pre");
    console.log(Number(creatorTokenABal.amount));
    console.log(Number(creatorTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    try {
      const tx = await Bazaar.methods
        .swap(
          colCurSymbol,
          exhibitBump,
          true,
          new anchor.BN(10),
          new anchor.BN(20)
        )
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
          creator: creator.publicKey,
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

    creatorTokenABal = await getAccount(connection, userTokens[0][0]);
    creatorTokenBBal = await getAccount(connection, userTokens[0][1]);
    marketTokenABal = await getAccount(connection, marketTokens[0]);
    marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("post");
    console.log(Number(creatorTokenABal.amount));
    console.log(Number(creatorTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    assert.ok(Number(creatorTokenABal.amount) == 2);
    assert.ok(Number(creatorTokenBBal.amount) == 19);
    assert.ok(Number(marketTokenABal.amount) == 110);
    assert.ok(Number(marketTokenBBal.amount) == 182);
  });

  it("Swapped from token b to token a", async () => {
    let creatorTokenABal = await getAccount(connection, userTokens[0][0]);
    let creatorTokenBBal = await getAccount(connection, userTokens[0][1]);
    let marketTokenABal = await getAccount(connection, marketTokens[0]);
    let marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("pre");
    console.log(Number(creatorTokenABal.amount));
    console.log(Number(creatorTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    try {
      const tx = await Bazaar.methods
        .swap(
          colCurSymbol,
          exhibitBump,
          false,
          new anchor.BN(10),
          new anchor.BN(10)
        )
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
          creator: creator.publicKey,
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

    creatorTokenABal = await getAccount(connection, userTokens[0][0]);
    creatorTokenBBal = await getAccount(connection, userTokens[0][1]);
    marketTokenABal = await getAccount(connection, marketTokens[0]);
    marketTokenBBal = await getAccount(connection, marketTokens[1]);

    console.log("post");
    console.log(Number(creatorTokenABal.amount));
    console.log(Number(creatorTokenBBal.amount));
    console.log(Number(marketTokenABal.amount));
    console.log(Number(marketTokenBBal.amount));

    assert.ok(Number(creatorTokenABal.amount) == 7);
    assert.ok(Number(creatorTokenBBal.amount) == 9);
    assert.ok(Number(marketTokenABal.amount) == 105);
    assert.ok(Number(marketTokenBBal.amount) == 192);
  });

  // it('withdrew liq', async () => {

  // })

  Bazaar.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
