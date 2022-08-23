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

export async function getAllBooths(
  connection: Connection,
  exhibit: PublicKey,
  boothIdCount: number
): Promise<
  Record<number, { publicKey: PublicKey; account: AccountInfo<Buffer> }>
> {
  let { carnival, carnivalAuth, carnivalAuthBump, escrowSol } =
    await getCarnivalAccounts(exhibit);

  // let allBoothAccounts = await connection.getProgramAccounts(
  //   CARNIVAL_PROGRAM_ID
  // );

  let booths: PublicKey[] = [];
  for (let i = 0; i < boothIdCount; i++) {
    let [booth, boothBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("booth"),
        carnival.toBuffer(),
        new BN(i).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    booths.push(booth);
  }

  let multipleBooths = await getMultipleAccounts(connection, booths);

  let boothInfos: Record<
    number,
    { publicKey: PublicKey; account: AccountInfo<Buffer> }
  > = {};

  for (let i = 0; i < boothIdCount; i++) {
    // console.log(multipleBooths[i]);
    if (multipleBooths[i]) {
      boothInfos[i] = multipleBooths[i];
    }
  }

  return boothInfos;
}

export async function getBoothNfts(
  connection: Connection,
  exhibit: PublicKey,
  boothKey: PublicKey
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

  let boothNfts = [];

  for (let account of allArtifactAccounts) {
    let delKey = new PublicKey(account.account.data.parsed.info.delegate);
    if (delKey.toString() === boothKey.toString()) {
      boothNfts.push(account);
    }
  }

  return boothNfts;
}

export async function getOpenBoothId(carnival: PublicKey): Promise<number> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let carnivalInfo = await Carnival.account.carnivalAccount.fetch(carnival);

  return Number(carnivalInfo.boothIdCount);
}
