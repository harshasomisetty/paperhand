import { Nft } from "@metaplex-foundation/js";
import { Program } from "@project-serum/anchor";
import {
  Connection,
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
import { CARNIVAL_PROGRAM_ID } from "./constants";
import { IDL as CARNIVAL_IDL, Carnival } from "../target/types/carnival";
import { otherCreators, creator, users } from "../utils/constants";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export async function carnivalDepositNft(
  connection: Connection,
  nft: Nft,
  publicKey: PublicKey
): Promise<Transaction> {
  let provider = await getProvider("http://localhost:8899", creator);
  let Carnival = new Program(CARNIVAL_IDL, CARNIVAL_PROGRAM_ID, provider);

  let transaction = new Transaction();

  let { exhibit, voucherMint } = await getNftDerivedAddresses(nft);

  let [nftArtifact] = await PublicKey.findProgramAddress(
    [Buffer.from("nft_artifact"), exhibit.toBuffer(), nft.mint.toBuffer()],
    Carnival.programId
  );

  let { carnival, carnivalAuth, carnivalAuthBump } = await getCarnivalAccounts(
    exhibit
  );

  let nftUserTokenAddress = await getAssociatedTokenAddress(
    nft.mint,
    publicKey
  );

  if (!(await checkIfAccountExists(nftUserTokenAddress, connection))) {
    console.log("creating user voucher");
    let voucher_tx = createAssociatedTokenAccountInstruction(
      publicKey,
      nftUserTokenAddress,
      publicKey,
      nft.mint
    );
    transaction = transaction.add(voucher_tx);
  } else {
    console.log("user voucher already created");
  }

  let depositTx = await Carnival.methods
    .depositNft(carnivalAuthBump)
    .accounts({
      exhibit: exhibit,
      carnival: carnival,
      carnivalAuth: carnivalAuth,
      nftMint: nft.mint,
      nftMetadata: nft.metadataAccount.publicKey,
      nftUserToken: nftUserTokenAddress,
      nftArtifact: nftArtifact,
      signer: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .transaction();

  return transaction.add(depositTx);
}
