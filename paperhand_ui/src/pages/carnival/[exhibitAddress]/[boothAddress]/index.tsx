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

import {
  getCarnivalProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import {
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import {
  getAllExhibitArtifacts,
  getAllNftImages,
  getExhibitAccountData,
} from "@/utils/retrieveData";
import NftList from "@/components/NftList";

const BoothPage = () => {
  const router = useRouter();
  const { wallet, publicKey, signTransaction } = useWallet();
  const { exhibitAddress, boothAddress } = router.query;
  const { connection } = useConnection();

  const [boothNfts, setBoothNfts] = useState<Nft[]>([]);
  const [boothInfo, setBoothInfo] = useState();

  const mx = Metaplex.make(connection);

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress);
      let booth = new PublicKey(boothAddress);

      let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);

      setBoothNfts(fetchedNfts);

      let { carnival } = await getCarnivalAccounts(exhibit);

      let { Carnival } = await getCarnivalProgramAndProvider(wallet);

      let fetchedBoothInfo = await Carnival.account.booth.fetch(booth);
      setBoothInfo(fetchedBoothInfo);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  if (!boothInfo) {
    return <p>loading data</p>;
  }
  return (
    <div>
      <div className="card card-side flex flex-col space-y-2 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
        <p>boot id: {Number(boothInfo.boothId)}</p>
        <p>sol: {(Number(boothInfo.sol) / LAMPORTS_PER_SOL).toFixed(3)}</p>
        <p>nfts: {Number(boothInfo.nfts)}</p>
        <p>Curve: {Object.keys(boothInfo.curve)[0].toString()} </p>

        {Object.keys(boothInfo.boothType)[0].toString() == 0 && (
          <p>Booth type: Buy </p>
        )}
        <p>Delta: {boothInfo.delta.toString()} </p>
      </div>
      <NftList nftList={boothNfts} title={"Booth NFTs"} />
    </div>
  );
};

export default BoothPage;
