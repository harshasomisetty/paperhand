import { AccountInfo, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";

import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { getExhibitProgramAndProvider } from "@/utils/constants";
import {
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import BoothCard from "./BoothCard";
import { NftContext } from "@/context/NftContext";

const BoothView = ({ exhibitSymbol }: { exhibitSymbol: string }) => {
  const router = useRouter();
  const { wallet, publicKey, signTransaction } = useWallet();
  const { asPath, pathname } = useRouter();
  const [left, setLeft] = useState(true);
  const [boothList, setBoothList] = useState({});
  const [userBooths, setUserBooths] = useState({});

  const { exhibitAddress } = router.query;
  const { connection } = useConnection();

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      let { carnival } = await getCarnivalAccounts(exhibit);

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let boothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      setBoothList(boothInfos);

      let tempUserBooths = {};

      Object.keys(boothInfos).forEach((element, index) => {
        if (
          boothInfos[element].data.boothOwner.toString() ===
          publicKey.toString()
        ) {
          let boothKey = boothInfos[index].publicKey.toString();
          tempUserBooths[boothKey] = boothInfos[index];
        }
      });

      setUserBooths(tempUserBooths);
    }

    if (exhibitAddress && publicKey) {
      fetchData();
    }
  }, [publicKey, exhibitAddress]);

  const handleClick = (e, val) => {
    e.preventDefault();
    router.push(asPath + "/" + val.publicKey.toString());
  };

  if (!boothList) {
    return <p>loading booth list</p>;
  } else {
  }

  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 items-center">
      <div className="flex flex-col p-4 m-2">
        <div className="flex flex row justify-between">
          <div className="flex flex-row">
            <h1
              className={`text-xl font-extrabold p-2 ${!left && "opacity-40"}`}
              onClick={() => {
                setLeft(true);
              }}
            >
              All Booths
            </h1>
            <h1
              className={`text-xl font-extrabold p-2 ${left && "opacity-40"}`}
              onClick={() => {
                setLeft(false);
              }}
            >
              Your Booths
            </h1>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => router.push(asPath + "/new_booth")}
          >
            Create a Booth
          </button>
        </div>
        <div className="flex flex-row flex-wrap gap-4 place-items-stretch auto-cols-max">
          <table className="table">
            <thead>
              <tr className="cursor-pointer">
                <th>Id</th>
                <th>Spot</th>
                <th>{exhibitSymbol}s</th>
                <th>Sol ◎</th>
                <th>Delta</th>
                <th>Fee</th>
                <th>Volume</th>
              </tr>
            </thead>

            <tbody>
              {Object.values(left ? boothList : userBooths).map(
                (val, index) => (
                  <tr
                    onClick={(e) => {
                      handleClick(e, val);
                    }}
                    className="hover cursor-pointer"
                    key={index}
                  >
                    <td>{Number(val.data.boothId)}</td>
                    <td>
                      {Number(val.data.spotPrice / LAMPORTS_PER_SOL).toFixed(3)}
                    </td>
                    <td>{Number(val.data.nfts)}</td>
                    <td>
                      {(Number(val.data.sol) / LAMPORTS_PER_SOL).toFixed(3)} ◎
                    </td>
                    <td>
                      {Number(val.data.delta / LAMPORTS_PER_SOL).toFixed(3)}
                    </td>
                    <td>{Number(val.data.fee)}</td>
                    <td>{Number(val.data.tradeCount)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BoothView;
