import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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
import { getBidOrderData } from "@/utils/retrieveData";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";

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
        display: false,
      },
      title: {
        display: true,
        text: "Size",
        maxRotation: 90,
        minRotation: 90,
      },
    },
    y: {
      grid: {
        display: false,
        color: "rgba(75, 192, 192, 1)",
      },
      ticks: {
        mirror: true,
        color: "rgba(2, 199, 122, 1)",
      },
    },
  },
};

const Orderbook = () => {
  const [orderbook, setOrderbook] = useState();
  const [labels, setLabels] = useState();
  const [labelColors, setLabelColors] = useState();
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress!);

      let { labels, values, bids } = await getBidOrderData(
        exhibit,
        connection,
        wallet
      );

      // let formattedLabels = labels.map((element) => "$" + element.toString());
      setLabels(labels);
      setOrderbook(values);

      let labColors = [];
      let normalColor = "rgba(75, 192, 192, .2)"; // green
      let userColor = "rgba(75, 192, 192, .2)"; // green
      // let userColor = "rgba(54, 162, 235, .3)"; // Blue

      if (publicKey && bids[publicKey.toString()]) {
        let userOrders = bids[publicKey.toString()];

        for (let i = 0; i < labels.length; i++) {
          if (userOrders.includes(labels[i])) {
            labColors.push(userColor);
          } else {
            labColors.push(normalColor);
          }
        }
      } else {
        for (let i = 0; i < labels.length; i++) {
          labColors.push(normalColor);
        }
      }
      setLabelColors(labColors);
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
        <p className="text-lg font-bold">Orderbook</p>
        <Bar
          options={options}
          data={{
            labels,
            datasets: [
              {
                data: orderbook,
                backgroundColor: labelColors,
                barPercentage: 1.0,
                minBarLength: 10,
                categoryPercentage: 1,
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
