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
import { CARNIVAL_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { otherCreators, creator, users } from "../utils/constants";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export async function createCarnival(
  connection: Connection,
  exhibit: PublicKey,
  publicKey: PublicKey
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let transaction = new Transaction();

  console.log("after start tx");

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
        escrowSol: escrowSol,
        signer: users[0].publicKey,
        systemProgram: SystemProgram.programId,
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

  let transaction = new Transaction();

  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    Carnival.programId
  );

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
  exhibit: PublicKey,
  nfts: Nft[],
  solAmt: number
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let transaction = new Transaction();

  console.log("exhibit", exhibit.toString());
  let marketId = 0;
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);

  // make market

  console.log(
    "trying to prit market",
    new BN(marketId).toArrayLike(Buffer, "le", 8)
  );
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

  // deposit NFTs
  // for (let nft of nfts) {
  //   let depositTx = await Carnival.methods
  //     .depositNft(new BN(marketId), carnivalAuthBump)
  //     .accounts({
  //       exhibit: exhibit,
  //       carnival: carnival,
  //       carnivalAuth: carnivalAuth,
  //       nftMint: nft.mint,
  //       nftMetadata: nft.metadataAccount.publicKey,
  //       nftUserToken: nftUserTokenAddress,
  //       nftArtifact: nftArtifact,
  //       signer: publicKey,
  //       systemProgram: SystemProgram.programId,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       rent: SYSVAR_RENT_PUBKEY,
  //     })
  //     .transaction();

  //   transaction = transaction.add();
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
