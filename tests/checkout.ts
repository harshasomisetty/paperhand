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
import { Checkout } from "../target/types/checkout";
import { otherCreators } from "../utils/constants";
import { creator, user } from "../utils/constants";
const assert = require("assert");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Checkout = anchor.workspace.Checkout as Program<Checkout>;

let pda, pda2, bump;
const author = Keypair.generate();

describe("checkout", () => {
  //
  // mocha before script
  before(async () => {
    console.log(new Date(), "requesting airdrop");
    // let airdropees = [author];

    // let airdropPromises = [];
    // airdropees.forEach((dropee) =>
    //   airdropPromises.push(
    //     provider.connection.requestAirdrop(
    //       dropee.publicKey,
    //       50 * LAMPORTS_PER_SOL
    //     )
    //   )
    // );
    // await Promise.all(airdropPromises);

    const airdropTx = await connection.requestAirdrop(
      author.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropTx);
    // console.log(airdropPromises);
    let authorBal = await connection.getBalance(author.publicKey);
    console.log("author bal ", Number(authorBal));

    console.log(new Date(), "User pubkey is", author.publicKey.toBase58());

    [pda, bump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("data_holder_v0"),
        author.publicKey.toBuffer(),
      ],
      Checkout.programId
    );
    [pda2, bump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("data_holder_v1"),
        author.publicKey.toBuffer(),
      ],
      Checkout.programId
    );
  });

  it("Is initialized!", async () => {
    const tx = await Checkout.methods
      .initialize()
      .accounts({
        author: author.publicKey,
        dataHolder: pda,
        linkedHolder: pda2,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([author])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  // it("Able to set text!", async () => {
  //   try {
  //     const tx = await Checkout.methods
  //       .setData("nice")
  //       .accounts({
  //         writer: author.publicKey,
  //         dataHolder: pda,
  //       })
  //       .signers([author])
  //       .rpc();
  //     console.log("Your transaction signature", tx);
  //   } catch (error) {
  //     console.log("cant set text", error);
  //     throw new Error();
  //   }
  // });

  it("Able to set linked!", async () => {
    try {
      const tx = await Checkout.methods
        .setData2(author.publicKey)
        .accounts({
          writer: author.publicKey,
          linkedHolder: pda2,
        })
        .signers([author])
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      console.log("cant set text", error);
      throw new Error();
    }
  });

  it("Able to read linked!", async () => {
    try {
      const tx = await Checkout.methods
        .readData()
        .accounts({
          writer: author.publicKey,
          linkedHolder: pda2,
        })
        .signers([author])
        .rpc();
      console.log("Your transaction signature", tx);
    } catch (error) {
      console.log("cant set text", error);
      throw new Error();
    }
  });

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
