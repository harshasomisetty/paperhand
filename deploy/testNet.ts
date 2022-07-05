import { mintNFTs } from "../utils/createNFTs";

import {
  bundlrStorage,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  BundlrStorageDriver,
  Nft,
} from "@metaplex-foundation/js";
import { Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  creator,
  otherCreators,
  user,
  EXHIBITION_PROGRAM_ID,
} from "../utils/constants";
import {
  getExhibitAddress,
  getProvider,
  getUserRedeemWallets,
  initAssociatedAddressIfNeeded,
} from "../utils/actions";

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintCollectionCount = 1;
let mintNftCount = 1;
let nftList: Nft[][] = Array(mintCollectionCount);

let Exhibition;
async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);
  console.log("Prog id", EXHIBITION_PROGRAM_ID.toString());
  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  let airdropees = [creator, ...otherCreators, ...user];
  for (const dropee of airdropees) {
    await connection.confirmTransaction(
      await connection.requestAirdrop(dropee.publicKey, 20 * LAMPORTS_PER_SOL),
      "confirmed"
    );
  }

  console.log("minting nfts");
  nftList = await mintNFTs(
    mintNftCount,
    mintCollectionCount,
    metaplex,
    connection
  );
  console.log("minted!");
}

async function initializeExhibit() {
  let nft = nftList[0][0];
  let [exhibit, redeemMint] = await getExhibitAddress(nft);

  console.log(exhibit.toString());
  const tx = await Exhibition.methods
    .initializeExhibit()
    .accounts({
      exhibit: exhibit,
      redeemMint: redeemMint,
      nftMetadata: nft.metadataAccount.publicKey,
      creator: creator.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(tx);

  console.log(transaction);
  await sendAndConfirmTransaction(connection, transaction, [creator]);
  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  console.log("initialized exhibit!");
}

async function insertNft() {
  let nft = nftList[0][0];
  let [exhibit, redeemMint] = await getExhibitAddress(nft);

  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userRedeemWallet = await getUserRedeemWallets(redeemMint, user);
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
}
async function fullFlow() {
  await airdropAndMint();
  await initializeExhibit();
  await insertNft();
}
fullFlow();

// async function getAllExhibitions() {
//   let allExhibitAccounts = await connection.getProgramAccounts(
//     EXHIBITION_PROGRAM_ID
//   );
//   allExhibitAccounts.forEach((key) => {
//     console.log("exhibits", key.pubkey.toString());
//   });
// }

// getAllExhibitions();
