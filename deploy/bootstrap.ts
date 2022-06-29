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
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import assert from "assert";

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";

import { getProvider } from "../utils/actions";
import {
  AIRDROP_VALUE,
  creator,
  EXHIBITION_PROGRAM_ID,
  user,
} from "../utils/constants";

const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let exhibitBaseSymbol = "NC";
let exhibitRightSymbol = exhibitBaseSymbol + "0";
let exhibitWrongSymbol = exhibitBaseSymbol + "1";
let exhibitCurSymbol = exhibitRightSymbol;
let nftName = "nft n";

let exhibit, exhibitBump;
let redeemMint;

let mintSize = 2;
let mintCount = 2;
let exhibitMints: PublicKey[][] = Array(mintCount);
let userRedeemWallet = Array(mintCount);

let nftUserTokenAccount;
let Exhibition;
const mintNFTs = async () => {
  let provider = await getProvider("http://localhost:8899", creator);
  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);

  let airdropees = [creator, ...user];
  for (const dropee of airdropees) {
    await connection.confirmTransaction(
      await connection.requestAirdrop(dropee.publicKey, AIRDROP_VALUE),
      "confirmed"
    );
  }
  for (let i = 0; i < mintCount; i++) {
    exhibitMints[i] = Array(mintSize);

    for (let j = 0; j < mintSize; j++) {
      console.log("loop", i, j);

      let bal = await connection.getBalance(creator.publicKey);
      let mintKey = await createMint(
        connection,
        creator,
        creator.publicKey,
        creator.publicKey,
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
        creator,
        1
      );

      const metadata = findMetadataPda(mintKey);

      let jsonData = {
        symbol: exhibitBaseSymbol + i.toString(),
        name: nftName + j.toString(),
        uri: arweave_urls[i * mintCount + j],
        description: "description of nft number" + j.toString(),
        creators: [
          {
            address: creator.publicKey,
            share: 100,
            verified: false,
          },
        ],
        sellerFeeBasisPoints: 500,
        collection: null,
        uses: null,
      };

      const tx = TransactionBuilder.make().add(
        createCreateMetadataAccountV2InstructionWithSigners({
          data: jsonData,
          isMutable: false,
          mintAuthority: creator,
          payer: creator,
          mint: mintKey,
          metadata: metadata,
          updateAuthority: creator.publicKey,
        })
      );

      await metaplex.rpc().sendAndConfirmTransaction(tx);

      exhibitMints[i][j] = mintKey;
    }
  }

  const nft = await metaplex.nfts().findByMint(exhibitMints[0][0]);
  const metadataData = await Metadata.load(
    connection,
    nft.metadataAccount.publicKey
  );
  assert(metadataData.data.data.symbol === exhibitBaseSymbol + "0");
  assert(metadataData.data.data.name === nftName + "0");
};

const initializeExhibit = async () => {
  [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("exhibit"),
      Buffer.from(exhibitCurSymbol),
      creator.publicKey.toBuffer(),
    ],
    EXHIBITION_PROGRAM_ID
  );

  [redeemMint] = await PublicKey.findProgramAddress(
    [Buffer.from("redeem_mint"), exhibit.toBuffer()],
    EXHIBITION_PROGRAM_ID
  );

  userRedeemWallet[0] = await getAssociatedTokenAddress(
    redeemMint,
    user[0].publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  userRedeemWallet[1] = await getAssociatedTokenAddress(
    redeemMint,
    user[1].publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  nftUserTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    user[0],
    exhibitMints[0][0],
    user[0].publicKey
  );

  const tx = await Exhibition.methods
    .initializeExhibit(creator.publicKey, exhibitCurSymbol)
    .accounts({
      exhibit: exhibit,
      redeemMint: redeemMint,
      creator: creator.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc();

  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

  assert.ok(exhibitInfo.exhibitSymbol === exhibitCurSymbol);
  assert.ok(
    exhibitInfo.exhibitCreator.toString() === creator.publicKey.toString()
  );
};

const depositNFT = async () => {};

const bootstrapNetwork = async () => {
  await mintNFTs();
  await initializeExhibit();
};

bootstrapNetwork();
