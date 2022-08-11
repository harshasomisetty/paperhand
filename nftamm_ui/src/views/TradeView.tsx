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
  BAZAAR_PROGRAM_ID,
  getBazaarProgramAndProvider,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import SwapCard from "@/components/SwapCard";
import LiquidityCard from "@/components/LiquidityCard";
import InitSwapCard from "@/components/InitSwapCard";

export default function TradeView({}) {
  const { connection } = useConnection();
  const { wallet, publicKey } = useWallet();
  const [marketData, setMarketData] = useState<MarketData>();
  const [feesPaid, setFeesPaid] = useState<number>();
  const [menuDefault, setMenuDefault] = useState(true);
  const [swapActive, setSwapActive] = useState<boolean>(false);
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

      let swapExists = await checkIfSwapExists(exhibit, connection);
      setSwapActive(swapExists);

      if (swapExists) {
        let { Bazaar } = await getBazaarProgramAndProvider(wallet);

        let [marketAuth, temp] = await PublicKey.findProgramAddress(
          [Buffer.from("market_auth"), exhibit.toBuffer()],
          BAZAAR_PROGRAM_ID
        );

        let marketInfo = await Bazaar.account.marketInfo.fetch(marketAuth);
        setFeesPaid(Number(marketInfo.feesPaid) / LAMPORTS_PER_SOL);
        let mdata = await getMarketData(exhibit, connection);
        setMarketData(mdata);
      }

      let uData = await getUserData(exhibit, publicKey, connection);
      setUserData(uData);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  function switchMenu() {
    setMenuDefault(!menuDefault);
  }
  return (
    <div className="flex flex-col items-center place-content-start space-y-4 m-4">
      {swapActive ? (
        <>
          {marketData && userData ? (
            <>
              <ul
                className="menu menu-horizontal bg-base-300 rounded-box border border-neutral-focus"
                onClick={switchMenu}
              >
                <li>
                  <a className={`${menuDefault && "active"}`}>Swap</a>
                </li>
                <li>
                  <a className={`${!menuDefault && "active"}`}>Liquidity</a>
                </li>
              </ul>
              {menuDefault ? (
                <SwapCard marketData={marketData} userData={userData} />
              ) : (
                <LiquidityCard
                  marketData={marketData}
                  userData={userData}
                  exhibitSymbol={exhibitSymbol}
                />
              )}
              <div className="stats shadow border border-neutral-focus">
                <div className="stat">
                  <div className="stat-title">Creator Fees Paid</div>
                  <div className="stat-value">{feesPaid.toFixed(4)} SOL</div>
                </div>
              </div>
            </>
          ) : (
            <p>Loading market data</p>
          )}
        </>
      ) : (
        <>
          {userData ? (
            <InitSwapCard userData={userData} />
          ) : (
            <p>Loading User Data</p>
          )}
        </>
      )}
    </div>
  );
}
