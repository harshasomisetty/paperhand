import { keypairIdentity, Metaplex, Nft } from "@metaplex-foundation/js";
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
): Promise<Nft[]> {
  let allArtifactAccounts = (
    await connection.getParsedTokenAccountsByOwner(exhibit, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;

  let artifactMints = [];
  for (let artifact of allArtifactAccounts) {
    let delKey = new PublicKey(artifact.account.data.parsed.info.delegate);
    if (delKey.toString() === boothKey.toString()) {
      artifactMints.push(new PublicKey(artifact.account.data.parsed.info.mint));
    }
  }

  const metaplex = Metaplex.make(connection).use(keypairIdentity(creator));
  let allNfts = await metaplex.nfts().findAllByMintList(artifactMints);

  return allNfts;
}

export async function getOpenBoothId(
  carnival: PublicKey,
  connection: Connection
): Promise<number> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let bal = await connection.getBalance(carnival);
  console.log("bal", bal);

  if (!(await checkIfAccountExists(carnival, connection))) {
    console.log("not exist?");
    return 0;
  } else {
    console.log("exist?");
    let carnivalInfo = await Carnival.account.carnivalAccount.fetch(carnival);
    console.log("carni info", carnivalInfo.boothIdCount);

    return Number(carnivalInfo.boothIdCount);
  }
}
