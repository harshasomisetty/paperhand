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
import { BoothCard, BoothAssets, BoothPricing } from "@/components/BoothCard";
import { NftProvider } from "@/context/NftContext";

const BoothPage = () => {
  const { wallet, publicKey, signTransaction } = useWallet();

  const { connection } = useConnection();

  const [boothNfts, setBoothNfts] = useState<Nft[]>([]);
  const [boothImages, setBoothImages] = useState<string[]>([]);
  const [boothInfo, setBoothInfo] = useState();

  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");

  const router = useRouter();
  const { asPath } = useRouter();
  const { exhibitAddress, boothAddress } = router.query;

  const mx = Metaplex.make(connection);

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress);
      let booth = new PublicKey(boothAddress);

      let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);

      setBoothNfts(fetchedNfts);
      let images = await getAllNftImages(fetchedNfts);
      setBoothImages(images);
      setExhibitSymbol(fetchedNfts[0].symbol);

      let { carnival } = await getCarnivalAccounts(exhibit);

      let { Carnival } = await getCarnivalProgramAndProvider(wallet);

      let fetchedBoothInfo = await Carnival.account.booth.fetch(booth);
      setBoothInfo(fetchedBoothInfo);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  if (!boothInfo || !boothImages) {
    return <p>loading data</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 m-4">
      <div className="col-span-2 place-self-center">
        <BoothCard
          boothImages={boothImages}
          boothInfo={boothInfo}
          exhibitSymbol={exhibitSymbol}
        />
      </div>
      <BoothAssets
        boothInfo={boothInfo}
        exhibitSymbol={exhibitSymbol}
        boothNfts={boothNfts}
      />
      <BoothPricing boothInfo={boothInfo} exhibitSymbol={exhibitSymbol} />
    </div>
  );
};

export default BoothPage;
