import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { Program, Provider, web3 } from "@project-serum/anchor";
const { SystemProgram } = web3;
import * as anchor from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  getMint,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import getProvider from "../../../utils/provider";
import idl from "../../../idl.json";
import sleep from "../../../utils/sleep";

const programID = new PublicKey(idl.metadata.address);

const ExploreTreasury = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primalMembers, setPrimalMembers] = useState(0);
  const [startingPrice, setStartingPrice] = useState(0);
  const [initialCashout, setInitialCashout] = useState("0");
  const [preseedStatus, setPreseedStatus] = useState(false);
  const [coreMintAdd, setCoreMintAdd] = useState("");

  // const [treasuryAccount, setTreasuryAccount] = useState();

  const [treasuryBalance, setTreasuryBalance] = useState(0);
  // const [treasuryBump, setTreasuryBump] = useState(0);
  const [creatorKey, setCreatorKey] = useState("");

  const [transactionValue, setTransactionValue] = useState(1);
  const [proposalText, setProposalText] = useState("asdfasdf");
  const [proposalList, setProposalList] = useState([]);
  const [rerender, setRerender] = useState(false);

  const [creatorLogged, setCreatorLogged] = useState(true); // replace later
  const [isInvestor, setIsInvestor] = useState(false); // replace later

  const router = useRouter();

  const { wallet, publicKey, sendTransaction } = useWallet();
  const { treasuryAccountRoute } = router.query;

  let provider,
    program = null;

  let creatorAccount,
    treasuryAccount,
    coreMint,
    depositMap,
    coreDepositWallet,
    primalMint,
    memberMint = null;

  let treasuryBump,
    coreBump,
    depositBump,
    primalBump,
    memberBump = null;

  useEffect(() => {
    if (!router.isReady) return;
    else {
      async function findTreasury() {
        console.log("finding treasury deets");
        let response = await fetch(
          "http://localhost:3000/api/checkProject/" + treasuryAccountRoute
        );
        provider = await getProvider(wallet);
        program = new Program(idl, programID, provider);
        let data = await response.json();
        console.log(data);
        setCreatorKey(data["creator"]);
        setProposalList(data["proposals"]);
        console.log("just set creator", creatorKey);
        creatorAccount = new PublicKey(data["creator"]);

        [treasuryAccount, treasuryBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from("treasury_account"),
            creatorAccount.toBuffer(),
            Buffer.from(data["name"]),
          ],
          programID
        );

        // setTreasuryAccount(treasuryAccountObj.toString());

        let accountInfo = await program.account.treasuryAccount.fetch(
          treasuryAccount
        );

        setName(data["name"]);

        setDescription(data["description"]);
        setCoreMintAdd(data["coreMint"]);
        setPrimalMembers(accountInfo.primalMembers);
        setStartingPrice(accountInfo.startingPrice);
        console.log("preseed", accountInfo.preseedStatus);
        setPreseedStatus(accountInfo.preseedStatus);
        // setTreasuryBump(data["treasuryBump"]);

        const treasuryBalFetch = await provider.connection.getBalance(
          treasuryAccount
        );

        console.log(proposalList);
        setTreasuryBalance(treasuryBalFetch / LAMPORTS_PER_SOL);
        if (creatorKey && publicKey) {
          getIsInvested();
        } else {
          setRerender(!rerender);
        }
      }
      findTreasury();
    }
  }, [router.isReady, rerender]);

  async function setupMetadata() {
    if (!creatorKey) {
      await sleep(1000);
    }
    console.log("metadata");
    provider = await getProvider(wallet);
    program = new Program(idl, programID, provider);
    console.log("creator?", creatorKey);
    creatorAccount = new PublicKey(creatorKey);
    [treasuryAccount, treasuryBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("treasury_account"),
        creatorAccount.toBuffer(),
        Buffer.from(name),
      ],
      programID
    );

    [depositMap, depositBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("deposit_map"),
        treasuryAccount.toBuffer(),
        publicKey.toBuffer(),
      ],
      programID
    );

    [coreMint, coreBump] = await PublicKey.findProgramAddress(
      [Buffer.from("core_mint"), treasuryAccount.toBuffer()],
      programID
    );

    [primalMint, primalBump] = await PublicKey.findProgramAddress(
      [Buffer.from("primal_mint"), treasuryAccount.toBuffer()],
      programID
    );

    [memberMint, memberBump] = await PublicKey.findProgramAddress(
      [Buffer.from("member_mint"), treasuryAccount.toBuffer()],
      programID
    );

    coreDepositWallet = await getAssociatedTokenAddress(
      coreMint,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  }
  async function depositTreasuryAction() {
    console.log("doposit");
    event.preventDefault();

    await setupMetadata();
    const investorBalance = await provider.connection.getBalance(publicKey);

    if (investorBalance / LAMPORTS_PER_SOL < transactionValue) {
      //TODO add alert
      console.log("Account Balance not enough, please add more sol");
    } else {
      const tx = await new Transaction().add(
        program.transaction.depositTreasury(
          treasuryBump,
          new anchor.BN(transactionValue * LAMPORTS_PER_SOL),
          {
            accounts: {
              treasuryAccount: treasuryAccount,
              depositMap: depositMap,
              coreMint: coreMint,
              coreDepositWallet: coreDepositWallet,
              depositor: publicKey,
              creator: creatorAccount,
              systemProgram: anchor.web3.SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
          }
        )
      );

      const signature = await sendTransaction(tx, provider.connection);
      await provider.connection.confirmTransaction(signature, "processed");

      await sleep(1000);
      setRerender(!rerender);
    }

    // setShowModal(false);
  }
  async function endPreseedAction() {
    event.preventDefault();
    await setupMetadata();
    console.log("end pres", provider.connection);
    console.log(program.transaction);
    console.log(treasuryAccount.toString());
    console.log(publicKey.toString());
    const tx = await new Transaction().add(
      program.transaction.endPreseed(treasuryBump, {
        accounts: {
          treasuryAccount: treasuryAccount,
          creatorAccount: publicKey,
          creator: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      })
    );

    const signature = await sendTransaction(tx, provider.connection);
    await provider.connection.confirmTransaction(signature, "processed");
    console.log("end preseed");
    await sleep(1000);
    setRerender(!rerender);
  }

  async function getIsInvested() {
    console.log("is invested");
    await setupMetadata();

    let assocAddress = await getAssociatedTokenAddress(
      coreMint,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let balance = await provider.connection.getBalance(assocAddress);
    console.log(balance);
    if (Number(balance) > 0) {
      console.log("is invested");
      setIsInvestor(true);
    } else {
      console.log("is not invested");
      setIsInvestor(false);
    }
  }

  async function submitProposal() {
    event.preventDefault();
    await setupMetadata();

    let postData = {
      proposal: proposalText,
      treasuryAccount: treasuryAccount.toString(),
      sender: publicKey.toString(),
    };

    const data = await fetch("/api/submitProposal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });
    await sleep(1000);
    setRerender(!rerender);
  }

  if (!primalMembers) {
    return <p>Loading</p>;
  } else {
    return (
      <div className="flex flex-row justify-around text-center">
        <div>
          <h2>Account Data</h2>
          <div className="grid grid-cols-2 border divide-x divide-y border-slate-500 truncate">
            <p className="grid-item">Name</p>
            <p className="grid-item2"> {name}</p>
            <p className="grid-item">Description</p>
            <p className="grid-item2"> {description}</p>
            <p className="grid-item">Creator</p>
            <p className="grid-item2"> {creatorKey}</p>
            <p className="grid-item">Treasury</p>
            <p className="grid-item2"> {treasuryAccountRoute}</p>
            <p className="grid-item">Core Mint add</p>
            <p className="grid-item2"> {coreMintAdd}</p>
            <p className="grid-item">PrimalMembers</p>
            <p className="grid-item2"> {primalMembers}</p>
            <p className="grid-item">Starting Price</p>
            <p className="grid-item2"> {startingPrice}</p>
            <p className="grid-item">Treasury Balance</p>
            <p className="grid-item2"> {treasuryBalance} </p>
            <p className="grid-item">PreseedStatus</p>
            <p className="grid-item2"> {preseedStatus.toString()} </p>
          </div>

          {proposalList.length > 0 && (
            <>
              <h2>Submitted Proposals</h2>
              <div className="grid grid-cols-2 border divide-x divide-y border-slate-500 truncate">
                <>
                  <p>Proposal Text</p>
                  <p>Investor Account</p>
                </>
                {proposalList.map((p) => (
                  <>
                    <p>{p[1]}</p> <p>{p[0]}</p>
                  </>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          {publicKey ? (
            <div>
              {publicKey.toString() === creatorKey ? (
                <>
                  <p>You Created this Project! </p>
                  <div className="flex flex-col">
                    {preseedStatus ? (
                      <button
                        className="rounded-lg px-4 py-3 bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring focus:ring-purple-300 m-4"
                        onClick={endPreseedAction}
                      >
                        Close Preseed
                      </button>
                    ) : (
                      <button className="rounded-lg px-4 py-3 bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring focus:ring-purple-300 m-4">
                        Raise Fund
                      </button>
                    )}
                    <button
                      className="rounded-lg px-4 py-3 bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring focus:ring-purple-300 m-4"
                      onClick={() =>
                        router.push(
                          "/explore/" + treasuryAccountRoute + "/Contributors"
                        )
                      }
                    >
                      List of Contributors
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div>
                    {isInvestor ? (
                      <h3>Invested Project</h3>
                    ) : (
                      <h3>New Project</h3>
                    )}
                  </div>

                  <form
                    className="flex flex-col"
                    onSubmit={depositTreasuryAction}
                  >
                    <label>
                      Enter in amount in Sol{" "}
                      <input
                        className="text-black"
                        value={transactionValue}
                        onChange={(e) => setTransactionValue(e.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg px-4 py-3 bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring focus:ring-purple-300 m-4"
                    >
                      <p>Invest Sol</p>
                    </button>
                  </form>
                  {isInvestor && (
                    <form className="flex flex-col" onSubmit={submitProposal}>
                      <label>
                        Submit a Proposal
                        <input
                          className="text-black"
                          value={proposalText}
                          onChange={(e) => setProposalText(e.target.value)}
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg px-4 py-3 bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring focus:ring-purple-300 m-4"
                      >
                        Submit Proposal
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>Connect wallet to Invest</p>
          )}
        </div>
      </div>
    );
  }
};

export default ExploreTreasury;
