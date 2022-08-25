import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";
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
import { NftContext, NftProvider } from "@/context/NftContext";
import NftList from "@/components/NftList";
import BoothSetup from "@/components/BoothSetup";

const NewBooth = () => {
  const router = useRouter();
  const { exhibitAddress } = router.query;
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [userNftList, setUserNftList] = useState<Nft[]>([]);

  const mx = Metaplex.make(connection);

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
      let { carnival } = await getCarnivalAccounts(exhibit);
      // get booth info
      const allUserNfts = await mx.nfts().findAllByOwner(publicKey);

      const curNfts = [];
      for (let nft of allUserNfts!) {
        if (nft.symbol == exhibitInfo.exhibitSymbol) {
          curNfts.push(nft);
        }
      }
      setUserNftList(curNfts);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);
  // TODO create sell only pools etc
  return (
    <NftProvider>
      <div className="grid grid-cols-2">
        <BoothSetup exhibitSymbol={exhibitSymbol} />
        <NftList
          nftList={userNftList}
          title={"Your NFTs to Deposit into Booth"}
        />
      </div>
    </NftProvider>
  );
};

export default NewBooth;
