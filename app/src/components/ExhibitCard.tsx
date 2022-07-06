import React from "react";
import Link from "next/link";

import { Project } from "../utils/interfaces";
interface ExhibitCardProps {
  project: Project;
}
export default function ExhibitCard({ project }: ExhibitCardProps) {
  return (
    <Link href={"/exhibition/" + project.pubkey.toString()}>
      <div className="flex flex-col items-center place-content-around border bg-gray-800 bg-opacity-50 hover:bg-opacity-100 rounded-xl m-2 p-2 truncate overflow-hidden w-40 h-48">
        {/* <div className="flex bg-gray-700 text-5xl justify-center border rounded-full h-20 w-20"> */}
        {/*   {project["name"].slice(0, 1)} */}
        {/* </div> */}
        {/* <h3 className="">{project["name"]}</h3> */}
        {/* <p className="text-xl w-32">{project["description"]}</p> */}
        {/* <p className="w-32">Treasury: {project["treasuryAccount"]}</p> */}
        <p>pubkey: {project.pubkey.toString()}</p>
      </div>
    </Link>
  );
}
