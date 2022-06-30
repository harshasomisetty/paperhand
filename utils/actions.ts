import {
  bundlrStorage,
  createCreateMetadataAccountV2InstructionWithSigners,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
  TransactionBuilder,
  BundlrStorageDriver,
  UploadMetadataInput,
  CreateNftInput,
} from "@metaplex-foundation/js";
import {
  Metadata,
  createSignMetadataInstruction,
  DataV2,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Signer,
  Connection,
} from "@solana/web3.js";

import {
  Program,
  Provider,
  AnchorProvider,
  web3,
  Wallet,
} from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
const opts = {
  commitment: "confirmed",
  skipPreflight: true,
};
import {
  APE_SYMBOL,
  BEAR_SYMBOL,
  APE_URLS,
  BEAR_URLS,
  APE_URIS,
  BEAR_URIS,
} from "./constants";
import { creator, otherCreators } from "./constants";

export async function initAssociatedAddressIfNeeded(
  connection: Connection,
  wallet: PublicKey,
  mint: PublicKey,
  signer: Signer
) {
  let bal = await connection.getBalance(wallet);
  if (bal == 0) {
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        signer.publicKey,
        wallet,
        signer.publicKey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [signer]);
  }
}

export async function getProvider(network: String, payer: Keypair) {
  /* create the provider and return it to the caller */
  /* network set to local network for now */

  let network_url = "http://localhost:8899";
  if (network === "localhost") {
    network_url = "http://localhost:8899";
  } else if (network === "devnet") {
    network_url = "https://api.devnet.solana.com";
  }

  const connection = new Connection(network_url, "confirmed");

  const provider: Provider = new AnchorProvider(
    connection,
    new NodeWallet(payer),
    {
      commitment: "confirmed",
      skipPreflight: true,
    }
  );
  await connection.requestAirdrop(payer.publicKey, 100e9);
  return provider;
}

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
        address: creator.publicKey,
        share: 50,
        verified: false,
      },
      {
        address: otherCreator.publicKey,
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

export function getProcessedJsonData(): DataV2[][] {
  let apeJsonData = getNftJsonDataArray(
    APE_URLS,
    APE_SYMBOL,
    creator,
    otherCreators[0]
  );
  apeJsonData.forEach((element, index) => {
    let temp = apeJsonData[index];
    temp["uri"] = APE_URIS[index];
    apeJsonData[index] = temp;
  });
  let bearJsonData = getNftJsonDataArray(
    BEAR_URLS,
    BEAR_SYMBOL,
    creator,
    otherCreators[1]
  );
  bearJsonData.forEach((element, index) => {
    let temp = bearJsonData[index];
    temp["uri"] = APE_URIS[index];
    bearJsonData[index] = temp;
  });
  return [apeJsonData, bearJsonData];
}

getProcessedJsonData();
