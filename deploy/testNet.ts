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
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AccountInfo,
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

import { getOwnedNfts } from "../utils/createNFTs";
interface Project {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintNumberOfCollections = 2;
let mintNumberOfNfts = 4;
let nftList: Nft[][] = Array(mintNumberOfCollections);

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

  console.log("minting nfts...");
  nftList = await mintNFTs(
    mintNumberOfNfts,
    mintNumberOfCollections,
    metaplex,
    connection
  );
  console.log("minted all nfts!");
}

async function initializeExhibit() {
  let nft = nftList[0][0];
  let [exhibit, redeemMint] = await getExhibitAddress(nft);

  console.log(exhibit.toString());
  try {
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

    console.log("TX?", transaction);
    await sendAndConfirmTransaction(connection, transaction, [creator]);
    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  } catch (error) {
    console.log("sending init exhibit error ", error);
  }
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

  try {
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

    let postNftArtifactBal = await getAccount(connection, nftArtifact);
    console.log("artifact bal", postNftArtifactBal.amount);
  } catch (error) {
    console.log("depositing artifact error", error);
  }

  let postUserRedeemTokenBal = await getAccount(
    connection,
    userRedeemWallet[0]
  );
  console.log(Number(postUserRedeemTokenBal));
  console.log("inserted nft");
}

async function getAllExhibitions() {
  let allExhibitAccounts = await connection.getProgramAccounts(
    EXHIBITION_PROGRAM_ID
  );
  allExhibitAccounts.forEach((key) => {
    console.log("exhibits", key.pubkey.toString());
  });
}

async function getAllNfts() {
  let exhibitAddress = "CrSR2a8nDcTFUoEkmDpdF1TtjuBqcbY73zDARFBD45nM";
  let exhibit = new PublicKey(exhibitAddress);
  let exhibitBal = await connection.getBalance(exhibit);
  if (exhibitBal > 0) {
    console.log("exhibit exists");
    let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

    console.log("exhibit info", exhibitInfo.exhibitSymbol);
    let allArtifactAccounts: Project[] = (
      await connection.getTokenAccountsByOwner(exhibit, {
        programId: TOKEN_PROGRAM_ID,
      })
    ).value;

    let artifactMints = [];
    for (let i = 0; i < allArtifactAccounts.length; i++) {
      let key = allArtifactAccounts[i].pubkey;

      let tokenAccount = await getAccount(connection, key);
      artifactMints.push(tokenAccount.mint);
    }

    console.log("setting nfts");
    let allNFTs = await metaplex.nfts().findAllByMintList(artifactMints);
    console.log(allNFTs.length);
  }
}
// getAllExhibitions();
async function fullFlow() {
  await airdropAndMint();
  await initializeExhibit();
  await insertNft();
  await getAllNfts();
}
fullFlow();

async function printAdds() {
  console.log(creator.publicKey.toString());
  console.log("user 1", user[0].publicKey.toString());
  console.log("user 2", user[1].publicKey.toString());
  console.log("other creator 1", otherCreators[0].publicKey.toString());
  console.log("other creator 2", otherCreators[1].publicKey.toString());
}

// printAdds();

// getOwnedNfts(
//   new PublicKey("BAxBxozdGCQcGMrK31fKpGRGf69Uk7ipE3JpzYsvHuUZ"),
//   metaplex
// );

async function printRedeemTokenBal() {
  let exhibit = new PublicKey("CrSR2a8nDcTFUoEkmDpdF1TtjuBqcbY73zDARFBD45nM");
  let [redeemMint] = await PublicKey.findProgramAddress(
    [Buffer.from("redeem_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let userRedeemWallet = await getAssociatedTokenAddress(
    redeemMint,
    user[0].publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  let postUserRedeemTokenBal = await getAccount(connection, userRedeemWallet);
  console.log("redeem bal", Number(postUserRedeemTokenBal.amount));
}

// printRedeemTokenBal();
