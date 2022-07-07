import {
  bundlrStorage,
  BundlrStorageDriver,
  keypairIdentity,
  Metaplex,
  findMetadataPda,
  Nft,
  UploadMetadataInput,
  TokenMetadataProgram,
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
  PublicKey,
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
  mintNumberOfNfts: number,
  mintNumberOfCollections: number,
  metaplex: Metaplex,
  connection: Connection
): Promise<Nft[][]> {
  let uriData = [APE_URIS, BEAR_URIS];
  let nftList: Nft[][] = Array(mintNumberOfCollections);
  console.log("1", uriData[1][0]);
  console.log("Creating and uploading NFTs...");

  for (let i = 0; i < mintNumberOfCollections; i++) {
    // exhibitMints[i] = Array(mintNumberOfNfts);
    nftList[i] = Array(mintNumberOfNfts);

    for (let j = 0; j < mintNumberOfNfts; j++) {
      console.log("minting nft", i, j, "to user", j % 2);
      console.log("URI", uriData[i][j]);

      let { nft } = await metaplex.nfts().create({
        uri: uriData[i][j],
        mintAuthority: otherCreators[i], // other creator[i] created all of collection i
        updateAuthority: otherCreators[i],
        owner: user[j % 2].publicKey, // users alternate ownership of nfts,
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
      console.log("finsihed", i, j);
    }
  }
  console.log("Finished Uploading...");
  return nftList;
}

export async function getOwnedNfts(
  pubkey1: PublicKey,
  metaplex: Metaplex
): Promise<Nft[]> {
  console.log(pubkey1.toString());
  // const mints = await TokenMetadataProgram.metadataV1Accounts(metaplex)
  // .selectMint()
  // .whereCreator(1, pubkey)
  // .getDataAsPublicKeys();

  // console.log(mints);
  console.log("user[0]", user[0].publicKey.toString());
  let myNfts = await metaplex.nfts().findAllByOwner(user[0].publicKey);
  console.log("length", myNfts.length);
  myNfts = await metaplex.nfts().findAllByOwner(user[1].publicKey);
  console.log("length", myNfts.length);
  myNfts = await metaplex.nfts().findAllByOwner(otherCreators[0].publicKey);
  console.log("length", myNfts.length);
  myNfts = await metaplex.nfts().findAllByOwner(otherCreators[1].publicKey);
  console.log("length", myNfts.length);
  return myNfts;
}
