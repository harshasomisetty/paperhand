import { Nft } from "@metaplex-foundation/js";
import { BN, Program } from "@project-serum/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "./accountDerivation";
import { checkIfAccountExists, getProvider } from "./actions";
import { CARNIVAL_PROGRAM_ID, EXHIBITION_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
import { otherCreators, creator, users } from "../utils/constants";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export async function createCarnival(
  connection: Connection,
  nft: Nft,
  publicKey: PublicKey
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let transaction = new Transaction();

  console.log("after start tx");

  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);
  console.log("after carnival account");

  if (!(await checkIfAccountExists(carnival, connection))) {
    console.log(" carnival no exist");
    let initCarnTx = await Carnival.methods
      .initializeCarnival()
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        voucherMint: voucherMint,
        nftMetadata: nft.metadataAccount.publicKey,
        escrowSol: escrowSol,
        signer: users[0].publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        exhibitionProgram: Exhibition.programId,
      })
      .transaction();

    transaction = transaction.add(initCarnTx);

    console.log("added tx");
  }

  return transaction;
}

export async function carnivalDepositNft(
  connection: Connection,
  nft: Nft,
  publicKey: PublicKey,
  marketId: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(nft);

  let { carnival, carnivalAuth, carnivalAuthBump } = await getCarnivalAccounts(
    exhibit
  );

  let nftUserTokenAddress = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  if (!(await checkIfAccountExists(nftUserTokenAddress, connection))) {
    console.log("creating user voucher");
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      nftUserTokenAddress,
      publicKey,
      nft.mint
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  console.log("nft arti in actions", nftArtifact.toString());

  let depositTx = await Carnival.methods
    .depositNft(new BN(marketId), carnivalAuthBump)
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAddress,
      nftArtifact: nftArtifact,
      signer: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return transaction.add(depositTx);
}

export async function createCarnivalMarket(
  connection: Connection,
  publicKey: PublicKey,
  nfts: Nft[],
  solAmt: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);
  let Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
    nfts[0]
  );
  console.log("exhibit", exhibit.toString());

  let marketId = 0;
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);

  // make market

  let [market] = await PublicKey.findProgramAddress(
    [
      Buffer.from("market"),
      carnival.toBuffer(),
      new BN(marketId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  if (!(await checkIfAccountExists(market, connection))) {
    console.log("market no exist");
    let initMarketTx = await Carnival.methods
      .createMarket(users[0].publicKey, new BN(marketId), 0, 1, 1)
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        market: market,
        signer: users[0].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(initMarketTx);

    console.log("added tx");
  } else {
    console.log("market exists");
  }

  // deposit sol
  if (solAmt > 0) {
    console.log("in depo sol section");
    console.log("market", market.toString());
    let depoSolTx = await Carnival.methods
      .depositSol(new BN(marketId), new BN(solAmt), carnivalAuthBump)
      .accounts({
        exhibit: exhibit,
        carnival: carnival,
        carnivalAuth: carnivalAuth,
        market: market,
        escrowSol: escrowSol,
        signer: users[0].publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction = transaction.add(depoSolTx);
    console.log("added depo tx");
  }

  let userVoucherWallet = await getAssociatedTokenAddress(
    voucherMint,
    publicKey
  );

  // deposit NFTs
  // for (let nft of nfts) {
  let nft = nfts[0];
  let nftUserTokenAddress = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  if (!(await checkIfAccountExists(userVoucherWallet, connection))) {
    console.log("creating user voucher");
    let userVoucherTx = createAssociatedTokenAccountInstruction(
      publicKey,
      userVoucherWallet,
      publicKey,
      voucherMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    transaction = transaction.add(userVoucherTx);
  } else {
    console.log("user voucher already created");
  }

  let depositNftTx = await Carnival.methods
    .depositNft(new BN(marketId), carnivalAuthBump)
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      voucherMint: voucherMint,
      userVoucherWallet: userVoucherWallet,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAddress,
      nftArtifact: nftArtifact,
      signer: publicKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      exhibitionProgram: Exhibition.programId,
    })
    .transaction();

  transaction = transaction.add(depositNftTx);
  console.log("added depo nft tx");
  // }

  return transaction;
}

export async function closeCarnivalMarket(
  connection: Connection,
  publicKey: PublicKey,
  exhibit: PublicKey,
  solAmt: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let marketId = 0;

  console.log("exhibit", exhibit.toString());
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol, escrowSolBump } =
    await getCarnivalAccounts(exhibit);

  // make market

  let [market] = await PublicKey.findProgramAddress(
    [
      Buffer.from("market"),
      carnival.toBuffer(),
      new BN(marketId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  // withdraw sol
  console.log("in withdraw sol section");
  let withdrawSolTx = await Carnival.methods
    .withdrawSol(
      new BN(marketId),
      new BN(solAmt),
      carnivalAuthBump,
      escrowSolBump
    )
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      market: market,
      escrowSol: escrowSol,
      signer: users[0].publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  transaction = transaction.add(withdrawSolTx);
  console.log("added depo tx");

  // withdraw NFTs
  // for (let nft of nfts) {
  //   transaction = transaction.add(
  //     await carnivalDepositNft(connection, nft, users[0].publicKey, marketId)
  //   );
  // }

  // let closeMarketTx = await Carnival.methods
  //   .closeMarket(users[0].publicKey, new BN(marketId), 0, 1, 1)
  //   .accounts({
  //     exhibit: exhibit,
  //     carnival: carnival,
  //     carnivalAuth: carnivalAuth,
  //     market: market,
  //     signer: users[0].publicKey,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .transaction();

  // transaction = transaction.add(closeMarketTx);

  return transaction;
}
