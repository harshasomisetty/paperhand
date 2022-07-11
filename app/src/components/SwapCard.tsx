import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
const UserSolHeader = ({ UserSolBal }) => {
  console.log("sol header", UserSolBal);
  return (
    <div className="">
      <p>Sol </p>
      <p>Balance: {UserSolBal / LAMPORTS_PER_SOL}</p>
    </div>
  );
};
const UserVoucherHeader = ({ UserVoucherBal }) => {
  console.log("voucher header", UserVoucherBal);
  return (
    <div className="">
      <p>Voucher</p>
      <p>Balance: {UserVoucherBal}</p>
    </div>
  );
};
const SwapCard = ({ MarketData }) => {
  console.log("swapcard data", MarketData);
  const [isChecked, setIsChecked] = useState(false);

  function switchState() {
    setIsChecked(!isChecked);
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Swap</h2>
        <div className="form-control">
          {isChecked ? (
            <UserSolHeader UserSolBal={MarketData.userSolBal} />
          ) : (
            <UserVoucherHeader UserVoucherBal={MarketData.userVoucherBal} />
          )}
          <input
            type="text"
            placeholder="From"
            className="input input-bordered"
          />
        </div>

        <label className="swap swap-rotate text-9xl">
          <input type="checkbox" checked={isChecked} onChange={switchState} />
          <div className="swap-on">
            <HiChevronDoubleDown />
          </div>
          <div className="swap-off">
            <HiChevronDoubleDown />
          </div>
        </label>

        <div className="form-control">
          {!isChecked ? (
            <UserSolHeader UserSolBal={MarketData.userSolBal} />
          ) : (
            <UserVoucherHeader UserVoucherBal={MarketData.userVoucherBal} />
          )}
          <input
            type="text"
            placeholder="To"
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <button className="btn btn-primary">Login</button>
        </div>
      </div>
    </div>
  );
};
export default SwapCard;
