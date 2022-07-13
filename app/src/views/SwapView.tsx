import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionDepositNft } from "@/utils/instructions";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
  getMarketData,
  getUserVoucherTokenBal,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { MarketData } from "@/utils/interfaces";
import {
  BAZAAR_PROGRAM_ID,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import SwapCard from "@/components/SwapCard";
import LiquidityCard from "@/components/LiquidityCard";
import InitSwapCard from "@/components/InitSwapCard";
interface SwapViewProps {
  bruh: string | null;
}

export default function SwapView({ bruh }: HomeViewProps) {
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [menuDefault, setMenuDefault] = useState(true);
  const [swapActive, setSwapActive] = useState(false);
  const [userTokenVoucher, setUserTokenVoucher] = useState<number>();
  const [userTokenSol, setUserTokenSol] = useState<number>();
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const router = useRouter();

  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let [marketAuth, authBump] = await PublicKey.findProgramAddress(
        [Buffer.from("market_auth"), exhibit.toBuffer()],
        BAZAAR_PROGRAM_ID
      );

      let swapExists = await checkIfAccountExists(marketAuth, connection);
      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
      setSwapActive(swapExists);
      if (swapExists) {
        let mdata = await getMarketData(exhibit, publicKey, connection);
        setMarketData(mdata);
      }

      let userTokenVoucherBal = await getUserVoucherTokenBal(
        exhibit,
        publicKey,
        connection
      );
      setUserTokenVoucher(Number(userTokenVoucherBal));
      let userSol = await connection.getBalance(publicKey);
      setUserTokenSol(Number(userSol));
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  function switchMenu() {
    setMenuDefault(!menuDefault);
  }
  return (
    <div className="flex flex-col items-center place-content-start">
      {swapActive ? (
        <>
          {marketData ? (
            <>
              <ul
                className="menu menu-horizontal bg-base-100 rounded-box border-2"
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
                <SwapCard marketData={marketData} />
              ) : (
                <LiquidityCard
                  marketData={marketData}
                  exhibitSymbol={exhibitSymbol}
                />
              )}
            </>
          ) : (
            <p>Loading market data</p>
          )}
        </>
      ) : (
        <InitSwapCard
          userSolBal={userTokenSol}
          userVoucherBal={userTokenVoucher}
        />
      )}
    </div>
  );
}
