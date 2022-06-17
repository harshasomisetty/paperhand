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
  findMetadataPda,
  TransactionBuilder,
  createCreateMetadataAccountV2InstructionWithSigners,
  createMintAndMintToAssociatedTokenBuilder,
} from "@metaplex-foundation/js";

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

const metaplex = Metaplex.make(provider.connection)
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

  let colBaseSymbol = "NC";
  let colRightSymbol = colBaseSymbol + "0";
  let colWrongSymbol = colBaseSymbol + "1";
  let colCurSymbol = colRightSymbol;
  let nftName = "nft n";

  let collectionPool, collectionBump;
  let redeemMint, redeemTokenBump;
  let userRedeemWallet, user2RedeemWallet;

  let mintSize = 1;
  let mintCount = 1;
  let collection_mints: PublicKey[][] = Array(mintCount);

  it("init variables", async () => {
    let airdropees = [wallet.publicKey, creator.publicKey, user[0].publicKey];
    // , user[1].publicKey
    for (const pubkey of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(pubkey, airdropVal),
        "confirmed"
      );
    }

    for (let i = 0; i < mintCount; i++) {
      collection_mints[i] = Array(mintSize);

      for (let j = 0; j < mintSize; j++) {
        console.log("loop", i, j);

        let mintKey = await createMint(
          connection,
          creator,
          creator.publicKey,
          creator.publicKey,
          0
        );

        const metadata = findMetadataPda(mintKey);

        let jsonData = {
          symbol: colBaseSymbol + i.toString(),
          name: nftName + j.toString(),
          uri: "https://arweave.net/123",
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

        // And send it with confirmation.
        await metaplex.rpc().sendAndConfirmTransaction(tx);

        collection_mints[i][j] = mintKey;
        console.log("created", i, j);
      }
    }

    // print out all nft data
    // for (let i = 0; i < 2; i++) {
    //   for (let j = 0; j < mintSize; j++) {
    //     let mintKey = collection_mints[i][j];
    //     console.log("mint:", collection_mints[i][j].toString());

    //     const nft = await metaplex.nfts().findByMint(mintKey);
    //     console.log("nft data ", nft.metadataAccount.publicKey.toString());

    //     const metadataData = await Metadata.load(
    //       connection,
    //       nft.metadataAccount.publicKey
    //     );

    //     console.log(metadataData.data.data, "\n\n\n");
    //   }
    // }

    let mintKey = collection_mints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    console.log(metadataData.data.data, "\n\n\n");
    assert(metadataData.data.data.symbol === colBaseSymbol + "0");
    assert(metadataData.data.data.name === nftName + "0");
  });

  it("Initialized Pool!", async () => {
    [collectionPool, collectionBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("collection_pool"),
        Buffer.from(colCurSymbol),
        creator.publicKey.toBuffer(),
      ],
      programID
    );

    [redeemMint, redeemTokenBump] = await PublicKey.findProgramAddress(
      [Buffer.from("redeem_mint"), collectionPool.toBuffer()],
      programID
    );

    userRedeemWallet = await getAssociatedTokenAddress(
      redeemMint,
      user[0].publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // user2RedeemWallet = await getAssociatedTokenAddress(
    //   redeemMint,
    //   user[1].publicKey,
    //   false,
    //   TOKEN_PROGRAM_ID,
    //   ASSOCIATED_TOKEN_PROGRAM_ID
    // );

    const tx = await program.methods
      .initializePool(creator.publicKey, colCurSymbol)
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        creator: creator.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
    console.log("Your transaction signature", tx);

    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    // console.log("col id", collectionPoolInfo.collectionId);
    assert.ok(collectionPoolInfo.colSymbol === colCurSymbol);
    assert.ok(
      collectionPoolInfo.colCreator.toString() === creator.publicKey.toString()
    );
  });

  it("Inserted into vault!", async () => {
    let mintKey = collection_mints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    let nftAccount = await getAssociatedTokenAddress(
      mintKey,
      user[0].publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("nft meta", nft.metadataAccount.publicKey.toString());
    console.log("metadataaa", metadataData);
    const tx = await program.methods
      .vaultInsert(creator.publicKey, colCurSymbol, collectionBump)
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet,
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        // nftUserToken: nftAccount,
        user: user[0].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user[0]])
      .rpc();

    let postTokenBal = await getAccount(provider.connection, userRedeemWallet);
    console.log("post bal", Number(postTokenBal.amount));

    assert.ok(Number(postTokenBal.amount) == 1);
  });

  program.provider.connection.onLogs("all", ({logs}) => {
    console.log(logs);
  });
});
