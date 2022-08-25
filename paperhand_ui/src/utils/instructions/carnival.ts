import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";
import { BN, Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "../accountDerivation";
import { carnivalDepositNft, createCarnivalBooth } from "../carnival_actions";
import { getOpenBoothId } from "../carnival_data";

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

export async function instructionExecuteCreateBooth(
  wallet: Wallet,
  publicKey: PublicKey,
  nfts: Nft[],
  solAmt: number,
  curve: number,
  boothType: number,
  delta: number,
  fee: number,
  connection: Connection,
  signTransaction: any
) {
  let transaction = await createCarnivalBooth(
    connection,
    publicKey,
    nfts,
    solAmt,
    curve,
    boothType,
    delta,
    fee,
    wallet
  );

  try {
    await manualSendTransaction(
      transaction,
      publicKey,
      connection,
      signTransaction
    );
  } catch (error) {
    console.log("trying to create booth1", error);
  }

  await new Promise((r) => setTimeout(r, 500));

  let { exhibit } = await getNftDerivedAddresses(nfts[0]);

  let { carnival } = await getCarnivalAccounts(exhibit);

  let boothId = await getOpenBoothId(carnival, connection, wallet);

  for (let nft of nfts) {
    console.log("depoing nft", nft.name);
    let transaction2 = await carnivalDepositNft(
      connection,
      nft,
      publicKey,
      boothId - 1,
      wallet
    );
    try {
      await manualSendTransaction(
        transaction2,
        publicKey,
        connection,
        signTransaction
      );
    } catch (error) {
      console.log("trying to create booth loop", error);
    }
  }
}
