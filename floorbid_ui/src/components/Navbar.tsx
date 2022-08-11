import { useRouter } from "next/router";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import Link from "next/link";

const tabs: string[] = ["home", "exhibition"];
const Navbar = () => {
  const router = useRouter();
  return (
    <div className="navbar flex flex-row justify-between border-b border-neutral ">
      <div className="navbar-start">
        <Link href="/home">
          <div className="btn btn-ghost normal-case font-bold text-3xl">
            FLOORBID
          </div>
        </Link>
      </div>
      <div className="navbar-center">
        <ul className="menu menu-horizontal p-0">
          {tabs.map((tabName) => (
            <li
              className={`${
                router.pathname.slice(1).split("/")[0] === tabName
                  ? "border-b rounded-none border-black"
                  : ""
              } `}
              key={tabName}
            >
              <Link href={"/" + tabName}>
                <div>{tabName[0].toUpperCase() + tabName.slice(1)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="navbar-end">
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default Navbar;
