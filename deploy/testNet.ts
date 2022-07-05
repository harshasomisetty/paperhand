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
import { getExhibitAddress, getProvider } from "../utils/actions";

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintCollectionCount = 2;
let mintNftCount = 2;
let nftList: Nft[][] = Array(mintCollectionCount);

let Exhibition;
async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);
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

  let tx = await Exhibition.methods
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
    .signers([creator])
    .rpc();

  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  console.log("initialized exhibit!");
}

async function fullFlow() {
  await airdropAndMint();
  await initializeExhibit();
}

fullFlow();
