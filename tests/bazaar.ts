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

  const creator = Keypair.generate();

  const user = [Keypair.generate(), Keypair.generate()];

  let airdropVal = 20 * LAMPORTS_PER_SOL;
  const marketState = Keypair.generate();

  let exhibit: PublicKey;
  let exhibitBump;
  let marketAuth: PublicKey;
  let marketMint: PublicKey;
  let marketTokenFee: PublicKey;
  let tokenMints: PublicKey[] = new Array(2);
  let marketTokens: PublicKey[] = new Array(2);
  let creatorTokens: PublicKey[] = new Array(3);
  let temp1: PublicKey;
  let temp2: PublicKey;
  let colCurSymbol = "nft0";
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

    [marketAuth] = await PublicKey.findProgramAddress(
      [Buffer.from("market_auth"), exhibit.toBuffer()],
      BazaarID
    );

    [marketMint] = await PublicKey.findProgramAddress(
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
      marketMint,
      marketAuth,
      true
    );

    // this is pool liq token address
    creatorTokens[2] = await getAssociatedTokenAddress(
      marketMint,
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

    console.log(exhibitInfo.exhibitSymbol, colCurSymbol);
    assert.ok(exhibitInfo.exhibitSymbol === colCurSymbol);
    // assert.ok(
    // exhibitInfo.colCreator.toString() === creator.publicKey.toString()
    // );
  });

  it("init market", async () => {
    // this method starts the market and bootstraps it with liquidity from the market creator

    let mintAmounts = [50, 100];
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

    console.log(exhibit);
    try {
      const tx = await Bazaar.methods
        .initializeMarket(
          new anchor.BN(mintAmounts[0]),
          new anchor.BN(mintAmounts[1]),
          exhibitBump
        )
        .accounts({
          exhibit: exhibit,
          marketAuth: marketAuth,
          marketMint: marketMint,
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
    console.log(Number(postLiqBal.amount));
    assert.ok(Number(postLiqBal.amount) == 50);

    let creatorTokenABal = await getAccount(connection, creatorTokens[0]);
    console.log(Number(creatorTokenABal.amount));
    assert.ok(Number(creatorTokenABal.amount) == 1);

    let creatorTokenBBal = await getAccount(connection, creatorTokens[0]);
    console.log(Number(creatorTokenBBal.amount));
    assert.ok(Number(creatorTokenBBal.amount) == 1);
  });

  // it("Deposited liq", async () => {
  //   // User1 will first acquire token1 and 2
  //   // Then user1 will deposit into the pool using the add_liquidity

  //   for (let i = 0; i < 2; i++) {
  //     await mintTo(
  //       connection,
  //       user[0],
  //       tokenMints[i],
  //       marketTokens[i],
  //       creator,
  //       100
  //     );
  //   }
  // });

  // it('swapped', async () => {

  // })

  // it('withdrew liq', async () => {

  // })

  Bazaar.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
