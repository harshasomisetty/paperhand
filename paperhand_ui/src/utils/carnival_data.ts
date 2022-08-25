import { keypairIdentity, Metaplex, Nft } from "@metaplex-foundation/js";
import { BN, Program, Wallet } from "@project-serum/anchor";
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import { checkIfAccountExists } from "@/utils/retrieveData";
import { IDL as CARNIVAL_IDL } from "@/target/types/carnival";
import * as CarnivalJson from "@/target/idl/carnival.json";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProvider } from "@/utils/provider";
import { getCarnivalProgramAndProvider } from "./constants";
import { BoothAccount } from "./interfaces";

const CARNIVAL_PROGRAM_ID = new PublicKey(CarnivalJson["metadata"]["address"]);

export async function getAllBooths(
  connection: Connection,
  exhibit: PublicKey,
  boothIdCount: number,
  wallet: Wallet
): Promise<
  Record<number, { publicKey: PublicKey; account: AccountInfo<Buffer> }>
> {
  let { carnival } = await getCarnivalAccounts(exhibit);

  let { Carnival } = await getCarnivalProgramAndProvider(wallet);

  let booths: PublicKey[] = [];
  for (let i = 0; i < boothIdCount; i++) {
    let [booth] = await PublicKey.findProgramAddress(
      [
        Buffer.from("booth"),
        carnival.toBuffer(),
        new BN(i).toArrayLike(Buffer, "le", 8),
      ],
      CARNIVAL_PROGRAM_ID
    );

    booths.push(booth);
  }

  let multipleBooths = await Carnival.account.booth.fetchMultiple(booths);

  let boothInfos: Record<number, { publicKey: PublicKey; account: any }> = {};

  for (let i = 0; i < boothIdCount; i++) {
    if (multipleBooths[i]) {
      boothInfos[i] = { publicKey: booths[i]!, data: multipleBooths[i]! };
    }
  }

  return boothInfos;
}

export async function getBoothInfo(
  connection: Connection,
  exhibit: PublicKey,
  boothId: number,
  wallet: Wallet
) {
  let { carnival } = await getCarnivalAccounts(exhibit);

  let { Carnival } = await getCarnivalProgramAndProvider(wallet);

  let [booth] = await PublicKey.findProgramAddress(
    [
      Buffer.from("booth"),
      carnival.toBuffer(),
      new BN(boothId).toArrayLike(Buffer, "le", 8),
    ],
    CARNIVAL_PROGRAM_ID
  );

  let fetchedBoothInfo = await Carnival.account.booth.fetch(booth);

  return fetchedBoothInfo;
}

export async function getBoothNfts(
  connection: Connection,
  metaplex: Metaplex,
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
    if (artifact.account.data.parsed.info.delegate) {
      let delKey = new PublicKey(artifact.account.data.parsed.info.delegate);
      if (delKey.toString() === boothKey.toString()) {
        artifactMints.push(
          new PublicKey(artifact.account.data.parsed.info.mint)
        );
      }
    }
  }

  let allNfts = await metaplex.nfts().findAllByMintList(artifactMints);

  return allNfts;
}

export async function getOpenBoothId(
  carnival: PublicKey,
  connection: Connection,
  wallet: Wallet
): Promise<number> {
  let { Carnival } = await getCarnivalProgramAndProvider(wallet);

  let bal = await connection.getBalance(carnival);

  if (!(await checkIfAccountExists(carnival, connection))) {
    return 0;
  } else {
    let carnivalInfo = await Carnival.account.carnivalAccount.fetch(carnival);
    return Number(carnivalInfo.boothIdCount);
  }
}
