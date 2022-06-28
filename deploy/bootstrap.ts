import {
  bundlrStorage,
  createCreateMetadataAccountV2InstructionWithSigners,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  TransactionBuilder,
} from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  Account,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
} from "@solana/web3.js";

import getProvider from "../app/src/utils/provider";

const { SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;
const fs = require("fs");
const assert = require("assert");

const bazaar = require("../target/idl/bazaar.json");
const exhibition = require("../target/idl/exhibition.json");

const creator: Keypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync("/Users/harshasomisetty/.config/solana/creator.json")
    )
  )
);

const user: Keypair[] = [
  Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync("/Users/harshasomisetty/.config/solana/user1.json")
      )
    )
  ),
  Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync("/Users/harshasomisetty/.config/solana/user2.json")
      )
    )
  ),
];

const connection = new Connection("http://localhost:8899", "processed");
const BazaarID = new PublicKey(bazaar["metadata"]["address"]);
const ExhibitionID = new PublicKey(exhibition["metadata"]["address"]);

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let airdropVal = 20 * LAMPORTS_PER_SOL;

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

let arweave_urls = [
  "https://arweave.net/70WuipZgUbiibV9_qfDN_2b12-21ocDLU0fn1sS4CPs",
  "https://arweave.net/pQC8oVliOJl1AmxlWpFiQ_VkhWDLFkkRY2fWDgvwUao",
  "https://arweave.net/k9PdPHHKjWEUliBwWBZpYbOG99Fgl8tQa8onI1GCnvA",
  "https://arweave.net/WDKNBqirJVVxa61G8FusAxKDR7P_NBWZVX26A8pCDvU",
  "https://arweave.net/rmdT61h7-vi3W9wzb3_eQMmLU5Yv6aPbBygzvg29ha0",
  "https://arweave.net/THn3kuBgloKL0i0mZavWqBwxShMCG12Gvv3IF2gEHlw",
  "https://arweave.net/ITslXlK-HX1UcJIfYKTpXViksZQJZUOIzcVKHuH6NuM",
  "https://arweave.net/NMigWBU7F1Qf69VHfm6O8vNGkblieqvsMej2abupoy4",
  "https://arweave.net/s30Qhgt-OTBSno49g4_x4ovfHEiUGJO5anltemHfIQ8",
];
const mintNFTs = async () => {
  let airdropees = [creator, ...user];
  for (const dropee of airdropees) {
    await connection.confirmTransaction(
      await connection.requestAirdrop(dropee.publicKey, airdropVal),
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

const bootstrapNetwork = async () => {
  await mintNFTs();
};

bootstrapNetwork();
