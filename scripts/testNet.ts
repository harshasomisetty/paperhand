import { mintNFTs } from "../utils/createNFTs";

import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";
import { Program } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AccountInfo,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  creator,
  otherCreators,
  user,
  EXHIBITION_PROGRAM_ID,
  SHOP_PROGRAM_ID,
} from "../utils/constants";
import { getProvider } from "../utils/actions";
import { getVoucherAddress } from "../utils/accountDerivation";

interface Project {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
}

import { Exhibition, IDL as EXHIBITION_IDL } from "../target/types/exhibition";
import { Shop, IDL as SHOP_IDL } from "../target/types/shop";
import {
  initializeSwap,
  insertNft,
  instructionDepositLiquidity,
} from "./nftamm_script";
const connection = new Connection("http://localhost:8899", "processed");

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(creator))
  .use(bundlrStorage());

let mintNumberOfCollections = 2;
let mintNumberOfNfts = 10;
let nftList: Nft[][] = Array(mintNumberOfCollections);

let Exhibition;
let Shop;

let nft;
let nft2;
let nft3;
let exhibit, voucherMint;
//voucher wallets for both users
let userVoucherWallet;
// nft token account
let nftUserTokenAccount;

// market pda
let marketAuth;
let authBump;

// swap init amounts
let initAmounts = [2, 6];
let liqAmounts = [1];
let swapAmount = [1];
// mint accounts, 0 is liquidity, array to be able to copy over code
let tokenMints = new Array(1);
// shop's token accounts, 0 is voucher account, 1 is sol account, 2 is
let marketTokens = new Array(2);
// user 0's tokens, token 0 is liquidity account, token 1 is voucher account
let userTokens = new Array(2);

export async function airdropAndMint() {
  let provider = await getProvider("http://localhost:8899", creator);
  console.log("Prog id", EXHIBITION_PROGRAM_ID.toString());
  Exhibition = new Program(EXHIBITION_IDL, EXHIBITION_PROGRAM_ID, provider);
  Shop = new Program(SHOP_IDL, SHOP_PROGRAM_ID, provider);
  let airdropees = [creator, ...otherCreators, ...user];
  for (const dropee of airdropees) {
    await connection.confirmTransaction(
      await connection.requestAirdrop(dropee.publicKey, 60 * LAMPORTS_PER_SOL),
      "confirmed"
    );
  }

  console.log("minting nfts...");
  nftList = await mintNFTs(
    mintNumberOfNfts,
    mintNumberOfCollections,
    metaplex,
    connection
  );
  console.log("minted all nfts!");
}

export async function initializeExhibit() {
  nft = nftList[0][0];
  nft2 = nftList[0][2];
  nft3 = nftList[0][6];
  [exhibit, voucherMint] = await getVoucherAddress(nft);

  const tx = await Exhibition.methods
    .initializeExhibit()
    .accounts({
      exhibit: exhibit,
      voucherMint: voucherMint,
      nftMetadata: nft.metadataAccount.publicKey,
      creator: creator.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  let transaction = new Transaction().add(tx);

  let signature = await sendAndConfirmTransaction(connection, transaction, [
    creator,
  ]);
  await connection.confirmTransaction(signature, "confirmed");
  let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  console.log("initialized exhibit!", exhibitInfo.exhibitSymbol);
}

async function initialFlow() {
  const input = process.argv.slice(2);
  const uiType = input[0];
  console.log("input", input, uiType);
  await airdropAndMint();
  await initializeExhibit();

  if (uiType == "nftamm") {
    await insertNft(nft);
    await insertNft(nft2);
    await insertNft(nft3);
    await initializeSwap();
    await instructionDepositLiquidity();
    console.log("finsihed nftamm process");
  } else if (uiType == "floorbid") {
    console.log("finsihed floorbid process");
  } else if (uiType == "shop") {
    console.log("finsihed shop process");
  }
}
initialFlow();
