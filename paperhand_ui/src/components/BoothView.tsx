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

const BoothView = ({
  boothList,
  exhibitSymbol,
}: {
  boothList: Record<
    number,
    { publicKey: PublicKey; data: AccountInfo<Buffer> }
  >;
  exhibitSymbol: string;
}) => {
  const router = useRouter();
  const { wallet, publicKey, signTransaction } = useWallet();
  const { exhibitAddress } = router.query;
  const { connection } = useConnection();

  const { asPath, pathname } = useRouter();

  const [left, setLeft] = useState(true);
  const [viewBooths, setViewBooths] = useState(boothList);

  const userBooths = {};

  Object.keys(boothList).forEach((element, index) => {
    if (
      boothList[element].data.boothOwner.toString() === publicKey.toString()
    ) {
      userBooths[element] = boothList[element];
    }
  });

  const handleClick = (e, booth) => {
    e.preventDefault();
    // console.log("as path", asPath);
    router.push(asPath + "/" + boothList[booth].publicKey.toString());
  };

  if (!boothList) {
    return <p>loading booth list</p>;
  }
  // TODO SET SPOT PRICE
  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 items-center">
      <div className="flex flex-col p-4 m-2">
        <div className="flex flex row">
          <h1
            className={`text-xl font-extrabold p-2 ${!left && "opacity-40"}`}
            onClick={() => {
              setViewBooths(boothList);
              setLeft(true);
            }}
          >
            All Booths
          </h1>
          <h1
            className={`text-xl font-extrabold p-2 ${left && "opacity-40"}`}
            onClick={() => {
              setViewBooths(userBooths);
              setLeft(false);
            }}
          >
            Your Booths
          </h1>
        </div>
        <div className="flex flex-row flex-wrap gap-4 place-items-stretch auto-cols-max">
          {viewBooths && (
            <table className="table">
              <thead>
                <tr className="cursor-pointer">
                  <th>Id</th>
                  <th>Type</th>
                  <th>Spot</th>
                  <th>{exhibitSymbol}s</th>
                  <th>Sol ◎</th>
                  <th>Curve</th>
                  <th>Delta</th>
                  <th>Fee</th>
                  <th>Volume</th>
                </tr>
              </thead>

              <tbody>
                {Object.keys(viewBooths).map((booth, ind) => (
                  <tr
                    onClick={(e) => {
                      handleClick(e, booth);
                    }}
                    className="hover cursor-pointer"
                  >
                    <td>{Number(viewBooths[booth].data.boothId)}</td>
                    <td>
                      {Object.keys(
                        viewBooths[booth].data.boothType
                      )[0].toString()}
                    </td>
                    <td>{Number(viewBooths[booth].data.spotPrice)}</td>
                    <td>{Number(viewBooths[booth].data.nfts)}</td>
                    <td>
                      {(
                        Number(viewBooths[booth].data.sol) / LAMPORTS_PER_SOL
                      ).toFixed(3)}{" "}
                      ◎
                    </td>
                    <td>
                      {Object.keys(viewBooths[booth].data.curve)[0].toString()}
                    </td>
                    <td>{viewBooths[booth].data.delta.toString()}</td>
                    <td>{Number(viewBooths[booth].data.fee)}</td>
                    <td>{Number(viewBooths[booth].data.tradeCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoothView;
