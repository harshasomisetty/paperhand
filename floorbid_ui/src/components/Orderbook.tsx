import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getCheckoutOrderData } from "@/utils/retrieveData";
import { BidInterface } from "@/utils/interfaces";

const Orderbook = () => {
  const [orderbook, setOrderbook] = useState<BidInterface[]>();
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress!);

      let fetchedData = await getCheckoutOrderData(exhibit, connection, wallet);

      setOrderbook(fetchedData);
    }

    if (!orderbook) {
      fetchData();
    }
  }, [exhibitAddress, wallet]);

  if (!orderbook) {
    return <p>Loading data</p>;
  }
  return (
    <div className="flex flex-col items-center place-content-start space-y-4 m-4">
      {orderbook.map((order: BidInterface) => (
        <p>{Number(order.bidPrice) / LAMPORTS_PER_SOL}</p>
      ))}
    </div>
  );
};

export default Orderbook;
