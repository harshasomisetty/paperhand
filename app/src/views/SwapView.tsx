import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionDepositNft } from "@/utils/instructions";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
  getMarketData,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { MarketData } from "@/utils/interfaces";
import { getExhibitProgramAndProvider } from "@/utils/constants";
import SwapCard from "@/components/SwapCard";
import LiquidityCard from "@/components/LiquidityCard";
interface SwapViewProps {
  bruh: string | null;
}

export default function SwapView({ bruh }: HomeViewProps) {
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [menuDefault, setMenuDefault] = useState(true);
  const router = useRouter();

  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      console.log("fetching");

      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let mdata = await getMarketData(exhibit, publicKey, connection);
      setMarketData(mdata);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  function switchMenu() {
    setMenuDefault(!menuDefault);
  }
  return (
    <div>
      {marketData ? (
        <div className="flex flex-col items-center">
          <ul
            className="menu menu-vertical lg:menu-horizontal bg-base-100 rounded-box border-2"
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
            <SwapCard MarketData={marketData} />
          ) : (
            <LiquidityCard />
          )}
        </div>
      ) : (
        <p>Loading market data</p>
      )}
    </div>
  );
}
