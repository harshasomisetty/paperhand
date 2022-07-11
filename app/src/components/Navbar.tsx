import Image from "next/image";
import { useRouter } from "next/router";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import Link from "next/link";

const tabs: string[] = ["home", "exhibition"];
const Navbar = () => {
  const router = useRouter();
  return (
    <div className="navbar flex flex-row justify-between">
      <div className="navbar-start">
        <a className="btn btn-ghost normal-case text-xl" href="/home">
          NFTAMM
        </a>
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
            >
              <Link key={tabName} href={"/" + tabName}>
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
