import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";
import { BN, Program, Wallet } from "@project-serum/anchor";
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
import { getBoothInfo, getOpenBoothId } from "../carnival_data";
import {
  CARNIVAL_PROGRAM_ID,
  EXHIBITION_PROGRAM_ID,
  getCarnivalProgramAndProvider,
} from "../constants";
import { checkIfAccountExists } from "../retrieveData";

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

export async function instructionSolToNft(
  wallet: Wallet,
  publicKey: PublicKey,
  nfts: Nft[],
  connection: Connection,
  signTransaction: any
) {
  let { Carnival } = await getCarnivalProgramAndProvider(wallet);

  let transaction = new Transaction();

  for (let nft of nfts) {
    let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
      nft
    );

    let parsedArtifact = await getAccount(connection, nftArtifact);
    let booth1 = parsedArtifact.delegate;
    console.log("asdf");
    console.log("asdf2");
    // console.log("parsed arti", parsedArtifact.delegate.toString());

    // let boothId = boothInfo.boothId;
    // let boothInfo = await getBoothInfo(connection, exhibit, boothId, wallet);
    let fetchedBoothInfo = await Carnival.account.booth.fetch(booth1);
    let boothId = fetchedBoothInfo.boothId;
    let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
      await getCarnivalAccounts(exhibit);
    console.log("asdf3");

    let [booth, boothBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("booth"),
        carnival.toBuffer(),
        new BN(boothId).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    let nftUserTokenAddress = await getAssociatedTokenAddress(
      nft.mint,
      publicKey
    );

    console.log("got to nftusertokenadd");
    let userVoucherWallet = await getAssociatedTokenAddress(
      voucherMint,
      publicKey
    );

    if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
      console.log("voucher_wallet_ttx");
      let voucher_wallet_tx = createAssociatedTokenAccountInstruction(
        publicKey,
        userVoucherWallet,
        publicKey,
        voucherMint
      );
      transaction = transaction.add(voucher_wallet_tx);
    } else {
      console.log("user voucher already created");
    }

    if (!(await checkIfAccountExists(nftUserTokenAddress, connection))) {
      console.log("user nft_wallet_ttx");
      let user_nft_tx = createAssociatedTokenAccountInstruction(
        publicKey,
        nftUserTokenAddress,
        publicKey,
        nft.mint
      );
      transaction = transaction.add(user_nft_tx);
    } else {
      console.log("user user wallet already created");
    }

    let preEscrowBal = await connection.getBalance(escrowSol);
    let preFetchedBoothInfo = await Carnival.account.booth.fetch(booth);

    console.log(
      "booth insertt",
      boothId,
      carnivalAuthBump,
      boothBump,
      escrowSolBump
    );
    let solToNftTx = await Carnival.methods
      .tradeSolForNft(
        new BN(boothId),
        carnivalAuthBump,
        boothBump,
        escrowSolBump
      )
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        booth: booth,
        escrowSol: escrowSol,
        voucherMint: voucherMint,
        userVoucherWallet: userVoucherWallet,
        nftMint: nft.mint,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAddress,
        nftArtifact: nftArtifact,
        signer: publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        exhibitionProgram: EXHIBITION_PROGRAM_ID,
      })
      .transaction();

    transaction = transaction.add(solToNftTx);

    try {
      await manualSendTransaction(
        transaction,
        publicKey,
        connection,
        signTransaction
      );
    } catch (error) {
      console.log("phantom send tx", error);
    }
  }
}
