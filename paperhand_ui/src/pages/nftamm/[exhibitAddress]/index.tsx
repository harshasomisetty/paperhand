import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import router, { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";

import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

import {
  getExhibitProgramAndProvider,
  getShopProgramAndProvider,
  SHOP_PROGRAM_ID,
} from "@/utils/constants";

import {
  checkIfAccountExists,
  checkIfSwapExists,
  getAllExhibitArtifacts,
  getFilledOrdersList,
  getMarketData,
  getUserData,
} from "@/utils/retrieveData";
import { NftContext, NftProvider } from "@/context/NftContext";
import NftList from "@/components/NftList";
import {
  getCheckoutAccounts,
  getShopAccounts,
} from "@/utils/accountDerivation";
import RedeemCard from "@/components/RedeemCard";
import InitSwapCard from "@/components/InitSwapCard";
import SwapCard from "@/components/SwapCard";
import LiquidityCard from "@/components/LiquidityCard";

const NftammPage = () => {
  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();

  const [marketData, setMarketData] = useState<MarketData>();
  const [feesPaid, setFeesPaid] = useState<number>();
  const [menuDefault, setMenuDefault] = useState(true);
  const [shopActive, setShopActive] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData>();

  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [leftButton, setLeftButton] = useState<boolean>(true);

  const router = useRouter();
  const { exhibitAddress } = router.query;
  const mx = Metaplex.make(connection);

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let exhibitExists = await checkIfAccountExists(exhibit, connection);
      let { marketAuth } = await getShopAccounts(exhibit);

      let exhibitInfo;
      if (exhibitExists) {
        exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);

        setExhibitSymbol(exhibitInfo.exhibitSymbol);
      }

      let shopExists = await checkIfAccountExists(marketAuth, connection);
      setShopActive(shopExists);

      if (shopExists) {
        let { Shop } = await getShopProgramAndProvider(wallet);

        let marketInfo = await Shop.account.marketInfo.fetch(marketAuth);
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
      {shopActive ? (
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
};

export default NftammPage;
