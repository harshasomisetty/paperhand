import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import { program } from "@project-serum/anchor/dist/cjs/spl/associated-token";
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
    TransactionInstruction,
    sendAndConfirmRawTransaction,
    Connection,
} from "@solana/web3.js";
import { ok } from "assert";
import { nextTick } from "process";
import { Nftfloor } from "../target/types/nftfloor";
const assert = require("assert");
const { BN } = anchor;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// const connection = provider.connection;
const Nftfloor = anchor.workspace.Nftfloor as Program<Nftfloor>;

let bidder = Keypair.generate()

const connection = new Connection("http://localhost:8899");

describe("test heap", () => {

    it("init heap", async () => {
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(bidder.publicKey, 30e9),
            "confirmed"
        );

        console.log("Airdrop received");
        let balance = await provider.connection.getBalance(bidder.publicKey, { commitment: "confirmed" })
        console.log(balance/ 1e9)
        
        // make pda
        const [nftHeap, _bump] = await PublicKey.findProgramAddress([Buffer.from("nft_heap")], Nftfloor.programId);

        const result = await Nftfloor.methods.createbinaryheap().accounts({
            nftHeap: nftHeap,
            initialBidder: bidder.publicKey,
            systemProgram: SystemProgram.programId
        })
        .signers([bidder])
        .rpc( {skipPreflight: true, commitment: "confirmed"} );

        let account = await Nftfloor.account.nftHeap.fetch(nftHeap);
    
        let zero = new BN(0)
        console.log(account.heap.items[0])
        console.log(result)

    });

    /*
    Need to check that the SOL was debited to the heap acc.
    */
    it("Makes a bid!", async () => {

        let balance = await provider.connection.getBalance(bidder.publicKey, { commitment: "confirmed" })
        console.log(balance/ 1e9)

        const [nftHeap, _bump] = await PublicKey.findProgramAddress([Buffer.from("nft_heap")], Nftfloor.programId);

        const result = await Nftfloor.methods.makebid(new BN(5)).accounts({
            nftHeap: nftHeap,
            bidder: bidder.publicKey,
        })
        .signers([bidder])
        .rpc( {skipPreflight: true, commitment: "confirmed"} );

        let account = await Nftfloor.account.nftHeap.fetch(nftHeap);
    
        console.log(account.heap.items[0])
        console.log(bidder.publicKey)

        let balance_bidder = await connection.getBalance(bidder.publicKey, { commitment: "confirmed" })
        console.log(balance_bidder/ 1e9)

        let balance_heap = await connection.getBalance(nftHeap, { commitment: "confirmed" })
        console.log(balance_heap/ 1e9)

        console.log(result)
    });

    /*
    Need to check that the SOL was debited to the bidder acc. 
    */
    it("Cancels a bid!", async () => {
        const [nftHeap, _bump] = await PublicKey.findProgramAddress([Buffer.from("nft_heap")], Nftfloor.programId);

        const result = await Nftfloor.methods.cancelbid().accounts({
            nftHeap: nftHeap,
            bidder: bidder.publicKey,
        })
        .signers([bidder])
        .rpc( {skipPreflight: true, commitment: "confirmed"} );

        let account = await Nftfloor.account.nftHeap.fetch(nftHeap);

        console.log(account.heap.items[0])
        console.log(bidder.publicKey)

        let balance_bidder = await connection.getBalance(bidder.publicKey, { commitment: "confirmed" })
        console.log(balance_bidder/ 1e9)

        let balance_heap = await connection.getBalance(nftHeap, { commitment: "confirmed" })
        console.log(balance_heap/ 1e9)
        
        console.log(result)
    });
});