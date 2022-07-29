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
  Transaction,
} from "@solana/web3.js";
import { Checkout } from "../target/types/checkout";
import { otherCreators } from "../utils/constants";
import { creator, user } from "../utils/constants";
const assert = require("assert");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Checkout = anchor.workspace.Checkout as Program<Checkout>;

let pda_list, bump;
const author = Keypair.generate();

const checkoutTradeAccounts = [];
for (let i = 0; i < 5; i++) {
  checkoutTradeAccounts.push(Keypair.generate());
}

let normal_list = new Keypair();

describe("checkout", () => {
  // mocha before script
  before(async () => {
    console.log(new Date(), "requesting airdrop");

    for (let i = 0; i < checkoutTradeAccounts.length; i++) {
      console.log("add", i, checkoutTradeAccounts[i].publicKey.toString());
    }

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

    [pda_list, bump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("data_holder_v1"),
        author.publicKey.toBuffer(),
      ],
      Checkout.programId
    );
  });

  it("Is initialized!", async () => {
    const init_tx = await Checkout.account.linkedHolder.createInstruction(
      normal_list
    );

    let acc = await connection.getAccountInfo(normal_list.publicKey);

    console.log("acc info", acc);

    const actual_tx = await Checkout.methods
      .initialize()
      .accounts({
        linkedHolder: normal_list.publicKey,
      })
      .preInstructions([init_tx])
      .signers([normal_list])
      .rpc();

    // console.log("Your transaction signature", tx);
  });

  it("Able to add to DLL!", async () => {
    for (let i = 0; i < checkoutTradeAccounts.length; i++) {
      let tx = await Checkout.methods
        .setData(checkoutTradeAccounts[i].publicKey)
        .accounts({
          writer: author.publicKey,
          linkedHolder: normal_list.publicKey,
        })
        .signers([author])
        .rpc();
    }
    // console.log("Your transaction signature", tx);
  });

  it("Able to remove pubkey order from DLL!", async () => {
    let orderPubkey = checkoutTradeAccounts[2];
    console.log("removing order from list: ", orderPubkey.publicKey);
    let tx = await Checkout.methods
      .removeOrder(orderPubkey.publicKey)
      .accounts({
        writer: author.publicKey,
        linkedHolder: normal_list.publicKey,
      })
      .signers([author])
      .rpc();
    // console.log("Your transaction signature", tx);
  });

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
