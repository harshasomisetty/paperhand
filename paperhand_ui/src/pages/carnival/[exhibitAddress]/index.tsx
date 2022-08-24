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
import { checkIfAccountExists } from "@/utils/retrieveData";
import {
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import NftList from "@/components/NftList";

const CarnivalPage = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");

  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  const [booths, setBooths] = useState({});
  const [boothNfts, setBoothNfts] = useState<Nft[]>([]);

  const mx = Metaplex.make(connection);
  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
      let { carnival } = await getCarnivalAccounts(exhibit);

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let boothInfos = await getAllBooths(connection, exhibit, numBooths);

      setBooths(boothInfos);

      for (let index of Object.keys(boothInfos)) {
        let booth = boothInfos[index].publicKey;

        let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);
        setBoothNfts(fetchedNfts);
      }
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <div>
      {exhibitSymbol && (
        <>
          <p>{exhibitSymbol} Carnival</p>

          <p>all booths: {Object.keys(booths).length}</p>
          <NftList nftList={boothNfts} title={"Booth NFTS"} />
        </>
      )}
    </div>
  );
};

export default CarnivalPage;
