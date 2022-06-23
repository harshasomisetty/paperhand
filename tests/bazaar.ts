import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Bazaar } from '../target/types/bazaar';
const fs = require('fs');
const assert = require('assert');
const { SystemProgram, SYSVAR_RENT_PUBKEY } = anchor.web3;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const Bazaar = anchor.workspace.Bazaar as Program<Bazaar>;
const BazaarID = new PublicKey(Bazaar.idl['metadata']['address']);

describe('bazaar', () => {
  /* end goal should be for user to press a button that opens the display case and bazaar simultaneously
   * need to give creator option to bootstrap liq
   * so first open display case, spend some time inserting etc
   * then creator presses button to open market
   * do find pdas and get associated addresses, and init all accounts in frontend imo
   *
   * next step, wait for user1 to get some tokens for both sides, and depo liq
   * next step, allow user2 to swap
   * next step, allow for user1 to withdraw liq*/

  const creator = Keypair.generate();
  const user = [Keypair.generate(), Keypair.generate()];

  let airdropVal = 20 * LAMPORTS_PER_SOL;
  const marketState = Keypair.generate();

  let marketAuth;
  let marketMint;
  let marketTokenFee;
  let tokenAMint;
  let tokenBmint;
  let marketTokenA;
  let marketTokenB;

  it('Init variables', async () => {
    let airdropees = [creator, ...user];
    for (const dropee of airdropees) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(dropee.publicKey, airdropVal),
        'confirmed'
      );
    }

    [marketAuth] = await PublicKey.findProgramAddress(
      [Buffer.from('market_auth'), marketState.publicKey.toBuffer()],
      BazaarID
    );

    [marketMint] = await PublicKey.findProgramAddress(
      [Buffer.from('market_mint'), marketState.publicKey.toBuffer()],
      BazaarID
    );

    [marketTokenA] = await PublicKey.findProgramAddress(
      [Buffer.from('marketTokenA'), marketState.publicKey.toBuffer()],
      BazaarID
    );

    [marketTokenB] = await PublicKey.findProgramAddress(
      [Buffer.from('marketTokenB'), marketState.publicKey.toBuffer()],
      BazaarID
    );

    // it('init market', async () => {

    // })

    // it('deposit liq', async () => {

    // })

    // it('swap', async () => {

    // })

    // it('withdraw liq', async () => {

    // })
  });

  Bazaar.provider.connection.onLogs('all', ({ logs }) => {
    console.log(logs);
  });
});
