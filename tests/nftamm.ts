import * as anchor from "@project-serum/anchor";
import {Program} from "@project-serum/anchor";
import {Nftamm} from "../target/types/nftamm";
import {PublicKey, LAMPORTS_PER_SOL, Keypair, getToken} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createMint,
  createAccount,
  mintTo,
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
const {SystemProgram, SYSVAR_RENT_PUBKEY} = anchor.web3;
import {Metadata} from "@metaplex-foundation/mpl-token-metadata";

const fs = require("fs");

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
console.log(program.idl);
const programID = new PublicKey(program.idl["metadata"]["address"]);

function bro(pubkey: PublicKey) {
  console.log(pubkey);
}

async function getVaultData(collectionPool: PublicKey, mintKey: PublicKey) {
  let [nftVault] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_vault"), collectionPool.toBuffer(), mintKey.toBuffer()],
    programID
  );

  let [vaultMetadata] = await PublicKey.findProgramAddress(
    [
      Buffer.from("vault_metadata"),
      collectionPool.toBuffer(),
      nftVault.toBuffer(),
    ],
    programID
  );

  return [nftVault, vaultMetadata];
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

  let mintSize = 2;
  let mintCount = 2;
  let collectionMints: PublicKey[][] = Array(mintCount);
  let userRedeemWallet = Array(mintCount);
  it("Init create and mint collections and Metadata", async () => {
    let airdropees = [
      wallet.publicKey,
      creator.publicKey,
      user[0].publicKey,
      user[1].publicKey,
    ];

    for (const pubkey of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(pubkey, airdropVal),
        "confirmed"
      );
    }

    for (let i = 0; i < mintCount; i++) {
      collectionMints[i] = Array(mintSize);

      for (let j = 0; j < mintSize; j++) {
        console.log("loop", i, j);

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

        collectionMints[i][j] = mintKey;
        console.log("created", i, j);
      }
    }

    // print out all nft data

    for (let i = 0; i < mintCount; i++) {
      for (let j = 0; j < mintSize; j++) {
        let mintKey = collectionMints[i][j];
        console.log("mint:", collectionMints[i][j].toString());

        const nft = await metaplex.nfts().findByMint(mintKey);
        console.log("nft data ", nft.metadataAccount.publicKey.toString());

        let associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          user[j],
          mintKey,
          user[j].publicKey
        );

        let accountInfo = await getAccount(
          connection,
          associatedTokenAccount.address
        );

        console.log("token bal: ", accountInfo.amount);
      }
    }

    let mintKey = collectionMints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    assert(metadataData.data.data.symbol === colBaseSymbol + "0");
    assert(metadataData.data.data.name === nftName + "0");
  });

  it("Initialized collection pool!", async () => {
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

    try {
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
    } catch (error) {
      console.log("fuck init pool", error);
    }

    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    assert.ok(collectionPoolInfo.colSymbol === colCurSymbol);
    assert.ok(
      collectionPoolInfo.colCreator.toString() === creator.publicKey.toString()
    );
  });

  it("Inserted correct nft into corresponding vault!", async () => {
    let mintKey = collectionMints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    console.log(metadataData);

    let nftUserToken = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    let [nftVault, vaultMetadata] = await getVaultData(collectionPool, mintKey);

    let tx = await program.methods
      .vaultInsert(
        creator.publicKey,
        colCurSymbol,
        collectionPoolInfo.nftCount,
        collectionBump
      )
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet[0],
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserToken.address,
        nftVault: nftVault,
        vaultMetadata: vaultMetadata,
        user: user[0].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user[0]])
      .rpc();

    let postUserRedeemTokenBal = await getAccount(
      provider.connection,
      userRedeemWallet[0]
    );
    assert.ok(Number(postUserRedeemTokenBal.amount) == 1);

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserToken.address
    );
    assert.ok(Number(postUserNftTokenBal.amount) == 0);

    let postNftVaultBal = await getAccount(provider.connection, nftVault);
    assert.ok(Number(postNftVaultBal.amount) == 1);

    collectionPoolInfo = await program.account.collectionPool.fetch(
      collectionPool
    );
    assert.ok(collectionPoolInfo.nftCount == 1);

    // depositing second nft

    let mintKey2 = collectionMints[0][1];

    const nft2 = await metaplex.nfts().findByMint(mintKey2);

    const metadataData2 = await Metadata.load(
      connection,
      nft2.metadataAccount.publicKey
    );

    console.log(metadataData2);

    let nftUserToken2 = await getOrCreateAssociatedTokenAccount(
      connection,
      user[1],
      mintKey2,
      user[1].publicKey
    );

    let [nftVault2, vaultMetadata2] = await getVaultData(
      collectionPool,
      mintKey2
    );

    tx = await program.methods
      .vaultInsert(
        creator.publicKey,
        colCurSymbol,
        collectionPoolInfo.nftCount,
        collectionBump
      )
      .accounts({
        collectionPool: collectionPool,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet[1],
        nftMint: mintKey2,
        nftMetadata: nft2.metadataAccount.publicKey,
        nftUserToken: nftUserToken2.address,
        nftVault: nftVault2,
        vaultMetadata: vaultMetadata2,
        user: user[1].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user[1]])
      .rpc();
  });

  it("Blocked inserting wrong nft into vault!", async () => {
    let mintKey = collectionMints[1][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    let nftUserToken = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    let [nftVault, vaultMetadata] = await getVaultData(collectionPool, mintKey);

    let err;
    try {
      const tx = await program.methods
        .vaultInsert(
          creator.publicKey,
          colCurSymbol,
          collectionPoolInfo.nftCount,
          collectionBump
        )
        .accounts({
          collectionPool: collectionPool,
          redeemMint: redeemMint,
          userRedeemWallet: userRedeemWallet[0],
          nftMint: mintKey,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserToken.address,
          nftVault: nftVault,
          vaultMetadata: vaultMetadata,
          user: user[0].publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      err = error;
    }

    assert.ok(err.error.origin == "collection_pool");

    assert.ok(err.error.errorCode.code == "ConstraintRaw");
  });

  it("Withdrew from vault!", async () => {
    let mintKey = collectionMints[0][0];

    let nftUserToken = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    const nft = await metaplex.nfts().findByMint(mintKey);

    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    let [nftVault, vaultMetadata] = await getVaultData(collectionPool, mintKey);

    try {
      const tx = await program.methods
        .vaultWithdraw(creator.publicKey, colCurSymbol, 0, collectionBump)
        .accounts({
          collectionPool: collectionPool,
          redeemMint: redeemMint,
          user: user[0].publicKey,
          userRedeemWallet: userRedeemWallet[0],
          nftMint: mintKey,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserToken.address,
          nftVault: nftVault,
          vaultMetadata: vaultMetadata,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      console.log("withdraw", error);
    }
    let postUserRedeemTokenBal = await getAccount(
      provider.connection,
      userRedeemWallet[0]
    );
    assert.ok(Number(postUserRedeemTokenBal.amount) == 0);

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserToken.address
    );
    assert.ok(Number(postUserNftTokenBal.amount) == 1);

    assert.ok((await connection.getAccountInfo(nftVault)) == null);
  });

  it("Failed withdrawing from vault from lack of redeem tokens!", async () => {
    let mintKey = collectionMints[0][0];

    let nftUserToken = await getOrCreateAssociatedTokenAccount(
      connection,
      user[0],
      mintKey,
      user[0].publicKey
    );

    const nft = await metaplex.nfts().findByMint(mintKey);

    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    let [nftVault, vaultMetadata] = await getVaultData(collectionPool, mintKey);

    let err;
    try {
      const tx = await program.methods
        .vaultWithdraw(creator.publicKey, colCurSymbol, 0, collectionBump)
        .accounts({
          collectionPool: collectionPool,
          redeemMint: redeemMint,
          user: user[0].publicKey,
          userRedeemWallet: userRedeemWallet[0],
          nftMint: mintKey,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserToken.address,
          nftVault: nftVault,
          vaultMetadata: vaultMetadata,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user[0]])
        .rpc();
    } catch (error) {
      err = error;
    }

    // console.log("bro", err.error.origin, err.error.errorCode);

    assert.ok(err.error.origin == "nft_vault");
    assert.ok(err.error.errorCode.code == "AccountNotInitialized");
  });

  it("Verified final pool details", async () => {
    // make sure there is only 1 nft left
    let collectionPoolInfo: program.account.collectionPool =
      await program.account.collectionPool.fetch(collectionPool);

    let [nftVault, vaultMetadata] = await getVaultData(
      collectionPool,
      collectionMints[0][0]
    );

    let [nftVault2, vaultMetadata2] = await getVaultData(
      collectionPool,
      collectionMints[0][1]
    );

    let allVaultAccounts = await connection.getTokenAccountsByOwner(
      collectionPool,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    let vaultKeys = [];
    allVaultAccounts.value.forEach((x, i) => vaultKeys.push(x.pubkey));

    console.log("vaults", nftVault.toString(), nftVault2.toString());

    let redeemMintInfo = await getMint(connection, redeemMint);

    console.log(redeemMintInfo);
    assert.ok(vaultKeys.length == Number(redeemMintInfo.supply));
    assert.ok(vaultKeys[0].toString() == nftVault2.toString());

    let vaultMetadatas = [];

    for (let vaultKey of vaultKeys) {
      let [tempVaultMetadata] = await PublicKey.findProgramAddress(
        [
          Buffer.from("vault_metadata"),
          collectionPool.toBuffer(),
          vaultKey.toBuffer(),
        ],
        programID
      );

      let vaultInfo = await program.account.vaultMetadata.fetch(
        tempVaultMetadata
      );
      vaultMetadatas.push(vaultInfo.nftMetadata);
    }

    console.log("vault metas", vaultMetadatas);

    const actualMetadata1 = findMetadataPda(collectionMints[0][0]);
    const actualMetadata2 = findMetadataPda(collectionMints[0][1]);

    console.log("actual metas", actualMetadata1, actualMetadata2);

    assert.ok(vaultMetadatas[0].toString() == actualMetadata2.toString());
  });

  program.provider.connection.onLogs("all", ({logs}) => {
    console.log(logs);
  });
});
