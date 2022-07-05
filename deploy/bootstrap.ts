import {
  bundlrStorage,
  createCreateMetadataAccountV2InstructionWithSigners,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  TransactionBuilder,
} from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
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
import assert from "assert";

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";

import {
  getProvider,
  getProcessedJsonData,
  getExhibitAddress,
} from "../utils/actions";
import {
  AIRDROP_VALUE,
  creator,
  otherCreators,
  EXHIBITION_PROGRAM_ID,
  user,
} from "../utils/constants";

const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let exhibit, exhibitBump;
let redeemMint;

let mintCollectionCount = 2;
let mintNftCount = 2;
let exhibitMints: PublicKey[][] = Array(mintCollectionCount);

let jsonData = getProcessedJsonData();

let nftUserTokenAccount;
let Exhibition;
const mintNFTs = async () => {
  let provider = await getProvider("http://localhost:8899", creator);
  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let airdropees = [creator, ...otherCreators, ...user];
  for (const dropee of airdropees) {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        dropee.publicKey,
        20 * LAMPORTS_PER_SOL
      ),
      "confirmed"
    );
  }

  console.log("Creating and uploading NFTs...");
  for (let i = 0; i < mintNftCount; i++) {
    exhibitMints[i] = Array(mintNftCount);

    for (let j = 0; j < mintCollectionCount; j++) {
      console.log("loop", i, j);

      let mintKey = await createMint(
        connection,
        otherCreators[i],
        otherCreators[i].publicKey,
        otherCreators[i].publicKey,
        0
      );

      let associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        user[j],
        mintKey,
        user[j].publicKey
      );

      await mintTo(
        connection,
        user[j],
        mintKey,
        associatedTokenAccount.address,
        otherCreators[i],
        1
      );

      const metadata = findMetadataPda(mintKey);
      // console.log(i, j, "json data", jsonData[i][j], mintKey);
      let tx = TransactionBuilder.make().add(
        createCreateMetadataAccountV2InstructionWithSigners({
          data: jsonData[i][j],
          isMutable: false,
          mintAuthority: otherCreators[i],
          payer: otherCreators[i],
          mint: mintKey,
          metadata: metadata,
          updateAuthority: otherCreators[i].publicKey,
        })
      );

      await metaplex.rpc().sendAndConfirmTransaction(tx);

      let tx2 = new Transaction().add(
        createSignMetadataInstruction({
          metadata: metadata,
          creator: otherCreators[i].publicKey,
        })
      );

      await connection.sendTransaction(tx2, [otherCreators[i]]);

      const nft = await metaplex.nfts().findByMint(mintKey);

      exhibitMints[i][j] = mintKey;
    }
  }

  const nft = await metaplex.nfts().findByMint(exhibitMints[0][0]);
  let metadataData = await Metadata.fromAccountAddress(
    connection,
    findMetadataPda(nft.metadataAccount.publicKey)
  );
  assert(metadataData.data.symbol === "APE");
};

const initializeExhibit = async () => {
  let mintKey = exhibitMints[0][0];

  let exhibit = await getExhibitAddress(mintKey, metaplex, connection);
  console.log("exhibit print", exhibit.toString());
  const nft = await metaplex.nfts().findByMint(mintKey);

  let [redeemMint] = await PublicKey.findProgramAddress(
    [Buffer.from("redeem_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  let nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    user[0],
    mintKey,
    user[0].publicKey
  );

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

  let mdata = await Metadata.fromAccountAddress(
    connection,
    findMetadataPda(mintKey)
  );

  console.log("Exhibit 1: ", exhibit.toString());
  assert.ok(
    exhibitInfo.exhibitSymbol === mdata.data.symbol.replace(/\0.*$/g, "")
  );
};

const depositNFT = async () => {};

const bootstrapNetwork = async () => {
  await mintNFTs();
  await initializeExhibit();
};

bootstrapNetwork();
function createSignMetadataInstruction(arg0: {
  metadata: import("@metaplex-foundation/js").Pda;
  creator: PublicKey;
}):
  | Transaction
  | import("@solana/web3.js").TransactionInstruction
  | import("@solana/web3.js").TransactionInstructionCtorFields {
  throw new Error("Function not implemented.");
}
