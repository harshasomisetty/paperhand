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

const BoothList = ({
  boothList,
  exhibitSymbol,
}: {
  boothList: Record<
    number,
    { publicKey: PublicKey; account: AccountInfo<Buffer> }
  >;
  exhibitSymbol: string;
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

  function mapBoothType(boothInfo) {
    let type = Object.keys(boothInfo.data.boothType)[0].toString();
    if (type == "buy") {
      return "Buy " + exhibitSymbol;
    } else if (type == "sell") {
      return "Sell " + exhibitSymbol;
    } else {
      return "Trade " + exhibitSymbol;
    }
  }

  return (
    <div>
      <p>Created Booths</p>
      {boothList && (
        <>
          {Object.keys(boothList).map((booth, ind) => (
            <a href={asPath + "/" + boothList[booth].publicKey.toString()}>
              <div className="card card-side space-y-2 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
                <div className="card-body flex flex-row">
                  <div>
                    <p>
                      Sol:{" "}
                      {Number(boothList[booth].data.sol) / LAMPORTS_PER_SOL}
                    </p>
                    <p>Nfts: {Number(boothList[booth].data.nfts)}</p>
                    <p>addy: {boothList[booth].publicKey.toString()}</p>
                    <p>{mapBoothType(boothList[booth])}</p>
                  </div>
                  <div>
                    <p>
                      Curve:{" "}
                      {Object.keys(boothList[booth].data.curve)[0].toString()}
                    </p>
                    <p>Delta: {Number(boothList[booth].data.delta)}</p>
                  </div>
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
