import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { getCheckoutOrderData } from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  indexAxis: "y" as const,
  elements: {},
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: true,
      },
    },
    y: {
      grid: {
        display: false,
      },
    },
  },
};

const Orderbook = () => {
  const [orderbook, setOrderbook] = useState();
  const [labels, setLabels] = useState();
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress!);

      let fetchedData = await getCheckoutOrderData(exhibit, connection, wallet);

      let orderData = {};
      for (let bid of fetchedData) {
        let tempBid = Number(bid.bidPrice);
        console.log("bid", tempBid);
        if (tempBid in orderData) {
          orderData[tempBid]++;
        } else {
          orderData[tempBid] = 1;
        }
      }

      console.log("modified", orderData);

      let tempLabels = [];
      let tempData = [];

      for (let key of Object.keys(orderData).sort().reverse()) {
        console.log(key, orderData[key]);
        tempLabels.push(Number(key) / LAMPORTS_PER_SOL);
        tempData.push(orderData[key]);
      }

      setLabels(tempLabels);
      setOrderbook(tempData);
    }

    if (!orderbook) {
      fetchData();
    }
  }, [exhibitAddress, wallet]);

  if (!orderbook) {
    return <p>Loading data</p>;
  }
  return (
    <>
      <div className="flex flex-col items-center place-content-start space-y-4 m-4">
        <Bar
          options={options}
          data={{
            labels,
            datasets: [
              {
                data: orderbook,
                backgroundColor: "rgba(75, 192, 192, .5)",
                barPercentage: 1.0,
                categoryPercentage: 1.0,
              },
            ],
          }}
        />
        {/* {orderbook.map((order: BidInterface) => ( */}
        {/*   <p>{Number(order.bidPrice) / LAMPORTS_PER_SOL}</p> */}
        {/* ))} */}
      </div>
    </>
  );
};

export default Orderbook;
