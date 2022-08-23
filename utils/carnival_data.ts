import { Nft } from "@metaplex-foundation/js";
import { BN, Program } from "@project-serum/anchor";
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  getCarnivalAccounts,
  getNftDerivedAddresses,
} from "./accountDerivation";
import { checkIfAccountExists, getProvider } from "./actions";
import { CARNIVAL_PROGRAM_ID, EXHIBITION_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { otherCreators, creator, users } from "../utils/constants";
import {
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAllExhibitArtifacts } from "../paperhand_ui/src/utils/retrieveData";
import { getMultipleAccounts } from "@project-serum/anchor/dist/cjs/utils/rpc";

export async function getAllMarkets(
  connection: Connection,
  exhibit: PublicKey,
  marketIdCount: number
): Promise<
  Record<number, { publicKey: PublicKey; account: AccountInfo<Buffer> }>
> {
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);

  // let allMarketAccounts = await connection.getProgramAccounts(
  //   CARNIVAL_PROGRAM_ID
  // );

  let markets: PublicKey[] = [];
  for (let i = 0; i < marketIdCount; i++) {
    let [market, marketBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("market"),
        carnival.toBuffer(),
        new BN(i).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    markets.push(market);
  }

  let multipleMarkets = await getMultipleAccounts(connection, markets);

  let marketInfos: Record<
    number,
    { publicKey: PublicKey; account: AccountInfo<Buffer> }
  > = {};

  for (let i = 0; i < marketIdCount; i++) {
    // console.log(multipleMarkets[i]);
    if (multipleMarkets[i]) {
      marketInfos[i] = multipleMarkets[i];
    }
  }

  return marketInfos;
}

export async function getMarketNfts(
  connection: Connection,
  exhibit: PublicKey,
  marketKey: PublicKey
): Promise<
  Array<{
    pubkey: PublicKey;
    account: AccountInfo<ParsedAccountData>;
  }>
> {
  let allArtifactAccounts = (
    await connection.getParsedTokenAccountsByOwner(exhibit, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;

  let marketNfts = [];

  for (let account of allArtifactAccounts) {
    let delKey = new PublicKey(account.account.data.parsed.info.delegate);
    if (delKey.toString() === marketKey.toString()) {
      marketNfts.push(account);
    }
  }

  return marketNfts;
}
