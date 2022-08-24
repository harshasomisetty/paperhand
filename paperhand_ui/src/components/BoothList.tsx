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

  return (
    <div>
      <p>Created Booths</p>
      {boothList && (
        <>
          {Object.keys(boothList).map((booth, ind) => (
            <a href={asPath + "/" + boothList[booth].publicKey.toString()}>
              <BoothCard
                exhibitSymbol={exhibitSymbol}
                boothInfo={boothList[booth].data}
              />
            </a>
          ))}
        </>
      )}
    </div>
  );
};

export default BoothList;
