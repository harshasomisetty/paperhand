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
import { checkIfAccountExists, getBidOrderData } from "@/utils/retrieveData";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { instructionCancelBid } from "@/utils/instructions/checkout";
import { getCheckoutAccounts } from "@/utils/accountDerivation";

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
  // responsive: true,
  maintainAspectRatio: false,
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
        text: "Bid Size(NFT)",
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

// TODO Update orderbook to table
const Orderbook = () => {
  const [orderbook, setOrderbook] = useState();
  const [labels, setLabels] = useState();
  const [allBids, setAllBids] = useState();
  const [userBids, setUserBids] = useState();
  const [labelColors, setLabelColors] = useState();
  const [leftside, setLeftside] = useState<boolean>(true);
  const [userCancel, setUserCancel] = useState<Record<number, number>>({});
  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  let exhibit = new PublicKey(exhibitAddress);
  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress!);

      let { bidOrders } = await getCheckoutAccounts(exhibit);

      if (await checkIfAccountExists(bidOrders, connection)) {
        let { prices, size, bids } = await getBidOrderData(
          exhibit,
          connection,
          wallet
        );

        for (let i = 0; i < prices.length; i++) {
          prices[i] = Number(prices[i]).toFixed(2).toString();
        }
        // let formattedLabels = labels.map((element) => "$" + element.toString());
        setLabels(prices);
        setOrderbook(size);
        setAllBids(bids);

        let orderbookData = {};

        let labColors = [];
        let normalColor = "rgba(75, 192, 192, .2)"; // green
        let userColor = "rgba(75, 192, 192, .2)"; // green
        // let userColor = "rgba(54, 162, 235, .3)"; // Blue

        if (publicKey && bids[publicKey.toString()]) {
          let userOrders = bids[publicKey.toString()];
          for (let bid of userOrders) {
            let bidPrice = Number(bid.bidPrice);
            // let bidPrice = Number(Number(bid.bidPrice) / LAMPORTS_PER_SOL);
            if (orderbookData[bidPrice]) {
              orderbookData[bidPrice].push(Number(bid.sequenceNumber));
            } else {
              orderbookData[bidPrice] = [Number(bid.sequenceNumber)];
            }
          }
          setUserBids(orderbookData);

          for (let i = 0; i < prices.length; i++) {
            if (userOrders.includes(prices[i])) {
              labColors.push(userColor);
            } else {
              labColors.push(normalColor);
            }
          }
        } else {
          for (let i = 0; i < prices.length; i++) {
            labColors.push(normalColor);
          }
        }
        setLabelColors(labColors);
      }
    }

    if (!orderbook) {
      fetchData();
    }
  }, [exhibitAddress, wallet]);

  function selectCancel(price: number) {
    let oldCancel = { ...userCancel };
    if (oldCancel[price]) {
      delete oldCancel[price];
      setUserCancel(oldCancel);
    } else {
      oldCancel[price] = userBids[price];
      setUserCancel(oldCancel);
    }
  }

  async function executeCancelBid() {
    let cancelIds = [];

    for (let price of Object.keys(userCancel)) {
      cancelIds = cancelIds.concat(userCancel[price]);
    }
    console.log(cancelIds);
    if (exhibitAddress) {
      console.log("cancel bid");

      await instructionCancelBid(
        wallet,
        publicKey,
        exhibit,
        signTransaction,
        connection,
        cancelIds
      );
    }
    router.reload(window.location.pathname);
  }

  if (!orderbook) {
    return (
      <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300 p-2">
        <p className="text-center">No Orders Currently</p>
      </div>
    );
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <div className="card-body space-y-7 items-center">
        <ul
          className="menu menu-horizontal bg-base-300 rounded-box border border-neutral-focus"
          onClick={() => {
            setLeftside(!leftside);
          }}
        >
          <li>
            <a className={`${leftside && "active"}`}>All Bids</a>
          </li>
          <li>
            <a className={`${!leftside && "active"}`}>Your Bids</a>
          </li>
        </ul>
        {Object.keys(userCancel).length > 0 ? (
          <button className="btn btn-warning" onClick={executeCancelBid}>
            Cancel All Selected Bids
          </button>
        ) : (
          <button className="btn btn-disabled">Choose bid to cancel</button>
        )}

        {leftside ? (
          <div className="relative h-80 w-40">
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
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Price</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {userBids &&
                Object.keys(userBids)
                  .sort(function (a, b) {
                    return Number(b) - Number(a);
                  })
                  .map((bid, index) => (
                    <tr
                      onClick={(e) => {
                        selectCancel(Number(bid));
                        console.log("usercancel", userCancel);
                      }}
                      className={`${
                        userCancel[bid] && "border-2 border-secondary-focus"
                      }`}
                    >
                      <td key={index}>
                        {Number(Number(bid) / LAMPORTS_PER_SOL).toFixed(2)}
                      </td>
                      <td>{userBids[bid].length}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Orderbook;
