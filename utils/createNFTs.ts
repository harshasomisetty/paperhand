import {
  bundlrStorage,
  BundlrStorageDriver,
  keypairIdentity,
  Metaplex,
  findMetadataPda,
  Nft,
  UploadMetadataInput,
} from "@metaplex-foundation/js";
import {
  Metadata,
  createSignMetadataInstruction,
  DataV2,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import {
  APE_SYMBOL,
  APE_URIS,
  APE_URLS,
  BEAR_SYMBOL,
  BEAR_URIS,
  BEAR_URLS,
} from "./constants";

import { creator, otherCreators, user } from "./constants";

export function nftJsonFormat(
  image: string,
  symbol: string,
  ind: number,
  creator: Keypair,
  otherCreator: Keypair
): UploadMetadataInput {
  return {
    symbol: symbol,
    name: symbol + ind.toString(),
    image: image,
    description: symbol + " nft " + ind.toString(),
    creators: [
      {
        address: otherCreator.publicKey,
        share: 50,
        verified: true,
      },
      {
        address: creator.publicKey,
        share: 50,
        verified: false,
      },
    ],
    sellerFeeBasisPoints: 500,
    collection: null,
    uses: null,
  };
}
export function getNftJsonDataArray(
  images: string[],
  symbol: string,
  creator: Keypair,
  otherCreator: Keypair
) {
  let jsonData: UploadMetadataInput[] = [];

  images.forEach((image, ind) => {
    jsonData.push(nftJsonFormat(image, symbol, ind, creator, otherCreator));
  });

  return jsonData;
}

export async function uploadNfts(
  images: string[],
  symbol: string,
  creator: Keypair,
  otherCreator: Keypair
) {
  const connection = new Connection("https://api.devnet.solana.com");

  const metaplex = Metaplex.make(connection).use(keypairIdentity(creator));

  metaplex.use(
    bundlrStorage({
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
      timeout: 60000,
    })
  );

  console.log("airdropping devnet");
  await connection.confirmTransaction(
    await connection.requestAirdrop(
      metaplex.identity().publicKey,
      1 * LAMPORTS_PER_SOL
    ),
    "confirmed"
  );
  let bundlrDriver = metaplex.storage().driver() as BundlrStorageDriver;
  (await bundlrDriver.bundlr()).fund(1000000);

  console.log("funded bundler");
  let jsonData = getNftJsonDataArray(images, symbol, creator, otherCreator);
  let newJsonData = [];

  for (let i = 0; i < images.length; i++) {
    console.log("uploading", i);
    let { uri } = await metaplex.nfts().uploadMetadata(jsonData[i]);
    newJsonData.push(uri);
    console.log(uri);
  }

  console.log('["' + newJsonData.join('","'), '"]');
}

const uploadAllNfts = async () => {
  await uploadNfts(APE_URLS, APE_SYMBOL, otherCreators[0], creator);
  await uploadNfts(BEAR_URLS, BEAR_SYMBOL, otherCreators[1], creator);
};

// uploadAllNfts();

export async function mintNFTs(
  mintNftCount: number,
  mintCollectionCount: number,
  metaplex: Metaplex,
  connection: Connection
) {
  let uriData = [APE_URIS, BEAR_URIS];
  let nftList: Nft[][] = Array(mintCollectionCount);
  console.log("Creating and uploading NFTs...");
  for (let i = 0; i < mintNftCount; i++) {
    // exhibitMints[i] = Array(mintNftCount);
    nftList[i] = Array(mintNftCount);

    for (let j = 0; j < mintCollectionCount; j++) {
      console.log("minting nft", i, j);

      let { nft } = await metaplex.nfts().create({
        uri: uriData[i][j],
        mintAuthority: otherCreators[i],
        updateAuthority: otherCreators[i],
        owner: user[j].publicKey,
        payer: otherCreators[i],
        creators: [
          {
            address: otherCreators[i].publicKey,
            share: 50,
            verified: true,
          },
          {
            address: creator.publicKey,
            share: 50,
            verified: false,
          },
        ],
      });

      const metadata = findMetadataPda(nft.mint);
      let tx2 = new Transaction().add(
        createSignMetadataInstruction({
          metadata: metadata,
          creator: otherCreators[i].publicKey,
        })
      );

      await connection.sendTransaction(tx2, [otherCreators[i]]);

      nftList[i][j] = nft;
    }
  }

  return nftList;
}
