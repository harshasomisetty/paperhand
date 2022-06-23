import {
  bundlrStorage,
  createCreateMetadataAccountV2InstructionWithSigners,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  TransactionBuilder,
} from '@metaplex-foundation/js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Exhibition } from '../target/types/exhibition';
import { Bazaar } from '../target/types/bazaar';
const fs = require('fs');
const assert = require('assert');
const { SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Exhibition = anchor.workspace.Exhibition as Program<Exhibition>;
const ExhibitionID = new PublicKey(Exhibition.idl['metadata']['address']);

const Bazaar = anchor.workspace.Bazaar as Program<Bazaar>;
const BazaarID = new PublicKey(Bazaar.idl['metadata']['address']);

async function getArtifactData(exhibit: PublicKey, mintKey: PublicKey) {
  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from('nft_artifact'), exhibit.toBuffer(), mintKey.toBuffer()],
    ExhibitionID
  );

  let [artifactMetadata] = await PublicKey.findProgramAddress(
    [
      Buffer.from('artifact_metadata'),
      exhibit.toBuffer(),
      nftArtifact.toBuffer(),
    ],
    ExhibitionID
  );

  return [nftArtifact, artifactMetadata];
}
describe('exhibition', () => {
  /*
    This test suite will involve 2 users, and consist of:
    1) First init a 2 nfts for 2 exhibits.
    2) Init the exhibit with parameters
    3) Have each user insert an NFT into the exhibit
    4) Fail user 1 from inserting an NFT from a wrong collection into this exhibit
    5) Have user 1 use a redeem token to withdraw an NFT
    6) Have user 1 fail to withdraw another NFT
    7) Verify that the exhibit still has 1 NFT, and ensure we can retrieve the NFT metadata
  */

  const creator = Keypair.generate();
  const user = [Keypair.generate(), Keypair.generate()];

  const metaplex = Metaplex.make(provider.connection)
    .use(keypairIdentity(creator))
    .use(bundlrStorage());

  let airdropVal = 20 * LAMPORTS_PER_SOL;

  let colBaseSymbol = 'NC';
  let colRightSymbol = colBaseSymbol + '0';
  let colWrongSymbol = colBaseSymbol + '1';
  let colCurSymbol = colRightSymbol;
  let nftName = 'nft n';

  let exhibit, exhibitBump;
  let redeemMint;

  let mintSize = 2;
  let mintCount = 2;
  let exhibitMints: PublicKey[][] = Array(mintCount);
  let userRedeemWallet = Array(mintCount);

  let nftUserTokenAccount;

  it('Init create and mint exhibits and Metadata', async () => {
    let airdropees = [creator.publicKey, user[0].publicKey, user[1].publicKey];

    console.log('Airdropping...');
    for (const pubkey of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(pubkey, airdropVal),
        'confirmed'
      );
    }

    console.log('Creating and uploading NFTs...');
    for (let i = 0; i < mintCount; i++) {
      exhibitMints[i] = Array(mintSize);

      for (let j = 0; j < mintSize; j++) {
        console.log('loop', i, j);

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
          uri: 'https://arweave.net/123',
          description: 'description of nft number' + j.toString(),
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

        exhibitMints[i][j] = mintKey;
      }
    }

    // Uncomment to print out all nft data.

    // for (let i = 0; i < mintCount; i++) {
    //   for (let j = 0; j < mintSize; j++) {
    //     let mintKey = exhibitMints[i][j];
    //     console.log("mint:", exhibitMints[i][j].toString());

    //     const nft = await metaplex.nfts().findByMint(mintKey);
    //     console.log("nft data ", nft.metadataAccount.publicKey.toString());

    //     let associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    //       connection,
    //       user[j],
    //       mintKey,
    //       user[j].publicKey
    //     );

    //     let accountInfo = await getAccount(
    //       connection,
    //       associatedTokenAccount.address
    //     );

    //     console.log("token bal: ", accountInfo.amount);
    //   }
    // }

    const nft = await metaplex.nfts().findByMint(exhibitMints[0][0]);
    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );
    // Check basic Exhibit information.
    assert(metadataData.data.data.symbol === colBaseSymbol + '0');
    assert(metadataData.data.data.name === nftName + '0');
  });

  it('Initialized exhibit!', async () => {
    [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from('exhibit'),
        Buffer.from(colCurSymbol),
        creator.publicKey.toBuffer(),
      ],
      ExhibitionID
    );

    [redeemMint] = await PublicKey.findProgramAddress(
      [Buffer.from('redeem_mint'), exhibit.toBuffer()],
      ExhibitionID
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
      .initializeExhibit(creator.publicKey, colCurSymbol)
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

    let exhibitInfo = await Exhibition.account.exhibit.fetch(
      exhibit
    );

    assert.ok(exhibitInfo.colSymbol === colCurSymbol);
    assert.ok(
      exhibitInfo.colCreator.toString() === creator.publicKey.toString()
    );
  });

  it('Inserted correct nft into corresponding artifact!', async () => {
    // Prep accounts for depositing first NFT.
    let mintKey = exhibitMints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    let [nftArtifact, artifactMetadata] = await getArtifactData(exhibit, mintKey);

    let tx = await Exhibition.methods
      .artifactInsert(creator.publicKey, colCurSymbol, exhibitBump)
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet[0],
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        artifactMetadata: artifactMetadata,
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
      nftUserTokenAccount.address
    );
    assert.ok(Number(postUserNftTokenBal.amount) == 0);

    let postNftArtifactBal = await getAccount(provider.connection, nftArtifact);
    assert.ok(Number(postNftArtifactBal.amount) == 1);

    let exhibitInfo = await Exhibition.account.exhibit.fetch(
      exhibit
    );
    assert.ok(exhibitInfo.nftCount == 1);

    // Prepare accounts to deposit second nft.

    let mintKey2 = exhibitMints[0][1];

    const nft2 = await metaplex.nfts().findByMint(mintKey2);

    const metadataData2 = await Metadata.load(
      connection,
      nft2.metadataAccount.publicKey
    );

    let nftUserTokenAccount2 = await getOrCreateAssociatedTokenAccount(
      connection,
      user[1],
      mintKey2,
      user[1].publicKey
    );

    let [nftArtifact2, artifactMetadata2] = await getArtifactData(
      exhibit,
      mintKey2
    );

    tx = await Exhibition.methods
      .artifactInsert(creator.publicKey, colCurSymbol, exhibitBump)
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        userRedeemWallet: userRedeemWallet[1],
        nftMint: mintKey2,
        nftMetadata: nft2.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount2.address,
        nftArtifact: nftArtifact2,
        artifactMetadata: artifactMetadata2,
        user: user[1].publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user[1]])
      .rpc();
  });

  it('Blocked inserting wrong nft into artifact!', async () => {
    let mintKey = exhibitMints[1][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    const metadataData = await Metadata.load(
      connection,
      nft.metadataAccount.publicKey
    );

    let [nftArtifact, artifactMetadata] = await getArtifactData(exhibit, mintKey);

    let err;
    try {
      const tx = await Exhibition.methods
        .artifactInsert(creator.publicKey, colCurSymbol, exhibitBump)
        .accounts({
          exhibit: exhibit,
          redeemMint: redeemMint,
          userRedeemWallet: userRedeemWallet[0],
          nftMint: mintKey,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserTokenAccount.address,
          nftArtifact: nftArtifact,
          artifactMetadata: artifactMetadata,
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

    assert.ok(err.error.origin == 'exhibit');
    assert.ok(err.error.errorCode.code == 'ConstraintRaw');
  });

  it('Withdrew from artifact!', async () => {
    let mintKey = exhibitMints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    let [nftArtifact, artifactMetadata] = await getArtifactData(exhibit, mintKey);

    const tx = await Exhibition.methods
      .artifactWithdraw(creator.publicKey, colCurSymbol, exhibitBump)
      .accounts({
        exhibit: exhibit,
        redeemMint: redeemMint,
        user: user[0].publicKey,
        userRedeemWallet: userRedeemWallet[0],
        nftMint: mintKey,
        nftMetadata: nft.metadataAccount.publicKey,
        nftUserToken: nftUserTokenAccount.address,
        nftArtifact: nftArtifact,
        artifactMetadata: artifactMetadata,
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
    assert.ok(Number(postUserRedeemTokenBal.amount) == 0);

    let postUserNftTokenBal = await getAccount(
      provider.connection,
      nftUserTokenAccount.address
    );
    assert.ok(Number(postUserNftTokenBal.amount) == 1);

    assert.ok((await connection.getAccountInfo(nftArtifact)) == null);
  });

  it('Failed withdrawing from artifact from lack of redeem tokens!', async () => {
    let mintKey = exhibitMints[0][0];

    const nft = await metaplex.nfts().findByMint(mintKey);

    let [nftArtifact, artifactMetadata] = await getArtifactData(exhibit, mintKey);

    let err;
    try {
      const tx = await Exhibition.methods
        .artifactWithdraw(creator.publicKey, colCurSymbol, exhibitBump)
        .accounts({
          exhibit: exhibit,
          redeemMint: redeemMint,
          user: user[0].publicKey,
          userRedeemWallet: userRedeemWallet[0],
          nftMint: mintKey,
          nftMetadata: nft.metadataAccount.publicKey,
          nftUserToken: nftUserTokenAccount.address,
          nftArtifact: nftArtifact,
          artifactMetadata: artifactMetadata,
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

    assert.ok(err.error.origin == 'nft_artifact');
    assert.ok(err.error.errorCode.code == 'AccountNotInitialized');
  });

  it('Verified final  details', async () => {
    // Make sure there is only 1 nft left

    let [nftArtifact, artifactMetadata] = await getArtifactData(
      exhibit,
      exhibitMints[0][0]
    );

    let [nftArtifact2, artifactMetadata2] = await getArtifactData(
      exhibit,
      exhibitMints[0][1]
    );

    let allArtifactAccounts = await connection.getTokenAccountsByOwner(
      exhibit,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    let artifactKeys = [];
    allArtifactAccounts.value.forEach((x, i) => artifactKeys.push(x.pubkey));

    let redeemMintInfo = await getMint(connection, redeemMint);

    assert.ok(artifactKeys.length == Number(redeemMintInfo.supply));
    assert.ok(artifactKeys[0].toString() == nftArtifact2.toString());

    let artifactMetadatas = [];

    for (let artifactKey of artifactKeys) {
      let [tempArtifactMetadata] = await PublicKey.findProgramAddress(
        [
          Buffer.from('artifact_metadata'),
          exhibit.toBuffer(),
          artifactKey.toBuffer(),
        ],
        ExhibitionID
      );

      let artifactInfo = await Exhibition.account.artifactMetadata.fetch(
        tempArtifactMetadata
      );
      artifactMetadatas.push(artifactInfo.nftMetadata);
    }

    const actualMetadata1 = findMetadataPda(exhibitMints[0][0]);
    const actualMetadata2 = findMetadataPda(exhibitMints[0][1]);

    assert.ok(artifactMetadatas[0].toString() == actualMetadata2.toString());
  });

  // it("tested bazaar", async () =>
  //   await Bazaar.methods.initialize().rpc()
  // )

  Exhibition.provider.connection.onLogs('all', ({ logs }) => {
    console.log(logs);
  });
});
