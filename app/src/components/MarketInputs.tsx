import { VscArrowBoth } from "react-icons/vsc";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MarketData } from "@/utils/interfaces";

export const SolDisplay = ({
  solOutput,
  userSol,
  yesBool,
}: {
  solOutput: number;
  userSol: number;
  yesBool: boolean;
}) => {
  return (
    <>
      <div className="stat-title">Sol</div>
      <div className={`stat-value ${yesBool ? "text-success" : "text-error"}`}>
        {(solOutput / LAMPORTS_PER_SOL).toFixed(2)}
      </div>
      <div className="stat-desc">
        Balance: {(userSol / LAMPORTS_PER_SOL).toFixed(2)}
      </div>
    </>
  );
};

export const VoucherDisplay = ({
  vouchers,
  userVoucher,
  yesBool,
}: {
  vouchers: number;
  userVoucher: number;
  yesBool: boolean;
}) => {
  return (
    <>
      <div className="stat-title">Vouchers</div>
      <div className={`stat-value ${yesBool ? "text-success" : "text-error"}`}>
        {vouchers}
      </div>
      <div className="stat-desc">Balance: {userVoucher}</div>
    </>
  );
};

export const LiqDisplay = ({
  liqTokens,
  userLiqTokens,
  yesBool,
}: {
  liqTokens: number;
  userLiqTokens: number;
  yesBool: boolean;
}) => {
  return (
    <>
      <div className="stat-title">LP Tokens</div>
      <div className={`stat-value ${yesBool ? "text-success" : "text-error"}`}>
        {liqTokens}
      </div>
      <div className="stat-desc">Balance: {userLiqTokens}</div>
    </>
  );
};

export const VoucherSolDisplay = ({
  solOutput,
  userSol,
  vouchers,
  userVoucher,
  yesBool,
}: {
  solOutput: number;
  userSol: number;
  vouchers: number;
  userVoucher: number;
  yesBool: boolean;
}) => {
  return (
    <div className={`flex flex-row items-center `}>
      <div className="stat place-items-center">
        <SolDisplay solOutput={solOutput} userSol={userSol} yesBool={yesBool} />
      </div>
      <VscArrowBoth size={50} />
      <div className="stat place-items-center">
        <VoucherDisplay
          vouchers={vouchers}
          userVoucher={userVoucher}
          yesBool={yesBool}
        />
      </div>
    </div>
  );
};

export const VoucherSlider = ({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number;
  onChange: (e) => void;
}) => {
  return (
    <>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        step={`${max < 10} && "1"`}
        className="range range-sm"
        onChange={onChange}
      />
      {max && (
        <div className="w-full flex justify-between text-xs px-2">
          {[...Array(max + 1)].map((i) => (
            <span key={i}>|</span>
          ))}
        </div>
      )}
      {/* <div className="stat-desc place-self-end">Max: {max}</div> */}
    </>
  );
};

export const BazaarData = ({
  marketData,
  exhibitSymbol,
}: {
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
  return (
    <>
      {marketData ? (
        <table className="table table-compact w-full border rounded-lg items-end">
          <tbody>
            <tr>
              <th>Base</th>
              <td>SOL</td>
            </tr>
            <tr>
              <th>Pool Liquidity (SOL)</th>
              <td>{marketData.sol / LAMPORTS_PER_SOL}</td>
            </tr>
            <tr>
              <th>Pool Liquidity ({exhibitSymbol})</th>
              <td>{marketData.voucher}</td>
            </tr>
            <tr>
              <th>LP supply</th>
              <td>{marketData.liq}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p>Loading bazaar data</p>
      )}
    </>
  );
};
