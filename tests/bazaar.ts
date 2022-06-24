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
  let marketAuth: PublicKey;
  let marketMint: PublicKey;
  let marketTokenFee: PublicKey;
  let tokenMints: PublicKey[];
  let marketTokens: PublicKey[];

  let colCurSymbol = "nft0";
  it("Init variables", async () => {
    let airdropees = [creator, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(dropee.publicKey, airdropVal),
        "confirmed"
      );
    }

    [exhibit] = await PublicKey.findProgramAddress(
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
      [Buffer.from("redeem_mint"), marketAuth.toBuffer()],
      BazaarID
    );

    [marketTokens[0]] = await PublicKey.findProgramAddress(
      [Buffer.from("token_a"), marketAuth.toBuffer()],
      BazaarID
    );

    [marketTokens[1]] = await PublicKey.findProgramAddress(
      [Buffer.from("token_a"), marketAuth.toBuffer()],
      BazaarID
    );

    for (let i = 0; i < 2; i++) {
      tokenMints[i] = await createMint(
        connection,
        creator,
        creator.publicKey,
        creator.publicKey,
        0
      );
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

    assert.ok(exhibitInfo.colSymbol === colCurSymbol);
    assert.ok(
      exhibitInfo.colCreator.toString() === creator.publicKey.toString()
    );
  });

  it("init market", async () => {
    const tx = await Bazaar.methods
      .initializeMarket(creator.publicKey, colCurSymbol)
      .accounts({
        exhibit: exhibit,
        marketAuth: marketAuth,
        marketMint: marketMint,
        marketTokenFee: marketTokenFee,
        tokenAMint: tokenMints[0],
        tokenBMint: tokenMints[1],
        marketTokenA: marketTokens[0],
        marketTokenB: marketTokens[1],
        creator: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
  });

  // it('deposit liq', async () => {

  // })

  // it('swap', async () => {

  // })

  // it('withdraw liq', async () => {

  // })

  Bazaar.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
