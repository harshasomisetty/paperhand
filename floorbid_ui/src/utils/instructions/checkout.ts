import {
  SHOP_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getShopProgramAndProvider,
  getExhibitProgramAndProvider,
  getCheckoutProgramAndProvider,
} from "@/utils/constants";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
} from "@/utils/retrieveData";
import {
  getExhibitAccounts,
  getVoucherAddress,
  getSwapAccounts,
  getCheckoutAccounts,
} from "@/utils/accountDerivation";

import { BN, Wallet } from "@project-serum/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function manualSendTransaction(
  transaction: Transaction,
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: any
) {
  console.log("in man send tx");
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("finalized")
  ).blockhash;

  transaction = await signTransaction(transaction);

  const rawTransaction = transaction.serialize();
  let signature = await connection.sendRawTransaction(rawTransaction);
  console.log("sent raw, waiting");
  await connection.confirmTransaction(signature, "confirmed");
  console.log("sent tx!!!");
}

export async function instructionPlaceBid(
  wallet: Wallet,
  publicKey: PublicKey,
  exhibit: PublicKey,
  bidSize: number,
  signTransaction: any,
  connection: Connection
) {
  console.log("in make mids");

  let { Checkout } = await getCheckoutProgramAndProvider(wallet);

  let [
    auth,
    authBump,
    bidOrders,
    matchedOrdersAddress,
    escrowVoucher,
    escrowSol,
  ] = await getCheckoutAccounts(exhibit);

  console.log("about to start bids");
  let bid_tx = await Checkout.methods
    .makeBid(new BN(bidSize))
    .accounts({
      exhibit: exhibit,
      bidOrders: bidOrders,
      escrowSol: escrowSol,
      bidder: publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(bid_tx);

  try {
    console.log("before manual send");

    await manualSendTransaction(
      transaction,
      publicKey,
      connection,
      signTransaction
    );
  } catch (error) {
    console.log("initing error", error);
  }
}
