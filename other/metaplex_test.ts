import {Keypair, PublicKey, Connection, clusterApiUrl} from "@solana/web3.js";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {
  Metaplex,
  bundlrStorage,
  keypairIdentity,
  findMetadataPda,
  createCreateMetadataAccountV2InstructionWithSigners,
  createMintAndMintToAssociatedTokenBuilder,
  TransactionBuilder,
} from "@metaplex-foundation/js";

import {validateMetadata} from "../cli/src/commands/mint-nft";
import {Metadata} from "@metaplex-foundation/mpl-token-metadata";

const buffer_1 = require("buffer");
const path = require("path");
const fs = require("fs");

// const connection = new Connection(clusterApiUrl("devnet"));
const connection = new Connection("http://localhost:8899");

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

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const METADATA_PROGRAM_ID: PublicKey = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const findAssociatedTokenAddress = async (
  walletAddress: PublicKey,
  pubkey: PublicKey
) => {
  // let mdataPubkey = await Metadata.getPDA(pubkey);
  // const metadata = await Metadata.load(connection, mdataPubkey);

  // console.log(metadata);

  console.log(wallet.publicKey.toString());

  const mint = new PublicKey("5PUiRBPcucf7hUWyRr47A6QqxVq1Adc7y6iqUhcJDtAn");

  // const nft = await metaplex.nfts().findByMint(mint);
  const {nft} = await metaplex.nfts().create({
    symbol: "NC1",
    name: "nc name",
    uri: "",
  });

  console.log(nft);
  // if (metadata) {
  //   // We have a valid Metadata account. Try and pull edition data.

  //   const metadataJSON = await getMetaDataJSON(
  //     pubkey.toString(),
  //     metadata.data
  //   );
  //   // nftData = {
  //   //   metadata: metadata.data,
  //   //   json: metadataJSON,
  //   //   editionInfo,
  //   // };
  // }
  // }

  // let info = await connection.getParsedAccountInfo(key);
  // console.log(info.data);
};

// run();
const test = async () => {
  const mint = new PublicKey("7iA22D5niW1t5cpHZiESUYRjnFvi3y4JLoM1G2g9pLro");
  // const lamports = 0.001;

  const metadata = findMetadataPda(mint);

  let i = 0;
  let j = 1;

  // const {uri} = await metaplex
  // .nfts()
  // .uploadMetadata({name: "nft " + j.toString()});

  let jsonData = {
    symbol: "NC" + i.toString(),
    name: "nft " + j.toString(),
    uri: "https://arweave.net/123",
    description: "nft number" + j.toString(),
    creators: [
      {
        address: wallet.publicKey,
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
      mintAuthority: wallet,
      payer: wallet,
      mint: mint,
      metadata: metadata,
      updateAuthority: wallet.publicKey,
    })
  );

  // And send it with confirmation.
  await metaplex.rpc().sendAndConfirmTransaction(tx);

  // Then the transaction succeeded and the NFT was created.
  const nft = await metaplex.nfts().findByMint(mint);

  // const {nft} = await metaplex.nfts().create({
  //   name: "bro",
  //   uri: "https://arweave.net/123",
  // });

  console.log("mint", nft.mint.toString());
  console.log("nft data ", nft.metadataAccount.publicKey.toString());

  // let mdataPubkey = await Metadata.getPDA(nft.metadataAccount.publicKey);
  const metadataData = await Metadata.load(
    connection,
    nft.metadataAccount.publicKey
  );

  console.log(metadataData);
  console.log(metadataData.data.data.creators);
};
// findAssociatedTokenAddress(
//   new PublicKey("HeWEk9qKFeNLpNnZbuDmyrCEpqnRDaBawdnfnY3fjFaV"),
//   // new PublicKey("8aTYTw4KHvCBe1zYe81fPaCr1Yk4NJ2L2tZwxftypxJF")
//   new PublicKey("CWGGCxakLrSoZyZZib53wvubnMjtPxSUDzZ3Vk1vhgph")
// );

test();
