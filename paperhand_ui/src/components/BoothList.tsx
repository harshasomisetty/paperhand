import { AccountInfo, PublicKey } from "@solana/web3.js";
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

const BoothList = ({
  boothList,
}: {
  boothList: Record<
    number,
    { publicKey: PublicKey; account: AccountInfo<Buffer> }
  >;
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

  return (
    <div>
      <p>Created Booths</p>
      {boothList && (
        <>
          {Object.keys(boothList).map((booth, ind) => (
            <a href={asPath + "/" + boothList[0].publicKey.toString()}>
              <div className="card flex flex-col space-y-2 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
                <div className="card-body">
                  <p>
                    Curve: {Object.keys(boothList[0].data.curve)[0].toString()}
                  </p>
                  <p>Delta: {Number(boothList[booth].data.delta)}</p>
                  <p>Sol: {Number(boothList[booth].data.sol)}</p>
                  <p>Nfts: {Number(boothList[booth].data.nfts)}</p>
                  <p>
                    boothType:{" "}
                    {Object.keys(boothList[0].data.boothType)[0].toString()}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </>
      )}
    </div>
  );
};

export default BoothList;
