import { Nft } from "@metaplex-foundation/js";
import { Wallet } from "@project-serum/anchor";
import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  EXHIBITION_PROGRAM_ID,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import { getExhibitAddress } from "@/utils/retrieveData";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export async function instructionInitializeExhibit(
  wallet: Wallet,
  publicKey: PublicKey,
  signTransaction: any,
  nft: Nft,
  connection: Connection
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  await nft.metadataTask.run();
  console.log("creators", nft.creators);
  let [exhibit, redeemMint] = await getExhibitAddress(nft);

  console.log(exhibit.toString());
  const tx = await Exhibition.methods
    .initializeExhibit()
    .accounts({
      exhibit: exhibit,
      redeemMint: redeemMint,
      nftMetadata: nft.metadataAccount.publicKey,
      creator: publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(tx);

  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("finalized")
  ).blockhash;

  transaction = await signTransaction(transaction);

  const rawTransaction = transaction.serialize();

  let signature = await connection.sendRawTransaction(rawTransaction);
  await connection.confirmTransaction(signature, "confirmed");
  console.log("Initialized exhibit!");
}

export async function instructionDepositNft(
  wallet: Wallet,
  publicKey: PublicKey,
  // sendTransaction: any,
  signTransaction: any,
  nft: Nft,
  connection: Connection
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  let [exhibit, redeemMint] = await getExhibitAddress(nft);

  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  // let userRedeemWallet = await getUserRedeemWallets(redeemMint, user);
  let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    user[0],
    nft.mint,
    user[0].publicKey
  );

  // create new user redeem token account outside of artifact insert
  await initAssociatedAddressIfNeeded(
    connection,
    userRedeemWallet[0],
    redeemMint,
    user[0]
  );

  let tx = await Exhibition.methods
    .artifactInsert()
    .accounts({
      exhibit: exhibit,
      redeemMint: redeemMint,
      userRedeemWallet: userRedeemWallet[0],
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount.address,
      nftArtifact: nftArtifact,
      user: user[0].publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  let transaction = new Transaction().add(tx);

  console.log(transaction);
  await sendAndConfirmTransaction(connection, transaction, [user[0]]);
  console.log("sent tx");
}
