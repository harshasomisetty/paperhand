import React from "react";
import Link from "next/link";

const LinkButton = ({name, link, attributes}) => (
  <Link href={link}>
    <div className={attributes}>
      <p>{name}</p>
    </div>
  </Link>
);

export default LinkButton;
