import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Transaction,
} from "@solana/web3.js";
import { Checkout } from "../target/types/checkout";
import { Caravan } from "../target/types/caravan";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;

const Checkout = anchor.workspace.Checkout as Program<Checkout>;
const Caravan = anchor.workspace.Caravan as Program<Caravan>;

describe("Full Floorbid", () => {
  let exhibitKeypair: Keypair = Keypair.generate();
  let exhibit: PublicKey = exhibitKeypair.publicKey;

  before(async () => {});
  it("Inited caravan and checkout!", async () => {});
  it("placed bids", async () => {});
  it("seller sells to highest bid", async () => {});
  it("user claims token", async () => {});
  it("user cancels bid", async () => {});

  Checkout.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
  Caravan.provider.connection.onLogs("all", ({ logs }) => {
    console.log(logs);
  });
});
