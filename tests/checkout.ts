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
import { Exhibition } from "../target/types/exhibition";
import { Caravan } from "../target/types/caravan";
import { checkIfAccountExists } from "../utils/actions";
import { otherCreators } from "../utils/constants";
import { creator, user } from "../utils/constants";
const assert = require("assert");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Checkout = anchor.workspace.Checkout as Program<Checkout>;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;
const Caravan = anchor.workspace.Caravan as Program<Caravan>;

const checkoutTradeAccounts = [];
for (let i = 0; i < 5; i++) {
  checkoutTradeAccounts.push(Keypair.generate());
}

describe("checkout", () => {
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;
  let matchedHolder = new Keypair();

  let bump;
  const user = Keypair.generate();
  let voucherMint, escrowVoucher, userVoucher: PublicKey;
  let checkoutAuth: PublicKey;
  let authBump: number;

  before(async () => {
    console.log(new Date(), "requesting airdrop");

    for (let i = 0; i < checkoutTradeAccounts.length; i++) {
      console.log("add", i, checkoutTradeAccounts[i].publicKey.toString());
    }

    let airdropees = [user];

    for (const dropee of airdropees) {
      await connection.confirmTransaction(
        await connection.requestAirdrop(
          dropee.publicKey,
          20 * LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    let userBal = await connection.getBalance(user.publicKey);
    console.log("user bal ", Number(userBal));

    console.log(new Date(), "User pubkey is", user.publicKey.toBase58());

    [checkoutAuth, authBump] = await PublicKey.findProgramAddress(
      [Buffer.from("checkout_auth"), exhibit.toBuffer()],
      Checkout.programId
    );
    // [voucherMint] = await PublicKey.findProgramAddress(
    //   [Buffer.from("voucher_mint"), exhibit.toBuffer()],
    //   CARAVAN_PROGRAM_ID
    // );

    voucherMint = await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      0
    );

    [escrowVoucher, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("escrow_voucher"), checkoutAuth.toBuffer()],
      Checkout.programId
    );

    userVoucher = await getAssociatedTokenAddress(voucherMint, user.publicKey);
  });

  it("Is initialized!", async () => {
    // TODO make matchedHolder a pda
    const init_linked_tx =
      await Checkout.account.matchedOrders.createInstruction(matchedHolder);

    // let acc = await connection.getAccountInfo(matchedHolder.publicKey);

    // console.log("chekoutOut auth", checkoutAuth.toString());
    // console.log(
    //   "ref accs",
    //   matchedHolder.publicKey.toString(),
    //   exhibit.toString(),
    //   checkoutAuth.toString(),
    //   voucherMint.toString(),
    //   escrowVoucher.toString(),
    //   user.publicKey.toString()
    // );

    const actual_tx = await Checkout.methods
      .initialize(authBump)
      .accounts({
        exhibit: exhibit,
        matchedOrders: matchedHolder.publicKey,
        checkoutAuth: checkoutAuth,
        voucherMint: voucherMint,
        escrowVoucher: escrowVoucher,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        exhibitionProgram: Exhibition.programId,
        caravanProgram: Caravan.programId,
      })
      .preInstructions([init_linked_tx])
      .signers([matchedHolder, user])
      .rpc();

    assert.ok((await checkIfAccountExists(escrowVoucher, connection)) == true);

    assert.ok((await checkIfAccountExists(checkoutAuth, connection)) == true);
  });

  it("Able to add to DLL!", async () => {
    try {
      if (!(await checkIfAccountExists(userVoucher, connection))) {
        await getOrCreateAssociatedTokenAccount(
          connection,
          user,
          voucherMint,
          user.publicKey
        );

        await mintTo(
          connection,
          user,
          voucherMint,
          userVoucher,
          creator,
          checkoutTradeAccounts.length
        );
      } else {
        console.log("user voucher already created");
      }

      for (let i = 0; i < checkoutTradeAccounts.length; i++) {
        let tx = await Checkout.methods
          .addOrder(checkoutTradeAccounts[i].publicKey, authBump)
          .accounts({
            matchedOrders: matchedHolder.publicKey,
            exhibit: exhibit,
            checkoutAuth: checkoutAuth,
            voucherMint: voucherMint,
            escrowVoucher: escrowVoucher,
            userVoucher: userVoucher,
            user: user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();
      }
    } catch (error) {
      console.log("adding erroe", error);
      throw new Error("Throw makes it go boom!");
    }
    // console.log("Your transaction signature", tx);

    assert.ok(
      Number((await getAccount(connection, escrowVoucher)).amount) ==
        checkoutTradeAccounts.length
    );

    // let matchedOrdersInfo = await Checkout.account.matchedOrders.fetch(
    //   matchedHolder.publicKey
    // );
    // console.log(matchedOrdersInfo.trades.orders[1]);
  });

  it("Able to remove pubkey order from DLL!", async () => {
    let orderPubkey = checkoutTradeAccounts[2];
    console.log("removing order from list: ", orderPubkey.publicKey);
    try {
      let tx = await Checkout.methods
        .removeOrder(orderPubkey.publicKey, authBump)
        .accounts({
          matchedOrders: matchedHolder.publicKey,
          exhibit: exhibit,
          checkoutAuth: checkoutAuth,
          voucherMint: voucherMint,
          escrowVoucher: escrowVoucher,
          userVoucher: userVoucher,
          user: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      console.log("remove erro", error);
    }
    assert.ok(
      Number((await getAccount(connection, escrowVoucher)).amount) ==
        checkoutTradeAccounts.length - 1
    );
  });

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
