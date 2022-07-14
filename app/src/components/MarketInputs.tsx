import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const SolDisplay = ({
  solOutput,
  userSol,
  depositLiq,
}: {
  solOutput: number;
  userSol: number;
  depositLiq: boolean;
}) => {
  return (
    <>
      <div className="stat-title">Sol</div>
      <div
        className={`stat-value ${depositLiq ? "text-error" : "text-success"}`}
      >
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
  depositLiq,
}: {
  vouchers: number;
  userVoucher: number;
  depositLiq: boolean;
}) => {
  return (
    <>
      <div className="stat-title">Vouchers</div>
      <div
        className={`stat-value ${depositLiq ? "text-error" : "text-success"}`}
      >
        {vouchers}
      </div>
      <div className="stat-desc">Balance: {userVoucher}</div>
    </>
  );
};

export const LiqDisplay = ({
  liqTokens,
  userLiqTokens,
  depositLiq,
}: {
  liqTokens: number;
  userLiqTokens: number;
  depositLiq: boolean;
}) => {
  return (
    <>
      <div className="stat-title">LP Tokens</div>
      <div
        className={`stat-value ${depositLiq ? "text-success" : "text-error"}`}
      >
        {liqTokens}
      </div>
      <div className="stat-desc">Balance: {userLiqTokens}</div>
    </>
  );
};

export const YesOrNoButtons = ({
  yesText,
  noText,
  yesBool,
  updateInputs,
}: {
  yesText: string;
  noText: string;
  yesBool: boolean;
  updateInputs: (n, b) => void;
}) => {
  return (
    <div className="flex flex-row w-full justify-evenly">
      <button
        className={`btn btn-success ${!yesBool && "opacity-50"}`}
        onClick={() => {
          updateInputs(0, true);
        }}
      >
        {yesText}
      </button>
      <button
        className={`btn btn-error ${yesBool && "opacity-50"}`}
        onClick={() => {
          updateInputs(0, false);
        }}
      >
        {noText}
      </button>
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
      {" "}
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
      <div className="stat-desc place-self-end">Max: {max}</div>
    </>
  );
};

export const BazaarData = ({
  marketSol,
  marketVoucher,
  exhibitSymbol,
}: {
  marketSol: number;
  marketVoucher: number;
  exhibitSymbol: string;
}) => {
  return (
    <>
      {marketVoucher ? (
        <table className="table table-compact w-full border rounded-lg items-end">
          <tbody>
            <tr>
              <th>Base</th>
              <td>SOL</td>
            </tr>
            <tr>
              <th>Pool Liquidity (SOL)</th>
              <td>{marketSol / LAMPORTS_PER_SOL}</td>
            </tr>
            <tr>
              <th>Pool Liquidity ({exhibitSymbol})</th>
              <td>{marketVoucher}</td>
            </tr>
            <tr>
              <th>LP supply</th>
              <td>temp</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p>Loading bazaar data</p>
      )}
    </>
  );
};
