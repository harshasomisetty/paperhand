import * as anchor from "@project-serum/anchor";
import {Program} from "@project-serum/anchor";
import {Nftamm} from "../target/types/nftamm";
import {PublicKey, LAMPORTS_PER_SOL, Keypair} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

const {SystemProgram, SYSVAR_RENT_PUBKEY} = anchor.web3;
const assert = require("assert");

describe("nftamm", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Nftamm as Program<Nftamm>;
  const programID = new PublicKey(program.idl["metadata"]["address"]);

  const creator = Keypair.generate();
  const user = Keypair.generate();
  const user2 = Keypair.generate();

  let airdropVal = 20 * LAMPORTS_PER_SOL;

  let collectionId = "test";

  let collectionPool, collectionBump;
  let redeemMint, redeemTokenBump;
  let userRedeemWallet, user2RedeemWallet;

  let a;
  before("init variables", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(creator.publicKey, airdropVal),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, airdropVal),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, airdropVal),
      "confirmed"
    );

    [collectionPool, collectionBump] = await PublicKey.findProgramAddress(
      [Buffer.from("collection_pool"), Buffer.from(collectionId)],
      programID
    );

    [redeemMint, redeemTokenBump] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), collectionPool.toBuffer()],
      programID
    );

    userRedeemWallet = await getAssociatedTokenAddress(
      redeemMint,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    user2RedeemWallet = await getAssociatedTokenAddress(
      redeemMint,
      user2.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  });

  it("Initialized Pool!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initializePool(collectionId)
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        creator: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    console.log("Your transaction signature", tx);

    let collectionPoolInfo = await program.account.collectionPool.fetch(
      collectionPool
    );

    // console.log("col id", collectionPoolInfo.collectionId);

    assert.ok(collectionPoolInfo.collectionId === collectionId);
  });

  it("Inserted into vault!", async () => {
    const tx = await program.methods
      .vaultInsert(collectionId, collectionBump)
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    let postTokenBal = await getAccount(provider.connection, userRedeemWallet);
    console.log("post bal", Number(postTokenBal.amount));

    assert.ok(Number(postTokenBal.amount) == 1);
  });

  it("Withdrew from vault!", async () => {
    const tx = await program.methods
      .vaultWithdraw(collectionId, collectionBump)
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        user: user.publicKey,
        userRedeemWallet: userRedeemWallet,
        user2: user2.publicKey,
        user2RedeemWallet: user2RedeemWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    let postTokenBal = await getAccount(provider.connection, userRedeemWallet);
    console.log("post bal", Number(postTokenBal.amount));

    assert.ok(Number(postTokenBal.amount) == 0);
  });

  program.provider.connection.onLogs("all", ({logs}) => {
    console.log(logs);
  });
});
