import { useState, useEffect } from "react";
import ProjectList from "./ProjectList";

import { creatorAdd, exhibitNames } from "../utils/data";

const ExploreProjects = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    async function fetchData() {
      setProjects(exhibitNames);
    }
    fetchData();
  }, []);
  return (
    <div>
      <h2>Explore all Projects</h2>
      {projects.length > 0 ? (
        <ProjectList projects={projects} />
      ) : (
        <p>No projects created yet! </p>
      )}
    </div>
  );
};

export default ExploreProjects;
