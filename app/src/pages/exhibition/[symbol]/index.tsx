import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  AccountInfo,
} from "@solana/web3.js";
import { useState, useEffect } from "react";
import ProjectList from "../../../components/ProjectList";
import EXHIBITION_IDL from "../../../../exhibitIdl.json";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { EXHIBITION_PROGRAM_ID } from "../../../../../deploy/constants";

import { creatorAdd, exhibitNames } from "../../../utils/data";

import { Program } from "@project-serum/anchor";
import { getProvider } from "../../../utils/provider";
const connection = new Connection("http://localhost:8899", "processed");

const ExploreProjects = () => {
  const [exhibitCreator, setExhibitCreator] = useState("");
  const [exhibitSymbol, setExhibitSymbol] = useState("");
  const [nftCount, setNftCount] = useState();
  const [marketActive, setMarketActive] = useState(false);
  const { wallet, publicKey, sendTransaction } = useWallet();
  console.log("zero wall", wallet);
  useEffect(() => {
    let symbol = "NC0";
    async function fetchData() {
      // let provider = await getProvider("http://localhost:8899", creator);
      let provider = await getProvider(wallet);
      let Exhibition = new Program(
        EXHIBITION_IDL,
        EXHIBITION_PROGRAM_ID,
        provider
      );
      let existingExhibits: PublicKey[] = [];

      let [exhibit, exhibitBump] = await PublicKey.findProgramAddress(
        [Buffer.from("exhibit"), Buffer.from(symbol), creatorAdd.toBuffer()],
        EXHIBITION_PROGRAM_ID
      );

      let exhibitBal = await connection.getBalance(exhibit);
      if (exhibitBal > 0) {
        let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitCreator(exhibitInfo.exhibitCreator.toString());
        setExhibitSymbol(exhibitInfo.exhibitSymbol);
        setNftCount(exhibitInfo.nftCount);
        setMarketActive(exhibitInfo.marketActive.toString());
        console.log(exhibitInfo);
        // setExhibits(exhibitInfo);
      }
    }
    fetchData();
  }, []);
  return (
    <div>
      <h2>Explore this Exhibit</h2>
      <p>exhibitCreator: {exhibitCreator}</p>
      <p>exhibitSymbol: {exhibitSymbol}</p>
      <p>nftCount: {nftCount}</p>
      <p>marketActive: {marketActive}</p>
    </div>
  );
};

export default ExploreProjects;
