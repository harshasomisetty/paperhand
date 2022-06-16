import * as anchor from "@project-serum/anchor";
import {Program} from "@project-serum/anchor";
import {Nftamm} from "../target/types/nftamm";
import {PublicKey, LAMPORTS_PER_SOL, Keypair} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getAssociatedTokenAddress,
  getAccount,
  createMint,
  createAccount,
} from "@solana/spl-token";

import {
  DataV2,
  Collection,
  Uses,
  VerifyCollection,
  CreateMetadataV2,
  CreateMasterEditionV3,
  UpdateMetadataV2,
  SetAndVerifyCollectionCollection,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  Metaplex,
  bundlrStorage,
  keypairIdentity,
} from "@metaplex-foundation/js";

// import {sendTransactionWithRetryWithKeypair} from "../cli/src/helpers/transactions";
// import {
//   createMetadataAccount,
//   validateMetadata,
// } from "../cli/src/commands/mint-nft";

// import {getMetadata} from "../cli/src/helpers/accounts";

import {Metadata} from "@metaplex-foundation/mpl-token-metadata";

const fs = require("fs");
const {SystemProgram, SYSVAR_RENT_PUBKEY} = anchor.web3;
const assert = require("assert");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const connection = provider.connection;

const wallet = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync("/Users/harshasomisetty/.config/solana/devnet2.json")
    )
  )
);

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(wallet))
  .use(bundlrStorage());

const program = anchor.workspace.Nftamm as Program<Nftamm>;
const programID = new PublicKey(program.idl["metadata"]["address"]);

function bro(pubkey: PublicKey) {
  console.log(pubkey);
}
describe("nftamm", () => {
  /*
    This test suite will test the process of:
    1) Creating a pool
    - will airdrop creator and users sol, will instantiate 2 mock collections
    2) Inserting valid and invalid nfts into the pool
    3) Withdrawing nfts given a user has and doesn't have a redeem token
    TODO 
    4) Swapping
   */

  const creator = Keypair.generate();
  const user = [Keypair.generate(), Keypair.generate()];

  let airdropVal = 20 * LAMPORTS_PER_SOL;

  let collectionId = "test";

  let collectionPool, collectionBump;
  let redeemMint, redeemTokenBump;
  let userRedeemWallet, user2RedeemWallet;

  let mintSize = 3;
  let collection_mints: PublicKey[][] = Array(2);

  it("init variables", async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(wallet.publicKey, airdropVal),
      "confirmed"
    );
    const {nft} = await metaplex.nfts().create({
      symbol: "NC1",
      uri: "https://arweave.net/123",
    });

    console.log("mint", nft.mint.toString());
    console.log("nft data ", nft.metadataAccount.publicKey.toString());

    // let mdataPubkey = await Metadata.getPDA(nft.metadataAccount.publicKey);
    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    console.log(metadataData);
    console.log(metadataData.data.data.creators);
  });

  program.provider.connection.onLogs("all", ({logs}) => {
    console.log(logs);
  });
});
