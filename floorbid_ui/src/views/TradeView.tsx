import {
  checkIfSwapExists,
  getMarketData,
  getUserData,
} from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MarketData, UserData } from "@/utils/interfaces";
import {
  SHOP_PROGRAM_ID,
  getShopProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import SwapCard from "@/components/SwapCard";
import BidCard from "@/components/BidCard";

export default function TradeView({}) {
  const { connection } = useConnection();
  const { wallet, publicKey } = useWallet();
  const [marketData, setMarketData] = useState<MarketData>();
  const [menuDefault, setMenuDefault] = useState(true);
  const [userData, setUserData] = useState<UserData>();
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const router = useRouter();

  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);

      // let swapExists = await checkIfSwapExists(exhibit, connection);
      // setSwapActive(swapExists);

      let uData = await getUserData(exhibit, publicKey, connection);
      setUserData(uData);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <div className="flex flex-col items-center place-content-start space-y-4 m-4">
      {userData ? (
        <>
          <BidCard />
          {/* <SwapCard marketData={marketData} userData={userData} /> */}
        </>
      ) : (
        <p>Loading market data</p>
      )}
    </div>
  );
}
