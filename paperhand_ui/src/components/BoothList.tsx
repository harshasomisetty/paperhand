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

const BoothList = ({
  boothList,
  exhibitSymbol,
  title,
}: {
  boothList: Record<
    number,
    { publicKey: PublicKey; account: AccountInfo<Buffer> }
  >;
  exhibitSymbol: string;
  title?: string;
}) => {
  const router = useRouter();
  const { wallet, publicKey, signTransaction } = useWallet();
  const { exhibitAddress } = router.query;
  const { connection } = useConnection();

  const { asPath, pathname } = useRouter();

  useEffect(() => {
    async function fetchData() {}
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  const handleClick = (e, booth) => {
    e.preventDefault();
    // console.log("as path", asPath);
    router.push(asPath + "/" + boothList[booth].publicKey.toString());
  };

  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300">
      <div className="flex flex-col p-4 m-2">
        {title && <h1 className="text-xl font-extrabold p-2">{title}</h1>}
        <div className="flex flex-row flex-wrap gap-4 place-items-stretch auto-cols-max">
          {boothList && (
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
                {Object.keys(boothList).map((booth, ind) => (
                  <tr
                    onClick={(e) => {
                      handleClick(e, booth);
                    }}
                  >
                    <td>{Number(boothList[booth].data.boothId)}</td>
                    <td>{Number(boothList[booth].data.boothType)}</td>
                    <td>{Number(boothList[booth].data.spotPrice)}</td>
                    <td>{Number(boothList[booth].data.nfts)}</td>
                    <td>
                      {(
                        Number(boothList[booth].data.sol) / LAMPORTS_PER_SOL
                      ).toFixed(3)}{" "}
                      ◎
                    </td>
                    <td>
                      {Object.keys(boothList[booth].data.curve)[0].toString()}
                    </td>
                    <td>{boothList[booth].data.delta.toString()}</td>
                    <td>{Number(boothList[booth].data.fee)}</td>
                    <td>{Number(boothList[booth].data.tradeCount)}</td>
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

export default BoothList;
