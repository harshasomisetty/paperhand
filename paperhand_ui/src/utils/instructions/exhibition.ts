import {
  SHOP_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getShopProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import { checkIfAccountExists } from "@/utils/retrieveData";

import {
  getNftDerivedAddresses,
  getShopAccounts,
  getCheckoutAccounts,
} from "@/utils/accountDerivation";
import { Nft } from "@metaplex-foundation/js";
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

export async function instructionDepositNft(
  wallet: Wallet,
  publicKey: PublicKey,
  signTransaction: any,
  chosenNfts: Record<string, Nft>,
  connection: Connection
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  let transaction = new Transaction();
  for (let nft of Object.values(chosenNfts)) {
    await nft.metadataTask.run();

    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint!,
      publicKey
    );

    let nftUserTokenAccount = await getAssociatedTokenAddress(
      nft.mint,
      publicKey
    );

    if (!(await checkIfAccountExists(exhibit, connection))) {
      const init_tx = await Exhibition.methods
        .initializeExhibit()
        .accounts({
          exhibit: exhibit,
          voucherMint: voucherMint,
          nftMetadata: nft.metadataAccount.publicKey,
          signer: publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      transaction = transaction.add(init_tx);

      console.log("initing exhibit");
    }

    if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
      let voucher_tx = createAssociatedTokenAccountInstruction(
        publicKey,
        userVoucherWallet,
        publicKey,
        voucherMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      transaction = transaction.add(voucher_tx);
    } else {
      console.log("user voucher already created");
    }

    let insert_nft_tx = await Exhibition.methods
      .artifactInsert()
      .accounts({
        exhibit: exhibit,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet,
        nftMint: nft.mint,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount,
        nftArtifact: nftArtifact,
        delegateSigner: publicKey,
        signer: publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    transaction = transaction.add(insert_nft_tx);
  }

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
  console.log("deposited nft");
}

export async function instructionWithdrawNft(
  wallet: Wallet,
  publicKey: PublicKey,
  signTransaction: any,
  nft: Nft,
  connection: Connection
) {
  let { Exhibition } = await getExhibitProgramAndProvider(wallet);
  await nft.metadataTask.run();

  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  let nftUserTokenAccount = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  let transaction = new Transaction();

  if (!(await checkIfAccountExists(nftUserTokenAccount, connection))) {
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      nftUserTokenAccount,
      publicKey,
      nft.mint
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  let withdraw_tx = await Exhibition.methods
    .artifactWithdraw()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAccount,
      nftArtifact: nftArtifact,
      delegateSigner: publicKey,
      signer: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();

  transaction = transaction.add(withdraw_tx);

  await manualSendTransaction(
    transaction,
    publicKey,
    connection,
    signTransaction
  );
  console.log("Withdrew nft!");
}
